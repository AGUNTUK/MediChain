import fs from "fs";
import https from "https";

function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" } }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(data));
    }).on("error", (err) => {
      resolve("");
    });
  });
}

function parseCSVLine(line) {
  const result = [];
  let curr = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        curr += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (c === "," && !inQ) {
      result.push(curr);
      curr = "";
    } else {
      curr += c;
    }
  }
  result.push(curr);
  return result;
}

function parseMedexBrandPage(html) {
  const companyMatch = html.match(/href="https:\/\/medex\.com\.bd\/companies\/[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
  const company = companyMatch ? companyMatch[1].replace(/<[^>]+>/g, "").trim() : "";

  const titleMatch = html.match(/<h1[^>]*class="page-heading-1-l"[^>]*>([\s\S]*?)<\/h1>/i) || html.match(/<title>([^<|]+)/i);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim() : "";

  const genMatch = html.match(/href="https:\/\/medex\.com\.bd\/generic\/[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
  const generic = genMatch ? genMatch[1].replace(/<[^>]+>/g, "").trim() : "";

  // Unit price
  const unitPriceMatch = html.match(/Unit Price:\s*<span>৳\s*([0-9.]+)<\/span>/i);
  const unitPrice = unitPriceMatch ? parseFloat(unitPriceMatch[1]) : null;

  // Strip price
  const stripPriceMatch = html.match(/Strip Price:\s*<span>৳\s*([0-9.]+)<\/span>/i);
  const stripPrice = stripPriceMatch ? parseFloat(stripPriceMatch[1]) : null;

  // Pack sizes & prices
  const packList = [];
  // Pattern 1: (3 x 10: ৳ 270.00) or (10 x 10: ৳ 250.00)
  const p1Matches = html.matchAll(/\(([^:)]+):\s*৳\s*([0-9.]+)\)/gi);
  for (const m of p1Matches) {
    packList.push({ packSize: m[1].trim(), packPrice: parseFloat(m[2]) });
  }

  // Pattern 2: 100 ml bottle: <span>৳ 80.30</span> or 200 ml bottle: ৳ 150.00
  const p2Matches = html.matchAll(/([0-9]+(?:\s*ml bottle|\s*gm tube|\s*vial|\s*ampoule|\s*sachet|\s*piece)[^:]*):\s*(?:<[^>]+>\s*)*৳\s*([0-9.]+)/gi);
  for (const m of p2Matches) {
    packList.push({ packSize: m[1].replace(/<[^>]+>/g, "").trim(), packPrice: parseFloat(m[2]) });
  }

  // Pattern 3: bottle: ৳ xx.xx
  const p3Matches = html.matchAll(/([0-9a-zA-Z\s]+(?:bottle|tube|dropper|pack|strip)):\s*(?:<[^>]+>\s*)*৳\s*([0-9.]+)/gi);
  for (const m of p3Matches) {
    const ps = m[1].replace(/<[^>]+>/g, "").trim();
    if (!packList.some(p => p.packSize === ps)) {
      packList.push({ packSize: ps, packPrice: parseFloat(m[2]) });
    }
  }

  // Image
  const imgMatch = html.match(/(?:src|data-src)="([^"]*storage\/images\/packaging\/[^"]*)"/i);
  const imageUrl = imgMatch ? imgMatch[1] : "";

  return { company, generic, title, unitPrice, stripPrice, packList, imageUrl };
}

async function searchMedex(query) {
  const searchHtml = await fetchUrl("https://medex.com.bd/search?search=" + encodeURIComponent(query));
  const brandLinks = [...new Set(searchHtml.match(/\/brands\/[0-9]+\/[a-z0-9-]+/gi) || [])];
  return brandLinks;
}

function calculateUnits(packSize, dosageForm) {
  if (!packSize) return 1;
  const ps = packSize.toLowerCase();
  const multMatch = ps.match(/([0-9]+)\s*x\s*([0-9]+)/);
  if (multMatch) {
    return parseInt(multMatch[1], 10) * parseInt(multMatch[2], 10);
  }
  const singleMatch = ps.match(/^([0-9]+)\s*(?:'s|s)?/);
  if (singleMatch) {
    return parseInt(singleMatch[1], 10);
  }
  return 1;
}

function resolveUnitType(dosageForm) {
  const df = (dosageForm || "").toLowerCase();
  if (df.includes("tablet")) return "tablet";
  if (df.includes("capsule")) return "capsule";
  if (df.includes("suspension") || df.includes("syrup") || df.includes("solution") || df.includes("drop") || df.includes("mouthwash")) return "bottle";
  if (df.includes("powder") && !df.includes("suspension")) return "powder";
  if (df.includes("powder for suspension")) return "bottle";
  return "pack";
}

async function main() {
  const rawCsv = fs.readFileSync("input_somatec.csv", "utf-8").trim();
  const lines = rawCsv.split("\n");
  const headers = parseCSVLine(lines[0]);
  
  const products = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    products.push({
      index: i,
      product_name: cols[0]?.trim() || "",
      generic_name: cols[1]?.trim() || "",
      strength: cols[2]?.trim() || "",
      dosage_form: cols[3]?.trim() || "",
      pack_size: cols[4]?.trim() || "",
      units_per_pack: cols[5]?.trim() || "",
      unit_type: cols[6]?.trim() || "",
      mrp_per_pack: cols[7]?.trim() || "",
      company: cols[8]?.trim() || "Somatec Pharmaceuticals Ltd.",
      image_url: ""
    });
  }

  console.log(`Loaded ${products.length} products. Checking for missing MRPs...`);
  const missing = products.filter(p => !p.mrp_per_pack || isNaN(parseFloat(p.mrp_per_pack)) || parseFloat(p.mrp_per_pack) <= 0);
  console.log(`Products missing MRP: ${missing.length}`);

  // Cache to avoid refetching same brand page
  const brandCache = new Map();

  for (let idx = 0; idx < products.length; idx++) {
    const p = products[idx];
    const isMissing = !p.mrp_per_pack || isNaN(parseFloat(p.mrp_per_pack)) || parseFloat(p.mrp_per_pack) <= 0;
    
    // We crawl to find MRP if missing, or enrich image/pack_size
    const query = `${p.product_name}`;
    const brandLinks = await searchMedex(query);

    let matchedPage = null;
    let matchedUrl = "";

    for (const link of brandLinks) {
      let pageData;
      if (brandCache.has(link)) {
        pageData = brandCache.get(link);
      } else {
        const html = await fetchUrl("https://medex.com.bd" + link);
        pageData = parseMedexBrandPage(html);
        brandCache.set(link, pageData);
        // Small delay to be polite
        await new Promise(r => setTimeout(r, 60));
      }

      if (!pageData.company.toLowerCase().includes("somatec")) {
        continue;
      }

      // Check strength match if strength is non-empty
      const normStrengthP = p.strength.toLowerCase().replace(/\s+/g, "");
      const linkNorm = link.toLowerCase().replace(/[-_\s]/g, "");

      // Check if this link is for the specific strength/form
      const strengthTokens = p.strength.toLowerCase().match(/[0-9.]+(?:mg|ml|gm|iu|%|mcg)/g) || [];
      let matchesStrength = true;
      if (strengthTokens.length > 0) {
        matchesStrength = strengthTokens.every(t => linkNorm.includes(t.replace(/\s+/g, "")));
      }

      if (matchesStrength) {
        matchedPage = pageData;
        matchedUrl = link;
        break;
      } else if (!matchedPage) {
        // Fallback to first somatec page if none matched strength specifically
        matchedPage = pageData;
        matchedUrl = link;
      }
    }

    if (matchedPage) {
      if (matchedPage.imageUrl) {
        p.image_url = matchedPage.imageUrl;
      }

      if (isMissing) {
        // Resolve pack size & MRP
        if (matchedPage.packList && matchedPage.packList.length > 0) {
          // If product had a pack size, match it
          let chosen = matchedPage.packList[0];
          if (p.pack_size) {
            const found = matchedPage.packList.find(x => x.packSize.toLowerCase().includes(p.pack_size.toLowerCase()));
            if (found) chosen = found;
          }
          p.pack_size = p.pack_size || chosen.packSize;
          p.mrp_per_pack = String(chosen.packPrice);
        } else if (matchedPage.unitPrice) {
          // Calculate pack price based on unit price and pack size
          const units = calculateUnits(p.pack_size || "3 x 10", p.dosage_form);
          p.pack_size = p.pack_size || "3 x 10";
          p.mrp_per_pack = String(Math.round(matchedPage.unitPrice * units * 100) / 100);
        }
      }
    }

    // Default calculations for units_per_pack and unit_type if empty
    if (!p.pack_size) {
      const df = p.dosage_form.toLowerCase();
      if (df.includes("syrup") || df.includes("suspension") || df.includes("oral solution") || df.includes("mouthwash")) {
        p.pack_size = "100 ml bottle";
      } else if (df.includes("pediatric drop") || df.includes("drop")) {
        p.pack_size = "15 ml bottle";
      } else if (df.includes("topical powder") || df.includes("powder")) {
        p.pack_size = "10 gm bottle";
      } else {
        p.pack_size = "3 x 10";
      }
    }

    if (!p.units_per_pack || isNaN(parseFloat(p.units_per_pack))) {
      p.units_per_pack = String(calculateUnits(p.pack_size, p.dosage_form));
    }

    if (!p.unit_type) {
      p.unit_type = resolveUnitType(p.dosage_form);
    }

    if (idx % 10 === 0 || idx === products.length - 1) {
      console.log(`Processed ${idx + 1}/${products.length}: ${p.product_name} (${p.strength}) -> MRP: ${p.mrp_per_pack}, Pack: ${p.pack_size}`);
    }
  }

  // Save intermediate result
  fs.writeFileSync("crawled_somatec_products.json", JSON.stringify(products, null, 2));
  console.log("Saved crawled_somatec_products.json");

  // Summary of still missing
  const stillMissing = products.filter(p => !p.mrp_per_pack || isNaN(parseFloat(p.mrp_per_pack)) || parseFloat(p.mrp_per_pack) <= 0);
  console.log(`\nCrawling finished. Still missing MRP: ${stillMissing.length}`);
  if (stillMissing.length > 0) {
    console.log("Remaining missing:", stillMissing.map(m => `${m.product_name} (${m.generic_name} ${m.strength} ${m.dosage_form})`));
  }
}

main().catch(console.error);
