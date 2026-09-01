import dotenv from "dotenv";
dotenv.config();
import { GoogleGenAI } from "@google/genai";
import AdmZip from "adm-zip";
import path from "path";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

async function testGemini35Vision() {
  const zipPath = path.resolve("public/products-zip/Medicines.zip");
  const rootZip = new AdmZip(zipPath);
  const entry = rootZip.getEntry("Square Pharmaceuticals PLC.zip");
  if (!entry) return;

  const subZipData = rootZip.readFile(entry);
  const subZip = new AdmZip(subZipData!);
  const imgEntry = subZip.getEntries()[0];
  const imgBuffer = subZip.readFile(imgEntry);

  console.log(`Testing gemini-3.5-flash on Square screenshot: ${imgEntry.entryName}...`);
  const visionRes = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [
      {
        text: "Extract all medicine product cards from this screenshot as JSON: { products: [{ name, strength, packSize, category, mrp, screenshotSellingPrice, screenshotDiscount, isOutOfStock }] }"
      },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imgBuffer!.toString("base64")
        }
      }
    ],
    config: {
      responseMimeType: "application/json"
    }
  });

  console.log("Extracted from Square with gemini-3.5-flash:\n", visionRes.text);
}

testGemini35Vision().catch(console.error);
