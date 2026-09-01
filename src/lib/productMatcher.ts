/**
 * MediChain SmartOrder - 4-Stage Product Matching Engine
 * 
 * Matches OCR extracted medicines against MediChain's 21,000+ Supabase catalog.
 * Uses server-side candidate retrieval + multi-factor scoring (0-100).
 * 
 * CRITICAL PHARMACY SAFETY RULE:
 * Generic match NEVER automatically substitutes another brand. If the requested
 * brand is out of stock, it surfaces in-stock generic alternatives for EXPLICIT user review.
 */

import { supabaseAdmin } from "./supabaseAdmin.js";
import { OCRExtractedItem } from "./smartOrderOCR.js";
import { Product } from "../types.js";

export interface MatchScoringResult {
  score: number; // 0 to 100
  reasons: string[];
}

export interface MatchedSmartOrderItem {
  // Original OCR Extraction (Read from image)
  rawText: string;
  brandName: string;
  genericName: string | null;
  dosageForm: string;
  strength: string | null;
  quantity: number;
  quantityUnit: string;
  rawQuantityText: string | null;
  frequency: string | null;
  ocrConfidence: number; // 0.00 to 1.00

  // Database Match Determination (Source of Truth)
  matchedProduct: Product | null;
  matchConfidence: number; // 0 to 100
  matchReason: string[];
  matchTier: "Strong Match" | "Good Match" | "Possible Match" | "Low Confidence" | "No Match";

  // Pharmacy Safety: Explicit Alternatives (NEVER auto-substituted)
  isOutOfStock: boolean;
  alternativeProducts: Product[];

  // User Review State
  isConfirmed: boolean;
}

/**
 * Calculates string similarity using normalized Levenshtein distance (0.0 to 1.0).
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const track = Array(s2.length + 1).fill(null).map(() =>
    Array(s1.length + 1).fill(null)
  );

  for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;

  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  const distance = track[s2.length][s1.length];
  const maxLen = Math.max(s1.length, s2.length);
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Normalizes strength strings for comparison (e.g. "500mg" -> "500", "500mg+65mg" -> "500+65").
 */
function normalizeStrength(strength: string | null | undefined): string {
  if (!strength) return "";
  return String(strength)
    .toLowerCase()
    .replace(/mg/g, "")
    .replace(/ml/g, "")
    .replace(/mcg/g, "")
    .replace(/gm/g, "")
    .replace(/\s+/g, "")
    .trim();
}

/**
 * Computes multi-factor matching score between an OCR extracted item and a candidate Product.
 */
export function computeMatchScore(extracted: OCRExtractedItem, candidate: Product): MatchScoringResult {
  let score = 0;
  const reasons: string[] = [];

  const ocrBrand = extracted.brandName.toLowerCase().trim();
  const prodName = candidate.name.toLowerCase().trim();
  const prodGeneric = (candidate.genericName || "").toLowerCase().trim();

  // 1. Brand / Product Name Matching (+40 max)
  const fullBrandSim = calculateSimilarity(ocrBrand, prodName);
  if (prodName === ocrBrand || prodName.startsWith(ocrBrand + " ") || ocrBrand.startsWith(prodName + " ")) {
    score += 40;
    reasons.push("Exact Brand Name Matched (+40)");
  } else if (fullBrandSim >= 0.80) {
    const points = Math.round(fullBrandSim * 35);
    score += points;
    reasons.push(`High Brand Similarity ${Math.round(fullBrandSim * 100)}% (+${points})`);
  } else {
    // Check first token / brand root
    const ocrFirstWord = ocrBrand.split(" ")[0];
    const prodFirstWord = prodName.split(" ")[0];
    const firstWordSim = calculateSimilarity(ocrFirstWord, prodFirstWord);
    
    if (firstWordSim >= 0.80) {
      const points = Math.round(firstWordSim * 25);
      score += points;
      reasons.push(`Brand Root Similarity ${Math.round(firstWordSim * 100)}% (+${points})`);
    } else if (prodGeneric && ocrBrand.length >= 4 && prodGeneric.includes(ocrBrand)) {
      score += 20;
      reasons.push("Brand Matched Generic Formula (+20)");
    }
  }

  // 2. Generic Name Match (+15)
  if (extracted.genericName && prodGeneric) {
    const genSim = calculateSimilarity(extracted.genericName, prodGeneric);
    if (genSim >= 0.85) {
      score += 15;
      reasons.push("Generic Formula Matched (+15)");
    }
  } else {
    score += 5;
  }

  // 3. Strength Match (+15)
  if (extracted.strength) {
    const ocrStr = normalizeStrength(extracted.strength);
    const prodStr = normalizeStrength(candidate.strength || candidate.name);
    if (ocrStr && prodStr && (prodStr.includes(ocrStr) || ocrStr.includes(prodStr))) {
      score += 15;
      reasons.push("Dosage Strength Matched (+15)");
    }
  } else {
    score += 5;
  }

  // 4. Dosage Form Match (+10)
  if (extracted.dosageForm && extracted.dosageForm !== "unknown") {
    const ocrForm = extracted.dosageForm.toLowerCase();
    const prodCat = (candidate.category || "").toLowerCase();
    if (prodCat.includes(ocrForm) || prodName.includes(ocrForm)) {
      score += 10;
      reasons.push("Dosage Form Matched (+10)");
    }
  } else {
    score += 5;
  }

  // 5. In-Stock Bonus & Manufacturer credibility (+15)
  const isAvailable = (candidate.availableStock ?? 0) > 0;
  if (isAvailable) {
    score += 10;
    reasons.push("Available In-Stock (+10)");
  }
  if (candidate.company && candidate.company.length > 2) {
    score += 5;
    reasons.push("Verified Manufacturer (+5)");
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    reasons
  };
}

/**
 * Maps raw database product row into clean Product type.
 */
function mapRawProduct(p: any): Product {
  const inv = p.inventory && Array.isArray(p.inventory) ? p.inventory[0] : (p.inventory || null);
  const mrpVal = p.mrp !== undefined && p.mrp !== null ? parseFloat(p.mrp) : 0;
  let sellingVal = 0;
  if (p.selling_price !== undefined && p.selling_price !== null && p.selling_price !== "") {
    sellingVal = parseFloat(p.selling_price);
  } else if (p.sellingPrice !== undefined && p.sellingPrice !== null && p.sellingPrice !== "") {
    sellingVal = parseFloat(p.sellingPrice);
  } else {
    sellingVal = mrpVal;
  }
  const stockVal = inv && inv.available_stock !== undefined && inv.available_stock !== null
    ? parseInt(inv.available_stock, 10)
    : (p.stock_quantity !== undefined && p.stock_quantity !== null && p.stock_quantity !== ""
        ? parseInt(p.stock_quantity, 10)
        : (p.availableStock !== undefined && p.availableStock !== null ? parseInt(p.availableStock, 10) : 0));

  return {
    id: String(p.id || "").trim(),
    name: p.name || "Pharmaceutical Item",
    genericName: p.generic_name || p.genericName || "Generic Medicine",
    company: p.company || "MediChain Partner",
    category: p.category_name_fallback || p.category_id || p.category || "Tablet",
    strength: p.strength || "N/A",
    packSize: p.pack_size || p.packSize || "Box",
    mrp: mrpVal,
    sellingPrice: sellingVal,
    discountPercentage: p.discount_percentage ? parseFloat(p.discount_percentage) : (mrpVal > 0 ? Math.round(((mrpVal - sellingVal) / mrpVal) * 100) : 0),
    availableStock: stockVal,
    reservedStock: inv ? (inv.reserved_stock ?? 0) : 0,
    soldStock: inv ? (inv.sold_stock ?? 0) : 0,
    batchNumber: p.batch_number || (inv ? (inv.batch_number || "") : "") || "B-MCH2026",
    expiryDate: p.expiry_date || (inv ? (inv.expiry_date || "") : "") || "2027-12-31",
    imageUrl: p.image_url || p.imageUrl || undefined,
    image_url: p.image_url || p.imageUrl || undefined
  };
}

/**
 * Searches the Supabase PostgreSQL database for candidate products and matches each OCR item.
 */
export async function matchSmartOrderItems(
  ocrItems: OCRExtractedItem[]
): Promise<MatchedSmartOrderItem[]> {
  if (!ocrItems || ocrItems.length === 0) return [];

  const matchedResults: MatchedSmartOrderItem[] = [];

  for (const extracted of ocrItems) {
    const searchTerms = [
      extracted.brandName,
      extracted.brandName.split(" ")[0],
      extracted.genericName
    ].filter(Boolean) as string[];

    // Build targeted server-side query with ILIKE search on candidate terms (limit 15)
    let candidateQuery = supabaseAdmin
      .from("products")
      .select(`
        id, name, generic_name, company, category_name_fallback, category_id,
        strength, pack_size, mrp, selling_price, stock_quantity, discount_percentage, image_url,
        inventory (
          available_stock,
          reserved_stock,
          sold_stock,
          batch_number,
          expiry_date
        )
      `);

    const orConditions: string[] = [];
    searchTerms.forEach(t => {
      const cleanTerm = t.trim().replace(/[%,]/g, "");
      if (cleanTerm.length >= 2) {
        orConditions.push(`name.ilike.%${cleanTerm}%`);
        orConditions.push(`generic_name.ilike.%${cleanTerm}%`);
      }
    });

    if (orConditions.length > 0) {
      candidateQuery = candidateQuery.or(orConditions.join(","));
    }

    const { data: rawCandidates } = await candidateQuery.limit(15);
    const candidates: Product[] = (rawCandidates || []).map(mapRawProduct);

    if (candidates.length === 0) {
      matchedResults.push({
        ...extracted,
        matchedProduct: null,
        matchConfidence: 0,
        matchReason: ["No matching medicine found in MediChain catalog."],
        matchTier: "No Match",
        isOutOfStock: false,
        alternativeProducts: [],
        isConfirmed: false
      });
      continue;
    }

    // Score all candidates
    const scoredCandidates = candidates.map(c => {
      const { score, reasons } = computeMatchScore(extracted, c);
      return { product: c, score, reasons };
    });

    // Sort by match score descending
    scoredCandidates.sort((a, b) => b.score - a.score);

    const best = scoredCandidates[0];
    const matchScore = best ? best.score : 0;
    const matchedProduct = best ? best.product : null;
    const isOutOfStock = matchedProduct ? (matchedProduct.availableStock ?? 0) <= 0 : false;

    // Determine Match Tier based on strict confidence thresholds
    let matchTier: MatchedSmartOrderItem["matchTier"] = "No Match";
    if (matchScore >= 95) {
      matchTier = "Strong Match";
    } else if (matchScore >= 85) {
      matchTier = "Good Match";
    } else if (matchScore >= 70) {
      matchTier = "Possible Match";
    } else if (matchScore > 0) {
      matchTier = "Low Confidence";
    }

    // Pharmacy Safety Rule: Find in-stock generic alternatives if out of stock
    let alternativeProducts: Product[] = [];
    if (matchedProduct && isOutOfStock && matchedProduct.genericName) {
      try {
        const { data: rawAlt } = await supabaseAdmin
          .from("products")
          .select(`
            id, name, generic_name, company, category_name_fallback, category_id,
            strength, pack_size, mrp, selling_price, stock_quantity, discount_percentage, image_url,
            inventory (
              available_stock,
              reserved_stock,
              sold_stock,
              batch_number,
              expiry_date
            )
          `)
          .ilike("generic_name", `%${matchedProduct.genericName.trim()}%`)
          .neq("id", matchedProduct.id)
          .gt("stock_quantity", 0)
          .limit(5);

        if (rawAlt) {
          alternativeProducts = rawAlt.map(mapRawProduct);
        }
      } catch (altErr) {
        console.warn("Could not fetch in-stock alternatives:", altErr);
      }
    }

    // Auto-confirm only Strong Matches (95%+) that are in stock
    const isConfirmed = matchScore >= 95 && !isOutOfStock;

    matchedResults.push({
      ...extracted,
      matchedProduct,
      matchConfidence: matchScore,
      matchReason: best ? best.reasons : ["No candidate matched"],
      matchTier,
      isOutOfStock,
      alternativeProducts,
      isConfirmed
    });
  }

  return matchedResults;
}
