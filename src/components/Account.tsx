import React, { useState, useEffect } from "react";
import { User as UserIcon, Heart, Shield, RefreshCcw, LogOut, FileText, Check, ShoppingCart, LifeBuoy, Pencil, Award, Clock, AlertTriangle, Headset, Download, Smartphone, CheckCircle2, BellRing, Bell } from "lucide-react";
import { Product, Pharmacy, User, RestockRequest } from "../types";
import { paymentService } from "../services/payment";
import { productService } from "../services/product";
import { restockService } from "../services/restockService";
import { orderService } from "../services/order";
import { authService } from "../services/auth";
import { usePWAInstall } from "../pwa/usePWAInstall";
import { pushManager } from "../pwa/pushManager";
import EditProfileScreen from "./EditProfileScreen";
import KYCVerificationHub from "./KYCVerificationHub";
import MediChainLogo from "./MediChainLogo";

interface AccountProps {
  pharmacy: Pharmacy | null;
  currentUser: User | null;
  onLogout: () => void;
  onAddToCart: (productId: string, qty: number) => Promise<boolean>;
  favouriteIds: string[];
  onRefreshProfile?: () => Promise<void>;
  onTriggerTab?: (tab: string) => void;
  onSwitchPersona?: (role: string) => void;
}

export default function Account({
  pharmacy,
  currentUser,
  onLogout,
  onAddToCart,
  favouriteIds,
  onRefreshProfile,
  onTriggerTab,
  onSwitchPersona
}: AccountProps) {
  const { isStandalone, canInstall, isIOS, install, openInstallBanner } = usePWAInstall();
  const [analytics, setAnalytics] = useState<any>(null);
  const [favProducts, setFavProducts] = useState<Product[]>([]);
  const [myRestockRequests, setMyRestockRequests] = useState<RestockRequest[]>([]);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [totalPurchased, setTotalPurchased] = useState(0);

  // Overlay state triggers
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showKycHub, setShowKycHub] = useState(false);

  // Mobile Web Push Notification State
  const [pushStatus, setPushStatus] = useState<NotificationPermission>("default");
  const [isPushLoading, setIsPushLoading] = useState(false);
  const [testPushStatus, setTestPushStatus] = useState<string | null>(null);

  useEffect(() => {
    if (pushManager.isPushSupported()) {
      setPushStatus(pushManager.getPermissionState());
    }
  }, []);

  const handleTogglePush = async () => {
    setIsPushLoading(true);
    setTestPushStatus(null);
    if (pushStatus === "granted") {
      await pushManager.unsubscribe();
      setPushStatus("default");
    } else {
      const res = await pushManager.subscribe(currentUser?.id, pharmacy?.pharmacyName);
      if (res.success) {
        setPushStatus("granted");
      }
    }
    setIsPushLoading(false);
  };

  const handleSendTestPush = async () => {
    setTestPushStatus("sending");
    const res = await pushManager.sendTestPush(currentUser?.id);
    if (res.success) {
      setTestPushStatus("success");
      setTimeout(() => setTestPushStatus(null), 3000);
    } else {
      setTestPushStatus("error");
    }
  };

  const fetchData = async () => {
    try {
      // Fetch analytics (Admin and Pharmacy Owner only)
      const dataAnal = await paymentService.getAnalytics();
      setAnalytics(dataAnal);

      // Fetch favourites
      const dataFav = await productService.getFavourites();
      setFavProducts(dataFav);

      // Fetch restock alerts
      const requests = await restockService.getMyRestockRequests();
      setMyRestockRequests(requests);

      // Fetch completed orders to calculate eligibility
      const orders = await orderService.getOrders();
      const completedTotal = orders
        .filter(o => o.status === 'Delivered' || o.status === 'Completed' || o.paymentStatus === 'Paid')
        .reduce((sum, order) => sum + order.totalAmount, 0);
      setTotalPurchased(completedTotal);
    } catch (err) {
      console.warn("Analytics/Fav fetch warning:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [favouriteIds, currentUser]);

  const handleQuickReorder = async (productId: string) => {
    const success = await onAddToCart(productId, 1); // Standard quick reorder (1 box)
    if (success) {
      setSuccessId(productId);
      setTimeout(() => setSuccessId(null), 1500);
    }
  };

  const handleRefresh = async () => {
    if (onRefreshProfile) {
      await onRefreshProfile();
    }
    await fetchData();
  };

  // Check verification status
  const kycStatus = pharmacy?.verificationStatus || "Pending";
  const isVerified = kycStatus === "Approved";

  return (
    <div className="h-full bg-brand-bg px-4 sm:px-6 pt-6 pb-32 space-y-4 max-w-4xl mx-auto w-full select-none overflow-y-auto">
      {/* Account Info Header */}
      <div className="p-5 sm:p-6 flex items-center justify-between gap-4 bg-white rounded-3xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3.5">
          <MediChainLogo size="sm" withText={false} />
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <h2 className="text-lg sm:text-xl font-black text-brand-charcoal leading-tight truncate flex items-center gap-1.5">
              {pharmacy?.pharmacyName || "Pharmacy Profile"}
              {isVerified && (
                <span className="bg-emerald-500/10 text-emerald-600 rounded-full p-0.5" title="Verified DGDA Account">
                  <Check className="w-4 h-4 stroke-[3]" />
                </span>
              )}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 font-semibold flex items-center gap-1">
              <UserIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="truncate">স্বত্বাধিকারী: {pharmacy?.ownerName || currentUser?.name || "জাহিদ হাসান"}</span>
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="bg-slate-100 border border-slate-200 text-slate-700 font-bold font-mono text-xs px-2.5 py-1 rounded-lg">
                ড্রাগ লাইসেন্স: {pharmacy?.licenseNo || "অনুমোদনের অপেক্ষায়"}
              </span>
              <span className="bg-purple-50 text-brand-purple border border-purple-200/60 font-extrabold text-xs px-2.5 py-1 rounded-lg">
                রোল: {currentUser?.role === "Pharmacy Owner" ? "ফার্মেসি মালিক" : currentUser?.role === "Admin" ? "অ্যাডমিন" : currentUser?.role || "ফার্মেসি মালিক"}
              </span>
            </div>
          </div>
        </div>
        {/* Header interactive controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowEditProfile(true)}
            className="p-2.5 text-slate-500 hover:text-brand-purple hover:bg-purple-50 rounded-2xl transition-all cursor-pointer border border-slate-200 shadow-2xs"
            title="ফার্মেসির তথ্য পরিবর্তন"
          >
            <Pencil className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={onLogout}
            className="p-2.5 text-slate-500 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all cursor-pointer border border-slate-200 shadow-2xs"
            title="লগআউট করুন"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Compliance Check / KYC Status prominent Card */}
      {(() => {
        let cardBg = "bg-rose-50 border-rose-100 text-rose-800";
        let icon = <AlertTriangle className="w-5 h-5 text-rose-500" />;
        let statusText = "যাচাইকরণ প্রয়োজন";
        let statusBadgeClass = "bg-rose-500/10 text-rose-600 border-rose-500/20";
        let subText = "পাইকারি কেনাকাটার জন্য জাতীয় পরিচয়পত্র ও ড্রাগ লাইসেন্সের ছবি আপলোড করুন।";

        if (kycStatus === "Approved") {
          cardBg = "bg-emerald-50 border-emerald-100 text-emerald-800";
          icon = <Award className="w-5 h-5 text-emerald-600" />;
          statusText = "অনুমোদিত ফার্মেসি";
          statusBadgeClass = "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
          subText = "ঔষধ প্রশাসন (DGDA) রেগুলেটরি যাচাই সফল। অগ্রাধিকার এক্সপ্রেস ডেলিভারি সক্রিয়।";
        } else if (kycStatus === "Pending" || kycStatus === "Under Review") {
          cardBg = "bg-amber-50 border-amber-100 text-amber-850";
          icon = <Clock className="w-5 h-5 text-amber-500 animate-pulse" />;
          statusText = "যাচাই প্রক্রিয়াধীন রয়েছে";
          statusBadgeClass = "bg-amber-500/10 text-amber-600 border-amber-500/20";
          subText = "আমাদের ডিপো টিম আপনার প্রদত্ত ড্রাগ লাইসেন্স যাচাই করছে (সর্বোচ্চ ২৪ ঘণ্টা)।";
        }

        return (
          <div className={`p-5 rounded-3xl border ${cardBg} shadow-sm space-y-3`}>
            <div className="flex justify-between items-start gap-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white rounded-2xl shadow-xs">
                  {icon}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-black uppercase tracking-wider">কেওয়াইসি স্ট্যাটাস</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h4 className="font-black text-sm">{statusText}</h4>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${statusBadgeClass}`}>
                      {kycStatus === "Approved" ? "অনুমোদিত" : kycStatus === "Pending" ? "অপেক্ষমান" : kycStatus}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowKycHub(true)}
                className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-black px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-xs shrink-0"
              >
                {kycStatus === "Approved" ? "কেওয়াইসি বিবরণ" : "এখনই যাচাই করুন"}
              </button>
            </div>
            <p className="text-xs text-slate-600 font-semibold leading-relaxed pl-1">
              {subText}
            </p>
          </div>
        );
      })()}

      {/* PWA Standalone App Integration Card */}
      <div className="bg-gradient-to-r from-slate-900 to-[#17121F] border border-purple-500/30 rounded-3xl p-5 shadow-sm text-white space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-lime/10 border border-brand-lime/30 flex items-center justify-center text-brand-lime shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-sm text-white">মেডিচেইন মোবাইল অ্যাপ</h4>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-brand-lime/20 text-brand-lime border border-brand-lime/30">
                  {isStandalone ? "সক্রিয় অ্যাপ" : "অফলাইন সুবিধা"}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {isStandalone
                  ? "মোবাইল অ্যাপ হিসেবে সফলভাবে চলছে।"
                  : "সহজে ও দ্রুত অর্ডার করতে অ্যাপটি মোবাইলে ইনস্টল করুন।"}
              </p>
            </div>
          </div>

          {!isStandalone && (
            <button
              onClick={() => {
                if (canInstall) {
                  install();
                } else {
                  openInstallBanner();
                }
              }}
              className="bg-brand-lime hover:bg-brand-lime-dark active:scale-95 text-slate-950 text-xs font-black px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1.5 shrink-0"
            >
              <Download className="w-4 h-4" />
              {isIOS ? "ইনস্টল নিয়ম" : "অ্যাপ ইনস্টল করুন"}
            </button>
          )}

          {isStandalone && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
              ইনস্টল করা হয়েছে
            </div>
          )}
        </div>
      </div>

      {/* Savings Metric Row */}
      {analytics && (
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-slate-400 block font-black uppercase tracking-wider">মোট সাশ্রয় রিপোর্ট</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono mt-1 block">
              ৳{analytics.totalSavings.toLocaleString()}
            </span>
          </div>
          <div className="bg-emerald-50 text-emerald-700 px-3.5 py-2 rounded-2xl border border-emerald-100 text-xs font-black text-right">
            গড় ২২% পাইকারি সাশ্রয়
          </div>
        </div>
      )}

      {/* PWA & Mobile Web Push Notification Management Card */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-5 border border-purple-500/20 space-y-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-brand-lime/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-brand-lime/20 flex items-center justify-center text-brand-lime shadow-inner">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">মোবাইল পুশ নোটিফিকেশন</h3>
              <p className="text-xs text-purple-200/80">অ্যাপ বন্ধ থাকলেও সরাসরি ফোনে অ্যালার্ট পাবেন</p>
            </div>
          </div>
          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
            pushStatus === "granted" ? "bg-brand-lime text-slate-950" : "bg-white/10 text-slate-300"
          }`}>
            {pushStatus === "granted" ? "সক্রিয় ✓" : "বন্ধ"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 relative z-10">
          <button
            onClick={handleTogglePush}
            disabled={isPushLoading}
            className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              pushStatus === "granted"
                ? "bg-white/10 hover:bg-white/20 text-slate-300"
                : "bg-brand-lime hover:bg-lime-400 text-slate-950 shadow-md shadow-lime-950/30"
            }`}
          >
            {isPushLoading ? (
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
            ) : pushStatus === "granted" ? (
              <>
                <Bell className="w-3.5 h-3.5" />
                <span>নোটিফিকেশন বন্ধ করুন</span>
              </>
            ) : (
              <>
                <BellRing className="w-3.5 h-3.5" />
                <span>ফোনে নোটিফিকেশন চালু করুন</span>
              </>
            )}
          </button>

          {pushStatus === "granted" && (
            <button
              onClick={handleSendTestPush}
              disabled={testPushStatus === "sending"}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-brand-lime" />
              <span>
                {testPushStatus === "sending" ? "পাঠানো হচ্ছে..." : testPushStatus === "success" ? "নোটিফিকেশন পাঠানো হয়েছে! 🎉" : "টেস্ট নোটিফিকেশন পাঠান"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* B2B Operational Quick-Action Grid */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => onTriggerTab && onTriggerTab("history")} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-2 hover:border-brand-purple/30 transition-all cursor-pointer items-start text-left">
          <div className="p-2.5 bg-brand-purple/10 rounded-2xl text-brand-purple">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm font-black text-brand-charcoal block">অর্ডার ইতিহাস</span>
            <span className="text-xs text-slate-400 mt-0.5 block font-medium">সব পাইকারি অর্ডার দেখুন</span>
          </div>
        </button>
        
        <button className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-2 hover:border-brand-purple/30 transition-all cursor-pointer items-start text-left">
          <div className="p-2.5 bg-blue-500/10 rounded-2xl text-blue-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm font-black text-brand-charcoal block">ট্যাক্স ও চালান</span>
            <span className="text-xs text-slate-400 mt-0.5 block font-medium">ক্রয় ও ভ্যাট স্টেটমেন্ট</span>
          </div>
        </button>
        
        <button className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-2 hover:border-brand-purple/30 transition-all cursor-pointer items-start text-left">
          <div className="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-600">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm font-black text-brand-charcoal block">ডেলিভারির ঠিকানা</span>
            <span className="text-xs text-slate-400 mt-0.5 block font-medium">ফার্মেসির অবস্থান ও ড্রপ-অফ</span>
          </div>
        </button>

        <button className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-2 hover:border-brand-purple/30 transition-all cursor-pointer items-start text-left">
          <div className="p-2.5 bg-amber-500/10 rounded-2xl text-amber-600">
            <Headset className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm font-black text-brand-charcoal block">ডিপো হেল্পলাইন</span>
            <span className="text-xs text-slate-400 mt-0.5 block font-medium">২৪/৭ কাস্টমার সাপোর্ট</span>
          </div>
        </button>
      </div>

      {/* Saved Favourites List / Quick order catalog */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 space-y-3.5 shadow-sm">
        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <Heart className="w-4 h-4 text-rose-500 fill-current" />
          পছন্দের ওষুধের তালিকা (Favourites)
        </h3>

        {favProducts.length === 0 ? (
          <div className="py-6 text-center text-slate-400 flex flex-col items-center">
            <p className="text-sm font-bold text-slate-600">পছন্দের কোনো ওষুধ এখনো যুক্ত নেই</p>
            <p className="text-xs text-slate-400 mt-1 mb-4">ক্যাটালগের ওষুধের পাশে হার্ট আইকনে চাপ দিলে এখানে সহজে পেয়ে যাবেন।</p>
            <button
              onClick={() => onTriggerTab && onTriggerTab("search")}
              className="bg-brand-purple text-white px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-sm hover:bg-brand-purple/90 transition-all cursor-pointer"
            >
              পাইকারি ওষুধ তালিকা দেখুন
            </button>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {favProducts.map(p => (
              <div
                key={p.id}
                className="flex justify-between items-center bg-slate-50/70 p-3 rounded-2xl border border-slate-100 text-sm hover:border-slate-200 transition-all"
              >
                <div>
                  <div className="font-bold text-slate-800 text-sm">{p.name} ({p.strength})</div>
                  <div className="text-xs text-slate-500 font-mono font-bold mt-0.5">৳{p.sellingPrice} / বক্স</div>
                </div>
                <button
                  onClick={() => handleQuickReorder(p.id)}
                  disabled={successId === p.id}
                  className={`py-2 px-3.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                    successId === p.id
                      ? "bg-brand-purple text-white"
                      : "bg-brand-lime text-slate-900 hover:shadow-sm"
                  }`}
                >
                  {successId === p.id ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      যোগ হয়েছে!
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-3.5 h-3.5" />
                      ১ বক্স যোগ করুন
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pharmacy Stock Alerts & Restock Requests List */}
      {myRestockRequests.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-slate-100 space-y-3.5 shadow-sm">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <BellRing className="w-4 h-4 text-brand-purple" />
              আমার স্টক এলার্ট ও রিস্টক রিকোয়েস্ট ({myRestockRequests.length})
            </h3>
            <span className="text-[10px] font-bold text-slate-400 font-mono">
              {myRestockRequests.filter(r => r.status === "pending").length} অপেক্ষমাণ
            </span>
          </div>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {myRestockRequests.map(req => {
              const isRestocked = req.status === "restocked";
              const isPending = req.status === "pending";
              return (
                <div
                  key={req.id}
                  className="flex justify-between items-center bg-slate-50/70 p-3 rounded-2xl border border-slate-100 text-sm hover:border-slate-200 transition-all gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-800 text-sm truncate flex items-center gap-1.5">
                      <span>{req.product?.name || `Product #${req.productId.substring(0, 8)}`}</span>
                      {req.product?.strength && (
                        <span className="text-xs text-slate-500 font-normal">({req.product.strength})</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                      <span>রিকোয়েস্ট: {new Date(req.createdAt).toLocaleDateString("bn-BD")}</span>
                      <span>•</span>
                      <span>পরিমাণ: {req.requestedQuantity || 1} বক্স</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl uppercase tracking-wider ${
                      isRestocked
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : isPending
                        ? "bg-amber-100 text-amber-800 border border-amber-200"
                        : "bg-slate-100 text-slate-600"
                    }`}>
                      {isRestocked ? "✓ স্টকে এসেছে" : isPending ? "⏳ অপেক্ষমাণ" : "বাতিল"}
                    </span>

                    {isRestocked && req.product && (
                      <button
                        onClick={() => handleQuickReorder(req.product!.id)}
                        className="py-1.5 px-3 rounded-xl text-xs font-black bg-brand-lime hover:bg-brand-lime-dark text-slate-950 transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <ShoppingCart className="w-3 h-3" />
                        <span>অর্ডার</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* Corporate Support and DGDA Details */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 space-y-3.5 shadow-sm">
        <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
          <LifeBuoy className="w-4 h-4 text-brand-purple" />
          মেডিচেইন ডিপো হেল্পলাইন ও সাপোর্ট
        </h3>
        
        <div className="text-xs space-y-2.5 leading-relaxed font-semibold text-slate-700">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">সেবার সময়:</span>
            <span className="font-bold">২৪ ঘণ্টা / ৭ দিন</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">ডিজিডিএ (DGDA) অনুমোদন:</span>
            <span className={`font-bold ${isVerified ? "text-emerald-600" : "text-amber-500"}`}>
              {isVerified ? "অনুমোদিত বি২বি ফার্মাসিউটিক্যাল সাপ্লাইয়ার" : "যাচাই প্রক্রিয়াধীন রয়েছে"}
            </span>
          </div>
        </div>
      </div>

      {/* Overlays */}
      {showEditProfile && (
        <EditProfileScreen
          pharmacy={pharmacy}
          onClose={() => setShowEditProfile(false)}
          onSaveSuccess={handleRefresh}
        />
      )}

      {showKycHub && (
        <KYCVerificationHub
          pharmacy={pharmacy}
          onClose={() => setShowKycHub(false)}
          onSaveSuccess={handleRefresh}
        />
      )}
    </div>
  );
}
