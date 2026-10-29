import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { 
  damerauLevenshteinDistance, 
  isFuzzyTermMatch, 
  filterAndRankProducts, 
  fuzzySearchProducts 
} from "../src/lib/fuzzySearch";
import { safeJsonResponse } from "../src/lib/apiFetch";

// Sample mock products reflecting DGDA catalog
const mockProducts = [
  {
    id: "prod-1",
    name: "Napa Extra",
    genericName: "Paracetamol + Caffeine",
    company: "Beximco Pharmaceuticals Ltd",
    category: "Tablet",
    availableStock: 500,
    mrp: 35,
    sellingPrice: 32
  },
  {
    id: "prod-2",
    name: "Ace Plus",
    genericName: "Paracetamol + Caffeine",
    company: "Square Pharmaceuticals PLC",
    category: "Tablet",
    availableStock: 300,
    mrp: 35,
    sellingPrice: 31.5
  },
  {
    id: "prod-3",
    name: "Sergel 20mg",
    genericName: "Esomeprazole Magnesium Trihydrate",
    company: "Healthcare Pharmaceuticals Ltd",
    category: "Capsule",
    availableStock: 120,
    mrp: 70,
    sellingPrice: 63
  },
  {
    id: "prod-4",
    name: "Monas 10mg",
    genericName: "Montelukast Sodium",
    company: "Acme Laboratories Ltd",
    category: "Tablet",
    availableStock: 0,
    mrp: 160,
    sellingPrice: 144
  },
  {
    id: "prod-5",
    name: "Ceevit 250mg",
    genericName: "Ascorbic Acid (Vitamin C)",
    company: "Square Pharmaceuticals PLC",
    category: "Chewable Tablet",
    availableStock: 80,
    mrp: 22,
    sellingPrice: 19.8
  }
];

describe("Universal Fuzzy Search & Typo Tolerance Engine", () => {
  it("calculates accurate Damerau-Levenshtein distances with transpositions", () => {
    assert.equal(damerauLevenshteinDistance("napa", "napa"), 0);
    assert.equal(damerauLevenshteinDistance("napa", "napaa"), 1); // Insertion
    assert.equal(damerauLevenshteinDistance("paracetamol", "paracitamol"), 1); // Substitution
    assert.equal(damerauLevenshteinDistance("beximco", "bexemco"), 1); // Substitution
    assert.equal(damerauLevenshteinDistance("extra", "xetra"), 1); // Transposition
  });

  it("matches search terms with typo tolerance", () => {
    const res1 = isFuzzyTermMatch("paracitamol", "paracetamol");
    assert.equal(res1.isMatch, true);

    const res2 = isFuzzyTermMatch("bexemco", "beximco");
    assert.equal(res2.isMatch, true);

    const res3 = isFuzzyTermMatch("esomiprazol", "esomeprazole");
    assert.equal(res3.isMatch, true);
  });

  it("finds products by misspelled brand name (e.g., 'napa xtra' -> Napa Extra)", () => {
    const result = filterAndRankProducts(mockProducts, "napa xtra");
    assert.ok(result.products.length > 0);
    assert.equal(result.products[0].name, "Napa Extra");
    assert.ok(result.correctedQuery?.includes("Napa Extra") || result.suggestions.length > 0);
  });

  it("finds products by misspelled generic name (e.g., 'paracitamol' -> Napa Extra, Ace Plus)", () => {
    const result = filterAndRankProducts(mockProducts, "paracitamol");
    assert.ok(result.products.length >= 2);
    const names = result.products.map(p => p.name);
    assert.ok(names.includes("Napa Extra"));
    assert.ok(names.includes("Ace Plus"));
  });

  it("finds products by manufacturer name (e.g., 'bexemco' -> Napa Extra)", () => {
    const result = filterAndRankProducts(mockProducts, "bexemco");
    assert.ok(result.products.length > 0);
    assert.equal(result.products[0].company, "Beximco Pharmaceuticals Ltd");
  });

  it("finds products by company 'Square' matching multiple products", () => {
    const result = filterAndRankProducts(mockProducts, "square");
    assert.ok(result.products.length >= 2);
    const companies = result.products.map(p => p.company);
    assert.ok(companies.every(c => c.includes("Square")));
  });

  it("ranks in-stock products before out-of-stock products", () => {
    const result = filterAndRankProducts(mockProducts, "");
    assert.equal(result.products.length, 5);
    // Monas 10mg has availableStock: 0, so it must be ranked after all in-stock products
    assert.equal(result.products[4].name, "Monas 10mg");
    assert.equal(result.products[4].availableStock, 0);
    assert.ok((result.products[0].availableStock ?? 0) > 0);
  });
});

describe("Safe JSON Response Gateway Error Protection", () => {
  it("safely handles HTML error responses from Vercel without throwing unhandled SyntaxError", async () => {
    const mockHtmlResponse = new Response("<!doctype html><html><body>504 Gateway Timeout</body></html>", {
      status: 504,
      statusText: "Gateway Timeout",
      headers: { "Content-Type": "text/html" }
    });

    const result = await safeJsonResponse(mockHtmlResponse);
    assert.equal(result.ok, false);
    assert.equal(result.data, null);
    assert.ok(result.error);
    assert.ok(result.error.includes("অপ্রত্যাশিত"));
  });

  it("safely intercepts Vercel plain text FUNCTION_INVOCATION_FAILED error without throwing SyntaxError: Unexpected token 'A'", async () => {
    const vercelPlainText500 = "A server error has occurred\n\nFUNCTION_INVOCATION_FAILED\n\nbom1::6cbv9-1793304750523-fc23ee79974b";
    const mockVercel500 = new Response(vercelPlainText500, {
      status: 500,
      statusText: "Internal Server Error",
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Vercel-Error": "FUNCTION_INVOCATION_FAILED"
      }
    });

    const result = await safeJsonResponse(mockVercel500);
    assert.equal(result.ok, false);
    assert.equal(result.data, null);
    assert.ok(result.error);
    // Crucial check: Must not leak raw JavaScript parser SyntaxError "Unexpected token 'A'"
    assert.equal(result.error.includes("Unexpected token"), false);
    assert.ok(result.error.includes("সার্ভার") || result.error.includes("অনুপলব্ধ"));
  });

  it("parses valid JSON response normally", async () => {
    const mockValidJson = new Response(JSON.stringify({ success: true, token: "xyz123" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

    const result = await safeJsonResponse<{ success: boolean; token: string }>(mockValidJson);
    assert.equal(result.ok, true);
    assert.equal(result.data?.success, true);
    assert.equal(result.data?.token, "xyz123");
  });
});
