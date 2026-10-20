import { GoogleGenAI, Type } from "@google/genai";
import { getDeliveryWindow } from "./deliverySchedule.js";
import * as dbService from "./dbService.js";

export interface CopilotMessage {
  role: "user" | "model" | "assistant";
  text: string;
}

export interface CopilotProductSummary {
  id: string;
  name: string;
  genericName: string;
  company: string;
  strength?: string;
  packSize?: string;
  category?: string;
  sellingPrice: number;
  mrp: number;
  availableStock: number;
  discountPercentage?: number;
  imageUrl?: string;
}

export interface CopilotResponsePayload {
  reply: string;
  recommendedProducts: CopilotProductSummary[];
  cartUpdated?: boolean;
  cartCount?: number;
  deliveryInfo?: any;
}

function getGeminiApiKey(): string {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    ""
  ).trim();
}

/**
 * Normalizes text for clean pharmaceutical matching
 */
function normalizeQuery(text: string): string {
  return (text || "").toLowerCase().trim();
}

/**
 * Searches the in-memory master products list
 */
export function executeProductSearch(
  masterProducts: any[],
  query: string,
  category?: string,
  inStockOnly: boolean = false,
  limit: number = 8
): CopilotProductSummary[] {
  const normQ = normalizeQuery(query);
  const normCat = normalizeQuery(category || "");

  let results = masterProducts.filter((p) => {
    if (inStockOnly && (p.availableStock ?? 0) <= 0) return false;
    if (normCat && normCat !== "all") {
      const pCat = normalizeQuery(p.category || "");
      if (!pCat.includes(normCat) && !normCat.includes(pCat)) return false;
    }
    if (!normQ) return true;

    const name = normalizeQuery(p.name);
    const generic = normalizeQuery(p.genericName);
    const company = normalizeQuery(p.company);
    const strength = normalizeQuery(p.strength);

    return (
      name.includes(normQ) ||
      generic.includes(normQ) ||
      company.includes(normQ) ||
      strength.includes(normQ)
    );
  });

  // Sort: In-stock first, then highest margin
  results.sort((a, b) => {
    const aStock = (a.availableStock ?? 0) > 0 ? 1 : 0;
    const bStock = (b.availableStock ?? 0) > 0 ? 1 : 0;
    if (aStock !== bStock) return bStock - aStock;
    const aMargin = a.profitMarginPercent ?? 0;
    const bMargin = b.profitMarginPercent ?? 0;
    return bMargin - aMargin;
  });

  return results.slice(0, limit).map((p) => ({
    id: p.id,
    name: p.name,
    genericName: p.genericName,
    company: p.company,
    strength: p.strength,
    packSize: p.packSize,
    category: p.category,
    sellingPrice: p.sellingPrice,
    mrp: p.mrp,
    availableStock: p.availableStock,
    discountPercentage: (p.mrp > p.sellingPrice && p.mrp > 0) ? Math.round(((p.mrp - p.sellingPrice) / p.mrp) * 100) : 0,
    imageUrl: p.imageUrl || p.image_url
  }));
}

export const BENGALI_PHARMA_DICT: Record<string, string> = {
  "সেকলো": "seclo",
  "সেক্লো": "seclo",
  "নাপা": "napa",
  "অমিকন": "omecon",
  "ওমিকন": "omecon",
  "ম্যাক্সপ্রো": "maxpro",
  "সার্জেল": "sergel",
  "প্যারাসিটামল": "paracetamol",
  "অমিপ্রাজল": "omeprazole",
  "ওমিপ্রাজল": "omeprazole",
  "এসোমিপ্রাজল": "esomeprazole",
  "প্যানটোনিক্স": "pantonix",
  "প্যানটোপ্রাজল": "pantoprazole",
  "ফিনিক্স": "finix",
  "র্যাবেপ্রাজল": "rabeprazole",
  "রোসুভা": "rosuva",
  "অ্যালার্ট্রল": "alertrol",
  "মোন্টিন": "montin",
  "মন্টেলুকাস্ট": "montelukast",
  "অ্যাজিথ্রোমাইসিন": "azithromycin",
  "সেফিক্সিম": "cefixime",
  "সিপ্রো": "cipro",
  "ফ্লুগাল": "flugal",
  "এসিলক": "aciloc",
  "ক্যালবো": "calbo"
};

export function extractMedicineQuery(text: string): string {
  const lower = (text || "").toLowerCase();
  for (const [bn, en] of Object.entries(BENGALI_PHARMA_DICT)) {
    if (lower.includes(bn)) {
      return en;
    }
  }
  return lower
    .replace(/বিকল্প|alternative|substitute|বদলে|বদলি|না থাকলে|ওষুধ|কোন|কোনো|ভালো|আছে|কী|কি|স্টকে|না|এর|দিন|কার্টে|দাও|চাই/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Finds bio-equivalent generic substitutes for a medicine
 */
export function executeGenericSubstitution(
  masterProducts: any[],
  medicineName: string,
  limit: number = 6
): { original: any | null; substitutes: CopilotProductSummary[] } {
  const extracted = extractMedicineQuery(medicineName) || medicineName;
  const norm = normalizeQuery(extracted);

  // 1. Identify target medicine or generic
  const target = masterProducts.find((p) => {
    const name = normalizeQuery(p.name);
    return name.includes(norm) || norm.includes(name);
  });

  const genericTarget = target ? normalizeQuery(target.genericName) : norm;

  // 2. Find medicines with the same generic
  let substitutes = masterProducts.filter((p) => {
    const pGeneric = normalizeQuery(p.genericName);
    if (!pGeneric || pGeneric === "generic medicine") return false;
    return pGeneric.includes(genericTarget) || genericTarget.includes(pGeneric);
  });

  // If original was found, exclude it from substitutes
  if (target) {
    substitutes = substitutes.filter((p) => p.id !== target.id);
  }

  // Fallback: If no generic match, search by name query
  if (substitutes.length === 0) {
    substitutes = masterProducts.filter((p) => {
      const name = normalizeQuery(p.name);
      return name.includes(norm) && (!target || p.id !== target.id);
    });
  }

  // Prioritize in-stock, then best profit margin %
  substitutes.sort((a, b) => {
    const aStock = (a.availableStock ?? 0) > 0 ? 1 : 0;
    const bStock = (b.availableStock ?? 0) > 0 ? 1 : 0;
    if (aStock !== bStock) return bStock - aStock;
    const aMargin = a.profitMarginPercent ?? 0;
    const bMargin = b.profitMarginPercent ?? 0;
    return bMargin - aMargin;
  });

  return {
    original: target || null,
    substitutes: substitutes.slice(0, limit).map((p) => ({
      id: p.id,
      name: p.name,
      genericName: p.genericName,
      company: p.company,
      strength: p.strength,
      packSize: p.packSize,
      category: p.category,
      sellingPrice: p.sellingPrice,
      mrp: p.mrp,
      availableStock: p.availableStock,
      discountPercentage: (p.mrp > p.sellingPrice && p.mrp > 0) ? Math.round(((p.mrp - p.sellingPrice) / p.mrp) * 100) : 0,
      imageUrl: p.imageUrl || p.image_url
    }))
  };
}

/**
 * Core Copilot Processor
 */
export async function processPharmacyCopilot({
  userId,
  userPharmacyName,
  messages,
  masterProducts
}: {
  userId: string;
  userPharmacyName: string;
  messages: CopilotMessage[];
  masterProducts: any[];
}): Promise<CopilotResponsePayload> {
  const apiKey = getGeminiApiKey();
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.text || "";

  // Structure accumulator for cards to send back to client
  const collectedProducts: CopilotProductSummary[] = [];
  let cartUpdated = false;
  let cartCount = 0;
  let deliveryInfo: any = null;

  // Tool functions implementation
  const toolHandlers: Record<string, (args: any) => Promise<any> | any> = {
    searchMedicines: ({ query, category, inStockOnly, limit }: any) => {
      const results = executeProductSearch(masterProducts, query, category, inStockOnly, limit || 6);
      results.forEach((p) => {
        if (!collectedProducts.some((cp) => cp.id === p.id)) {
          collectedProducts.push(p);
        }
      });
      return {
        count: results.length,
        medicines: results.map((r) => ({
          id: r.id,
          name: r.name,
          generic: r.genericName,
          company: r.company,
          tradePrice: `৳${r.sellingPrice}`,
          mrp: `৳${r.mrp}`,
          discount: r.discountPercentage ? `${r.discountPercentage}% off MRP` : "Standard Trade Price",
          availableStock: r.availableStock > 0 ? `${r.availableStock} units in stock` : "Out of stock"
        }))
      };
    },

    findGenericSubstitutes: ({ medicineName }: any) => {
      const { original, substitutes } = executeGenericSubstitution(masterProducts, medicineName);
      substitutes.forEach((p) => {
        if (!collectedProducts.some((cp) => cp.id === p.id)) {
          collectedProducts.push(p);
        }
      });
      return {
        requestedMedicine: original ? original.name : medicineName,
        genericMolecule: original ? original.genericName : "Identified Generic",
        substitutesFound: substitutes.length,
        recommendations: substitutes.map((s) => ({
          id: s.id,
          name: s.name,
          company: s.company,
          tradePrice: `৳${s.sellingPrice}`,
          mrp: `৳${s.mrp}`,
          discount: s.discountPercentage ? `${s.discountPercentage}% off MRP` : "Standard Trade Price",
          stockStatus: s.availableStock > 0 ? `In Stock (${s.availableStock} available)` : "Out of Stock"
        }))
      };
    },

    getDeliverySchedule: () => {
      const windowInfo = getDeliveryWindow(new Date());
      deliveryInfo = windowInfo;
      return {
        deliveryScheduleLabel: windowInfo.deliveryScheduleLabel,
        deliveryDate: windowInfo.deliveryDate,
        cutoffTime: windowInfo.cutoffTimeLabel,
        cutoffStatus: windowInfo.isBeforeCutoff
          ? "Currently before 12:00 PM cutoff - orders placed now qualify for upcoming schedule"
          : "After 12:00 PM cutoff - orders placed now assign to next cycle",
        deliveryFeeRule: "Flat ৳40 delivery charge. Multiple orders placed for the same delivery date are consolidated into ONE invoice with single ৳40 fee."
      };
    },

    addItemsToCart: async ({ items }: any) => {
      if (!Array.isArray(items) || items.length === 0) {
        return { success: false, message: "No items provided to add" };
      }

      try {
        const currentCart = await dbService.getCart(userId);
        let itemsAdded = 0;

        for (const it of items) {
          const rawId = String(it.productId || "").trim();
          const targetQty = Math.max(1, parseInt(it.quantity, 10) || 1);

          // Find product in catalog
          let prod = masterProducts.find((p) => p.id === rawId);
          if (!prod && it.productName) {
            const normPName = normalizeQuery(it.productName);
            prod = masterProducts.find((p) => normalizeQuery(p.name).includes(normPName));
          }

          if (prod) {
            const pId = prod.id;
            const existingIdx = currentCart.findIndex(
              (c: any) => String(c.productId || "").toLowerCase() === pId.toLowerCase()
            );

            if (existingIdx >= 0) {
              currentCart[existingIdx].quantity = (currentCart[existingIdx].quantity || 0) + targetQty;
            } else {
              currentCart.push({ productId: pId, quantity: targetQty });
            }
            itemsAdded++;

            if (!collectedProducts.some((cp) => cp.id === prod.id)) {
              collectedProducts.push({
                id: prod.id,
                name: prod.name,
                genericName: prod.genericName,
                company: prod.company,
                strength: prod.strength,
                packSize: prod.packSize,
                category: prod.category,
                sellingPrice: prod.sellingPrice,
                mrp: prod.mrp,
                availableStock: prod.availableStock,
                discountPercentage: (prod.mrp > prod.sellingPrice && prod.mrp > 0) ? Math.round(((prod.mrp - prod.sellingPrice) / prod.mrp) * 100) : 0,
                imageUrl: prod.imageUrl || prod.image_url
              });
            }
          }
        }

        if (itemsAdded > 0) {
          await dbService.saveCart(userId, currentCart);
          cartUpdated = true;
          cartCount = currentCart.reduce((sum: number, c: any) => sum + (c.quantity || 1), 0);
          return {
            success: true,
            itemsAdded,
            totalCartItems: cartCount,
            message: `Successfully added ${itemsAdded} medicine(s) to the cart.`
          };
        } else {
          return { success: false, message: "Could not match specified medicines to catalog." };
        }
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  };

  // If Gemini API Key is available, run the full generative function-calling flow
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });

      // Declarations using Type enum from @google/genai
      const tools = [
        {
          functionDeclarations: [
            {
              name: "searchMedicines",
              description: "Searches the MediChain wholesale pharmaceutical catalog by medicine name, generic molecule, category, or manufacturer.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  query: { type: Type.STRING, description: "Brand name, generic molecule, or health condition" },
                  category: { type: Type.STRING, description: "Optional dosage category e.g. Tablet, Capsule, Syrup, Ophthalmic, Injection" },
                  inStockOnly: { type: Type.BOOLEAN, description: "Filter for products with availableStock > 0" },
                  limit: { type: Type.INTEGER, description: "Max items to return (default 6)" }
                },
                required: ["query"]
              }
            },
            {
              name: "findGenericSubstitutes",
              description: "Finds bio-equivalent generic alternative medicines for a brand that is out of stock, comparing trade prices, stock availability, and retail pharmacy profit margins.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  medicineName: { type: Type.STRING, description: "The brand name or generic to find therapeutic alternatives for" }
                },
                required: ["medicineName"]
              }
            },
            {
              name: "getDeliverySchedule",
              description: "Retrieves current delivery schedule for Dhaka (Mon/Wed/Sat), cutoff status (12:00 PM BST cutoff), and single ৳40 combined invoice rules.",
              parameters: {
                type: Type.OBJECT,
                properties: {}
              }
            },
            {
              name: "addItemsToCart",
              description: "Adds medicines and quantities directly to the pharmacy's active shopping cart.",
              parameters: {
                type: Type.OBJECT,
                properties: {
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        productId: { type: Type.STRING, description: "Product ID if known from search" },
                        productName: { type: Type.STRING, description: "Medicine brand name" },
                        quantity: { type: Type.INTEGER, description: "Number of boxes or packs to add" }
                      },
                      required: ["quantity"]
                    },
                    description: "List of items and quantities to add"
                  }
                },
                required: ["items"]
              }
            }
          ]
        }
      ];

      const systemInstruction = `You are "MediChain Procurement Copilot" (মেডিচেইন ফার্মেসি প্রকিউরমেন্ট সহকারী), the dedicated AI assistant for retail pharmacies and licensed pharmacists in Bangladesh using the MediChain B2B platform.
Current Pharmacy: ${userPharmacyName || "Verified Retail Pharmacy"}.
Official Business Context:
- Platform: MediChain Bangladesh (Wholesale B2B Pharmacy Network).
- Currency: Bangladeshi Taka (৳, BDT).
- Delivery Schedule: Deliveries on Monday, Wednesday, and Saturday. Cut-off time is strictly 12:00 PM (noon) BST (Asia/Dhaka time).
- Delivery Charge: Flat ৳40 per combined invoice. Multiple orders placed by the same pharmacy for the same delivery schedule date are automatically combined into ONE invoice with a single ৳40 fee.
- Stock & Pricing: Trade prices (wholesaler selling rate), MRP (Maximum Retail Price), and pharmacy profit margin percentage.
- Role: Always be respectful, highly accurate, and helpful. Answer in polite Bengali (বাংলা) by default if the user addresses you in Bengali or Banglish, or English if asked in English.
- Pharmacological Safety: Clearly mention dosage strengths (e.g. 20mg, 500mg) and generic molecules. Recommend bio-equivalent alternatives when a requested item is low or out of stock.
- Actions: When a user wants to order or add items to cart, invoke addItemsToCart. When they ask for alternatives, invoke findGenericSubstitutes.`;

      // Build message contents for Gemini
      const contents: any[] = [];
      for (const m of messages) {
        contents.push({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.text }]
        });
      }

function withTimeout<T>(promise: Promise<T>, ms: number = 6000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`AI generation timed out after ${ms}ms`)), ms)
    )
  ]);
}

      // Initial call to Gemini with timeout
      let response = await withTimeout(
        ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents,
          config: {
            systemInstruction,
            temperature: 0.2,
            tools
          }
        }),
        6000
      );

      // Handle function calls loop (up to 3 tool calls)
      let iterations = 0;
      while (response.functionCalls && response.functionCalls.length > 0 && iterations < 3) {
        iterations++;
        const functionCall = response.functionCalls[0];
        const handler = toolHandlers[functionCall.name];

        let toolResult = { message: "Tool executed" };
        if (handler) {
          toolResult = await handler(functionCall.args || {});
        }

        // Add model's tool call and user tool response to history
        const modelContent = response.candidates?.[0]?.content;
        contents.push(modelContent);
        contents.push({
          role: "user",
          parts: [
            {
              functionResponse: {
                name: functionCall.name,
                response: toolResult
              }
            }
          ]
        });

        // Follow-up generation with timeout
        response = await withTimeout(
          ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents,
            config: {
              systemInstruction,
              temperature: 0.2,
              tools
            }
          }),
          6000
        );
      }

      const replyText = response.text || "মেডিচেইন প্রকিউরমেন্ট সহকারী আপনার সহায়তায় প্রস্তুত।";

      return {
        reply: replyText,
        recommendedProducts: collectedProducts,
        cartUpdated,
        cartCount,
        deliveryInfo
      };
    } catch (err: any) {
      console.warn("[GeminiCopilotService] Gemini execution notice, engaging intelligent fallback:", err?.message || err);
    }
  }

  // --- RESILIENT RULE-BASED / DETERMINISTIC FALLBACK ENGINE ---
  // If API key is missing or network failed, this guarantees the user always gets a rich, helpful response
  const lowerMsg = normalizeQuery(lastUserMessage);

  // Intent 1: Delivery Schedule & Cutoff
  if (
    lowerMsg.includes("delivery") ||
    lowerMsg.includes("ডেলিভারি") ||
    lowerMsg.includes("কখন") ||
    lowerMsg.includes("cutoff") ||
    lowerMsg.includes("সময়") ||
    lowerMsg.includes("চার্জ")
  ) {
    const windowInfo = getDeliveryWindow(new Date());
    const deliveryReply = windowInfo.isBeforeCutoff
      ? `🚚 **ডেলিভারি সিডিউল তথ্য:**\n\nআপনি এখন অর্ডার কনফার্ম করলে তা **${windowInfo.deliveryScheduleLabel}**-এ ডেলিভারি হবে।\n\n- **কাট-অফ সময়:** প্রতিদিন দুপুর ১২:০০ BST (Asia/Dhaka)।\n- **ডেলিভারি ফি:** মাত্র ৳৪০ (একই দিনে একাধিক অর্ডার করলেও একটি কনসোলিডেটেড ইনভয়েসে মাত্র ৳৪০ ডেলিভারি চার্জ প্রযোজ্য)।`
      : `🚚 **ডেলিভারি সিডিউল তথ্য:**\n\nদুপুর ১২:০০ টার কাট-অফ অতিক্রান্ত হওয়ায় আপনার অর্ডারটি **${windowInfo.deliveryScheduleLabel}**-এ ডেলিভারির জন্য তালিকাভুক্ত হবে।\n\n- **ডেলিভারি ফি:** ফ্ল্যাট ৳৪০ কনসোলিডেটেড চার্জ।`;

    return {
      reply: deliveryReply,
      recommendedProducts: [],
      deliveryInfo: windowInfo
    };
  }

  // Intent 2: Generic Substitution / Alternatives
  if (
    lowerMsg.includes("বিকল্প") ||
    lowerMsg.includes("alternative") ||
    lowerMsg.includes("substitute") ||
    lowerMsg.includes("বদলে") ||
    lowerMsg.includes("বদলি") ||
    lowerMsg.includes("না থাকলে")
  ) {
    const { original, substitutes } = executeGenericSubstitution(masterProducts, lowerMsg);

    let subReply = `💡 **থেরাপিউটিক বিকল্প ও জেনেরিক প্রস্তাবনা:**\n\n`;
    if (original) {
      subReply += `**অনুরোধকৃত ওষুধ:** ${original.name} (${original.genericName || "Generic"})\n`;
      if ((original.availableStock ?? 0) <= 0) {
        subReply += `⚠️ *বর্তমানে এই ব্র্যান্ডটি স্টকে নেই।*\n\n`;
      }
    }
    subReply += `নিচে একই জেনেরিক উপাদানের সেরা ইন-স্টক ওষুধ ও ফার্মেসি প্রফিট মার্জিনের তালিকা দেওয়া হলো:`;

    return {
      reply: subReply,
      recommendedProducts: substitutes
    };
  }

  // Intent 3: High Margin / Best Deals
  if (
    lowerMsg.includes("লাভ") ||
    lowerMsg.includes("মার্জিন") ||
    lowerMsg.includes("margin") ||
    lowerMsg.includes("profit") ||
    lowerMsg.includes("গ্যাস্ট্রিক") ||
    lowerMsg.includes("antibiotic") ||
    lowerMsg.includes("অ্যান্টিবায়োটিক")
  ) {
    const marginProducts = executeProductSearch(masterProducts, lowerMsg.includes("গ্যাস্ট্রিক") ? "omeprazole" : "", undefined, true, 5);
    return {
      reply: `💰 **সর্বোচ্চ প্রফিট মার্জিনযুক্ত ইন-স্টক পাইকারি ওষুধ:**\n\nরিটেইল ফার্মেসির জন্য নিচে সেরা ট্রেড রেট ও আকর্ষণীয় মার্জিনের কিছু ওষুধ দেওয়া হলো। আপনি সরাসরি কার্টে যোগ করতে পারেন:`,
      recommendedProducts: marginProducts
    };
  }

  // Intent 4: General Medicine Search / Catalog Matching
  const searchResults = executeProductSearch(masterProducts, lowerMsg, undefined, false, 5);
  if (searchResults.length > 0) {
    return {
      reply: `🔍 **ক্যাটালগ সার্চ ফলাফল:**\n\nআপনার অনুসন্ধানের ভিত্তিতে নিচে পাওয়া ওষুধগুলোর ট্রেড প্রাইস ও স্টক বিবরণী দেওয়া হলো:`,
      recommendedProducts: searchResults
    };
  }

  // Default Guidance
  return {
    reply: `👋 নমস্কার! আমি **মেডিচেইন প্রকিউরমেন্ট সহকারী**।\n\nআমি আপনাকে কীভাবে সাহায্য করতে পারি?\n- 💊 কোনো ওষুধ স্টকে না থাকলে সমমানের জেনেরিক বিকল্প খোঁজা\n- 💰 সর্বোচ্চ প্রফিট মার্জিনযুক্ত ওষুধ অনুসন্ধান\n- 🚚 পরবর্তী ডেলিভারি সময় ও কাট-অফ যাচাই\n- 🛒 ওষুধ সরাসরি কার্টে যোগ করা`,
    recommendedProducts: []
  };
}
