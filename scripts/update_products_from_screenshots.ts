import dotenv from "dotenv";
dotenv.config();
import { supabaseAdmin } from "../src/lib/supabaseAdmin.js";

interface TargetProduct {
  name: string;
  genericName: string;
  company: string;
  category: string;
  strength: string;
  packSize: string;
  mrp: number;
  screenshotDiscount: number;
  newDiscountPercentage: number;
  newSellingPrice: number;
  existingId?: string;
  availableStock?: number;
}

// 30 Products from the 5 Screenshots
// Rule: discount % = screenshot discount % + 2%
// Selling Price = MRP * (1 - newDiscountPercentage / 100) (rounded to 2 decimals)
const targetProducts: TargetProduct[] = [
  // --- SCREENSHOT 1 ---
  {
    name: "Abecab",
    genericName: "Amlodipine Besilate + Olmesartan Medoxomil",
    company: "ACI Limited",
    category: "Tablet",
    strength: "5 mg+20 mg",
    packSize: "70's pack",
    mrp: 840,
    screenshotDiscount: 15.52,
    newDiscountPercentage: 17.52,
    newSellingPrice: 692.83, // 840 * (1 - 0.1752)
    existingId: "b077b680-03ad-451f-8ae8-8b7c99921ead",
    availableStock: 100
  },
  {
    name: "Abecab",
    genericName: "Amlodipine Besilate + Olmesartan Medoxomil",
    company: "ACI Limited",
    category: "Tablet",
    strength: "5 mg+40 mg",
    packSize: "60's pack",
    mrp: 1200,
    screenshotDiscount: 15.75,
    newDiscountPercentage: 17.75,
    newSellingPrice: 987.00, // 1200 * (1 - 0.1775)
    existingId: "fef25f7c-a8d7-468e-902f-eadf53b72bb0",
    availableStock: 100
  },
  {
    name: "Abetis",
    genericName: "Olmesartan Medoxomil",
    company: "ACI Limited",
    category: "Tablet",
    strength: "10 mg",
    packSize: "70's pack",
    mrp: 490,
    screenshotDiscount: 14.32,
    newDiscountPercentage: 16.32,
    newSellingPrice: 410.03, // 490 * (1 - 0.1632)
    existingId: "538afd95-f724-4472-97cb-b42b4a62a6dc",
    availableStock: 100
  },
  {
    name: "Abetis",
    genericName: "Olmesartan Medoxomil",
    company: "ACI Limited",
    category: "Tablet",
    strength: "20 mg",
    packSize: "50's pack",
    mrp: 770,
    screenshotDiscount: 13.29,
    newDiscountPercentage: 15.29,
    newSellingPrice: 652.27, // 770 * (1 - 0.1529)
    existingId: "017b2fad-096e-413f-b589-9e4f9c3a4e33",
    availableStock: 100
  },
  {
    name: "Abetis Plus",
    genericName: "Olmesartan Medoxomil + Hydrochlorothiazide",
    company: "ACI Limited",
    category: "Tablet",
    strength: "20 mg+12.5 mg",
    packSize: "50's pack",
    mrp: 550,
    screenshotDiscount: 13.15,
    newDiscountPercentage: 15.15,
    newSellingPrice: 466.68, // 550 * (1 - 0.1515)
    existingId: "4fc17cff-6aa4-4d48-a760-fca3a982b0c3",
    availableStock: 100
  },
  {
    name: "Acical-C",
    genericName: "Calcium Lactate Gluconate + Calcium Carbonate + Vitamin C",
    company: "ACI Limited",
    category: "Tablet",
    strength: "1000 mg+327 mg+500 mg",
    packSize: "10's pack",
    mrp: 150,
    screenshotDiscount: 18.00,
    newDiscountPercentage: 20.00,
    newSellingPrice: 120.00, // 150 * (1 - 0.20)
    existingId: "cff32e76-fdc8-468d-a20b-294d6e00ec55",
    availableStock: 0 // Out of Stock as in screenshot
  },

  // --- SCREENSHOT 2 ---
  {
    name: "Acical-MX",
    genericName: "Calcium Carbonate + Vitamin D3 + Multimineral",
    company: "ACI Limited",
    category: "Tablet",
    strength: "500 mg",
    packSize: "10's pack",
    mrp: 200,
    screenshotDiscount: 18.08,
    newDiscountPercentage: 20.08,
    newSellingPrice: 159.84, // 200 * (1 - 0.2008)
    existingId: "5126cf0e-6e6f-4a16-9237-0fa53243db74",
    availableStock: 100
  },
  {
    name: "Acitrin",
    genericName: "Cetirizine Hydrochloride",
    company: "ACI Limited",
    category: "Tablet",
    strength: "10 mg",
    packSize: "100's pack",
    mrp: 301,
    screenshotDiscount: 21.73,
    newDiscountPercentage: 23.73,
    newSellingPrice: 229.57, // 301 * (1 - 0.2373)
    existingId: "53ec168b-e6db-4d4a-a9cc-9138820b1bce",
    availableStock: 100
  },
  {
    name: "Adegra",
    genericName: "Sildenafil Citrate",
    company: "ACI Limited",
    category: "Tablet",
    strength: "100 mg",
    packSize: "4's pack",
    mrp: 200,
    screenshotDiscount: 45.45,
    newDiscountPercentage: 47.45,
    newSellingPrice: 105.10, // 200 * (1 - 0.4745)
    availableStock: 100
  },
  {
    name: "Adegra",
    genericName: "Sildenafil Citrate",
    company: "ACI Limited",
    category: "Tablet",
    strength: "50 mg",
    packSize: "4's pack",
    mrp: 120.36,
    screenshotDiscount: 48.84,
    newDiscountPercentage: 50.84,
    newSellingPrice: 59.17, // 120.36 * (1 - 0.5084)
    existingId: "0d50e85b-5ce4-4f04-92a1-e6a0303f6df5",
    availableStock: 100
  },
  {
    name: "Adelax",
    genericName: "Flupentixol + Melitracen",
    company: "ACI Limited",
    category: "Tablet",
    strength: "0.5 mg+10 mg",
    packSize: "100's pack",
    mrp: 530,
    screenshotDiscount: 16.66,
    newDiscountPercentage: 18.66,
    newSellingPrice: 431.10, // 530 * (1 - 0.1866)
    existingId: "ed4f5d0c-d644-4253-9de7-761cd6071d1b",
    availableStock: 100
  },
  {
    name: "Amantril",
    genericName: "Amantadine Hydrochloride",
    company: "ACI Limited",
    category: "Capsule",
    strength: "100 mg",
    packSize: "30's pack",
    mrp: 300,
    screenshotDiscount: 14.47,
    newDiscountPercentage: 16.47,
    newSellingPrice: 250.59, // 300 * (1 - 0.1647)
    existingId: "c7231d8d-5c08-428b-b620-8310d26253f8",
    availableStock: 100
  },

  // --- SCREENSHOT 3 ---
  {
    name: "Anaflex",
    genericName: "Naproxen Sodium",
    company: "ACI Limited",
    category: "Tablet",
    strength: "500 mg",
    packSize: "30's pack",
    mrp: 480,
    screenshotDiscount: 16.54,
    newDiscountPercentage: 18.54,
    newSellingPrice: 391.01, // 480 * (1 - 0.1854)
    existingId: "c002c306-6732-4a6a-aa80-722694c5769e",
    availableStock: 100
  },
  {
    name: "Anaflex Max",
    genericName: "Naproxen Sodium + Esomeprazole Magnesium",
    company: "ACI Limited",
    category: "Tablet",
    strength: "500 mg+20 mg",
    packSize: "50's pack",
    mrp: 1050,
    screenshotDiscount: 19.57,
    newDiscountPercentage: 21.57,
    newSellingPrice: 823.52, // 1050 * (1 - 0.2157)
    existingId: "2d36501c-0285-4133-adcf-38bbf3d7ec5c",
    availableStock: 100
  },
  {
    name: "Aptin M",
    genericName: "Vildagliptin + Metformin Hydrochloride",
    company: "ACI Limited",
    category: "Tablet",
    strength: "50 mg+500 mg",
    packSize: "30's pack",
    mrp: 750,
    screenshotDiscount: 13.49,
    newDiscountPercentage: 15.49,
    newSellingPrice: 633.83, // 750 * (1 - 0.1549)
    existingId: "8422c461-7e5c-4571-9319-bfe98a27474a",
    availableStock: 100
  },
  {
    name: "Aptin M",
    genericName: "Vildagliptin + Metformin Hydrochloride",
    company: "ACI Limited",
    category: "Tablet",
    strength: "50 mg+850 mg",
    packSize: "30's pack",
    mrp: 750,
    screenshotDiscount: 13.71,
    newDiscountPercentage: 15.71,
    newSellingPrice: 632.18, // 750 * (1 - 0.1571)
    existingId: "16841940-fa2e-4de4-8888-3e737b5b1a17",
    availableStock: 100
  },
  {
    name: "Arbitel",
    genericName: "Telmisartan",
    company: "ACI Limited",
    category: "Tablet",
    strength: "20 mg",
    packSize: "56's pack",
    mrp: 392,
    screenshotDiscount: 16.14,
    newDiscountPercentage: 18.14,
    newSellingPrice: 320.89, // 392 * (1 - 0.1814)
    existingId: "946521cd-da5b-4196-8370-8e9ed17d58ad",
    availableStock: 100
  },
  {
    name: "Arbitel",
    genericName: "Telmisartan",
    company: "ACI Limited",
    category: "Tablet",
    strength: "40 mg",
    packSize: "56's pack",
    mrp: 700,
    screenshotDiscount: 15.53,
    newDiscountPercentage: 17.53,
    newSellingPrice: 577.29, // 700 * (1 - 0.1753)
    existingId: "46f2ba9e-4dd8-428d-bf47-10c927e8efb7",
    availableStock: 100
  },

  // --- SCREENSHOT 4 ---
  {
    name: "Arbitel",
    genericName: "Telmisartan",
    company: "ACI Limited",
    category: "Tablet",
    strength: "80 mg",
    packSize: "30's pack",
    mrp: 600,
    screenshotDiscount: 14.40,
    newDiscountPercentage: 16.40,
    newSellingPrice: 501.60, // 600 * (1 - 0.164)
    existingId: "48058f8f-af11-46fd-ba50-dc58844fb766",
    availableStock: 100
  },
  {
    name: "Arbitel AM",
    genericName: "Amlodipine Besilate + Telmisartan",
    company: "ACI Limited",
    category: "Tablet",
    strength: "5 mg+40 mg",
    packSize: "30's pack",
    mrp: 375,
    screenshotDiscount: 14.93,
    newDiscountPercentage: 16.93,
    newSellingPrice: 311.51, // 375 * (1 - 0.1693)
    existingId: "20496d4f-3f65-46b5-b0ba-d63b11487955",
    availableStock: 100
  },
  {
    name: "Arbitel AM",
    genericName: "Amlodipine Besilate + Telmisartan",
    company: "ACI Limited",
    category: "Tablet",
    strength: "5 mg+80 mg",
    packSize: "30's pack",
    mrp: 600,
    screenshotDiscount: 15.81,
    newDiscountPercentage: 17.81,
    newSellingPrice: 493.14, // 600 * (1 - 0.1781)
    existingId: "57ce4471-0898-486a-ba9c-4e2485d409f5",
    availableStock: 100
  },
  {
    name: "Arbitel Plus",
    genericName: "Telmisartan + Hydrochlorothiazide",
    company: "ACI Limited",
    category: "Tablet",
    strength: "40 mg+12.5 mg",
    packSize: "30's pack",
    mrp: 375,
    screenshotDiscount: 16.59,
    newDiscountPercentage: 18.59,
    newSellingPrice: 305.29, // 375 * (1 - 0.1859)
    existingId: "716f58c4-907f-40b3-9ac8-52aa9ab720ee",
    availableStock: 100
  },
  {
    name: "Artica",
    genericName: "Hydroxyzine  Hydrochloride",
    company: "ACI Limited",
    category: "Tablet",
    strength: "10 mg",
    packSize: "250's pack",
    mrp: 375,
    screenshotDiscount: 16.45,
    newDiscountPercentage: 18.45,
    newSellingPrice: 305.81, // 375 * (1 - 0.1845)
    existingId: "900b112b-ca89-47f1-9627-3026dbf637e8",
    availableStock: 100
  },
  {
    name: "Artica",
    genericName: "Hydroxyzine  Hydrochloride",
    company: "ACI Limited",
    category: "Tablet",
    strength: "25 mg",
    packSize: "200's pack",
    mrp: 600,
    screenshotDiscount: 12.46,
    newDiscountPercentage: 14.46,
    newSellingPrice: 513.24, // 600 * (1 - 0.1446)
    existingId: "7a4d3eb3-3ad9-47e1-82b8-88262568f2b2",
    availableStock: 100
  },

  // --- SCREENSHOT 5 ---
  {
    name: "Atasin",
    genericName: "Atorvastatin Calcium",
    company: "ACI Limited",
    category: "Tablet",
    strength: "10 mg",
    packSize: "50's pack",
    mrp: 600,
    screenshotDiscount: 15.84,
    newDiscountPercentage: 17.84,
    newSellingPrice: 492.96, // 600 * (1 - 0.1784)
    existingId: "6f4e1e5b-4105-49a9-9dba-73a1377fb4aa",
    availableStock: 100
  },
  {
    name: "Avloclav",
    genericName: "Amoxicillin + Clavulanic Acid",
    company: "ACI Limited",
    category: "Tablet",
    strength: "500 mg+125 mg", // Avloclav 625 is 500mg+125mg
    packSize: "24's pack",
    mrp: 840,
    screenshotDiscount: 21.79,
    newDiscountPercentage: 23.79,
    newSellingPrice: 640.16, // 840 * (1 - 0.2379)
    existingId: "bc052aca-f7fb-46c9-b77a-f2958c791e6c",
    availableStock: 100
  },
  {
    name: "Avlosef",
    genericName: "Cephradine",
    company: "ACI Limited",
    category: "Capsule",
    strength: "500 mg",
    packSize: "32's pack",
    mrp: 481.6,
    screenshotDiscount: 22.29,
    newDiscountPercentage: 24.29,
    newSellingPrice: 364.62, // 481.6 * (1 - 0.2429)
    existingId: "63a44e6a-a78b-4b7d-b7c1-d1c442408ec4",
    availableStock: 100
  },
  {
    name: "Biocal-D",
    genericName: "Calcium Carbonate [Algae source] + Vitamin D3",
    company: "ACI Limited",
    category: "Tablet",
    strength: "500 mg+200 IU",
    packSize: "30's pack",
    mrp: 330,
    screenshotDiscount: 19.85,
    newDiscountPercentage: 21.85,
    newSellingPrice: 257.90, // 330 * (1 - 0.2185)
    existingId: "48db963f-bef6-405e-b33e-16823037c737",
    availableStock: 100
  },
  {
    name: "Biocal-DX",
    genericName: "Calcium Carbonate [Algae source] + Vitamin D3",
    company: "ACI Limited",
    category: "Tablet",
    strength: "600 mg+400 IU",
    packSize: "30's pack",
    mrp: 480,
    screenshotDiscount: 17.08,
    newDiscountPercentage: 19.08,
    newSellingPrice: 388.42, // 480 * (1 - 0.1908)
    existingId: "91ab6453-7c89-4329-8fa8-bdcdfb659035",
    availableStock: 100
  },
  {
    name: "Breon",
    genericName: "Vilanterol Trifenatate + Fluticasone Furoate",
    company: "ACI Limited",
    category: "Capsule",
    strength: "25 mcg+100 mcg",
    packSize: "30's pack",
    mrp: 660,
    screenshotDiscount: 16.39,
    newDiscountPercentage: 18.39,
    newSellingPrice: 538.63, // 660 * (1 - 0.1839)
    existingId: "768b279f-4d79-4be7-8576-2c4e592abd33",
    availableStock: 100
  }
];

async function updateProducts() {
  console.log(`Starting update of ${targetProducts.length} products...`);
  let updatedCount = 0;
  let createdCount = 0;

  for (const item of targetProducts) {
    let targetId = item.existingId;

    if (!targetId) {
      // Find by matching name, company and strength
      const { data: existing } = await supabaseAdmin
        .from("products")
        .select("id, name, generic_name, strength")
        .ilike("name", item.name)
        .ilike("strength", `%${item.strength}%`)
        .maybeSingle();

      if (existing) {
        targetId = existing.id;
      }
    }

    // Do NOT include generated columns like discount_percentage in payload
    const payload: any = {
      name: item.name,
      generic_name: item.genericName,
      company: item.company,
      category_name_fallback: item.category,
      strength: item.strength,
      pack_size: item.packSize,
      mrp: item.mrp,
      selling_price: item.newSellingPrice,
      stock_quantity: item.availableStock ?? 100
    };

    if (targetId) {
      const { error: updateErr } = await supabaseAdmin
        .from("products")
        .update(payload)
        .eq("id", targetId);

      if (updateErr) {
        console.error(`Error updating product ${item.name} (${targetId}):`, updateErr);
      } else {
        // Also update or insert inventory
        const { data: inv } = await supabaseAdmin
          .from("inventory")
          .select("id")
          .eq("product_id", targetId)
          .maybeSingle();

        if (inv) {
          await supabaseAdmin
            .from("inventory")
            .update({
              available_stock: item.availableStock ?? 100,
              expiry_date: "2027-12-31"
            })
            .eq("id", inv.id);
        } else {
          await supabaseAdmin
            .from("inventory")
            .insert({
              product_id: targetId,
              available_stock: item.availableStock ?? 100,
              reserved_stock: 0,
              sold_stock: 0,
              batch_number: `B-${Math.floor(10000 + Math.random() * 90000)}`,
              expiry_date: "2027-12-31"
            });
        }

        updatedCount++;
        console.log(`[UPDATED] ${item.name} ${item.strength} (${item.packSize}) -> MRP: ৳${item.mrp}, Selling: ৳${item.newSellingPrice} (Target Disc: ${item.newDiscountPercentage}%)`);
      }
    } else {
      // Create new product
      const { data: newProd, error: insertErr } = await supabaseAdmin
        .from("products")
        .insert(payload)
        .select()
        .single();

      if (insertErr || !newProd) {
        console.error(`Error inserting product ${item.name}:`, insertErr);
      } else {
        await supabaseAdmin
          .from("inventory")
          .insert({
            product_id: newProd.id,
            available_stock: item.availableStock ?? 100,
            reserved_stock: 0,
            sold_stock: 0,
            batch_number: `B-${Math.floor(10000 + Math.random() * 90000)}`,
            expiry_date: "2027-12-31"
          });

        createdCount++;
        console.log(`[CREATED] ${item.name} ${item.strength} (${item.packSize}) with ID ${newProd.id} -> MRP: ৳${item.mrp}, Selling: ৳${item.newSellingPrice} (Target Disc: ${item.newDiscountPercentage}%)`);
      }
    }
  }

  console.log(`\nFinished successfully! Total Updated: ${updatedCount}, Total Created: ${createdCount}`);
}

updateProducts().catch(console.error);
