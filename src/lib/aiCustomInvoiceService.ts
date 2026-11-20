import { GoogleGenAI, Type } from "@google/genai";
import { supabaseAdmin } from "./supabaseAdmin.js";

export interface AICustomInvoiceParseInput {
  promptText?: string;
  imageBase64?: string;
  mimeType?: string;
}

export interface AIParsedInvoiceItem {
  id: string;
  productId?: string;
  name: string;
  company: string;
  category: string;
  strength: string;
  packSize: string;
  mrp: number;
  rate: number;
  quantity: number;
  discountPercentage: number;
  netDiscount: number;
  total: number;
  matchedFromCatalog: boolean;
}

export interface AIParsedInvoiceResult {
  matchedPharmacyId?: string;
  recipientType?: "institute" | "hospital" | "clinic" | "pharmacy" | "ngo" | "other";
  recipientName?: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  licenseOrRegNo?: string;
  invoiceDate?: string;
  dueDate?: string;
  paymentMethod?: string;
  paymentStatus?: "Paid" | "Pending";
  deliveryCharge?: number | null;
  specialAdjustment?: number | null;
  notes?: string;
  items: AIParsedInvoiceItem[];
  matchedCount: number;
  summary: string;
}

const VALID_RECIPIENT_TYPES = new Set([
  "institute",
  "hospital",
  "clinic",
  "pharmacy",
  "ngo",
  "other",
]);

const VALID_CATEGORIES = new Set([
  "Tablet",
  "Capsule",
  "Syrup",
  "Injection",
  "Drop",
  "Ointment",
  "Cream",
  "Inhaler",
  "Suspension",
  "Powder",
  "Saline",
  "Surgical",
  "Other",
]);

function normalizeCategory(raw?: string): string {
  if (!raw) return "Tablet";
  const cleaned = raw.trim().toLowerCase();
  for (const cat of VALID_CATEGORIES) {
    if (cat.toLowerCase() === cleaned) return cat;
  }
  if (cleaned.includes("tab")) return "Tablet";
  if (cleaned.includes("cap")) return "Capsule";
  if (cleaned.includes("syp") || cleaned.includes("syrup")) return "Syrup";
  if (cleaned.includes("susp")) return "Suspension";
  if (cleaned.includes("inj") || cleaned.includes("vial") || cleaned.includes("amp")) return "Injection";
  if (cleaned.includes("drop")) return "Drop";
  if (cleaned.includes("oint") || cleaned.includes("gel")) return "Ointment";
  if (cleaned.includes("cream") || cleaned.includes("lotion")) return "Cream";
  if (cleaned.includes("inhal") || cleaned.includes("spray")) return "Inhaler";
  if (cleaned.includes("powd") || cleaned.includes("sachet")) return "Powder";
  if (cleaned.includes("saline") || cleaned.includes("iv")) return "Saline";
  if (cleaned.includes("surg") || cleaned.includes("syringe") || cleaned.includes("bandage") || cleaned.includes("cotton")) return "Surgical";
  return "Other";
}

const PLACEHOLDER_KEYS = new Set([
  "your_google_gemini_api_key_here",
  "my_gemini_api_key",
  "your_api_key_here",
  "placeholder",
  "changeme",
  "undefined",
  "null",
]);

function sanitizeApiKey(raw?: string): string {
  if (!raw) return "";
  // Strip whitespace, newlines, and accidental surrounding quotes from .env / Vercel paste
  const cleaned = raw
    .replace(/[\r\n]+/g, "")
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim();
  if (!cleaned || PLACEHOLDER_KEYS.has(cleaned.toLowerCase())) {
    return "";
  }
  return cleaned;
}

function getCandidateGeminiApiKeys(): { envName: string; key: string }[] {
  const candidates: [string, string | undefined][] = [
    ["GEMINI_API_KEY", process.env.GEMINI_API_KEY],
    ["GOOGLE_API_KEY", process.env.GOOGLE_API_KEY],
    ["GOOGLE_GENAI_API_KEY", process.env.GOOGLE_GENAI_API_KEY],
    ["VITE_GEMINI_API_KEY", process.env.VITE_GEMINI_API_KEY],
  ];

  const seen = new Set<string>();
  const valid: { envName: string; key: string }[] = [];
  for (const [envName, raw] of candidates) {
    const key = sanitizeApiKey(raw);
    if (key && !seen.has(key)) {
      seen.add(key);
      valid.push({ envName, key });
    }
  }
  return valid;
}

function createGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function isInvalidApiKeyError(err: any): boolean {
  const msg = String(err?.message || "");
  return (
    msg.includes("API_KEY_INVALID") ||
    msg.includes("API key not valid") ||
    msg.includes("API key expired") ||
    msg.includes("API_KEY_EXPIRED")
  );
}

function isModelNotFoundError(err: any): boolean {
  const status = err?.status || err?.code || 0;
  const msg = String(err?.message || "");
  return status === 404 || msg.includes("NOT_FOUND") || msg.includes("is not found for API version");
}

export function formatGeminiErrorMessage(err: any): { status: number; message: string } {
  let rawMsg = String(err?.message || "AI invoice parsing failed.");
  let parsedCode = Number(err?.status || err?.code || 0);

  // Unwrap nested JSON error returned by @google/genai SDK
  try {
    const jsonStart = rawMsg.indexOf("{");
    if (jsonStart >= 0) {
      const parsed = JSON.parse(rawMsg.slice(jsonStart));
      if (parsed?.error?.message) {
        rawMsg = String(parsed.error.message);
      }
      if (parsed?.error?.code && !parsedCode) {
        parsedCode = Number(parsed.error.code);
      }
    }
  } catch {
    // Keep rawMsg if not JSON
  }

  if (
    rawMsg.includes("API_KEY_INVALID") ||
    rawMsg.includes("API key not valid") ||
    rawMsg.includes("API key expired") ||
    rawMsg.includes("not configured on the server")
  ) {
    return {
      status: 400,
      message:
        "সার্ভারের GEMINI_API_KEY সঠিক নয় বা মেয়াদোত্তীর্ণ। অনুগ্রহ করে Vercel Dashboard → Settings → Environment Variables-এ বৈধ GEMINI_API_KEY (কোনো কোটেশন ছাড়া) সেট করে Redeploy করুন। (Server Gemini API key is invalid or expired.)",
    };
  }

  if (parsedCode === 429 || rawMsg.includes("RESOURCE_EXHAUSTED") || rawMsg.includes("quota")) {
    return {
      status: 429,
      message:
        "Gemini AI-এর ফ্রি কোটা সাময়িকভাবে পূর্ণ হয়েছে। কয়েক সেকেন্ড পরে আবার চেষ্টা করুন। (AI rate limit exceeded.)",
    };
  }

  if (parsedCode === 403 || rawMsg.includes("PERMISSION_DENIED")) {
    return {
      status: 403,
      message:
        "Gemini API Key-এর এই মডেলের অনুমতি নেই। অনুগ্রহ করে API Key-এর পারমিশন ও রিজিওন/রেস্ট্রিকশন চেক করুন। (API key permission denied.)",
    };
  }

  const status = parsedCode >= 400 && parsedCode < 600 ? parsedCode : 500;
  return { status, message: rawMsg };
}

async function generateWithRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code || 0;
      const msg = String(err?.message || "");
      // Do not retry non-transient client/auth/model errors
      if (
        status === 400 ||
        status === 401 ||
        status === 403 ||
        status === 404 ||
        isInvalidApiKeyError(err) ||
        isModelNotFoundError(err) ||
        msg.includes("PERMISSION_DENIED")
      ) {
        throw err;
      }
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
      }
    }
  }
  throw lastError;
}

const INVOICE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    recipientName: {
      type: Type.STRING,
      description: "Pharmacy, hospital, clinic, or institute name. Empty string if not mentioned.",
    },
    recipientType: {
      type: Type.STRING,
      description: "One of: pharmacy, hospital, clinic, institute, ngo, other.",
    },
    contactPerson: {
      type: Type.STRING,
      description: "Owner, doctor, or procurement officer name if mentioned, else empty string.",
    },
    phone: {
      type: Type.STRING,
      description: "Phone or mobile number if mentioned, else empty string.",
    },
    address: {
      type: Type.STRING,
      description: "Delivery address or area if mentioned, else empty string.",
    },
    licenseOrRegNo: {
      type: Type.STRING,
      description: "Drug license or registration number if mentioned, else empty string.",
    },
    invoiceDate: {
      type: Type.STRING,
      description: "Invoice date in YYYY-MM-DD format if explicitly stated, else empty string.",
    },
    dueDate: {
      type: Type.STRING,
      description: "Payment due date in YYYY-MM-DD format if explicitly stated, else empty string.",
    },
    paymentMethod: {
      type: Type.STRING,
      description: "Payment method if stated (e.g., Cash on Delivery, Bank Transfer, bKash, Credit / Due). Empty string if not stated.",
    },
    paymentStatus: {
      type: Type.STRING,
      description: "Either 'Paid' or 'Pending' if stated, else empty string.",
    },
    deliveryCharge: {
      type: Type.NUMBER,
      description: "Delivery charge in BDT if explicitly mentioned, else -1.",
    },
    specialAdjustment: {
      type: Type.NUMBER,
      description: "Extra charge (positive) or flat extra discount (negative) in BDT if mentioned, else 0.",
    },
    uniformDiscountPercentage: {
      type: Type.NUMBER,
      description: "Global discount percentage applied to all items if stated (e.g. 15 for 15%), else -1.",
    },
    notes: {
      type: Type.STRING,
      description: "Any special delivery instructions or remarks, else empty string.",
    },
    summary: {
      type: Type.STRING,
      description: "Short 1-sentence confirmation summary of what was extracted.",
    },
    items: {
      type: Type.ARRAY,
      description: "List of medicines or surgical items extracted for the invoice.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: "Brand or medicine name (e.g., Napa Extra, Seclo 20, Sergel 20mg).",
          },
          company: {
            type: Type.STRING,
            description: "Pharmaceutical company/manufacturer name if mentioned or visible, else empty string.",
          },
          category: {
            type: Type.STRING,
            description: "Dosage form: Tablet, Capsule, Syrup, Injection, Drop, Ointment, Cream, Inhaler, Suspension, Powder, Saline, Surgical, or Other.",
          },
          strength: {
            type: Type.STRING,
            description: "Dosage strength if known (e.g., 500mg, 20mg, 100ml), else empty string.",
          },
          packSize: {
            type: Type.STRING,
            description: "Pack size / unit count if known (e.g., 10x10, 30 Pcs, 1 Box), else empty string.",
          },
          quantity: {
            type: Type.NUMBER,
            description: "Order quantity (number of boxes/units). Must be >= 1; default 1 if unspecified.",
          },
          mrp: {
            type: Type.NUMBER,
            description: "Unit/Box MRP price in BDT if explicitly stated in text/image, else 0.",
          },
          rate: {
            type: Type.NUMBER,
            description: "Unit/Box net trade/selling rate in BDT if explicitly stated in text/image, else 0.",
          },
          discountPercentage: {
            type: Type.NUMBER,
            description: "Item-specific discount percentage if explicitly stated (0-100), else -1.",
          },
        },
        required: ["name", "quantity"],
      },
    },
  },
  required: ["items"],
};

const SYSTEM_INSTRUCTION = `You are an expert B2B pharmaceutical invoice extraction assistant for MediChain Bangladesh.
Your task is to convert free-form admin instructions (in Bengali, Banglish, or English) and/or uploaded images (handwritten medicine lists, WhatsApp order screenshots, printed bills, hospital requisition slips) into clean, structured invoice JSON.

Critical Rules:
1. Extract recipient information (pharmacy/hospital/institute name, contact person, phone, address, license) whenever present. Infer recipientType accurately ("pharmacy" for Pharmacy/Drug House/Medicine Corner, "hospital" for Hospital, "clinic" for Clinic/Diagnostic, "institute" for Medical College/Institute, "ngo" for NGO).
2. Extract EVERY single medicine or surgical item listed. Convert Bengali numerals (০১২৩৪৫৬৭৮৯) into standard Western digits (0-9).
3. Carefully distinguish:
   - Strength (e.g. 500mg, 20mg, 5mg, 100ml) vs Quantity (e.g. 5 box, 10 pcs, 2 পাতা).
   - MRP (maximum retail price) vs Rate/TP (trade/selling price) vs Discount %.
4. NEVER invent or guess prices! If MRP or Rate is NOT explicitly written in the text or image, return 0 for mrp and 0 for rate, and -1 for discountPercentage. Our server will automatically look up authentic catalog pricing from the database.
5. If a single overall discount is mentioned for the whole bill (e.g. "সবগুলোতে ১৫% ছাড়" or "15% flat discount"), set uniformDiscountPercentage to that number (e.g. 15).
6. If delivery charge is mentioned (e.g. "delivery 40 tk" or "ডেলিভারি চার্জ ৪০"), set deliveryCharge to that number; otherwise set -1.
7. Recognize Bangladeshi pharma dosage abbreviations: Tab = Tablet, Cap = Capsule, Syp = Syrup, Susp = Suspension, Inj = Injection, Oint = Ointment, Drop/Drops/আইড্রপ = Drop, Inhaler = Inhaler.
8. Transliterate Bengali phonetic/voice-dictated Bangladeshi medicine names cleanly into standard English brand spelling (e.g. "প্রিগাবা ফিফটি একটা" -> name: "Pregaba", strength: "50mg", quantity: 1; "লিভোক্স আইড্রপ দুইটা" -> name: "Levox", category: "Drop", quantity: 2; "রিসেট পাঁচশো দুইটা" -> name: "Reset", strength: "500mg", quantity: 2; "ডক্সিবা টু হান্ড্রেড একটা" -> name: "Doxiva", strength: "200mg", quantity: 1; "ফ্লেক্সিব্যাক টেন একটা" -> name: "Flexibac", strength: "10mg", quantity: 1; "সেফাক্ল্যাপ পাঁচশো দুইটা" -> name: "Cefaclav", strength: "500mg", quantity: 2; "ফ্লুক্স পাঁচশো দুইটা" -> name: "Fluclox", strength: "500mg", quantity: 2).
9. Accurately interpret Bengali spoken words for strengths and quantities: একটা/একটি=1, দুইটা/দুইটি=2, তিনটা=3, চারটা=4, পাঁচটা=5, দশটা=10; টেন=10mg, টুয়েন্টি=20mg, ফিফটি=50mg, হান্ড্রেড=100mg, টু হান্ড্রেড=200mg, আড়াইশো=250mg, পাঁচশো=500mg.
10. Keep brand names clean and accurately spelled (e.g. Napa, Seclo, Sergel, Maxpro, Monas, Finix, Napa Extra, Losectil, Ace, Pantonix, Tufnil, Azith, Zimax, Bizoran, Osartil, Fix-A, Cef-3, Pregaba, Reset, Doxiva, Flexibac, Fluclox, Levox, Ubicare, etc.).`;

interface CatalogMatchCandidate {
  id: string;
  name: string;
  generic_name?: string | null;
  company?: string | null;
  category_name_fallback?: string | null;
  strength?: string | null;
  pack_size?: string | null;
  mrp?: number | string | null;
  selling_price?: number | string | null;
  discount_percentage?: number | string | null;
}

function scoreCandidate(
  candidate: CatalogMatchCandidate,
  queryName: string,
  queryStrength?: string,
  queryCompany?: string
): number {
  const cName = (candidate.name || "").toLowerCase().trim();
  const qName = queryName.toLowerCase().trim();
  const cStr = (candidate.strength || "").toLowerCase().replace(/\s+/g, "");
  const qStr = (queryStrength || "").toLowerCase().replace(/\s+/g, "");
  const cComp = (candidate.company || "").toLowerCase().trim();
  const qComp = (queryCompany || "").toLowerCase().trim();

  let score = 0;
  if (cName === qName) score += 100;
  else if (cName.startsWith(qName)) score += 75;
  else if (qName.startsWith(cName)) score += 65;
  else if (cName.includes(qName)) score += 50;
  else {
    const qTokens = qName.split(/\s+/).filter((t) => t.length >= 2);
    const matchedTokens = qTokens.filter((t) => cName.includes(t));
    score += matchedTokens.length * 20;
  }

  if (qStr && cStr) {
    if (cStr === qStr || cStr.includes(qStr) || qStr.includes(cStr)) {
      score += 30;
    }
  } else if (qStr && cName.replace(/\s+/g, "").includes(qStr)) {
    score += 25;
  }

  if (qComp && cComp && (cComp.includes(qComp) || qComp.includes(cComp))) {
    score += 15;
  }

  return score;
}

async function findBestCatalogProduct(
  name: string,
  strength?: string,
  company?: string
): Promise<CatalogMatchCandidate | null> {
  const cleanName = name.replace(/[%_,()]/g, " ").replace(/\s+/g, " ").trim();
  if (cleanName.length < 2) return null;

  const lightweightCols =
    "id, name, generic_name, company, category_name_fallback, strength, pack_size, mrp, selling_price, discount_percentage";

  try {
    // 1. Direct ilike match (strictly bounded to limit 5 — zero egress leak)
    let { data: candidates } = await supabaseAdmin
      .from("products")
      .select(lightweightCols)
      .ilike("name", `%${cleanName}%`)
      .limit(5);

    // 2. Fallback to primary brand token (e.g., "Seclo 20mg" -> "Seclo") if full string missed
    if ((!candidates || candidates.length === 0) && cleanName.includes(" ")) {
      const firstToken = cleanName.split(" ")[0];
      if (firstToken && firstToken.length >= 3) {
        const res = await supabaseAdmin
          .from("products")
          .select(lightweightCols)
          .ilike("name", `${firstToken}%`)
          .limit(5);
        candidates = res.data;
      }
    }

    if (!candidates || candidates.length === 0) return null;

    let best: CatalogMatchCandidate | null = null;
    let bestScore = -1;
    for (const c of candidates as CatalogMatchCandidate[]) {
      const s = scoreCandidate(c, cleanName, strength, company);
      if (s > bestScore) {
        bestScore = s;
        best = c;
      }
    }

    return bestScore >= 35 ? best : null;
  } catch (err) {
    console.warn("[AI Custom Invoice] Catalog lookup skipped for item:", cleanName, err);
    return null;
  }
}

async function findMatchingPharmacy(
  recipientName?: string,
  phone?: string
): Promise<{
  id: string;
  pharmacy_name: string;
  owner_name?: string;
  phone?: string;
  address?: string;
  license_number?: string;
} | null> {
  const cleanName = (recipientName || "").replace(/[%_,]/g, "").trim();
  const cleanPhone = (phone || "").replace(/[^0-9]/g, "").trim();

  if (cleanName.length < 3 && cleanPhone.length < 8) return null;

  const cols = "id, pharmacy_name, owner_name, phone, address, license_number";
  try {
    if (cleanPhone.length >= 8) {
      const suffix = cleanPhone.slice(-8);
      const { data } = await supabaseAdmin
        .from("pharmacies")
        .select(cols)
        .ilike("phone", `%${suffix}%`)
        .limit(1);
      if (data && data.length > 0) return data[0] as any;
    }

    if (cleanName.length >= 3) {
      const { data } = await supabaseAdmin
        .from("pharmacies")
        .select(cols)
        .ilike("pharmacy_name", `%${cleanName}%`)
        .limit(3);
      if (data && data.length > 0) return data[0] as any;
    }
  } catch (err) {
    console.warn("[AI Custom Invoice] Pharmacy lookup skipped:", err);
  }
  return null;
}

export async function parseCustomInvoiceWithAI(
  input: AICustomInvoiceParseInput
): Promise<AIParsedInvoiceResult> {
  const promptText = (input.promptText || "").trim();
  const rawImage = (input.imageBase64 || "").trim();

  if (!promptText && !rawImage) {
    throw new Error("Please provide invoice details in text or upload an image.");
  }

  const candidateKeys = getCandidateGeminiApiKeys();
  if (candidateKeys.length === 0) {
    throw new Error(
      "Gemini API key is not configured on the server. Please check GEMINI_API_KEY in Settings > Secrets."
    );
  }

  const parts: any[] = [];

  if (rawImage) {
    let base64Data = rawImage;
    let detectedMime = input.mimeType || "image/jpeg";

    const dataUriMatch = rawImage.match(/^data:([^;]+);base64,(.+)$/);
    if (dataUriMatch) {
      detectedMime = dataUriMatch[1] || detectedMime;
      base64Data = dataUriMatch[2];
    }

    parts.push({
      inlineData: {
        mimeType: detectedMime,
        data: base64Data,
      },
    });
  }

  const userPrompt = promptText
    ? `Extract complete B2B invoice details from the following admin input${rawImage ? " and attached image" : ""}:\n\n${promptText}`
    : "Extract complete B2B invoice details (recipient info, medicines, quantities, strengths, companies, prices, discounts, and terms) from this attached image.";

  parts.push({ text: userPrompt });

  const modelCandidates = ["gemini-4-hydrogen", "gemini-3.1-flash-lite", "gemini-2.5-flash"];
  let response: any = null;
  let lastError: any = null;

  keyLoop: for (const candidate of candidateKeys) {
    const ai = createGeminiClient(candidate.key);
    for (const modelName of modelCandidates) {
      try {
        response = await generateWithRetry(() =>
          ai.models.generateContent({
            model: modelName,
            contents: { parts },
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              responseMimeType: "application/json",
              responseSchema: INVOICE_RESPONSE_SCHEMA,
            },
          })
        );
        break keyLoop;
      } catch (err: any) {
        lastError = err;
        if (isInvalidApiKeyError(err)) {
          console.warn(
            `[AI Custom Invoice] Env key ${candidate.envName} rejected as invalid; trying next configured key if available.`
          );
          break; // Try next candidate key
        }
        if (isModelNotFoundError(err)) {
          console.warn(
            `[AI Custom Invoice] Model ${modelName} not available for ${candidate.envName}; trying fallback model.`
          );
          continue; // Try next model with same key
        }
        throw err;
      }
    }
  }

  if (!response) {
    throw lastError || new Error("Gemini AI request failed.");
  }

  const rawText = (response.text || "").trim();
  if (!rawText) {
    throw new Error("AI returned an empty response. Please try again with clearer text or image.");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    // Strip markdown fences if any appeared
    const cleaned = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    parsed = JSON.parse(cleaned);
  }

  const rawItems: any[] = Array.isArray(parsed.items) ? parsed.items.slice(0, 100) : [];
  const uniformDisc =
    typeof parsed.uniformDiscountPercentage === "number" &&
    parsed.uniformDiscountPercentage >= 0 &&
    parsed.uniformDiscountPercentage <= 100
      ? parsed.uniformDiscountPercentage
      : null;

  // Match registered pharmacy if applicable
  const matchedPharm = await findMatchingPharmacy(parsed.recipientName, parsed.phone);

  // Match extracted items against catalog in bounded batches of 5
  const catalogMatches: (CatalogMatchCandidate | null)[] = new Array(rawItems.length).fill(null);
  const BATCH_SIZE = 5;
  for (let i = 0; i < rawItems.length; i += BATCH_SIZE) {
    const batch = rawItems.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map((item) =>
        findBestCatalogProduct(String(item.name || ""), item.strength, item.company)
      )
    );
    batchResults.forEach((res, offset) => {
      catalogMatches[i + offset] = res;
    });
  }

  let matchedCount = 0;
  const nowTs = Date.now();

  const finalItems: AIParsedInvoiceItem[] = rawItems
    .map((item, idx) => {
      const cat = catalogMatches[idx];
      if (cat) matchedCount++;

      const qty = Math.max(1, Number(item.quantity) || 1);
      const explicitMrp = Number(item.mrp) > 0 ? Number(item.mrp) : 0;
      const explicitRate = Number(item.rate) > 0 ? Number(item.rate) : 0;
      const explicitItemDisc =
        typeof item.discountPercentage === "number" &&
        item.discountPercentage >= 0 &&
        item.discountPercentage <= 100
          ? item.discountPercentage
          : null;

      const catMrp = cat && Number(cat.mrp) > 0 ? Number(cat.mrp) : 0;
      const catRate = cat && Number(cat.selling_price) > 0 ? Number(cat.selling_price) : 0;
      const catDisc =
        cat && cat.discount_percentage !== undefined && cat.discount_percentage !== null && !isNaN(Number(cat.discount_percentage))
          ? Number(cat.discount_percentage)
          : catMrp > 0 && catRate > 0
            ? Math.max(0, Math.round(((catMrp - catRate) / catMrp) * 1000) / 10)
            : 0;

      // Determine final MRP
      let mrp = explicitMrp || catMrp;
      const effectiveDiscOverride = explicitItemDisc !== null ? explicitItemDisc : uniformDisc;

      if (mrp === 0 && explicitRate > 0) {
        if (effectiveDiscOverride !== null && effectiveDiscOverride > 0 && effectiveDiscOverride < 100) {
          mrp = Math.round((explicitRate / (1 - effectiveDiscOverride / 100)) * 100) / 100;
        } else {
          mrp = explicitRate;
        }
      }

      // Determine final discount % and trade rate
      let rate = 0;
      let discPct = 0;

      if (effectiveDiscOverride !== null) {
        discPct = Math.round(effectiveDiscOverride * 10) / 10;
        if (mrp > 0) {
          rate = Math.round(mrp * (1 - discPct / 100) * 100) / 100;
        } else {
          rate = explicitRate || catRate;
        }
      } else if (explicitRate > 0) {
        rate = Math.round(explicitRate * 100) / 100;
        discPct = mrp > 0 && mrp >= rate ? Math.round(((mrp - rate) / mrp) * 1000) / 10 : 0;
      } else if (cat && catRate > 0) {
        rate = Math.round(catRate * 100) / 100;
        discPct = catDisc;
      } else if (mrp > 0) {
        discPct = 0;
        rate = mrp;
      }

      const netDiscount = Math.round(Math.max(0, mrp - rate) * qty * 100) / 100;
      const total = Math.round(rate * qty * 100) / 100;

      const resolvedCompany =
        (item.company && String(item.company).trim()) ||
        (cat?.company && cat.company !== "MediChain Partner" ? cat.company : "") ||
        "";

      const resolvedStrength =
        (item.strength && String(item.strength).trim()) || (cat?.strength && cat.strength !== "N/A" ? cat.strength : "") || "";

      const resolvedPackSize =
        (item.packSize && String(item.packSize).trim()) || (cat?.pack_size ? cat.pack_size : "") || "Box";

      const resolvedCategory = normalizeCategory(
        (item.category && String(item.category).trim()) || cat?.category_name_fallback || "Tablet"
      );

      const resolvedName = (cat?.name || String(item.name || "Custom Medicine")).trim();

      return {
        id: `ai-item-${nowTs}-${idx}`,
        productId: cat?.id,
        name: resolvedName,
        company: resolvedCompany,
        category: resolvedCategory,
        strength: resolvedStrength,
        packSize: resolvedPackSize,
        mrp,
        rate,
        quantity: qty,
        discountPercentage: discPct,
        netDiscount,
        total,
        matchedFromCatalog: Boolean(cat),
      };
    })
    .filter((it) => Boolean(it.name));

  const rawRecipType = String(parsed.recipientType || "").toLowerCase().trim();
  const recipientType = VALID_RECIPIENT_TYPES.has(rawRecipType)
    ? (rawRecipType as AIParsedInvoiceResult["recipientType"])
    : matchedPharm
      ? "pharmacy"
      : undefined;

  const paymentStatus =
    parsed.paymentStatus === "Paid" || parsed.paymentStatus === "Pending"
      ? parsed.paymentStatus
      : undefined;

  const isValidDate = (d: any) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.trim());

  return {
    matchedPharmacyId: matchedPharm?.id,
    recipientType,
    recipientName: (parsed.recipientName || "").trim() || matchedPharm?.pharmacy_name || undefined,
    contactPerson: (parsed.contactPerson || "").trim() || matchedPharm?.owner_name || undefined,
    phone: (parsed.phone || "").trim() || matchedPharm?.phone || undefined,
    address: (parsed.address || "").trim() || matchedPharm?.address || undefined,
    licenseOrRegNo: (parsed.licenseOrRegNo || "").trim() || matchedPharm?.license_number || undefined,
    invoiceDate: isValidDate(parsed.invoiceDate) ? parsed.invoiceDate.trim() : undefined,
    dueDate: isValidDate(parsed.dueDate) ? parsed.dueDate.trim() : undefined,
    paymentMethod: (parsed.paymentMethod || "").trim() || undefined,
    paymentStatus,
    deliveryCharge:
      typeof parsed.deliveryCharge === "number" && parsed.deliveryCharge >= 0
        ? parsed.deliveryCharge
        : null,
    specialAdjustment:
      typeof parsed.specialAdjustment === "number" && parsed.specialAdjustment !== 0
        ? parsed.specialAdjustment
        : null,
    notes: (parsed.notes || "").trim() || undefined,
    items: finalItems,
    matchedCount,
    summary:
      (parsed.summary || "").trim() ||
      `Prepared ${finalItems.length} item(s) (${matchedCount} matched from catalog).`,
  };
}
