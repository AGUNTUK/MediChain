/**
 * MediChain — Company-Wise Product Discount Adjustment Migration
 * Operation ID: medichain_company_discount_adjustment_v1
 * 
 * Safely executes the one-time paired discount & selling price adjustment.
 */

import fs from 'fs';
import path from 'path';

const OPERATION_ID = 'medichain_company_discount_adjustment_v1';

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

// 52 Authoritative Company Rules
const AUTHORITATIVE_RULES = [
  { core: "ONE", adjustment: 3 },
  { core: "ORION", adjustment: 3 },
  { core: "NUVISTA", adjustment: 1 },
  { core: "NOVATEK", adjustment: 3 },
  { core: "NOVARTIS", adjustment: 0, noChange: true },
  { core: "OSL", adjustment: 2 },
  { core: "ZISKA", adjustment: 3 },
  { core: "SYNOVIA", adjustment: 2 },
  { core: "JAYSON", adjustment: 2 },
  { core: "MYSTIC", adjustment: 3 },
  { core: "LABAID", adjustment: 3 },
  { core: "KUMUDINI", adjustment: 3 },
  { core: "NAVANA", adjustment: 2 },
  { core: "OPSONIN", adjustment: 3 },
  { core: "EVEREST", adjustment: 1 },
  { core: "VERITAS", adjustment: 4 },
  { core: "NIPRO JMI", adjustment: 2 },
  { core: "GLOBE", adjustment: 3 },
  { core: "GENERAL", adjustment: 3 },
  { core: "GACO", adjustment: 4 },
  { core: "ETHICAL", adjustment: 4 },
  { core: "TEAM", adjustment: 3 },
  { core: "CHEMIST", adjustment: 4 },
  { core: "DRUG INTERNATIONAL", adjustment: 2 },
  { core: "DBL", adjustment: 3 },
  { core: "BRISTOL", adjustment: 4 },
  { core: "CENTRAL", adjustment: 4 },
  { core: "BOTANIC", adjustment: 4 },
  { core: "UNIMED UNIHEALTH", adjustment: 1 },
  { core: "IBN SINA", adjustment: 2 },
  { core: "DELTA", adjustment: 3 },
  { core: "BENHAM", adjustment: 4 },
  { core: "HEALTHCARE", adjustment: 2 },
  { core: "SUN", adjustment: 2 },
  { core: "APEX", adjustment: 3 },
  { core: "AMBEE", adjustment: 3 },
  { core: "EURO", adjustment: 4 },
  { core: "BIOPHARMA", adjustment: 3 },
  { core: "ESKAYEF", adjustment: 2 },
  { core: "ARISTOPHARMA", adjustment: 2 },
  { core: "PHARMASIA", adjustment: 2 },
  { core: "RADIANT", adjustment: 2 },
  { core: "SMC", adjustment: 2 },
  { core: "BEACON", adjustment: 2 },
  { core: "PRISTINE", adjustment: 2 },
  { core: "PACIFIC", adjustment: 5 },
  { core: "BEXIMCO", adjustment: 1 },
  { core: "ALBION", adjustment: 3 },
  { core: "SQUARE", adjustment: 0, noChange: true },
  { core: "POPULAR", adjustment: 2 },
  { core: "RENATA", adjustment: 2 },
  { core: "ACME", adjustment: 2 }
];

function normalizeCompanyName(name) {
  if (!name) return "";
  let clean = name.trim();
  clean = clean.replace(/[.,]/g, " ");
  const suffixes = [
    /\bpharmaceuticals\b/gi,
    /\bpharmaceutical\b/gi,
    /\bpharma\b/gi,
    /\blaboratories\b/gi,
    /\blaboratory\b/gi,
    /\bunani\b/gi,
    /\benterprise\b/gi,
    /\bbangladesh\b/gi,
    /\bbd\b/gi,
    /\bcorporation\b/gi,
    /\bco\b/gi,
    /\bcompany\b/gi,
    /\blimited\b/gi,
    /\bltd\b/gi,
    /\bplc\b/gi
  ];
  for (const s of suffixes) {
    clean = clean.replace(s, " ");
  }
  clean = clean.replace(/\s+/g, " ").trim().toUpperCase();
  return clean;
}

function matchCompanyRule(dbCompany) {
  const norm = normalizeCompanyName(dbCompany);
  for (const rule of AUTHORITATIVE_RULES) {
    const ruleCoreNorm = rule.core.toUpperCase().trim();
    if (norm === ruleCoreNorm) return rule;
    const normTokens = norm.split(' ');
    const ruleTokens = ruleCoreNorm.split(' ');
    if (ruleTokens.length > 1) {
      if (norm.startsWith(ruleCoreNorm)) return rule;
    } else {
      if (normTokens[0] === ruleTokens[0]) return rule;
    }
  }
  return null;
}

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
    console.error(`Aborting to prevent double adjustment.`);
    process.exit(1);
  }
  console.log(`✅ Verified: No prior execution found. Migration is safe to proceed.`);

  // Step 2: Fetch all products
  console.log(`\n[Step 2/6] Fetching all products from live database...`);
  let allProducts = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const res = await fetch(`${supabaseUrl}/rest/v1/products?select=*&order=id&offset=${page * pageSize}&limit=${pageSize}`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      }
    });
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    allProducts.push(...batch);
    if (batch.length < pageSize) break;
    page++;
  }
  console.log(`✅ Fetched ${allProducts.length} total products.`);
  if (allProducts.length !== 2203) {
    console.warn(`⚠️ Warning: Expected 2203 products, found ${allProducts.length}.`);
  }

  // Step 3: Create Full Local Pre-Migration Backup Snapshot
  console.log(`\n[Step 3/6] Creating pre-migration snapshot backup...`);
  const backupDir = path.resolve('scripts');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupFilePath = path.join(backupDir, 'backup_products_pre_migration_v1.json');
  fs.writeFileSync(backupFilePath, JSON.stringify(allProducts, null, 2), 'utf-8');
  console.log(`✅ Pre-migration snapshot saved to: ${backupFilePath} (${fs.statSync(backupFilePath).size} bytes)`);

  // Step 4: Plan and Validate Specific Product Updates
  console.log(`\n[Step 4/6] Planning and validating specific product updates...`);
  const toUpdate = [];
  let unchangedCount = 0;
  let noChangeCompanyCount = 0;
  let unmatchedCount = 0;
  let already0Count = 0;
  let becoming0Count = 0;

  for (const p of allProducts) {
    const rule = matchCompanyRule(p.company);
    if (!rule) {
      unmatchedCount++;
      unchangedCount++;
      continue;
    }

    if (rule.noChange) {
      noChangeCompanyCount++;
      unchangedCount++;
      continue;
    }

    const curDiscount = Number(p.discount_percentage || 0);
    if (curDiscount <= 0) {
      already0Count++;
      unchangedCount++;
      continue;
    }

    const newDiscount = Math.max(0, Number((curDiscount - rule.adjustment).toFixed(2)));
    if (newDiscount === 0) {
      becoming0Count++;
    }

    const mrp = Number(p.mrp);
    const newSellingPrice = Math.round(mrp * (1 - newDiscount / 100) * 100) / 100;

    toUpdate.push({
      id: p.id,
      name: p.name,
      company: p.company,
      coreCompany: rule.core,
      adjustment: rule.adjustment,
      mrp,
      oldDiscount: curDiscount,
      newDiscount,
      oldSellingPrice: Number(p.selling_price),
      newSellingPrice
    });
  }

  console.log(`Validation summary:`);
  console.log(`- Products to update: ${toUpdate.length}`);
  console.log(`- Products unchanged: ${unchangedCount} (No-change companies: ${noChangeCompanyCount}, Already 0%: ${already0Count}, Unmatched: ${unmatchedCount})`);
  console.log(`- Products becoming 0%: ${becoming0Count}`);

  if (toUpdate.length !== 1821) {
    console.error(`❌ Validation failed: expected 1821 products to update, got ${toUpdate.length}. Aborting!`);
    process.exit(1);
  }

  // Step 5: Execute Targeted Updates in Controlled Concurrent Batches
  console.log(`\n[Step 5/6] Executing targeted updates (${toUpdate.length} products)...`);
  const concurrency = 15;
  let completed = 0;
  let failed = 0;
  const errors = [];

  async function updateWorker(items) {
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
            body: JSON.stringify({
              selling_price: item.newSellingPrice
            })
          });
          if (res.ok) {
            success = true;
          } else {
            const errText = await res.text();
            if (attempts >= 3) {
              errors.push({ id: item.id, name: item.name, status: res.status, error: errText });
            } else {
              await new Promise(r => setTimeout(r, 200 * attempts));
            }
          }
        } catch (err) {
          if (attempts >= 3) {
            errors.push({ id: item.id, name: item.name, error: err.message });
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

      if (completed % 100 === 0 || completed === toUpdate.length) {
        console.log(`Progress: ${completed} / ${toUpdate.length} products updated (${((completed / toUpdate.length) * 100).toFixed(1)}%)...`);
      }
    }
  }

  // Partition items across concurrency workers
  const buckets = Array.from({ length: concurrency }, () => []);
  toUpdate.forEach((item, idx) => {
    buckets[idx % concurrency].push(item);
  });

  await Promise.all(buckets.map(b => updateWorker(b)));

  if (failed > 0) {
    console.error(`❌ Migration encountered ${failed} failed updates! Errors:`, errors);
    process.exit(1);
  }
  console.log(`✅ All ${completed} products successfully updated in Supabase!`);

  // Step 6: Record Audit Log Entry
  console.log(`\n[Step 6/6] Writing migration audit trail into public.audit_logs...`);
  const auditPayload = {
    action: `MediChain Company-Wise Product Discount Adjustment Migration v1 executed (${toUpdate.length} products adjusted)`,
    affected_module: 'DatabaseMigration',
    record_id: OPERATION_ID,
    user_email: 'Migration Runner',
    user_role: 'System',
    details: {
      operation_id: OPERATION_ID,
      total_catalog_products: allProducts.length,
      total_products_updated: toUpdate.length,
      total_products_unchanged: unchangedCount,
      total_products_becoming_zero: becoming0Count,
      no_change_companies: ['Novartis', 'Square'],
      unmatched_companies_count: unmatchedCount,
      backup_file: 'scripts/backup_products_pre_migration_v1.json',
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
