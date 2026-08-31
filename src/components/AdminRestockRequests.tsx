import React, { useState, useEffect, useMemo } from "react";
import { 
  BellRing, 
  Search, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Building2, 
  Store, 
  Phone, 
  ChevronDown, 
  ChevronUp, 
  Boxes, 
  TrendingUp, 
  PackageCheck, 
  ArrowUpDown,
  ExternalLink,
  Pill,
  Sparkles,
  Users,
  Check,
  X,
  Plus
} from "lucide-react";
import { GroupedProductDemand, RestockMetrics, RestockRequestStatus, Product } from "../types";
import { restockService } from "../services/restockService";
import CategoryIcon from "./CategoryIcon";

interface AdminRestockRequestsProps {
  onOpenProductEditor?: (product: Product) => void;
}

export const AdminRestockRequests: React.FC<AdminRestockRequestsProps> = ({
  onOpenProductEditor
}) => {
  const [demandList, setDemandList] = useState<GroupedProductDemand[]>([]);
  const [metrics, setMetrics] = useState<RestockMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RestockRequestStatus | "all">("pending");
  const [sortBy, setSortBy] = useState<"most_requested" | "most_recent" | "oldest" | "name">("most_requested");

  // Expanded Product IDs
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(new Set());

  // Action Loading states
  const [resolvingProdId, setResolvingProdId] = useState<string | null>(null);
  const [updatingReqId, setUpdatingReqId] = useState<string | null>(null);

  const fetchDemandData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await restockService.getAdminGroupedDemand({
        search: searchQuery,
        status: statusFilter,
        sortBy
      });
      setDemandList(res.demand || []);
      setMetrics(res.metrics || null);
    } catch (err: any) {
      console.error("Fetch restock demand error:", err);
      setError(err.message || "Failed to load restock demand.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemandData();
  }, [statusFilter, sortBy]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDemandData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const toggleExpand = (productId: string) => {
    setExpandedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedProductIds(new Set(demandList.map(d => d.product.id)));
  };

  const collapseAll = () => {
    setExpandedProductIds(new Set());
  };

  const handleResolveProduct = async (productId: string, productName: string) => {
    if (!window.confirm(`Are you sure you want to mark all pending restock requests for "${productName}" as Restocked/Resolved? Requesting pharmacies will be notified.`)) {
      return;
    }

    try {
      setResolvingProdId(productId);
      const res = await restockService.resolveAllForProduct(productId);
      setSuccessMsg(`Successfully resolved restock alerts for ${productName}. (${res.resolvedCount} requests updated).`);
      setTimeout(() => setSuccessMsg(null), 4000);
      fetchDemandData();
    } catch (err: any) {
      setError(err.message || "Failed to resolve product restock requests.");
    } finally {
      setResolvingProdId(null);
    }
  };

  const handleUpdateStatus = async (requestId: string, status: RestockRequestStatus) => {
    try {
      setUpdatingReqId(requestId);
      await restockService.updateRequestStatus(requestId, status);
      setSuccessMsg(`Request status updated to ${status}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      fetchDemandData();
    } catch (err: any) {
      setError(err.message || "Failed to update status.");
    } finally {
      setUpdatingReqId(null);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-50 text-brand-purple rounded-2xl border border-purple-100">
              <BellRing className="w-5 h-5 text-brand-purple" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Restock Requests & Demand Intelligence
                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-brand-purple/10 text-brand-purple">
                  Procurement Hub
                </span>
              </h1>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Monitor out-of-stock medicine demand across licensed pharmacies and execute procurement decisions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDemandData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-brand-purple" : ""}`} />
            <span>Sync Data</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-bold flex items-center justify-between animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4 Summary HUD Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Pending */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Pending Requests
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {metrics?.totalPendingRequests ?? 0}
            </div>
            <div className="text-[10px] font-bold text-amber-600 mt-0.5">
              Awaiting depot replenishment
            </div>
          </div>
        </div>

        {/* Card 2: Unique Products Demanded */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-purple-50 text-brand-purple rounded-2xl border border-purple-100">
            <Pill className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Products In Demand
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {metrics?.uniqueProductsRequested ?? 0}
            </div>
            <div className="text-[10px] font-bold text-brand-purple mt-0.5">
              Unique SKU shortages
            </div>
          </div>
        </div>

        {/* Card 3: Requesting Pharmacies */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Pharmacies Requesting
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {metrics?.totalRequestingPharmacies ?? 0}
            </div>
            <div className="text-[10px] font-bold text-blue-600 mt-0.5">
              Active buyer accounts
            </div>
          </div>
        </div>

        {/* Card 4: Most Requested Product */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Top Desired Medicine
            </div>
            <div className="text-sm font-black text-slate-900 truncate mt-0.5">
              {metrics?.mostRequestedProduct?.productName || "None"}
            </div>
            <div className="text-[10px] font-bold text-emerald-600 mt-0.5 truncate">
              {metrics?.mostRequestedProduct 
                ? `${metrics.mostRequestedProduct.pharmaciesCount} Pharmacies (${metrics.mostRequestedProduct.requestCount} requests)`
                : "No pending demand"}
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar: Filters, Search, and View Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product, generic, manufacturer, or pharmacy..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-brand-purple/20 transition-all cursor-pointer"
            >
              <option value="most_requested">🔥 Most Demanded First</option>
              <option value="most_recent">🕒 Newest Requests First</option>
              <option value="oldest">⏳ Oldest Requests First</option>
              <option value="name">🔤 Product Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Status Tabs and Expand/Collapse Toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "All Demands" },
              { id: "pending", label: "Pending (অপেক্ষমাণ)" },
              { id: "restocked", label: "Restocked (পূরণকৃত)" },
              { id: "cancelled", label: "Cancelled" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="text-[11px] font-bold text-brand-purple hover:underline cursor-pointer"
            >
              Expand All
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={collapseAll}
              className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
            >
              Collapse All
            </button>
          </div>
        </div>
      </div>

      {/* Demand Groups List */}
      {loading && demandList.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200/80 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-brand-purple animate-spin mx-auto" />
          <div className="text-sm font-bold text-slate-700">Loading Restock Demands...</div>
          <div className="text-xs text-slate-400">Aggregating pharmacy requests and inventory levels</div>
        </div>
      ) : demandList.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200/80 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 bg-purple-50 text-brand-purple rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="text-base font-black text-slate-900">No Restock Requests Found</div>
          <p className="text-xs font-medium text-slate-500 max-w-sm mx-auto">
            {searchQuery 
              ? `No requests match "${searchQuery}". Try adjusting your search query or filter.` 
              : "All medicines are in healthy supply or there are no pending restock alerts from pharmacies."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {demandList.map((item) => {
            const isExpanded = expandedProductIds.has(item.product.id);
            const isOutOfStock = item.product.availableStock <= 0;
            const hasPending = item.pendingRequestsCount > 0;

            return (
              <div 
                key={item.product.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all overflow-hidden"
              >
                {/* Product Demand Header Row */}
                <div 
                  onClick={() => toggleExpand(item.product.id)}
                  className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer select-none bg-white hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                    {/* Category / Medicine Icon */}
                    <div className="p-3 bg-purple-50 text-brand-purple rounded-2xl border border-purple-100 shrink-0">
                      <CategoryIcon name={item.product.category} className="w-6 h-6" />
                    </div>

                    {/* Product & Generic Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-black text-slate-900 tracking-tight truncate">
                          {item.product.name}
                        </span>
                        {item.product.strength && (
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            {item.product.strength}
                          </span>
                        )}
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-purple-50 text-brand-purple border border-purple-100">
                          {item.product.category}
                        </span>
                      </div>

                      <div className="text-xs font-bold text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-slate-700">{item.product.genericName}</span>
                        <span>•</span>
                        <span className="text-slate-500">{item.product.company}</span>
                        <span>•</span>
                        <span className="text-slate-400">{item.product.packSize}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stock & Demand Metrics Pill */}
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    {/* Stock Status Badge */}
                    <div className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 ${
                      isOutOfStock
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}>
                      <Boxes className="w-3.5 h-3.5" />
                      <span>Stock: {item.product.availableStock}</span>
                    </div>

                    {/* Demand Aggregation Badge */}
                    <div className="px-3.5 py-1.5 rounded-xl bg-purple-50 border border-purple-200/80 text-brand-purple text-xs font-black flex items-center gap-2 shadow-2xs">
                      <Store className="w-3.5 h-3.5 text-brand-purple" />
                      <span>
                        {item.uniquePharmaciesCount} {item.uniquePharmaciesCount === 1 ? "Pharmacy" : "Pharmacies"} Requested
                      </span>
                      {hasPending && (
                        <span className="bg-brand-purple text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                          {item.pendingRequestsCount} pending
                        </span>
                      )}
                    </div>

                    {/* Quick Restock / Product Edit Trigger */}
                    {onOpenProductEditor && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenProductEditor(item.product);
                        }}
                        className="py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-brand-lime" />
                        <span>Add Stock</span>
                      </button>
                    )}

                    {/* Quick Resolve Button if pending */}
                    {hasPending && (
                      <button
                        type="button"
                        disabled={resolvingProdId === item.product.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResolveProduct(item.product.id, item.product.name);
                        }}
                        className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {resolvingProdId === item.product.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Resolve All</span>
                      </button>
                    )}

                    {/* Expand Chevron */}
                    <div className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Requesters Breakdown (Accordion Body) */}
                {isExpanded && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 pt-2 border-t border-slate-100 bg-slate-50/40 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                      <span>Requesting Pharmacies & Contact Details ({item.requesters.length})</span>
                      <span>Earliest: {new Date(item.earliestRequestAt).toLocaleDateString()}</span>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold text-[11px] uppercase tracking-wider">
                          <tr>
                            <th className="py-3 px-4">Pharmacy & Chemist</th>
                            <th className="py-3 px-4">Location</th>
                            <th className="py-3 px-4">Contact Phone</th>
                            <th className="py-3 px-4">Requested Date</th>
                            <th className="py-3 px-4">Quantity</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {item.requesters.map((req) => {
                            const isReqPending = req.status === "pending";
                            const isReqRestocked = req.status === "restocked";

                            return (
                              <tr key={req.requestId} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 px-4">
                                  <div className="font-bold text-slate-900">{req.pharmacyName}</div>
                                  <div className="text-[11px] text-slate-400">{req.ownerName}</div>
                                </td>
                                <td className="py-3 px-4 text-slate-600">
                                  {req.city}
                                </td>
                                <td className="py-3 px-4 font-mono">
                                  {req.phone !== "N/A" ? (
                                    <a 
                                      href={`tel:${req.phone}`}
                                      className="text-brand-purple hover:underline flex items-center gap-1"
                                    >
                                      <Phone className="w-3 h-3" />
                                      <span>{req.phone}</span>
                                    </a>
                                  ) : (
                                    <span className="text-slate-400">N/A</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                                  {new Date(req.requestedAt).toLocaleString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </td>
                                <td className="py-3 px-4 font-bold text-slate-800">
                                  {req.requestedQuantity} box
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    isReqRestocked
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                      : isReqPending
                                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                                      : "bg-slate-100 text-slate-600"
                                  }`}>
                                    {req.status}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {isReqPending ? (
                                      <button
                                        disabled={updatingReqId === req.requestId}
                                        onClick={() => handleUpdateStatus(req.requestId, "restocked")}
                                        title="Mark Restocked and Notify"
                                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer transition-all"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                    ) : (
                                      <button
                                        disabled={updatingReqId === req.requestId}
                                        onClick={() => handleUpdateStatus(req.requestId, "pending")}
                                        title="Reopen as Pending"
                                        className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 cursor-pointer transition-all"
                                      >
                                        <Clock className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    <button
                                      disabled={updatingReqId === req.requestId}
                                      onClick={() => handleUpdateStatus(req.requestId, "cancelled")}
                                      title="Cancel Request"
                                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 cursor-pointer transition-all"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminRestockRequests;
