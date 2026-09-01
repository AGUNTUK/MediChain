/**
 * MediChain SmartOrder - Vision OCR Engine
 * 
 * Extracts handwritten and printed medicine order slips, doctor prescriptions,
 * and requisition notes using the Google Gemini 3.x Flash family.
 * 
 * Model Hierarchy:
 * 1. Primary:   gemini-3.7-flash (with medium thinking level for complex handwriting)
 * 2. Secondary: gemini-3.6-flash (resilient fallback on 429, 5xx, or timeout)
 * 3. Tertiary:  gemini-3.5-flash (final fallback)
 * 
 * IMPORTANT ARCHITECTURAL CONSTRAINTS:
 * - Gemini acts STRICTLY as an image reader / OCR extractor.
 * - Gemini MUST NEVER invent product IDs, prices, stock, or manufacturer metadata.
 * - Numerical ocrConfidence (0.0 to 1.0) is assigned per item.
 */

import { GoogleGenAI } from "@google/genai";

export const SMART_ORDER_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash"
] as const;

export type SmartOrderModelName = typeof SMART_ORDER_MODELS[number];

export type DosageForm = 
  | "tablet" 
  | "capsule" 
  | "syrup" 
  | "suspension" 
  | "drops" 
  | "injection" 
  | "infusion"
  | "ointment" 
  | "cream" 
  | "gel" 
  | "spray" 
  | "inhaler" 
  | "powder" 
  | "sachet" 
  | "suppository"
  | "other" 
  | "unknown";

export type QuantityUnit = 
  | "box" 
  | "strip" 
  | "tablet" 
  | "capsule" 
  | "piece" 
  | "bottle" 
  | "vial" 
  | "ampoule" 
  | "tube" 
  | "pack" 
  | "unknown";

export interface OCRExtractedItem {
  rawText: string;
  brandName: string;
  genericName: string | null;
  dosageForm: DosageForm;
  strength: string | null;
  quantity: number;
  quantityUnit: QuantityUnit;
  rawQuantityText: string | null;
  frequency: string | null;
  ocrConfidence: number; // 0.0 to 1.0
}

export interface OCRScanResult {
  success: boolean;
  modelUsed: SmartOrderModelName;
  items: OCRExtractedItem[];
  rawNotes?: string;
}

/**
 * Checks whether an error from Gemini API is retryable across the model fallback chain.
 */
function isRetryableError(error: any): boolean {
  if (!error) return false;
  const msg = String(error.message || "").toLowerCase();
  const status = error.status || error.statusCode || 0;

  // Non-retryable user/auth errors
  if (status === 400 || msg.includes("invalid argument") || msg.includes("bad request")) return false;
  if (status === 401 || msg.includes("unauthenticated") || msg.includes("api key")) return false;
  if (status === 403 || msg.includes("permission denied")) return false;

  // Retryable server, rate limit, quota, and timeout errors
  if (status === 429 || msg.includes("quota") || msg.includes("resource exhausted") || msg.includes("rate limit")) return true;
  if (status >= 500 && status <= 599) return true;
  if (msg.includes("timeout") || msg.includes("deadline exceeded") || msg.includes("network") || msg.includes("unavailable")) return true;

  return true;
}

const OCR_PROMPT = `You are the specialized Optical Character Recognition (OCR) reader for MediChain, a B2B wholesale pharmaceutical platform in Bangladesh.
Your task is to accurately read and transcribe the handwritten or printed text from this image of a doctor prescription, pharmacy requisition note, or handwritten medicine order slip.

CRITICAL INSTRUCTIONS:
1. READ ONLY WHAT IS VISIBLE. Do NOT invent, assume, or hallucinate medicine names, prices, product IDs, or manufacturer details that are not in the image.
2. For each medicine line, extract:
   - "rawText": Exact verbatim text written for this item (e.g. "Tab. Napa Extra 2 box", "Cap. Maxpro 20 1+0+1 (10 pata)", "Syr. Tuzid 100ml 5 pcs").
   - "brandName": Clean commercial brand name (e.g. "Napa Extra", "Maxpro", "Sergel", "Monas", "Seclo", "Cef-3", "Amodis", "Fexo", "Tycil").
   - "genericName": Generic chemical formula name if explicitly written on the slip (e.g. "Paracetamol + Caffeine", "Esomeprazole", "Montelukast"), otherwise null.
   - "dosageForm": One of ["tablet", "capsule", "syrup", "suspension", "drops", "injection", "infusion", "ointment", "cream", "gel", "spray", "inhaler", "powder", "sachet", "suppository", "other", "unknown"]. Decipher from prefixes like "Tab", "Cap", "Syr", "Inj", "Susp", "Drop".
   - "strength": Recognized dosage strength (e.g. "500mg", "20mg", "10mg", "500mg+65mg", "100ml", "200mg/5ml"), or null if not written.
   - "quantity": The requested integer order/purchase quantity. Default to 1 if not specified.
   - "quantityUnit": One of ["box", "strip", "tablet", "capsule", "piece", "bottle", "vial", "ampoule", "tube", "pack", "unknown"]. Recognize Bengali/English procurement units like "Pata" -> "strip", "Box" -> "box", "Pcs" -> "piece", "File/Bottle" -> "bottle".
   - "rawQuantityText": Verbatim quantity string (e.g. "2 box", "10 pata", "50 pcs", "5 file"), or null.
   - "frequency": Dosage frequency if written (e.g. "1+0+1", "1+1+1", "0+0+1", "BID", "TDS", "OD"). DO NOT confuse dosage frequency with purchase quantity! "1+0+1" is frequency, NOT quantity 2.
   - "ocrConfidence": Numerical float between 0.10 and 1.00 indicating handwriting clarity and your optical certainty (e.g. 0.98 for clear print/clean handwriting, 0.75 for messy doctor handwriting, 0.40 for heavily smudged or ambiguous text).

Output MUST be a single raw valid JSON object with an "items" array. No markdown fences or backticks.

Example:
{
  "items": [
    {
      "rawText": "Tab. Napa Extra 2 box",
      "brandName": "Napa Extra",
      "genericName": null,
      "dosageForm": "tablet",
      "strength": "500mg+65mg",
      "quantity": 2,
      "quantityUnit": "box",
      "rawQuantityText": "2 box",
      "frequency": null,
      "ocrConfidence": 0.96
    }
  ]
}`;

/**
 * Executes Gemini 3.x Flash OCR with automatic resilient fallback.
 */
export async function scanSmartOrderImage(
  imageBase64: string,
  apiKey: string,
  mimeType = "image/jpeg"
): Promise<OCRScanResult> {
  if (!apiKey) {
    throw new Error("Server-side GEMINI_API_KEY is not configured.");
  }
  if (!imageBase64) {
    throw new Error("No image data provided for SmartOrder OCR.");
  }

  // Clean data URL prefix if present
  let cleanBase64 = imageBase64;
  let detectedMime = mimeType;
  if (imageBase64.includes(";base64,")) {
    const parts = imageBase64.split(";base64,");
    const mimeMatch = parts[0].match(/data:(.*?)$/);
    if (mimeMatch) {
      detectedMime = mimeMatch[1];
    }
    cleanBase64 = parts[1];
  }

  const ai = new GoogleGenAI({ apiKey });
  let lastError: any = null;

  for (const modelName of SMART_ORDER_MODELS) {
    try {
      console.log(`[SmartOrderOCR] Attempting handwriting recognition with ${modelName}...`);

      const requestConfig: any = {
        model: modelName,
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: detectedMime,
                  data: cleanBase64
                }
              },
              {
                text: OCR_PROMPT
              }
            ]
          }
        ]
      };

      // Set Gemini 3.x thinking configuration
      if (modelName === "gemini-3.7-flash") {
        requestConfig.config = {
          thinkingConfig: {
            thinkingLevel: "medium"
          }
        };
      }

      const response = await Promise.race([
        ai.models.generateContent(requestConfig),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`SmartOrder OCR request timed out on ${modelName} after 18s`)), 18000)
        )
      ]);

      const responseText = response.text || "";
      if (!responseText.trim()) {
        throw new Error(`Empty response from ${modelName}`);
      }

      // Parse structured JSON
      const cleanJson = responseText
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      const parsed = JSON.parse(cleanJson);
      const rawList = Array.isArray(parsed.items) ? parsed.items : (Array.isArray(parsed) ? parsed : []);

      const sanitizedItems: OCRExtractedItem[] = rawList
        .filter((it: any) => it && (it.brandName || it.rawText))
        .map((it: any) => {
          const rawText = String(it.rawText || it.brandName || "Medicine").trim();
          const brandName = String(it.brandName || rawText).trim();
          const genericName = it.genericName ? String(it.genericName).trim() : null;
          const strength = it.strength ? String(it.strength).trim() : null;
          const rawQuantityText = it.rawQuantityText ? String(it.rawQuantityText).trim() : null;
          const frequency = it.frequency ? String(it.frequency).trim() : null;
          
          let qty = parseInt(it.quantity, 10);
          if (isNaN(qty) || qty <= 0) qty = 1;

          let conf = typeof it.ocrConfidence === "number" ? it.ocrConfidence : parseFloat(it.ocrConfidence);
          if (isNaN(conf) || conf <= 0) conf = 0.85;
          if (conf > 1.0) conf = conf <= 100 ? conf / 100 : 1.0;

          // Normalize dosageForm
          const validDosageForms: DosageForm[] = [
            "tablet", "capsule", "syrup", "suspension", "drops", "injection",
            "infusion", "ointment", "cream", "gel", "spray", "inhaler",
            "powder", "sachet", "suppository", "other", "unknown"
          ];
          const rawDosage = String(it.dosageForm || "").toLowerCase().trim();
          const dosageForm: DosageForm = validDosageForms.includes(rawDosage as any) ? (rawDosage as DosageForm) : "tablet";

          // Normalize quantityUnit
          const validUnits: QuantityUnit[] = [
            "box", "strip", "tablet", "capsule", "piece", "bottle",
            "vial", "ampoule", "tube", "pack", "unknown"
          ];
          const rawUnit = String(it.quantityUnit || "").toLowerCase().trim();
          const quantityUnit: QuantityUnit = validUnits.includes(rawUnit as any) ? (rawUnit as QuantityUnit) : "box";

          return {
            rawText,
            brandName,
            genericName,
            dosageForm,
            strength,
            quantity: qty,
            quantityUnit,
            rawQuantityText,
            frequency,
            ocrConfidence: Math.round(conf * 100) / 100
          };
        });

      console.log(`[SmartOrderOCR] Successfully recognized ${sanitizedItems.length} items using ${modelName}`);

      return {
        success: true,
        modelUsed: modelName,
        items: sanitizedItems
      };
    } catch (err: any) {
      console.warn(`[SmartOrderOCR] Model ${modelName} failed:`, err.message || err);
      lastError = err;

      if (!isRetryableError(err)) {
        throw new Error(formatFriendlyErrorMessage(err));
      }
    }
  }

  throw new Error(formatFriendlyErrorMessage(lastError || "Service temporarily busy."));
}

/**
 * Transforms raw technical/JSON API errors into clear, friendly guidance.
 */
export function formatFriendlyErrorMessage(err: any): string {
  if (!err) return "প্রেসক্রিপশন প্রসেস করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।";
  const raw = typeof err === "string" ? err : String(err.message || "");

  if (raw.includes("API_KEY_INVALID") || raw.includes("API key not valid") || raw.includes("API_KEY") || raw.includes("unauthenticated") || raw.includes("not configured")) {
    return "সার্ভারে Gemini API Key সঠিক নয় বা সক্রিয় নেই। অনুগ্রহ করে Render Dashboard > Environment Variables-এ ভ্যালিড GEMINI_API_KEY সেট করুন।";
  }
  if (raw.includes("429") || raw.includes("quota") || raw.includes("Resource has been exhausted")) {
    return "অনেকগুলো স্ক্যান রিকোয়েস্ট হয়েছে। অনুগ্রহ করে ১ মিনিট পর আবার চেষ্টা করুন।";
  }
  if (raw.includes("timeout") || raw.includes("deadline")) {
    return "ছবিটি প্রসেস করতে সময় বেশি লাগছে। অনুগ্রহ করে ছোট বা পরিষ্কার ছবি দিয়ে আবার চেষ্টা করুন।";
  }
  if (raw.includes("bad request") || raw.includes("invalid argument")) {
    return "ছবিটির ফরম্যাট বা সাইজে সমস্যা রয়েছে। অনুগ্রহ করে সাধারণ JPG বা PNG ছবি নির্বাচন করুন।";
  }

  // If it's a JSON string, try to parse message or return clean text
  if (raw.trim().startsWith("{") || raw.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      const inner = Array.isArray(parsed) ? parsed[0] : parsed;
      if (inner?.error?.message) {
        return formatFriendlyErrorMessage(inner.error.message);
      }
    } catch (_) {}
    return "প্রেসক্রিপশন প্রসেস করতে সমস্যা হয়েছে। অনুগ্রহ করে পরিষ্কার আলোতে তোলা ছবি দিন।";
  }

  return raw;
}
