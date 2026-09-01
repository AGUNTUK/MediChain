/**
 * MediChain Web Push Notification Service
 * 
 * Manages W3C standard VAPID Web Push protocol for delivering native-feeling push
 * notifications directly to mobile devices (Android Chrome, iOS 16.4+ Safari PWA, etc.)
 * even when the PWA is closed or the device screen is locked.
 */

import webpush, { PushSubscription } from 'web-push';
import fs from 'fs';
import path from 'path';

export interface StoredPushSubscription {
  id: string;
  subscription: PushSubscription;
  userId?: string | null;
  pharmacyName?: string | null;
  userAgent?: string | null;
  createdAt: string;
  lastActive: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  actions?: Array<{ action: string; title: string }>;
  data?: Record<string, any>;
}

// In-memory subscriptions store with local persistence backup
const SUBSCRIPTIONS_FILE = path.resolve('.push_subscriptions.json');
let subscriptionsMap = new Map<string, StoredPushSubscription>();

// Load persisted subscriptions if present
try {
  if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
    const raw = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8');
    const parsed: StoredPushSubscription[] = JSON.parse(raw);
    parsed.forEach(sub => {
      if (sub && sub.subscription && sub.subscription.endpoint) {
        subscriptionsMap.set(sub.subscription.endpoint, sub);
      }
    });
    console.log(`[PushService] Loaded ${subscriptionsMap.size} push subscriptions from disk.`);
  }
} catch (e) {
  console.warn('[PushService] Could not load persisted push subscriptions:', e);
}

function persistSubscriptions() {
  try {
    const list = Array.from(subscriptionsMap.values());
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[PushService] Could not persist subscriptions to disk:', e);
  }
}

// Ensure VAPID keys are configured
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@medichainbd.com';
let VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
let VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  try {
    const generated = webpush.generateVAPIDKeys();
    VAPID_PUBLIC_KEY = generated.publicKey;
    VAPID_PRIVATE_KEY = generated.privateKey;
    console.log('[PushService] VAPID keys auto-generated dynamically.');
  } catch (e) {
    console.error('[PushService] Could not generate VAPID keys:', e);
  }
}

try {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  console.log('[PushService] VAPID configuration initialized successfully.');
} catch (err) {
  console.error('[PushService] Failed to set VAPID details:', err);
}

export const pushNotificationService = {
  /**
   * Returns the public VAPID key for the frontend to subscribe with.
   */
  getVapidPublicKey(): string {
    return VAPID_PUBLIC_KEY;
  },

  /**
   * Saves or updates a device's push subscription.
   */
  saveSubscription(
    subscription: PushSubscription,
    userId?: string | null,
    pharmacyName?: string | null,
    userAgent?: string | null
  ): StoredPushSubscription {
    if (!subscription || !subscription.endpoint) {
      throw new Error('Invalid push subscription object');
    }

    const endpoint = subscription.endpoint;
    const existing = subscriptionsMap.get(endpoint);

    const stored: StoredPushSubscription = {
      id: existing?.id || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      subscription,
      userId: userId || existing?.userId || null,
      pharmacyName: pharmacyName || existing?.pharmacyName || null,
      userAgent: userAgent || existing?.userAgent || null,
      createdAt: existing?.createdAt || new Date().toISOString(),
      lastActive: new Date().toISOString()
    };

    subscriptionsMap.set(endpoint, stored);
    persistSubscriptions();
    console.log(`[PushService] Registered push subscription for pharmacy: ${pharmacyName || 'Anonymous'} (Total: ${subscriptionsMap.size})`);
    return stored;
  },

  /**
   * Removes a push subscription by its endpoint.
   */
  removeSubscription(endpoint: string): boolean {
    const deleted = subscriptionsMap.delete(endpoint);
    if (deleted) {
      persistSubscriptions();
      console.log(`[PushService] Removed push subscription. Remaining: ${subscriptionsMap.size}`);
    }
    return deleted;
  },

  /**
   * Sends a push notification to a specific user/pharmacy or all subscribers.
   */
  async sendPushNotification(
    payload: PushNotificationPayload,
    targetUserId?: string | null
  ): Promise<{ successCount: number; failureCount: number }> {
    const notificationPayload = JSON.stringify({
      title: payload.title || 'মেডিচেইন আপডেট',
      body: payload.body || '',
      icon: payload.icon || '/icons/icon-192.png',
      badge: payload.badge || '/icons/icon-192.png',
      url: payload.url || '/',
      tag: payload.tag || `medichain_${Date.now()}`,
      actions: payload.actions || [{ action: 'open', title: 'দেখুন' }],
      data: {
        url: payload.url || '/',
        timestamp: Date.now(),
        ...(payload.data || {})
      }
    });

    let targets = Array.from(subscriptionsMap.values());
    if (targetUserId) {
      targets = targets.filter(t => t.userId === targetUserId);
    }

    if (targets.length === 0) {
      console.log(`[PushService] No push subscribers found for target: ${targetUserId || 'broadcast'}`);
      return { successCount: 0, failureCount: 0 };
    }

    let successCount = 0;
    let failureCount = 0;
    const deadEndpoints: string[] = [];

    const sendPromises = targets.map(async (target) => {
      try {
        await webpush.sendNotification(target.subscription, notificationPayload, {
          TTL: 86400, // 24 hours delivery window
          urgency: 'high'
        });
        successCount++;
      } catch (err: any) {
        failureCount++;
        // If subscription has expired or unsubscribed on client (404 or 410 Gone), remove it
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log(`[PushService] Subscription expired for endpoint: ${target.subscription.endpoint.slice(0, 30)}... removing.`);
          deadEndpoints.push(target.subscription.endpoint);
        } else {
          console.warn(`[PushService] Failed to send push to ${target.subscription.endpoint.slice(0, 30)}...`, err?.message || err);
        }
      }
    });

    await Promise.allSettled(sendPromises);

    // Clean up dead subscriptions
    if (deadEndpoints.length > 0) {
      deadEndpoints.forEach(ep => subscriptionsMap.delete(ep));
      persistSubscriptions();
    }

    console.log(`[PushService] Push broadcast complete: ${successCount} succeeded, ${failureCount} failed.`);
    return { successCount, failureCount };
  },

  /**
   * Broadcasts push notification to all subscribed pharmacies and devices.
   */
  async broadcastPush(payload: PushNotificationPayload): Promise<{ successCount: number; failureCount: number }> {
    return this.sendPushNotification(payload, null);
  },

  /**
   * Returns total active subscription count.
   */
  getSubscribersCount(): number {
    return subscriptionsMap.size;
  }
};
