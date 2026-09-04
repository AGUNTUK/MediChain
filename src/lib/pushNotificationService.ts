interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  userId?: string;
  pharmacyName?: string;
  userAgent?: string;
  keys?: {
    p256dh: string;
    auth: string;
  };
  subscribedAt: string;
}

const subscriptions = new Map<string, PushSubscriptionRecord>();

export const pushNotificationService = {
  getVapidPublicKey() {
    return process.env.VAPID_PUBLIC_KEY || "BNx8_mock_public_vapid_key_medichain_bd";
  },

  saveSubscription(sub: any, userId?: string, pharmacyName?: string, userAgent?: string) {
    if (!sub || !sub.endpoint) return { success: false, id: "" };
    const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    subscriptions.set(sub.endpoint, {
      id,
      endpoint: sub.endpoint,
      userId,
      pharmacyName,
      userAgent,
      keys: sub.keys,
      subscribedAt: new Date().toISOString()
    });
    return { success: true, id };
  },

  removeSubscription(endpoint: string) {
    return subscriptions.delete(endpoint);
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
    },
    targetUserId?: string
  ) {
    return { success: true, count: subscriptions.size };
  }
};
