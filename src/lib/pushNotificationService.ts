import webpush from "web-push";
import { supabaseAdmin } from "./supabaseAdmin.js";

interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  userId?: string | null;
  pharmacyName?: string | null;
  userAgent?: string | null;
  keys?: {
    p256dh: string;
    auth: string;
  };
  subscribedAt: string;
}

const subscriptions = new Map<string, PushSubscriptionRecord>();
let isHydrated = false;

// VAPID keys setup: check process.env or generate once and cache in-memory
let vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
let vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";
const vapidSubject = process.env.VAPID_SUBJECT || process.env.VAPID_EMAIL || "mailto:support@medichain.app";

let vapidConfigured = false;
function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;
  try {
    if (!vapidPublicKey || !vapidPrivateKey) {
      // Auto-generate a cryptographically valid VAPID keypair in memory if not set in .env
      const generated = webpush.generateVAPIDKeys();
      vapidPublicKey = generated.publicKey;
      vapidPrivateKey = generated.privateKey;
      console.log("[PushService] Generated ephemeral VAPID keys. Public:", vapidPublicKey.slice(0, 16) + "...");
    }

    webpush.setVapidDetails(
      vapidSubject.startsWith("mailto:") ? vapidSubject : `mailto:${vapidSubject}`,
      vapidPublicKey,
      vapidPrivateKey
    );
    vapidConfigured = true;
    return true;
  } catch (err: any) {
    console.error("[PushService] Failed to configure VAPID:", err.message);
    return false;
  }
}

async function hydrateSubscriptions(): Promise<void> {
  if (isHydrated) return;
  isHydrated = true;
  try {
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("id, message, user_id")
      .eq("type", "push_subscription")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (!error && data && Array.isArray(data)) {
      for (const row of data) {
        try {
          const parsed: PushSubscriptionRecord = typeof row.message === "string" ? JSON.parse(row.message) : row.message;
          if (parsed && parsed.endpoint && !subscriptions.has(parsed.endpoint)) {
            subscriptions.set(parsed.endpoint, parsed);
          }
        } catch {}
      }
      console.log(`[PushService] Hydrated ${subscriptions.size} push subscriptions from database.`);
    }
  } catch (err: any) {
    console.warn("[PushService] Subscription hydration warning (non-fatal):", err.message);
  }
}

export const pushNotificationService = {
  getVapidPublicKey() {
    ensureVapidConfigured();
    return vapidPublicKey || "BNx8_mock_public_vapid_key_medichain_bd";
  },

  saveSubscription(sub: any, userId?: string | null, pharmacyName?: string | null, userAgent?: string | null) {
    if (!sub || !sub.endpoint) return { success: false, id: "" };
    const id = `sub_${Date.now()}_${crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Date.now().toString(36)}`;
    const record: PushSubscriptionRecord = {
      id,
      endpoint: sub.endpoint,
      userId: userId || null,
      pharmacyName: pharmacyName || null,
      userAgent: userAgent || null,
      keys: sub.keys,
      subscribedAt: new Date().toISOString()
    };
    subscriptions.set(sub.endpoint, record);

    // Persist to Supabase asynchronously so subscriptions survive server restarts
    (async () => {
      try {
        await supabaseAdmin.from("notifications").insert({
          title: `push_sub:${id}`,
          message: JSON.stringify(record),
          type: "push_subscription",
          user_id: userId || null,
          read: true
        });
      } catch (err: any) {
        console.warn("[PushService] DB persist warning:", err.message);
      }
    })();

    return { success: true, id };
  },

  removeSubscription(endpoint: string) {
    const existed = subscriptions.delete(endpoint);
    // Clean up from database
    (async () => {
      try {
        await supabaseAdmin
          .from("notifications")
          .delete()
          .eq("type", "push_subscription")
          .like("message", `%${endpoint}%`);
      } catch {}
    })();
    return existed;
  },

  async sendPushNotification(
    payload: {
      title?: string;
      body?: string;
      icon?: string;
      badge?: string;
      targetUserId?: string;
      tag?: string;
      url?: string;
      data?: any;
      actions?: Array<{ action: string; title: string }>;
    },
    targetUserId?: string | null
  ) {
    ensureVapidConfigured();
    await hydrateSubscriptions();

    const finalUserId = targetUserId || payload.targetUserId || null;
    const targets: PushSubscriptionRecord[] = [];

    for (const sub of subscriptions.values()) {
      if (finalUserId) {
        if (sub.userId && String(sub.userId) === String(finalUserId)) {
          targets.push(sub);
        }
      } else {
        targets.push(sub);
      }
    }

    if (targets.length === 0) {
      return { success: true, count: 0, delivered: 0, failed: 0 };
    }

    const pushPayload = JSON.stringify({
      title: payload.title || "মেডিচেইন আপডেট",
      body: payload.body || "আপনার একটি নতুন নোটিফিকেশন রয়েছে।",
      icon: payload.icon || "/icons/icon-192.png",
      badge: payload.badge || "/icons/icon-192.png",
      url: payload.url || "/",
      tag: payload.tag || `medichain_${Date.now()}`,
      data: {
        url: payload.url || "/",
        timestamp: Date.now(),
        ...(payload.data || {})
      },
      actions: payload.actions || [{ action: "open", title: "দেখুন" }]
    });

    let delivered = 0;
    let failed = 0;

    const sendPromises = targets.map(async (target) => {
      if (!target.endpoint || !target.keys?.p256dh || !target.keys?.auth) {
        return;
      }

      const pushSubscription = {
        endpoint: target.endpoint,
        keys: {
          p256dh: target.keys.p256dh,
          auth: target.keys.auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, pushPayload, {
          TTL: 60 * 60 * 24, // 24 hours
          urgency: "high"
        });
        delivered++;
      } catch (err: any) {
        failed++;
        // HTTP 404 Not Found or 410 Gone means the client unregistered or browser cleared subscriptions
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log(`[PushService] Purging expired endpoint: ${target.endpoint.slice(0, 30)}...`);
          subscriptions.delete(target.endpoint);
          (async () => {
            try {
              await supabaseAdmin
                .from("notifications")
                .delete()
                .eq("type", "push_subscription")
                .like("message", `%${target.endpoint}%`);
            } catch {}
          })();
        } else {
          console.warn(`[PushService] Delivery error (${err.statusCode || err.message}) for user ${target.userId}`);
        }
      }
    });

    await Promise.allSettled(sendPromises);

    return {
      success: true,
      count: targets.length,
      delivered,
      failed
    };
  }
};
