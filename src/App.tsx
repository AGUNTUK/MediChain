import React, { useState, useEffect, Suspense, lazy } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import Splash from "./components/Splash";
import Login from "./components/Login";
import Home from "./components/Home";
import CartDrawer from "./components/CartDrawer";
import { PWAInstallPrompt } from "./pwa/PWAInstallPrompt";
import PushNotificationPrompt from "./components/PushNotificationPrompt";
import { CartFeedbackProvider } from "./context/FlyToCartContext";
import CartBurst from "./components/CartBurst";
import SafeBoundary from "./components/SafeBoundary";
import { Product, Pharmacy, Order, Notification, User } from "./types";
import { Home as HomeIcon, Search as SearchIcon, Package as PackageIcon, FileText as FileIcon, ClipboardList as ListIcon, User as UserIcon, Shield, Smartphone, ShoppingBag } from "lucide-react";
import { authService, productService, orderService, profileService, notificationService } from "./services";

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
const LegalPolicyModal = lazy(() => import("./components/LegalPolicyModal"));
import type { LegalPolicyTab } from "./components/LegalPolicyModal";

const LoadingScreen = () => (
  <div className="flex flex-col items-center justify-center h-full w-full bg-slate-50">
    <div className="relative mb-6">
      <div className="w-16 h-16 border-[3px] border-brand-purple/20 rounded-full"></div>
      <div className="w-16 h-16 border-[3px] border-transparent border-t-brand-purple rounded-full animate-spin absolute top-0 left-0"></div>
      <div className="w-16 h-16 border-[3px] border-transparent border-b-brand-lime rounded-full animate-spin absolute top-0 left-0" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
    </div>
    <p className="text-slate-600 text-sm font-semibold tracking-wide">Loading</p>
  </div>
);

// Global fetch interceptor to inject session fallback headers for iframe environment
try {
  const originalFetch = window.fetch;
  Object.defineProperty(window, "fetch", {
    value: async function (input: RequestInfo | URL, init?: RequestInit) {
      try {
        const userStr = localStorage.getItem("medichain_user");
        const pharmacyStr = localStorage.getItem("medichain_pharmacy");

        if (userStr) {
          const user = JSON.parse(userStr);
          const pharmacy = pharmacyStr ? JSON.parse(pharmacyStr) : null;

          init = init || {};
          const headers = init.headers ? new Headers(init.headers) : new Headers();
          if (user.id) headers.set("x-session-user-id", user.id);
          if (user.email) headers.set("x-session-user-email", user.email);
          if (user.role) headers.set("x-session-user-role", user.role);
          if (user.name) headers.set("x-session-user-name", user.name);
          const pharmId = pharmacy?.id || user.pharmacy_id;
          if (pharmId) {
            headers.set("x-session-pharmacy-id", pharmId);
          }
          init.headers = headers;
        }
      } catch (err) {
        console.error("Fetch interceptor session inject error:", err);
      }
      
      const response = await originalFetch(input, init);
      
      if (response.status === 401 && typeof input === "string" && !input.includes("/api/auth")) {
        const hadUser = localStorage.getItem("medichain_user");
        if (hadUser) {
          localStorage.removeItem("medichain_user");
          localStorage.removeItem("medichain_pharmacy");
          window.dispatchEvent(new Event("auth-expired"));
        }
      }
      
      return response;
    },
    writable: true,
    configurable: true,
    enumerable: true
  });
} catch (err) {
  console.error("Failed to intercept fetch via Object.defineProperty:", err);
}

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
  const [activeTab, setActiveTab] = useState<"home" | "search" | "history" | "account">("home");
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [activeBulkCampaignId, setActiveBulkCampaignId] = useState<string | undefined>();

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
  const [isProfileLoading, setIsProfileLoading] = useState(() => {
    try {
      const stored = localStorage.getItem("medichain_user");
      return Boolean(stored);
    } catch {
      return false;
    }
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [favouriteIds, setFavouriteIds] = useState<string[]>([]);

  // UI state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState<string>("");
  const [cartCount, setCartCount] = useState(0);
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({});
  const [cartData, setCartData] = useState<{
    items: Array<{ product: Product; quantity: number }>;
    totalMrp: number;
    totalAmount: number;
    totalSavings: number;
  } | null>(null);

  // Sync products and credentials
  const refreshPharmacyProfile = async () => {
    try {
      setIsProfileLoading(true);
      const headers: Record<string, string> = {};
      const activeUser = currentUser || (() => {
        try {
          const s = localStorage.getItem("medichain_user");
          return s ? JSON.parse(s) : null;
        } catch { return null; }
      })();

      if (activeUser?.id) {
        headers["x-session-user-id"] = activeUser.id;
        if (activeUser.email) headers["x-session-user-email"] = activeUser.email;
        if (activeUser.role) headers["x-session-user-role"] = activeUser.role;
        if (activeUser.name) headers["x-session-user-name"] = activeUser.name;
        if (activeUser.pharmacy_id) headers["x-session-pharmacy-id"] = activeUser.pharmacy_id;
      }

      let res = await fetch("/api/pharmacy/profile", { headers });

      // Auto-reconnect session if 401 occurs
      if (res.status === 401 && activeUser) {
        try {
          const syncRes = await fetch("/api/auth/sync-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: activeUser.id,
              email: activeUser.email,
              name: activeUser.name || "Pharmacy Owner",
              role: activeUser.role || "Pharmacy Owner"
            })
          });
          if (syncRes.ok) {
            const syncData = await syncRes.json();
            if (syncData.user) {
              setCurrentUser(syncData.user);
              try { localStorage.setItem("medichain_user", JSON.stringify(syncData.user)); } catch {}
            }
            if (syncData.pharmacy) {
              setPharmacy(syncData.pharmacy);
              try { localStorage.setItem("medichain_pharmacy", JSON.stringify(syncData.pharmacy)); } catch {}
              if (syncData.pharmacy.phone) {
                setPhone(syncData.pharmacy.phone);
                try { localStorage.setItem("medichain_phone", syncData.pharmacy.phone); } catch {}
              }
            }
            return syncData.pharmacy;
          }
        } catch (syncErr) {
          console.warn("Auto session recovery failed:", syncErr);
        }
      }

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
          try { localStorage.setItem("medichain_user", JSON.stringify(data.user)); } catch {}
        }
        if (data.pharmacy) {
          setPharmacy(data.pharmacy);
          try { localStorage.setItem("medichain_pharmacy", JSON.stringify(data.pharmacy)); } catch {}
          if (data.pharmacy.phone) {
            setPhone(data.pharmacy.phone);
            try { localStorage.setItem("medichain_phone", data.pharmacy.phone); } catch {}
          }
        }
        return data.pharmacy;
      }
    } catch (err) {
      console.error("Error refreshing pharmacy profile:", err);
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
      const data = await orderService.getCart();
      setCartData(data);
      const totalItems = data.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0;
      setCartCount(totalItems);

      const qtyMap: Record<string, number> = {};
      data.items?.forEach((item: any) => {
        qtyMap[item.productId] = item.quantity;
      });
      setCartQuantities(qtyMap);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateCartQty = async (productId: string, currentQty: number, change: number) => {
    try {
      const newQty = currentQty + change;
      if (newQty <= 0) {
        await orderService.removeFromCart(productId);
      } else {
        await orderService.updateCartItem(productId, newQty);
      }
      await refreshCartCounter();
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
      setCartCount(0);
      setFavouriteIds([]);
    }
  }, [currentUser?.id, pharmacy?.id]);

  // Global synchronization listener for Cart updates (SmartOrder, batch adds, multi-tabs)
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

  // Compute unread count
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // Find an active order that needs delivery progress (oldest non-delivered order)
  const activeOrderToDeliver = orders.find(o => o.status !== "Delivered");

  // Authentication callbacks
  const handleLoginSuccess = (user: any, needsSetup: boolean, incomingPharmacy?: any) => {
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

    if (incomingPharmacy && incomingPharmacy.pharmacyName) {
      setPharmacy(incomingPharmacy);
      try {
        localStorage.setItem("medichain_pharmacy", JSON.stringify(incomingPharmacy));
      } catch (e) {
        console.warn(e);
      }
    }

    const isSpecialRole = ["Admin", "Depot Staff", "Delivery Staff"].includes(user.role);
    const hasExistingPharmacy = Boolean(
      (incomingPharmacy && incomingPharmacy.pharmacyName) || 
      (pharmacy && pharmacy.pharmacyName)
    );

    if (needsSetup && !hasExistingPharmacy && !isSpecialRole) {
      setAppStep("setup");
    } else {
      setAppStep("main");
    }
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

  // Add to cart proxy callback
  const handleAddToCart = async (productId: string, qty: number): Promise<boolean> => {
    try {
      await orderService.addToCart(productId, qty);
      await refreshCartCounter();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
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
    const currentIdx = statuses.indexOf(activeOrderToDeliver.status);
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
    if (currentUser && !["Admin", "Depot Staff", "Delivery Staff"].includes(currentUser.role)) {
      if (appStep !== "splash" && appStep !== "login" && appStep !== "setup") {
        if (isProfileLoading && !pharmacy) {
          return <LoadingScreen />;
        }
        if (!pharmacy || !pharmacy.pharmacyName) {
          return (
            <Suspense fallback={<LoadingScreen />}>
              <ProfileSetup phone={phone} onSetupComplete={handleSetupComplete} onBack={() => setAppStep("login")} />
            </Suspense>
          );
        }
        const isVerified = pharmacy.verificationStatus === "Approved" || pharmacy.verificationStatus === "Verified" || (pharmacy.verificationStatus as string) === "verified" || (pharmacy.verificationStatus as string) === "approved";
        if (!isVerified) {
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
              if (currentUser) {
                const isSpecialRole = ["Admin", "Depot Staff", "Delivery Staff"].includes(currentUser.role);
                if (isSpecialRole || (pharmacy && pharmacy.pharmacyName) || isProfileLoading) {
                  setAppStep("main");
                } else {
                  setAppStep("setup");
                }
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
              onCheckoutTrigger={() => setAppStep("checkout")}
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
                setActiveTab("history");
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
            return (
              <Suspense fallback={<LoadingScreen />}>
                <OrderHistory
                  onTrackOrder={(orderId) => {
                    setTrackingOrderId(orderId);
                    setAppStep("tracking");
                  }}
                  onRefreshCart={refreshCartCounter}
                  onTriggerTab={(tab) => {
                    if (tab === "cart") {
                      refreshCartCounter();
                      setIsCartDrawerOpen(true);
                    } else {
                      setActiveTab(tab as any);
                    }
                  }}
                />
              </Suspense>
            );
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
                  onTriggerTab={(tab) => setActiveTab(tab as any)}
                  onSwitchPersona={async (role) => {
                    const roleEmailMap: Record<string, string> = {
                      "Pharmacy Owner": "pharmacy@medichain.com",
                      "Admin": "admin@medichain.com",
                      "Depot Staff": "depot@medichain.com",
                      "Delivery Staff": "delivery@medichain.com"
                    };
                    const targetEmail = roleEmailMap[role] || "pharmacy@medichain.com";
                    try {
                      const data = await authService.login(targetEmail, "123456");
                      handleLoginSuccess(data.user, data.needsSetup);
                    } catch (e) {
                      console.error(e);
                    }
                  }}
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
                pharmacyName={pharmacy?.pharmacyName || "City Pharma"}
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
      <Suspense fallback={<LoadingScreen />}>
        <AdminPanel currentUser={currentUser} onLogout={handleLogout} />
        <Analytics />
        <SpeedInsights />
      </Suspense>
    );
  }

  if (currentUser?.role === "Depot Staff") {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <DepotDashboard currentUser={currentUser} onLogout={handleLogout} />
        <Analytics />
        <SpeedInsights />
      </Suspense>
    );
  }

  if (currentUser?.role === "Delivery Staff") {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <DeliveryDashboard currentUser={currentUser} onLogout={handleLogout} />
        <Analytics />
        <SpeedInsights />
      </Suspense>
    );
  }

  return (
    <SafeBoundary>
      <CartFeedbackProvider>
        <Analytics />
        <SpeedInsights />
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
                  onAddToCart={(pid, qty) => handleAddToCart(pid, qty)}
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
              setAppStep("checkout");
            }}
            onBrowseCatalog={() => {
              setActiveTab("search");
            }}
          />

          {/* Cart feedback burst */}
          <CartBurst />
          <PWAInstallPrompt />
          <PushNotificationPrompt userId={currentUser?.id} pharmacyName={pharmacy?.pharmacyName} />

          {/* Bottom persistent Nav Bar */}
          {appStep === "main" && (
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg px-4 sm:px-8 lg:px-12 pt-2.5 pb-[max(12px,env(safe-area-inset-bottom))] flex items-center justify-between lg:max-w-7xl lg:left-1/2 lg:-translate-x-1/2">
              <button
                onClick={() => setActiveTab("home")}
                className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  activeTab === "home" ? "text-brand-purple scale-105" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <HomeIcon className="w-5.5 h-5.5" />
                <span className="text-xs font-black">হোম</span>
              </button>

              <button
                onClick={() => setActiveTab("search")}
                className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  activeTab === "search" ? "text-brand-purple scale-105" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <PackageIcon className="w-5.5 h-5.5" />
                <span className="text-xs font-black">ওষুধ খুঁজুন</span>
              </button>

              {/* Center Prominent Cart Action Button */}
              <button
                onClick={() => {
                  refreshCartCounter();
                  setIsCartDrawerOpen(true);
                }}
                className="flex flex-col items-center gap-1 cursor-pointer transition-all relative text-slate-400 hover:text-brand-purple group"
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
                <span className="text-xs font-black text-slate-600 group-hover:text-brand-purple">কার্ট</span>
              </button>
              
              <button
                onClick={() => setActiveTab("history")}
                className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  activeTab === "history" ? "text-brand-purple scale-105" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <ListIcon className="w-5.5 h-5.5" />
                <span className="text-xs font-black">অর্ডারসমূহ</span>
              </button>

              <button
                onClick={() => setActiveTab("account")}
                className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${
                  activeTab === "account" ? "text-brand-purple scale-105" : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <UserIcon className="w-5.5 h-5.5" />
                <span className="text-xs font-black">প্রোফাইল</span>
              </button>
            </div>
          )}
        </div>
      </div>
      </CartFeedbackProvider>
    </SafeBoundary>
  );
}
