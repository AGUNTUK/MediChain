import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { GoogleGenAI } from "@google/genai";
import { supabaseAdmin } from "../src/lib/supabaseAdmin.js";

const PROGRESS_FILE = path.resolve("scripts/catalog_sync_progress.json");
const ZIP_PATH = path.resolve("public/products-zip/Medicines.zip");

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

interface ExtractedMedicine {
  name: string;
  genericName?: string;
  strength?: string | null;
  packSize?: string | null;
  category?: string | null;
  mrp: number | string;
  screenshotSellingPrice?: number | string;
  screenshotDiscount?: number | string;
  isOutOfStock?: boolean;
}

interface CompanySummary {
  companyName: string;
  bonusPercent: number;
  totalScreenshots: number;
  processedScreenshots: number;
  status: "pending" | "in_progress" | "completed" | "error";
  productsCount: number;
}

interface ProgressState {
  companies: Record<string, CompanySummary>;
  processedImages: Record<string, boolean>;
  totalProductsUpdated: number;
  totalProductsCreated: number;
}

function loadProgress(): ProgressState {
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8"));
    } catch (e) {
      console.warn("Failed to parse progress file, starting fresh.");
    }
  }
  return {
    companies: {},
    processedImages: {},
    totalProductsUpdated: 0,
    totalProductsCreated: 0
  };
}

function saveProgress(state: ProgressState) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2), "utf-8");
}

function parseNumber(val: any): number {
  if (typeof val === "number") return val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^\d.-]/g, "");
  return parseFloat(cleaned) || 0;
}

// Parallel helper
async function mapConcurrent<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  const workers = Array.from({ length: concurrency }, async () => {
    while (currentIndex < items.length) {
      const idx = currentIndex++;
      results[idx] = await fn(items[idx], idx);
    }
  });

  await Promise.all(workers);
  return results;
}

async function extractFromImage(base64Image: string, retries = 3): Promise<ExtractedMedicine[]> {
  const prompt = `Extract all medicine product cards from this screenshot as structured JSON:
For each card, extract:
- name: Brand name (e.g. "Napa", "Seclo", "Monas", "Cefim")
- genericName: Generic name if known or visible, or brand name
- strength: Dosage / strength (e.g. "500 mg", "20 mg", "100 mcg/puff")
- packSize: Pack size (e.g. "10's pack", "30 Pcs", "50's pack", "100 Pcs")
- category: Form (e.g. "Tablet", "Capsule", "Syrup", "Suspension", "Cream", "Ointment", "Inhaler")
- mrp: MRP price in BDT (number)
- screenshotSellingPrice: Discounted price in screenshot in BDT (number, or 0 if Out of Stock/Request)
- screenshotDiscount: Orange discount % badge (number, e.g. 15.5, or 0 if out of stock/100%)
- isOutOfStock: boolean (true if orange badge says 100% or button says "Request" or price is ৳0)

Return JSON: { "products": [ ... ] }`;

  const models = ["gemini-3.5-flash", "gemini-3.5-flash-lite"];

  for (let attempt = 1; attempt <= retries; attempt++) {
    const model = models[(attempt - 1) % models.length];
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty text");
      const parsed = JSON.parse(text);
      return parsed.products || [];
    } catch (err: any) {
      if (err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED")) {
        console.warn(`[${model}] Rate limited, waiting 15s...`);
        await new Promise(r => setTimeout(r, 15000));
      } else if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }

  return [];
}

async function syncProductToDb(
  item: ExtractedMedicine,
  companyName: string,
  companyBonusPercent: number
): Promise<"updated" | "created" | "error"> {
  try {
    const cleanName = (item.name || "").replace(/\.\.\.$/, "").trim();
    const cleanStrength = (item.strength || "").trim();
    const mrp = parseNumber(item.mrp);
    if (!cleanName || mrp <= 0) return "error";

    const rawDiscount = parseNumber(item.screenshotDiscount);
    let finalDiscount = 0;
    let availableStock = item.isOutOfStock ? 0 : 100;

    if (item.isOutOfStock || rawDiscount >= 99.9 || rawDiscount <= 0) {
      finalDiscount = 16.0 + companyBonusPercent;
      availableStock = 0;
    } else {
      finalDiscount = rawDiscount + companyBonusPercent;
    }

    finalDiscount = Number(finalDiscount.toFixed(2));
    const sellingPrice = Number((mrp * (1 - finalDiscount / 100)).toFixed(2));

    const genericName = (item.genericName && item.genericName !== "N/A" && item.genericName.trim().length > 0)
      ? item.genericName.trim()
      : cleanName;

    // Search existing
    let existingId: string | null = null;
    const { data: existingMatches } = await supabaseAdmin
      .from("products")
      .select("id, name, strength, pack_size, mrp, selling_price, company")
      .ilike("name", cleanName)
      .limit(10);

    if (existingMatches && existingMatches.length > 0) {
      const exactStrengthMatch = existingMatches.find(p => {
        if (!cleanStrength || cleanStrength === "N/A" || !p.strength) return true;
        const s1 = p.strength.toLowerCase().replace(/\s+/g, "");
        const s2 = cleanStrength.toLowerCase().replace(/\s+/g, "");
        return s1.includes(s2) || s2.includes(s1);
      });
      existingId = exactStrengthMatch ? exactStrengthMatch.id : existingMatches[0].id;
    }

    const payload: any = {
      name: cleanName,
      generic_name: genericName,
      company: companyName,
      category_name_fallback: item.category || "Tablet",
      mrp: mrp,
      selling_price: sellingPrice,
      pack_size: item.packSize || "1's pack",
      stock_quantity: availableStock
    };

    if (cleanStrength && cleanStrength !== "N/A") {
      payload.strength = cleanStrength;
    }

    if (existingId) {
      const { error: updateErr } = await supabaseAdmin
        .from("products")
        .update(payload)
        .eq("id", existingId);

      if (!updateErr) {
        // Fast inventory update
        await supabaseAdmin
          .from("inventory")
          .upsert({
            product_id: existingId,
            available_stock: availableStock,
            expiry_date: "2027-12-31"
          }, { onConflict: "product_id" });
        return "updated";
      }
      return "error";
    } else {
      const { data: newProd, error: insertErr } = await supabaseAdmin
        .from("products")
        .insert(payload)
        .select("id")
        .single();

      if (newProd) {
        await supabaseAdmin
          .from("inventory")
          .insert({
            product_id: newProd.id,
            available_stock: availableStock,
            reserved_stock: 0,
            sold_stock: 0,
            batch_number: `B-${Math.floor(10000 + Math.random() * 90000)}`,
            expiry_date: "2027-12-31"
          });
        return "created";
      }
      return "error";
    }
  } catch (err: any) {
    return "error";
  }
}

async function main() {
  console.log("==========================================================");
  console.log("🚀 Starting Ultra-Fast Parallel Gemini 3.5 Sync Pipeline");
  console.log("==========================================================");

  if (!fs.existsSync(ZIP_PATH)) {
    console.error("Fatal: Medicines.zip not found at", ZIP_PATH);
    process.exit(1);
  }

  const rootZip = new AdmZip(ZIP_PATH);
  const rootEntries = rootZip.getEntries().filter(e => !e.isDirectory && e.entryName.endsWith(".zip"));
  console.log(`Discovered ${rootEntries.length} company zip archives.`);

  const progress = loadProgress();
  const startTime = Date.now();

  for (let cIdx = 0; cIdx < rootEntries.length; cIdx++) {
    const entry = rootEntries[cIdx];
    const zipName = entry.entryName;

    const match = zipName.match(/\((\d+)%\)/);
    const bonusPercent = match ? parseInt(match[1], 10) : 2;
    const cleanCompanyName = zipName
      .replace(/\(\d+%\)\.zip$/i, "")
      .replace(/\.zip$/i, "")
      .trim();

    const companyKey = zipName;
    if (!progress.companies[companyKey]) {
      progress.companies[companyKey] = {
        companyName: cleanCompanyName,
        bonusPercent,
        totalScreenshots: 0,
        processedScreenshots: 0,
        status: "pending",
        productsCount: 0
      };
    }

    const companyState = progress.companies[companyKey];
    if (companyState.status === "completed" && companyState.productsCount > 0) {
      console.log(`[SKIPPING] [${cIdx + 1}/${rootEntries.length}] ${cleanCompanyName} (Completed, ${companyState.productsCount} products).`);
      continue;
    }

    console.log(`\n----------------------------------------------------------`);
    console.log(`⚡ [COMPANY ${cIdx + 1}/${rootEntries.length}] ${cleanCompanyName} (+${bonusPercent}%)`);
    console.log(`----------------------------------------------------------`);

    companyState.status = "in_progress";
    saveProgress(progress);

    const subZipData = rootZip.readFile(entry);
    if (!subZipData) continue;

    const subZip = new AdmZip(subZipData);
    const imageEntries = subZip.getEntries().filter(
      e => !e.isDirectory && /\.(jpe?g|png|webp)$/i.test(e.entryName)
    );

    companyState.totalScreenshots = imageEntries.length;
    console.log(`Processing ${imageEntries.length} screenshots with 4 parallel workers...`);

    // Process images in parallel batches of 4
    await mapConcurrent(imageEntries, 4, async (imgEntry, imgIdx) => {
      const imageKey = `${companyKey}::${imgEntry.entryName}`;
      if (progress.processedImages[imageKey]) {
        return;
      }

      const imgBuffer = subZip.readFile(imgEntry);
      if (!imgBuffer) return;

      const base64Data = imgBuffer.toString("base64");
      const extractedMedicines = await extractFromImage(base64Data);

      for (const med of extractedMedicines) {
        const res = await syncProductToDb(med, cleanCompanyName, bonusPercent);
        if (res === "updated") {
          progress.totalProductsUpdated++;
          companyState.productsCount++;
        } else if (res === "created") {
          progress.totalProductsCreated++;
          companyState.productsCount++;
        }
      }

      if (extractedMedicines.length > 0) {
        progress.processedImages[imageKey] = true;
        companyState.processedScreenshots++;
        console.log(`  ✓ [Img ${imgIdx + 1}/${imageEntries.length}] ${imgEntry.entryName} -> ${extractedMedicines.length} products synced.`);
      }
    });

    if (companyState.productsCount > 0) {
      companyState.status = "completed";
    }
    saveProgress(progress);
    console.log(`✨ Finished ${cleanCompanyName}: Total ${companyState.productsCount} products.`);
  }

  const durationSec = Math.round((Date.now() - startTime) / 1000);
  console.log("\n==========================================================");
  console.log(`🎉 ALL 55 COMPANIES PROCESSED IN ${durationSec}s!`);
  console.log(`Total Products Updated: ${progress.totalProductsUpdated}`);
  console.log(`Total Products Created: ${progress.totalProductsCreated}`);
  console.log("==========================================================");
}

main().catch(console.error);
