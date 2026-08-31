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

// 30 Products from Batch 3 Screenshots
// Rule: discount % = screenshot discount % + 2%
// Selling Price = MRP * (1 - newDiscountPercentage / 100) (rounded to 2 decimals)
const targetProducts: TargetProduct[] = [
  // --- SCREENSHOT 1 ---
  {
    name: "Ezolid",
    genericName: "Linezolid",
    company: "ACI Limited",
    category: "Tablet",
    strength: "400 mg",
    packSize: "10's pack",
    mrp: 600,
    screenshotDiscount: 18.00,
    newDiscountPercentage: 20.00,
    newSellingPrice: 480.00, // 600 * (1 - 0.20)
    existingId: "d6ff985a-fa73-488f-973a-659b6e5c4a26",
    availableStock: 0 // Out of Stock as in screenshot
  },
  {
    name: "Febus",
    genericName: "Febuxostat",
    company: "ACI Limited",
    category: "Tablet",
    strength: "40 mg",
    packSize: "30's pack",
    mrp: 450,
    screenshotDiscount: 13.26,
    newDiscountPercentage: 15.26,
    newSellingPrice: 381.33, // 450 * (1 - 0.1526)
    existingId: "5382c93a-c109-43ac-b58b-26b56fba1bc3",
    availableStock: 100
  },
  {
    name: "Febus",
    genericName: "Febuxostat",
    company: "ACI Limited",
    category: "Tablet",
    strength: "80 mg",
    packSize: "30's pack",
    mrp: 750,
    screenshotDiscount: 17.29,
    newDiscountPercentage: 19.29,
    newSellingPrice: 605.33, // 750 * (1 - 0.1929)
    existingId: "aed833e9-1288-403c-8cb5-6a71b942cb1f",
    availableStock: 100
  },
  {
    name: "Feglo-FZ",
    genericName: "Ferrous Ascorbate + Folic Acid + Zinc Sulfate",
    company: "ACI Limited",
    category: "Tablet",
    strength: "48 mg+0.5 mg+22.5 mg",
    packSize: "60's pack",
    mrp: 420,
    screenshotDiscount: 17.46,
    newDiscountPercentage: 19.46,
    newSellingPrice: 338.27, // 420 * (1 - 0.1946)
    existingId: "c8c2aea6-82cc-42b3-b7f1-575f816135c9",
    availableStock: 100
  },
  {
    name: "Ferromax",
    genericName: "Iron Polymaltose Complex",
    company: "ACI Limited",
    category: "Capsule",
    strength: "30 mg",
    packSize: "32's pack",
    mrp: 352,
    screenshotDiscount: 17.62,
    newDiscountPercentage: 19.62,
    newSellingPrice: 282.94, // 352 * (1 - 0.1962)
    availableStock: 100
  },
  {
    name: "Flamex",
    genericName: "Ibuprofen",
    company: "ACI Limited",
    category: "Tablet",
    strength: "400 mg",
    packSize: "100's pack",
    mrp: 143,
    screenshotDiscount: 12.36,
    newDiscountPercentage: 14.36,
    newSellingPrice: 122.46, // 143 * (1 - 0.1436)
    existingId: "44988824-e49a-44e2-9527-6f4cf20853d5",
    availableStock: 100
  },

  // --- SCREENSHOT 2 ---
  {
    name: "Fluclox",
    genericName: "Flucloxacillin Sodium",
    company: "ACI Limited",
    category: "Capsule",
    strength: "250 mg",
    packSize: "100's pack",
    mrp: 800,
    screenshotDiscount: 16.54,
    newDiscountPercentage: 18.54,
    newSellingPrice: 651.68, // 800 * (1 - 0.1854)
    existingId: "fd7599bc-8709-4f6a-b8bc-a002bd43fedf",
    availableStock: 100
  },
  {
    name: "Fluclox",
    genericName: "Flucloxacillin Sodium",
    company: "ACI Limited",
    category: "Capsule",
    strength: "500 mg",
    packSize: "40's pack",
    mrp: 560,
    screenshotDiscount: 14.70,
    newDiscountPercentage: 16.70,
    newSellingPrice: 466.48, // 560 * (1 - 0.1670)
    existingId: "e22b8ba6-09df-4a06-9f50-e0c929756d7a",
    availableStock: 100
  },
  {
    name: "Fluver",
    genericName: "Flunarizine",
    company: "ACI Limited",
    category: "Tablet",
    strength: "10 mg",
    packSize: "100's pack",
    mrp: 700,
    screenshotDiscount: 17.29,
    newDiscountPercentage: 19.29,
    newSellingPrice: 564.97, // 700 * (1 - 0.1929)
    existingId: "d44c7d1f-1789-495a-b399-899255989921",
    availableStock: 100
  },
  {
    name: "Fluver",
    genericName: "Flunarizine",
    company: "ACI Limited",
    category: "Tablet",
    strength: "5 mg",
    packSize: "100's pack",
    mrp: 400,
    screenshotDiscount: 14.18,
    newDiscountPercentage: 16.18,
    newSellingPrice: 335.28, // 400 * (1 - 0.1618)
    existingId: "20b963bd-b915-4c59-9c9f-2eb2e341555b",
    availableStock: 100
  },
  {
    name: "Gabarol",
    genericName: "Pregabalin",
    company: "ACI Limited",
    category: "Capsule",
    strength: "25 mg",
    packSize: "30's pack",
    mrp: 330,
    screenshotDiscount: 18.24,
    newDiscountPercentage: 20.24,
    newSellingPrice: 263.21, // 330 * (1 - 0.2024)
    existingId: "fffd4a06-d76c-4055-bd1d-3d90f8f23a53",
    availableStock: 100
  },
  {
    name: "Gabarol",
    genericName: "Pregabalin",
    company: "ACI Limited",
    category: "Capsule",
    strength: "50 mg",
    packSize: "30's pack",
    mrp: 450,
    screenshotDiscount: 18.34,
    newDiscountPercentage: 20.34,
    newSellingPrice: 358.47, // 450 * (1 - 0.2034)
    existingId: "08a6d057-2dc6-405c-9f4c-c08b8488ad09",
    availableStock: 100
  },

  // --- SCREENSHOT 3 ---
  {
    name: "Gabarol",
    genericName: "Pregabalin",
    company: "ACI Limited",
    category: "Capsule",
    strength: "75 mg",
    packSize: "30's pack",
    mrp: 600,
    screenshotDiscount: 18.34,
    newDiscountPercentage: 20.34,
    newSellingPrice: 477.96, // 600 * (1 - 0.2034)
    availableStock: 0 // Out of Stock as in screenshot
  },
  {
    name: "Gabarol CR",
    genericName: "Pregabalin",
    company: "ACI Limited",
    category: "Tablet",
    strength: "165 mg",
    packSize: "20's pack",
    mrp: 700,
    screenshotDiscount: 17.09,
    newDiscountPercentage: 19.09,
    newSellingPrice: 566.37, // 700 * (1 - 0.1909)
    existingId: "a8d1f949-7788-4fe4-8eab-661a8d3e75de",
    availableStock: 100
  },
  {
    name: "Gabarol CR",
    genericName: "Pregabalin",
    company: "ACI Limited",
    category: "Tablet",
    strength: "82.5 mg",
    packSize: "30's pack",
    mrp: 750,
    screenshotDiscount: 15.90,
    newDiscountPercentage: 17.90,
    newSellingPrice: 615.75, // 750 * (1 - 0.1790)
    existingId: "c8ebd7d1-7201-4894-9a77-f946e35224ec",
    availableStock: 100
  },
  {
    name: "Gavilac",
    genericName: "Sodium Alginate + Sodium Bicarbonate + Calcium Carbonate",
    company: "ACI Limited",
    category: "Oral Suspension",
    strength: "(500 mg+213 mg+325 mg)/10 ml",
    packSize: "200 ml bottle",
    mrp: 300,
    screenshotDiscount: 18.33,
    newDiscountPercentage: 20.33,
    newSellingPrice: 239.01, // 300 * (1 - 0.2033)
    existingId: "71ba539b-b9e9-4678-9127-10fcf324ce47",
    availableStock: 100
  },
  {
    name: "Gavilac Tab",
    genericName: "Sodium Alginate + Sodium Bicarbonate + Calcium Carbonate",
    company: "ACI Limited",
    category: "Tablet",
    strength: "250 mg+133.5 mg+80 mg",
    packSize: "30's pack",
    mrp: 240,
    screenshotDiscount: 14.61,
    newDiscountPercentage: 16.61,
    newSellingPrice: 200.14, // 240 * (1 - 0.1661)
    availableStock: 100
  },
  {
    name: "Glitin",
    genericName: "Linagliptin",
    company: "ACI Limited",
    category: "Tablet",
    strength: "5 mg",
    packSize: "30's pack",
    mrp: 750,
    screenshotDiscount: 15.08,
    newDiscountPercentage: 17.08,
    newSellingPrice: 621.90, // 750 * (1 - 0.1708)
    existingId: "a6bf074f-43a6-4c58-97a3-8546e430ef53",
    availableStock: 100
  },

  // --- SCREENSHOT 4 ---
  {
    name: "Glitin M",
    genericName: "Linagliptin + Metformin Hydrochloride",
    company: "ACI Limited",
    category: "Tablet",
    strength: "2.5 mg+850 mg",
    packSize: "30's pack",
    mrp: 450,
    screenshotDiscount: 14.42,
    newDiscountPercentage: 16.42,
    newSellingPrice: 376.11, // 450 * (1 - 0.1642)
    existingId: "fd5bc089-20e8-4eba-9c8b-c94488b269df",
    availableStock: 100
  },
  {
    name: "Indever",
    genericName: "Propranolol Hydrochloride",
    company: "ACI Limited",
    category: "Tablet",
    strength: "10 mg",
    packSize: "200's pack",
    mrp: 102,
    screenshotDiscount: 11.37,
    newDiscountPercentage: 13.37,
    newSellingPrice: 88.36, // 102 * (1 - 0.1337)
    existingId: "aaf0a882-a264-493c-a0ae-6d514f2b70da",
    availableStock: 100
  },
  {
    name: "Indever",
    genericName: "Propranolol Hydrochloride",
    company: "ACI Limited",
    category: "Tablet",
    strength: "20 mg",
    packSize: "100's pack",
    mrp: 100,
    screenshotDiscount: 11.67,
    newDiscountPercentage: 13.67,
    newSellingPrice: 86.33, // 100 * (1 - 0.1367)
    availableStock: 100
  },
  {
    name: "Indever",
    genericName: "Propranolol Hydrochloride",
    company: "ACI Limited",
    category: "Tablet",
    strength: "40 mg",
    packSize: "100's pack",
    mrp: 150,
    screenshotDiscount: 13.34,
    newDiscountPercentage: 15.34,
    newSellingPrice: 126.99, // 150 * (1 - 0.1534)
    existingId: "15b5ac2c-5a7f-4361-91a4-612a5accbfd0",
    availableStock: 100
  },
  {
    name: "Leflox",
    genericName: "Levofloxacin Hemihydrate",
    company: "ACI Limited",
    category: "Tablet",
    strength: "500 mg",
    packSize: "20's pack",
    mrp: 302.2,
    screenshotDiscount: 17.24,
    newDiscountPercentage: 19.24,
    newSellingPrice: 244.06, // 302.2 * (1 - 0.1924)
    existingId: "da7eba2d-6787-4e2c-a655-57e6d623ffd5",
    availableStock: 100
  },
  {
    name: "Liorel",
    genericName: "Baclofen",
    company: "ACI Limited",
    category: "Tablet",
    strength: "10 mg",
    packSize: "30's pack",
    mrp: 241.5,
    screenshotDiscount: 18.22,
    newDiscountPercentage: 20.22,
    newSellingPrice: 192.67, // 241.5 * (1 - 0.2022)
    existingId: "cb8f0d87-c5c0-460e-89d7-6e77dd250b5d",
    availableStock: 100
  },

  // --- SCREENSHOT 5 ---
  {
    name: "Lozide",
    genericName: "Gliclazide",
    company: "ACI Limited",
    category: "Tablet",
    strength: "80 mg",
    packSize: "60's pack",
    mrp: 480,
    screenshotDiscount: 14.50,
    newDiscountPercentage: 16.50,
    newSellingPrice: 400.80, // 480 * (1 - 0.1650)
    existingId: "b413a255-df97-4812-85d8-0feace932762",
    availableStock: 100
  },
  {
    name: "Mastel",
    genericName: "Mizolastine",
    company: "ACI Limited",
    category: "Tablet",
    strength: "10 mg",
    packSize: "30's pack",
    mrp: 210,
    screenshotDiscount: 14.40,
    newDiscountPercentage: 16.40,
    newSellingPrice: 175.56, // 210 * (1 - 0.1640)
    existingId: "54fc7999-dbfc-461a-9582-f463935b7acb",
    availableStock: 100
  },
  {
    name: "Memopil",
    genericName: "Piracetam",
    company: "ACI Limited",
    category: "Tablet",
    strength: "800 mg",
    packSize: "50's pack",
    mrp: 302,
    screenshotDiscount: 16.00,
    newDiscountPercentage: 18.00,
    newSellingPrice: 247.64, // 302 * (1 - 0.18)
    existingId: "14976b43-815b-4641-8ce1-ea03516244fc",
    availableStock: 0 // Out of Stock as in screenshot
  },
  {
    name: "Menogia",
    genericName: "Norethisterone Acetate",
    company: "ACI Limited",
    category: "Tablet",
    strength: "5 mg",
    packSize: "60's pack",
    mrp: 410,
    screenshotDiscount: 15.61,
    newDiscountPercentage: 17.61,
    newSellingPrice: 337.80, // 410 * (1 - 0.1761)
    existingId: "313b2bc6-3bc8-45d5-81f6-9306cdf54772",
    availableStock: 100
  },
  {
    name: "Micoral",
    genericName: "Miconazole Nitrate (Oral Gel)",
    company: "ACI Limited",
    category: "Oral Gel",
    strength: "2% w/w",
    packSize: "1's pack",
    mrp: 90,
    screenshotDiscount: 13.26,
    newDiscountPercentage: 15.26,
    newSellingPrice: 76.27, // 90 * (1 - 0.1526)
    existingId: "e865c6bf-1a45-41ad-bb1c-b8e9577e8504",
    availableStock: 100
  },
  {
    name: "Micosone",
    genericName: "Miconazole Nitrate + Hydrocortisone",
    company: "ACI Limited",
    category: "Cream",
    strength: "2%+1%",
    packSize: "1's pack",
    mrp: 50,
    screenshotDiscount: 15.00,
    newDiscountPercentage: 17.00,
    newSellingPrice: 41.50, // 50 * (1 - 0.17)
    existingId: "58ee89b7-a4e6-440e-b409-0f0c8adf67b3",
    availableStock: 0 // Out of Stock as in screenshot
  }
];

async function updateBatch3() {
  console.log(`Starting update of ${targetProducts.length} Batch 3 products...`);
  let updatedCount = 0;
  let createdCount = 0;

  for (const item of targetProducts) {
    let targetId = item.existingId;

    if (!targetId) {
      // Find by matching name and strength
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

  console.log(`\nBatch 3 finished successfully! Total Updated: ${updatedCount}, Total Created: ${createdCount}`);
}

updateBatch3().catch(console.error);
