import dotenv from "dotenv";
dotenv.config();
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
console.log("Using GEMINI_API_KEY present:", !!apiKey);

const ai = new GoogleGenAI({ apiKey });

async function testModels() {
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-pro"];
  for (const model of models) {
    try {
      console.log(`Testing model: ${model}...`);
      const res = await ai.models.generateContent({
        model,
        contents: "Extract medicine names from this text: 1. Napa 500mg (10 tab), 2. Seclo 20mg (14 cap). Output JSON array: [{\"name\":\"...\", \"strength\":\"...\", \"quantity\": 10}]"
      });
      console.log(`Success with ${model}! Response:`, res.text?.trim());
      break;
    } catch (e: any) {
      console.log(`Failed with ${model}:`, e.message);
    }
  }
}

testModels().catch(console.error);
