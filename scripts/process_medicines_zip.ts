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
      const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8"));
      return data;
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

async function extractFromImage(base64Image: string, retries = 4): Promise<ExtractedMedicine[]> {
  const prompt = `You are an expert pharmaceutical OCR and medicine catalog extractor.
Extract all medicine product cards visible in this mobile app screenshot into structured JSON.
For each card, extract:
- name: The brand name of the medicine (e.g. "Paracal D", "Riboflavin", "Seclotil 20", "Brodil", "Napa", "Seclo", "Zemicef 400", "Zibac 500")
- genericName: Generic chemical name if known or visible (e.g. "Paracetamol", "Cefixime", "Azithromycin", "Fluconazole"), or brand name
- strength: Dosage / strength (e.g. "500 mg", "20 mg", "5 mg", "100 mcg/puff", "400 mg")
- packSize: Pack size (e.g. "10's pack", "30 Pcs", "50's pack", "100 Pcs", "14 Pcs", "18 pcs", "1's pack")
- category: Dosage form category (e.g. "Tablet", "Capsule", "Syrup", "Suspension", "Oral Gel", "Cream", "Ointment", "Inhaler", "Injection")
- mrp: MRP price in BDT (number)
- screenshotSellingPrice: Selling price in screenshot in BDT (number, or 0 if Request/Out of Stock)
- screenshotDiscount: Orange badge discount percentage (number, e.g. 74.65, or 0 if 100%/out of stock)
- isOutOfStock: boolean (true if orange badge says 100% or button says "Request" or price is ৳0)

Return JSON in this format:
{
  "products": [
    {
      "name": "...",
      "genericName": "...",
      "strength": "...",
      "packSize": "...",
      "category": "...",
      "mrp": 0,
      "screenshotSellingPrice": 0,
      "screenshotDiscount": 0,
      "isOutOfStock": false
    }
  ]
}`;

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
      if (!text) {
        throw new Error("Empty response text from Gemini");
      }

      const parsed = JSON.parse(text);
      return parsed.products || [];
    } catch (err: any) {
      console.warn(`[${model}] Attempt ${attempt}/${retries} failed:`, err.message?.slice(0, 120));
      
      if (err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED")) {
        console.log("Rate limit encountered, backing off for 20 seconds...");
        await new Promise(r => setTimeout(r, 20000));
      } else if (attempt < retries) {
        await new Promise(r => setTimeout(r, 2000 * attempt));
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
    if (!cleanName || mrp <= 0) {
      return "error";
    }

    const rawDiscount = parseNumber(item.screenshotDiscount);
    let finalDiscount = 0;
    let availableStock = item.isOutOfStock ? 0 : 100;

    if (item.isOutOfStock || rawDiscount >= 99.9 || rawDiscount <= 0) {
      // Fallback base discount + company bonus
      finalDiscount = 16.0 + companyBonusPercent;
      availableStock = 0;
    } else {
      finalDiscount = rawDiscount + companyBonusPercent;
    }

    // Round discount to 2 decimals
    finalDiscount = Number(finalDiscount.toFixed(2));
    const sellingPrice = Number((mrp * (1 - finalDiscount / 100)).toFixed(2));

    // Ensure non-null generic name
    const genericName = (item.genericName && item.genericName !== "N/A" && item.genericName.trim().length > 0)
      ? item.genericName.trim()
      : cleanName;

    // Look for existing product in database
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

      if (updateErr) {
        console.error(`Error updating product ${cleanName} (${existingId}):`, updateErr);
        return "error";
      }

      // Sync inventory
      const { data: inv } = await supabaseAdmin
        .from("inventory")
        .select("id")
        .eq("product_id", existingId)
        .maybeSingle();

      if (inv) {
        await supabaseAdmin
          .from("inventory")
          .update({
            available_stock: availableStock,
            expiry_date: "2027-12-31"
          })
          .eq("id", inv.id);
      } else {
        await supabaseAdmin
          .from("inventory")
          .insert({
            product_id: existingId,
            available_stock: availableStock,
            reserved_stock: 0,
            sold_stock: 0,
            batch_number: `B-${Math.floor(10000 + Math.random() * 90000)}`,
            expiry_date: "2027-12-31"
          });
      }

      return "updated";
    } else {
      // Insert new product
      const { data: newProd, error: insertErr } = await supabaseAdmin
        .from("products")
        .insert(payload)
        .select("id")
        .single();

      if (insertErr || !newProd) {
        console.error(`Error inserting product ${cleanName}:`, insertErr);
        return "error";
      }

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
  } catch (err: any) {
    console.error(`Unexpected error syncing ${item.name}:`, err.message);
    return "error";
  }
}

async function main() {
  console.log("==========================================================");
  console.log("Starting MediChain 55 Pharmaceutical Companies Gemini Pipeline");
  console.log("==========================================================");

  if (!fs.existsSync(ZIP_PATH)) {
    console.error("Fatal: Medicines.zip not found at", ZIP_PATH);
    process.exit(1);
  }

  const rootZip = new AdmZip(ZIP_PATH);
  const rootEntries = rootZip.getEntries().filter(e => !e.isDirectory && e.entryName.endsWith(".zip"));

  console.log(`Discovered ${rootEntries.length} company zip archives.`);

  const progress = loadProgress();

  for (let cIdx = 0; cIdx < rootEntries.length; cIdx++) {
    const entry = rootEntries[cIdx];
    const zipName = entry.entryName;

    // Parse bonus percentage (e.g. "(3%).zip" -> 3, default to 2 if not present)
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
    // If completed with products, skip
    if (companyState.status === "completed" && companyState.productsCount > 0) {
      console.log(`[SKIPPING] [${cIdx + 1}/${rootEntries.length}] ${cleanCompanyName} (Already completed, ${companyState.productsCount} products).`);
      continue;
    }

    console.log(`\n==========================================================`);
    console.log(`[COMPANY ${cIdx + 1}/${rootEntries.length}] ${cleanCompanyName} (Bonus: +${bonusPercent}%)`);
    console.log(`==========================================================`);

    companyState.status = "in_progress";
    saveProgress(progress);

    const subZipData = rootZip.readFile(entry);
    if (!subZipData) {
      console.error(`Failed to read zip data for ${zipName}`);
      companyState.status = "error";
      saveProgress(progress);
      continue;
    }

    const subZip = new AdmZip(subZipData);
    const imageEntries = subZip.getEntries().filter(
      e => !e.isDirectory && /\.(jpe?g|png|webp)$/i.test(e.entryName)
    );

    companyState.totalScreenshots = imageEntries.length;
    console.log(`Found ${imageEntries.length} screenshots for ${cleanCompanyName}.`);

    let companyProductsCount = 0;

    for (let imgIdx = 0; imgIdx < imageEntries.length; imgIdx++) {
      const imgEntry = imageEntries[imgIdx];
      const imageKey = `${companyKey}::${imgEntry.entryName}`;

      if (progress.processedImages[imageKey]) {
        console.log(`  - [Img ${imgIdx + 1}/${imageEntries.length}] ${imgEntry.entryName} (Already processed)`);
        continue;
      }

      console.log(`  - [Img ${imgIdx + 1}/${imageEntries.length}] Gemini Extracting ${imgEntry.entryName}...`);
      const imgBuffer = subZip.readFile(imgEntry);
      if (!imgBuffer) {
        console.warn(`    Failed to read image buffer for ${imgEntry.entryName}`);
        continue;
      }

      const base64Data = imgBuffer.toString("base64");
      const extractedMedicines = await extractFromImage(base64Data);

      console.log(`    Extracted ${extractedMedicines.length} medicine cards from ${imgEntry.entryName}:`);

      for (const med of extractedMedicines) {
        const res = await syncProductToDb(med, cleanCompanyName, bonusPercent);
        const disc = parseNumber(med.screenshotDiscount);
        if (res === "updated") {
          progress.totalProductsUpdated++;
          companyProductsCount++;
          console.log(`      ✓ [UPDATED] ${med.name} ${med.strength || ""} (${med.packSize || ""}) | MRP: ৳${med.mrp} | Disc: ${disc}% + ${bonusPercent}% = ${(disc + bonusPercent).toFixed(2)}%`);
        } else if (res === "created") {
          progress.totalProductsCreated++;
          companyProductsCount++;
          console.log(`      ★ [CREATED] ${med.name} ${med.strength || ""} (${med.packSize || ""}) | MRP: ৳${med.mrp} | Disc: ${disc}% + ${bonusPercent}% = ${(disc + bonusPercent).toFixed(2)}%`);
        }
      }

      if (extractedMedicines.length > 0) {
        progress.processedImages[imageKey] = true;
        companyState.processedScreenshots++;
        companyState.productsCount += extractedMedicines.length;
        saveProgress(progress);
      }

      // 1.5s throttle to respect free tier RPM
      await new Promise(r => setTimeout(r, 1500));
    }

    if (companyState.productsCount > 0) {
      companyState.status = "completed";
    } else {
      companyState.status = "error";
    }
    saveProgress(progress);
    console.log(`✓ Finished ${cleanCompanyName}: ${companyProductsCount} products synced.`);
  }

  console.log("\n==========================================================");
  console.log("PIPELINE COMPLETED SUCCESSFULLY!");
  console.log(`Total Products Updated: ${progress.totalProductsUpdated}`);
  console.log(`Total Products Created: ${progress.totalProductsCreated}`);
  console.log("==========================================================");
}

main().catch(console.error);
