import { Notification } from "../types";

let cachedNotifications: { data: Notification[]; timestamp: number } | null = null;
let pendingFetchPromise: Promise<Notification[]> | null = null;
const NOTIF_CACHE_TTL = 10000; // 10 seconds TTL

/**
 * MediChain Notification Service
 * 
 * Manages flash discount deals, price drops alerts, and active order shipment status logs.
 */

const INTERNAL_TYPES = new Set([
  "audit_log",
  "import_history",
  "export_history",
  "price_history",
  "alert_log",
  "system_settings",
  "cart",
  "stock_alert_sub"
]);

function filterUserFacingNotifications(items: any[]): Notification[] {
  if (!Array.isArray(items)) return [];
  return items.filter(n => {
    if (!n) return false;
    if (n.type && INTERNAL_TYPES.has(n.type)) return false;
    if (typeof n.title === "string" && (
      n.title.startsWith("Audit:") || 
      n.title.startsWith("Price History:") || 
      n.title.startsWith("Bulk Import") || 
      n.title.startsWith("Bulk Export") ||
      n.title.startsWith("StockAlertSub:")
    )) {
      return false;
    }
    if (typeof n.message === "string") {
      const trimmed = n.message.trim();
      if (trimmed.startsWith("{") && (
        trimmed.includes('"action":') || 
        trimmed.includes('"affectedModule":') || 
        trimmed.includes('"productId":') || 
        trimmed.includes('"filename":')
      )) {
        return false;
      }
    }
    return true;
  });
}

export const notificationService = {
  clearCache(): void {
    cachedNotifications = null;
  },

  async getNotifications(forceRefresh = false): Promise<Notification[]> {
    if (!forceRefresh && cachedNotifications && Date.now() - cachedNotifications.timestamp < NOTIF_CACHE_TTL) {
      return cachedNotifications.data;
    }

    if (pendingFetchPromise) {
      return pendingFetchPromise;
    }

    pendingFetchPromise = (async () => {
      try {
        const res = await fetch("/api/notifications");
        const contentType = res.headers.get("content-type");
        if (!res.ok || !contentType || !contentType.includes("application/json")) {
          console.warn("Notifications request failed or returned invalid format.");
          return cachedNotifications?.data || [];
        }
        const data = await res.json();
        const filtered = filterUserFacingNotifications(data);
        cachedNotifications = { data: filtered, timestamp: Date.now() };
        return filtered;
      } catch (err) {
        console.warn("Failed to load notifications (network/transient):", err);
        return cachedNotifications?.data || [];
      } finally {
        pendingFetchPromise = null;
      }
    })();

    return pendingFetchPromise;
  },

  async markAsRead(notificationId: string): Promise<{ success: boolean }> {
    this.clearCache();
    const res = await fetch(`/api/notifications/read/${notificationId}`, { method: "POST" });
    const contentType = res.headers.get("content-type");
    if (!res.ok || !contentType || !contentType.includes("application/json")) {
      throw new Error("Failed to mark as read.");
    }
    return res.json();
  },

  async markAllAsRead(): Promise<{ success: boolean }> {
    this.clearCache();
    const res = await fetch("/api/notifications/read-all", { method: "POST" });
    const contentType = res.headers.get("content-type");
    if (!res.ok || !contentType || !contentType.includes("application/json")) {
      throw new Error("Failed to mark all as read.");
    }
    return res.json();
  },

  async sendNotification(notification: Omit<Notification, 'id' | 'is_read' | 'created_at'> & { targetType?: string; pharmacyId?: string | null }): Promise<void> {
    this.clearCache();
    const res = await fetch("/api/admin/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: notification.title,
        message: notification.message,
        type: notification.type || notification.targetType || "global",
        targetType: notification.targetType || notification.type || "global",
        pharmacyId: notification.pharmacyId || null,
      }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded with status ${res.status}`);
    }
  }
};
