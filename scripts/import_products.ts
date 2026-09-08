/**
 * MediChain Bulk Product Catalog Importer Tool
 * 
 * Reusable CLI utility to parse, validate, and bulk-import CSV/JSON product catalogs into Supabase.
 * Uses core import validation rules from src/lib/importService.ts and persistence via src/lib/dbService.ts.
 * 
 * Usage:
 *   npx tsx scripts/import_products.ts <path-to-catalog.csv>
 * 
 * Example:
 *   npx tsx scripts/import_products.ts ./catalogs/beximco_catalog.csv
 */

import fs from 'fs';
import path from 'path';
import { importBulkCatalog } from '../src/lib/importService.js';
import { addOrUpdateProduct, getProductsRaw } from '../src/lib/dbService.js';

async function runImport() {
  const filePathArg = process.argv[2] || './src/raw_products.csv';
  const resolvedPath = path.resolve(filePathArg);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`\n❌ Error: Target catalog file not found at: ${resolvedPath}`);
    console.log(`Usage: npx tsx scripts/import_products.ts <path-to-catalog.csv>\n`);
    process.exit(1);
  }

  console.log(`Loading catalog file from: ${resolvedPath}`);
  const csvContent = fs.readFileSync(resolvedPath, 'utf-8');
  const existingProducts = await getProductsRaw();
  
  console.log("Starting validation and bulk import...");
  const result = importBulkCatalog(csvContent, existingProducts);
  
  console.log(`Validation finished. Success: ${result.successCount}, Errors: ${result.failureCount}`);
  
  if (result.errors.length > 0) {
    console.warn(`Encountered ${result.errors.length} row validation warnings/errors:`);
    console.table(result.errors.slice(0, 10));
  }

  let processed = 0;
  for (const product of result.importedProducts) {
    await addOrUpdateProduct(product as any);
    processed++;
    if (processed % 25 === 0 || processed === result.importedProducts.length) {
      console.log(`Saved ${processed} / ${result.importedProducts.length} products to database...`);
    }
  }
  
  console.log("✅ Bulk catalog import completed successfully.");
}

runImport().catch(console.error);
