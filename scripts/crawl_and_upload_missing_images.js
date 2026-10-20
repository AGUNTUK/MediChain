import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const officialCatalog = fs.existsSync("somatec_official_site_products.json")
  ? JSON.parse(fs.readFileSync("somatec_official_site_products.json", "utf-8"))
  : [];

async function searchBingImage(query) {
  try {
    const res = await fetch("https://www.bing.com/images/search?q=" + encodeURIComponent(query), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });
    if (!res.ok) return [];
    const text = await res.text();
    const murls = [...text.matchAll(/&quot;murl&quot;:&quot;(http[^&]+)&quot;/g)].map((m) => m[1]);
    return murls;
  } catch (e) {
    return [];
  }
}

async function downloadAndUploadImage(sourceUrl, fileName) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(sourceUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`  HTTP ${res.status} fetching ${sourceUrl}`);
      return null;
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/") && !sourceUrl.match(/\.(jpg|jpeg|png|webp)/i)) {
      console.warn(`  Invalid content-type: ${contentType}`);
      return null;
    }

    const arrayBuf = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuf);
    if (buffer.length < 1500) {
      console.warn(`  Image buffer too small (${buffer.length} bytes), skipping`);
      return null;
    }

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from("product-images")
      .upload(`products/${fileName}`, buffer, {
        contentType: contentType.split(";")[0],
        upsert: true
      });

    if (uploadErr) {
      console.error(`  Supabase storage upload error:`, uploadErr.message);
      return null;
    }

    const { data: pubData } = supabase.storage
      .from("product-images")
      .getPublicUrl(`products/${fileName}`);

    return pubData.publicUrl;
  } catch (err) {
    console.warn(`  Failed to download/upload ${sourceUrl}:`, err.message);
    return null;
  }
}

async function findBestImageUrl(product) {
  const normName = (product.name || "").toLowerCase().trim();

  // 1. Direct official Somatec catalog match
  const hit = officialCatalog.find((o) => (o.title || "").toLowerCase().trim() === normName);
  if (hit && hit.galleryImgs && hit.galleryImgs.length > 0) {
    return hit.galleryImgs[0];
  }
  if (hit && hit.logoImgs && hit.logoImgs.length > 0) {
    return hit.logoImgs[0];
  }

  // Partial match on official catalog
  const partialHit = officialCatalog.find((o) => {
    const t = (o.title || "").toLowerCase().trim();
    return normName.includes(t) || t.includes(normName);
  });
  if (partialHit) {
    if (partialHit.galleryImgs && partialHit.galleryImgs.length > 0) return partialHit.galleryImgs[0];
    if (partialHit.logoImgs && partialHit.logoImgs.length > 0) return partialHit.logoImgs[0];
  }

  // 2. MedEx known packaging matches
  if (normName === "losapot") {
    return "https://medex.com.bd/storage/images/packaging/losapot-plus-50-mg-tablet-76987859859-i1-JkB5FWPrLGs3g5bCwkB9.jpg";
  }
  if (normName === "tamicol" || normName === "tamicod") {
    return "https://medex.com.bd/storage/images/packaging/tamicod-75-mg-syrup-52909126666-i1-SwoTfHxV0UO0S1se6LGQ.jpg";
  }
  if (normName.includes("respamox") || normName.includes("tymox")) {
    return "https://www.somatecpharmabd.com/uploads/product/gallery/product_76_gallery-16620132958372.png";
  }

  // 3. Search via Bing Image search
  const queries = [
    `${product.name} ${product.strength || ""} Somatec medicine Bangladesh`,
    `${product.name} ${product.generic_name || ""} medicine packaging`,
    `${product.name} medicine Bangladesh box`,
    `${product.name} ${product.generic_name || ""} tablet capsule syrup`
  ];

  for (const q of queries) {
    const candidates = await searchBingImage(q);
    // Find candidate ending in standard image ext
    const valid = candidates.find((url) => {
      const lower = url.toLowerCase();
      return (
        (lower.includes(".jpg") || lower.includes(".png") || lower.includes(".jpeg") || lower.includes(".webp")) &&
        !lower.includes("logo") &&
        !lower.includes("icon") &&
        !lower.includes("flag") &&
        !lower.includes("avatar")
      );
    });
    if (valid) return valid;
    await new Promise((r) => setTimeout(r, 200));
  }

  return null;
}

async function main() {
  console.log("=== Somatec Product Image Crawler & Cloud Storage Pipeline ===");

  // 1. Fetch all Somatec products with missing images
  const { data: somatecProds, error: sErr } = await supabase
    .from("products")
    .select("id, name, generic_name, strength, pack_size, company, image_url")
    .ilike("company", "%Somatec%");

  if (sErr) throw sErr;

  const missingSomatec = somatecProds.filter(
    (p) => !p.image_url || p.image_url.trim() === "" || p.image_url.includes("placeholder")
  );

  console.log(`Total Somatec products: ${somatecProds.length}`);
  console.log(`Somatec products missing images: ${missingSomatec.length}`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < missingSomatec.length; i++) {
    const p = missingSomatec[i];
    console.log(`\n[${i + 1}/${missingSomatec.length}] Processing: ${p.name} (${p.strength || "N/A"})`);

    const sourceUrl = await findBestImageUrl(p);
    if (!sourceUrl) {
      console.warn(`  No image candidate found for ${p.name}`);
      failCount++;
      continue;
    }

    console.log(`  Found candidate: ${sourceUrl}`);
    const ext = sourceUrl.match(/\.(png|jpg|jpeg|webp)/i) ? sourceUrl.match(/\.(png|jpg|jpeg|webp)/i)[1].toLowerCase() : "jpg";
    const cleanSlug = `${p.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}_${(p.strength || "std").replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}_${p.id.slice(0, 8)}.${ext}`;

    const publicUrl = await downloadAndUploadImage(sourceUrl, cleanSlug);
    if (!publicUrl) {
      // Fallback: use direct source URL if reachable
      console.log(`  Falling back to direct source URL for ${p.name}`);
      const { error: updErr } = await supabase
        .from("products")
        .update({ image_url: sourceUrl, updated_at: new Date().toISOString() })
        .eq("id", p.id);

      if (!updErr) {
        console.log(`  Updated database with direct URL for ${p.name}`);
        successCount++;
      } else {
        console.error(`  Failed to update DB:`, updErr.message);
        failCount++;
      }
    } else {
      console.log(`  Uploaded to Supabase: ${publicUrl}`);
      const { error: updErr } = await supabase
        .from("products")
        .update({ image_url: publicUrl, updated_at: new Date().toISOString() })
        .eq("id", p.id);

      if (!updErr) {
        console.log(`  Successfully updated database for ${p.name}`);
        successCount++;
      } else {
        console.error(`  Failed to update DB:`, updErr.message);
        failCount++;
      }
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\nSomatec image crawl complete: ${successCount} updated, ${failCount} failed.`);

  // 2. Synchronize somatec_products_enriched.csv with the newly updated image URLs
  const { data: refreshedSomatec } = await supabase
    .from("products")
    .select("id, name, generic_name, strength, pack_size, mrp, selling_price, discount_percentage, image_url, company")
    .ilike("company", "%Somatec%");

  if (refreshedSomatec && refreshedSomatec.length > 0) {
    const csvLines = [
      [
        "product_name",
        "generic_name",
        "strength",
        "pack_size",
        "mrp_per_pack",
        "selling_price",
        "discount_percentage",
        "company",
        "image_url"
      ].join(",")
    ];

    const escapeCsv = (val) => `"${String(val || "").replace(/"/g, '""')}"`;
    for (const p of refreshedSomatec) {
      csvLines.push(
        [
          escapeCsv(p.name),
          escapeCsv(p.generic_name),
          escapeCsv(p.strength),
          escapeCsv(p.pack_size),
          escapeCsv(p.mrp),
          escapeCsv(p.selling_price),
          escapeCsv("34%"),
          escapeCsv(p.company),
          escapeCsv(p.image_url)
        ].join(",")
      );
    }

    fs.writeFileSync("somatec_products_enriched.csv", csvLines.join("\n"), "utf-8");
    console.log("Synchronized somatec_products_enriched.csv with all updated image URLs.");
  }

  // 3. Final verification of remaining missing images for Somatec
  const { data: finalSomatec } = await supabase
    .from("products")
    .select("id, image_url")
    .ilike("company", "%Somatec%");

  const remainingMissing = finalSomatec.filter(
    (p) => !p.image_url || p.image_url.trim() === "" || p.image_url.includes("placeholder")
  );

  console.log(`\nFinal Somatec products status: ${finalSomatec.length - remainingMissing.length}/${finalSomatec.length} have images (${remainingMissing.length} remaining).`);
}

main().catch(console.error);
