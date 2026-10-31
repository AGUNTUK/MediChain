import { Order, OrderStatus } from "../types";
import { apiFetch } from "../lib/apiFetch";

/**
 * MediChain Orders & B2B Cart Procurement Service
 * 
 * Manages active order workflows, real-time item reservations, re-ordering, and returns.
 */
const ACTIVE_CART_KEY = "medichain_active_cart";
const LEGACY_CART_KEY = "medichain_local_cart_items";

export interface LocalCartItem {
  productId: string;
  quantity: number;
  product?: any;
}

export function getLocalCartItems(): LocalCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ACTIVE_CART_KEY) || localStorage.getItem(LEGACY_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalCartItems(items: LocalCartItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACTIVE_CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("cartUpdated"));
    window.dispatchEvent(new CustomEvent("cart-updated"));
  } catch {}
}

export const orderService = {
  /**
   * Retrieves full procurement order history for the authenticated pharmacy.
   */
  async getOrders(): Promise<Order[]> {
    try {
      const res = await apiFetch("/api/orders");
      if (!res.ok) {
        return [];
      }
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        return [];
      }
      return await res.json();
    } catch (err) {
      console.warn("Unable to connect to orders API endpoint:", err);
      return [];
    }
  },

  /**
   * Fetches detailed information about a single order by its ID.
   */
  async getOrderById(orderId: string): Promise<Order> {
    const res = await apiFetch(`/api/orders/${orderId}`);
    if (!res.ok) {
      throw new Error("Failed to load details for this order.");
    }
    return res.json();
  },

  /**
   * Places a new procurement order based on the pharmacy's active shopping cart items.
   * Sends items in a single batch sync to the backend at checkout.
   */
  async createOrder(orderData: { paymentMethod: string; notes?: string; items?: any[]; deliveryAddress?: string }): Promise<any> {
    const localItems = getLocalCartItems().map(i => ({ productId: i.productId, quantity: i.quantity }));
    const payload = {
      ...orderData,
      items: (orderData.items && orderData.items.length > 0) ? orderData.items : localItems
    };

    const response = await apiFetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (errData.fields) {
        throw { message: errData.error || "Validation failed", fields: errData.fields };
      }
      throw new Error(errData.error || "Failed to finalize checkout and place order.");
    }

    // Clear client-side active cart upon successful order
    saveLocalCartItems([]);

    return response.json();
  },

  /**
   * Retrieves the current items, subtotal, and savings in the user's active shopping cart.
   * 100% Client-Side from localStorage in 0ms (0 bytes Supabase DB egress).
   */
  async getCart(): Promise<{ items: any[]; totalAmount: number; totalSavings: number; totalMrp: number; totalTierSavings?: number }> {
    const local = getLocalCartItems();
    if (local.length === 0) {
      return { items: [], totalAmount: 0, totalSavings: 0, totalMrp: 0, totalTierSavings: 0 };
    }

    // Determine if any items are missing cached product details
    const missingProductIds = local
      .filter(item => !item.product || !item.product.name)
      .map(item => item.productId);

    const fetchedMap = new Map<string, any>();
    if (missingProductIds.length > 0) {
      try {
        const { productService } = await import("./product.js");
        for (const pid of missingProductIds) {
          const prod = await productService.getProductById(pid);
          if (prod) fetchedMap.set(pid, prod);
        }
      } catch (err) {
        console.warn("Could not fetch missing product details:", err);
      }
    }

    const cartItems: any[] = [];
    let totalAmount = 0;
    let totalMrp = 0;
    let totalTierSavings = 0;

    let hasNewCachedProducts = false;
    for (const item of local) {
      let product = item.product || fetchedMap.get(item.productId);
      if (!product) {
        product = {
          id: item.productId,
          name: "ঔষধ আইটেম",
          genericName: "",
          company: "",
          sellingPrice: 0,
          mrp: 0
        };
      } else if (!item.product && fetchedMap.has(item.productId)) {
        item.product = product;
        hasNewCachedProducts = true;
      }

      const mrp = Number(product.mrp) || Number(product.sellingPrice) || 0;
      let effectiveUnitPrice = Number(product.sellingPrice) || mrp;
      let activeTier: any = null;
      let nextTier: any = null;
      let tierSavings = 0;

      if (product.tiers && Array.isArray(product.tiers) && product.tiers.length > 0) {
        const sortedTiers = [...product.tiers].sort((a: any, b: any) => a.minQty - b.minQty);
        activeTier = [...sortedTiers].reverse().find((t: any) => item.quantity >= t.minQty) || null;
        nextTier = sortedTiers.find((t: any) => item.quantity < t.minQty) || null;

        if (activeTier && activeTier.discountPercent > 0) {
          effectiveUnitPrice = Math.round((mrp * (1 - activeTier.discountPercent / 100)) * 100) / 100;
          tierSavings = Math.max(0, Math.round(((Number(product.sellingPrice) - effectiveUnitPrice) * item.quantity) * 100) / 100);
        }
      }

      const subtotal = Math.round(effectiveUnitPrice * item.quantity * 100) / 100;
      totalAmount += subtotal;
      totalMrp += Math.round(mrp * item.quantity * 100) / 100;
      totalTierSavings += tierSavings;

      cartItems.push({
        product,
        productId: product.id || item.productId,
        quantity: item.quantity,
        effectiveUnitPrice,
        itemSubtotal: subtotal,
        tierSavings,
        activeTier,
        nextTier
      });
    }

    if (hasNewCachedProducts) {
      saveLocalCartItems(local);
    }

    const totalSavings = Math.max(0, Math.round((totalMrp - totalAmount) * 100) / 100);
    return {
      items: cartItems,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalSavings,
      totalMrp: Math.round(totalMrp * 100) / 100,
      totalTierSavings: Math.round(totalTierSavings * 100) / 100
    };
  },

  /**
   * Adds a product and quantity to the active cart 100% client-side (0ms latency, 0 DB egress).
   */
  addToCart(productId: string, quantity: number, product?: any): { success: boolean } {
    const qtyNum = Math.max(1, Number(quantity) || 1);
    const local = getLocalCartItems();
    const existing = local.find(i => i.productId === productId);
    if (existing) {
      existing.quantity += qtyNum;
      if (product && (!existing.product || !existing.product.name)) {
        existing.product = product;
      }
    } else {
      local.push({ productId, quantity: qtyNum, product });
    }
    saveLocalCartItems(local);
    return { success: true };
  },

  /**
   * Updates product quantity in the client-side cart (0ms latency, 0 DB egress).
   */
  updateCartItem(productId: string, quantity: number): { success: boolean } {
    const local = getLocalCartItems();
    const existing = local.find(i => i.productId === productId);
    if (quantity <= 0) {
      saveLocalCartItems(local.filter(i => i.productId !== productId));
    } else if (existing) {
      existing.quantity = quantity;
      saveLocalCartItems(local);
    } else {
      local.push({ productId, quantity });
      saveLocalCartItems(local);
    }
    return { success: true };
  },

  /**
   * Removes a product from the client-side cart (0ms latency, 0 DB egress).
   */
  removeFromCart(productId: string): { success: boolean } {
    const local = getLocalCartItems().filter(i => i.productId !== productId);
    saveLocalCartItems(local);
    return { success: true };
  },

  /**
   * Empties the client-side active shopping cart.
   */
  clearCart(): void {
    saveLocalCartItems([]);
  },

  /**
   * Clones a previous order and updates the cart with all its items for instant re-ordering.
   */
  async reorder(orderId: string): Promise<{ success: boolean }> {
    const res = await apiFetch(`/api/orders/${orderId}/reorder`, {
      method: "POST",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to duplicate this order into your cart.");
    }

    const data = await res.json();
    if (data && Array.isArray(data.items)) {
      saveLocalCartItems(data.items);
    }
    return data;
  },

  /**
   * Initiates a return request for products in a delivered order.
   */
  async requestReturn(orderId: string, returnReason: string): Promise<{ success: boolean }> {
    const res = await apiFetch(`/api/orders/${orderId}/return`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: returnReason }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to file return request.");
    }

    return res.json();
  },

  /**
   * Downloads the PDF invoice for a given order and initiates browser download.
   */
  async downloadInvoice(orderId: string, filename?: string): Promise<{ success: boolean; blob: Blob }> {
    const res = await apiFetch(`/api/orders/${orderId}/invoice`);

    if (!res.ok) {
      let errorMessage = "Failed to download invoice.";
      try {
        const err = await res.json();
        if (err?.error) errorMessage = err.error;
      } catch {
        try {
          const text = await res.text();
          if (text) errorMessage = text;
        } catch {}
      }
      throw new Error(errorMessage);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `Invoice-${orderId.substring(0, 8)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    return { success: true, blob };
  },

  /**
   * Downloads the consolidated delivery schedule invoice PDF combining multiple orders.
   */
  async downloadCombinedInvoice(windowKey: string, pharmacyId: string, filename?: string): Promise<{ success: boolean; blob: Blob }> {
    const res = await apiFetch(`/api/invoices/consolidated/${encodeURIComponent(windowKey)}/${encodeURIComponent(pharmacyId)}/pdf`);

    if (!res.ok) {
      let errorMessage = "Failed to download combined invoice.";
      try {
        const err = await res.json();
        if (err?.error) errorMessage = err.error;
      } catch {
        try {
          const text = await res.text();
          if (text) errorMessage = text;
        } catch {}
      }
      throw new Error(errorMessage);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `Combined-Invoice-${windowKey}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    return { success: true, blob };
  },

  /**
   * Cancels a pending or confirmed order before it is processed.
   */
  async cancelOrder(orderId: string): Promise<{ success: boolean }> {
    const res = await apiFetch(`/api/orders/${orderId}/cancel`, {
      method: "POST",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to cancel order.");
    }

    return res.json();
  },

  /**
   * [ADMIN/STAFF ACTION] Updates the delivery/processing status of an active order.
   */
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<{ success: boolean }> {
    const res = await apiFetch(`/api/orders/${orderId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to update order status.");
    }

    return res.json();
  },

  /**
   * [DEPOT STAFF ACTION] Assigns a delivery rider to a packed order and dispatches it.
   */
  async assignDelivery(orderId: string, assignedRiderId: string): Promise<{ success: boolean }> {
    const res = await apiFetch(`/api/depot/orders/${orderId}/assign-delivery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedRiderId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to assign delivery rider.");
    }

    return res.json();
  },

  /**
   * [ADMIN/STAFF ACTION] Approves a pending product return and clears credit/accounts.
   */
  async approveReturn(orderId: string): Promise<{ success: boolean }> {
    const res = await apiFetch(`/api/orders/${orderId}/approve-return`, {
      method: "POST",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to approve return request.");
    }

    return res.json();
  },

  /**
   * [DEPOT/ADMIN ACTION] Marks a specific order item unavailable before packing and automatically recalculates invoice.
   */
  async amendOrderLineItem(orderId: string, productId: string, reason?: string): Promise<{ success: boolean; order: Order; amendment: any }> {
    const res = await apiFetch(`/api/orders/${orderId}/amend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, reason }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to amend order line item.");
    }

    return res.json();
  },

  /**
   * Retrieves all procurement amendment audit logs for an order.
   */
  async getOrderAmendments(orderId: string): Promise<any[]> {
    try {
      const res = await apiFetch(`/api/orders/${orderId}/amendments`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.amendments || [];
    } catch (e) {
      console.warn("Failed to fetch order amendments:", e);
      return [];
    }
  },

  /**
   * Retrieves all delivery-schedule-based consolidated invoice groups.
   */
  async getConsolidatedInvoices(pharmacyId?: string): Promise<any[]> {
    try {
      const url = pharmacyId ? `/api/invoices/consolidated?pharmacyId=${pharmacyId}` : "/api/invoices/consolidated";
      const res = await apiFetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return data.groups || [];
    } catch (e) {
      console.warn("Failed to fetch consolidated invoices:", e);
      return [];
    }
  },

  /**
   * Validates and creates a combined invoice from a selection of orders.
   */
  async generateCombinedCustomInvoice(orderIds: string[], pharmacyId?: string): Promise<{ success: boolean; group: any; message?: string }> {
    const res = await apiFetch("/api/invoices/custom/generate-combined", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderIds, pharmacyId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to generate combined invoice.");
    }

    return res.json();
  },
};
