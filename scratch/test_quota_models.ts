import dotenv from "dotenv";
dotenv.config();
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

async function testNewModels() {
  const models = [
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.6-flash-lite",
    "gemini-3.1-pro-preview"
  ];

  for (const m of models) {
    try {
      const res = await ai.models.generateContent({
        model: m,
        contents: "Hi"
      });
      console.log(`Model ${m}: SUCCESS ->`, res.text);
    } catch (e: any) {
      console.log(`Model ${m}: Error (${e.status || e.code}) ->`, e.message?.slice(0, 150));
    }
  }
}

testNewModels().catch(console.error);
