import { RestockRequest, GroupedProductDemand, RestockMetrics, RestockRequestStatus } from "../types";
import { apiCache } from "../lib/apiCache";

/**
 * MediChain Restock Request & Stock Alert Service
 * 
 * Manages pharmacy restock requests, demand aggregation, and administrative resolution.
 */
export const restockService = {
  /**
   * Submits a stock alert request for an out-of-stock product.
   * Server resolves the authenticated user's pharmacy profile and guarantees idempotency.
   */
  async requestStockAlert(productId: string, requestedQuantity: number = 1): Promise<{ success: boolean; request: RestockRequest; isExisting?: boolean; message?: string }> {
    const res = await fetch("/api/stock-alerts/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, requestedQuantity })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to submit restock request.");
    }

    // Clear client-side stock alert caches
    apiCache.invalidate("my_restock_requests");
    return res.json();
  },

  /**
   * Retrieves active & past restock requests for the currently logged-in pharmacy.
   */
  async getMyRestockRequests(): Promise<RestockRequest[]> {
    return apiCache.swr("my_restock_requests", async () => {
      const res = await fetch("/api/stock-alerts/my-requests");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data.requests || []);
    });
  },

  /**
   * Checks if the currently logged in pharmacy has an active pending request for a product.
   */
  async hasActiveRequest(productId: string): Promise<boolean> {
    try {
      const requests = await this.getMyRestockRequests();
      return requests.some(r => r.productId === productId && r.status === "pending");
    } catch {
      return false;
    }
  },

  /**
   * [ADMIN] Fetches grouped product demand list with filters and search.
   */
  async getAdminGroupedDemand(params?: {
    search?: string;
    status?: RestockRequestStatus | "all";
    sortBy?: "most_requested" | "most_recent" | "oldest" | "name";
  }): Promise<{ demand: GroupedProductDemand[]; metrics: RestockMetrics }> {
    const q = new URLSearchParams();
    if (params?.search) q.append("search", params.search);
    if (params?.status && params.status !== "all") q.append("status", params.status);
    if (params?.sortBy) q.append("sortBy", params.sortBy);

    const queryStr = q.toString() ? `?${q.toString()}` : "";
    const res = await fetch(`/api/admin/restock-requests${queryStr}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to fetch admin restock demand.");
    }
    return res.json();
  },

  /**
   * [ADMIN] Fetches demand summary metrics.
   */
  async getAdminMetrics(): Promise<RestockMetrics> {
    const res = await fetch("/api/admin/restock-requests/metrics");
    if (!res.ok) {
      throw new Error("Failed to fetch restock metrics.");
    }
    return res.json();
  },

  /**
   * [ADMIN] Updates the status of an individual restock request.
   */
  async updateRequestStatus(requestId: string, status: RestockRequestStatus): Promise<{ success: boolean; request: RestockRequest }> {
    const res = await fetch(`/api/admin/restock-requests/${requestId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to update restock request status.");
    }
    return res.json();
  },

  /**
   * [ADMIN] Manually resolves all pending requests for a specific product.
   */
  async resolveAllForProduct(productId: string): Promise<{ success: boolean; resolvedCount: number }> {
    const res = await fetch(`/api/admin/restock-requests/product/${productId}/resolve`, {
      method: "POST"
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to resolve restock requests for product.");
    }
    return res.json();
  }
};
