import React, { useState, useEffect } from "react";
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Check, 
  Sparkles, 
  ShoppingCart, 
  Search, 
  AlertCircle, 
  Package, 
  CheckCircle2,
  Clock,
  ArrowRight
} from "lucide-react";
import { KhataShortItem } from "../../types/khata";
import { Product } from "../../types";
import { productService } from "../../services";
import { toBengaliNumber } from "../../lib/utils";

interface PharmaKhataShortBookProps {
  shortBook: KhataShortItem[];
  onAddShortItem: (item: {
    productId?: string | null;
    medicine_name: string;
    generic_name?: string;
    company?: string;
    required_qty: number;
    pack_size?: string;
    estimated_price?: number;
    notes?: string;
  }) => Promise<any>;
  onRemoveShortItem: (id: string) => void;
  onUpdateStatus: (id: string, status: 'Pending' | 'In Cart' | 'Ordered' | 'Received') => void;
  onOrderViaMediChain: (items?: KhataShortItem[]) => Promise<{ success: boolean; count: number; outOfStockCount?: number; message?: string }>;
  onOpenCart?: () => void;
}

export default function PharmaKhataShortBook({
  shortBook,
  onAddShortItem,
  onRemoveShortItem,
  onUpdateStatus,
  onOrderViaMediChain,
  onOpenCart
}: PharmaKhataShortBookProps) {
  // New Item input state
  const [medicineQuery, setMedicineQuery] = useState("");
  const [requiredQty, setRequiredQty] = useState(10);
  const [selectedPackSize, setSelectedPackSize] = useState("10x10 Box");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Catalog search suggestions
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // 1-Click order states
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderFeedback, setOrderFeedback] = useState<{ message: string; count: number } | null>(null);

  // Debounced search for catalog suggestions
  useEffect(() => {
    if (!medicineQuery.trim() || medicineQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await productService.getProducts({ search: medicineQuery.trim(), limit: 6 });
        setSuggestions(res.slice(0, 6));
        setShowSuggestions(true);
      } catch (e) {
        console.warn("Product suggestion error:", e);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [medicineQuery]);

  const handleSelectSuggestion = (p: Product) => {
    setSelectedProduct(p);
    setMedicineQuery(p.name);
    setSelectedPackSize(p.packSize || "Box");
    setShowSuggestions(false);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineQuery.trim()) return;

    await onAddShortItem({
      productId: selectedProduct?.id || null,
      medicine_name: medicineQuery.trim(),
      generic_name: selectedProduct?.genericName || "",
      company: selectedProduct?.company || "",
      required_qty: Number(requiredQty) || 1,
      pack_size: selectedPackSize,
      estimated_price: selectedProduct?.sellingPrice || 0
    });

    setMedicineQuery("");
    setSelectedProduct(null);
    setRequiredQty(10);
    setShowSuggestions(false);
  };

  const handleExecute1ClickOrder = async () => {
    const pendingItems = shortBook.filter(s => s.status === "Pending");
    if (pendingItems.length === 0) return;

    setIsOrdering(true);
    setOrderFeedback(null);

    try {
      const res = await onOrderViaMediChain(pendingItems);
      if (res.message) {
        setOrderFeedback({
          message: res.message,
          count: res.count
        });
      } else if (res.success && res.count > 0) {
        setOrderFeedback({
          message: `${toBengaliNumber(res.count)}টি ওষুধ সরাসরি মেডিচেইন কার্টে যুক্ত করা হয়েছে!`,
          count: res.count
        });
      } else {
        setOrderFeedback({
          message: "স্টক ঘাটতির কারণে ওষুধ কার্টে যুক্ত করা যায়নি।",
          count: 0
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsOrdering(false);
    }
  };

  const pendingItems = shortBook.filter(s => s.status === "Pending");
  const inCartItems = shortBook.filter(s => s.status === "In Cart");
  const orderedItems = shortBook.filter(s => s.status === "Ordered" || s.status === "Received");

  return (
    <div className="space-y-4 pb-28 animate-fade-in">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-lime-500/15 via-purple-50 to-white p-4 rounded-2xl border border-lime-300 shadow-2xs space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-lime text-slate-950 flex items-center justify-center font-black shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900">
                শর্ট খাতা — ১-ক্লিক পাইকারি প্রকিউরমেন্ট
              </h3>
              <p className="text-[11px] font-medium text-slate-600">
                দোকানের ঘাটতি ওষুধ লিখে রাখুন এবং এক ক্লিকেই মেডিচেইনে হোলসেল অর্ডার করুন
              </p>
            </div>
          </div>

          <span className="bg-brand-lime text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full border border-white shrink-0">
            {toBengaliNumber(pendingItems.length)} টি শর্ট
          </span>
        </div>
      </div>

      {/* 2. Fast Input Box to Jot Down Low-Stock Medicine */}
      <form onSubmit={handleAddItem} className="bg-white p-3.5 rounded-2xl border border-purple-100/90 shadow-2xs space-y-3 relative">
        <label className="block text-xs font-black text-slate-800">
          ঘাটতি ওষুধের নাম লিখুন
        </label>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            required
            value={medicineQuery}
            onChange={(e) => {
              setMedicineQuery(e.target.value);
              setSelectedProduct(null);
            }}
            placeholder="যেমন: Seclo 20, Napa Extra, Monas 10..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-brand-purple outline-none"
          />

          {/* Autocomplete Dropdown Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-xl border border-purple-100 z-30 max-h-52 overflow-y-auto p-1.5 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 px-2 py-1">মেডিচেইন ক্যাটালগ সাজেশন:</p>
              {suggestions.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelectSuggestion(p)}
                  className="p-2 rounded-xl hover:bg-purple-50 transition-colors cursor-pointer flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-extrabold text-slate-900 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {p.genericName} • <span className="font-semibold text-purple-700">{p.company}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-black text-purple-700">৳{toBengaliNumber(p.sellingPrice)}</span>
                    <span className="text-[10px] text-slate-400 block">• {p.packSize || "Box"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quantity and Pack Selector Row */}
        <div className="flex items-center gap-2">
          {/* Quick Quantity Buttons */}
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-slate-500 mb-1">প্রয়োজনীয় পরিমাণ (বক্স/পাতা)</label>
            <div className="flex items-center gap-1">
              {[5, 10, 20, 50].map(qty => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => setRequiredQty(qty)}
                  className={`flex-1 py-1 px-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    requiredQty === qty
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {toBengaliNumber(qty)}
                </button>
              ))}
            </div>
          </div>

          {/* Add Button */}
          <button
            type="submit"
            className="self-end py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-xs flex items-center gap-1 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>শর্ট খাতায় যোগ</span>
          </button>
        </div>
      </form>

      {/* 3. Feedback Banner after 1-Click Order */}
      {orderFeedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-between gap-2 animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-xs font-bold text-emerald-800">{orderFeedback.message}</p>
          </div>
          {onOpenCart && (
            <button
              type="button"
              onClick={onOpenCart}
              className="py-1 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black shrink-0 cursor-pointer shadow-2xs flex items-center gap-1"
            >
              <ShoppingCart className="w-3 h-3" />
              <span>কার্ট খুলুন</span>
            </button>
          )}
        </div>
      )}

      {/* 4. Short Book Items List (Pending Shortages) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
            ঘাটতি ওষুধের তালিকা ({toBengaliNumber(pendingItems.length)})
          </h4>
        </div>

        {pendingItems.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 space-y-2">
            <Package className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-600">
              বর্তমানে কোনো ওষুধ শর্ট তালিকায় নেই
            </p>
            <p className="text-[11px] text-slate-400">
              উপরের বক্সে ওষুধের নাম লিখে সহজে শর্ট খাতায় নথিভুক্ত করুন
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingItems.map(item => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-3 border border-purple-100 hover:border-purple-200 shadow-2xs flex items-center justify-between gap-3 transition-all"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                      {item.medicine_name}
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60">
                      শর্ট: {toBengaliNumber(item.required_qty)} {item.pack_size || "বক্স"}
                    </span>
                  </div>

                  {(item.generic_name || item.company) && (
                    <p className="text-[11px] text-slate-500 truncate">
                      {item.generic_name} {item.company ? `• ${item.company}` : ""}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(item.id, 'Ordered')}
                    title="অর্ডার করা হয়েছে মার্ক করুন"
                    className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveShortItem(item.id)}
                    title="মুছুন"
                    className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. In-Cart Items (Added via 1-Click Order) */}
      {inCartItems.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-purple-100">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-black text-purple-700 flex items-center gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5" />
              মেডিচেইন কার্টে যুক্ত আছে ({toBengaliNumber(inCartItems.length)}টি):
            </span>
            {onOpenCart && (
              <button
                type="button"
                onClick={onOpenCart}
                className="text-[10px] font-bold text-brand-purple hover:underline cursor-pointer"
              >
                কার্ট দেখুন ›
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {inCartItems.map(item => (
              <div
                key={item.id}
                className="bg-purple-50/70 rounded-xl p-2.5 border border-purple-200/80 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-extrabold text-slate-800">{item.medicine_name}</span>
                  <span className="text-[10px] text-slate-500 ml-1.5">• {toBengaliNumber(item.required_qty)} {item.pack_size || "বক্স"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-purple-700 bg-white px-2 py-0.5 rounded-full border border-purple-200 shadow-2xs">
                    🛒 কার্টে যুক্ত
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(item.id, 'Ordered')}
                    title="অর্ডার নিশ্চিত হয়েছে মার্ক করুন"
                    className="p-1 rounded text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Previously Ordered Short Items (Collapsible History) */}
      {orderedItems.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-500 px-1 block">
            পূর্বে অর্ডারকৃত ({toBengaliNumber(orderedItems.length)}টি):
          </span>
          <div className="space-y-1.5 opacity-75">
            {orderedItems.slice(0, 4).map(item => (
              <div
                key={item.id}
                className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-700">{item.medicine_name}</span>
                  <span className="text-[10px] text-slate-400 ml-1.5">• {toBengaliNumber(item.required_qty)} বক্স</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  ✓ অর্ডারকৃত
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Prominent Sticky Lime-Green Bottom Button: ⚡ ১-ক্লিকে মেডিচেইনে অর্ডার করুন */}
      {pendingItems.length > 0 && (
        <div className="sticky bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-purple-100 shadow-xl rounded-2xl">
          <button
            type="button"
            onClick={handleExecute1ClickOrder}
            disabled={isOrdering}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-brand-lime via-[#84cc16] to-lime-500 hover:from-lime-500 hover:to-lime-600 text-slate-950 font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
          >
            {isOrdering ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                <span>মেডিচেইন ক্যাটালগ যাচাই ও কার্টে যুক্ত হচ্ছে...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950 stroke-[2.5]" />
                <span>⚡ ১-ক্লিকে মেডিচেইনে অর্ডার করুন ({toBengaliNumber(pendingItems.length)} টি আইটেম)</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
