import https from "https";
import fs from "fs";

function fetchUrl(url, headers = {}) {
  return new Promise((resolve) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36", ...headers }, timeout: 10000 }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve(d));
    }).on("error", () => resolve(""));
  });
}

async function searchDDGImages(query) {
  try {
    const html = await fetchUrl("https://duckduckgo.com/?q=" + encodeURIComponent(query) + "&iax=images&ia=images");
    const vqdMatch = html.match(/vqd=([0-9-]+)/) || html.match(/vqd="([^"]+)"/);
    if (!vqdMatch) return [];
    const vqd = vqdMatch[1];
    const jsonStr = await fetchUrl(`https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,&p=1`, {
      "Referer": "https://duckduckgo.com/"
    });
    const parsed = JSON.parse(jsonStr);
    return parsed.results || [];
  } catch (e) {
    return [];
  }
}

async function testMissing() {
  const missingItems = [
    { name: "Bacloflex", strength: "10 mg", generic: "Baclofen", form: "Tablet" },
    { name: "Cartigen", strength: "250 mg+200 mg", generic: "Glucosamine Sulfate + Chondroitin", form: "Tablet" },
    { name: "Cefador", strength: "500 mg", generic: "Cefadroxil", form: "Capsule" },
    { name: "Clonac TR", strength: "100 mg", generic: "Diclofenac Sodium", form: "TR Capsule" },
    { name: "Dexdin", strength: "(10 mg+30 mg+1.25 mg)/5 ml", generic: "Dextromethorphan + Pseudoephedrine", form: "Syrup" },
    { name: "Logeva", strength: "Standard", generic: "Super antioxidant", form: "Tablet" },
    { name: "Oralax", strength: "3.35 gm/5 ml", generic: "Lactulose", form: "Oral Solution" },
    { name: "SB-Sol", strength: "0.2%", generic: "Chlorhexidine Gluconate", form: "Mouthwash" },
    { name: "Tamicol", strength: "7.5 mg/5 ml", generic: "Butamirate Citrate", form: "Syrup" },
    { name: "Tramatol", strength: "325 mg+37.5 mg", generic: "Paracetamol + Tramadol", form: "Tablet" },
    { name: "Tussy", strength: "(30 mg+100 mg+1.25 mg)/5 ml", generic: "Pseudoephedrine + Guaiphenasine", form: "Syrup" },
    { name: "Tybac", strength: "(5 mg+250 IU)/gm", generic: "Neomycin + Bacitracin", form: "Ointment" },
    { name: "Vermid", strength: "400 mg", generic: "Albendazole", form: "Chewable Tablet" },
    { name: "Tymox", strength: "500 mg", generic: "Amoxicillin", form: "Capsule" },
    { name: "X-Ride", strength: "30 mg", generic: "Dapoxetine", form: "Tablet" },
    { name: "Dexophan", strength: "10 mg/5 ml", generic: "Dextromethorphan", form: "Syrup" },
    { name: "Tydox", strength: "100 mg", generic: "Doxycycline", form: "Capsule" }
  ];

  for (const item of missingItems) {
    const q1 = `${item.name} Somatec Pharmaceuticals medicine`;
    const q2 = `${item.name} ${item.generic} ${item.form} medicine`;
    let results = await searchDDGImages(q1);
    if (!results || results.length === 0) {
      results = await searchDDGImages(q2);
    }
    console.log(`\nItem: ${item.name} (${item.strength}) -> Found: ${results.length}`);
    if (results && results.length > 0) {
      console.log(`  Top 1: ${results[0].title.slice(0, 70)} -> ${results[0].image}`);
      if (results[1]) console.log(`  Top 2: ${results[1].title.slice(0, 70)} -> ${results[1].image}`);
    }
    await new Promise(r => setTimeout(r, 600));
  }
}

testMissing().catch(console.error);
