/**
 * MediChain SmartOrder - Client API Service
 * 
 * Provides typed methods for image scanning, product matching,
 * live replacement search, and atomic batch carting.
 */

import { MatchedSmartOrderItem } from "../lib/productMatcher";
import { Product } from "../types";

export interface SmartOrderScanResponse {
  success: boolean;
  modelUsed: string;
  items: MatchedSmartOrderItem[];
  rawNotes?: string;
  error?: string;
}

export interface BatchCartItemPayload {
  productId: string;
  quantity: number;
}

export interface BatchCartResponse {
  success: boolean;
  addedCount: number;
  cart: {
    items: any[];
    totalAmount: number;
    totalSavings: number;
    totalMrp: number;
  };
  errors?: string[];
}

export const smartOrderService = {
  /**
   * Submits a prescription / handwritten slip image for Gemini 3.x Flash OCR & Database Matching.
   */
  async scanSmartOrder(imageBase64: string, mimeType = "image/jpeg"): Promise<SmartOrderScanResponse> {
    const res = await fetch("/api/smart-order/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, mimeType }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "প্রেসক্রিপশন স্ক্যান করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    }

    return res.json();
  },

  /**
   * Adds all verified and confirmed SmartOrder items to the active procurement cart in one atomic request.
   */
  async batchAddToCart(items: BatchCartItemPayload[]): Promise<BatchCartResponse> {
    const res = await fetch("/api/smart-order/cart-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "কার্টে ওষুধগুলো যোগ করতে সমস্যা হয়েছে।");
    }

    return res.json();
  },

  /**
   * Searches live catalog for medicine replacement / manual swapping.
   */
  async searchReplacementProducts(query: string): Promise<Product[]> {
    if (!query || query.trim().length < 2) return [];
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(query.trim())}&limit=8`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data.products || []);
    } catch (err) {
      console.warn("Error searching replacement products:", err);
      return [];
    }
  }
};
