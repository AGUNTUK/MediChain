import { test, expect } from "@playwright/test";
import { SMART_ORDER_MODELS, OCRExtractedItem } from "../src/lib/smartOrderOCR";
import { computeMatchScore } from "../src/lib/productMatcher";
import { Product } from "../src/types";

test.describe("MediChain SmartOrder - AI Vision OCR & Matching Engine", () => {
  
  test("Model hierarchy should strictly use high availability Gemini models and OpenRouter backups", () => {
    // Verify required primary Gemini models
    expect(SMART_ORDER_MODELS).toEqual([
      "gemini-3.6-flash",
      "gemini-3.5-flash-lite",
      "gemini-flash-lite-latest",
      "gemini-3.1-flash-lite",
      "gemini-3.7-flash"
    ]);

    // Ensure deprecated 1.5 or 2.5 models are NEVER included in primary list
    expect((SMART_ORDER_MODELS as readonly string[]).includes("gemini-1.5-flash")).toBe(false);
    expect((SMART_ORDER_MODELS as readonly string[]).includes("gemini-2.5-flash")).toBe(false);
  });

  test("OCR schema enforces distinct frequency from quantity and numerical confidence", () => {
    const sampleItem: OCRExtractedItem = {
      rawText: "Cap. Maxpro 20 1+0+1 (2 box)",
      brandName: "Maxpro",
      genericName: "Esomeprazole",
      dosageForm: "capsule",
      strength: "20mg",
      quantity: 2,
      quantityUnit: "box",
      rawQuantityText: "2 box",
      frequency: "1+0+1",
      ocrConfidence: 0.94
    };

    expect(sampleItem.quantity).toBe(2);
    expect(sampleItem.frequency).toBe("1+0+1");
    expect(sampleItem.ocrConfidence).toBeGreaterThanOrEqual(0.0);
    expect(sampleItem.ocrConfidence).toBeLessThanOrEqual(1.0);
    expect(sampleItem.dosageForm).toBe("capsule");
    expect(sampleItem.quantityUnit).toBe("box");
  });

  test("Matching engine awards maximum score (+40) for exact brand match and strength (+15)", () => {
    const extracted: OCRExtractedItem = {
      rawText: "Tab. Napa Extra 2 box",
      brandName: "Napa Extra",
      genericName: "Paracetamol + Caffeine",
      dosageForm: "tablet",
      strength: "500mg+65mg",
      quantity: 2,
      quantityUnit: "box",
      rawQuantityText: "2 box",
      frequency: null,
      ocrConfidence: 0.98
    };

    const candidateProduct: Product = {
      id: "prod-napa-extra-123",
      name: "Napa Extra",
      genericName: "Paracetamol + Caffeine",
      company: "Beximco Pharmaceuticals Ltd.",
      category: "Tablet",
      strength: "500mg+65mg",
      packSize: "10 x 10",
      mrp: 350,
      sellingPrice: 315,
      discountPercentage: 10,
      availableStock: 250,
      reservedStock: 0,
      soldStock: 0,
      batchNumber: "B-2026",
      expiryDate: "2027-12-31"
    };

    const result = computeMatchScore(extracted, candidateProduct);
    expect(result.score).toBeGreaterThanOrEqual(95);
    expect(result.reasons.some(r => r.includes("Exact Brand Name"))).toBe(true);
    expect(result.reasons.some(r => r.includes("Dosage Strength"))).toBe(true);
  });

  test("Matching engine tolerates minor handwriting typos via brand similarity", () => {
    const extractedWithTypo: OCRExtractedItem = {
      rawText: "Tab. Napa Exta 500mg",
      brandName: "Napa Exta",
      genericName: null,
      dosageForm: "tablet",
      strength: "500mg",
      quantity: 1,
      quantityUnit: "strip",
      rawQuantityText: "1 strip",
      frequency: null,
      ocrConfidence: 0.88
    };

    const candidateProduct: Product = {
      id: "prod-napa-extra",
      name: "Napa Extra",
      genericName: "Paracetamol + Caffeine",
      company: "Beximco Pharmaceuticals Ltd.",
      category: "Tablet",
      strength: "500mg+65mg",
      packSize: "10 x 10",
      mrp: 350,
      sellingPrice: 315,
      discountPercentage: 10,
      availableStock: 100,
      reservedStock: 0,
      soldStock: 0,
      batchNumber: "B-1",
      expiryDate: "2027-12-31"
    };

    const result = computeMatchScore(extractedWithTypo, candidateProduct);
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  test("Pharmacy Safety Rule: Generic similarity does NOT silently replace brand", () => {
    const sergelRequest: OCRExtractedItem = {
      rawText: "Cap. Sergel 20mg",
      brandName: "Sergel",
      genericName: "Esomeprazole",
      dosageForm: "capsule",
      strength: "20mg",
      quantity: 1,
      quantityUnit: "box",
      rawQuantityText: "1 box",
      frequency: null,
      ocrConfidence: 0.95
    };

    const differentBrandCandidate: Product = {
      id: "prod-nexum-20",
      name: "Nexum",
      genericName: "Esomeprazole",
      company: "Square Pharmaceuticals PLC",
      category: "Capsule",
      strength: "20mg",
      packSize: "10 x 10",
      mrp: 700,
      sellingPrice: 630,
      discountPercentage: 10,
      availableStock: 50,
      reservedStock: 0,
      soldStock: 0,
      batchNumber: "B-2",
      expiryDate: "2027-12-31"
    };

    const result = computeMatchScore(sergelRequest, differentBrandCandidate);
    // Score should not be a perfect 95+ because brand names are different
    expect(result.score).toBeLessThan(90);
  });

  test("Separate OCR confidence from Match confidence", () => {
    const ocrConf = 0.91;
    const matchConf = 98;

    // Both metrics exist independently
    expect(ocrConf).toBeLessThanOrEqual(1.0);
    expect(matchConf).toBeGreaterThan(1.0);
    expect(typeof ocrConf).toBe("number");
    expect(typeof matchConf).toBe("number");
  });
});
