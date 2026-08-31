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

// 30 Products from Batch 2 Screenshots
// Rule: discount % = screenshot discount % + 2%
// Selling Price = MRP * (1 - newDiscountPercentage / 100) (rounded to 2 decimals)
const targetProducts: TargetProduct[] = [
  // --- SCREENSHOT 1 ---
  {
    name: "Brodil",
    genericName: "Salbutamol",
    company: "ACI Limited",
    category: "Tablet",
    strength: "2 mg",
    packSize: "500's pack",
    mrp: 130,
    screenshotDiscount: 16.20,
    newDiscountPercentage: 18.20,
    newSellingPrice: 106.34, // 130 * (1 - 0.1820)
    existingId: "90a081b5-765f-4cf8-9022-f3c4c246f771",
    availableStock: 100
  },
  {
    name: "Brodil HFA",
    genericName: "Salbutamol (Inhaler)",
    company: "ACI Limited",
    category: "Inhaler",
    strength: "100 mcg/puff",
    packSize: "1's pack",
    mrp: 250,
    screenshotDiscount: 13.70,
    newDiscountPercentage: 15.70,
    newSellingPrice: 210.75, // 250 * (1 - 0.1570)
    existingId: "ac31c77d-54b6-4e57-9410-cec1c48823a8",
    availableStock: 100
  },
  {
    name: "Brodil HFA Refill",
    genericName: "Salbutamol (Inhaler)",
    company: "ACI Limited",
    category: "Inhaler",
    strength: "100 mcg/puff",
    packSize: "200 metered doses",
    mrp: 220,
    screenshotDiscount: 12.66,
    newDiscountPercentage: 14.66,
    newSellingPrice: 187.75, // 220 * (1 - 0.1466)
    existingId: "3af4195e-4d2c-48c2-beb2-6a1cd4f4d887",
    availableStock: 100
  },
  {
    name: "Canazole",
    genericName: "Fluconazole",
    company: "ACI Limited",
    category: "Tablet",
    strength: "50 mg",
    packSize: "30's pack",
    mrp: 270,
    screenshotDiscount: 18.54,
    newDiscountPercentage: 20.54,
    newSellingPrice: 214.54, // 270 * (1 - 0.2054)
    existingId: "1266c88f-032d-4b2d-b9ec-8d358a9a5f33",
    availableStock: 100
  },
  {
    name: "Cartilex",
    genericName: "Glucosamine Sulfate + Chondroitin",
    company: "ACI Limited",
    category: "Tablet",
    strength: "250 mg+200 mg",
    packSize: "50's pack",
    mrp: 402.5,
    screenshotDiscount: 16.17,
    newDiscountPercentage: 18.17,
    newSellingPrice: 329.37, // 402.5 * (1 - 0.1817)
    existingId: "7acb419b-f6e7-4def-b916-1ee5ca78d582",
    availableStock: 100
  },
  {
    name: "Cefim-3",
    genericName: "Cefixime Trihydrate",
    company: "ACI Limited",
    category: "Capsule",
    strength: "200 mg",
    packSize: "14's pack",
    mrp: 630,
    screenshotDiscount: 22.80,
    newDiscountPercentage: 24.80,
    newSellingPrice: 473.76, // 630 * (1 - 0.2480)
    existingId: "5cebe0af-a2d2-4a3e-b5dd-0099b6d73c34",
    availableStock: 100
  },

  // --- SCREENSHOT 2 ---
  {
    name: "Cefim-3 DS",
    genericName: "Cefixime Trihydrate",
    company: "ACI Limited",
    category: "Capsule",
    strength: "400 mg",
    packSize: "14's pack",
    mrp: 840,
    screenshotDiscount: 23.32,
    newDiscountPercentage: 25.32,
    newSellingPrice: 627.31, // 840 * (1 - 0.2532)
    existingId: "d565b2f5-6c2f-434f-ba11-1271d81490d5",
    availableStock: 100
  },
  {
    name: "Ceftoren",
    genericName: "Cefditoren",
    company: "ACI Limited",
    category: "Tablet",
    strength: "200 mg",
    packSize: "8's pack",
    mrp: 1200,
    screenshotDiscount: 20.00,
    newDiscountPercentage: 22.00,
    newSellingPrice: 936.00, // 1200 * (1 - 0.22)
    existingId: "f8f2038c-8e70-4114-a87e-cb7835c963cc",
    availableStock: 0 // Out of Stock as in screenshot
  },
  {
    name: "Cerox CV",
    genericName: "Cefuroxime Axetil + Clavulanic Acid",
    company: "ACI Limited",
    category: "Tablet",
    strength: "250 mg+62.5 mg",
    packSize: "14's pack",
    mrp: 490,
    screenshotDiscount: 18.57,
    newDiscountPercentage: 20.57,
    newSellingPrice: 389.21, // 490 * (1 - 0.2057)
    existingId: "e53e0efb-a6d5-464e-8332-83135218240e",
    availableStock: 100
  },
  {
    name: "Cerox CV",
    genericName: "Cefuroxime Axetil + Clavulanic Acid",
    company: "ACI Limited",
    category: "Tablet",
    strength: "500 mg+125 mg",
    packSize: "14's pack",
    mrp: 840,
    screenshotDiscount: 19.06,
    newDiscountPercentage: 21.06,
    newSellingPrice: 663.10, // 840 * (1 - 0.2106)
    existingId: "a9814494-772c-463f-ba43-986ba90c8585",
    availableStock: 100
  },
  {
    name: "Chear",
    genericName: "Sertraline Hydrochloride",
    company: "ACI Limited",
    category: "Tablet",
    strength: "50 mg",
    packSize: "50's pack",
    mrp: 350,
    screenshotDiscount: 13.51,
    newDiscountPercentage: 15.51,
    newSellingPrice: 295.72, // 350 * (1 - 0.1551)
    existingId: "c024b8fb-22ba-450c-a2fd-cd09a7c99940",
    availableStock: 100
  },
  {
    name: "Cilocab",
    genericName: "Cilnidipine",
    company: "ACI Limited",
    category: "Tablet",
    strength: "10 mg",
    packSize: "30's pack",
    mrp: 300,
    screenshotDiscount: 16.00,
    newDiscountPercentage: 18.00,
    newSellingPrice: 246.00, // 300 * (1 - 0.18)
    existingId: "31ec6c10-cdab-4ff6-9ea9-7c69f3b7a588",
    availableStock: 0 // Out of Stock as in screenshot
  },

  // --- SCREENSHOT 3 ---
  {
    name: "Cilocab",
    genericName: "Cilnidipine",
    company: "ACI Limited",
    category: "Tablet",
    strength: "5 mg",
    packSize: "30's pack",
    mrp: 240,
    screenshotDiscount: 16.00,
    newDiscountPercentage: 18.00,
    newSellingPrice: 196.80, // 240 * (1 - 0.18)
    existingId: "3495e3eb-3687-43b1-bd72-58cbb3d95e26",
    availableStock: 0 // Out of Stock as in screenshot
  },
  {
    name: "Citazar",
    genericName: "Levetiracetam",
    company: "ACI Limited",
    category: "Tablet",
    strength: "500 mg",
    packSize: "10's pack",
    mrp: 300,
    screenshotDiscount: 15.32,
    newDiscountPercentage: 17.32,
    newSellingPrice: 248.04, // 300 * (1 - 0.1732)
    existingId: "3b904906-96e3-4da9-801c-0e9d002a9e20",
    availableStock: 100
  },
  {
    name: "Clonium",
    genericName: "Clonazepam",
    company: "ACI Limited",
    category: "Tablet",
    strength: "0.5 mg",
    packSize: "100's pack",
    mrp: 900,
    screenshotDiscount: 20.46,
    newDiscountPercentage: 22.46,
    newSellingPrice: 697.86, // 900 * (1 - 0.2246)
    existingId: "3821ab35-e8e0-4f8e-83b1-353e5628cef0",
    availableStock: 100
  },
  {
    name: "Clonium",
    genericName: "Clonazepam",
    company: "ACI Limited",
    category: "Tablet",
    strength: "1 mg",
    packSize: "50's pack",
    mrp: 550,
    screenshotDiscount: 18.19,
    newDiscountPercentage: 20.19,
    newSellingPrice: 438.96, // 550 * (1 - 0.2019)
    existingId: "97bf46e6-8530-4d66-98d1-9309203b4515",
    availableStock: 100
  },
  {
    name: "Clovate",
    genericName: "Clobetasol Propionate (Topical Preparation)",
    company: "ACI Limited",
    category: "Ointment",
    strength: "0.05% - Ointment",
    packSize: "1's pack",
    mrp: 70,
    screenshotDiscount: 14.89,
    newDiscountPercentage: 16.89,
    newSellingPrice: 58.18, // 70 * (1 - 0.1689)
    existingId: "829d000e-7028-4452-be11-16bb6e291953",
    availableStock: 100
  },
  {
    name: "Combair",
    genericName: "Salbutamol + Ipratropium (Inhaler)",
    company: "ACI Limited",
    category: "Inhaler",
    strength: "(100 mcg+20 mcg)/puff",
    packSize: "200 metered doses",
    mrp: 250.75,
    screenshotDiscount: 14.17,
    newDiscountPercentage: 16.17,
    newSellingPrice: 210.20, // 250.75 * (1 - 0.1617)
    existingId: "8f83a4fd-6f47-4951-958a-99faaabc3df7",
    availableStock: 100
  },

  // --- SCREENSHOT 4 ---
  {
    name: "Coport",
    genericName: "Empagliflozin",
    company: "ACI Limited",
    category: "Tablet",
    strength: "10 mg",
    packSize: "30's pack",
    mrp: 750,
    screenshotDiscount: 15.95,
    newDiscountPercentage: 17.95,
    newSellingPrice: 615.38, // 750 * (1 - 0.1795)
    existingId: "7b635931-74be-4f4e-85bc-1f63a6f4528c",
    availableStock: 100
  },
  {
    name: "Coport",
    genericName: "Empagliflozin",
    company: "ACI Limited",
    category: "Tablet",
    strength: "25 mg",
    packSize: "30's pack",
    mrp: 1350,
    screenshotDiscount: 12.66,
    newDiscountPercentage: 14.66,
    newSellingPrice: 1152.09, // 1350 * (1 - 0.1466)
    existingId: "db58725e-478e-474e-a1a5-0421502e57ee",
    availableStock: 100
  },
  {
    name: "Coport M",
    genericName: "Empagliflozin + Metformin Hydrochloride",
    company: "ACI Limited",
    category: "Tablet",
    strength: "5 mg+500 mg",
    packSize: "30's pack",
    mrp: 660,
    screenshotDiscount: 14.48,
    newDiscountPercentage: 16.48,
    newSellingPrice: 551.23, // 660 * (1 - 0.1648)
    existingId: "8ebaab8b-c196-425d-92e0-c5974a34f4d2",
    availableStock: 100
  },
  {
    name: "Cora-C",
    genericName: "Calcium Lactate Gluconate + Coral Calcium + Vitamin C + Vitamin D3",
    company: "ACI Limited",
    category: "Tablet",
    strength: "1000 mg+327 mg+500 mg",
    packSize: "14's pack",
    mrp: 210,
    screenshotDiscount: 13.04,
    newDiscountPercentage: 15.04,
    newSellingPrice: 178.42, // 210 * (1 - 0.1504)
    existingId: "21b644ff-7d8d-44a5-94a0-f40e73742481",
    availableStock: 100
  },
  {
    name: "Cora-D",
    genericName: "Calcium Carbonate [Coral source] + Vitamin D3",
    company: "ACI Limited",
    category: "Tablet",
    strength: "500 mg+200 IU",
    packSize: "50's pack",
    mrp: 600,
    screenshotDiscount: 16.11,
    newDiscountPercentage: 18.11,
    newSellingPrice: 491.34, // 600 * (1 - 0.1811)
    existingId: "750bdd49-3608-42c0-8b16-44526ba12394",
    availableStock: 100
  },
  {
    name: "Cora-DX",
    genericName: "Calcium Carbonate [Coral source] + Vitamin D3",
    company: "ACI Limited",
    category: "Tablet",
    strength: "600 mg+400 IU",
    packSize: "40's pack",
    mrp: 640,
    screenshotDiscount: 15.25,
    newDiscountPercentage: 17.25,
    newSellingPrice: 529.60, // 640 * (1 - 0.1725)
    existingId: "ac2996ef-ecbc-4875-a1a5-8a2a8c27b72a",
    availableStock: 100
  },

  // --- SCREENSHOT 5 ---
  {
    name: "Cora-DX Vita",
    genericName: "Calcium Lactate Gluconate + Calcium Carbonate + Vitamin D3",
    company: "ACI Limited",
    category: "Tablet",
    strength: "1358 mg",
    packSize: "14's pack",
    mrp: 238,
    screenshotDiscount: 22.31,
    newDiscountPercentage: 24.31,
    newSellingPrice: 180.14, // 238 * (1 - 0.2431)
    existingId: "4bac4a97-e762-4bef-8c25-780f48dcceca",
    availableStock: 100
  },
  {
    name: "Covista",
    genericName: "Molnupiravir",
    company: "ACI Limited",
    category: "Capsule",
    strength: "200 mg",
    packSize: "10's pack",
    mrp: 1200,
    screenshotDiscount: 16.07,
    newDiscountPercentage: 18.07,
    newSellingPrice: 983.16, // 1200 * (1 - 0.1807)
    availableStock: 100
  },
  {
    name: "Dermasim",
    genericName: "Clotrimazole (Topical)",
    company: "ACI Limited",
    category: "Topical Solution",
    strength: "1% - Topical Solution",
    packSize: "1's pack",
    mrp: 85,
    screenshotDiscount: 12.94,
    newDiscountPercentage: 14.94,
    newSellingPrice: 72.30, // 85 * (1 - 0.1494)
    existingId: "b06d5031-06ed-42ac-989a-cf0c5b7e5fa2",
    availableStock: 100
  },
  {
    name: "Doximar",
    genericName: "Doxophylline",
    company: "ACI Limited",
    category: "Tablet",
    strength: "200 mg",
    packSize: "50's pack",
    mrp: 400,
    screenshotDiscount: 17.50,
    newDiscountPercentage: 19.50,
    newSellingPrice: 322.00, // 400 * (1 - 0.1950)
    existingId: "597fab6d-8d32-4e68-b619-45b1804c540e",
    availableStock: 100
  },
  {
    name: "Doximar",
    genericName: "Doxophylline",
    company: "ACI Limited",
    category: "Tablet",
    strength: "400 mg",
    packSize: "50's pack",
    mrp: 700,
    screenshotDiscount: 23.69,
    newDiscountPercentage: 25.69,
    newSellingPrice: 520.17, // 700 * (1 - 0.2569)
    existingId: "8ce08349-aebd-4879-9589-329de55db515",
    availableStock: 100
  },
  {
    name: "Ebasten",
    genericName: "Ebastine",
    company: "ACI Limited",
    category: "Tablet",
    strength: "10 mg",
    packSize: "50's pack",
    mrp: 450,
    screenshotDiscount: 18.20,
    newDiscountPercentage: 20.20,
    newSellingPrice: 359.10, // 450 * (1 - 0.2020)
    existingId: "e6ef92d6-30d3-4241-9839-a70708e598c0",
    availableStock: 100
  }
];

async function updateBatch2() {
  console.log(`Starting update of ${targetProducts.length} Batch 2 products...`);
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

  console.log(`\nBatch 2 finished successfully! Total Updated: ${updatedCount}, Total Created: ${createdCount}`);
}

updateBatch2().catch(console.error);
