import dotenv from "dotenv";
dotenv.config();
import AdmZip from "adm-zip";
import path from "path";

async function testVision() {
  const zipPath = path.resolve("public/products-zip/Medicines.zip");
  const rootZip = new AdmZip(zipPath);
  const entry = rootZip.getEntry("One Pharma Ltd(3%).zip");
  if (!entry) {
    console.error("Entry not found");
    return;
  }

  const subZipData = rootZip.readFile(entry);
  const subZip = new AdmZip(subZipData!);
  const imgEntry = subZip.getEntries()[0];
  const imgBuffer = subZip.readFile(imgEntry);
  const base64Image = `data:image/jpeg;base64,${imgBuffer!.toString("base64")}`;

  console.log(`Testing Gemini Vision via OpenRouter with image: ${imgEntry.entryName} (Buffer size: ${imgBuffer!.length} bytes)...`);

  const prompt = `You are an expert OCR and medicine catalog extractor. 
Extract all medicine product cards visible in this screenshot into structured JSON.
For each product card, extract:
- name: Brand name of the medicine (e.g. "Brodil", "Canazole", "Cefim 3", "Onecef")
- strength: Strength or dosage (e.g. "500 mg", "10 mg", "250 mg+62.5 mg")
- packSize: Pack size (e.g. "10's pack", "30's pack", "100 Pcs", "60 pcs")
- category: Dosage form/category (e.g. "Tablet", "Capsule", "Syrup", "Injection", "Oral Gel", "Cream", "Ointment", "Inhaler")
- mrp: The regular MRP price shown (number in BDT, crossed out or original price)
- screenshotSellingPrice: The discounted selling price shown in the screenshot (number in BDT, or 0 if out of stock/Request button)
- screenshotDiscount: The orange badge discount percentage shown (e.g. 15.5 for 15.5%, or 0 / 100 if out of stock)
- isOutOfStock: boolean (true if 100% badge / Request button / ৳0)

Return ONLY a valid JSON array of objects with keys: "name", "strength", "packSize", "category", "mrp", "screenshotSellingPrice", "screenshotDiscount", "isOutOfStock".`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://medichainbd.vercel.app",
      "X-Title": "MediChain Catalog Extraction"
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-001",
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
  console.log("Response status:", response.status);
  if (resData.choices && resData.choices[0]) {
    console.log("Result content:\n", resData.choices[0].message.content);
  } else {
    console.log("Error or full response:", JSON.stringify(resData, null, 2));
  }
}

testVision().catch(console.error);
