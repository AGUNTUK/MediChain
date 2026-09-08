export interface RestockRequest {
  id: string;
  productId: string;
  productName: string;
  status: "Pending" | "Restocked" | "Cancelled";
  createdAt: string;
  notifiedAt?: string;
}

export interface RestockAdminMetrics {
  totalPendingRequests: number;
  totalRestocked: number;
  highDemandProducts: { productId: string; productName: string; requestCount: number }[];
}

export const restockService = {
  async getMyRestockRequests(): Promise<RestockRequest[]> {
    try {
      const res = await fetch("/api/alerts/my-requests");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data.requests || []);
    } catch (e) {
      return [];
    }
  },

  async getAdminMetrics(): Promise<RestockAdminMetrics> {
    try {
      const res = await fetch("/api/admin/restock/metrics");
      if (!res.ok) return { totalPendingRequests: 0, totalRestocked: 0, highDemandProducts: [] };
      return await res.json();
    } catch (e) {
      return { totalPendingRequests: 0, totalRestocked: 0, highDemandProducts: [] };
    }
  }
};
