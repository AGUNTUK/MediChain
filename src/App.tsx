import React, { useState, useEffect, Suspense, lazy } from "react";
import Splash from "./components/Splash";
import Login from "./components/Login";
import Home from "./components/Home";
import CartDrawer from "./components/CartDrawer";
import { PWAInstallPrompt } from "./pwa/PWAInstallPrompt";
import { CartFeedbackProvider } from "./context/FlyToCartContext";
import SafeBoundary from "./components/SafeBoundary";
import { Product, Pharmacy, Order, Notification, User } from "./types";
import { Home as HomeIcon, Search as SearchIcon, Package as PackageIcon, FileText as FileIcon, ClipboardList as ListIcon, User as UserIcon, Shield, Smartphone, ShoppingBag, Camera, X, Sparkles, MessageSquareText, AlertCircle } from "lucide-react";
import { authService, productService, orderService, profileService, notificationService, getLocalCartItems, liveActivityService } from "./services";
import { apiFetch } from "./lib/apiFetch";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";

const ProfileSetup = lazy(() => import("./components/ProfileSetup"));
const SearchSystem = lazy(() => import("./components/SearchSystem"));
const ProductDetails = lazy(() => import("./components/ProductDetails"));
const Cart = lazy(() => import("./components/Cart"));
const Checkout = lazy(() => import("./components/Checkout"));
const OrderSuccess = lazy(() => import("./components/OrderSuccess"));
const OrderTracking = lazy(() => import("./components/OrderTracking"));
const OrderHistory = lazy(() => import("./components/OrderHistory"));
const Account = lazy(() => import("./components/Account"));
const NotificationsPanel = lazy(() => import("./components/NotificationsPanel"));
const AdminPanel = lazy(() => import("./components/AdminPanel"));
const PharmacyPendingScreen = lazy(() => import("./components/PharmacyPendingScreen"));
const DepotDashboard = lazy(() => import("./components/DepotDashboard"));
const DeliveryDashboard = lazy(() => import("./components/DeliveryDashboard"));
const BulkDealsLanding = lazy(() => import("./components/BulkDealsLanding"));
import LegalPolicyModal from "./components/LegalPolicyModal";
import type { LegalPolicyTab } from "./components/LegalPolicyModal";
import PhysiciansProductSheet from "./components/PhysiciansProductSheet";

const LoadingScreen = () => (
  <div className="flex flex-col items-center justify-center min-h-[300px] h-full w-full bg-slate-50 p-6">
    <div className="relative mb-6">
      <div className="w-16 h-16 border-[3px] border-brand-purple/20 rounded-full"></div>
      <div className="w-16 h-16 border-[3px] border-transparent border-t-brand-purple rounded-full animate-spin absolute top-0 left-0"></div>
      <div className="w-16 h-16 border-[3px] border-transparent border-b-brand-lime rounded-full animate-spin absolute top-0 left-0" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
    </div>
    <p className="text-slate-600 text-sm font-semibold tracking-wide">Loading</p>
  </div>
);

// ---------------------------------------------------------------------------
// PROJECT CUTOVER MIGRATION: Purge stale auth tokens & cache from suspended DB
// ---------------------------------------------------------------------------
const ACTIVE_DB_VERSION = "prod_2_okwiohbwvvveecyhxawh";

function runProjectCutoverMigration() {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const currentVersion = localStorage.getItem("medichain_db_version");
    if (currentVersion !== ACTIVE_DB_VERSION) {
      console.log("[MediChain Cutover] Migrating local storage to active project prod_2_okwiohbwvvveecyhxawh...");
      const preservedCart = localStorage.getItem("medichain_active_cart");
      const preservedDraft = localStorage.getItem("medichain_cart_draft");
      
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith("sb-") ||
          key.includes("qboghbbrqfmexpbzvded") ||
          key.startsWith("medichain_token") ||
          key.startsWith("medichain_user") ||
          key.startsWith("medichain_pharmacy") ||
          key.startsWith("medichain_cache") ||
          key.startsWith("api_cache_") ||
          key.startsWith("products_")
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));

      if (preservedCart) localStorage.setItem("medichain_active_cart", preservedCart);
      if (preservedDraft) localStorage.setItem("medichain_cart_draft", preservedDraft);

      try {
        if (isSupabaseConfigured && supabase?.auth?.signOut) {
          supabase.auth.signOut({ scope: "local" }).catch(() => {});
        }
      } catch {}

      localStorage.setItem("medichain_db_version", ACTIVE_DB_VERSION);
    }
  } catch (err) {
    console.warn("[MediChain Cutover] Storage migration notice:", err);
  }
}

// Run cutover purge synchronously before any components mount
runProjectCutoverMigration();

export default function App() {
  // Standalone legal deep-link route detector (e.g. /privacy, /terms, /refund-policy, /compliance, or ?policy=terms)
  const getDirectLegalRoute = (): LegalPolicyTab | null => {
    try {
      const path = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const policyQuery = params.get("policy") || params.get("legal") || params.get("view");
      
      if (policyQuery) {
        const normalized = policyQuery.toLowerCase();
        if (["privacy", "terms", "refund", "compliance"].includes(normalized)) {
          return normalized as LegalPolicyTab;
        }
      }
      
      if (path.includes("/privacy")) return "privacy";
      if (path.includes("/terms")) return "terms";
      if (path.includes("/refund") || path.includes("/return")) return "refund";
      if (path.includes("/compliance") || path.includes("/regulatory")) return "compliance";
      return null;
    } catch {
      return null;
    }
  };

  const [directLegalTab, setDirectLegalTab] = useState<LegalPolicyTab | null>(getDirectLegalRoute);

  useEffect(() => {
    const handlePopState = () => {
      setDirectLegalTab(getDirectLegalRoute());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Mobile app navigation state
  const [appStep, setAppStep] = useState<"splash" | "login" | "setup" | "main" | "cart" | "checkout" | "success" | "tracking" | "bulk_deals">("splash");

  // Unconditional 1.5-second hard timer to guarantee Splash dismissal and eliminate black-screen deadlocks
  useEffect(() => {
    const forceUnblock = setTimeout(() => {
      setAppStep((prev) => {
        if (prev === "splash") {
          return "main";
        }
        return prev;
      });
    }, 1500);
    return () => clearTimeout(forceUnblock);
  }, []);
  const [activeTab, setActiveTab] = useState<"home" | "search" | "history" | "account">("home");
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [activeBulkCampaignId, setActiveBulkCampaignId] = useState<string | undefined>();
  const [showPhysiciansProductSheet, setShowPhysiciansProductSheet] = useState(false);
  const [showPhysiciansTooltip, setShowPhysiciansTooltip] = useState(false);

  const handlePhysiciansActionClick = () => {
    try {
      const hasDismissed = localStorage.getItem("medichain_physicians_tooltip_seen");
      if (!hasDismissed) {
        setShowPhysiciansTooltip(true);
        return;
      }
    } catch {
      // ignore
    }
    setShowPhysiciansProductSheet(true);
  };

  const handleDismissPhysiciansTooltip = (proceedToSheet: boolean = false) => {
    try {
      localStorage.setItem("medichain_physicians_tooltip_seen", "true");
    } catch {
      // ignore
    }
    setShowPhysiciansTooltip(false);
    if (proceedToSheet) {
      setShowPhysiciansProductSheet(true);
    }
  };

  // Core Data State
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(() => {
    try {
      const stored = localStorage.getItem("medichain_pharmacy");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("medichain_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [phone, setPhone] = useState(() => {
    try {
      const stored = localStorage.getItem("medichain_phone") || "";
      if (stored && stored.includes("@")) return "";
      return stored;
    } catch {
      return "";
    }
  });
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [favouriteIds, setFavouriteIds] = useState<string[]>([]);

  // UI state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string>("");
  const [cartCount, setCartCount] = useState(() => {
    try {
      return getLocalCartItems().reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
    } catch {
      return 0;
    }
  });
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>(() => {
    try {
      const qMap: Record<string, number> = {};
      getLocalCartItems().forEach(item => {
        if (item.productId) qMap[item.productId] = Number(item.quantity) || 0;
      });
      return qMap;
    } catch {
      return {};
    }
  });
  const [cartData, setCartData] = useState<{
    items: Array<any>;
    totalMrp: number;
    totalAmount: number;
    totalSavings: number;
    totalTierSavings?: number;
  } | null>(null);
  const [checkoutAuthPrompt, setCheckoutAuthPrompt] = useState<{
    title: string;
    message: string;
    actionText?: string;
    actionStep?: "login" | "setup";
  } | null>(null);

  // Sync products and credentials
  const refreshPharmacyProfile = async () => {
    try {
      setIsProfileLoading(true);
      const res = await Promise.race([
        apiFetch("/api/pharmacy/profile"),
        new Promise<any>((resolve) => setTimeout(() => resolve({ ok: false }), 8000))
      ]);

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          const roleLower = (data.user.role || "").toLowerCase().trim();
          if (data.user.email?.toLowerCase() === "kazisohel199813@gmail.com" || roleLower === "admin") {
            data.user.role = "Admin";
          }
          setCurrentUser(data.user);
          try { localStorage.setItem("medichain_user", JSON.stringify(data.user)); } catch {}
        }
        if (data.pharmacy) {
          const normPharm = {
            ...data.pharmacy,
            pharmacyName: data.pharmacy.pharmacyName || data.pharmacy.pharmacy_name,
            ownerName: data.pharmacy.ownerName || data.pharmacy.owner_name
          };
          setPharmacy(normPharm);
          try {
            localStorage.setItem("medichain_pharmacy", JSON.stringify(normPharm));
            localStorage.setItem("medichain_user_profile_cache", JSON.stringify(normPharm));
          } catch {}
          if (normPharm.phone) {
            setPhone(normPharm.phone);
            try { localStorage.setItem("medichain_phone", normPharm.phone); } catch {}
          }
          return normPharm;
        }
      }

      // Check localStorage cache before attempting external query
      try {
        const cachedRaw = localStorage.getItem("medichain_user_profile_cache") || localStorage.getItem("medichain_pharmacy");
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached && (cached.pharmacyName || cached.pharmacy_name)) {
            const normPharm = {
              ...cached,
              pharmacyName: cached.pharmacyName || cached.pharmacy_name,
              ownerName: cached.ownerName || cached.owner_name
            };
            setPharmacy(normPharm);
            if (normPharm.phone) setPhone(normPharm.phone);
            return normPharm;
          }
        }
      } catch {}

      // Direct client-side Supabase query fallback if backend API was degraded or returned empty
      if (isSupabaseConfigured && (!pharmacy || !pharmacy.pharmacyName)) {
        try {
          const { data: { user: sbUser } } = await supabase.auth.getUser();
          if (sbUser) {
            let { data: pharmData } = await supabase
              .from("pharmacies")
              .select("id, pharmacy_name, owner_name, phone, address, city, license_information, license_no, verification_status, created_at, user_id")
              .eq("user_id", sbUser.id)
              .maybeSingle();

            if (!pharmData) {
              const { data: uRow } = await supabase
                .from("users")
                .select("pharmacy_id")
                .eq("id", sbUser.id)
                .maybeSingle();
              if (uRow?.pharmacy_id) {
                const { data: pById } = await supabase
                  .from("pharmacies")
                  .select("id, pharmacy_name, owner_name, phone, address, city, license_information, license_no, verification_status, created_at, user_id")
                  .eq("id", uRow.pharmacy_id)
                  .maybeSingle();
                pharmData = pById;
              }
            }

            if (pharmData) {
              const normPharm: any = {
                id: pharmData.id,
                pharmacyName: pharmData.pharmacy_name || pharmData.pharmacyName || "",
                ownerName: pharmData.owner_name || pharmData.ownerName || "",
                phone: pharmData.phone || "",
                address: pharmData.address || "",
                city: pharmData.city || "",
                area: pharmData.city || "",
                licenseNo: pharmData.license_no || "",
                verificationStatus: pharmData.verification_status || "Approved"
              };
              setPharmacy(normPharm);
              try {
                localStorage.setItem("medichain_pharmacy", JSON.stringify(normPharm));
                localStorage.setItem("medichain_user_profile_cache", JSON.stringify(normPharm));
              } catch {}
              if (normPharm.phone) {
                setPhone(normPharm.phone);
                try { localStorage.setItem("medichain_phone", normPharm.phone); } catch {}
              }
              return normPharm;
            }
          }
        } catch (sbErr) {
          console.warn("Direct Supabase pharmacy refresh fallback notice:", sbErr);
        }
      }
    } catch (err) {
      console.error("Error refreshing pharmacy profile:", err);
      // Graceful fallback to cached profile on error
      try {
        const cachedRaw = localStorage.getItem("medichain_user_profile_cache") || localStorage.getItem("medichain_pharmacy");
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached && (cached.pharmacyName || cached.pharmacy_name)) {
            setPharmacy(cached);
            return cached;
          }
        }
      } catch {}
    } finally {
      setIsProfileLoading(false);
    }
  };

  const refreshOrders = async () => {
    try {
      const data = await orderService.getOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshNotifications = async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    }
  };

  const refreshCartCounter = async () => {
    try {
      // 1. Immediately read local cart from localStorage to set count and quantities synchronously (0ms)
      const local = getLocalCartItems();
      const localTotal = local.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0);
      const localQtyMap: Record<string, number> = {};
      local.forEach((item: any) => {
        if (item.productId) {
          localQtyMap[item.productId] = Number(item.quantity) || 0;
        }
      });
      setCartCount(localTotal);
      setCartQuantities(localQtyMap);

      // 2. Fetch full calculated cart data for drawer and checkout
      const data = await orderService.getCart();
      setCartData(data);
      const totalItems = data.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || localTotal;
      setCartCount(totalItems);

      const qtyMap: Record<string, number> = {};
      data.items?.forEach((item: any) => {
        const pId = item.productId || item.product?.id;
        if (pId) {
          qtyMap[pId] = item.quantity;
        }
      });
      setCartQuantities(prev => ({ ...prev, ...localQtyMap, ...qtyMap }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateCartQty = async (productId: string, currentQty: number, change: number, targetQty?: number) => {
    try {
      const newQty = targetQty !== undefined ? targetQty : currentQty + change;
      const effectiveNewQty = Math.max(0, newQty);
      const delta = effectiveNewQty - currentQty;

      setCartCount(prev => Math.max(0, prev + delta));
      setCartQuantities(prev => {
        if (effectiveNewQty <= 0) {
          const next = { ...prev };
          delete next[productId];
          return next;
        }
        return { ...prev, [productId]: effectiveNewQty };
      });
      if (effectiveNewQty <= 0) {
        await orderService.removeFromCart(productId);
      } else {
        await orderService.updateCartItem(productId, effectiveNewQty);
      }
      await refreshCartCounter();

      // Zero-egress live presence & broadcast telemetry (throttled 1.5s)
      try {
        const activeCart = getLocalCartItems();
        const totalAmount = activeCart.reduce((sum: number, it: any) => sum + (Number(it.sellingPrice || it.price || 0) * Number(it.quantity || 1)), 0);
        const totalUnits = activeCart.reduce((sum: number, it: any) => sum + Number(it.quantity || 1), 0);
        const previews = activeCart.slice(0, 10).map((it: any) => ({
          name: it.name || it.productName || "Medicine",
          qty: Number(it.quantity) || 1,
          price: Number(it.sellingPrice || it.price) || 0
        }));
        liveActivityService.trackCartUpdate(
          "Cart item",
          delta,
          totalUnits,
          totalAmount,
          previews
        );
      } catch {}
    } catch (err) {
      console.error(err);
    }
  };

  const refreshFavourites = async () => {
    try {
      const data = await productService.getFavouritesIds();
      setFavouriteIds(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFavourite = async (productId: string) => {
    try {
      await productService.toggleFavourite(productId);
      refreshFavourites();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // Initial fetch of static assets and verify existing session
    if (currentUser) {
      refreshPharmacyProfile();
    }

    if (isSupabaseConfigured) {
      // 1. Check active session on mount with a strict 4-second timeout to prevent UI hangs
      const sessionPromise = Promise.race([
        supabase.auth.getSession(),
        new Promise<any>((resolve) => setTimeout(() => resolve({ data: { session: null }, error: null }), 4000))
      ]);

      sessionPromise.then(async ({ data: { session }, error }: any) => {
        if (!error && session?.user) {
          const token = session.access_token;
          if (token) {
            localStorage.setItem("medichain_token", token);
          }
          try {
            const syncPromise = authService.syncActiveSession(token, session.user.user_metadata?.full_name || session.user.email);
            const syncData = await Promise.race([
              syncPromise,
              new Promise<any>((resolve) => setTimeout(() => resolve(null), 4000))
            ]);
            if (syncData && syncData.user) {
              handleLoginSuccess(syncData.user, syncData.needsSetup, syncData.pharmacy);
            }
          } catch (syncErr) {
            console.warn("OAuth initial session sync notice:", syncErr);
          }
        }
      }).catch((e: any) => console.warn("Supabase getSession notice:", e));

      // 2. Listen to real-time auth state events (e.g. SIGNED_IN from OAuth redirect)
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
        if (event === "SIGNED_IN" && session?.user) {
          const token = session.access_token;
          if (token) {
            localStorage.setItem("medichain_token", token);
          }
          try {
            const syncData = await authService.syncActiveSession(token, session.user.user_metadata?.full_name || session.user.email);
            if (syncData && syncData.user) {
              handleLoginSuccess(syncData.user, syncData.needsSetup, syncData.pharmacy);
            }
          } catch (syncErr) {
            console.warn("OAuth onAuthStateChange sync notice:", syncErr);
          }
        }
      });

      return () => {
        authListener?.subscription?.unsubscribe?.();
      };
    }
  }, []);

  useEffect(() => {
    if (currentUser && (pharmacy || ["Admin", "Depot Staff", "Delivery Staff"].includes(currentUser.role))) {
      const isSpecialRole = ["Admin", "Depot Staff", "Delivery Staff"].includes(currentUser.role);
      if (!isSpecialRole) {
        refreshOrders();
        refreshNotifications();
        refreshCartCounter();
        refreshFavourites();
      }
    } else if (!currentUser) {
      setOrders([]);
      setNotifications([]);
      setFavouriteIds([]);
      refreshCartCounter();
    }
  }, [currentUser?.id, pharmacy?.id]);

  // Initial cart load on app mount
  useEffect(() => {
    refreshCartCounter();
  }, []);

  // Global synchronization listener for Cart updates (batch adds, multi-tabs)
  useEffect(() => {
    const handleCartSync = () => {
      refreshCartCounter();
    };

    window.addEventListener("cartUpdated", handleCartSync);
    window.addEventListener("cart-updated", handleCartSync);
    window.addEventListener("storage", handleCartSync);

    return () => {
      window.removeEventListener("cartUpdated", handleCartSync);
      window.removeEventListener("cart-updated", handleCartSync);
      window.removeEventListener("storage", handleCartSync);
    };
  }, []);

  // Synchronize auth state changes to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("medichain_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("medichain_user");
    }
  }, [currentUser]);

  useEffect(() => {
    if (pharmacy) {
      localStorage.setItem("medichain_pharmacy", JSON.stringify(pharmacy));
    } else {
      localStorage.removeItem("medichain_pharmacy");
    }
  }, [pharmacy]);

  useEffect(() => {
    if (phone) {
      localStorage.setItem("medichain_phone", phone);
    } else {
      localStorage.removeItem("medichain_phone");
    }
  }, [phone]);

  // Real-time live presence telemetry (Zero DB egress: Supabase Realtime Presence & Broadcast)
  useEffect(() => {
    liveActivityService.initClientTelemetry(currentUser, pharmacy);
  }, [currentUser?.id, currentUser?.role, pharmacy?.id, (pharmacy as any)?.pharmacyName, (pharmacy as any)?.pharmacy_name]);

  // Track active screen/view changes
  useEffect(() => {
    let viewName = "Home";
    if (appStep === "cart") viewName = "Cart";
    else if (appStep === "checkout") viewName = "Checkout";
    else if (appStep === "tracking") viewName = "Tracking";
    else if (appStep === "bulk_deals") viewName = "Bulk Deals";
    else if (appStep === "success") viewName = "Order Placed";
    else if (appStep === "main") {
      if (activeTab === "search") viewName = "Search & Catalog";
      else if (activeTab === "history" || activeTab === "account") viewName = "Account & History";
      else viewName = "Home";
    }
    liveActivityService.trackViewChange(viewName);
  }, [appStep, activeTab]);

  // Compute unread count
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // Find an active order that needs delivery progress (oldest non-delivered order)
  const activeOrderToDeliver = orders.find(o => o.status !== "Delivered");

  // Authentication callbacks
  const handleLoginSuccess = async (user: any, needsSetup: boolean | null, incomingPharmacy?: any) => {
    const rawPhone = user.phone || incomingPharmacy?.phone || "";
    const cleanPhone = rawPhone && !rawPhone.includes("@") ? rawPhone : "";
    setPhone(cleanPhone);
    setCurrentUser(user);
    try {
      localStorage.setItem("medichain_user", JSON.stringify(user));
    } catch (e) {
      console.warn(e);
    }
    if (cleanPhone) {
      try {
        localStorage.setItem("medichain_phone", cleanPhone);
      } catch (e) {
        console.warn(e);
      }
    }

    const activeIncomingName = incomingPharmacy?.pharmacyName || incomingPharmacy?.pharmacy_name;
    if (incomingPharmacy && activeIncomingName) {
      const normPharm = {
        ...incomingPharmacy,
        pharmacyName: activeIncomingName,
        ownerName: incomingPharmacy.ownerName || incomingPharmacy.owner_name
      };
      setPharmacy(normPharm);
      try {
        localStorage.setItem("medichain_pharmacy", JSON.stringify(normPharm));
      } catch (e) {
        console.warn(e);
      }
    }

    const roleLower = (user?.role || (user as any)?.user_metadata?.role || "").toLowerCase().trim();
    const isAdminOrStaff = ["admin", "depot staff", "delivery staff"].includes(roleLower) || user?.email?.toLowerCase() === "kazisohel199813@gmail.com";
    if (isAdminOrStaff) {
      if (roleLower === "admin" || user?.email?.toLowerCase() === "kazisohel199813@gmail.com") {
        user.role = "Admin";
      }
      setCurrentUser(user);
      setAppStep("main");
      return;
    }

    const hasIncomingPharmacy = Boolean(incomingPharmacy && activeIncomingName);
    const hasLocalPharmacy = Boolean(pharmacy && (pharmacy.pharmacyName || (pharmacy as any)?.pharmacy_name));
    const hasKnownPharmacyId = Boolean(user?.pharmacy_id || incomingPharmacy?.id);

    // Check cached profile
    let hasCachedPharmacy = false;
    try {
      const cached = localStorage.getItem("medichain_user_profile_cache") || localStorage.getItem("medichain_pharmacy");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && (parsed.pharmacyName || parsed.pharmacy_name)) {
          hasCachedPharmacy = true;
          setPharmacy(parsed);
        }
      }
    } catch {}

    if (hasIncomingPharmacy || hasLocalPharmacy || hasKnownPharmacyId || hasCachedPharmacy) {
      // We already have confirmed pharmacy data — go straight to main
      setAppStep("main");
      refreshPharmacyProfile();
      return;
    }

    if (needsSetup === true && !hasCachedPharmacy) {
      // Definitively new registration needed
      setAppStep("setup");
      return;
    }

    // Default to main directly - refresh in background
    setAppStep("main");
    refreshPharmacyProfile();
  };

  const handleSetupComplete = () => {
    refreshPharmacyProfile();
    setAppStep("main");
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.error(err);
    } finally {
      setPharmacy(null);
      setPhone("");
      setCurrentUser(null);
      localStorage.removeItem("medichain_user");
      localStorage.removeItem("medichain_pharmacy");
      localStorage.removeItem("medichain_phone");
      setAppStep("login");
    }
  };

  // Add to cart proxy callback with 100% client-side 0ms instant optimistic UI updates & 0 DB egress
  const handleAddToCart = async (productId: string, qty: number, productObj?: Product): Promise<boolean> => {
    const addQty = Math.max(1, qty || 1);

    // 1. Synchronously update local active cart in localStorage (0ms latency, 0 DB egress)
    orderService.addToCart(productId, addQty, productObj);

    // 2. Shathe shathe cart a add (0ms Instant Optimistic UI Update)
    setCartCount(prev => prev + addQty);
    setCartQuantities(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + addQty
    }));

    // 3. Refresh cart state in-memory
    await refreshCartCounter();

    // 4. Broadcast live cart telemetry (throttled 1.5s, 0 DB egress)
    try {
      const activeCart = getLocalCartItems();
      const totalAmount = activeCart.reduce((sum: number, it: any) => sum + (Number(it.sellingPrice || it.price || 0) * Number(it.quantity || 1)), 0);
      const totalUnits = activeCart.reduce((sum: number, it: any) => sum + Number(it.quantity || 1), 0);
      const previews = activeCart.slice(0, 10).map((it: any) => ({
        name: it.name || it.productName || "Medicine",
        qty: Number(it.quantity) || 1,
        price: Number(it.sellingPrice || it.price) || 0
      }));
      liveActivityService.trackCartUpdate(
        productObj?.name || "Medicine",
        addQty,
        totalUnits,
        totalAmount,
        previews
      );
    } catch {}

    return true;
  };

  // Enforces authentication and pharmacy verification before proceeding to checkout
  const handleProceedToCheckout = () => {
    if (!currentUser) {
      setCheckoutAuthPrompt({
        title: "লগইন আবশ্যক",
        message: "অর্ডার কনফার্ম করার জন্য অনুগ্রহ করে আপনার ফার্মেসি অ্যাকাউন্টে লগইন করুন। আপনার কার্টের সব ওষুধ সুরক্ষিত থাকবে।",
        actionText: "লগইন করুন",
        actionStep: "login"
      });
      return;
    }

    const hasPharmacy = Boolean(pharmacy && (pharmacy.pharmacyName || (pharmacy as any).pharmacy_name));
    if (!hasPharmacy) {
      setCheckoutAuthPrompt({
        title: "ফার্মেসি প্রোফাইল প্রয়োজন",
        message: "অর্ডার কনফার্ম করতে আপনার ফার্মেসির ড্রাগ লাইসেন্স ও ঠিকানা সেটআপ করা প্রয়োজন।",
        actionText: "প্রোফাইল সেটআপ করুন",
        actionStep: "setup"
      });
      return;
    }

    const st = (pharmacy.verificationStatus || (pharmacy as any).verification_status || "").toString().toLowerCase();
    if (st !== "approved" && st !== "verified") {
      setCheckoutAuthPrompt({
        title: "ফার্মেসি ভেরিফিকেশন প্রক্রিয়াধীন",
        message: "আপনার ফার্মেসি ভেরিফিকেশন এখনও প্রক্রিয়াধীন রয়েছে। MediChain টিম ড্রাগ লাইসেন্স যাচাই সম্পন্ন করার পর অর্ডার প্লেস করতে পারবেন।"
      });
      return;
    }

    // Broadcast checkout intent to admin live radar
    const totalVal = cartData?.totalAmount || 0;
    liveActivityService.trackCheckoutIntent(totalVal, cartCount);

    setAppStep("checkout");
  };

  // Custom Operations cockpit triggers
  const handleTriggerPriceDrop = async () => {
    try {
      await productService.triggerAdminPriceDrop();
      refreshNotifications();
      
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerNewOffer = async () => {
    try {
      await productService.triggerAdminNewOffer();
      refreshNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateDeliveryStatus = async () => {
    if (!activeOrderToDeliver) return;
    const statuses: Array<"Confirmed" | "Processing" | "Packed" | "Out for Delivery" | "Delivered"> = [
      "Confirmed",
      "Processing",
      "Packed",
      "Out for Delivery",
      "Delivered"
    ];
    const currentIdx = statuses.indexOf(activeOrderToDeliver.status as any);
    if (currentIdx < statuses.length - 1) {
      const nextStatus = statuses[currentIdx + 1];
      try {
        await orderService.updateOrderStatus(activeOrderToDeliver.id, nextStatus);
        refreshOrders();
        
        refreshPharmacyProfile();
        refreshNotifications();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Render proper sub-screens in the Mobile frame
  const renderMobileContent = () => {
    // Verification check for non-admin/staff pharmacy users
    const isSpecialAdminOrStaff = ["Admin", "Depot Staff", "Delivery Staff"].includes(currentUser?.role || "") ||
      currentUser?.email?.toLowerCase() === "kazisohel199813@gmail.com";

    if (currentUser && !isSpecialAdminOrStaff) {
      if (appStep !== "splash" && appStep !== "login" && appStep !== "setup") {
        const isSuspended = pharmacy?.verificationStatus === "Suspended" || pharmacy?.verificationStatus === "Rejected";
        if (isSuspended && pharmacy) {
          return (
            <Suspense fallback={<LoadingScreen />}>
              <PharmacyPendingScreen
                pharmacy={pharmacy}
                onRefreshStatus={refreshPharmacyProfile}
                onLogout={handleLogout}
              />
            </Suspense>
          );
        }
      }
    }

    switch (appStep) {
      case "splash":
        return (
          <Splash
            onComplete={() => {
              if (currentUser || localStorage.getItem("medichain_user")) {
                setAppStep("main");
              } else {
                setAppStep("login");
              }
            }}
          />
        );
      case "login":
        return <Login onLoginSuccess={handleLoginSuccess} />;
      case "setup":
        return (
          <Suspense fallback={<LoadingScreen />}>
            <ProfileSetup phone={phone} onSetupComplete={handleSetupComplete} onBack={() => setAppStep("login")} />
          </Suspense>
        );
      case "cart":
        return (
          <Suspense fallback={<LoadingScreen />}>
            <Cart
              onBack={() => setAppStep("main")}
              onCheckoutTrigger={handleProceedToCheckout}
              onRefreshCartCounter={refreshCartCounter}
            />
          </Suspense>
        );
      case "bulk_deals":
        return (
          <Suspense fallback={<LoadingScreen />}>
            <BulkDealsLanding
              onBack={() => setAppStep("main")}
              onAddToCart={handleAddToCart}
              cartQuantities={cartQuantities}
              onUpdateCartQty={handleUpdateCartQty}
              campaignId={activeBulkCampaignId}
            />
          </Suspense>
        );
      case "checkout":
        return (
          <Suspense fallback={<LoadingScreen />}>
            <Checkout
              onBackToCart={() => setAppStep("cart")}
              onOrderPlaced={(orderId) => {
                const finalTotal = cartData?.totalAmount || 0;
                liveActivityService.trackOrderPlaced(orderId, finalTotal);
                refreshOrders();
                refreshPharmacyProfile();
                
                refreshCartCounter();
                setTrackingOrderId(orderId);
                setAppStep("success");
              }}
              pharmacy={pharmacy}
            />
          </Suspense>
        );
      case "success":
        return (
          <Suspense fallback={<LoadingScreen />}>
            <OrderSuccess
              orderId={trackingOrderId}
              onTrackOrder={(orderId) => {
                setTrackingOrderId(orderId);
                setAppStep("tracking");
              }}
              onContinueShopping={() => {
                setAppStep("main");
                setActiveTab("home");
              }}
            />
          </Suspense>
        );
      case "tracking":
        return (
          <Suspense fallback={<LoadingScreen />}>
            <OrderTracking
              orderId={trackingOrderId}
              userRole={currentUser?.role as any}
              onBack={() => {
                setAppStep("main");
                setActiveTab("account");
              }}
              onRefreshStats={() => {
                
                refreshPharmacyProfile();
                refreshOrders();
              }}
            />
          </Suspense>
        );
      case "main":
      default:
        // Render depending on active bottom tab
        switch (activeTab) {
          case "search":
            return (
              <Suspense fallback={<LoadingScreen />}>
                <SearchSystem
                  onAddToCart={handleAddToCart}
                  onToggleFavourite={handleToggleFavourite}
                  favouriteIds={favouriteIds}
                  onOpenProductDetails={(p) => setSelectedProduct(p)}
                  orders={orders}
                  cartQuantities={cartQuantities}
                  onUpdateCartQty={handleUpdateCartQty}
                  onOpenCart={() => {
                    refreshCartCounter();
                    setIsCartDrawerOpen(true);
                  }}
                  cartCount={cartCount}
                />
              </Suspense>
            );
          case "history":
          case "account":
            return (
              <Suspense fallback={<LoadingScreen />}>
                <Account
                  pharmacy={pharmacy}
                  currentUser={currentUser}
                  onLogout={handleLogout}
                  onAddToCart={handleAddToCart}
                  favouriteIds={favouriteIds}
                  onRefreshProfile={refreshPharmacyProfile}
                  onTrackOrder={(orderId) => {
                    setTrackingOrderId(orderId);
                    setAppStep("tracking");
                  }}
                  onRefreshCart={refreshCartCounter}
                  onTriggerTab={(tab) => {
                    if (tab === "cart") {
                      refreshCartCounter();
                      setIsCartDrawerOpen(true);
                    } else if (tab === "history") {
                      setActiveTab("account");
                    } else {
                      setActiveTab(tab as any);
                    }
                  }}
                  initialTab={activeTab === "history" ? "orders" : "profile"}
                />
              </Suspense>
            );
          case "home":
          default:
            return (
              <Home
                onTriggerSearch={(query, cat) => {
                  setActiveTab("search");
                }}
                onAddToCart={handleAddToCart}
                onToggleFavourite={handleToggleFavourite}
                favouriteIds={favouriteIds}
                pharmacyId={pharmacy?.id}
                pharmacyName={pharmacy?.pharmacyName || "Sohel Pharma"}
                onOpenProductDetails={(p) => setSelectedProduct(p)}
                onOpenNotifications={() => setShowNotifications(true)}
                unreadNotificationsCount={unreadNotificationsCount}
                cartQuantities={cartQuantities}
                onUpdateCartQty={handleUpdateCartQty}
                onOpenCart={() => {
                  refreshCartCounter();
                  setIsCartDrawerOpen(true);
                }}
                cartCount={cartCount}
                orders={orders}
                onTrackOrder={(orderId) => {
                  setTrackingOrderId(orderId);
                  setAppStep("tracking");
                }}
                onOpenBulkDeals={(campaignId) => {
                  if (campaignId) setActiveBulkCampaignId(campaignId);
                  setAppStep("bulk_deals");
                }}
              />
            );
        }
    }
  };

  // If user or app store reviewer navigated directly to a legal deep-link (e.g., /privacy, /terms, ?policy=...)
  if (directLegalTab) {
    return (
      <SafeBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <LegalPolicyModal
            isStandalone={true}
            initialTab={directLegalTab}
            onClose={() => {
              setDirectLegalTab(null);
              window.history.pushState({}, "", "/");
            }}
          />
        </Suspense>
      </SafeBoundary>
    );
  }

  if (currentUser?.role === "Admin") {
    return (
      <SafeBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <AdminPanel currentUser={currentUser} onLogout={handleLogout} />
        </Suspense>
      </SafeBoundary>
    );
  }

  if (currentUser?.role === "Depot Staff") {
    return (
      <SafeBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <DepotDashboard currentUser={currentUser} onLogout={handleLogout} />
        </Suspense>
      </SafeBoundary>
    );
  }

  if (currentUser?.role === "Delivery Staff") {
    return (
      <SafeBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <DeliveryDashboard currentUser={currentUser} onLogout={handleLogout} />
        </Suspense>
      </SafeBoundary>
    );
  }

  return (
    <SafeBoundary>
      <CartFeedbackProvider>
        <div className="flex h-screen w-screen bg-slate-50 font-sans select-none overflow-hidden justify-center items-center">
          <div className="w-full h-full lg:max-w-7xl lg:border-x lg:border-slate-200 bg-white shadow-2xl relative flex flex-col overflow-hidden">
          {/* Screen Content */}
          <div className="flex-1 overflow-hidden relative page-enter">
            {renderMobileContent()}
            
            {/* Floating product details overlay */}
            {selectedProduct && (
              <Suspense fallback={<LoadingScreen />}>
                <ProductDetails
                  product={selectedProduct}
                  onClose={() => setSelectedProduct(null)}
                  onAddToCart={(pid, qty, prod) => handleAddToCart(pid, qty, prod || selectedProduct)}
                  onSelectProduct={(p) => setSelectedProduct(p)}
                />
              </Suspense>
            )}

            {/* Broadcast notifications panel overlay */}
            {showNotifications && (
              <Suspense fallback={<LoadingScreen />}>
                <NotificationsPanel
                  onClose={() => {
                    setShowNotifications(false);
                    refreshNotifications();
                  }}
                  onRefreshNotifications={() => {
                    refreshNotifications();
                  }}
                />
              </Suspense>
            )}
          </div>

          {/* Modern Slide-Over Cart Drawer */}
          <CartDrawer
            isOpen={isCartDrawerOpen}
            onClose={() => setIsCartDrawerOpen(false)}
            cartData={cartData}
            cartCount={cartCount}
            onUpdateCartQty={handleUpdateCartQty}
            onRemoveItem={async (productId) => {
              await orderService.removeFromCart(productId);
              await refreshCartCounter();
            }}
            onCheckoutTrigger={() => {
              setIsCartDrawerOpen(false);
              handleProceedToCheckout();
            }}
            onBrowseCatalog={() => {
              setActiveTab("search");
            }}
          />

          <PWAInstallPrompt />

          {/* Physicians Product Sheet */}
          {showPhysiciansProductSheet && (
            <PhysiciansProductSheet onClose={() => setShowPhysiciansProductSheet(false)} />
          )}

          {/* Checkout Auth & Verification Prompt Dialog */}
          {checkoutAuthPrompt && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[999] select-none animate-fade-in">
              <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-scale-up">
                <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-base font-black text-slate-900">{checkoutAuthPrompt.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{checkoutAuthPrompt.message}</p>
                </div>
                <div className="flex gap-2 pt-2">
                  {checkoutAuthPrompt.actionStep && checkoutAuthPrompt.actionText ? (
                    <>
                      <button
                        onClick={() => setCheckoutAuthPrompt(null)}
                        className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        পরে করব
                      </button>
                      <button
                        onClick={() => {
                          const target = checkoutAuthPrompt.actionStep;
                          setCheckoutAuthPrompt(null);
                          if (target) setAppStep(target);
                        }}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-black shadow-md transition-all cursor-pointer"
                      >
                        {checkoutAuthPrompt.actionText}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setCheckoutAuthPrompt(null)}
                      className="w-full py-2.5 px-3 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-black shadow-md transition-all cursor-pointer"
                    >
                      বুঝেছি
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bottom persistent Nav Bar */}
          {appStep === "main" && (
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] px-2 sm:px-6 lg:px-12 pt-2.5 pb-[max(12px,env(safe-area-inset-bottom))] flex items-center justify-between lg:max-w-7xl lg:left-1/2 lg:-translate-x-1/2">
              {/* Home */}
              <button
                onClick={() => setActiveTab("home")}
                className={`flex flex-col items-center gap-1 cursor-pointer transition-all flex-1 ${
                  activeTab === "home" ? "text-brand-purple scale-105" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <HomeIcon className="w-5.5 h-5.5" />
                <span className="text-[10px] sm:text-xs font-black">হোম</span>
              </button>

              {/* Search */}
              <button
                onClick={() => setActiveTab("search")}
                className={`flex flex-col items-center gap-1 cursor-pointer transition-all flex-1 ${
                  activeTab === "search" ? "text-brand-purple scale-105" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <PackageIcon className="w-5.5 h-5.5" />
                <span className="text-[10px] sm:text-xs font-black">ওষুধ খুঁজুন</span>
              </button>

              {/* Center Floating Action Button (Short List) */}
              <div className="relative flex-1 flex justify-center h-full">
                {/* One-time dismissible tooltip for Short List */}
                {showPhysiciansTooltip && (
                  <div className="absolute bottom-20 sm:bottom-22 z-50 w-72 sm:w-80 bg-slate-900 text-white rounded-2xl p-3.5 shadow-2xl border border-slate-700 animate-fade-in pointer-events-auto">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-brand-lime text-xs font-black">
                        <span className="px-1.5 py-0.5 bg-brand-lime/20 rounded-md border border-brand-lime/40 text-[10px]">
                          শর্ট লিস্ট সার্ভিস
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDismissPhysiciansTooltip(false)}
                        className="p-1 text-slate-400 hover:text-white rounded-full transition-colors cursor-pointer"
                        title="বন্ধ করুন"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs font-medium text-slate-200 mt-2 leading-relaxed">
                      এটি ফার্মেসির 'শর্ট লিস্ট' পিকচার পাঠানোর জন্য — খাতা বা ওষুধের শর্ট লিস্টের ছবি সরাসরি আমাদের টিমের কাছে পাঠানো হবে, ক্যাটালগ ম্যাচিং ছাড়াই
                    </p>
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleDismissPhysiciansTooltip(true)}
                        className="px-3 py-1.5 bg-gradient-to-r from-brand-purple to-purple-600 hover:opacity-90 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shadow-purple-900/50 flex items-center gap-1"
                      >
                        <span>বুঝেছি, এগিয়ে যান</span>
                        <span>→</span>
                      </button>
                    </div>
                    {/* Arrow pointing down towards button */}
                    <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45 border-r border-b border-slate-700"></div>
                  </div>
                )}

                <div className="absolute -top-7 sm:-top-8 flex justify-center">
                  <div className="relative">
                    {/* Fake cutout shadow/curve effect */}
                    <div className="absolute inset-0 bg-white rounded-full shadow-[0_-5px_10px_-5px_rgba(0,0,0,0.1)] scale-110"></div>
                    <button
                      type="button"
                      onClick={handlePhysiciansActionClick}
                      title="ফার্মেসির শর্ট লিস্ট পাঠান"
                      className="relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-brand-purple via-indigo-600 to-brand-lime text-white shadow-lg flex flex-col items-center justify-center transform transition-transform hover:scale-105 active:scale-95 cursor-pointer group"
                    >
                      <div className="relative flex items-center justify-center">
                        <Camera className="w-5.5 h-5.5 sm:w-6 sm:h-6 text-white drop-shadow-xs" />
                        <span className="absolute -top-1.5 -right-2 bg-brand-lime text-slate-950 text-[8px] font-black px-1 rounded-full border border-brand-purple shadow-xs">
                          Rx
                        </span>
                      </div>
                      <span className="text-[7.5px] sm:text-[8.5px] font-extrabold text-white tracking-tight -mt-0.5 leading-none">
                        শর্ট লিস্ট
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Cart */}
              <button
                onClick={() => {
                  refreshCartCounter();
                  setIsCartDrawerOpen(true);
                }}
                className="flex flex-col items-center gap-1 cursor-pointer transition-all relative text-slate-400 hover:text-brand-purple group flex-1"
                title="কার্ট দেখুন"
              >
                <div className="relative p-1 rounded-xl group-hover:bg-brand-purple/10 transition-colors">
                  <ShoppingBag className="w-5.5 h-5.5 text-slate-600 group-hover:text-brand-purple group-hover:scale-110 transition-transform" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-brand-lime text-slate-950 font-black text-[10px] min-w-4.5 h-4.5 px-1 rounded-full flex items-center justify-center shadow-xs border border-white">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] sm:text-xs font-black text-slate-600 group-hover:text-brand-purple">কার্ট</span>
              </button>

              {/* Account */}
              <button
                onClick={() => setActiveTab("account")}
                className={`flex flex-col items-center gap-1 cursor-pointer transition-all flex-1 ${
                  activeTab === "account" || activeTab === "history" ? "text-brand-purple scale-105" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <UserIcon className="w-5.5 h-5.5" />
                <span className="text-[10px] sm:text-xs font-black">প্রোফাইল</span>
              </button>
            </div>
          )}
        </div>
      </div>
      </CartFeedbackProvider>
    </SafeBoundary>
  );
}
