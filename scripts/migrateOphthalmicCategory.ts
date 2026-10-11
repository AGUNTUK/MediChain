import { supabaseAdmin } from "../src/lib/supabaseAdmin.js";

export async function migrateOphthalmicCategory() {
  console.log("=== STARTING OPHTHALMIC CATEGORY MIGRATION ===");

  // 1. Ensure "Ophthalmic" category exists in categories table
  let { data: existingCat, error: fetchErr } = await supabaseAdmin
    .from("categories")
    .select("id, name")
    .ilike("name", "Ophthalmic")
    .maybeSingle();

  if (fetchErr) {
    console.error("Error checking categories table:", fetchErr);
    throw fetchErr;
  }

  let ophthalmicId = existingCat?.id;
  if (!ophthalmicId) {
    console.log("Category 'Ophthalmic' not found in categories table. Inserting...");
    const { data: newCat, error: insertCatErr } = await supabaseAdmin
      .from("categories")
      .insert({
        name: "Ophthalmic",
        description: "Ophthalmic and eye care medicines"
      })
      .select("id, name")
      .single();

    if (insertCatErr) {
      console.error("Failed to insert Ophthalmic category:", insertCatErr);
      throw insertCatErr;
    }
    ophthalmicId = newCat.id;
    console.log("Created 'Ophthalmic' category with ID:", ophthalmicId);
  } else {
    console.log("Found existing 'Ophthalmic' category with ID:", ophthalmicId);
  }

  // 2. Fetch all products from products table in chunks
  let allProducts: any[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("id, name, generic_name, company, category_name_fallback, category_id, pack_size")
      .range(page * 1000, (page + 1) * 1000 - 1);

    if (error) {
      console.error("Error fetching products:", error);
      throw error;
    }
    if (!data || data.length === 0) break;
    allProducts.push(...data);
    page++;
    if (data.length < 1000) break;
  }

  console.log(`Fetched ${allProducts.length} total products from database.`);

  const eyeCategories = ["Eye Drop", "Eye Drops", "Eye Care", "Eye Gel", "Eye Ointment", "ophthalmic"];

  const productsToUpdate = allProducts.filter(p => {
    const cat = (p.category_name_fallback || "").trim();
    const catLower = cat.toLowerCase();
    const nameLower = (p.name || "").toLowerCase();
    const genericLower = (p.generic_name || "").toLowerCase();
    const fullText = `${nameLower} ${genericLower} ${(p.pack_size || "").toLowerCase()}`;

    // Strictly exclude ear drops, nasal drops, and pediatric oral drops
    const isEar = catLower.includes("ear") || nameLower.includes("ear drop") || genericLower.includes("ear drop") || fullText.includes("ear drop") || fullText.includes("ear drops") || fullText.includes(" otic");
    const isNasal = fullText.includes("nasal") || catLower.includes("nasal");
    const isPediatric = fullText.includes("pediatric") || fullText.includes("paediatric");
    if (isEar || isNasal || isPediatric) return false;

    // Check if category is already an eye category
    if (eyeCategories.some(c => c.toLowerCase() === catLower)) return true;

    // Check name or generic explicitly referring to eye/ophthalmic
    if (fullText.includes("eye drop") || fullText.includes("eye drops") || fullText.includes("eye care") || fullText.includes("eye gel") || fullText.includes("eye ointment") || fullText.includes("ophthalmic")) {
      return true;
    }

    // Specific product: Supraphen 0.5% (Chloramphenicol 0.5% eye drop)
    if (nameLower.includes("supraphen") && fullText.includes("drop")) {
      return true;
    }

    return false;
  });

  console.log(`Found ${productsToUpdate.length} eye/ophthalmic care products to assign to 'Ophthalmic'.`);

  // 3. Update products in batches
  let updatedCount = 0;
  const batchSize = 50;
  for (let i = 0; i < productsToUpdate.length; i += batchSize) {
    const batch = productsToUpdate.slice(i, i + batchSize);
    const ids = batch.map(b => b.id);

    const { error: updateErr } = await supabaseAdmin
      .from("products")
      .update({
        category_name_fallback: "Ophthalmic",
        category_id: ophthalmicId
      })
      .in("id", ids);

    if (updateErr) {
      console.error(`Error updating batch ${i}-${i + batch.length}:`, updateErr);
      throw updateErr;
    }
    updatedCount += batch.length;
    console.log(`Updated ${updatedCount}/${productsToUpdate.length} products...`);
  }

  console.log(`Successfully migrated ${updatedCount} products to category 'Ophthalmic'!`);
  return { updatedCount, ophthalmicId };
}

if (process.argv[1]?.endsWith("migrateOphthalmicCategory.ts")) {
  migrateOphthalmicCategory()
    .then(res => {
      console.log("Migration complete:", res);
      process.exit(0);
    })
    .catch(err => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
