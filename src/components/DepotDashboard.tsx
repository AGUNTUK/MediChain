import React, { useState, useEffect } from "react";
import { MediChainIconOnly } from './MediChainLogo';
import { io } from "socket.io-client";
import { User, Order, Product } from "../types";
import { 
  LayoutDashboard, ShoppingCart, Boxes, Truck, LogOut, CheckCircle2, 
  AlertTriangle, Clock, RefreshCw, Package, Scan, QrCode, X, Search, 
  Edit, Eye, Plus, FileText, Zap, Calendar, ArrowRight, Activity, MapPin
} from "lucide-react";
import { productService, orderService } from "../services";
import OrderCenter from "./depot/OrderCenter";
import Inventory from "./depot/Inventory";
import Delivery from "./depot/Delivery";
import NotificationBell from "./NotificationBell";
import { getRackLocation, saveRackLocation } from "./depot/depotUtils";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "../context/ThemeContext";
import ChainLinkEmptyState from "./depot/ChainLinkEmptyState";

interface DepotDashboardProps {
  currentUser: User;
  onLogout: () => void;
}

interface StatusFeedItem {
  id: string;
  time: string;
  message: string;
  type: "info" | "success" | "warning" | "alert";
}

export default function DepotDashboard({ currentUser, onLogout }: DepotDashboardProps) {
  const [activeRoute, setActiveRoute] = useState<"/depot/dashboard" | "/depot/orders" | "/depot/inventory" | "/depot/delivery">("/depot/dashboard");
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // KPI card selection filter for Dashboard view
  const [activeKpiFilter, setActiveKpiFilter] = useState<"pending" | "processing" | "packed" | "dispatch" | "lowStock" | "expiring" | null>(null);

  // Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedQuery, setScannedQuery] = useState("");
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [isEditingScanned, setIsEditingScanned] = useState(false);
  const [editStockQty, setEditStockQty] = useState(0);
  const [editBatchNo, setEditBatchNo] = useState("");
  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [editRackLoc, setEditRackLoc] = useState("");
  const [cameraStreamActive, setCameraStreamActive] = useState(false);

  // Real-time WMS activity feed
  const [statusFeed, setStatusFeed] = useState<StatusFeedItem[]>([
    { id: "1", time: "10:14 AM", message: "Initial FEFO catalog audit finished by automated system.", type: "info" },
    { id: "2", time: "09:42 AM", message: "Order #ORD-1025 moved to PROCESSING. Picker dispatched to Sector A.", type: "success" },
    { id: "3", time: "08:15 AM", message: "Napa Syrup batch B-332 adjusted: Stock count corrected on Rack B-03.", type: "info" },
    { id: "4", time: "07:30 AM", message: "FEFO Alert: 5 items found expiring in less than 90 days. Relabeled.", type: "warning" }
  ]);

  const addFeedItem = (message: string, type: "info" | "success" | "warning" | "alert" = "info") => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newItem: StatusFeedItem = {
      id: Math.random().toString(),
      time: timeStr,
      message,
      type
    };
    setStatusFeed(prev => [newItem, ...prev.slice(0, 9)]); // Keep last 10
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      const [ordRes, prodRes] = await Promise.all([
        fetch("/api/depot/orders"),
        productService.getProducts()
      ]);
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setOrders(ordData.orders || []);
      }
      setProducts(prodRes || []);
    } catch (err) {
      console.warn("Depot refresh network warning:", err);
      setErrorMsg("Failed to synchronize depot database state.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
    const socket = io();
    socket.on("connect", () => {
      socket.emit("join_role_room", "Depot Staff");
    });
    socket.on("admin_order_updated", () => {
      refreshData();
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const handleOrderAction = async (orderId: string, action: "accept" | "process" | "pack") => {
    try {
      const res = await fetch(`/api/depot/orders/${orderId}/${action}`, { method: "POST" });
      if (res.ok) {
        setSuccessMsg(`Order successfully progressed via ${action.toUpperCase()} action.`);
        addFeedItem(`Order #${orderId.substring(0, 8)} status progressed: ${action.toUpperCase()}`, "success");
        refreshData();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg("Failed to progress order workflow.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error progressing order.");
    }
  };

  // Helper to trigger scan simulator
  const handleSimulateScan = (prod: Product) => {
    setScannedProduct(prod);
    setEditStockQty(prod.availableStock);
    setEditBatchNo(prod.batchNumber);
    setEditExpiryDate(prod.expiryDate);
    setEditRackLoc(getRackLocation(prod.id, prod.name, prod.category));
    setIsEditingScanned(false);
    addFeedItem(`Barcode/QR Swiped: Scanned ${prod.name} (Batch: ${prod.batchNumber})`, "info");
  };

  const handleQuickUpdateStock = async () => {
    if (!scannedProduct) return;
    try {
      const res = await fetch("/api/admin/inventory/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: scannedProduct.id,
          availableStock: editStockQty,
          batchNumber: editBatchNo,
          expiryDate: editExpiryDate
        })
      });

      if (res.ok) {
        // Save the custom rack location in localStorage
        saveRackLocation(scannedProduct.id, editRackLoc);

        setSuccessMsg(`Inventory updated successfully for ${scannedProduct.name}.`);
        addFeedItem(`Stock adjusted for ${scannedProduct.name} to ${editStockQty} units. Rack: ${editRackLoc}`, "warning");
        refreshData();
        setIsScannerOpen(false);
        setScannedProduct(null);
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg("Failed to write updated inventory back to DB.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error committing stock update.");
    }
  };

  // KPI Calculations
  const stats = {
    pending: orders.filter(o => o.status === "Pending").length,
    processing: orders.filter(o => o.status === "Processing" || o.status === "Confirmed").length,
    packed: orders.filter(o => o.status === "Packed").length,
    dispatch: orders.filter(o => o.status === "Out for Delivery").length,
    lowStock: products.filter(p => p.availableStock < 100).length,
    expiring: products.filter(p => {
      const days = Math.floor((new Date(p.expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      return days < 180; // < 6 months
    }).length,
  };

  const getOrderUrgency = (order: Order) => {
    let minutesWaiting = 30;
    if (order.createdAt) {
      const diff = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60));
      minutesWaiting = isNaN(diff) || diff < 5 ? 15 : diff;
    } else {
      minutesWaiting = 25 + ((order.id.charCodeAt(0) * 19) % 155);
    }

    if (minutesWaiting >= 120) {
      const hrs = Math.floor(minutesWaiting / 60);
      return {
        text: `Waiting ${hrs}h+`,
        color: "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800",
        dot: "bg-rose-500 animate-ping",
        badge: "High Urgency"
      };
    } else if (minutesWaiting >= 60) {
      const hrs = Math.floor(minutesWaiting / 60);
      return {
        text: `Waiting ${hrs}h`,
        color: "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800",
        dot: "bg-amber-500",
        badge: "Attention Needed"
      };
    } else {
      return {
        text: `Waiting ${minutesWaiting}m`,
        color: "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
        dot: "bg-emerald-500",
        badge: "Normal Flow"
      };
    }
  };

  const targetPlannedDispatch = Math.max(stats.dispatch + stats.packed, 5);
  const dispatchRatio = Math.min(1, stats.dispatch / targetPlannedDispatch);
  const circleRadius = 14;
  const circumference = 2 * Math.PI * circleRadius; // ~87.96
  const strokeDashoffset = circumference - (dispatchRatio * circumference);

  // Helper to handle camera simulation
  const toggleCamera = () => {
    setCameraStreamActive(!cameraStreamActive);
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-[#F7F7F9] dark:bg-slate-900 text-[#14161B] dark:text-slate-100 font-sans overflow-hidden transition-colors duration-200">
      
      {/* SIDEBAR - DESKTOP VIEW */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-slate-950 border-r border-slate-200/80 dark:border-slate-800 flex-col justify-between shrink-0 shadow-sm dark:shadow-none">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8 select-none">
            <MediChainIconOnly className="w-9 h-9 object-contain" />
            <div>
              <h1 className="text-sm font-black tracking-wider text-[#14161B] dark:text-slate-100">MEDICHAIN</h1>
              <p className="text-[9px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-widest">WMS WAREHOUSE</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => { setActiveRoute("/depot/dashboard"); setActiveKpiFilter(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeRoute === "/depot/dashboard" ? "bg-purple-600 dark:bg-purple-600 text-white shadow-md shadow-purple-600/20 font-bold" : "text-[#6B7280] dark:text-slate-400 hover:text-[#14161B] dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900"
              }`}
            >
              <LayoutDashboard className="w-4.5 h-4.5" />
              <span>Dashboard Overview</span>
            </button>
            <button
              onClick={() => setActiveRoute("/depot/orders")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeRoute === "/depot/orders" ? "bg-purple-600 dark:bg-purple-600 text-white shadow-md shadow-purple-600/20 font-bold" : "text-[#6B7280] dark:text-slate-400 hover:text-[#14161B] dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900"
              }`}
            >
              <ShoppingCart className="w-4.5 h-4.5" />
              <span>Order Center ({stats.pending + stats.processing})</span>
            </button>
            <button
              onClick={() => setActiveRoute("/depot/inventory")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeRoute === "/depot/inventory" ? "bg-purple-600 dark:bg-purple-600 text-white shadow-md shadow-purple-600/20 font-bold" : "text-[#6B7280] dark:text-slate-400 hover:text-[#14161B] dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900"
              }`}
            >
              <Boxes className="w-4.5 h-4.5" />
              <span>FEFO Inventory View</span>
            </button>
            <button
              onClick={() => setActiveRoute("/depot/delivery")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activeRoute === "/depot/delivery" ? "bg-purple-600 dark:bg-purple-600 text-white shadow-md shadow-purple-600/20 font-bold" : "text-[#6B7280] dark:text-slate-400 hover:text-[#14161B] dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900"
              }`}
            >
              <Truck className="w-4.5 h-4.5" />
              <span>Delivery Handover ({stats.packed})</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-xs font-bold text-[#14161B] dark:text-slate-100 truncate">{currentUser.name}</p>
            <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider">Depot Staff</p>
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle size="sm" />
            <button 
              onClick={onLogout}
              title="Sign Out"
              className="p-2 rounded-xl text-[#6B7280] dark:text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer transition-all"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE RESPONSIVE TOP HEADER */}
      <header className="md:hidden w-full bg-white dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-between z-20 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-2">
          <MediChainIconOnly className="w-8 h-8 object-contain" />
          <div>
            <h1 className="text-xs font-black tracking-wider text-[#14161B] dark:text-slate-100">MEDICHAIN</h1>
            <p className="text-[8px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-widest">WMS Mobile</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle size="sm" />
          <NotificationBell />
          <button 
            onClick={onLogout}
            className="p-1.5 rounded-lg text-[#6B7280] dark:text-slate-400 hover:text-rose-600 cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F7F7F9] dark:bg-slate-900 overflow-y-auto p-4 md:p-8 pb-28 md:pb-8">
        
        {/* Alerts */}
        {successMsg && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="mb-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2 shadow-sm">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            {errorMsg}
          </div>
        )}

        {/* Title and stats heading */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-lg md:text-2xl font-black text-[#14161B] dark:text-slate-100 uppercase tracking-tight flex items-center gap-2">
              <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              {activeRoute === "/depot/dashboard" && "WMS Depot Center"}
              {activeRoute === "/depot/orders" && "Enterprise Order Processing"}
              {activeRoute === "/depot/inventory" && "Warehouse FEFO Inventory"}
              {activeRoute === "/depot/delivery" && "Rider Handover Center"}
            </h1>
            <p className="text-[11px] text-[#6B7280] dark:text-slate-400 mt-0.5 font-medium">
              Logged in as <span className="text-[#14161B] dark:text-slate-100 font-bold">{currentUser.name}</span> • Terminal #WMS-01
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshData}
              disabled={loading}
              className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-[#14161B] dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 text-xs font-bold py-2 px-3.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-purple-600 dark:text-purple-400" : ""}`} />
              <span>Sync WMS</span>
            </button>
          </div>
        </div>

        {/* ==================== DASHBOARD TAB ==================== */}
        {activeRoute === "/depot/dashboard" && (
          <div className="space-y-6">
            
            {/* TWO-TIERED KPI METRICS ARCHITECTURE */}
            <div className="space-y-5">
              
              {/* TIER 1: ORDER FLOW PIPELINE */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600 dark:bg-purple-400"></span>
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#14161B] dark:text-slate-200">
                      Order Flow Pipeline
                    </h3>
                  </div>
                  <span className="text-[10px] text-[#6B7280] dark:text-slate-400 font-medium">Click card to filter orders</span>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {/* 1. Pending Orders */}
                  <button
                    onClick={() => setActiveKpiFilter(activeKpiFilter === "pending" ? null : "pending")}
                    className={`p-4 rounded-xl text-left cursor-pointer transition-all border-l-4 border-l-amber-500 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 shadow-sm dark:shadow-none hover:shadow-md ${
                      activeKpiFilter === "pending" ? "ring-2 ring-amber-500 bg-amber-50/50 dark:bg-amber-950/30" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[10px] font-extrabold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider truncate">
                        Pending Orders
                      </p>
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    </div>
                    <p className="text-2xl font-black mt-1 text-[#14161B] dark:text-slate-100">{stats.pending}</p>
                    <p className="text-[8px] text-amber-700 dark:text-amber-400 mt-1 uppercase font-bold">
                      {activeKpiFilter === "pending" ? "● Active Filter" : "Waiting Acceptance"}
                    </p>
                  </button>

                  {/* 2. Processing Orders */}
                  <button
                    onClick={() => setActiveKpiFilter(activeKpiFilter === "processing" ? null : "processing")}
                    className={`p-4 rounded-xl text-left cursor-pointer transition-all border-l-4 border-l-purple-500 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 shadow-sm dark:shadow-none hover:shadow-md ${
                      activeKpiFilter === "processing" ? "ring-2 ring-purple-500 bg-purple-50/50 dark:bg-purple-950/30" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[10px] font-extrabold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider truncate">
                        Processing
                      </p>
                      <RefreshCw className="w-4 h-4 text-purple-500 shrink-0" />
                    </div>
                    <p className="text-2xl font-black mt-1 text-[#14161B] dark:text-slate-100">{stats.processing}</p>
                    <p className="text-[8px] text-purple-700 dark:text-purple-400 mt-1 uppercase font-bold">
                      {activeKpiFilter === "processing" ? "● Active Filter" : "Active Picking"}
                    </p>
                  </button>

                  {/* 3. Packed (Ready) */}
                  <button
                    onClick={() => setActiveKpiFilter(activeKpiFilter === "packed" ? null : "packed")}
                    className={`p-4 rounded-xl text-left cursor-pointer transition-all border-l-4 border-l-lime-500 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 shadow-sm dark:shadow-none hover:shadow-md ${
                      activeKpiFilter === "packed" ? "ring-2 ring-lime-500 bg-lime-50/50 dark:bg-lime-950/30" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[10px] font-extrabold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider truncate">
                        Packed (Ready)
                      </p>
                      <Package className="w-4 h-4 text-lime-600 dark:text-lime-400 shrink-0" />
                    </div>
                    <p className="text-2xl font-black mt-1 text-[#14161B] dark:text-slate-100">{stats.packed}</p>
                    <p className="text-[8px] text-lime-700 dark:text-lime-400 mt-1 uppercase font-bold">
                      {activeKpiFilter === "packed" ? "● Active Filter" : "Ready for Rider"}
                    </p>
                  </button>

                  {/* 4. Today Dispatch with Circular Progress Ring */}
                  <button
                    onClick={() => setActiveKpiFilter(activeKpiFilter === "dispatch" ? null : "dispatch")}
                    className={`p-4 rounded-xl text-left cursor-pointer transition-all border-l-4 border-l-emerald-500 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 shadow-sm dark:shadow-none hover:shadow-md ${
                      activeKpiFilter === "dispatch" ? "ring-2 ring-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-[10px] font-extrabold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider truncate">
                        Today Dispatch
                      </p>
                      <Truck className="w-4 h-4 text-emerald-500 shrink-0" />
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <div>
                        <p className="text-2xl font-black text-[#14161B] dark:text-slate-100">{stats.dispatch}</p>
                        <p className="text-[8px] text-[#6B7280] dark:text-slate-400 font-semibold mt-0.5">
                          {stats.dispatch}/{targetPlannedDispatch} planned
                        </p>
                      </div>

                      {/* Mini circular progress gauge */}
                      <div className="relative w-9 h-9 shrink-0">
                        <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                          <circle
                            cx="18"
                            cy="18"
                            r={circleRadius}
                            className="text-slate-200 dark:text-slate-800"
                            strokeWidth="3.5"
                            stroke="currentColor"
                            fill="transparent"
                          />
                          <circle
                            cx="18"
                            cy="18"
                            r={circleRadius}
                            className="text-emerald-600 dark:text-emerald-400 transition-all duration-700"
                            strokeWidth="3.5"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-emerald-700 dark:text-emerald-400">
                          {Math.round(dispatchRatio * 100)}%
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* TIER 2: STOCK & FEFO ALERTS (Warning-tinted background when count > 0) */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 animate-pulse" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                      Critical Stock & FEFO Alerts
                    </h3>
                  </div>
                  {(stats.lowStock > 0 || stats.expiring > 0) && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                      {stats.lowStock + stats.expiring} Action Items
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Low Stock Items Card */}
                  <button
                    onClick={() => setActiveKpiFilter(activeKpiFilter === "lowStock" ? null : "lowStock")}
                    className={`p-4 rounded-xl text-left cursor-pointer transition-all border-l-4 border-l-rose-500 ${
                      stats.lowStock > 0
                        ? "bg-rose-50/90 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/80 text-rose-950 dark:text-rose-100 shadow-sm"
                        : "bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-[#14161B] dark:text-slate-100 shadow-sm dark:shadow-none"
                    } ${activeKpiFilter === "lowStock" ? "ring-2 ring-rose-500 scale-[1.01]" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${stats.lowStock > 0 ? "bg-rose-500 animate-ping" : "bg-slate-400"}`}></span>
                        <p className="text-[10px] font-extrabold uppercase tracking-wider">
                          Low Stock Items (&lt;100 units)
                        </p>
                      </div>
                      <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <p className="text-2xl font-black">{stats.lowStock}</p>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase bg-rose-200/80 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200">
                        {stats.lowStock > 0 ? "Reorder Urgently" : "Stock Healthy"}
                      </span>
                    </div>
                    <p className="text-[8px] text-[#6B7280] dark:text-slate-400 mt-1.5 uppercase font-semibold">
                      {activeKpiFilter === "lowStock" ? "● Viewing Low Stock Filter" : "Click to inspect replenishment list"}
                    </p>
                  </button>

                  {/* Expiring Items Card */}
                  <button
                    onClick={() => setActiveKpiFilter(activeKpiFilter === "expiring" ? null : "expiring")}
                    className={`p-4 rounded-xl text-left cursor-pointer transition-all border-l-4 border-l-amber-500 ${
                      stats.expiring > 0
                        ? "bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 text-amber-950 dark:text-amber-100 shadow-sm"
                        : "bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 text-[#14161B] dark:text-slate-100 shadow-sm dark:shadow-none"
                    } ${activeKpiFilter === "expiring" ? "ring-2 ring-amber-500 scale-[1.01]" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${stats.expiring > 0 ? "bg-amber-500" : "bg-slate-400"}`}></span>
                        <p className="text-[10px] font-extrabold uppercase tracking-wider">
                          Expiring Items (&lt;180 days)
                        </p>
                      </div>
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    </div>
                    <div className="flex items-baseline justify-between mt-1">
                      <p className="text-2xl font-black">{stats.expiring}</p>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded uppercase bg-amber-200/80 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                        {stats.expiring > 0 ? "FEFO Priority" : "Dates Clear"}
                      </span>
                    </div>
                    <p className="text-[8px] text-[#6B7280] dark:text-slate-400 mt-1.5 uppercase font-semibold">
                      {activeKpiFilter === "expiring" ? "● Viewing FEFO Filter" : "Click to view near-expiry batches"}
                    </p>
                  </button>
                </div>
              </div>

            </div>

            {/* Main Interactive Work Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Dynamic KPI Filter List view */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
                  <h2 className="text-sm font-black text-[#14161B] dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400 animate-pulse" />
                    {activeKpiFilter ? `FILTERED LIST: ${activeKpiFilter.toUpperCase()}` : "Active Orders Waiting Action"}
                  </h2>
                  {activeKpiFilter && (
                    <button 
                      onClick={() => setActiveKpiFilter(null)} 
                      className="text-[10px] text-purple-700 dark:text-purple-400 font-bold hover:underline cursor-pointer"
                    >
                      Clear Filter (Show All Active)
                    </button>
                  )}
                </div>

                {loading ? (
                  <div className="flex items-center justify-center p-12 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <RefreshCw className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-spin" />
                  </div>
                ) : activeKpiFilter === null ? (
                  /* DEFAULT VIEW: Highlight orders needing pick / pack with Urgency Indicators */
                  <div className="space-y-3">
                    {orders.filter(o => o.status === "Pending" || o.status === "Confirmed" || o.status === "Processing").length === 0 ? (
                      <ChainLinkEmptyState 
                        title="All Active Orders Cleared"
                        description="There are currently no orders waiting in queue for picking or packing. New pharmacy orders will stream in automatically."
                      />
                    ) : (
                      orders.filter(o => o.status === "Pending" || o.status === "Confirmed" || o.status === "Processing").map(order => {
                        const urgency = getOrderUrgency(order);
                        return (
                          <div 
                            key={order.id} 
                            className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:border-purple-300 dark:hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 text-xs shadow-sm hover:shadow"
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-extrabold text-[#14161B] dark:text-slate-200">
                                  #{order.readableId || order.id.substring(0, 8)}
                                </span>
                                
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  order.status === "Pending" ? "bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-transparent" :
                                  order.status === "Confirmed" ? "bg-blue-100 dark:bg-blue-500/10 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-transparent" : 
                                  "bg-purple-100 dark:bg-purple-500/10 text-purple-800 dark:text-purple-400 border border-purple-200 dark:border-transparent"
                                }`}>
                                  {order.status}
                                </span>

                                {/* Urgency Indicator */}
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${urgency.color}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${urgency.dot}`}></span>
                                  {urgency.text}
                                </span>
                              </div>

                              <p className="text-[10px] text-[#6B7280] dark:text-slate-400 font-semibold">
                                {order.items?.length || 0} unique medicines • Total: <strong className="text-[#14161B] dark:text-slate-200">৳{order.totalAmount}</strong>
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {order.status === "Pending" && (
                                <button 
                                  onClick={() => handleOrderAction(order.id, "accept")}
                                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-1.5 px-3 rounded-xl text-[10px] transition-all cursor-pointer shadow-sm"
                                >
                                  Accept Order
                                </button>
                              )}
                              {order.status === "Confirmed" && (
                                <button 
                                  onClick={() => handleOrderAction(order.id, "process")}
                                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-1.5 px-3 rounded-xl text-[10px] transition-all cursor-pointer shadow-sm"
                                >
                                  Start Picking
                                </button>
                              )}
                              {order.status === "Processing" && (
                                <button 
                                  onClick={() => handleOrderAction(order.id, "pack")}
                                  className="bg-lime-600 hover:bg-lime-500 text-white font-bold py-1.5 px-3 rounded-xl text-[10px] transition-all cursor-pointer shadow-sm"
                                >
                                  Mark Packed
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : (
                  /* FILTERED KPI LIST VIEW */
                  <div className="space-y-3">
                    {/* Filtered Orders list */}
                    {(activeKpiFilter === "pending" || activeKpiFilter === "processing" || activeKpiFilter === "packed" || activeKpiFilter === "dispatch") && (
                      orders.filter(o => {
                        if (activeKpiFilter === "pending") return o.status === "Pending";
                        if (activeKpiFilter === "processing") return o.status === "Processing" || o.status === "Confirmed";
                        if (activeKpiFilter === "packed") return o.status === "Packed";
                        if (activeKpiFilter === "dispatch") return o.status === "Out for Delivery";
                        return false;
                      }).length === 0 ? (
                        <ChainLinkEmptyState 
                          title="No Orders Match This KPI"
                          description="No current orders match your selected filter criteria."
                          actionLabel="Clear Filter"
                          onAction={() => setActiveKpiFilter(null)}
                        />
                      ) : (
                        orders.filter(o => {
                          if (activeKpiFilter === "pending") return o.status === "Pending";
                          if (activeKpiFilter === "processing") return o.status === "Processing" || o.status === "Confirmed";
                          if (activeKpiFilter === "packed") return o.status === "Packed";
                          if (activeKpiFilter === "dispatch") return o.status === "Out for Delivery";
                          return false;
                        }).map(order => (
                          <div key={order.id} className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 flex justify-between items-center text-xs shadow-sm">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-[#14161B] dark:text-slate-200">Order #{order.readableId || order.id.substring(0, 8)}</span>
                                <span className="text-[10px] text-purple-700 dark:text-purple-400 font-bold">৳{order.totalAmount}</span>
                              </div>
                              <p className="text-[10px] text-[#6B7280] dark:text-slate-400 mt-1 font-semibold">{order.items?.length || 0} products • Est: {order.estimatedDelivery}</p>
                            </div>
                            <button
                              onClick={() => { setActiveRoute("/depot/orders"); }}
                              className="text-xs text-purple-700 dark:text-purple-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <span>Manage in Orders</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      )
                    )}

                    {/* Filtered Products list */}
                    {(activeKpiFilter === "lowStock" || activeKpiFilter === "expiring") && (
                      products.filter(p => {
                        if (activeKpiFilter === "lowStock") return p.availableStock < 100;
                        if (activeKpiFilter === "expiring") {
                          const days = Math.floor((new Date(p.expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
                          return days < 180;
                        }
                        return false;
                      }).slice(0, 15).length === 0 ? (
                        <ChainLinkEmptyState 
                          title="No Flagged Products"
                          description="No inventory items currently match this alert threshold."
                          actionLabel="Clear Filter"
                          onAction={() => setActiveKpiFilter(null)}
                        />
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {products.filter(p => {
                            if (activeKpiFilter === "lowStock") return p.availableStock < 100;
                            if (activeKpiFilter === "expiring") {
                              const days = Math.floor((new Date(p.expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
                              return days < 180;
                            }
                            return false;
                          }).slice(0, 15).map(prod => {
                            const daysLeft = Math.floor((new Date(prod.expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
                            return (
                              <div key={prod.id} className="bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between text-xs shadow-sm">
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="font-extrabold text-[#14161B] dark:text-slate-200 truncate pr-2">{prod.name}</span>
                                    {activeKpiFilter === "lowStock" ? (
                                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-500/10 dark:text-rose-400 font-bold text-[9px] uppercase">LOW STOCK</span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 font-bold text-[9px] uppercase">EXPIRING</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-[#6B7280] dark:text-slate-400 mt-1">{prod.genericName}</p>
                                  <div className="mt-2.5 space-y-1 text-[10px] text-[#14161B] dark:text-slate-300">
                                    <div className="flex items-center gap-1.5">
                                      <Boxes className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                      <span>Stock: <strong className="text-[#14161B] dark:text-white">{prod.availableStock} units</strong></span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                      <span>Expiry: <strong className="text-[#14161B] dark:text-white">{prod.expiryDate} ({daysLeft} days)</strong></span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <MapPin className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                      <span>Shelf: <strong className="text-[#14161B] dark:text-white">{getRackLocation(prod.id, prod.name, prod.category)}</strong></span>
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    setIsScannerOpen(true);
                                    handleSimulateScan(prod);
                                  }}
                                  className="mt-3 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 font-bold py-1.5 px-2.5 rounded-xl text-[10px] transition-all cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <Edit className="w-3 h-3" /> Quick Edit Info
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Warehouse Live Status Feed */}
              <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col h-[400px] shadow-sm">
                <h3 className="text-xs font-black text-[#14161B] dark:text-slate-300 uppercase tracking-widest border-b border-slate-200/80 dark:border-slate-800 pb-2.5 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Real-time Status Feed
                </h3>
                <div className="flex-1 overflow-y-auto mt-4 space-y-3 pr-1 text-xs">
                  {statusFeed.map(item => (
                    <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-900 flex gap-2">
                      <span className="font-mono text-[9px] text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">{item.time}</span>
                      <p className="text-[11px] text-[#14161B] dark:text-slate-300 leading-relaxed">{item.message}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ==================== WORKFLOW TAB ROUTING ==================== */}
        {activeRoute === "/depot/orders" && (
          <OrderCenter 
            orders={orders} 
            products={products}
            currentUser={currentUser}
            onAccept={(id) => handleOrderAction(id, "accept")} 
            onProcess={(id) => handleOrderAction(id, "process")} 
            onPack={(id) => handleOrderAction(id, "pack")} 
            onRefresh={refreshData}
          />
        )}
        {activeRoute === "/depot/inventory" && (
          <Inventory 
            products={products} 
            onQuickEdit={(p) => {
              setIsScannerOpen(true);
              handleSimulateScan(p);
            }} 
          />
        )}
        {activeRoute === "/depot/delivery" && (
          <Delivery 
            orders={orders} 
            onProgress={() => {
              refreshData();
              addFeedItem("Delivery status progressed via rider handover verification.", "success");
            }} 
          />
        )}

      </main>

      {/* ==================== FLOATING QUICK ACTION BARCODE/QR SCANNER FAB ==================== */}
      {/* 
        CRITICAL FIX: On mobile, bottom-20 (80px) sits 24px ABOVE the 56px bottom navigation bar.
        This completely eliminates any collision or overlap with the "HANDOVER" tab and label.
      */}
      <button
        onClick={() => setIsScannerOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-8 md:right-8 w-12 h-12 md:w-14 md:h-14 rounded-full bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500 text-white flex items-center justify-center shadow-xl shadow-purple-600/30 z-30 cursor-pointer hover:scale-105 active:scale-95 transition-all group"
        title="Open Barcode Scanner"
        aria-label="Open Barcode Scanner"
      >
        <Scan className="w-5 h-5 md:w-6 md:h-6 group-hover:rotate-90 transition-all duration-300" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
        </span>
      </button>

      {/* ==================== MOBILE RESPONSIVE BOTTOM NAVIGATION BAR ==================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 flex justify-around items-center py-2 z-20 shadow-lg">
        {[
          { id: "/depot/dashboard", label: "Home", icon: LayoutDashboard },
          { id: "/depot/orders", label: "Orders", icon: ShoppingCart },
          { id: "/depot/inventory", label: "Inventory", icon: Boxes },
          { id: "/depot/delivery", label: "Handover", icon: Truck }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveRoute(tab.id as any); setActiveKpiFilter(null); }}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
              activeRoute === tab.id ? "text-purple-600 dark:text-purple-400 font-extrabold" : "text-[#6B7280] dark:text-slate-400 hover:text-[#14161B] dark:hover:text-slate-200"
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-[9px] uppercase tracking-wide font-bold">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* ==================== SIMULATED BARCODE/QR SCANNER MODAL ==================== */}
      {isScannerOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-black uppercase tracking-wider text-[#14161B] dark:text-slate-100">WMS Scanner Companion</h3>
              </div>
              <button 
                onClick={() => { setIsScannerOpen(false); setScannedProduct(null); }}
                className="p-1.5 rounded-lg text-[#6B7280] dark:text-slate-400 hover:text-[#14161B] dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              
              {/* Animated Scan Window / Mock Camera feed */}
              <div className="relative bg-slate-950 rounded-xl overflow-hidden border border-slate-800 h-44 flex flex-col items-center justify-center group">
                
                {/* Horizontal scanner red laser line */}
                <div className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)] top-1/2 animate-bounce z-10"></div>
                
                {cameraStreamActive ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                    {/* Simulated scanning grain */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,0,0,0.06),_rgba(0,255,0,0.02),_rgba(0,0,255,0.06))] bg-[length:100%_4px,_6px_100%] opacity-40"></div>
                    <div className="text-center p-4">
                      <span className="block text-purple-400 font-mono text-[10px] uppercase tracking-widest animate-pulse">● FEED: ACTIVE</span>
                      <p className="text-[11px] text-slate-300 mt-1 font-semibold">Align barcode inside scan viewport area</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <Scan className="w-8 h-8 text-slate-500 mx-auto animate-pulse" />
                    <p className="text-[11px] text-slate-300 font-semibold">Camera standby. Start stream or pick from stock below.</p>
                    <button
                      onClick={toggleCamera}
                      className="bg-purple-600/30 hover:bg-purple-600/40 text-purple-300 font-bold py-1.5 px-3 rounded-xl text-[10px] cursor-pointer"
                    >
                      Initialize Camera Stream
                    </button>
                  </div>
                )}

                {/* Corner markers for scan viewport */}
                <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-purple-500"></div>
                <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-purple-500"></div>
                <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-purple-500"></div>
                <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-purple-500"></div>
              </div>

              {/* Scanned/Search Input Fallback */}
              {!scannedProduct && (
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-[#6B7280] dark:text-slate-400 uppercase tracking-wide">Manual Lookup or Sim Swipe</label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Type medicine name to simulate barcode swipe..."
                      value={scannedQuery}
                      onChange={(e) => {
                        setScannedQuery(e.target.value);
                        const match = products.find(p => p.name.toLowerCase().includes(e.target.value.toLowerCase()));
                        if (match && e.target.value.length > 2) {
                          handleSimulateScan(match);
                        }
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-[#14161B] dark:text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {/* Suggest common products to instant click-scan */}
                  <div className="space-y-1.5 mt-2">
                    <p className="text-[9px] font-extrabold text-[#6B7280] dark:text-slate-500 uppercase tracking-widest">Instant Demo Swipe Shortcuts</p>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {products.slice(0, 10).map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleSimulateScan(p)}
                          className="bg-slate-100 dark:bg-slate-950 hover:bg-purple-50 dark:hover:bg-slate-850 text-[#14161B] dark:text-slate-300 hover:text-purple-700 dark:hover:text-white border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-[10px] font-bold cursor-pointer transition-all"
                        >
                          Swipe: {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Result detail & Inline Quick Edit */}
              {scannedProduct && (
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-purple-700 dark:text-purple-400 text-xs">{scannedProduct.name}</h4>
                      <p className="text-[10px] text-[#6B7280] dark:text-slate-400">{scannedProduct.genericName} • {scannedProduct.company}</p>
                    </div>
                    <button
                      onClick={() => setScannedProduct(null)}
                      className="text-[10px] text-rose-600 dark:text-rose-400 font-bold hover:underline cursor-pointer"
                    >
                      Clear Scan
                    </button>
                  </div>

                  {!isEditingScanned ? (
                    /* Display scanned stats & Optimal Picking Path Shelf location */
                    <div className="grid grid-cols-2 gap-3.5 text-xs">
                      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800/40">
                        <span className="block text-[9px] text-[#6B7280] dark:text-slate-500 uppercase font-bold">WMS Rack Shelf Location</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5" />
                          {editRackLoc}
                        </span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800/40">
                        <span className="block text-[9px] text-[#6B7280] dark:text-slate-500 uppercase font-bold">Current Stock Available</span>
                        <span className="font-extrabold text-[#14161B] dark:text-slate-200">{scannedProduct.availableStock} units</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800/40">
                        <span className="block text-[9px] text-[#6B7280] dark:text-slate-500 uppercase font-bold">Current Batch No</span>
                        <span className="font-semibold text-[#14161B] dark:text-slate-300 font-mono">{scannedProduct.batchNumber}</span>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800/40">
                        <span className="block text-[9px] text-[#6B7280] dark:text-slate-500 uppercase font-bold">FEFO Expiry Date</span>
                        <span className="font-semibold text-[#14161B] dark:text-slate-300">{scannedProduct.expiryDate}</span>
                      </div>

                      <div className="col-span-2">
                        <button
                          onClick={() => setIsEditingScanned(true)}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                        >
                          <Edit className="w-4 h-4" /> Edit Stock, Batch & Location
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Edit Form */
                    <div className="space-y-3.5 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider">Stock Available</label>
                          <input
                            type="number"
                            value={editStockQty}
                            onChange={(e) => setEditStockQty(parseInt(e.target.value) || 0)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2 text-[#14161B] dark:text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider">Batch Number</label>
                          <input
                            type="text"
                            value={editBatchNo}
                            onChange={(e) => setEditBatchNo(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2 font-mono text-[#14161B] dark:text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider">Expiry Date</label>
                          <input
                            type="date"
                            value={editExpiryDate}
                            onChange={(e) => setEditExpiryDate(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2 text-[#14161B] dark:text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider">Rack / Shelf Location</label>
                          <input
                            type="text"
                            value={editRackLoc}
                            onChange={(e) => setEditRackLoc(e.target.value)}
                            placeholder="e.g. Rack A-04, Shelf 2"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2 text-[#14161B] dark:text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2.5">
                        <button
                          onClick={() => setIsEditingScanned(false)}
                          className="flex-1 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-850 border border-slate-300 dark:border-slate-800 text-[#6B7280] dark:text-slate-400 hover:text-[#14161B] dark:hover:text-white font-bold py-2 rounded-xl cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleQuickUpdateStock}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
