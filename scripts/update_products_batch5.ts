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

// Products from Batch 5 Screenshot
// Rule: discount % = screenshot discount % + 2%
// Selling Price = MRP * (1 - newDiscountPercentage / 100) (rounded to 2 decimals)
const targetProducts: TargetProduct[] = [
  {
    name: "Vave",
    genericName: "Domperidone Maleate",
    company: "ACI Limited",
    category: "Tablet",
    strength: "10 mg",
    packSize: "150's pack",
    mrp: 600,
    screenshotDiscount: 27.11,
    newDiscountPercentage: 29.11,
    newSellingPrice: 425.34, // 600 * (1 - 0.2911)
    existingId: "450076c2-0113-49ee-8ed4-982d73763f12",
    availableStock: 100
  },
  {
    name: "Xeldrin",
    genericName: "Omeprazole",
    company: "ACI Limited",
    category: "Capsule",
    strength: "10 mg",
    packSize: "100's pack",
    mrp: 300,
    screenshotDiscount: 16.30,
    newDiscountPercentage: 18.30,
    newSellingPrice: 245.10, // 300 * (1 - 0.1830)
    existingId: "d47b6416-9d6f-459b-9497-7bcbd3a77d88",
    availableStock: 100
  },
  {
    name: "Xeldrin",
    genericName: "Omeprazole",
    company: "ACI Limited",
    category: "Capsule",
    strength: "20 mg",
    packSize: "100's pack",
    mrp: 600,
    screenshotDiscount: 52.53,
    newDiscountPercentage: 54.53,
    newSellingPrice: 272.82, // 600 * (1 - 0.5453)
    existingId: "010c0adb-9c51-4190-8bac-35d99e4733a4",
    availableStock: 100
  }
];

async function updateBatch5() {
  console.log(`Starting update of ${targetProducts.length} Batch 5 products...`);
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

  console.log(`\nBatch 5 finished successfully! Total Updated: ${updatedCount}, Total Created: ${createdCount}`);
}

updateBatch5().catch(console.error);
