/**
 * Gemini AI Daily Wholesale Profit Meter & Catalog Intelligence Service
 * 
 * Automatically checks the entire in-stock pharmaceutical catalog every day at 12:00 AM (midnight),
 * discovers the exact lowest and highest wholesale discount percentages across all manufacturers,
 * and uses Gemini AI to synthesize dynamic, high-converting banner messaging for pharmacy owners.
 */

import { GoogleGenAI } from "@google/genai";
import cron from "node-cron";
import { supabaseAdmin } from "./supabaseAdmin.js";

export interface DailyBannerIntelligence {
  headline: string;
  subheadline: string;
  badgeText: string;
  minDiscount: number;
  maxDiscount: number;
  avgDiscount: number;
  totalProductsChecked: number;
  topCompanies: string[];
  lastUpdated: string;
}

// In-memory persistent cache for server lifecycle
let cachedBannerData: DailyBannerIntelligence | null = null;
let isAnalyzing = false;

/**
 * Analyzes the entire database catalog and queries Gemini AI to formulate the daily wholesale banner.
 */
export async function analyzeDailyWholesaleDiscounts(): Promise<DailyBannerIntelligence> {
  if (isAnalyzing && cachedBannerData) {
    return cachedBannerData;
  }

  isAnalyzing = true;
  try {
    console.log("[GeminiBannerService] Checking entire in-stock product catalog from Supabase...");

    // Fetch all active in-stock products
    let allProducts: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabaseAdmin
        .from("products")
        .select("id, name, generic_name, company, mrp, selling_price, stock_quantity, category_name_fallback")
        .gt("stock_quantity", 0)
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error || !data || data.length === 0) {
        hasMore = false;
        break;
      }

      allProducts = allProducts.concat(data);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    }

    if (allProducts.length === 0) {
      console.warn("[GeminiBannerService] No in-stock products found, using fallback baseline.");
      return getFallbackBannerData();
    }

    // Extract valid wholesale discounts
    const discountList: { name: string; company: string; discountPct: number }[] = [];

    for (const p of allProducts) {
      const mrp = parseFloat(p.mrp || 0);
      const selling = parseFloat(p.selling_price || mrp);
      if (mrp > 0 && selling > 0 && mrp >= selling) {
        const discountPct = Math.round(((mrp - selling) / mrp) * 100);
        if (discountPct > 0 && discountPct <= 100) {
          discountList.push({
            name: p.name,
            company: p.company || "Unknown",
            discountPct
          });
        }
      }
    }

    if (discountList.length === 0) {
      return getFallbackBannerData();
    }

    const allDiscounts = discountList.map(d => d.discountPct);
    const minDiscount = Math.min(...allDiscounts);
    const maxDiscount = Math.max(...allDiscounts);
    const avgDiscount = Math.round(allDiscounts.reduce((a, b) => a + b, 0) / allDiscounts.length);

    // Top companies by best margins
    const companyMarg: Record<string, number[]> = {};
    discountList.forEach(d => {
      if (!companyMarg[d.company]) companyMarg[d.company] = [];
      companyMarg[d.company].push(d.discountPct);
    });

    const topCompanies = Object.entries(companyMarg)
      .map(([company, dArr]) => ({
        company,
        avg: Math.round(dArr.reduce((a, b) => a + b, 0) / dArr.length)
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 4)
      .map(c => c.company);

    console.log(`[GeminiBannerService] Discovered Discount Range: ${minDiscount}% to ${maxDiscount}% (Avg: ${avgDiscount}%) across ${allProducts.length} items.`);

    // Consult Gemini AI for professional copywriting
    const apiKey = process.env.GEMINI_API_KEY;
    let headline = `আজকের পাইকারি অর্ডারে ${toBengaliNumber(minDiscount)}% – ${toBengaliNumber(maxDiscount)}% পর্যন্ত সর্বোচ্চ লাভ!`;
    let subheadline = "মেডিচেইন থেকে সরাসরি ক্রয়ে কোনো মধ্যস্বত্বভোগী নেই, তাই ফার্মেসির মুনাফা থাকে সর্বোচ্চ।";
    let badgeText = "AI দৈনিক মুনাফা মিটার";

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `You are the lead marketing and pricing AI for MediChain, a B2B wholesale pharmaceutical operating platform in Bangladesh.
Daily Catalog Analysis:
- Total In-Stock Medicines Analyzed: ${allProducts.length}
- Lowest Wholesale Discount: ${minDiscount}%
- Highest Wholesale Discount: ${maxDiscount}%
- Average Wholesale Discount: ${avgDiscount}%
- Top Manufacturers by Margin: ${topCompanies.join(", ")}

Generate the daily wholesale profit meter banner.
Output MUST be a raw JSON object with keys:
- "headline": Eye-catching Bengali headline highlighting the exact ${minDiscount}% to ${maxDiscount}% range (e.g. 'আজকের পাইকারি অর্ডারে ${toBengaliNumber(minDiscount)}% – ${toBengaliNumber(maxDiscount)}% পর্যন্ত সর্বোচ্চ লাভ!')
- "subheadline": Bengali description emphasizing direct manufacturer rate with no middlemen for pharmacies
- "badgeText": Short Bengali badge text (e.g. 'দৈনিক পাইকারি মুনাফা মিটার' or 'AI ভেরিফাইড পাইকারি রেট')

Return ONLY the raw JSON object without markdown formatting.`;

        const modelsToTry = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
        for (const model of modelsToTry) {
          try {
            const res = await ai.models.generateContent({
              model,
              contents: prompt
            });
            if (res.text) {
              const clean = res.text.replace(/```json/gi, "").replace(/```/g, "").trim();
              const parsed = JSON.parse(clean);
              if (parsed.headline) headline = parsed.headline;
              if (parsed.subheadline) subheadline = parsed.subheadline;
              if (parsed.badgeText) badgeText = parsed.badgeText;
              console.log("[GeminiBannerService] Successfully synthesized daily banner via Gemini AI:", parsed);
              break;
            }
          } catch (modelErr: any) {
            console.warn(`[GeminiBannerService] Model ${model} failed, trying fallback:`, modelErr?.message);
          }
        }
      } catch (aiErr) {
        console.warn("[GeminiBannerService] Gemini AI generation error, using calculated baseline:", aiErr);
      }
    }

    const result: DailyBannerIntelligence = {
      headline,
      subheadline,
      badgeText,
      minDiscount,
      maxDiscount,
      avgDiscount,
      totalProductsChecked: allProducts.length,
      topCompanies,
      lastUpdated: new Date().toISOString()
    };

    cachedBannerData = result;
    return result;
  } catch (err) {
    console.error("[GeminiBannerService] Failed to analyze daily discounts:", err);
    return cachedBannerData || getFallbackBannerData();
  } finally {
    isAnalyzing = false;
  }
}

/**
 * Returns the current cached banner analysis or generates on-the-fly if empty.
 */
export async function getDailyBannerData(): Promise<DailyBannerIntelligence> {
  if (cachedBannerData) {
    return cachedBannerData;
  }
  return await analyzeDailyWholesaleDiscounts();
}

/**
 * Initializes the daily 12:00 AM midnight cron schedule and performs immediate startup analysis.
 */
export function initDailyBannerScheduler() {
  // 1. Run immediately right now on server boot / initialization
  console.log("[GeminiBannerService] Initializing Gemini daily banner scheduler and running initial analysis...");
  analyzeDailyWholesaleDiscounts().catch(err => {
    console.error("[GeminiBannerService] Initial startup analysis error:", err);
  });

  // 2. Schedule to run every day at 12:00 AM (00:00 midnight) Asia/Dhaka time
  cron.schedule("0 0 * * *", async () => {
    console.log("[GeminiBannerService] ⏰ 12:00 AM Midnight Trigger: Running daily Gemini catalog discount analysis...");
    try {
      await analyzeDailyWholesaleDiscounts();
      console.log("[GeminiBannerService] ✅ Daily midnight catalog discount analysis completed successfully.");
    } catch (err) {
      console.error("[GeminiBannerService] ❌ Daily midnight analysis error:", err);
    }
  }, {
    timezone: "Asia/Dhaka"
  });

  console.log("[GeminiBannerService] Scheduled daily catalog discount check for 12:00 AM (Asia/Dhaka).");
}

function getFallbackBannerData(): DailyBannerIntelligence {
  return {
    headline: "আজকের পাইকারি অর্ডারে ৪% – ৯৪% পর্যন্ত সর্বোচ্চ লাভ!",
    subheadline: "মেডিচেইন ডিপো থেকে সরাসরি ক্রয়ে কোনো মধ্যস্বত্বভোগী নেই, তাই ফার্মেসির মুনাফা থাকে সর্বোচ্চ।",
    badgeText: "দৈনিক পাইকারি মুনাফা মিটার",
    minDiscount: 4,
    maxDiscount: 94,
    avgDiscount: 26,
    totalProductsChecked: 2202,
    topCompanies: ["Pristine", "Central", "Botanic", "Square"],
    lastUpdated: new Date().toISOString()
  };
}

function toBengaliNumber(num: number | string): string {
  const bengaliDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return num.toString().replace(/\d/g, (d) => bengaliDigits[parseInt(d, 10)]);
}
