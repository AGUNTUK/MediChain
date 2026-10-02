import { Product } from "../types";
import { checkDuplicate } from "./productValidator.js";

export interface RawImportRow {
  productName: string;
  genericName: string;
  companyName: string;
  category: string;
  strength: string;
  packSize: string;
  mrp: string;
  sellingPrice: string;
  buyingPrice?: string;
  batchNumber?: string;
  expiryDate?: string;
  stockQuantity?: string;
  imageUrl?: string;
}

export interface ValidationError {
  row: number;
  productName: string;
  errors: string[];
}

export interface ImportResult {
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  errors: ValidationError[];
  importedProducts: Product[];
}

/**
 * 1. CSV Parser Utility
 * Parses CSV raw string into key-value records based on headers
 */
export function parseCSV(csvContent: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines: string[] = [];
  let currentLine = "";
  let insideQuotes = false;

  // Manual character-by-character split to robustly support quotes and multi-line CSVs
  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = "";
      // Handle CRLF newlines
      if (char === "\r" && csvContent[i + 1] === "\n") {
        i++;
      }
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // Parse header line
  const rawHeaders = parseCSVLine(lines[0]);
  const headers = rawHeaders.map(h => h.trim());

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const rowObj: Record<string, string> = {};
    headers.forEach((header, index) => {
      rowObj[header] = values[index] !== undefined ? values[index].trim() : "";
    });
    rows.push(rowObj);
  }

  return { headers, rows };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let currentValue = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      // Check for double quotes inside quotes (escaped)
      if (insideQuotes && line[i + 1] === '"') {
        currentValue += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      result.push(currentValue);
      currentValue = "";
    } else {
      currentValue += char;
    }
  }
  result.push(currentValue);
  return result;
}

/**
 * Normalizes user-facing header labels into system parameter names
 */
export function mapRowToFields(row: Record<string, string>): RawImportRow {
  const findVal = (keys: string[]): string => {
    for (const k of keys) {
      // Look for case-insensitive match, stripping spaces and underscores
      const normalizedK = k.toLowerCase().replace(/[\s_-]/g, "");
      const foundKey = Object.keys(row).find(
        key => key.toLowerCase().replace(/[\s_-]/g, "") === normalizedK
      );
      if (foundKey) {
        return row[foundKey];
      }
    }
    return "";
  };

  const productName = findVal(["Product Name", "product_name", "product", "name"]);
  const genericName = findVal(["Generic Name", "generic_name", "generic", "formula"]);
  const companyName = findVal(["Company", "Company Name", "company_name", "company", "manufacturer", "brand"]);
  const rawCategory = findVal(["Category", "product_category", "type"]);
  const strength = findVal(["Strength", "power", "dose"]) || "N/A";
  
  // Robust category mapping to meet the strict 6 healthcare categories in types.ts
  let category = "Tablet";
  if (rawCategory) {
    const normCat = rawCategory.trim().toLowerCase();
    if (normCat.includes("tablet") || normCat.includes("bolus") || normCat.includes("suppository") || normCat.includes("pill")) {
      category = "Tablet";
    } else if (normCat.includes("capsule") || normCat.includes("cozycap") || normCat.includes("licap") || normCat.includes("softgel")) {
      category = "Capsule";
    } else if (normCat.includes("syrup") || normCat.includes("solution") || normCat.includes("suspension") || normCat.includes("drops") || normCat.includes("elixir") || normCat.includes("paste") || normCat.includes("wash") || normCat.includes("mixture")) {
      category = "Syrup";
    } else if (normCat.includes("injection") || normCat.includes("inj") || normCat.includes("vial") || normCat.includes("ampoule") || normCat.includes("infusion")) {
      category = "Injection";
    } else if (normCat.includes("cream") || normCat.includes("ointment") || normCat.includes("gel") || normCat.includes("lotion") || normCat.includes("spray") || normCat.includes("rub") || normCat.includes("paste")) {
      category = "Cream";
    } else if (normCat.includes("supplement") || normCat.includes("powder") || normCat.includes("sachet") || normCat.includes("granule")) {
      category = "Supplement";
    } else {
      category = "Tablet";
    }
  }

  // Sensible default value fallbacks for blank cells in bulk import spreadsheet
  const rawMrp = findVal(["MRP", "mrp_price", "mrp"]);
  const rawSellingPrice = findVal(["Selling Price", "selling_price", "price"]);
  const rawBuyingPrice = findVal(["Buying Price", "buying_price", "buying_cost", "purchase_price", "cost_price", "cost", "buying"]);
  const rawPackSize = findVal(["Pack Size", "pack_size", "pack", "size"]);
  const rawStock = findVal(["Stock", "Stock Quantity", "stock_quantity", "stock", "qty", "quantity"]);
  const rawBatch = findVal(["Batch Number", "batch_number", "batch", "batch_no"]);
  const rawExpiry = findVal(["Expiry Date", "expiry_date", "expiry", "exp"]);

  // Calculate random/consistent default price if missing
  const parsedMrp = parseFloat(rawMrp);
  const mrp = !isNaN(parsedMrp) && parsedMrp > 0 ? rawMrp : "120.00";
  
  const parsedSelling = parseFloat(rawSellingPrice);
  const sellingPrice = !isNaN(parsedSelling) && parsedSelling > 0 ? rawSellingPrice : (parseFloat(mrp) * 0.85).toFixed(2);
  
  const packSize = rawPackSize ? rawPackSize : "10's Pack";
  const stockQuantity = rawStock ? rawStock : "500";
  const batchNumber = rawBatch ? rawBatch : `B-SQ${Math.floor(100 + Math.random() * 900)}`;
  
  // Dynamic default of 2 years future expiry if blank
  const expiryDate = rawExpiry ? rawExpiry : new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  return {
    productName,
    genericName,
    companyName,
    category,
    strength,
    packSize,
    mrp,
    sellingPrice,
    buyingPrice: rawBuyingPrice.trim() || undefined,
    batchNumber,
    expiryDate,
    stockQuantity,
    imageUrl: findVal(["Image URL", "image_url", "image", "img_url", "url", "imageUrl"])
  };
}

/**
 * 2. Validation Utility
 * Validates a normalized import row against our robust healthcare schema rules
 */
export function validateImportRow(
  row: RawImportRow,
  rowIndex: number,
  existingProducts: any[]
): string[] {
  const errors: string[] = [];
  if (!row.productName || !row.productName.trim()) {
    errors.push("Missing Product Name");
  }

  if (row.buyingPrice !== undefined && row.buyingPrice !== "") {
    const bp = parseFloat(row.buyingPrice);
    if (isNaN(bp) || bp < 0) {
      errors.push(`Invalid Buying Price "${row.buyingPrice}". Must be a non-negative number (≥ 0).`);
    }
  }

  if (row.mrp) {
    const mrp = parseFloat(row.mrp);
    if (isNaN(mrp) || mrp <= 0) {
      errors.push("MRP must be greater than 0.");
    }
  }

  if (row.sellingPrice) {
    const sp = parseFloat(row.sellingPrice);
    if (isNaN(sp) || sp <= 0) {
      errors.push("Selling Price must be greater than 0.");
    }
  }

  return errors;
}

/**
 * 3. Product Mapping Utility
 * Converts a validated raw row into a production-ready Product record
 * Blank buying_price in a CSV will NOT erase existing buying_price!
 */
export function mapToProduct(row: RawImportRow, nextId: string, existingProduct?: any): Product {
  const mrpValue = parseFloat(row.mrp);
  const sellingPriceValue = parseFloat(row.sellingPrice);
  const discountPercent = Math.max(0, Math.round(((mrpValue - sellingPriceValue) / mrpValue) * 100));
  const qty = row.stockQuantity ? parseInt(row.stockQuantity, 10) : 1000;

  // Determine buyingPrice safely:
  // If explicitly specified with a valid number: update to new buying price.
  // If blank in CSV and existing product has a buying price: retain existing buying price.
  // If brand new product or unknown: NULL (never convert to 0 or 3%).
  let resolvedBuyingPrice: number | null = null;
  if (row.buyingPrice !== undefined && row.buyingPrice !== "" && !isNaN(parseFloat(row.buyingPrice))) {
    resolvedBuyingPrice = Math.round(parseFloat(row.buyingPrice) * 100) / 100;
  } else if (existingProduct && existingProduct.buyingPrice !== undefined && existingProduct.buyingPrice !== null) {
    resolvedBuyingPrice = existingProduct.buyingPrice;
  }

  return {
    id: nextId,
    name: row.productName,
    genericName: row.genericName,
    company: row.companyName,
    category: row.category as "Tablet" | "Capsule" | "Syrup" | "Injection" | "Cream" | "Supplement",
    strength: row.strength,
    packSize: row.packSize,
    mrp: mrpValue,
    sellingPrice: sellingPriceValue,
    buyingPrice: resolvedBuyingPrice,
    discountPercentage: discountPercent,
    availableStock: qty,
    reservedStock: existingProduct?.reservedStock || 0,
    soldStock: existingProduct?.soldStock || 0,
    batchNumber: row.batchNumber || existingProduct?.batchNumber || `B-IMP${Math.floor(100 + Math.random() * 900)}`,
    expiryDate: row.expiryDate || existingProduct?.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    imageUrl: row.imageUrl || existingProduct?.imageUrl || "",
    image_url: row.imageUrl || existingProduct?.image_url || ""
  };
}

/**
 * 4. Orchestrator Service
 * Runs validation, matches against existing catalog, handles safe updates
 */
export function importBulkCatalog(csvContent: string, currentCatalog: any[]): ImportResult {
  const { rows } = parseCSV(csvContent);
  const errors: ValidationError[] = [];
  const importedProducts: Product[] = [];
  
  let nextIdCounter = currentCatalog.reduce((max, p) => {
    const idNum = parseInt(String(p.id || "").replace("prod_", ""), 10);
    return isNaN(idNum) ? max : Math.max(max, idNum);
  }, 0) + 1;

  // Build lookup index for safe matching:
  // Match priority: 1) ID, 2) Name + Company + Strength, 3) Name + Company
  const catalogMapById = new Map<string, any>();
  const catalogMapByKey = new Map<string, any>();
  for (const p of currentCatalog) {
    if (p.id) {
      catalogMapById.set(String(p.id).trim().toLowerCase(), p);
    }
    const fullKey = `${(p.name || "").trim().toLowerCase()}_${(p.company || "").trim().toLowerCase()}_${(p.strength || "").trim().toLowerCase()}`;
    catalogMapByKey.set(fullKey, p);
    const shortKey = `${(p.name || "").trim().toLowerCase()}_${(p.company || "").trim().toLowerCase()}`;
    if (!catalogMapByKey.has(shortKey)) {
      catalogMapByKey.set(shortKey, p);
    }
  }

  rows.forEach((row, idx) => {
    const rowIndex = idx + 2; // +1 for 0-index offset, +1 for header line
    const mappedRow = mapRowToFields(row);
    
    // Validate
    const rowErrors = validateImportRow(mappedRow, rowIndex, [...currentCatalog, ...importedProducts]);
    
    if (rowErrors.length > 0) {
      errors.push({
        row: rowIndex,
        productName: mappedRow.productName || `Row ${rowIndex}`,
        errors: rowErrors
      });
    } else {
      // Find matching existing product if any
      const rowId = (row["id"] || row["ID"] || row["Product ID"] || row["product_id"] || "").trim().toLowerCase();
      let matchedExisting = rowId ? catalogMapById.get(rowId) : null;

      if (!matchedExisting && mappedRow.productName && mappedRow.companyName) {
        const fullKey = `${mappedRow.productName.trim().toLowerCase()}_${mappedRow.companyName.trim().toLowerCase()}_${(mappedRow.strength || "").trim().toLowerCase()}`;
        matchedExisting = catalogMapByKey.get(fullKey);
        if (!matchedExisting) {
          const shortKey = `${mappedRow.productName.trim().toLowerCase()}_${mappedRow.companyName.trim().toLowerCase()}`;
          matchedExisting = catalogMapByKey.get(shortKey);
        }
      }

      const pId = matchedExisting ? matchedExisting.id : `prod_${nextIdCounter++}`;
      const product = mapToProduct(mappedRow, pId, matchedExisting);
      importedProducts.push(product);
    }
  });

  return {
    totalProcessed: rows.length,
    successCount: importedProducts.length,
    failureCount: errors.length,
    errors,
    importedProducts
  };
}
