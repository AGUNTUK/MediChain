import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Truck,
  Sparkles,
  Package,
  ArrowLeft,
  Tag
} from "lucide-react";
import { Product } from "../types";
import MediChainLogo from "./MediChainLogo";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartData: {
    items: Array<{ product: Product; quantity: number }>;
    totalMrp: number;
    totalAmount: number;
    totalSavings: number;
  } | null;
  cartCount: number;
  onUpdateCartQty: (productId: string, currentQty: number, change: number) => Promise<void>;
  onRemoveItem: (productId: string) => Promise<void>;
  onCheckoutTrigger: () => void;
  onBrowseCatalog?: () => void;
}

const FREE_DELIVERY_THRESHOLD = 10000;
const DELIVERY_FEE = 30;

export default function CartDrawer({
  isOpen,
  onClose,
  cartData,
  cartCount,
  onUpdateCartQty,
  onRemoveItem,
  onCheckoutTrigger,
  onBrowseCatalog
}: CartDrawerProps) {
  const items = cartData?.items || [];
  const totalAmount = cartData?.totalAmount || 0;
  const totalSavings = cartData?.totalSavings || 0;
  const totalMrp = cartData?.totalMrp || 0;

  // Free delivery calculation
  const deliveryNeeded = Math.max(0, FREE_DELIVERY_THRESHOLD - totalAmount);
  const deliveryProgress = Math.min(100, Math.round((totalAmount / FREE_DELIVERY_THRESHOLD) * 100));
  const isFreeDelivery = totalAmount >= FREE_DELIVERY_THRESHOLD;
  const finalPayable = totalAmount + (isFreeDelivery || totalAmount === 0 ? 0 : DELIVERY_FEE);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer transition-opacity"
          />

          {/* Slide-over Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="relative w-full max-w-md bg-white shadow-2xl z-10 flex flex-col h-full overflow-hidden border-l border-slate-200/80"
          >
            {/* 1. Header Bar */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-purple/10 text-brand-purple flex items-center justify-center border border-brand-purple/20">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 tracking-tight">Procurement Cart</h3>
                    {cartCount > 0 && (
                      <span className="text-[10px] font-black bg-brand-lime text-slate-950 px-2 py-0.5 rounded-full shadow-xs">
                        {cartCount} {cartCount === 1 ? "Box" : "Boxes"}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-semibold">
                    Wholesale B2B Order Summary
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                aria-label="Close cart"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {items.length === 0 ? (
              /* Empty Cart State */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center border border-slate-200/80 shadow-md mb-4 text-slate-300">
                  <ShoppingBag className="w-9 h-9" />
                </div>
                <h4 className="text-base font-extrabold text-slate-800">Your Cart is Empty</h4>
                <p className="text-xs text-slate-400 max-w-xs mt-1.5 leading-relaxed font-medium">
                  Add wholesale medicines and pharmacy stock from the catalog to place orders with instant depot dispatch.
                </p>
                <button
                  onClick={() => {
                    onClose();
                    if (onBrowseCatalog) onBrowseCatalog();
                  }}
                  className="mt-6 px-6 py-3 bg-brand-purple hover:bg-brand-purple/90 text-white font-bold text-xs rounded-xl shadow-md shadow-brand-purple/20 transition-all cursor-pointer"
                >
                  Browse Wholesale Catalog
                </button>
              </div>
            ) : (
              <>
                {/* 2. Express Delivery Milestone Banner */}
                <div className="bg-gradient-to-r from-purple-50/80 via-slate-50 to-emerald-50/60 px-5 py-3.5 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                      <Truck className="w-4 h-4 text-brand-purple" />
                      <span>Express Depot Delivery</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-600">
                      {isFreeDelivery ? (
                        <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> FREE Delivery!
                        </span>
                      ) : (
                        `৳${totalAmount.toLocaleString()} / ৳${FREE_DELIVERY_THRESHOLD.toLocaleString()}`
                      )}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden p-0.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${deliveryProgress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className={`h-full rounded-full transition-all ${
                        isFreeDelivery
                          ? "bg-gradient-to-r from-emerald-400 to-teal-500 shadow-xs"
                          : "bg-gradient-to-r from-brand-purple to-indigo-600"
                      }`}
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 mt-2 font-medium leading-tight">
                    {isFreeDelivery ? (
                      <span className="text-emerald-700 font-bold">
                        🎉 Great news! You've unlocked FREE Express Depot Delivery for this order.
                      </span>
                    ) : (
                      <>
                        Add <strong className="text-brand-purple font-mono font-extrabold">৳{deliveryNeeded.toLocaleString()}</strong> more to qualify for FREE delivery.
                      </>
                    )}
                  </p>
                </div>

                {/* 3. Cart Items List */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  {items.map(({ product, quantity }) => (
                    <div
                      key={product.id}
                      className="bg-white border border-slate-100 hover:border-slate-200/90 rounded-2xl p-3.5 flex gap-3.5 relative shadow-xs transition-all group"
                    >
                      {/* Product Thumbnail */}
                      <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center p-1">
                        {product.imageUrl || product.image_url ? (
                          <img
                            src={product.imageUrl || product.image_url}
                            alt={product.name}
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-slate-300" />
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-extrabold bg-brand-purple/10 text-brand-purple px-1.5 py-0.5 rounded uppercase">
                            {product.category}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 truncate">
                            {product.company}
                          </span>
                        </div>

                        <h4 className="text-xs font-black text-slate-900 truncate mt-1">
                          {product.name} <span className="text-[10px] font-semibold text-slate-400">{product.strength}</span>
                        </h4>

                        <div className="flex items-baseline gap-2 mt-1.5">
                          <span className="text-[11px] font-bold text-slate-500 font-mono">
                            ৳{product.sellingPrice} / box
                          </span>
                          <span className="text-slate-300 text-[10px]">•</span>
                          <span className="text-xs font-black text-brand-purple font-mono">
                            ৳{(product.sellingPrice * quantity).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => onRemoveItem(product.id)}
                        className="absolute top-3 right-3 text-slate-300 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove medicine"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1 border border-slate-200/60 self-end">
                        <button
                          onClick={() => onUpdateCartQty(product.id, quantity, -1)}
                          className="w-6 h-6 rounded-lg bg-white text-slate-600 hover:text-rose-600 flex items-center justify-center shadow-xs hover:bg-slate-50 transition-all cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-black text-slate-800 font-mono">
                          {quantity}
                        </span>
                        <button
                          onClick={() => onUpdateCartQty(product.id, quantity, 1)}
                          className="w-6 h-6 rounded-lg bg-brand-purple text-white hover:bg-brand-purple/90 flex items-center justify-center shadow-xs transition-all cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 4. Financial Summary & Checkout CTA Footer */}
                <div className="p-5 bg-white border-t border-slate-100 shadow-[0_-12px_30px_rgba(0,0,0,0.06)] space-y-3.5 flex-shrink-0">
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-500 font-medium">
                      <span>Subtotal (M.R.P)</span>
                      <span className="font-mono font-bold">৳{totalMrp.toLocaleString()}</span>
                    </div>

                    {totalSavings > 0 && (
                      <div className="flex justify-between text-brand-purple font-bold bg-brand-purple/5 px-2.5 py-1.5 rounded-xl border border-brand-purple/10">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5 text-brand-purple" />
                          Wholesale Discount
                        </span>
                        <span className="font-mono font-black">- ৳{totalSavings.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-500 font-medium">
                      <span>Express Delivery Fee</span>
                      <span className="font-mono font-bold text-emerald-600">
                        {isFreeDelivery ? "FREE" : `৳${DELIVERY_FEE}`}
                      </span>
                    </div>

                    <div className="flex justify-between font-black text-slate-900 pt-2 border-t border-slate-100 text-sm">
                      <span>Total Net Amount</span>
                      <span className="text-brand-purple font-mono text-lg font-black">
                        ৳{finalPayable.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      onCheckoutTrigger();
                    }}
                    className="w-full bg-brand-lime hover:bg-brand-lime/90 text-slate-950 py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-lime/25 active:scale-[0.99] transition-all cursor-pointer"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="w-4.5 h-4.5" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
