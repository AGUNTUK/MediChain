import fs from "fs";
import { addOrUpdateProduct } from "../src/lib/dbService.js";
import { supabaseAdmin } from "../src/lib/supabaseAdmin.js";

interface SomatecProduct {
  index: number;
  product_name: string;
  generic_name: string;
  strength: string;
  dosage_form: string;
  pack_size: string;
  units_per_pack: string;
  unit_type: string;
  mrp_per_pack: string;
  company: string;
  image_url: string;
}

function resolveCategory(dosageForm: string): string {
  const normCat = (dosageForm || "").trim().toLowerCase();
  if (normCat.includes("tablet") || normCat.includes("bolus") || normCat.includes("suppository") || normCat.includes("pill")) {
    return "Tablet";
  } else if (normCat.includes("capsule") || normCat.includes("cozycap") || normCat.includes("licap") || normCat.includes("softgel")) {
    return "Capsule";
  } else if (normCat.includes("syrup") || normCat.includes("solution") || normCat.includes("suspension") || normCat.includes("drop") || normCat.includes("elixir") || normCat.includes("paste") || normCat.includes("wash") || normCat.includes("mixture") || normCat.includes("mouthwash")) {
    return "Syrup";
  } else if (normCat.includes("injection") || normCat.includes("inj") || normCat.includes("vial") || normCat.includes("ampoule") || normCat.includes("infusion")) {
    return "Injection";
  } else if (normCat.includes("cream") || normCat.includes("ointment") || normCat.includes("gel") || normCat.includes("lotion") || normCat.includes("spray") || normCat.includes("rub")) {
    return "Cream";
  } else if (normCat.includes("supplement") || normCat.includes("powder") || normCat.includes("sachet") || normCat.includes("granule")) {
    return "Supplement";
  }
  return "Tablet";
}

async function main() {
  const rawJson = fs.readFileSync("crawled_somatec_products.json", "utf-8");
  const prods: SomatecProduct[] = JSON.parse(rawJson);

  console.log(`Starting bulk import of ${prods.length} Somatec Pharmaceuticals products...`);

  const csvRows = [
    [
      "product_name",
      "generic_name",
      "strength",
      "dosage_form",
      "pack_size",
      "units_per_pack",
      "unit_type",
      "mrp_per_pack",
      "selling_price",
      "company",
      "category",
      "image_url"
    ].join(",")
  ];

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < prods.length; i++) {
    const p = prods[i];
    const mrp = parseFloat(p.mrp_per_pack) || 100.0;
    // Wholesale trade price (34% discount for Somatec products)
    const sellingPrice = Math.round(mrp * (1 - 0.34) * 100) / 100;
    const category = resolveCategory(p.dosage_form);

    const productPayload = {
      name: p.product_name,
      genericName: p.generic_name,
      company: p.company || "Somatec Pharmaceuticals Ltd.",
      category: category,
      strength: p.strength || "Standard",
      packSize: p.pack_size || "10x10 Box",
      mrp: mrp,
      sellingPrice: sellingPrice,
      availableStock: 500,
      imageUrl: p.image_url || ""
    };

    try {
      const saved = await addOrUpdateProduct(productPayload as any);
      successCount++;
      if (successCount % 20 === 0 || successCount === prods.length) {
        console.log(`[${successCount}/${prods.length}] Imported: ${p.product_name} (${p.strength}) - MRP ৳${mrp} (Trade: ৳${sellingPrice})`);
      }
    } catch (err: any) {
      console.error(`Error importing ${p.product_name}:`, err.message || err);
      errorCount++;
    }

    const escapeCsv = (val: any) => `"${String(val || "").replace(/"/g, '""')}"`;
    csvRows.push([
      escapeCsv(p.product_name),
      escapeCsv(p.generic_name),
      escapeCsv(p.strength),
      escapeCsv(p.dosage_form),
      escapeCsv(p.pack_size),
      escapeCsv(p.units_per_pack),
      escapeCsv(p.unit_type),
      escapeCsv(mrp.toFixed(2)),
      escapeCsv(sellingPrice.toFixed(2)),
      escapeCsv(p.company),
      escapeCsv(category),
      escapeCsv(p.image_url)
    ].join(","));
  }

  fs.writeFileSync("somatec_products_enriched.csv", csvRows.join("\n"), "utf-8");
  console.log(`\nImport complete! Success: ${successCount}, Errors: ${errorCount}`);
  console.log("Saved full enriched catalog with all crawled MRPs to somatec_products_enriched.csv");

  // Invalidate any cache in products table by updating timestamp or checking count
  const { count } = await supabaseAdmin.from("products").select("id", { count: "exact" }).ilike("company", "%Somatec%");
  console.log(`Total Somatec products in database: ${count}`);
}

main().catch(console.error);
