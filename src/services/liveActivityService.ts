import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

export interface CartItemPreview {
  name: string;
  qty: number;
  price: number;
}

export interface LiveUserPresence {
  userId: string;
  pharmacyName: string;
  phone: string;
  currentView: string;
  cartCount: number;
  cartTotal: number;
  cartItemsPreview: CartItemPreview[];
  lastSearch: string;
  lastActiveAt: string;
  isGuest?: boolean;
  role?: string;
}

export interface RadarBroadcastEvent {
  id: string;
  action: "SEARCH" | "CART_UPDATE" | "OPEN_CHECKOUT" | "ORDER_PLACED";
  userId: string;
  pharmacyName: string;
  phone?: string;
  query?: string;
  resultsCount?: number;
  productName?: string;
  qty?: number;
  cartCount?: number;
  cartTotal?: number;
  orderNumber?: string;
  total?: number;
  timestamp: string;
}

// Generate or retrieve persistent guest session ID
function getGuestSessionId(): string {
  if (typeof window === "undefined") return "guest_ssr";
  try {
    let sid = sessionStorage.getItem("medichain_radar_sid");
    if (!sid) {
      sid = "guest_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36);
      sessionStorage.setItem("medichain_radar_sid", sid);
    }
    return sid;
  } catch {
    return "guest_" + Date.now();
  }
}

class LiveActivityService {
  private channelName = "medichain_live_radar";
  private clientChannel: any = null;
  private adminChannel: any = null;
  private isSubscribed = false;
  private isAdminSubscribed = false;

  // Throttling & Debouncing timers
  private lastTrackTime = 0;
  private trackThrottleMs = 3000;
  private pendingTrackState: LiveUserPresence | null = null;
  private trackTimer: any = null;

  private searchDebounceTimer: any = null;
  private cartThrottleTimer: any = null;
  private lastCartBroadcastTime = 0;

  // Current client identity
  private currentUserId: string = getGuestSessionId();
  private currentUserRole: string = "guest";
  private currentPresence: LiveUserPresence = {
    userId: this.currentUserId,
    pharmacyName: "Guest Visitor",
    phone: "",
    currentView: "Home",
    cartCount: 0,
    cartTotal: 0,
    cartItemsPreview: [],
    lastSearch: "",
    lastActiveAt: new Date().toISOString(),
    isGuest: true,
  };

  /**
   * Initializes client telemetry if not an admin.
   * Completely zero-database egress: uses Realtime WebSockets Presence & Broadcast.
   */
  public initClientTelemetry(user?: any, pharmacy?: any) {
    if (typeof window === "undefined" || !isSupabaseConfigured) return;

    const role = (user?.role || "").toLowerCase();
    this.currentUserRole = role;

    // Strict Admin Exemption: do not track admin actions in the customer radar
    if (role === "admin") {
      this.disconnectClient();
      return;
    }

    const userId = user?.id || getGuestSessionId();
    this.currentUserId = userId;

    const pharmacyName = pharmacy?.pharmacy_name || pharmacy?.name || user?.name || "Guest Visitor";
    const phone = pharmacy?.phone || user?.phone || "";
    const isGuest = !user?.id;

    this.currentPresence = {
      ...this.currentPresence,
      userId,
      pharmacyName,
      phone,
      isGuest,
      role: user?.role || "Customer",
      lastActiveAt: new Date().toISOString(),
    };

    if (!this.clientChannel) {
      this.connectClientChannel();
    } else {
      this.schedulePresenceTrack();
    }
  }

  private connectClientChannel() {
    try {
      this.clientChannel = supabase.channel(this.channelName, {
        config: {
          presence: { key: this.currentUserId },
          broadcast: { ack: false }, // Fire and forget: zero database egress
        },
      });

      this.clientChannel
        .subscribe((status: string) => {
          if (status === "SUBSCRIBED") {
            this.isSubscribed = true;
            this.schedulePresenceTrack(true);
          } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
            this.isSubscribed = false;
          }
        });
    } catch (err) {
      console.warn("LiveActivityService client connection notice:", err);
    }
  }

  /**
   * Updates user presence state (throttled to at most once per 3s to minimize network frames).
   */
  public updatePresence(updates: Partial<LiveUserPresence>) {
    if (this.currentUserRole === "admin") return;

    this.currentPresence = {
      ...this.currentPresence,
      ...updates,
      lastActiveAt: new Date().toISOString(),
    };

    this.schedulePresenceTrack();
  }

  /**
   * Schedules a presence state track call with strict 3-second throttling.
   */
  private schedulePresenceTrack(immediate = false) {
    if (!this.clientChannel || !this.isSubscribed) return;

    const now = Date.now();
    const elapsed = now - this.lastTrackTime;

    if (immediate || elapsed >= this.trackThrottleMs) {
      if (this.trackTimer) {
        clearTimeout(this.trackTimer);
        this.trackTimer = null;
      }
      this.lastTrackTime = now;
      try {
        this.clientChannel.track(this.currentPresence);
      } catch (err) {
        console.warn("Presence track notice:", err);
      }
    } else {
      if (!this.trackTimer) {
        this.trackTimer = setTimeout(() => {
          this.trackTimer = null;
          this.lastTrackTime = Date.now();
          try {
            this.clientChannel?.track(this.currentPresence);
          } catch (err) {
            console.warn("Deferred presence track notice:", err);
          }
        }, this.trackThrottleMs - elapsed);
      }
    }
  }

  /**
   * Broadcast: User Search (Debounced 1200ms so only meaningful paused queries are sent).
   */
  public trackSearch(query: string, resultsCount = 0) {
    if (this.currentUserRole === "admin") return;
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) return;

    this.updatePresence({ lastSearch: cleanQuery });

    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = setTimeout(() => {
      this.broadcastEvent({
        action: "SEARCH",
        query: cleanQuery,
        resultsCount,
      });
    }, 1200);
  }

  /**
   * Broadcast: Cart Mutations (Throttled 1500ms).
   */
  public trackCartUpdate(productName: string, qty: number, cartCount: number, cartTotal: number, itemsPreview: CartItemPreview[] = []) {
    if (this.currentUserRole === "admin") return;

    this.updatePresence({
      cartCount,
      cartTotal,
      cartItemsPreview: itemsPreview.slice(0, 10),
    });

    const now = Date.now();
    if (now - this.lastCartBroadcastTime > 1500) {
      this.lastCartBroadcastTime = now;
      this.broadcastEvent({
        action: "CART_UPDATE",
        productName,
        qty,
        cartCount,
        cartTotal,
      });
    } else {
      if (this.cartThrottleTimer) clearTimeout(this.cartThrottleTimer);
      this.cartThrottleTimer = setTimeout(() => {
        this.lastCartBroadcastTime = Date.now();
        this.broadcastEvent({
          action: "CART_UPDATE",
          productName,
          qty,
          cartCount,
          cartTotal,
        });
      }, 1500);
    }
  }

  /**
   * Broadcast: Checkout Opened Intent.
   */
  public trackCheckoutIntent(cartTotal: number, cartCount: number) {
    if (this.currentUserRole === "admin") return;

    this.updatePresence({ currentView: "Checkout" });
    this.broadcastEvent({
      action: "OPEN_CHECKOUT",
      cartTotal,
      cartCount,
    });
  }

  /**
   * Broadcast: Order Placed Successfully.
   */
  public trackOrderPlaced(orderNumber: string, total: number) {
    if (this.currentUserRole === "admin") return;

    this.updatePresence({ cartCount: 0, cartTotal: 0, cartItemsPreview: [], currentView: "Orders" });
    this.broadcastEvent({
      action: "ORDER_PLACED",
      orderNumber,
      total,
    });
  }

  /**
   * Broadcast: Screen / View Changed (Home, Catalog, Cart, etc.).
   */
  public trackViewChange(viewName: string) {
    if (this.currentUserRole === "admin") return;
    this.updatePresence({ currentView: viewName });
  }

  private broadcastEvent(eventData: Partial<RadarBroadcastEvent> & { action: RadarBroadcastEvent["action"] }) {
    if (!this.clientChannel || !this.isSubscribed) return;

    const fullEvent: RadarBroadcastEvent = {
      id: "ev_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 6),
      userId: this.currentPresence.userId,
      pharmacyName: this.currentPresence.pharmacyName,
      phone: this.currentPresence.phone,
      timestamp: new Date().toISOString(),
      ...eventData,
    };

    try {
      this.clientChannel.send({
        type: "broadcast",
        event: "user_action",
        payload: fullEvent,
      });
    } catch (err) {
      console.warn("Broadcast event notice:", err);
    }
  }

  /**
   * Disconnects client telemetry channel on logout or admin switch.
   */
  public disconnectClient() {
    if (this.trackTimer) clearTimeout(this.trackTimer);
    if (this.searchDebounceTimer) clearTimeout(this.searchDebounceTimer);
    if (this.cartThrottleTimer) clearTimeout(this.cartThrottleTimer);

    if (this.clientChannel) {
      try {
        this.clientChannel.untrack();
        supabase.removeChannel(this.clientChannel);
      } catch {}
      this.clientChannel = null;
      this.isSubscribed = false;
    }
  }

  // =========================================================================
  // ADMIN RADAR OBSERVER (Listens to Realtime Presence & Broadcast)
  // =========================================================================

  /**
   * Subscribes the Admin Dashboard to live presence state and broadcast events.
   * Returns an unsubscribe function.
   */
  public subscribeToRadar(
    onPresenceSync: (presences: LiveUserPresence[]) => void,
    onBroadcastEvent: (event: RadarBroadcastEvent) => void
  ): () => void {
    if (typeof window === "undefined" || !isSupabaseConfigured) {
      return () => {};
    }

    try {
      this.adminChannel = supabase.channel(this.channelName, {
        config: {
          broadcast: { ack: false },
        },
      });

      this.adminChannel
        .on("presence", { event: "sync" }, () => {
          const state = this.adminChannel.presenceState();
          const list: LiveUserPresence[] = [];

          // Flatten presence map into unique latest users
          Object.keys(state).forEach((key) => {
            const presences = state[key] as any[];
            if (presences && presences.length > 0) {
              const latest = presences[presences.length - 1];
              // Exclude any presence tagged as admin
              if ((latest.role || "").toLowerCase() !== "admin") {
                list.push(latest as LiveUserPresence);
              }
            }
          });

          // Sort by last active timestamp descending
          list.sort((a, b) => new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime());
          onPresenceSync(list);
        })
        .on("presence", { event: "join" }, () => {
          const state = this.adminChannel.presenceState();
          const list: LiveUserPresence[] = [];
          Object.keys(state).forEach((key) => {
            const presences = state[key] as any[];
            if (presences && presences.length > 0) {
              const latest = presences[presences.length - 1];
              if ((latest.role || "").toLowerCase() !== "admin") {
                list.push(latest as LiveUserPresence);
              }
            }
          });
          list.sort((a, b) => new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime());
          onPresenceSync(list);
        })
        .on("presence", { event: "leave" }, () => {
          const state = this.adminChannel.presenceState();
          const list: LiveUserPresence[] = [];
          Object.keys(state).forEach((key) => {
            const presences = state[key] as any[];
            if (presences && presences.length > 0) {
              const latest = presences[presences.length - 1];
              if ((latest.role || "").toLowerCase() !== "admin") {
                list.push(latest as LiveUserPresence);
              }
            }
          });
          list.sort((a, b) => new Date(b.lastActiveAt || 0).getTime() - new Date(a.lastActiveAt || 0).getTime());
          onPresenceSync(list);
        })
        .on("broadcast", { event: "user_action" }, ({ payload }: { payload: RadarBroadcastEvent }) => {
          if (payload) {
            onBroadcastEvent(payload);
          }
        });

      this.adminChannel.subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          this.isAdminSubscribed = true;
        }
      });

      return () => {
        if (this.adminChannel) {
          try {
            supabase.removeChannel(this.adminChannel);
          } catch {}
          this.adminChannel = null;
          this.isAdminSubscribed = false;
        }
      };
    } catch (err) {
      console.warn("Failed to subscribe to radar channel:", err);
      return () => {};
    }
  }
}

export const liveActivityService = new LiveActivityService();
