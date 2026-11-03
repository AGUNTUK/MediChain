import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, 
  ShoppingCart, 
  CreditCard, 
  Search, 
  Radio, 
  MessageSquare, 
  Eye, 
  X, 
  Clock, 
  Sparkles, 
  Trash2, 
  ExternalLink,
  Store,
  PhoneCall,
  CheckCircle2,
  PackageCheck,
  Activity,
  ArrowUpRight,
  Filter
} from "lucide-react";
import { 
  liveActivityService, 
  LiveUserPresence, 
  RadarBroadcastEvent 
} from "../../services/liveActivityService";

const FEED_STORAGE_KEY = "medichain_admin_radar_feed";

function formatRelativeTime(isoString: string): string {
  if (!isoString) return "এইমাত্র";
  try {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 10) return "এইমাত্র";
    if (diff < 60) return `${diff} সেকেন্ড আগে`;
    const mins = Math.floor(diff / 60);
    if (mins < 60) return `${mins} মিনিট আগে`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ঘন্টা আগে`;
    return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "সম্প্রতি";
  }
}

function cleanPhoneForWhatsApp(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (cleaned.startsWith("880")) return cleaned;
  if (cleaned.startsWith("01")) return "88" + cleaned;
  if (cleaned.startsWith("1")) return "880" + cleaned;
  return cleaned;
}

export default function LiveUserRadar() {
  const [onlineUsers, setOnlineUsers] = useState<LiveUserPresence[]>([]);
  const [eventsFeed, setEventsFeed] = useState<RadarBroadcastEvent[]>(() => {
    try {
      const saved = localStorage.getItem(FEED_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedUserCart, setSelectedUserCart] = useState<LiveUserPresence | null>(null);
  const [feedFilter, setFeedFilter] = useState<"ALL" | "CART" | "SEARCH" | "CHECKOUT">("ALL");
  const [searchFilter, setSearchFilter] = useState("");

  // Connect to Supabase Realtime Presence & Broadcast
  useEffect(() => {
    const unsubscribe = liveActivityService.subscribeToRadar(
      (presences) => {
        setOnlineUsers(presences);
      },
      (event) => {
        setEventsFeed((prev) => {
          const updated = [event, ...prev.filter((e) => e.id !== event.id)].slice(0, 50);
          try {
            localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Top KPIs calculated live from Presence state
  const kpiData = useMemo(() => {
    const totalOnline = onlineUsers.length;
    const usersWithCart = onlineUsers.filter((u) => (u.cartCount || 0) > 0);
    const activeCartsCount = usersWithCart.length;
    const totalCartValue = usersWithCart.reduce((acc, u) => acc + (u.cartTotal || 0), 0);
    const inCheckoutCount = onlineUsers.filter((u) => u.currentView === "Checkout").length;

    return {
      totalOnline,
      activeCartsCount,
      totalCartValue,
      inCheckoutCount,
    };
  }, [onlineUsers]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    if (!searchFilter.trim()) return onlineUsers;
    const q = searchFilter.toLowerCase().trim();
    return onlineUsers.filter((u) => 
      (u.pharmacyName || "").toLowerCase().includes(q) ||
      (u.phone || "").includes(q) ||
      (u.lastSearch || "").toLowerCase().includes(q) ||
      (u.currentView || "").toLowerCase().includes(q)
    );
  }, [onlineUsers, searchFilter]);

  // Filtered event feed
  const filteredFeed = useMemo(() => {
    if (feedFilter === "ALL") return eventsFeed;
    if (feedFilter === "CART") return eventsFeed.filter((e) => e.action === "CART_UPDATE");
    if (feedFilter === "SEARCH") return eventsFeed.filter((e) => e.action === "SEARCH");
    if (feedFilter === "CHECKOUT") return eventsFeed.filter((e) => e.action === "OPEN_CHECKOUT" || e.action === "ORDER_PLACED");
    return eventsFeed;
  }, [eventsFeed, feedFilter]);

  const handleClearFeed = () => {
    setEventsFeed([]);
    try {
      localStorage.removeItem(FEED_STORAGE_KEY);
    } catch {}
  };

  const getScreenBadgeColor = (screen: string) => {
    switch (screen?.toLowerCase()) {
      case "checkout":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "cart":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "catalog":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "search":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "orders":
        return "bg-indigo-500/20 text-indigo-300 border-indigo-500/30";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  const generateWhatsAppUrl = (user: LiveUserPresence) => {
    const cleanPhone = cleanPhoneForWhatsApp(user.phone);
    if (!cleanPhone) return null;
    const msg = `আসসালামু আলাইকুম ${user.pharmacyName}, মেডিচেইনে আপনার কার্টে ${user.cartCount || 0}টি ওষুধ রয়েছে (৳${user.cartTotal || 0})। অর্ডারটি কনফার্ম করতে কোনো সাহায্য লাগবে কি?`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Title & Live Status Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
            </span>
            <h2 className="text-lg md:text-xl font-black text-white tracking-wide flex items-center gap-2">
              <span>লাইভ ইউজার ও কার্ট রাডার</span>
              <span className="text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Zero-DB-Egress Realtime
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            সরাসরি সুপাবেস রিয়েল-টাইম প্রেজেন্স এবং ব্রডকাস্টের মাধ্যমে গ্রাহকের ব্রাউজিং এবং কার্ট অ্যাক্টিভিটি পর্যবেক্ষণ করুন (পোস্টগ্রিস ডাটাবেস এগ্রেস = ০ বাইট)।
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-300 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>WebSocket কানেকশন সক্রিয়</span>
          </span>
        </div>
      </div>

      {/* Top Real-Time KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Online Users */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">অনলাইন ইউজার</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-white font-mono">{kpiData.totalOnline}</span>
              <span className="text-[10px] text-emerald-400 font-semibold flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-ping"></span>
                Active Now
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Carts */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">অ্যাক্টিভ কার্ট</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-white font-mono">{kpiData.activeCartsCount}</span>
              <span className="text-xs text-slate-400">জন ক্রেতা</span>
            </div>
          </div>
        </div>

        {/* Card 3: Total Cart Value */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">লাইভ কার্ট ভ্যালু</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-emerald-400 font-mono">
                ৳{kpiData.totalCartValue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: In Checkout */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">চেকআউটে আছে</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-white font-mono">{kpiData.inCheckoutCount}</span>
              <span className="text-xs text-amber-400 font-medium">অর্ডার সম্পন্ন করার পথে</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Active Users Table & Live Activity Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Online Users & Cart Inspector Table */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {/* Table Header & Search Filter */}
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/50">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  অনলাইন ফার্মেসি ও ভিজিটর তালিকা ({filteredUsers.length})
                </h3>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="ফার্মেসি, ফোন বা ওষুধ সার্চ..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
              {filteredUsers.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 mb-3">
                    <Users className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-300">কোনো অনলাইন গ্রাহক পাওয়া যায়নি</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    গ্রাহক অ্যাপে প্রবেশ করলে সুপাবেস প্রেজেন্সের মাধ্যমে স্বয়ংক্রিয়ভাবে এখানে তালিকাভুক্ত হবে।
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                      <th className="py-3 px-4">ফার্মেসি / ইউজার</th>
                      <th className="py-3 px-3">বর্তমান স্ক্রিন</th>
                      <th className="py-3 px-3">সর্বশেষ সার্চ</th>
                      <th className="py-3 px-3">লাইভ কার্ট</th>
                      <th className="py-3 px-3">সক্রিয় সময়</th>
                      <th className="py-3 px-4 text-right">একশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredUsers.map((u) => {
                      const waUrl = generateWhatsAppUrl(u);
                      const hasCart = (u.cartCount || 0) > 0;

                      return (
                        <tr key={u.userId} className="hover:bg-slate-800/40 transition-colors">
                          {/* User / Pharmacy Name */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 border border-indigo-500/30 font-bold">
                                {u.isGuest ? <Users className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-white truncate max-w-[150px]">
                                    {u.pharmacyName || "Guest Visitor"}
                                  </span>
                                  {u.isGuest ? (
                                    <span className="text-[9px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded font-medium">
                                      Guest
                                    </span>
                                  ) : (
                                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 py-0.2 rounded font-bold border border-emerald-500/30">
                                      Registered
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                  {u.phone || "ফোন নম্বর অনুপস্থিত"}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Current Screen */}
                          <td className="py-3 px-3">
                            <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold border ${getScreenBadgeColor(u.currentView)}`}>
                              {u.currentView || "Home"}
                            </span>
                          </td>

                          {/* Last Searched */}
                          <td className="py-3 px-3">
                            {u.lastSearch ? (
                              <span className="inline-flex items-center gap-1 text-slate-300 font-mono bg-slate-950 px-2 py-1 rounded-md border border-slate-800 max-w-[130px] truncate">
                                <Search className="w-3 h-3 text-purple-400 shrink-0" />
                                <span className="truncate">{u.lastSearch}</span>
                              </span>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>

                          {/* Live Cart */}
                          <td className="py-3 px-3">
                            {hasCart ? (
                              <button
                                type="button"
                                onClick={() => setSelectedUserCart(u)}
                                className="group flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer"
                              >
                                <ShoppingCart className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                <span>{u.cartCount}টি (৳{u.cartTotal || 0})</span>
                              </button>
                            ) : (
                              <span className="text-slate-600 italic">খালি কার্ট</span>
                            )}
                          </td>

                          {/* Last Active */}
                          <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {formatRelativeTime(u.lastActiveAt)}
                            </span>
                          </td>

                          {/* Quick Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {hasCart && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedUserCart(u)}
                                  title="কার্ট ডিটেইলস দেখুন"
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {waUrl ? (
                                <a
                                  href={waUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="হোয়াটসঅ্যাপে যোগাযোগ করুন"
                                  className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-sm flex items-center gap-1"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span className="text-[10px] font-bold hidden sm:inline">WhatsApp</span>
                                </a>
                              ) : (
                                <span 
                                  title="ফোন নম্বর পাওয়া যায়নি" 
                                  className="p-1.5 bg-slate-800 text-slate-600 rounded-lg cursor-not-allowed"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Real-Time Activity Feed */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[560px]">
            {/* Feed Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  লাইভ ইভেন্ট স্ট্রিম
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {eventsFeed.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearFeed}
                    title="ক্লিয়ার ফিড"
                    className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Pills */}
            <div className="px-4 py-2 border-b border-slate-800/80 bg-slate-900/60 flex items-center gap-1.5 overflow-x-auto text-[10px] font-bold">
              {(["ALL", "CART", "SEARCH", "CHECKOUT"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setFeedFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                    feedFilter === filter
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-800/80 text-slate-400 hover:text-white"
                  }`}
                >
                  {filter === "ALL" && "সব ইভেন্ট"}
                  {filter === "CART" && "কার্ট আপডেট"}
                  {filter === "SEARCH" && "সার্চ রিকোয়েস্ট"}
                  {filter === "CHECKOUT" && "চেকআউট / অর্ডার"}
                </button>
              ))}
            </div>

            {/* Feed Items Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-800/40">
              {filteredFeed.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <Activity className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-xs font-semibold text-slate-400">কোনো রিয়েল-টাইম ইভেন্ট পাওয়া যায়নি</p>
                  <p className="text-[11px] mt-1">গ্রাহকের সার্চ বা কার্ট একশন এখানে তাৎক্ষণিকভাবে স্ট্রিম হবে।</p>
                </div>
              ) : (
                filteredFeed.map((ev) => {
                  return (
                    <div key={ev.id} className="pt-3 first:pt-0 flex items-start gap-3 text-xs">
                      {/* Action Icon */}
                      <div className="mt-0.5 shrink-0">
                        {ev.action === "SEARCH" && (
                          <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                            <Search className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {ev.action === "CART_UPDATE" && (
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                            <ShoppingCart className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {ev.action === "OPEN_CHECKOUT" && (
                          <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                            <CreditCard className="w-3.5 h-3.5" />
                          </div>
                        )}
                        {ev.action === "ORDER_PLACED" && (
                          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-white truncate max-w-[140px]">
                            {ev.pharmacyName || "Guest"}
                          </span>
                          <span className="text-[10px] text-slate-500 shrink-0">
                            {formatRelativeTime(ev.timestamp)}
                          </span>
                        </div>

                        {ev.action === "SEARCH" && (
                          <p className="text-slate-300 mt-0.5">
                            সার্চ করেছে: <span className="text-purple-300 font-mono font-semibold bg-purple-950/60 px-1 py-0.2 rounded">'{ev.query}'</span>
                          </p>
                        )}

                        {ev.action === "CART_UPDATE" && (
                          <p className="text-slate-300 mt-0.5">
                            কার্টে যোগ করেছে: <strong className="text-emerald-300 font-semibold">{ev.productName}</strong>
                            {ev.qty ? <span className="text-slate-400 text-[11px] font-mono"> (x{ev.qty})</span> : null}
                            <span className="block text-[10px] text-slate-400 mt-0.5 font-mono">
                              মোট কার্ট: {ev.cartCount}টি • ৳{ev.cartTotal}
                            </span>
                          </p>
                        )}

                        {ev.action === "OPEN_CHECKOUT" && (
                          <p className="text-amber-300 mt-0.5 font-medium">
                            চেকআউট পেজ খুলেছে (কার্ট ভ্যালু: <strong className="font-mono text-white">৳{ev.cartTotal}</strong>)
                          </p>
                        )}

                        {ev.action === "ORDER_PLACED" && (
                          <p className="text-indigo-300 mt-0.5 font-medium">
                            অর্ডার কনফার্ম করেছে! <strong className="font-mono text-white">#{ev.orderNumber || "NEW"}</strong> (৳{ev.total})
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cart Inspector Modal / Popover */}
      {selectedUserCart && (
        <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <span>{selectedUserCart.pharmacyName}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                      {selectedUserCart.phone || "No phone"}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    লাইভ কার্ট ইন্সপেক্টর • মোট {selectedUserCart.cartCount}টি আইটেম • ভ্যালু: ৳{selectedUserCart.cartTotal?.toLocaleString()}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUserCart(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Items List */}
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-2.5">
              {(!selectedUserCart.cartItemsPreview || selectedUserCart.cartItemsPreview.length === 0) ? (
                <div className="py-8 text-center text-slate-500 text-xs">
                  <PackageCheck className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                  <p>কার্টে কোনো বিস্তারিত আইটেম পাওয়া যায়নি (মোট {selectedUserCart.cartCount}টি সংরক্ষিত)।</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    কার্টের ওষুধ সমূহ ({selectedUserCart.cartItemsPreview.length}টি প্রদর্শিত):
                  </p>
                  {selectedUserCart.cartItemsPreview.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-white truncate">{item.name}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          পরিমাণ: <span className="text-emerald-400 font-semibold">{item.qty} Box/Pcs</span> × ৳{item.price}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          ৳{(item.qty * item.price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer with 1-Click WhatsApp Button */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                স্ক্রিন: <span className="font-bold text-white">{selectedUserCart.currentView || "Home"}</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {generateWhatsAppUrl(selectedUserCart) && (
                  <a
                    href={generateWhatsAppUrl(selectedUserCart)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>WhatsApp ফলো-আপ পাঠান</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedUserCart(null)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  বন্ধ করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
