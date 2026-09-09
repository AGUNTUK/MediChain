import { supabase } from "../lib/supabaseClient";
import { BulkCampaign, BulkCampaignProduct } from "../types";
import { apiCache } from "../lib/apiCache";
import { apiFetch } from "../lib/apiFetch";

export const bulkDealsService = {
  clearCache(): void {
    apiCache.invalidate("bulk_campaigns");
    apiCache.invalidate("live_campaign");
  },

  async getCampaigns(): Promise<BulkCampaign[]> {
    return apiCache.swr("bulk_campaigns", async () => {
      try {
        const res = await apiFetch("/api/bulk-deals/campaigns");
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

  async getLiveCampaign(): Promise<BulkCampaign | null> {
    return apiCache.swr("live_campaign", async () => {
      try {
        const res = await apiFetch("/api/bulk-deals/live");
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
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching live campaign:", error);
        return null;
      }
      return data as BulkCampaign | null;
    });
  },

  async getCampaignById(id: string): Promise<BulkCampaign | null> {
    return apiCache.swr(`campaign_${id}`, async () => {
      try {
        const res = await apiFetch(`/api/bulk-deals/campaigns/${encodeURIComponent(id)}`);
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
        const res = await apiFetch(`/api/bulk-deals/campaigns/${encodeURIComponent(campaignId)}/products`);
        if (res.ok) {
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        }
      } catch (err) {
        console.warn("[Bulk Deals] Campaign products server fetch failed, falling back to Supabase...", err);
      }

      const { data, error } = await supabase
        .from("bulk_campaign_products")
        .select("*, product:products(*)")
        .eq("campaign_id", campaignId);
      
      if (error) {
        console.error("Error fetching campaign products:", error);
        return [];
      }
      return data as BulkCampaignProduct[];
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
  }
};
