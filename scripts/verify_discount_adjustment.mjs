/**
 * MediChain — Company-Wise Product Discount Adjustment Verification Script
 * 
 * Verifies live database state against pre-migration snapshot:
 * 1. Total products updated
 * 2. Total products unchanged
 * 3. Total products skipped
 * 4. Total products becoming 0%
 * 5. Confirmation that Novartis products were unchanged
 * 6. Confirmation that Square products were unchanged
 * 7. Confirmation that unmatched companies were unchanged
 * 8. Confirmation that MRP did not change
 * 9. Confirmation that stock did not change
 * 10. Confirmation that no negative discounts exist
 * 11. 20 real before → after product examples
 * 12. Final migration/audit operation ID
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

const backupFilePath = path.resolve('scripts', 'backup_products_pre_migration_v1.json');
if (!fs.existsSync(backupFilePath)) {
  console.error(`❌ FATAL: Backup file not found at ${backupFilePath}. Cannot verify without baseline snapshot.`);
  process.exit(1);
}

const backupProducts = JSON.parse(fs.readFileSync(backupFilePath, 'utf-8'));
const backupMap = new Map();
for (const p of backupProducts) {
  backupMap.set(p.id, p);
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

async function verifyMigration() {
  console.log(`\n======================================================`);
  console.log(`MediChain Post-Migration Verification`);
  console.log(`Operation ID: ${OPERATION_ID}`);
  console.log(`======================================================\n`);

  // Step 1: Check Audit Log
  const auditRes = await fetch(`${supabaseUrl}/rest/v1/audit_logs?record_id=eq.${OPERATION_ID}&select=*`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`
    }
  });
  const auditLogs = await auditRes.json();
  const auditExists = Array.isArray(auditLogs) && auditLogs.length > 0;
  console.log(`[Audit Check] Audit log recorded in DB: ${auditExists ? 'YES ✅' : 'NO ❌'}`);
  if (auditExists) {
    console.log(`  Record ID: ${auditLogs[0].record_id}`);
    console.log(`  Action: ${auditLogs[0].action}`);
    console.log(`  Timestamp: ${auditLogs[0].created_at}`);
  }

  // Step 2: Fetch Live Products
  console.log(`\n[Live DB Query] Fetching current products from database...`);
  let currentProducts = [];
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
    currentProducts.push(...batch);
    if (batch.length < pageSize) break;
    page++;
  }
  console.log(`✅ Fetched ${currentProducts.length} total live products.`);

  // Validation Metrics
  let updatedCount = 0;
  let unchangedCount = 0;
  let skippedCount = 0;
  let becoming0Count = 0;
  let negativeDiscountCount = 0;
  let mrpChangedCount = 0;
  let stockChangedCount = 0;
  let nameChangedCount = 0;
  let novartisChangedCount = 0;
  let squareChangedCount = 0;
  let unmatchedChangedCount = 0;
  let formulaDiscrepancyCount = 0;

  const realExamples = [];

  for (const curr of currentProducts) {
    const prev = backupMap.get(curr.id);
    if (!prev) {
      console.error(`❌ Unexpected product ID not in backup: ${curr.id}`);
      continue;
    }

    const prevMrp = Number(prev.mrp);
    const currMrp = Number(curr.mrp);
    if (prevMrp !== currMrp) mrpChangedCount++;

    const prevStock = Number(prev.stock_quantity);
    const currStock = Number(curr.stock_quantity);
    if (prevStock !== currStock) stockChangedCount++;

    if (prev.name !== curr.name || prev.generic_name !== curr.generic_name || prev.company !== curr.company) {
      nameChangedCount++;
    }

    const currDiscount = Number(curr.discount_percentage);
    if (currDiscount < 0) negativeDiscountCount++;

    const prevDiscount = Number(prev.discount_percentage);
    const prevSelling = Number(prev.selling_price);
    const currSelling = Number(curr.selling_price);

    const rule = matchCompanyRule(curr.company);

    if (!rule) {
      // Unmatched company
      skippedCount++;
      unchangedCount++;
      if (currDiscount !== prevDiscount || currSelling !== prevSelling) {
        unmatchedChangedCount++;
      }
      continue;
    }

    if (rule.noChange) {
      // Novartis or Square
      skippedCount++;
      unchangedCount++;
      if (rule.core === 'NOVARTIS') {
        if (currDiscount !== prevDiscount || currSelling !== prevSelling) novartisChangedCount++;
      }
      if (rule.core === 'SQUARE') {
        if (currDiscount !== prevDiscount || currSelling !== prevSelling) squareChangedCount++;
      }
      continue;
    }

    if (prevDiscount <= 0) {
      // Already 0%
      skippedCount++;
      unchangedCount++;
      if (currDiscount !== prevDiscount || currSelling !== prevSelling) {
        console.error(`❌ Product already at 0% changed: ${curr.name} (${curr.company})`);
      }
      continue;
    }

    // This product was supposed to be updated
    updatedCount++;

    const expectedDiscount = Math.max(0, Number((prevDiscount - rule.adjustment).toFixed(2)));
    const expectedSelling = Math.round(currMrp * (1 - expectedDiscount / 100) * 100) / 100;

    if (expectedDiscount === 0) becoming0Count++;

    if (Math.abs(currDiscount - expectedDiscount) > 0.02 || Math.abs(currSelling - expectedSelling) > 0.01) {
      formulaDiscrepancyCount++;
      console.error(`❌ Discrepancy for ${curr.name} (${curr.company}): expected disc ${expectedDiscount} got ${currDiscount}, expected sp ${expectedSelling} got ${currSelling}`);
    }

    // Collect 20 diverse real before/after examples
    if (realExamples.length < 20) {
      // Try to get 1 example per company until 20
      const companyAlreadyInExamples = realExamples.some(e => e.coreCompany === rule.core);
      if (!companyAlreadyInExamples || realExamples.length >= 15) {
        realExamples.push({
          productName: curr.name,
          company: curr.company,
          coreCompany: rule.core,
          adjustment: `${rule.adjustment}%`,
          mrp: `৳${currMrp}`,
          beforeDiscount: `${prevDiscount}%`,
          afterDiscount: `${currDiscount}%`,
          beforeSellingPrice: `৳${prevSelling}`,
          afterSellingPrice: `৳${currSelling}`
        });
      }
    }
  }

  console.log(`\n======================================================`);
  console.log(`VERIFICATION RESULTS SUMMARY`);
  console.log(`======================================================`);
  console.log(`1. Total products in catalog:               ${currentProducts.length}`);
  console.log(`2. Total products updated:                  ${updatedCount}`);
  console.log(`3. Total products unchanged:                ${unchangedCount}`);
  console.log(`4. Total products skipped:                  ${skippedCount}`);
  console.log(`5. Total products becoming 0%:              ${becoming0Count}`);
  console.log(`6. Novartis products unchanged:             ${novartisChangedCount === 0 ? 'CONFIRMED ✅ (0 changed)' : 'FAILED ❌'}`);
  console.log(`7. Square products unchanged:               ${squareChangedCount === 0 ? 'CONFIRMED ✅ (0 changed)' : 'FAILED ❌'}`);
  console.log(`8. Unmatched companies unchanged:           ${unmatchedChangedCount === 0 ? 'CONFIRMED ✅ (0 changed)' : 'FAILED ❌'}`);
  console.log(`9. MRP unchanged across all products:       ${mrpChangedCount === 0 ? 'CONFIRMED ✅ (0 changed)' : 'FAILED ❌'}`);
  console.log(`10. Stock unchanged across all products:     ${stockChangedCount === 0 ? 'CONFIRMED ✅ (0 changed)' : 'FAILED ❌'}`);
  console.log(`11. Non-pricing fields (name/generic/etc):   ${nameChangedCount === 0 ? 'CONFIRMED ✅ (0 changed)' : 'FAILED ❌'}`);
  console.log(`12. Negative discounts exist:               ${negativeDiscountCount === 0 ? 'NONE ✅ (0 negative)' : 'FAILED ❌'}`);
  console.log(`13. Mathematical formula discrepancies:     ${formulaDiscrepancyCount === 0 ? 'NONE ✅ (100% match)' : 'FAILED ❌'}`);
  console.log(`14. Migration/Audit Operation ID:           ${OPERATION_ID}`);
  console.log(`======================================================\n`);

  console.log(`--- 20 REAL BEFORE -> AFTER PRODUCT EXAMPLES ---`);
  console.table(realExamples);

  const allPassed = (
    updatedCount === 1821 &&
    unchangedCount === 382 &&
    skippedCount === 382 &&
    becoming0Count === 1 &&
    novartisChangedCount === 0 &&
    squareChangedCount === 0 &&
    unmatchedChangedCount === 0 &&
    mrpChangedCount === 0 &&
    stockChangedCount === 0 &&
    negativeDiscountCount === 0 &&
    formulaDiscrepancyCount === 0
  );

  if (!allPassed) {
    console.error(`❌ Post-migration verification FAILED one or more acceptance checks!`);
    process.exit(1);
  }

  console.log(`\n🎉 ALL VERIFICATION CRITERIA PASSED WITH 100% PRECISION!`);
}

verifyMigration().catch(err => {
  console.error("FATAL Verification Exception:", err);
  process.exit(1);
});
