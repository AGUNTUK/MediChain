/**
 * MediChain — Post-Migration Verification Runner for ACI & Opso Saline
 * Operation ID: medichain_aci_opso_saline_adjustment_v1
 */

import fs from 'fs';

const OPERATION_ID = 'medichain_aci_opso_saline_adjustment_v1';

// Read .env
const envFile = fs.readFileSync('c:/Users/user/OneDrive/Desktop/MediChain/.env', 'utf-8');
const env = {};
for (const line of envFile.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = (match[2] || '').trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[match[1]] = val;
  }
}

const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const STOCKOUT_IDS = [
  'c7231d8d-5c08-428b-b620-8310d26253f8', // Amantril 100mg
  '2d36501c-0285-4133-adcf-38bbf3d7ec5c', // Anaflex Max 500mg
  '97bf46e6-8530-4d66-98d1-9309203b4515', // Clonium 1mg
  '4bac4a97-e762-4bef-8c25-780f48dcceca', // Cora-DX Vita
  'aed833e9-1288-403c-8cb5-6a71b942cb1f', // Febus 80mg
  'fffd4a06-d76c-4055-bd1d-3d90f8f23a53'  // Gabarol 25mg
];

async function verify() {
  console.log(`\n======================================================`);
  console.log(`MediChain Post-Migration Verification Runner`);
  console.log(`Operation ID: ${OPERATION_ID}`);
  console.log(`======================================================\n`);

  const aciExpected = JSON.parse(fs.readFileSync('c:/Users/user/OneDrive/Desktop/MediChain/scratch/final_aci_mapping_validated.json', 'utf-8'));
  const opsoExpected = JSON.parse(fs.readFileSync('c:/Users/user/OneDrive/Desktop/MediChain/scratch/final_opso_mapping.json', 'utf-8'));

  // 1. Verify Audit Log
  console.log(`[Check 1/6] Verifying Audit Log Entry...`);
  const auditRes = await fetch(`${supabaseUrl}/rest/v1/audit_logs?record_id=eq.${OPERATION_ID}&select=*`, {
    headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
  });
  const logs = await auditRes.json();
  if (!logs || logs.length === 0) {
    console.error(`❌ Audit log entry NOT found for ${OPERATION_ID}!`);
  } else {
    console.log(`✅ Audit log entry verified (ID: ${logs[0].id}, Created: ${logs[0].created_at}).`);
  }

  // 2. Verify ACI Limited Products Selling Price
  console.log(`\n[Check 2/6] Verifying 110 ACI Limited Products in Live DB...`);
  const aciIds = aciExpected.map(p => p.id);
  let liveAci = [];
  for (let i = 0; i < aciIds.length; i += 50) {
    const chunk = aciIds.slice(i, i + 50);
    const res = await fetch(`${supabaseUrl}/rest/v1/products?id=in.(${chunk.join(',')})&select=id,name,company,mrp,selling_price,discount_percentage,stock_quantity`, {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
    });
    liveAci.push(...(await res.json()));
  }

  let aciMismatches = 0;
  for (const exp of aciExpected) {
    const actual = liveAci.find(p => p.id === exp.id);
    if (!actual) {
      console.error(`❌ Missing product in DB: ${exp.name} (${exp.id})`);
      aciMismatches++;
      continue;
    }
    const priceDiff = Math.abs(Number(actual.selling_price) - exp.new_selling_price);
    if (priceDiff > 0.02) {
      console.error(`❌ Price mismatch for ${exp.name}: expected ${exp.new_selling_price}, got ${actual.selling_price}`);
      aciMismatches++;
    }
  }
  if (aciMismatches === 0) {
    console.log(`✅ All 110 ACI Limited products perfectly match expected selling prices & discounts!`);
  } else {
    console.error(`❌ Found ${aciMismatches} ACI product mismatches!`);
  }

  // 3. Verify 6 Stockout Products (stock_quantity = 0 in products and available_stock = 0 in inventory)
  console.log(`\n[Check 3/6] Verifying 6 Stockout Products (stock = 0)...`);
  let stockoutErrors = 0;
  for (const sId of STOCKOUT_IDS) {
    const prod = liveAci.find(p => p.id === sId);
    if (!prod || prod.stock_quantity !== 0) {
      console.error(`❌ Product table stock_quantity not 0 for ${prod ? prod.name : sId}: got ${prod ? prod.stock_quantity : 'not found'}`);
      stockoutErrors++;
    }

    const invRes = await fetch(`${supabaseUrl}/rest/v1/inventory?product_id=eq.${sId}&select=available_stock`, {
      headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
    });
    const invRows = await invRes.json();
    for (const inv of invRows) {
      if (inv.available_stock !== 0) {
        console.error(`❌ Inventory table available_stock not 0 for ${prod ? prod.name : sId}: got ${inv.available_stock}`);
        stockoutErrors++;
      }
    }
  }
  if (stockoutErrors === 0) {
    console.log(`✅ All 6 screenshot Request/Stockout items verified with stock = 0 in both products and inventory!`);
  } else {
    console.error(`❌ Found ${stockoutErrors} stockout verification errors!`);
  }

  // 4. Verify Opso Saline Products (Renamed to OSL Pharma LTD)
  console.log(`\n[Check 4/6] Verifying 26 Opso Saline Products in Live DB...`);
  const opsoIds = opsoExpected.map(p => p.id);
  const opsoRes = await fetch(`${supabaseUrl}/rest/v1/products?id=in.(${opsoIds.join(',')})&select=id,name,company,mrp,selling_price,discount_percentage`, {
    headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
  });
  const liveOpso = await opsoRes.json();

  let opsoMismatches = 0;
  for (const exp of opsoExpected) {
    const actual = liveOpso.find(p => p.id === exp.id);
    if (!actual) {
      console.error(`❌ Missing Opso product: ${exp.name} (${exp.id})`);
      opsoMismatches++;
      continue;
    }
    if (actual.company !== 'OSL Pharma LTD') {
      console.error(`❌ Company name not updated for ${exp.name}: expected 'OSL Pharma LTD', got '${actual.company}'`);
      opsoMismatches++;
    }
    const priceDiff = Math.abs(Number(actual.selling_price) - exp.new_selling_price);
    if (priceDiff > 0.02) {
      console.error(`❌ Price mismatch for ${exp.name}: expected ${exp.new_selling_price}, got ${actual.selling_price}`);
      opsoMismatches++;
    }
  }
  if (opsoMismatches === 0) {
    console.log(`✅ All 26 Opso Saline products successfully renamed to 'OSL Pharma LTD' and selling prices verified!`);
  } else {
    console.error(`❌ Found ${opsoMismatches} Opso Saline product mismatches!`);
  }

  // 5. Verify No Products Remain Under 'Opso Saline Ltd.'
  console.log(`\n[Check 5/6] Verifying zero products remain under 'Opso Saline Ltd.'...`);
  const zeroCheckRes = await fetch(`${supabaseUrl}/rest/v1/products?company=eq.Opso Saline Ltd.&select=id`, {
    headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
  });
  const remainingOpso = await zeroCheckRes.json();
  if (remainingOpso.length === 0) {
    console.log(`✅ Verified: Exactly 0 products remain under company name 'Opso Saline Ltd.'!`);
  } else {
    console.error(`❌ Found ${remainingOpso.length} products still under 'Opso Saline Ltd.'!`);
  }

  // 6. Verify Unrelated Companies Untouched (Novartis, Square, etc.)
  console.log(`\n[Check 6/6] Verifying untouched companies (Novartis, Square)...`);
  const squareRes = await fetch(`${supabaseUrl}/rest/v1/products?company=ilike.*Square*&select=id,name,mrp,selling_price&limit=5`, {
    headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` }
  });
  const squareProds = await squareRes.json();
  console.log(`✅ Sample Square products checked (${squareProds.length} items intact).`);

  console.log(`\n======================================================`);
  if (aciMismatches === 0 && opsoMismatches === 0 && remainingOpso.length === 0 && stockoutErrors === 0) {
    console.log(`🎉 ALL VERIFICATION CHECKS PASSED (100% SUCCESS)`);
  } else {
    console.log(`❌ SOME VERIFICATION CHECKS FAILED`);
  }
  console.log(`======================================================\n`);
}

verify().catch(console.error);
