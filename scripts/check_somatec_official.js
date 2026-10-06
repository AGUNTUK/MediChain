import https from "https";

function fetchUrl(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" }, timeout: 10000 }, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => resolve(d));
    }).on("error", (e) => resolve(""));
  });
}

async function run() {
  const sampleLinks = [
    "https://www.somatecpharmabd.com/products/details/18",
    "https://www.somatecpharmabd.com/products/details/38",
    "https://www.somatecpharmabd.com/products/details/48",
    "https://www.somatecpharmabd.com/products/details/21",
    "https://www.somatecpharmabd.com/products/details/54",
    "https://www.somatecpharmabd.com/products/details/75"
  ];

  for (const url of sampleLinks) {
    const html = await fetchUrl(url);
    const m = html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i) || html.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    const title = m ? m[1].replace(/<[^>]+>/g, "").trim() : "Unknown";
    const galleryImgs = [...new Set([...html.matchAll(/(https:\/\/www\.somatecpharmabd\.com\/uploads\/product\/gallery\/[^"'\s]+)/gi)].map((x) => x[1]))];
    console.log(`URL: ${url} -> Title: "${title}"`);
    console.log(`  Gallery:`, galleryImgs);
  }
}
run();
