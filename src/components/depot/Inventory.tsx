import React, { useState } from "react";
import { Product } from "../../types";
import { 
  Search, AlertTriangle, Calendar, MapPin, Edit, ChevronLeft, ChevronRight, 
  Boxes, RefreshCw, X, Check, Eye, HelpCircle, CheckCircle2, Barcode, Wand2
} from "lucide-react";
import { getRackLocation, saveRackLocation, getBarcodeForProduct } from "./depotUtils";
import ChainLinkEmptyState from "./ChainLinkEmptyState";

interface InventoryProps {
  products: Product[];
  onQuickEdit?: (product: Product) => void;
}

export default function Inventory({ products, onQuickEdit }: InventoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expiryFilter, setExpiryFilter] = useState<"all" | "critical" | "warning" | "safe">("all");
  const [stockFilter, setStockFilter] = useState<"all" | "low">("all");
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Local Stock Edit Modal State (in case called stand-alone)
  const [localEditProduct, setLocalEditProduct] = useState<Product | null>(null);
  const [editStockQty, setEditStockQty] = useState(0);
  const [editBatchNo, setEditBatchNo] = useState("");
  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [editRackLoc, setEditRackLoc] = useState("");
  const [editBarcode, setEditBarcode] = useState("");
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Calculate Expiry Status & Badge Color
  const getExpiryStatus = (expiryDateStr: string) => {
    if (!expiryDateStr) return { label: "Unknown Expiry", level: "unknown", color: "text-slate-500 bg-slate-900 border-slate-800" };
    
    const expiryDate = new Date(expiryDateStr);
    const msLeft = expiryDate.getTime() - Date.now();
    const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return { label: "EXPIRED", level: "expired", color: "text-red-500 bg-red-950/40 border-red-900 animate-pulse font-black" };
    }
    if (daysLeft < 90) { // < 3 months
      return { label: `CRITICAL: Expiry ${daysLeft}d`, level: "critical", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" };
    }
    if (daysLeft < 180) { // < 6 months
      return { label: `WARNING: Expiry ${daysLeft}d`, level: "warning", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    }
    return { label: `Safe: ${daysLeft} days left`, level: "safe", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
  };

  // Advanced search and filters logic across 20k+ entries
  const processedProducts = products.filter(product => {
    // Expiry FEFO Filter
    const expStatus = getExpiryStatus(product.expiryDate);
    if (expiryFilter === "critical" && expStatus.level !== "critical" && expStatus.level !== "expired") return false;
    if (expiryFilter === "warning" && expStatus.level !== "warning") return false;
    if (expiryFilter === "safe" && expStatus.level !== "safe") return false;

    // Stock Filter
    if (stockFilter === "low" && product.availableStock >= 100) return false;

    // Search query matched on Name, Generic, Company, or Rack Location
    const rackLocation = getRackLocation(product.id, product.name, product.category);
    const searchStr = `${product.name} ${product.genericName} ${product.company} ${rackLocation}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  // Pagination bounds
  const totalItems = processedProducts.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedProducts = processedProducts.slice(startIndex, startIndex + pageSize);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleOpenEdit = (prod: Product) => {
    // If parent handler exists, defer to parent (opens Dashboard Scanner)
    if (onQuickEdit) {
      onQuickEdit(prod);
      return;
    }

    // Fallback: Open locally
    setLocalEditProduct(prod);
    setEditStockQty(prod.availableStock);
    setEditBatchNo(prod.batchNumber);
    setEditExpiryDate(prod.expiryDate);
    setEditRackLoc(getRackLocation(prod.id, prod.name, prod.category));
    setEditBarcode(prod.barcode || "");
  };

  const handleBackfillBarcodes = async () => {
    setIsBackfilling(true);
    try {
      const res = await fetch("/api/depot/products/backfill-barcodes", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setSuccessBanner(`Successfully registered barcodes for ${data.updatedCount} products across depot catalog!`);
        setTimeout(() => setSuccessBanner(null), 5000);
      } else {
        setErrorBanner(data.error || "Failed to backfill barcodes");
      }
    } catch (err: any) {
      setErrorBanner("Failed to backfill barcodes: " + err.message);
    } finally {
      setIsBackfilling(false);
    }
  };

  const handleLocalSave = async () => {
    if (!localEditProduct) return;
    try {
      const res = await fetch("/api/admin/inventory/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: localEditProduct.id,
          availableStock: editStockQty,
          batchNumber: editBatchNo,
          expiryDate: editExpiryDate
        })
      });

      if (res.ok) {
        // Save barcode if provided or changed
        if (editBarcode.trim() && editBarcode.trim() !== (localEditProduct.barcode || "")) {
          await fetch(`/api/depot/products/${localEditProduct.id}/barcode`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ barcode: editBarcode.trim() })
          });
        }

        saveRackLocation(localEditProduct.id, editRackLoc);
        setSuccessBanner(`Inventory details updated successfully for ${localEditProduct.name}.`);
        setLocalEditProduct(null);
        setTimeout(() => setSuccessBanner(null), 4000);
      } else {
        setErrorBanner("Failed to update inventory.");
      }
    } catch (err) {
      setErrorBanner("An error occurred during update.");
    }
  };

  return (
    <div className="space-y-6 font-sans">

      {/* Success banner */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          {successBanner}
        </div>
      )}

      {/* Controls & Search */}
      <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-sm">
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-2.5 w-4.5 h-4.5 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search by Medicine Name, Generic Name, Company, or Rack Location..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset page on type
            }}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-[#14161B] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-purple-600 transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-[#6B7280] dark:text-slate-500 font-extrabold uppercase tracking-wide">FEFO Expiry Filter:</span>
            {[
              { id: "all", label: "All Items" },
              { id: "critical", label: "Critical (<3m)" },
              { id: "warning", label: "Warning (<6m)" },
              { id: "safe", label: "Safe Stock" }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => { setExpiryFilter(f.id as any); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  expiryFilter === f.id 
                    ? "bg-purple-600 text-white shadow-sm shadow-purple-600/20" 
                    : "text-[#6B7280] hover:text-[#14161B] dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-[#6B7280] dark:text-slate-500 font-extrabold uppercase tracking-wide">Stock State:</span>
            <button
              onClick={() => { setStockFilter(stockFilter === "all" ? "low" : "all"); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                stockFilter === "low" 
                  ? "bg-rose-600 text-white shadow-sm shadow-rose-600/20" 
                  : "text-[#6B7280] hover:text-[#14161B] dark:text-slate-400 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900"
              }`}
            >
              Show Low Stock (&lt;100)
            </button>

            <button
              onClick={handleBackfillBarcodes}
              disabled={isBackfilling}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-600/20 dark:text-purple-400 dark:border-purple-500/30 hover:bg-purple-600 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Generate and persist EAN-13 barcodes for any products lacking barcodes"
            >
              <Wand2 className={`w-3.5 h-3.5 ${isBackfilling ? "animate-spin" : ""}`} />
              <span>{isBackfilling ? "Registering Barcodes..." : "Backfill Missing Barcodes"}</span>
            </button>
          </div>
        </div>

      </div>

      {/* Main Table Layout */}
      <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Table summary */}
        <div className="p-4 bg-slate-50/70 dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs text-[#6B7280] dark:text-slate-400 font-bold">
          <span>Found {totalItems} matches in warehouse catalog</span>
          <span>Showing {totalItems > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + pageSize, totalItems)}</span>
        </div>

        {paginatedProducts.length === 0 ? (
          <div className="p-8">
            <ChainLinkEmptyState 
              icon={Boxes}
              title="No Inventory Items Found"
              description="Try adjusting your search keywords, FEFO expiration filter, or stock level criteria."
              actionLabel="Clear Filters"
              onAction={() => {
                setSearchTerm("");
                setExpiryFilter("all");
                setStockFilter("all");
                setCurrentPage(1);
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50/50 dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800 text-[#6B7280] dark:text-slate-400">
                <tr>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Medicine Information</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Barcode (EAN-13)</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Batch Code</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Rack Location</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px]">WMS Expiry Warning (FEFO)</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Stock Count</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-900 text-[#14161B] dark:text-slate-300 font-medium">
                {paginatedProducts.map(product => {
                  const exp = getExpiryStatus(product.expiryDate);
                  const isLow = product.availableStock < 100;
                  const rackLoc = getRackLocation(product.id, product.name, product.category);
                  const { barcode: code, isRegistered } = getBarcodeForProduct(product.id, product.barcode);

                  return (
                    <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-all">
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-[#14161B] dark:text-slate-100 text-sm">{product.name}</span>
                          <span className="text-[10px] text-[#6B7280] dark:text-slate-500 mt-0.5">{product.genericName} • {product.company}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[#14161B] dark:text-amber-300/90 flex items-center gap-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-md">
                            <Barcode className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                            {code}
                          </span>
                          {!isRegistered && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 font-bold" title="Temporary fallback. Click Backfill Barcodes above to persist in DB.">
                              Fallback
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-mono font-bold text-[#6B7280] dark:text-slate-400">{product.batchNumber || "B-3281"}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 font-bold text-[#14161B] dark:text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>{rackLoc}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${exp.color}`}>
                          {exp.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-black text-sm ${isLow ? "text-rose-600 dark:text-rose-400" : "text-[#14161B] dark:text-slate-100"}`}>
                            {product.availableStock} units
                          </span>
                          {isLow && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 text-[8px] font-black uppercase">Low</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleOpenEdit(product)}
                          className="bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-600/10 dark:hover:bg-purple-600 dark:text-purple-400 dark:hover:text-white dark:border-purple-500/20 dark:hover:border-purple-500 p-2 rounded-xl transition-all cursor-pointer shadow-sm"
                          title="Update Stock & Barcode Info"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Dynamic Pagination Controls */}
        <div className="p-4 bg-slate-50/70 dark:bg-slate-950 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          
          {/* Page Selector Size */}
          <div className="flex items-center gap-2">
            <span className="text-[#6B7280] dark:text-slate-500 font-bold">Page Size:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1 text-[#14161B] dark:text-slate-300 focus:outline-none"
            >
              {[15, 30, 50, 100].map(size => (
                <option key={size} value={size}>{size} rows</option>
              ))}
            </select>
          </div>

          {/* Stepper Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[#6B7280] hover:text-[#14161B] dark:text-slate-400 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <div className="px-3.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[#14161B] dark:text-slate-300 font-bold">
              Page {currentPage} of {totalPages || 1}
            </div>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[#6B7280] hover:text-[#14161B] dark:text-slate-400 dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

      {/* ==================== STANDALONE QUICK EDIT INLINE MODAL ==================== */}
      {localEditProduct && (
        <div className="fixed inset-0 bg-slate-950/70 dark:bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-black uppercase tracking-wider text-[#14161B] dark:text-slate-100 flex items-center gap-1.5">
                <Boxes className="w-4.5 h-4.5 text-purple-600 dark:text-purple-400" />
                Quick Stock Override
              </h4>
              <button onClick={() => setLocalEditProduct(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="font-extrabold text-[#14161B] dark:text-slate-200 text-sm block">{localEditProduct.name}</span>
                <span className="text-[10px] text-[#6B7280] dark:text-slate-400 mt-0.5">{localEditProduct.genericName}</span>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider">Available Stock</label>
                  <input
                    type="number"
                    value={editStockQty}
                    onChange={(e) => setEditStockQty(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-[#14161B] dark:text-white focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider">Batch Number</label>
                  <input
                    type="text"
                    value={editBatchNo}
                    onChange={(e) => setEditBatchNo(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-mono text-[#14161B] dark:text-white focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider">Expiry Date</label>
                  <input
                    type="date"
                    value={editExpiryDate}
                    onChange={(e) => setEditExpiryDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-[#14161B] dark:text-white focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#6B7280] dark:text-slate-400 uppercase tracking-wider">Rack / Shelf Location</label>
                  <input
                    type="text"
                    value={editRackLoc}
                    onChange={(e) => setEditRackLoc(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-[#14161B] dark:text-white focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <Barcode className="w-3.5 h-3.5" />
                    Product Barcode (EAN-13 / GTIN)
                  </label>
                  <input
                    type="text"
                    value={editBarcode}
                    onChange={(e) => setEditBarcode(e.target.value)}
                    placeholder="e.g. 8801234567891"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-mono text-amber-600 dark:text-amber-300 font-bold focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[9px] text-[#6B7280] dark:text-slate-500 block">
                    Used by pickers with mobile camera scanners to verify correct medicine selection.
                  </span>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={() => setLocalEditProduct(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-[#14161B] dark:text-slate-400 font-bold py-2 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLocalSave}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded-xl cursor-pointer shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
