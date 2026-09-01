import dotenv from "dotenv";
dotenv.config();
import { GoogleGenAI } from "@google/genai";
import AdmZip from "adm-zip";
import path from "path";

const apiKey = process.env.GEMINI_API_KEY || "";

async function testGeminiSDK() {
  console.log("Testing GoogleGenAI SDK with the provided key...");
  try {
    const ai = new GoogleGenAI({ apiKey });

    // Test text prompt
    const textRes = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: "Hello! Reply with 'OK' if you can read this."
    });
    console.log("Text generation response:", textRes.text);

    // Test vision extraction
    const zipPath = path.resolve("public/products-zip/Medicines.zip");
    const rootZip = new AdmZip(zipPath);
    const entry = rootZip.getEntry("Pristine Pharmaceuticals Ltd (2%).zip");
    if (entry) {
      const subZipData = rootZip.readFile(entry);
      const subZip = new AdmZip(subZipData!);
      const imgEntry = subZip.getEntries()[0];
      const imgBuffer = subZip.readFile(imgEntry);

      console.log("Testing vision generation on sample image...");
      const visionRes = await ai.models.generateContent({
        model: "gemini-2.0-flash",
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

      console.log("Vision extracted JSON:\n", visionRes.text);
    }
  } catch (err: any) {
    console.error("Gemini SDK error:", err);
  }
}

testGeminiSDK().catch(console.error);
