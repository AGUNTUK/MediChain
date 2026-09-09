import { supabase } from "../lib/supabaseClient";
import { BulkCampaign, BulkCampaignProduct, BulkTier } from "../types";
import { apiCache } from "../lib/apiCache";
import { apiFetch } from "../lib/apiFetch";

export const bulkDealsService = {
  clearCache(): void {
    apiCache.invalidate("bulk_campaigns");
    apiCache.invalidate("live_campaign");
    apiCache.invalidate("active_bulk_tiers_map");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("bulk-campaign-updated"));
    }
  },

  async getCampaigns(): Promise<BulkCampaign[]> {
    return apiCache.swr("bulk_campaigns", async () => {
      try {
        const res = await apiFetch("/api/bulk-deals/campaigns", {
          cache: "no-store"
        });
        if (res.ok) {
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        }
      } catch (err) {
        console.warn("[Bulk Deals] Server fetch failed, attempting Supabase fallback...", err);
      }

      const { data, error } = await supabase
        .from("bulk_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching bulk campaigns:", error);
        return [];
      }
      return data as BulkCampaign[];
    });
  },

  async getLiveCampaign(skipCache = false): Promise<BulkCampaign | null> {
    if (skipCache) {
      apiCache.invalidate("live_campaign");
    }
    return apiCache.swr("live_campaign", async () => {
      try {
        const res = await apiFetch("/api/bulk-deals/live", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" }
        });
        if (res.ok) {
          const data = await res.json();
          return data as BulkCampaign | null;
        }
      } catch (err) {
        console.warn("[Bulk Deals] Live campaign server fetch failed, falling back to Supabase...", err);
      }

      const { data, error } = await supabase
        .from("bulk_campaigns")
        .select("*")
        .eq("status", "Live")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error || !data) {
        if (error) console.error("Error fetching live campaign:", error);
        return null;
      }

      let meta: any = {};
      if (data.subtext) {
        try {
          meta = JSON.parse(data.subtext);
        } catch {
          meta = { description: data.subtext };
        }
      }

      const campaign: BulkCampaign = {
        ...data,
        subtext: meta.description !== undefined ? meta.description : (data.subtext || ""),
        description: meta.description !== undefined ? meta.description : (data.subtext || ""),
        featured_product_id: data.featured_product_id || meta.featured_product_id || null,
        discount_display_percent: data.discount_display_percent !== undefined && data.discount_display_percent !== null
          ? Number(data.discount_display_percent)
          : (meta.discount_display_percent !== undefined ? Number(meta.discount_display_percent) : 25),
        trust_badges: (Array.isArray(data.trust_badges) && data.trust_badges.length > 0)
          ? data.trust_badges
          : (Array.isArray(meta.trust_badges) ? meta.trust_badges : [
              { icon: "shield", label: "Trusted Brands" },
              { icon: "lightning", label: "Bulk Discounts" },
              { icon: "truck", label: "Fast Delivery" }
            ]),
        cta_link: data.cta_link || meta.cta_link || "/products"
      };

      if (campaign.featured_product_id) {
        try {
          const { data: prod } = await supabase
            .from("products")
            .select("id, name, generic_name, company, category_name_fallback, strength, pack_size, mrp, selling_price, image_url, stock_quantity")
            .eq("id", campaign.featured_product_id)
            .maybeSingle();
          if (prod) {
            const mrp = Number(prod.mrp) || 0;
            const sellingPrice = Number(prod.selling_price) || 0;
            const discountPercentage = mrp > 0 ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;
            campaign.featured_product = {
              id: prod.id,
              name: prod.name,
              genericName: prod.generic_name,
              company: prod.company,
              category: prod.category_name_fallback || "Tablet",
              strength: prod.strength,
              packSize: prod.pack_size,
              mrp: mrp,
              sellingPrice: sellingPrice,
              discountPercentage: discountPercentage,
              imageUrl: prod.image_url,
              image_url: prod.image_url,
              availableStock: prod.stock_quantity ?? 0,
              reservedStock: 0,
              soldStock: 0,
              batchNumber: "BN-2026-X",
              expiryDate: "2027-12-31"
            };
          }
        } catch (prodErr) {
          console.warn("[Bulk Deals] Fallback product hydrate warning:", prodErr);
        }
      }

      return campaign;
    }, 10000); // 10s TTL for live campaign
  },

  async getCampaignById(id: string): Promise<BulkCampaign | null> {
    return apiCache.swr(`campaign_${id}`, async () => {
      try {
        const res = await apiFetch(`/api/bulk-deals/campaigns/${encodeURIComponent(id)}`, {
          cache: "no-store"
        });
        if (res.ok) {
          const data = await res.json();
          return data as BulkCampaign | null;
        }
      } catch (err) {
        console.warn("[Bulk Deals] Server fetch by ID failed, falling back to Supabase...", err);
      }

      const { data, error } = await supabase
        .from("bulk_campaigns")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching campaign by id:", error);
        return null;
      }
      return data as BulkCampaign | null;
    });
  },

  async getCampaignProducts(campaignId: string): Promise<BulkCampaignProduct[]> {
    return apiCache.swr(`campaign_products_${campaignId}`, async () => {
      try {
        const res = await apiFetch(`/api/bulk-deals/campaigns/${encodeURIComponent(campaignId)}/products`, {
          cache: "no-store"
        });
        if (res.ok) {
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        }
      } catch (err) {
        console.warn("[Bulk Deals] Campaign products server fetch failed, falling back to Supabase...", err);
      }

      const { data: campaignProducts, error } = await supabase
        .from("bulk_campaign_products")
        .select("*")
        .eq("campaign_id", campaignId);
      
      if (error) {
        console.error("Error fetching campaign products:", error);
        return [];
      }

      if (!campaignProducts || campaignProducts.length === 0) {
        return [];
      }

      const productIds = campaignProducts.map(cp => cp.product_id);
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name, generic_name, company, category_name_fallback, strength, pack_size, mrp, selling_price, image_url, stock_quantity")
        .in("id", productIds);

      if (productsError) {
        console.error("Error fetching products for campaign:", productsError);
        return campaignProducts as BulkCampaignProduct[];
      }

      const productsMap = new Map((products || []).map(p => {
        const mrp = Number(p.mrp) || 0;
        const sellingPrice = Number(p.selling_price) || 0;
        const discountPercentage = mrp > 0 ? Math.round(((mrp - sellingPrice) / mrp) * 100) : 0;
        return [
          p.id, 
          {
            id: p.id,
            name: p.name,
            genericName: p.generic_name,
            company: p.company,
            category: p.category_name_fallback || "Tablet",
            strength: p.strength,
            packSize: p.pack_size,
            mrp: mrp,
            sellingPrice: sellingPrice,
            discountPercentage: discountPercentage,
            imageUrl: p.image_url,
            image_url: p.image_url,
            availableStock: p.stock_quantity ?? 0,
            reservedStock: 0,
            soldStock: 0,
            batchNumber: "BN-2026-X",
            expiryDate: "2027-12-31"
          }
        ];
      }));

      return campaignProducts.map(cp => ({
        ...cp,
        product: productsMap.get(cp.product_id) || null
      })) as BulkCampaignProduct[];
    });
  },

  async createCampaign(campaign: Partial<BulkCampaign>): Promise<BulkCampaign | null> {
    try {
      const res = await apiFetch("/api/bulk-deals/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaign)
      });
      if (res.ok) {
        const data = await res.json();
        this.clearCache();
        return data as BulkCampaign;
      }
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.error || `Server returned ${res.status}`);
    } catch (err: any) {
      console.error("[Bulk Deals] Error creating campaign via API:", err.message);
      throw err;
    }
  },

  async updateCampaign(id: string, updates: Partial<BulkCampaign>): Promise<BulkCampaign | null> {
    try {
      const res = await apiFetch(`/api/bulk-deals/campaigns/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const data = await res.json();
        this.clearCache();
        apiCache.invalidate(`campaign_${id}`);
        return data as BulkCampaign;
      }
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.error || `Server returned ${res.status}`);
    } catch (err: any) {
      console.error("[Bulk Deals] Error updating campaign via API:", err.message);
      throw err;
    }
  },

  async deleteCampaign(id: string): Promise<boolean> {
    try {
      const res = await apiFetch(`/api/bulk-deals/campaigns/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        this.clearCache();
        apiCache.invalidate(`campaign_${id}`);
        apiCache.invalidate(`campaign_products_${id}`);
        return true;
      }
      return false;
    } catch (err) {
      console.error("[Bulk Deals] Error deleting campaign via API:", err);
      return false;
    }
  },

  async setCampaignProducts(campaignId: string, products: { product_id: string, tiers: any[] }[]): Promise<boolean> {
    try {
      const res = await apiFetch(`/api/bulk-deals/campaigns/${encodeURIComponent(campaignId)}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products })
      });
      if (res.ok) {
        apiCache.invalidate(`campaign_products_${campaignId}`);
        return true;
      }
      return false;
    } catch (err) {
      console.error("[Bulk Deals] Error setting campaign products via API:", err);
      return false;
    }
  },

  async getActiveTiersMap(skipCache = false): Promise<Record<string, BulkTier[]>> {
    const cacheKey = "active_bulk_tiers_map";
    if (!skipCache) {
      const cached = apiCache.get<Record<string, BulkTier[]>>(cacheKey);
      if (cached) return cached;
    }
    try {
      const res = await apiFetch("/api/bulk-deals/active-tiers");
      if (res.ok) {
        const data = await res.json();
        const tiersMap = data.tiers || {};
        apiCache.set(cacheKey, tiersMap, 15000);
        return tiersMap;
      }
    } catch (err) {
      console.warn("[Bulk Deals] Failed to fetch active tiers map:", err);
    }
    return {};
  },

  async getProductTiers(productId: string): Promise<BulkTier[] | null> {
    if (!productId) return null;
    const map = await this.getActiveTiersMap();
    const pid = String(productId).trim();
    return map[pid] || map[pid.toLowerCase()] || null;
  }
};
