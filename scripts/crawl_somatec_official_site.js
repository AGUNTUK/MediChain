import https from "https";
import fs from "fs";

function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 10000 }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve(d));
    }).on("error", (e) => resolve(""));
  });
}

async function main() {
  const brandListHtml = await fetchUrl("https://www.somatecpharmabd.com/products/brand-name");
  const links = [...new Set(brandListHtml.match(/https:\/\/www\.somatecpharmabd\.com\/products\/details\/[0-9]+/g) || [])];
  console.log(`Found ${links.length} product detail links on official Somatec site.`);

  const officialProducts = [];
  for (const url of links) {
    const html = await fetchUrl(url);
    const m = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i) || html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    const title = m ? m[1].replace(/<[^>]+>/g, "").trim() : "";
    const galleryImgs = [...new Set([...html.matchAll(/(https:\/\/www\.somatecpharmabd\.com\/uploads\/product\/gallery\/[^"'\s]+)/gi)].map((x) => x[1]))];
    const logoImgs = [...new Set([...html.matchAll(/(https:\/\/www\.somatecpharmabd\.com\/uploads\/product\/logo\/[^"'\s]+)/gi)].map((x) => x[1]))];
    
    // Dosage form / strength info if present
    const descMatch = html.match(/<p class="desc">([\s\S]*?)<\/p>/i);
    const desc = descMatch ? descMatch[1].replace(/<[^>]+>/g, "").trim() : "";

    const item = {
      url,
      title,
      desc,
      galleryImgs,
      logoImgs
    };
    officialProducts.push(item);
    console.log(`[${officialProducts.length}/${links.length}] ${title}: ${galleryImgs.length} gallery, ${logoImgs.length} logo`);
  }

  fs.writeFileSync("somatec_official_site_products.json", JSON.stringify(officialProducts, null, 2), "utf-8");
  console.log("Saved somatec_official_site_products.json successfully.");
}

main().catch(console.error);
