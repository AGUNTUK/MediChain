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

// 30 Products from Batch 4 Screenshots
// Rule: discount % = screenshot discount % + 2%
// Selling Price = MRP * (1 - newDiscountPercentage / 100) (rounded to 2 decimals)
const targetProducts: TargetProduct[] = [
  // --- SCREENSHOT 1 ---
  {
    name: "Minolac",
    genericName: "Ketorolac Tromethamine",
    company: "ACI Limited",
    category: "Tablet",
    strength: "10 mg",
    packSize: "40's pack",
    mrp: 480,
    screenshotDiscount: 24.68,
    newDiscountPercentage: 26.68,
    newSellingPrice: 351.94, // 480 * (1 - 0.2668)
    existingId: "0d07def7-6fc9-4823-94e1-280dd4f71fab",
    availableStock: 100
  },
  {
    name: "Miragon PR",
    genericName: "Mirabegron",
    company: "ACI Limited",
    category: "Tablet",
    strength: "25 mg",
    packSize: "30's pack",
    mrp: 900,
    screenshotDiscount: 18.00,
    newDiscountPercentage: 20.00,
    newSellingPrice: 720.00, // 900 * (1 - 0.20)
    existingId: "81e68621-44c7-429b-b37b-992a4bf9a6b9",
    availableStock: 0 // Out of Stock as in screenshot
  },
  {
    name: "Nabu",
    genericName: "Nabumetone",
    company: "ACI Limited",
    category: "Tablet",
    strength: "500 mg",
    packSize: "30's pack",
    mrp: 450,
    screenshotDiscount: 17.82,
    newDiscountPercentage: 19.82,
    newSellingPrice: 360.81, // 450 * (1 - 0.1982)
    existingId: "cdc85787-8ffb-459d-9a55-5b726c130d98",
    availableStock: 100
  },
  {
    name: "Nitrofur SR",
    genericName: "Nitrofurantoin",
    company: "ACI Limited",
    category: "Capsule",
    strength: "100 mg",
    packSize: "30's pack",
    mrp: 780,
    screenshotDiscount: 17.03,
    newDiscountPercentage: 19.03,
    newSellingPrice: 631.57, // 780 * (1 - 0.1903)
    existingId: "476ab9a6-0dc1-4d3d-b2f6-b64e03e148f2",
    availableStock: 100
  },
  {
    name: "Odazyth",
    genericName: "Azithromycin Dihydrate",
    company: "ACI Limited",
    category: "Tablet",
    strength: "500 mg",
    packSize: "15's pack",
    mrp: 600,
    screenshotDiscount: 28.09,
    newDiscountPercentage: 30.09,
    newSellingPrice: 419.46, // 600 * (1 - 0.3009)
    existingId: "a2424c6c-d811-4008-b0d3-001ba1d2886f",
    availableStock: 100
  },
  {
    name: "Othera",
    genericName: "Esomeprazole (MUPS tablet)",
    company: "ACI Limited",
    category: "Tablet",
    strength: "20 mg",
    packSize: "60's pack",
    mrp: 660,
    screenshotDiscount: 17.42,
    newDiscountPercentage: 19.42,
    newSellingPrice: 531.83, // 660 * (1 - 0.1942)
    existingId: "bf8f2728-0643-4035-8c60-f1ff6ce10ddf",
    availableStock: 100
  },

  // --- SCREENSHOT 2 ---
  {
    name: "Othera",
    genericName: "Esomeprazole (MUPS tablet)",
    company: "ACI Limited",
    category: "Tablet",
    strength: "40 mg",
    packSize: "30's pack",
    mrp: 510,
    screenshotDiscount: 15.54,
    newDiscountPercentage: 17.54,
    newSellingPrice: 420.55, // 510 * (1 - 0.1754)
    existingId: "3d24144d-3555-4fd8-b52d-7c279f9b7edf",
    availableStock: 100
  },
  {
    name: "Oxicam",
    genericName: "Tenoxicam",
    company: "ACI Limited",
    category: "Tablet",
    strength: "20 mg",
    packSize: "50's pack",
    mrp: 600,
    screenshotDiscount: 17.46,
    newDiscountPercentage: 19.46,
    newSellingPrice: 483.24, // 600 * (1 - 0.1946)
    existingId: "1fa2505a-4b9f-4ad1-9e56-2452eb5938d5",
    availableStock: 100
  },
  {
    name: "Oxima Plus",
    genericName: "Indacaterol + Glycopyrronium",
    company: "ACI Limited",
    category: "Inhalation Capsule",
    strength: "110 mcg+50 mcg",
    packSize: "20's pack",
    mrp: 800,
    screenshotDiscount: 14.38,
    newDiscountPercentage: 16.38,
    newSellingPrice: 668.96, // 800 * (1 - 0.1638)
    existingId: "89a96929-000f-4877-8b0c-1ab6289f63f7",
    availableStock: 100
  },
  {
    name: "Pantex",
    genericName: "Pantoprazole Sodium Sesquihydrate",
    company: "ACI Limited",
    category: "Tablet",
    strength: "20 mg",
    packSize: "50's pack",
    mrp: 350,
    screenshotDiscount: 20.69,
    newDiscountPercentage: 22.69,
    newSellingPrice: 270.59, // 350 * (1 - 0.2269)
    existingId: "6e391645-e902-49b6-b2f5-a709c9cc6da8",
    availableStock: 100
  },
  {
    name: "Parasoft",
    genericName: "Light Liquid Paraffin + White Soft Paraffin",
    company: "ACI Limited",
    category: "Ointment",
    strength: "6%+15%",
    packSize: "1's pack",
    mrp: 350,
    screenshotDiscount: 18.25,
    newDiscountPercentage: 20.25,
    newSellingPrice: 279.13, // 350 * (1 - 0.2025)
    availableStock: 100
  },
  {
    name: "Prosma",
    genericName: "Ketotifen Fumarate (Oral)",
    company: "ACI Limited",
    category: "Tablet",
    strength: "1 mg",
    packSize: "100's pack",
    mrp: 400,
    screenshotDiscount: 14.70,
    newDiscountPercentage: 16.70,
    newSellingPrice: 333.20, // 400 * (1 - 0.1670)
    existingId: "f5433568-552a-4092-8636-fcfb959752b1",
    availableStock: 100
  },

  // --- SCREENSHOT 3 ---
  {
    name: "Reversair",
    genericName: "Montelukast Sodium",
    company: "ACI Limited",
    category: "Tablet",
    strength: "5 mg",
    packSize: "30's pack",
    mrp: 270,
    screenshotDiscount: 15.00,
    newDiscountPercentage: 17.00,
    newSellingPrice: 224.10, // 270 * (1 - 0.17)
    existingId: "a7073b56-532d-4496-a3fb-2350d2185175",
    availableStock: 0 // Out of Stock as in screenshot
  },
  {
    name: "Reversair CT",
    genericName: "Montelukast Sodium",
    company: "ACI Limited",
    category: "Tablet",
    strength: "10 mg",
    packSize: "30's pack",
    mrp: 540,
    screenshotDiscount: 17.10,
    newDiscountPercentage: 19.10,
    newSellingPrice: 436.86, // 540 * (1 - 0.1910)
    availableStock: 100
  },
  {
    name: "Revital-32",
    genericName: "Multivitamin & Multimineral [A-Z gold preparation]",
    company: "ACI Limited",
    category: "Tablet",
    strength: "Tablet",
    packSize: "30's pack",
    mrp: 360,
    screenshotDiscount: 16.11,
    newDiscountPercentage: 18.11,
    newSellingPrice: 294.80, // 360 * (1 - 0.1811)
    existingId: "57f1bca2-2518-468e-b7e3-924bb0708ee2",
    availableStock: 100
  },
  {
    name: "Ritch",
    genericName: "Fexofenadine Hydrochloride",
    company: "ACI Limited",
    category: "Tablet",
    strength: "120 mg",
    packSize: "50's pack",
    mrp: 450,
    screenshotDiscount: 16.91,
    newDiscountPercentage: 18.91,
    newSellingPrice: 364.91, // 450 * (1 - 0.1891)
    existingId: "b2fbee48-be46-453b-b106-7aae9760735f",
    availableStock: 100
  },
  {
    name: "Rosetor",
    genericName: "Rosuvastatin",
    company: "ACI Limited",
    category: "Tablet",
    strength: "10 mg",
    packSize: "30's pack",
    mrp: 720,
    screenshotDiscount: 14.64,
    newDiscountPercentage: 16.64,
    newSellingPrice: 600.19, // 720 * (1 - 0.1664)
    existingId: "0ab04661-4be3-4ec4-a814-f5b444017c2a",
    availableStock: 100
  },
  {
    name: "Rosetor",
    genericName: "Rosuvastatin",
    company: "ACI Limited",
    category: "Tablet",
    strength: "20 mg",
    packSize: "20's pack",
    mrp: 600,
    screenshotDiscount: 14.64,
    newDiscountPercentage: 16.64,
    newSellingPrice: 500.16, // 600 * (1 - 0.1664)
    existingId: "4f001804-1202-48cd-8c76-4ca8978cb6fc",
    availableStock: 0 // Out of Stock as in screenshot
  },

  // --- SCREENSHOT 4 ---
  {
    name: "Rosetor",
    genericName: "Rosuvastatin",
    company: "ACI Limited",
    category: "Tablet",
    strength: "5 mg",
    packSize: "30's pack",
    mrp: 360,
    screenshotDiscount: 12.33,
    newDiscountPercentage: 14.33,
    newSellingPrice: 308.41, // 360 * (1 - 0.1433)
    existingId: "57575ca4-09c2-4808-939c-da14645e6adf",
    availableStock: 100
  },
  {
    name: "Seroxyn",
    genericName: "Salmeterol + Fluticasone Propionate",
    company: "ACI Limited",
    category: "Inhaler",
    strength: "(25 mcg+250 mcg)/puff",
    packSize: "1's pack",
    mrp: 820,
    screenshotDiscount: 14.66,
    newDiscountPercentage: 16.66,
    newSellingPrice: 683.39, // 820 * (1 - 0.1666)
    existingId: "72dc63c3-c573-4085-8a65-344ab4224cb3",
    availableStock: 100
  },
  {
    name: "Sitomet",
    genericName: "Sitagliptin + Metformin Hydrochloride",
    company: "ACI Limited",
    category: "Tablet",
    strength: "50 mg+1000 mg",
    packSize: "10's pack",
    mrp: 220,
    screenshotDiscount: 14.28,
    newDiscountPercentage: 16.28,
    newSellingPrice: 184.18, // 220 * (1 - 0.1628)
    existingId: "326c8813-8e0c-4f52-9838-7876d1a39dd5",
    availableStock: 100
  },
  {
    name: "Sitomet",
    genericName: "Sitagliptin + Metformin Hydrochloride",
    company: "ACI Limited",
    category: "Tablet",
    strength: "50 mg+500 mg",
    packSize: "30's pack",
    mrp: 600,
    screenshotDiscount: 15.17,
    newDiscountPercentage: 17.17,
    newSellingPrice: 496.98, // 600 * (1 - 0.1717)
    existingId: "4ee5f6b5-4fa8-461c-b2ff-efbe3a3da8f1",
    availableStock: 100
  },
  {
    name: "Skinabin",
    genericName: "Terbinafine Hydrochloride",
    company: "ACI Limited",
    category: "Cream",
    strength: "1%",
    packSize: "1's pack",
    mrp: 80,
    screenshotDiscount: 18.00,
    newDiscountPercentage: 20.00,
    newSellingPrice: 64.00, // 80 * (1 - 0.20)
    existingId: "c85997e9-b385-48ce-8c2f-84e8e8d9a9ad",
    availableStock: 0 // Out of Stock as in screenshot
  },
  {
    name: "Skinabin",
    genericName: "Terbinafine Hydrochloride",
    company: "ACI Limited",
    category: "Tablet",
    strength: "250 mg",
    packSize: "14's pack",
    mrp: 700,
    screenshotDiscount: 19.99,
    newDiscountPercentage: 21.99,
    newSellingPrice: 546.07, // 700 * (1 - 0.2199)
    existingId: "b5f02446-ad4a-40c3-bf30-637ea8a1eda5",
    availableStock: 100
  },

  // --- SCREENSHOT 5 ---
  {
    name: "Tenocab",
    genericName: "Amlodipine Besilate + Atenolol",
    company: "ACI Limited",
    category: "Tablet",
    strength: "5 mg+25 mg",
    packSize: "100's pack",
    mrp: 650,
    screenshotDiscount: 12.66,
    newDiscountPercentage: 14.66,
    newSellingPrice: 554.71, // 650 * (1 - 0.1466)
    existingId: "d62cb344-e7d1-458a-bb11-dce2e7a2cba7",
    availableStock: 100
  },
  {
    name: "Tenocab",
    genericName: "Amlodipine Besilate + Atenolol",
    company: "ACI Limited",
    category: "Tablet",
    strength: "5 mg+50 mg",
    packSize: "50's pack",
    mrp: 400,
    screenshotDiscount: 14.14,
    newDiscountPercentage: 16.14,
    newSellingPrice: 335.44, // 400 * (1 - 0.1614)
    existingId: "11dcf1a8-bdb2-4726-be75-5a008d8122e8",
    availableStock: 100
  },
  {
    name: "Tenoren",
    genericName: "Atenolol",
    company: "ACI Limited",
    category: "Tablet",
    strength: "50 mg",
    packSize: "200's pack",
    mrp: 154,
    screenshotDiscount: 13.19,
    newDiscountPercentage: 15.19,
    newSellingPrice: 130.61, // 154 * (1 - 0.1519)
    existingId: "a1250a24-31e4-4920-ac0a-d39cc064562a",
    availableStock: 100
  },
  {
    name: "Tridopa",
    genericName: "Levodopa + Carbidopa + Entacapone",
    company: "ACI Limited",
    category: "Tablet",
    strength: "100 mg+25 mg+200 mg",
    packSize: "20's pack",
    mrp: 501.6,
    screenshotDiscount: 13.99,
    newDiscountPercentage: 15.99,
    newSellingPrice: 421.39, // 501.6 * (1 - 0.1599)
    existingId: "174b860c-f645-4948-9d6a-45b5c723b6da",
    availableStock: 100
  },
  {
    name: "Tridopa",
    genericName: "Levodopa + Carbidopa + Entacapone",
    company: "ACI Limited",
    category: "Tablet",
    strength: "50 mg+12.5 mg+200 mg",
    packSize: "20's pack",
    mrp: 301,
    screenshotDiscount: 14.44,
    newDiscountPercentage: 16.44,
    newSellingPrice: 251.52, // 301 * (1 - 0.1644)
    existingId: "b97fcc16-7363-4ed1-87f2-2af6cbf9dbfb",
    availableStock: 100
  },
  {
    name: "Tynium",
    genericName: "Tiemonium Methylsulphate",
    company: "ACI Limited",
    category: "Tablet",
    strength: "50 mg",
    packSize: "50's pack",
    mrp: 425,
    screenshotDiscount: 15.00,
    newDiscountPercentage: 17.00,
    newSellingPrice: 352.75, // 425 * (1 - 0.17)
    existingId: "af3a179b-6254-4193-86b3-ba4ef1b3b781",
    availableStock: 0 // Out of Stock as in screenshot
  }
];

async function updateBatch4() {
  console.log(`Starting update of ${targetProducts.length} Batch 4 products...`);
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

  console.log(`\nBatch 4 finished successfully! Total Updated: ${updatedCount}, Total Created: ${createdCount}`);
}

updateBatch4().catch(console.error);
