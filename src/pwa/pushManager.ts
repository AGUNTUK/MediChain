/**
 * MediChain PWA Push Notification Manager
 * 
 * Manages client-side Web Push subscription lifecycle:
 * - Checks device & browser compatibility
 * - Prompts for user notification permission
 * - Subscribes via Service Worker PushManager with VAPID public key
 * - Synchronizes subscription with backend server
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const pushManager = {
  /**
   * Checks whether the current browser and platform support Push Notifications.
   */
  isPushSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  },

  /**
   * Returns current permission state ('default' | 'granted' | 'denied').
   */
  getPermissionState(): NotificationPermission {
    if (!this.isPushSupported()) return 'denied';
    return Notification.permission;
  },

  /**
   * Checks if user already has an active push subscription.
   */
  async getExistingSubscription(): Promise<PushSubscription | null> {
    if (!this.isPushSupported()) return null;
    try {
      const registration = await navigator.serviceWorker.ready;
      return await registration.pushManager.getSubscription();
    } catch (err) {
      console.warn('[PushManager] Failed to get existing subscription:', err);
      return null;
    }
  },

  /**
   * Requests permission, subscribes via Service Worker, and registers with backend.
   */
  async subscribe(userId?: string | null, pharmacyName?: string | null): Promise<{ success: boolean; error?: string }> {
    if (!this.isPushSupported()) {
      return { success: false, error: 'আপনার ব্রাউজার বা ডিভাইসে পুশ নোটিফিকেশন সমর্থিত নয়।' };
    }

    try {
      // 1. Request user permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return { success: false, error: 'নোটিফিকেশন পারমিশন দেওয়া হয়নি।' };
      }

      // 2. Fetch VAPID public key from backend
      const keyRes = await fetch('/api/notifications/vapid-public-key');
      if (!keyRes.ok) {
        throw new Error('Failed to fetch VAPID public key from server');
      }
      const { publicKey } = await keyRes.json();
      if (!publicKey) {
        throw new Error('Server returned empty VAPID key');
      }

      // 3. Register push subscription with service worker
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const convertedVapidKey = urlBase64ToUint8Array(publicKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey as unknown as ArrayBufferView
        });
      }

      // 4. Send subscription to backend server
      const subRes = await fetch('/api/notifications/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userId: userId || null,
          pharmacyName: pharmacyName || null
        })
      });

      if (!subRes.ok) {
        throw new Error('Failed to save subscription on server');
      }

      console.log('[PushManager] Successfully subscribed to Web Push notifications!');
      return { success: true };
    } catch (err: any) {
      console.error('[PushManager] Push subscription failed:', err);
      return { success: false, error: err?.message || 'পুশ নোটিফিকেশন চালু করা যায়নি।' };
    }
  },

  /**
   * Unsubscribes current device from push notifications.
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.isPushSupported()) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Notify backend
        await fetch('/api/notifications/push-unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        }).catch(() => {});

        // Unsubscribe from browser
        await subscription.unsubscribe();
      }

      console.log('[PushManager] Successfully unsubscribed from push notifications.');
      return true;
    } catch (err) {
      console.error('[PushManager] Unsubscribe failed:', err);
      return false;
    }
  },

  /**
   * Sends an instant test push notification to verify delivery on device.
   */
  async sendTestPush(userId?: string | null): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/notifications/test-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId || null,
          title: 'মেডিচেইন টেস্ট পুশ নোটিফিকেশন 🚀',
          body: 'অভিনন্দন! আপনার ফোনে মেডিচেইন পুশ নোটিফিকেশন সফলভাবে কাজ করছে।'
        })
      });

      if (!res.ok) {
        throw new Error('Server test push failed');
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'টেস্ট নোটিফিকেশন পাঠানো যায়নি।' };
    }
  }
};
