import dotenv from "dotenv";
dotenv.config();
import { supabaseAdmin } from "../src/lib/supabaseAdmin.js";

const batch7Companies = [
  'Radiant Pharmaceuticals Limited',
  'Renata PLC',
  'SMC Enterprise Ltd',
  'Square Pharmaceuticals PLC',
  'Sun Pharmaceutical (Bangladesh)',
  'Synovia Pharma',
  'TEAM Pharmaceuticals Ltd',
  'UniMed UniHealth Pharmaceuticals Limited',
  'Veritas Pharmaceuticals Ltd',
  'ZISKA Pharmaceuticals Ltd'
];

async function check() {
  console.log("Checking Batch 7 companies product counts in Supabase:");
  let total = 0;
  for (const company of batch7Companies) {
    const { count, error } = await supabaseAdmin
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("company", company);
    console.log(`${company}: ${count} products (error: ${error?.message || 'none'})`);
    total += (count || 0);
  }
  console.log(`Total Batch 7 products in DB so far: ${total}`);

  const { count: grandTotal } = await supabaseAdmin
    .from("products")
    .select("*", { count: "exact", head: true });
  console.log(`Grand total products in database: ${grandTotal}`);
}

check().catch(console.error);
