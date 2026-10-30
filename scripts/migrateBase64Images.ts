import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const BUCKET_NAME = "product-images";
const BATCH_SIZE = 10;

function parseBase64(dataUri: string): { mimeType: string; ext: string; buffer: Buffer } {
  const matches = dataUri.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/s);
  let mimeType = "image/jpeg";
  let base64Data = "";

  if (matches && matches.length === 3) {
    mimeType = matches[1];
    base64Data = matches[2];
  } else {
    const commaIndex = dataUri.indexOf(",");
    if (commaIndex !== -1) {
      const header = dataUri.substring(0, commaIndex);
      base64Data = dataUri.substring(commaIndex + 1);
      mimeType = header.split(";")[0]?.replace("data:", "") || "image/jpeg";
    } else {
      throw new Error("Invalid Base64 Data URI string");
    }
  }

  let ext = "jpg";
  if (mimeType === "image/png") ext = "png";
  else if (mimeType === "image/webp") ext = "webp";
  else if (mimeType === "image/gif") ext = "gif";
  else if (mimeType === "image/svg+xml") ext = "svg";
  else if (mimeType === "image/jpeg" || mimeType === "image/jpg") ext = "jpg";

  const buffer = Buffer.from(base64Data, "base64");
  return { mimeType, ext, buffer };
}

async function ensureBucketExists(): Promise<void> {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error("Error listing storage buckets:", error.message);
  }
  const exists = (buckets || []).some(b => b.name === BUCKET_NAME);
  if (!exists) {
    console.log(`Bucket '${BUCKET_NAME}' does not exist. Creating with public: true...`);
    const { error: createErr } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"]
    });
    if (createErr && !createErr.message.includes("already exists")) {
      throw new Error(`Failed to create bucket: ${createErr.message}`);
    }
    console.log(`Bucket '${BUCKET_NAME}' created successfully.`);
  } else {
    console.log(`Bucket '${BUCKET_NAME}' exists and is ready.`);
  }
}

export async function migrateAllBase64Images(): Promise<{ totalMigrated: number; failed: number }> {
  console.log("=== MediChain Base64 Image Migration Started ===");
  await ensureBucketExists();

  // Get total count of products with base64 images
  const { count: initialCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .like("image_url", "data:image%");

  console.log(`Found ${initialCount || 0} products with Base64 data:image% in image_url.`);

  let totalMigrated = 0;
  let failed = 0;
  let batchNum = 1;

  while (true) {
    // Query products in batches of 10
    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, image_url")
      .like("image_url", "data:image%")
      .limit(BATCH_SIZE);

    if (error) {
      console.error(`Error querying products batch ${batchNum}:`, error.message);
      break;
    }

    if (!products || products.length === 0) {
      console.log("No more Base64 product images found to migrate.");
      break;
    }

    console.log(`Processing Batch ${batchNum} (${products.length} products)...`);

    for (const prod of products) {
      try {
        if (!prod.image_url || !prod.image_url.startsWith("data:image")) {
          continue;
        }

        const { mimeType, ext, buffer } = parseBase64(prod.image_url);
        const storagePath = `products/${prod.id}.${ext}`;

        // Upload buffer to Supabase Storage
        const { error: uploadErr } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, buffer, {
            contentType: mimeType,
            cacheControl: "31536000",
            upsert: true
          });

        if (uploadErr) {
          throw new Error(`Storage upload failed: ${uploadErr.message}`);
        }

        // Get permanent public URL
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(storagePath);

        const publicUrl = urlData.publicUrl;

        // Update product in database
        const { error: updateErr } = await supabase
          .from("products")
          .update({ image_url: publicUrl })
          .eq("id", prod.id);

        if (updateErr) {
          throw new Error(`Database update failed: ${updateErr.message}`);
        }

        totalMigrated++;
        console.log(`[${totalMigrated}] Migrated product ${prod.id} (${prod.name || "Unknown"}): ${(buffer.length / 1024).toFixed(1)} KB -> ${publicUrl}`);
      } catch (err: any) {
        failed++;
        console.error(`Failed to migrate product ${prod.id}:`, err.message);
      }
    }

    batchNum++;
  }

  console.log(`=== Migration Complete! Migrated: ${totalMigrated}, Failed: ${failed} ===`);
  return { totalMigrated, failed };
}

// Run if called directly
migrateAllBase64Images()
  .then(res => {
    console.log(`Finished with ${res.totalMigrated} items converted.`);
    process.exit(res.failed > 0 ? 1 : 0);
  })
  .catch(err => {
    console.error("Fatal migration error:", err);
    process.exit(1);
  });

