/**
 * High-Performance, Zero-Egress In-Memory Fuzzy Search Engine for MediChain
 * 
 * Supports typo-tolerant matching across:
 * - Product Brand Name (e.g., "Napa Extra")
 * - Generic Name (e.g., "Paracetamol + Caffeine")
 * - Pharmaceutical Manufacturer (e.g., "Beximco Pharmaceuticals Ltd")
 */

import { Product } from "../types";

/**
 * Computes Damerau-Levenshtein distance between two strings with transposition support.
 */
export function damerauLevenshteinDistance(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const matrix: number[][] = [];
  for (let i = 0; i <= al; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= bl; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // Deletion
        matrix[i][j - 1] + 1,      // Insertion
        matrix[i - 1][j - 1] + cost // Substitution
      );

      // Transposition
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + cost);
      }
    }
  }

  return matrix[al][bl];
}

/**
 * Checks if query term matches target word with typo tolerance based on length:
 * - Length 1-3: exact substring or prefix only (no edits)
 * - Length 4-5: edit distance <= 1
 * - Length 6+: edit distance <= 2
 */
export function isFuzzyTermMatch(queryTerm: string, targetWord: string): { isMatch: boolean; score: number } {
  const q = queryTerm.toLowerCase();
  const t = targetWord.toLowerCase();

  // Exact match
  if (q === t) {
    return { isMatch: true, score: 100 };
  }

  // Exact prefix match
  if (t.startsWith(q)) {
    return { isMatch: true, score: 90 };
  }

  // Exact substring
  if (t.includes(q)) {
    return { isMatch: true, score: 80 };
  }

  const qLen = q.length;
  const tLen = t.length;

  // For very short queries, only exact/prefix matches are allowed to avoid noise
  if (qLen < 4) {
    return { isMatch: false, score: 0 };
  }

  // Compare full word
  const maxAllowedDistance = qLen >= 6 ? 2 : 1;
  const dist = damerauLevenshteinDistance(q, t);

  if (dist <= maxAllowedDistance) {
    // Score based on distance
    const penalty = dist * 15;
    return { isMatch: true, score: Math.max(50, 75 - penalty) };
  }

  // Also check if any substring of targetWord of similar length matches fuzzy
  if (tLen > qLen + 1) {
    for (let i = 0; i <= tLen - qLen; i++) {
      const sub = t.slice(i, i + qLen);
      const subDist = damerauLevenshteinDistance(q, sub);
      if (subDist <= 1) {
        return { isMatch: true, score: 60 };
      }
    }
  }

  return { isMatch: false, score: 0 };
}

/**
 * Evaluates a product against search terms across Name, Generic Name, and Company.
 * Returns match score (0 if no match).
 */
export function scoreProductMatch(product: Product | any, searchTerms: string[]): { score: number; bestTermMatches: string[] } {
  if (searchTerms.length === 0) return { score: 100, bestTermMatches: [] };

  const name = String(product.name || "").toLowerCase();
  const generic = String(product.genericName || product.generic_name || "").toLowerCase();
  const company = String(product.company || "").toLowerCase();

  // Tokenize target fields
  const nameTokens = name.split(/[\s,./+\-()]+/).filter(Boolean);
  const genericTokens = generic.split(/[\s,./+\-()]+/).filter(Boolean);
  const companyTokens = company.split(/[\s,./+\-()]+/).filter(Boolean);
  const allTokens = [...nameTokens, ...genericTokens, ...companyTokens];

  let totalScore = 0;
  const matchedTokens: string[] = [];

  for (const term of searchTerms) {
    let bestTermScore = 0;
    let bestMatchedToken = "";

    // 1. Direct name match (highest priority)
    if (name.startsWith(term)) {
      bestTermScore = Math.max(bestTermScore, 95);
      bestMatchedToken = nameTokens[0] || term;
    } else if (name.includes(term)) {
      bestTermScore = Math.max(bestTermScore, 85);
      bestMatchedToken = nameTokens.find(t => t.includes(term)) || term;
    }

    // 2. Direct generic match (high priority for pharmacies)
    if (generic.startsWith(term)) {
      bestTermScore = Math.max(bestTermScore, 90);
      bestMatchedToken = genericTokens[0] || term;
    } else if (generic.includes(term)) {
      bestTermScore = Math.max(bestTermScore, 80);
      bestMatchedToken = genericTokens.find(t => t.includes(term)) || term;
    }

    // 3. Direct company match
    if (company.includes(term)) {
      bestTermScore = Math.max(bestTermScore, 75);
      bestMatchedToken = companyTokens.find(t => t.includes(term)) || term;
    }

    // 4. Token-level fuzzy match
    for (const token of allTokens) {
      const { isMatch, score } = isFuzzyTermMatch(term, token);
      if (isMatch && score > bestTermScore) {
        bestTermScore = score;
        bestMatchedToken = token;
      }
    }

    // If any search term failed to match, the product doesn't qualify
    if (bestTermScore === 0) {
      return { score: 0, bestTermMatches: [] };
    }

    totalScore += bestTermScore;
    if (bestMatchedToken) {
      matchedTokens.push(bestMatchedToken);
    }
  }

  // Bonus for in-stock availability
  const isAvailable = (product.availableStock ?? 0) > 0;
  if (isAvailable) {
    totalScore += 20;
  }

  return { score: totalScore, bestTermMatches: matchedTokens };
}

/**
 * Searches and sorts a collection of products with typo tolerance and auto-correction.
 */
export function fuzzySearchProducts(
  products: Product[] | any[],
  query: string
): {
  filtered: Product[];
  correctedQuery?: string;
  suggestions: string[];
} {
  const trimmed = query.trim();
  if (!trimmed) {
    return { filtered: products, suggestions: [] };
  }

  const terms = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  const scoredItems: Array<{ product: Product; score: number; bestTermMatches: string[] }> = [];

  for (const p of products) {
    const { score, bestTermMatches } = scoreProductMatch(p, terms);
    if (score > 0) {
      scoredItems.push({ product: p, score, bestTermMatches });
    }
  }

  // Sort by score descending (highest relevance first), then in-stock, then alphabetical
  scoredItems.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aInStock = (a.product.availableStock ?? 0) > 0 ? 1 : 0;
    const bInStock = (b.product.availableStock ?? 0) > 0 ? 1 : 0;
    if (aInStock !== bInStock) return bInStock - aInStock;
    return (a.product.name || "").localeCompare(b.product.name || "", "en", { sensitivity: "base" });
  });

  const filtered = scoredItems.map(item => item.product);

  // Compute autocorrect suggestion if the query looks misspelled but matched fuzzy candidates
  let correctedQuery: string | undefined = undefined;
  const suggestions: string[] = [];

  if (scoredItems.length > 0 && terms.length > 0) {
    const topMatch = scoredItems[0];
    const topP = topMatch.product;

    // Check if the exact query was present in name/generic
    const lowerQuery = trimmed.toLowerCase();
    const hasExact = (topP.name || "").toLowerCase().includes(lowerQuery) ||
                     (topP.genericName || (topP as any).generic_name || "").toLowerCase().includes(lowerQuery) ||
                     (topP.company || "").toLowerCase().includes(lowerQuery);

    if (!hasExact && topMatch.bestTermMatches.length > 0) {
      // Build suggested corrected query from closest matched terms
      const suggestedName = topP.name || topMatch.bestTermMatches.join(" ");
      if (suggestedName.toLowerCase() !== lowerQuery) {
        correctedQuery = suggestedName;
        suggestions.push(suggestedName);
      }
    }
  }

  return {
    filtered,
    correctedQuery,
    suggestions
  };
}

export interface FilterAndRankOptions {
  category?: string;
  filter?: string;
  company?: string;
}

export interface FilterAndRankResult {
  products: Product[] | any[];
  total: number;
  suggestions: string[];
  correctedQuery?: string;
}

/**
 * Universal catalog filtering and fuzzy ranking engine.
 * Filters by category, company, and deal/stock flags, then applies
 * zero-egress typo-tolerant fuzzy ranking across product name, generic, and company.
 */
export function filterAndRankProducts(
  products: Product[] | any[],
  query: string = "",
  options?: FilterAndRankOptions
): FilterAndRankResult {
  let list = Array.isArray(products) ? products : [];

  // 1. Filter by category (handling synonyms/aliases like Ophthalmic)
  if (options?.category && options.category !== "All") {
    const targetCat = options.category.toLowerCase().trim();
    list = list.filter(p => {
      const pCat = String(p.category || "").toLowerCase().trim();
      if (pCat === targetCat) return true;
      if ((targetCat.includes("ophthalmic") || targetCat.includes("eye")) &&
          (pCat.includes("ophthalmic") || pCat.includes("eye") || pCat.includes("drop"))) {
        return true;
      }
      return false;
    });
  }

  // 2. Filter by company
  if (options?.company && options.company !== "All") {
    const targetComp = options.company.toLowerCase().trim();
    list = list.filter(p => String(p.company || "").toLowerCase().includes(targetComp));
  }

  // 3. Filter by stock/deal flags
  if (options?.filter) {
    if (options.filter === "low_stock") {
      list = list.filter(p => (p.availableStock ?? 0) <= 150);
    }
  }

  // 4. Fuzzy text search ranking if query provided
  const trimmedQuery = (query || "").trim();
  if (trimmedQuery) {
    const searchRes = fuzzySearchProducts(list, trimmedQuery);
    return {
      products: searchRes.filtered,
      total: searchRes.filtered.length,
      suggestions: searchRes.suggestions,
      correctedQuery: searchRes.correctedQuery
    };
  }

  return {
    products: list,
    total: list.length,
    suggestions: [],
    correctedQuery: undefined
  };
}
