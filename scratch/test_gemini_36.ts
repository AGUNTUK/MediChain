import dotenv from "dotenv";
dotenv.config();
import { GoogleGenAI } from "@google/genai";
import AdmZip from "adm-zip";
import path from "path";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

async function testGemini36() {
  console.log("Testing gemini-3.6-flash on GoogleGenAI SDK...");
  try {
    const res = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: "Hello! Respond with OK."
    });
    console.log("gemini-3.6-flash text response:", res.text);

    // Test with image
    const zipPath = path.resolve("public/products-zip/Medicines.zip");
    const rootZip = new AdmZip(zipPath);
    const entry = rootZip.getEntry("Pristine Pharmaceuticals Ltd (2%).zip");
    if (entry) {
      const subZipData = rootZip.readFile(entry);
      const subZip = new AdmZip(subZipData!);
      const imgEntry = subZip.getEntries()[0];
      const imgBuffer = subZip.readFile(imgEntry);

      console.log("Testing image extraction with gemini-3.6-flash...");
      const visionRes = await ai.models.generateContent({
        model: "gemini-3.6-flash",
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
      console.log("Vision extraction SUCCESS:\n", visionRes.text);
    }
  } catch (err: any) {
    console.error("Error:", err);
  }
}

testGemini36().catch(console.error);
