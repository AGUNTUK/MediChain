/**
 * MediChain SmartOrder - Vision OCR Engine
 * 
 * Extracts handwritten and printed medicine order slips, doctor prescriptions,
 * and requisition notes using a resilient multi-tier Vision AI hierarchy.
 * 
 * Multi-Tier Hierarchy:
 * Tier 1 (Primary High-Speed Gemini Models):
 *   1. gemini-3.6-flash (Fast ~2s, high accuracy OCR)
 *   2. gemini-3.5-flash-lite (Ultra-fast ~1s, high availability)
 *   3. gemini-flash-lite-latest (Dynamic stable flash lite)
 *   4. gemini-3.1-flash-lite (Resilient backup)
 *   5. gemini-3.7-flash (Adaptive reasoning with fast circuit breaker)
 * 
 * Tier 2 (OpenRouter Multi-Model Vision Backup):
 *   - Automatic zero-downtime failover to OpenRouter vision models
 *     (minimax/minimax-m3:free, google/gemini-2.5-flash, qwen/qwen-2.5-vl-72b-instruct,
 *      meta-llama/llama-3.2-11b-vision-instruct, openai/gpt-4o-mini, openrouter/free).
 * 
 * IMPORTANT ARCHITECTURAL CONSTRAINTS:
 * - Vision AI acts STRICTLY as an optical reader / text extractor.
 * - Vision AI MUST NEVER invent product IDs, prices, stock, or manufacturer metadata.
 * - Numerical ocrConfidence (0.0 to 1.0) is assigned per item.
 */

import { GoogleGenAI } from "@google/genai";
import axios from "axios";

export const PRIMARY_GEMINI_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.1-flash-lite",
  "gemini-3.7-flash"
] as const;

export const SMART_ORDER_MODELS = PRIMARY_GEMINI_MODELS;

export const BACKUP_OPENROUTER_MODELS = [
  "minimax/minimax-m3:free",
  "google/gemini-2.5-flash",
  "qwen/qwen-2.5-vl-72b-instruct",
  "meta-llama/llama-3.2-11b-vision-instruct",
  "openai/gpt-4o-mini",
  "openrouter/free"
] as const;

export type SmartOrderModelName = string;

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
  modelUsed: string;
  items: OCRExtractedItem[];
  rawNotes?: string;
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

function parseOCRResponse(rawText: string, modelName: string): OCRExtractedItem[] {
  let cleanJson = rawText
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // If there's surrounding text, extract the outermost JSON object or array
  if (!cleanJson.startsWith("{") && !cleanJson.startsWith("[")) {
    const firstBrace = cleanJson.indexOf("{");
    const lastBrace = cleanJson.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
    }
  }

  const parsed = JSON.parse(cleanJson);
  const rawList = Array.isArray(parsed.items) ? parsed.items : (Array.isArray(parsed) ? parsed : []);

  const validDosageForms: DosageForm[] = [
    "tablet", "capsule", "syrup", "suspension", "drops", "injection",
    "infusion", "ointment", "cream", "gel", "spray", "inhaler",
    "powder", "sachet", "suppository", "other", "unknown"
  ];

  const validUnits: QuantityUnit[] = [
    "box", "strip", "tablet", "capsule", "piece", "bottle",
    "vial", "ampoule", "tube", "pack", "unknown"
  ];

  return rawList
    .filter((it: any) => it && (it.brandName || it.rawText))
    .map((it: any) => {
      const rawTextStr = String(it.rawText || it.brandName || "Medicine").trim();
      const brandName = String(it.brandName || rawTextStr).trim();
      const genericName = it.genericName ? String(it.genericName).trim() : null;
      const strength = it.strength ? String(it.strength).trim() : null;
      const rawQuantityText = it.rawQuantityText ? String(it.rawQuantityText).trim() : null;
      const frequency = it.frequency ? String(it.frequency).trim() : null;
      
      let qty = parseInt(it.quantity, 10);
      if (isNaN(qty) || qty <= 0) qty = 1;

      let conf = typeof it.ocrConfidence === "number" ? it.ocrConfidence : parseFloat(it.ocrConfidence);
      if (isNaN(conf) || conf <= 0) conf = 0.85;
      if (conf > 1.0) conf = conf <= 100 ? conf / 100 : 1.0;

      const rawDosage = String(it.dosageForm || "").toLowerCase().trim();
      const dosageForm: DosageForm = validDosageForms.includes(rawDosage as any) ? (rawDosage as DosageForm) : "tablet";

      const rawUnit = String(it.quantityUnit || "").toLowerCase().trim();
      const quantityUnit: QuantityUnit = validUnits.includes(rawUnit as any) ? (rawUnit as QuantityUnit) : "box";

      return {
        rawText: rawTextStr,
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
}

/**
 * Executes multi-tier OCR across Google Gemini models and OpenRouter vision backups.
 */
export async function scanSmartOrderImage(
  imageBase64: string,
  geminiApiKey?: string,
  mimeType = "image/jpeg",
  openRouterApiKey?: string
): Promise<OCRScanResult> {
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

  const effectiveGeminiKey = (
    geminiApiKey ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    ""
  ).trim();

  const effectiveOpenRouterKey = (
    openRouterApiKey ||
    process.env.OPENROUTER_API_KEY ||
    process.env.VITE_OPENROUTER_API_KEY ||
    ""
  ).trim();

  let lastError: any = null;

  // --- TIER 1: GOOGLE GEMINI HIGH-AVAILABILITY MODELS ---
  if (effectiveGeminiKey) {
    const ai = new GoogleGenAI({ apiKey: effectiveGeminiKey });

    for (const modelName of PRIMARY_GEMINI_MODELS) {
      try {
        console.log(`[SmartOrderOCR] Attempting recognition with Google Gemini: ${modelName}...`);

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

        if (modelName === "gemini-3.7-flash") {
          requestConfig.config = {
            thinkingConfig: {
              thinkingLevel: "low"
            }
          };
        }

        const timeoutMs = modelName === "gemini-3.7-flash" ? 7000 : 8000;
        const response = await Promise.race([
          ai.models.generateContent(requestConfig),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout on ${modelName} after ${timeoutMs / 1000}s`)), timeoutMs)
          )
        ]);

        const responseText = response.text || "";
        if (!responseText.trim()) {
          throw new Error(`Empty response from ${modelName}`);
        }

        const sanitizedItems = parseOCRResponse(responseText, modelName);
        console.log(`[SmartOrderOCR] ✅ Successfully recognized ${sanitizedItems.length} items using Google Gemini (${modelName})`);

        return {
          success: true,
          modelUsed: modelName,
          items: sanitizedItems
        };
      } catch (err: any) {
        console.warn(`[SmartOrderOCR] Google Gemini ${modelName} failed or busy:`, err.message || err);
        lastError = err;
        // Continue immediately to next candidate
      }
    }
  }

  // --- TIER 2: OPENROUTER MULTI-MODEL VISION BACKUP ---
  if (effectiveOpenRouterKey) {
    console.log("[SmartOrderOCR] Primary Gemini models busy. Activating OpenRouter Vision fallback...");

    for (const modelName of BACKUP_OPENROUTER_MODELS) {
      try {
        console.log(`[SmartOrderOCR] Attempting OpenRouter vision model: ${modelName}...`);

        const res = await axios.post(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            model: modelName,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: OCR_PROMPT },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${detectedMime};base64,${cleanBase64}`
                    }
                  }
                ]
              }
            ],
            max_tokens: 1500
          },
          {
            headers: {
              "Authorization": `Bearer ${effectiveOpenRouterKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://medichain.com",
              "X-Title": "MediChain SmartOrder"
            },
            timeout: 9000
          }
        );

        const content = res.data?.choices?.[0]?.message?.content || "";
        if (!content.trim()) {
          throw new Error(`Empty response from OpenRouter ${modelName}`);
        }

        const sanitizedItems = parseOCRResponse(content, modelName);
        console.log(`[SmartOrderOCR] ✅ Successfully recognized ${sanitizedItems.length} items using OpenRouter (${modelName})`);

        return {
          success: true,
          modelUsed: `openrouter/${modelName}`,
          items: sanitizedItems
        };
      } catch (err: any) {
        console.warn(`[SmartOrderOCR] OpenRouter ${modelName} failed:`, err.response?.data?.error?.message || err.message || err);
        lastError = err;
      }
    }
  }

  throw new Error(formatFriendlyErrorMessage(lastError || "All OCR models are temporarily busy. Please try again in a moment."));
}

/**
 * Transforms raw technical API errors into clean, informative messages.
 */
export function formatFriendlyErrorMessage(err: any): string {
  if (!err) return "প্রেসক্রিপশন প্রসেস করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।";
  const raw = typeof err === "string" ? err : String(err.message || "");

  if (raw.includes("API_KEY_INVALID") || raw.includes("API key not valid") || raw.includes("unauthenticated") || raw.includes("not configured")) {
    return "সার্ভারে Gemini / OpenRouter API Key সক্রিয় নেই। অনুগ্রহ করে এনভায়রনমেন্ট ভ্যারিয়েবল চেক করুন।";
  }
  if (raw.includes("429") || raw.includes("quota") || raw.includes("Resource has been exhausted")) {
    return "অতিরিক্ত রিকোয়েস্টের কারণে সাময়িক বিলম্ব হচ্ছে। অনুগ্রহ করে ৩০ সেকেন্ড পর আবার চেষ্টা করুন।";
  }
  if (raw.includes("timeout") || raw.includes("deadline")) {
    return "ছবিটি স্ক্যান করতে কিছুটা সময় বেশি লাগছে। অনুগ্রহ করে আরেকবার চেষ্টা করুন।";
  }
  if (raw.includes("bad request") || raw.includes("invalid argument")) {
    return "ছবিটির ফরম্যাটে সমস্যা রয়েছে। সাধারণ JPG বা PNG ছবি আপলোড করুন।";
  }

  return "প্রেসক্রিপশন প্রসেস করতে সমস্যা হয়েছে। অনুগ্রহ করে পরিষ্কার আলোতে ছবি তুলে আবার চেষ্টা করুন।";
}
