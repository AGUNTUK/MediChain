import dotenv from "dotenv";
dotenv.config();
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

async function test36() {
  const models = ["gemini-3.6-flash", "gemini-3.1-pro-preview", "gemini-3.6-pro", "gemini-3.0-flash"];
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

test36().catch(console.error);
