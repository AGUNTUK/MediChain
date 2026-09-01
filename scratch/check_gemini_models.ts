import dotenv from "dotenv";
dotenv.config();
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

async function checkGeminiModels() {
  const models = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash-exp"
  ];

  for (const m of models) {
    try {
      const res = await ai.models.generateContent({
        model: m,
        contents: "Hello! Respond with OK."
      });
      console.log(`Model ${m}: SUCCESS ->`, res.text?.trim());
    } catch (e: any) {
      console.log(`Model ${m}: Error ->`, e.message);
    }
  }
}

checkGeminiModels().catch(console.error);
