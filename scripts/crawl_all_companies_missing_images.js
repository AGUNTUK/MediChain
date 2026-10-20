import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import fs from "fs";
import https from "https";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function fetchUrl(url, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9"
        },
        timeout: timeoutMs
      },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => resolve(d));
      }
    );
    req.on("error", () => resolve(""));
    req.on("timeout", () => {
      req.destroy();
      resolve("");
    });
  });
}

function cleanBrandName(name) {
  if (!name) return "";
  let clean = name.replace(/\([^)]*\)/g, " "); // remove parentheses content
  clean = clean.replace(
    /\b\d+(\.\d+)?\s*(mg|ml|gm|g|mcg|iu|%|vial|ampoule|sachets?|pcs|pot|strip|box|tube|tablet|tablets|capsule|capsules|syrup|suspension|ointment|cream|gel|injection|drop|drops|solution)\b/gi,
    " "
  );
  clean = clean.replace(/[+,/\\:]/g, " ");
  clean = clean.replace(/\s+/g, " ").trim();
  // If too short, use the first word
  const words = clean.split(" ").filter(Boolean);
  if (words.length > 0) {
    return words.slice(0, 2).join(" ");
  }
  return name.split(" ")[0] || name;
}

// In-memory caches to speed up crawling across brand variants
const searchCache = new Map();
const brandPageCache = new Map();

async function getBrandLinks(query) {
  if (!query) return [];
  const qLower = query.toLowerCase().trim();
  if (searchCache.has(qLower)) return searchCache.get(qLower);

  const html = await fetchUrl("https://medex.com.bd/search?search=" + encodeURIComponent(query));
  const links = [...new Set(html.match(/\/brands\/[0-9]+\/[a-z0-9-]+/gi) || [])];
  searchCache.set(qLower, links);
  return links;
}

async function getBrandPageInfo(link) {
  if (brandPageCache.has(link)) return brandPageCache.get(link);

  const html = await fetchUrl("https://medex.com.bd" + link);
  const m =
    html.match(/(?:src|data-src)="([^"]*storage\/images\/packaging\/[^"]*)"/i) ||
    html.match(/(?:src|data-src)="([^"]*storage\/images\/brands\/[^"]*)"/i);

  const companyMatch = html.match(/href="https:\/\/medex\.com\.bd\/companies\/[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
  const company = companyMatch ? companyMatch[1].replace(/<[^>]+>/g, "").trim().toLowerCase() : "";

  const titleMatch = html.match(/<h1[^>]*class="page-heading-1-l"[^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, "").trim().toLowerCase() : "";

  const info = {
    imageUrl: m ? m[1] : null,
    company,
    title
  };

  brandPageCache.set(link, info);
  return info;
}

async function searchBingFallback(product) {
  try {
    const q = `${product.name} ${product.company || ""} medicine Bangladesh`;
    const html = await fetchUrl("https://www.bing.com/images/search?q=" + encodeURIComponent(q));
    const murls = [...html.matchAll(/&quot;murl&quot;:&quot;(http[^&]+)&quot;/g)].map((m) => m[1]);
    const valid = murls.find((url) => {
      const lower = url.toLowerCase();
      return (
        (lower.includes(".jpg") || lower.includes(".png") || lower.includes(".jpeg") || lower.includes(".webp")) &&
        !lower.includes("logo") &&
        !lower.includes("flag") &&
        !lower.includes("icon")
      );
    });
    return valid || null;
  } catch (e) {
    return null;
  }
}

async function findImageForProduct(product) {
  const brandName = cleanBrandName(product.name);
  const companyNorm = (product.company || "").toLowerCase();

  // Try 1: Search MedEx with clean brand name
  let links = await getBrandLinks(brandName);

  // Try 2: If no links, search with first word only
  if (links.length === 0 && brandName.includes(" ")) {
    links = await getBrandLinks(brandName.split(" ")[0]);
  }

  // Iterate over matching brand links
  for (const link of links.slice(0, 5)) {
    const info = await getBrandPageInfo(link);
    if (!info.imageUrl) continue;

    // Check if company matches
    const compMatch =
      companyNorm &&
      (info.company.includes(companyNorm.split(" ")[0]) || companyNorm.includes(info.company.split(" ")[0]));

    if (compMatch) {
      return info.imageUrl;
    }
  }

  // If no company exact match, take first brand link with valid packaging
  for (const link of links.slice(0, 3)) {
    const info = await getBrandPageInfo(link);
    if (info.imageUrl) return info.imageUrl;
  }

  // Try 3: Search with generic name on MedEx if available
  if (product.generic_name) {
    const genLinks = await getBrandLinks(product.generic_name.split("+")[0].split(" ")[0].trim());
    for (const link of genLinks.slice(0, 2)) {
      const info = await getBrandPageInfo(link);
      if (info.imageUrl) return info.imageUrl;
    }
  }

  // Try 4: Fallback to Bing image search
  const bingImg = await searchBingFallback(product);
  if (bingImg) return bingImg;

  return null;
}

async function main() {
  console.log("=== MediChain Master Product Image Crawler Pipeline ===");

  // 1. Fetch all products needing images in chunks of 1000
  console.log("Fetching all products needing images from PostgreSQL...");
  const [r1, r2, r3] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, generic_name, strength, company, image_url")
      .or("image_url.is.null,image_url.eq.,image_url.ilike.%placeholder%")
      .range(0, 999),
    supabase
      .from("products")
      .select("id, name, generic_name, strength, company, image_url")
      .or("image_url.is.null,image_url.eq.,image_url.ilike.%placeholder%")
      .range(1000, 1999),
    supabase
      .from("products")
      .select("id, name, generic_name, strength, company, image_url")
      .or("image_url.is.null,image_url.eq.,image_url.ilike.%placeholder%")
      .range(2000, 2999)
  ]);

  const allMissing = [...(r1.data || []), ...(r2.data || []), ...(r3.data || [])];
  console.log(`Total products needing images: ${allMissing.length}`);

  let successCount = 0;
  let skippedCount = 0;
  let processedCount = 0;

  // Worker pool for high throughput
  const CONCURRENCY = 6;
  const queue = [...allMissing];

  async function worker(workerId) {
    while (queue.length > 0) {
      const product = queue.shift();
      if (!product) break;

      processedCount++;
      const currentIdx = processedCount;

      try {
        const imageUrl = await findImageForProduct(product);

        if (imageUrl) {
          const { error: updErr } = await supabase
            .from("products")
            .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
            .eq("id", product.id);

          if (!updErr) {
            successCount++;
            if (successCount % 25 === 0 || currentIdx === allMissing.length) {
              console.log(
                `[${currentIdx}/${allMissing.length}] [Worker ${workerId}] Updated: ${product.name} (${product.company}) -> Success: ${successCount}`
              );
            }
          } else {
            console.error(`Error updating DB for ${product.id}:`, updErr.message);
            skippedCount++;
          }
        } else {
          skippedCount++;
        }
      } catch (err) {
        console.error(`Worker ${workerId} error on ${product.name}:`, err.message || err);
        skippedCount++;
      }

      // Small throttle between requests per worker
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  console.log(`Starting ${CONCURRENCY} parallel crawler workers...`);
  const startTime = Date.now();
  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)));
  const elapsedMinutes = ((Date.now() - startTime) / 60000).toFixed(1);

  console.log(`\n==================================================`);
  console.log(`           CRAWL COMPLETE in ${elapsedMinutes} mins`);
  console.log(`==================================================`);
  console.log(`Total Processed: ${processedCount}`);
  console.log(`Images Found & Updated: ${successCount}`);
  console.log(`Skipped / Not Found: ${skippedCount}`);

  // Final check of remaining
  const { count: remainingCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .or("image_url.is.null,image_url.eq.,image_url.ilike.%placeholder%");

  console.log(`Remaining products needing images: ${remainingCount}`);
}

main().catch(console.error);
