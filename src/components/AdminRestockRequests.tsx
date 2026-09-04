import React, { useState, useEffect } from "react";
import { Bell, RefreshCw, CheckCircle, Package, Search, ExternalLink, Filter } from "lucide-react";

interface AdminRestockRequestsProps {
  onOpenProductEditor?: (prod: any) => void;
}

export default function AdminRestockRequests({ onOpenProductEditor }: AdminRestockRequestsProps) {
  const [loading, setLoading] = useState(false);
  const [demand, setDemand] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ totalPendingRequests: 0, totalRestocked: 0 });
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/restock/requests");
      if (res.ok) {
        const data = await res.json();
        setDemand(data.demand || []);
        if (data.metrics) setMetrics(data.metrics);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredDemand = demand.filter(d => 
    !search || 
    (d.productName && d.productName.toLowerCase().includes(search.toLowerCase())) ||
    (d.genericName && d.genericName.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            Restock Requests & Pharmacy Demand
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Track out-of-stock items requested by verified pharmacies to prioritize replenishment.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Pending Requests</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{metrics.totalPendingRequests || demand.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Unique Products Demanded</p>
          <p className="text-2xl font-bold text-brand-purple mt-1">{demand.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <p className="text-xs text-slate-500 font-medium">Restocked Total</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{metrics.totalRestocked || 0}</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter requested medicines by brand or generic name..."
          className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-brand-purple"
        />
      </div>

      {/* Demand Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredDemand.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            {loading ? "Loading restock demand..." : "No active restock demand found."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Medicine</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3 text-center">Requests</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDemand.map((item, idx) => (
                  <tr key={item.productId || idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">{item.productName || "Unknown"}</p>
                      <p className="text-[11px] text-slate-400">{item.genericName}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.company || "N/A"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">
                        {item.requestCount || item.count || 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                        Out of Stock
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {onOpenProductEditor && item.product && (
                        <button
                          onClick={() => onOpenProductEditor(item.product)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-brand-purple hover:bg-purple-100 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Update Stock
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
