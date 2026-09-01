import dotenv from "dotenv";
dotenv.config();
import AdmZip from "adm-zip";
import path from "path";

async function testExtraction() {
  const zipPath = path.resolve("public/products-zip/Medicines.zip");
  const rootZip = new AdmZip(zipPath);
  const entry = rootZip.getEntry("One Pharma Ltd(3%).zip");
  if (!entry) return;

  const subZipData = rootZip.readFile(entry);
  const subZip = new AdmZip(subZipData!);
  const imgEntry = subZip.getEntries()[0];
  const imgBuffer = subZip.readFile(imgEntry);
  const base64Image = `data:image/jpeg;base64,${imgBuffer!.toString("base64")}`;

  const prompt = `Extract all medicine product cards visible in this screenshot into structured JSON.
For each card, extract:
- name: Medicine brand name
- strength: Strength (e.g. "500 mg", "10 mg")
- packSize: Pack size (e.g. "10's pack", "30 Pcs")
- category: Form (e.g. "Tablet", "Capsule", "Syrup", "Injection", "Ointment")
- mrp: MRP price (number)
- screenshotSellingPrice: Selling price shown in screenshot (number, or 0 if out of stock)
- screenshotDiscount: Orange discount percentage badge (number, e.g. 15.5)
- isOutOfStock: boolean

Return JSON format: { "products": [ ... ] }`;

  const models = [
    "openai/gpt-4o-mini",
    "google/gemini-2.0-flash-lite-preview-02-05:free",
    "google/gemini-2.0-flash-thinking-exp-1219:free"
  ];

  for (const m of models) {
    try {
      console.log(`\n--- Testing model: ${m} ---`);
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://medichainbd.vercel.app",
          "X-Title": "MediChain Catalog Extraction"
        },
        body: JSON.stringify({
          model: m,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: base64Image
                  }
                }
              ]
            }
          ],
          response_format: { type: "json_object" }
        })
      });

      const resData: any = await response.json();
      console.log("Status:", response.status);
      if (resData.choices && resData.choices[0]) {
        console.log("Extracted Content:\n", resData.choices[0].message.content);
        break; // Success!
      } else {
        console.log("Error:", resData.error);
      }
    } catch (e: any) {
      console.log("Error calling model:", e.message);
    }
  }
}

testExtraction().catch(console.error);
