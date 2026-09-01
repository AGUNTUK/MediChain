import dotenv from "dotenv";
dotenv.config();

async function checkModels() {
  const models = [
    "google/gemini-2.5-flash",
    "google/gemini-flash-1.5",
    "google/gemini-2.0-flash-exp:free",
    "google/gemini-2.0-flash-thinking-exp:free",
    "google/gemini-pro-1.5",
    "openai/gpt-4o-mini",
    "meta-llama/llama-3.2-11b-vision-instruct"
  ];

  for (const m of models) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: m,
          messages: [{ role: "user", content: "hi" }]
        })
      });
      const data: any = await res.json();
      console.log(`Model ${m}: Status ${res.status}, valid: ${!data.error}`);
    } catch (e: any) {
      console.log(`Model ${m} error:`, e.message);
    }
  }
}

checkModels().catch(console.error);
