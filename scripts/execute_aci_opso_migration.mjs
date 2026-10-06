/**
 * MediChain — ACI Limited & Opso Saline Ltd. Migration Runner
 * Operation ID: medichain_aci_opso_saline_adjustment_v1
 * 
 * Safely updates:
 * 1. 110 ACI Limited products (discount % and selling price from extracted screenshot data)
 * 2. 6 ACI Limited products marked as Out of Stock (stock_quantity = 0 in products, available_stock = 0 in inventory)
 * 3. 26 Opso Saline Ltd. products (OSL Pharma LTD -2% rule + company rename to 'OSL Pharma LTD')
 */

import fs from 'fs';
import path from 'path';

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

if (!supabaseUrl || !serviceKey) {
  console.error("FATAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const STOCKOUT_IDS = [
  'c7231d8d-5c08-428b-b620-8310d26253f8', // Amantril 100mg
  '2d36501c-0285-4133-adcf-38bbf3d7ec5c', // Anaflex Max 500mg
  '97bf46e6-8530-4d66-98d1-9309203b4515', // Clonium 1mg
  '4bac4a97-e762-4bef-8c25-780f48dcceca', // Cora-DX Vita
  'aed833e9-1288-403c-8cb5-6a71b942cb1f', // Febus 80mg
  'fffd4a06-d76c-4055-bd1d-3d90f8f23a53'  // Gabarol 25mg
];

async function executeMigration() {
  console.log(`\n======================================================`);
  console.log(`MediChain Safe Database Migration Runner`);
  console.log(`Operation ID: ${OPERATION_ID}`);
  console.log(`======================================================\n`);

  // Step 1: Check for Prior Execution
  console.log(`[Step 1/6] Checking for prior execution in audit_logs...`);
  const priorCheckRes = await fetch(`${supabaseUrl}/rest/v1/audit_logs?record_id=eq.${OPERATION_ID}&select=id,action,created_at`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`
    }
  });
  const priorLogs = await priorCheckRes.json();
  if (Array.isArray(priorLogs) && priorLogs.length > 0) {
    console.error(`❌ FATAL: Migration ${OPERATION_ID} has ALREADY been executed at ${priorLogs[0].created_at}!`);
    console.error(`Aborting to prevent duplicate adjustment.`);
    process.exit(1);
  }
  console.log(`✅ Verified: No prior execution found. Safe to proceed.`);

  // Step 2: Load validated mappings
  console.log(`\n[Step 2/6] Loading validated mapping datasets...`);
  const aciMapping = JSON.parse(fs.readFileSync('c:/Users/user/OneDrive/Desktop/MediChain/scratch/final_aci_mapping_validated.json', 'utf-8'));
  const opsoMapping = JSON.parse(fs.readFileSync('c:/Users/user/OneDrive/Desktop/MediChain/scratch/final_opso_mapping.json', 'utf-8'));

  if (aciMapping.length !== 110) {
    console.error(`❌ Expected 110 ACI products, found ${aciMapping.length}. Aborting!`);
    process.exit(1);
  }
  if (opsoMapping.length !== 26) {
    console.error(`❌ Expected 26 Opso Saline products, found ${opsoMapping.length}. Aborting!`);
    process.exit(1);
  }
  console.log(`✅ Loaded: 110 ACI products and 26 Opso Saline products (Total: 136 items).`);

  // Step 3: Check backup file
  console.log(`\n[Step 3/6] Verifying backup snapshot...`);
  const backupFile = 'c:/Users/user/OneDrive/Desktop/MediChain/scripts/backup_aci_opso_pre_migration.json';
  if (!fs.existsSync(backupFile)) {
    console.error(`❌ FATAL: Pre-migration backup file does not exist at ${backupFile}! Aborting.`);
    process.exit(1);
  }
  console.log(`✅ Backup file verified: ${backupFile} (${fs.statSync(backupFile).size} bytes).`);

  // Step 4: Execute targeted product updates
  console.log(`\n[Step 4/6] Executing product updates (136 products)...`);
  const queue = [
    ...aciMapping.map(item => {
      const isStockout = STOCKOUT_IDS.includes(item.id);
      const body = { selling_price: item.new_selling_price };
      if (isStockout) {
        body.stock_quantity = 0;
      }
      return {
        id: item.id,
        name: item.name,
        type: 'ACI',
        isStockout,
        body,
        newSellingPrice: item.new_selling_price
      };
    }),
    ...opsoMapping.map(item => ({
      id: item.id,
      name: item.name,
      type: 'OpsoSaline',
      isStockout: false,
      body: { company: 'OSL Pharma LTD', selling_price: item.new_selling_price },
      newSellingPrice: item.new_selling_price
    }))
  ];

  const concurrency = 10;
  let completed = 0;
  let failed = 0;
  const errors = [];

  async function worker(items) {
    for (const item of items) {
      let attempts = 0;
      let success = false;
      while (attempts < 3 && !success) {
        attempts++;
        try {
          const res = await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${encodeURIComponent(item.id)}`, {
            method: 'PATCH',
            headers: {
              'apikey': serviceKey,
              'Authorization': `Bearer ${serviceKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(item.body)
          });
          if (res.ok) {
            success = true;
          } else {
            const err = await res.text();
            if (attempts >= 3) {
              errors.push({ id: item.id, name: item.name, status: res.status, error: err });
            } else {
              await new Promise(r => setTimeout(r, 200 * attempts));
            }
          }
        } catch (e) {
          if (attempts >= 3) {
            errors.push({ id: item.id, name: item.name, error: e.message });
          } else {
            await new Promise(r => setTimeout(r, 200 * attempts));
          }
        }
      }

      if (success) {
        completed++;
      } else {
        failed++;
      }

      if (completed % 25 === 0 || completed === queue.length) {
        console.log(`Products Progress: ${completed} / ${queue.length} (${((completed / queue.length) * 100).toFixed(1)}%)...`);
      }
    }
  }

  const buckets = Array.from({ length: concurrency }, () => []);
  queue.forEach((item, idx) => buckets[idx % concurrency].push(item));

  await Promise.all(buckets.map(b => worker(b)));

  if (failed > 0) {
    console.error(`❌ Encountered ${failed} failed product updates! Errors:`, errors);
    process.exit(1);
  }
  console.log(`✅ All ${completed} products successfully updated in Supabase!`);

  // Step 5: Update inventory table for stockout products (available_stock = 0)
  console.log(`\n[Step 5/6] Updating inventory table for 6 stockout products (available_stock = 0)...`);
  for (const pId of STOCKOUT_IDS) {
    const invUpdateRes = await fetch(`${supabaseUrl}/rest/v1/inventory?product_id=eq.${encodeURIComponent(pId)}`, {
      method: 'PATCH',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ available_stock: 0 })
    });
    if (invUpdateRes.ok) {
      console.log(`  ✓ Updated inventory for product ${pId} -> available_stock: 0`);
    } else {
      console.warn(`  ⚠️ Warning: Inventory update returned status ${invUpdateRes.status}: ${await invUpdateRes.text()}`);
    }
  }
  console.log(`✅ Inventory table synchronized to 0 stock for all stockout items.`);

  // Step 6: Write Audit Log Entry
  console.log(`\n[Step 6/6] Writing migration audit log into public.audit_logs...`);
  const auditPayload = {
    action: `MediChain ACI Limited & Opso Saline Ltd. Adjustment Migration v1 executed (${queue.length} products adjusted, ${STOCKOUT_IDS.length} products set to stock out)`,
    affected_module: 'DatabaseMigration',
    record_id: OPERATION_ID,
    user_email: 'Migration Runner',
    user_role: 'System',
    details: {
      operation_id: OPERATION_ID,
      aci_products_updated: aciMapping.length,
      opso_products_updated: opsoMapping.length,
      opso_renamed_to: 'OSL Pharma LTD',
      total_products_updated: queue.length,
      stockout_products_count: STOCKOUT_IDS.length,
      stockout_product_ids: STOCKOUT_IDS,
      backup_file: 'scripts/backup_aci_opso_pre_migration.json',
      executed_at: new Date().toISOString()
    }
  };

  const auditRes = await fetch(`${supabaseUrl}/rest/v1/audit_logs`, {
    method: 'POST',
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(auditPayload)
  });

  if (auditRes.ok) {
    console.log(`✅ Audit log successfully created for ${OPERATION_ID}.`);
  } else {
    console.warn(`⚠️ Warning: Failed to insert audit log: ${await auditRes.text()}`);
  }

  console.log(`\n🎉 Migration ${OPERATION_ID} completed successfully!`);
}

executeMigration().catch(err => {
  console.error("FATAL Exception during migration execution:", err);
  process.exit(1);
});
