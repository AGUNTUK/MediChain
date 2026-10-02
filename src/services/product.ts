import { Product } from "../types";
import { apiCache } from "../lib/apiCache";
import { apiFetch } from "../lib/apiFetch";

/**
 * MediChain Product Catalog Service
 * 
 * Handles search, filters, category routing, and favorites/bookmark operations.
 */
export const productService = {
  /**
   * Clears the client-side catalog cache. Call after create/edit/delete operations.
   */
  clearCache(): void {
    apiCache.clear();
  },

  /**
   * Fetches the B2B wholesale product catalog with optional query, category, or deals filter parameters.
   */
  async getProducts(params?: { search?: string; category?: string; filter?: "deals" | "frequent" | "low_stock"; page?: number; limit?: number }): Promise<Product[]> {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    if (params?.category) q.append("category", params.category);
    if (params?.filter) q.append("filter", params.filter);
    
    // Always enforce pagination limits to prevent payload overflow
    q.append("page", (params?.page || 1).toString());
    q.append("limit", (params?.limit || 50).toString());

    const queryStr = q.toString() ? `?${q.toString()}` : "";
    const cacheKey = `products_${queryStr}`;

    return apiCache.swr(cacheKey, async () => {
      const res = await apiFetch(`/api/products${queryStr}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data.products || []);
    });
  },

  /**
   * Fetches a single product by its unique ID.
   */
  async getProductById(id: string): Promise<Product | null> {
    return apiCache.swr(`product_${id}`, async () => {
      try {
        const res = await apiFetch(`/api/products/${encodeURIComponent(id)}`);
        if (!res.ok) return null;
        return res.json();
      } catch {
        return null;
      }
    });
  },

  /**
   * Fetches the distinct product categories from the catalog.
   */
  async getCategories(): Promise<string[]> {
    return apiCache.swr("categories", async () => {
      const res = await apiFetch("/api/categories");
      if (!res.ok) return [];
      return res.json();
    });
  },

  /**
   * Fetches the B2B wholesale product catalog with full pagination, scoring, and spelling corrections.
   */
  async getProductsPaginated(params: {
    search?: string;
    category?: string;
    filter?: "deals" | "frequent" | "low_stock";
    page?: number;
    limit?: number;
  }): Promise<{
    products: Product[];
    total: number;
    page: number;
    pageSize: number;
    pages: number;
    suggestions: string[];
    originalQuery: string;
    correctedQuery?: string;
  }> {
    const q = new URLSearchParams();
    if (params.search) q.append("search", params.search);
    if (params.category) q.append("category", params.category);
    if (params.filter) q.append("filter", params.filter);
    if (params.page) q.append("page", params.page.toString());
    if (params.limit) q.append("limit", params.limit.toString());
    q.append("paginate", "true");

    const queryStr = q.toString();
    const cacheKey = `products_paginated_${queryStr}`;

    return apiCache.swr(cacheKey, async () => {
      const res = await apiFetch(`/api/products?${queryStr}`);
      if (!res.ok) {
        throw new Error("Failed to fetch paginated product list from MediChain catalog.");
      }
      return res.json();
    });
  },

  /**
   * Toggles a product in the user's pharmacy's list of favorites/frequent procurements.
   */
  async toggleFavourite(productId: string): Promise<{ isFavourite: boolean }> {
    const res = await apiFetch("/api/favourites/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });

    if (!res.ok) {
      throw new Error("Failed to update favorite status.");
    }

    return res.json();
  },

  /**
   * Gets only the IDs of the user's current favorite products.
   */
  async getFavouritesIds(): Promise<string[]> {
    try {
      const res = await apiFetch("/api/favourites/ids");
      if (!res.ok) {
        return [];
      }
      return await res.json();
    } catch (err) {
      console.warn("Failed to fetch favorite product IDs:", err);
      return [];
    }
  },

  /**
   * Retrieves full product objects of all bookmarked products.
   */
  async getFavourites(): Promise<Product[]> {
    const res = await apiFetch("/api/favourites");
    if (!res.ok) {
      throw new Error("Failed to fetch favorite products.");
    }
    return res.json();
  },

  /**
   * [ADMIN ACTION] Triggers a global 5% price drop across the platform for a simulated price-drop.
   */
  async triggerAdminPriceDrop(): Promise<{ success: boolean }> {
    const res = await apiFetch("/api/admin/trigger-price-drop", { method: "POST" });
    if (!res.ok) {
      throw new Error("Failed to trigger price drop admin action.");
    }
    return res.json();
  },

  /**
   * [ADMIN ACTION] Publishes a high-priority flash procurement offer from major companies like Incepta/Beximco.
   */
  async triggerAdminNewOffer(): Promise<{ success: boolean }> {
    const res = await apiFetch("/api/admin/trigger-new-offer", { method: "POST" });
    if (!res.ok) {
      throw new Error("Failed to trigger flash offer admin action.");
    }
    return res.json();
  },

  /**
   * [ADMIN ACTION] Updates a product via PATCH API for in-place catalog changes.
   */
  async updateProductPatch(id: string, updates: Partial<Product>): Promise<{ success: boolean; product: Product }> {
    const res = await apiFetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to update product via PATCH.");
    }

    this.clearCache();
    return res.json();
  },

  /**
   * [ADMIN ACTION] Fetches products with internal confidential buying prices, margins, and missing-cost KPIs.
   */
  async getAdminProductsPaginated(params: {
    search?: string;
    category?: string;
    company?: string;
    filter?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    products: Product[];
    total: number;
    page: number;
    pageSize: number;
    pages: number;
    totalCatalogCount: number;
    missingBuyingPriceCount: number;
    knownBuyingPriceCount: number;
  }> {
    const q = new URLSearchParams();
    if (params.search) q.append("search", params.search);
    if (params.category) q.append("category", params.category);
    if (params.company) q.append("company", params.company);
    if (params.filter) q.append("filter", params.filter);
    if (params.page) q.append("page", params.page.toString());
    if (params.limit) q.append("limit", params.limit.toString());
    q.append("paginate", "true");

    try {
      const res = await apiFetch(`/api/admin/products?${q.toString()}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Error calling /api/admin/products, falling back:", e);
    }

    // Graceful fallback to paginated catalog
    try {
      const fallback = await this.getProductsPaginated({
        search: params.search,
        category: params.category,
        page: params.page,
        limit: params.limit
      });
      const missingCount = (fallback.products || []).filter(p => p.buyingPrice === null || p.buyingPrice === undefined).length;
      return {
        products: fallback.products || [],
        total: fallback.total || 0,
        page: fallback.page || 1,
        pageSize: fallback.pageSize || 50,
        pages: fallback.pages || 1,
        totalCatalogCount: fallback.total || 0,
        missingBuyingPriceCount: missingCount,
        knownBuyingPriceCount: (fallback.total || 0) - missingCount
      };
    } catch (fallbackErr) {
      return {
        products: [],
        total: 0,
        page: 1,
        pageSize: 50,
        pages: 1,
        totalCatalogCount: 0,
        missingBuyingPriceCount: 0,
        knownBuyingPriceCount: 0
      };
    }
  },

  /**
   * [ADMIN ACTION] Retrieves dedicated report of all products missing internal buying price.
   */
  async getProductsMissingBuyingPrice(): Promise<{
    success: boolean;
    totalCatalogCount: number;
    missingCount: number;
    products: Array<{
      id: string;
      name: string;
      genericName: string;
      company: string;
      category: string;
      mrp: number;
      sellingPrice: number;
      availableStock: number;
      status: string;
    }>;
  }> {
    try {
      const res = await apiFetch("/api/admin/products/missing-buying-price");
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Error calling /api/admin/products/missing-buying-price, falling back:", e);
    }

    try {
      const fallbackProds = await this.getProducts();
      const missing = fallbackProds
        .filter(p => p.buyingPrice === null || p.buyingPrice === undefined)
        .map(p => ({
          id: p.id,
          name: p.name,
          genericName: p.genericName || "",
          company: p.company || "",
          category: p.category || "",
          mrp: p.mrp || 0,
          sellingPrice: p.sellingPrice || 0,
          availableStock: p.availableStock || 0,
          status: "Missing Cost"
        }));
      return {
        success: true,
        totalCatalogCount: fallbackProds.length,
        missingCount: missing.length,
        products: missing
      };
    } catch (fallbackErr) {
      return {
        success: true,
        totalCatalogCount: 0,
        missingCount: 0,
        products: []
      };
    }
  },

  /**
   * Fetches alternative products with the same generic molecule name.
   */
  async getGenericAlternatives(genericName: string, currentProductId: string): Promise<Product[]> {
    if (!genericName) return [];
    try {
      const all = await this.getProducts({ search: genericName, limit: 10 });
      return all.filter(p => p.id !== currentProductId && p.genericName.toLowerCase() === genericName.toLowerCase());
    } catch {
      return [];
    }
  },
};

