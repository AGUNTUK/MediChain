import React, { useState, useEffect } from "react";
import { Plus, Minus, ShoppingCart, Check, Tag, Building2, AlertTriangle, TrendingUp, Bell, Sparkles } from "lucide-react";
import { Product } from "../types";
import { formatProductPriceLabel } from "../lib/utils";
import { useCartFeedback } from "../context/FlyToCartContext";
import CategoryIcon, { getCategoryConfig } from "./CategoryIcon";
import StockAlertButton from "./StockAlertButton";

interface ProductCardProps {
  product: Product;
  cartQuantity?: number;
  onAddToCart?: (productId: string, quantity: number) => Promise<boolean | void> | void;
  onUpdateCartQty?: (productId: string, currentQty: number, delta: number) => Promise<boolean | void> | void;
  onOpenDetails?: (product: Product) => void;
  className?: string;
  layout?: "grid" | "horizontal";
}

const ProductCardComponent: React.FC<ProductCardProps> = ({
  product,
  cartQuantity = 0,
  onAddToCart,
  onUpdateCartQty,
  onOpenDetails,
  className = "",
  layout = "grid",
}) => {
  const { triggerCartFeedback, triggerButtonFeedback, isButtonAdded } = useCartFeedback();
  const [orderQty, setOrderQty] = useState<number>(1);
  const [orderQtyInput, setOrderQtyInput] = useState<string>("1");
  const [cartInputVal, setCartInputVal] = useState<string>(String(cartQuantity || 1));
  const [isAdded, setIsAdded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [imageError, setImageError] = useState(false);

  const imageUrl = product.imageUrl || product.image_url;
  const isOutOfStock = (product.availableStock ?? 0) <= 0;
  const isLowStock = (product.availableStock ?? 0) > 0 && (product.availableStock ?? 0) <= 20;
  const maxStock = (product.availableStock ?? 9999) > 0 ? (product.availableStock ?? 9999) : 9999;

  // Sync cart input when cartQuantity changes from props
  useEffect(() => {
    if (cartQuantity > 0) {
      setCartInputVal(String(cartQuantity));
    }
  }, [cartQuantity]);

  const hasBulkTiers = Boolean(product.tiers && product.tiers.length > 0);
  const maxTierDiscount = hasBulkTiers
    ? Math.max(...(product.tiers || []).map(t => t.discountPercent))
    : 0;

  // Calculate discount and profit margin percentage
  const calculatedDiscount =
    product.mrp && product.sellingPrice && product.mrp > product.sellingPrice
      ? Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100)
      : product.discountPercentage || 0;

  const categoryTheme = getCategoryConfig(product.category);

  const handleAddToCart = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (isOutOfStock || isAdding) return;

    setIsAdding(true);

    try {
      if (onAddToCart) {
        await onAddToCart(product.id, orderQty);
      } else if (onUpdateCartQty) {
        await onUpdateCartQty(product.id, cartQuantity, orderQty);
      }

      triggerCartFeedback();
      triggerButtonFeedback(product.id);

      setIsAdded(true);
      setTimeout(() => {
        setIsAdded(false);
      }, 1500);
    } catch (error) {
      console.error("Failed to add to cart:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleIncrementOrderQty = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOrderQty((prev) => {
      const next = Math.min(prev + 1, maxStock);
      setOrderQtyInput(String(next));
      return next;
    });
  };

  const handleDecrementOrderQty = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOrderQty((prev) => {
      const next = Math.max(1, prev - 1);
      setOrderQtyInput(String(next));
      return next;
    });
  };

  const handleOrderQtyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const val = e.target.value;
    setOrderQtyInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setOrderQty(Math.min(parsed, maxStock));
    }
  };

  const handleOrderQtyInputBlur = () => {
    const parsed = parseInt(orderQtyInput, 10);
    if (isNaN(parsed) || parsed < 1) {
      setOrderQty(1);
      setOrderQtyInput("1");
    } else {
      const clamped = Math.min(parsed, maxStock);
      setOrderQty(clamped);
      setOrderQtyInput(String(clamped));
    }
  };

  const handleCartInputCommit = (valStr: string) => {
    const parsed = parseInt(valStr, 10);
    if (isNaN(parsed) || parsed <= 0) {
      if (onUpdateCartQty) {
        onUpdateCartQty(product.id, cartQuantity, -cartQuantity);
      }
    } else {
      const clamped = Math.min(parsed, maxStock);
      setCartInputVal(String(clamped));
      const delta = clamped - cartQuantity;
      if (delta !== 0 && onUpdateCartQty) {
        onUpdateCartQty(product.id, cartQuantity, delta);
      }
    }
  };

  const handleCardClick = () => {
    if (onOpenDetails) {
      onOpenDetails(product);
    }
  };

  if (layout === "horizontal") {
    return (
      <div
        onClick={handleCardClick}
        className={`bg-white rounded-2xl p-3.5 border border-slate-100 shadow-2xs hover:shadow-md hover:border-slate-200 transition-all cursor-pointer relative flex flex-col gap-2.5 ${className}`}
      >
        {/* Top Header Row: Image + Main Details + Right Pricing Column */}
        <div className="flex gap-3 items-start">
          {/* Image Container with Exact Category Vector Fallback */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex-shrink-0 flex items-center justify-center p-1 relative">
            {imageUrl && !imageError ? (
              <img
                src={imageUrl}
                alt={product.name}
                loading="lazy"
                onError={() => setImageError(true)}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className={`w-full h-full rounded-lg flex items-center justify-center p-2 ${categoryTheme.bg} ${categoryTheme.text}`}>
                <CategoryIcon name={product.category} className="w-7 h-7" />
              </div>
            )}
            <span className="absolute bottom-0.5 left-0.5 bg-slate-900/80 backdrop-blur-xs text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
              {product.category}
            </span>
          </div>

          {/* Product Details (Middle) */}
          <div className="flex-1 min-w-0 space-y-0.5">
            <h3 className="text-sm sm:text-base font-black text-slate-900 line-clamp-1 leading-snug">
              {product.name} <span className="text-xs font-bold text-slate-500 font-mono">({product.strength})</span>
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate mt-0.5">
              {product.genericName}
            </p>
            <p className="text-xs text-slate-500 font-semibold truncate flex items-center gap-1 mt-0.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{product.company}</span>
            </p>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-600 pt-1">
              <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold">{product.packSize}</span>
              <span className="text-slate-300">•</span>
              <span className="font-bold text-slate-700">মজুদ: {isOutOfStock ? 0 : (product.availableStock ?? 0)} বক্স</span>
            </div>
          </div>

          {/* Price / Savings Column (Right) */}
          <div className="shrink-0 text-right flex flex-col items-end gap-1 min-w-[95px] sm:min-w-[110px]">
            {hasBulkTiers && maxTierDiscount > 0 && (
              <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 shadow-2xs flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" />
                <span>বাল্ক ডিল {maxTierDiscount}%</span>
              </span>
            )}
            {calculatedDiscount > 0 && (
              <span className="bg-brand-lime text-slate-950 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider shrink-0 shadow-2xs">
                <strong className="font-black font-extrabold">{calculatedDiscount}% সাশ্রয়</strong>
              </span>
            )}
            <div className="flex items-baseline gap-1 flex-wrap justify-end">
              <span className="text-sm sm:text-base font-black text-brand-purple">৳{product.sellingPrice}</span>
              {product.mrp > product.sellingPrice && (
                <span className="text-xs text-slate-400 line-through font-medium">৳{product.mrp}</span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 font-mono block leading-none">
              {formatProductPriceLabel(product.sellingPrice, product.packSize)}
            </span>
            {product.mrp > product.sellingPrice && (
              <span className="text-[9px] bg-emerald-50 text-emerald-700 font-black border border-emerald-200 px-2 py-0.5 rounded whitespace-nowrap">
                <strong className="font-black font-extrabold">সাশ্রয় ৳{product.mrp - product.sellingPrice}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Bottom Controls Row */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          {cartQuantity > 0 ? (
            <div
              className="flex items-center justify-between gap-2 bg-brand-purple/5 border border-brand-purple/20 rounded-xl px-2.5 py-1.5 w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-xs font-black text-brand-purple font-mono truncate">
                  {cartQuantity} বক্স কার্টে আছে
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateCartQty?.(product.id, cartQuantity, -1);
                  }}
                  className="w-7 h-7 bg-white text-brand-purple border border-brand-purple/30 hover:bg-brand-purple hover:text-white rounded-lg transition-colors flex items-center justify-center cursor-pointer shadow-3xs"
                  title="পরিমাণ কমান"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={maxStock}
                  value={cartInputVal}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    setCartInputVal(e.target.value);
                  }}
                  onBlur={() => handleCartInputCommit(cartInputVal)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="w-12 text-center text-xs font-black text-brand-purple font-mono bg-white rounded-lg border border-brand-purple/30 py-1 px-0.5 outline-none focus:ring-1 focus:ring-brand-purple"
                  title="ম্যানুয়াল পরিমাণ লিখুন"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (cartQuantity < maxStock) {
                      onUpdateCartQty?.(product.id, cartQuantity, 1);
                    }
                  }}
                  disabled={cartQuantity >= maxStock}
                  className="w-7 h-7 bg-white text-brand-purple border border-brand-purple/30 hover:bg-brand-purple hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-brand-purple rounded-lg transition-colors flex items-center justify-center cursor-pointer shadow-3xs"
                  title="পরিমাণ বাড়ান"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full gap-2" onClick={(e) => e.stopPropagation()}>
              <div className="text-xs font-bold text-slate-500 truncate hidden xs:block">
                পাইকারি রেট
              </div>

              {isOutOfStock ? (
                <div onClick={(e) => e.stopPropagation()} className="ml-auto">
                  <StockAlertButton productId={product.id} productName={product.name} compact={true} />
                </div>
              ) : (
                <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto ml-auto">
                  {/* Quantity Selector: - and + with manual quantity input */}
                  <div className="flex items-center bg-slate-50 border border-slate-200/90 rounded-xl p-0.5 gap-1 shadow-2xs shrink-0">
                    <button
                      type="button"
                      onClick={handleDecrementOrderQty}
                      className="w-7 h-7 bg-white text-slate-600 hover:text-brand-purple hover:bg-slate-100 rounded-lg transition-colors flex items-center justify-center cursor-pointer border border-slate-200/60 shadow-3xs"
                      title="পরিমাণ কমান"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={maxStock}
                      value={orderQtyInput}
                      onClick={(e) => e.stopPropagation()}
                      onChange={handleOrderQtyInputChange}
                      onBlur={handleOrderQtyInputBlur}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className="w-12 text-center text-xs font-black text-slate-800 font-mono bg-white rounded-lg border border-slate-200/80 py-1 px-0.5 outline-none focus:ring-1 focus:ring-brand-purple"
                      title="ম্যানুয়াল পরিমাণ লিখুন"
                    />
                    <button
                      type="button"
                      onClick={handleIncrementOrderQty}
                      disabled={orderQty >= maxStock}
                      className="w-7 h-7 bg-white text-slate-600 hover:text-brand-purple hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600 rounded-lg transition-colors flex items-center justify-center cursor-pointer border border-slate-200/60 shadow-3xs"
                      title="পরিমাণ বাড়ান"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={isAdding}
                    className={`py-2 px-3.5 sm:px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                      isAdded
                        ? "bg-emerald-600 text-white shadow-md"
                        : isAdding
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-brand-lime hover:bg-brand-lime-dark text-slate-950 shadow-xs hover:shadow-md"
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>যোগ হয়েছে</span>
                      </>
                    ) : isAdding ? (
                      <span>যোগ হচ্ছে...</span>
                    ) : (
                      <>
                        <ShoppingCart className="w-3.5 h-3.5 text-slate-950" />
                        <span>যোগ করুন</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={handleCardClick}
      className={`bg-white rounded-2xl border border-slate-100 shadow-3xs hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between overflow-hidden relative group ${className}`}
    >
      <div>
        {/* Top Aspect Ratio Image Container */}
        <div className="w-full h-32 sm:h-36 bg-slate-50 border-b border-slate-100 flex items-center justify-center p-3 relative overflow-hidden">
          {/* Category & Discount Badges */}
          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 items-start">
            <span className="bg-slate-900/80 backdrop-blur-xs text-white text-[8px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider">
              {product.category}
            </span>
            {hasBulkTiers && maxTierDiscount > 0 && (
              <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase shadow-xs flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" /> বাল্ক {maxTierDiscount}% ছাড়
              </span>
            )}
            {calculatedDiscount > 0 && (
              <span className="bg-brand-lime text-slate-950 text-[8.5px] font-black px-1.5 py-0.5 rounded-md uppercase shadow-xs flex items-center gap-0.5">
                <Tag className="w-2.5 h-2.5 stroke-[2.5]" /> <strong className="font-black font-extrabold">{calculatedDiscount}% সাশ্রয়</strong>
              </span>
            )}
          </div>

          {/* Stock Status Badge */}
          <div className="absolute top-2 right-2 z-10">
            {isOutOfStock ? (
              <span className="bg-rose-100 text-rose-700 border border-rose-200 text-[8px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                <AlertTriangle className="w-2.5 h-2.5" /> স্টকে নেই
              </span>
            ) : isLowStock ? (
              <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                কম মজুদ ({product.availableStock})
              </span>
            ) : (
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                স্টকে আছে
              </span>
            )}
          </div>

          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={product.name}
              loading="lazy"
              onError={() => setImageError(true)}
              className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center p-3 ${categoryTheme.bg} ${categoryTheme.text}`}>
              <CategoryIcon name={product.category} className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Card Body Information */}
        <div className="p-3.5 space-y-2">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 line-clamp-1 leading-snug">
              {product.name} <span className="text-xs font-bold text-slate-500 font-mono">({product.strength})</span>
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider line-clamp-1 mt-0.5">
              {product.genericName}
            </p>
            <p className="text-xs text-slate-500 font-semibold truncate flex items-center gap-1 mt-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{product.company}</span>
            </p>
          </div>

          {/* Pricing Row */}
          <div className="pt-2 border-t border-slate-100 flex items-start justify-between gap-1.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-sm sm:text-base font-black text-brand-purple">৳{product.sellingPrice}</span>
                {product.mrp > product.sellingPrice && (
                  <span className="text-xs text-slate-400 line-through font-medium">৳{product.mrp}</span>
                )}
              </div>
              <span className="text-[10px] text-slate-500 font-mono block">
                {formatProductPriceLabel(product.sellingPrice, product.packSize)}
              </span>
            </div>
            <div className="flex flex-col items-end gap-1">
              {product.packSize && (
                <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-mono shrink-0">
                  {product.packSize}
                </span>
              )}
              {calculatedDiscount > 0 && (
                <span className="text-[10px] bg-purple-50 text-brand-purple font-black border border-purple-200 px-2 py-0.5 rounded shrink-0">
                  <strong className="font-black font-extrabold">{calculatedDiscount}% লাভ</strong>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Card Action Controls */}
      <div className="p-3.5 pt-0 mt-auto">
        {cartQuantity > 0 ? (
          <div
            className="flex items-center justify-between bg-brand-purple/5 border border-brand-purple/20 rounded-xl p-1 w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateCartQty?.(product.id, cartQuantity, -1);
              }}
              className="w-7 h-7 bg-white text-brand-purple border border-brand-purple/20 hover:bg-brand-purple hover:text-white rounded-lg transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
              title="পরিমাণ কমান"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              min={1}
              max={maxStock}
              value={cartInputVal}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                e.stopPropagation();
                setCartInputVal(e.target.value);
              }}
              onBlur={() => handleCartInputCommit(cartInputVal)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="w-10 text-center text-xs font-black text-brand-purple font-mono bg-white rounded-lg border border-brand-purple/20 py-1 px-0.5 outline-none focus:ring-1 focus:ring-brand-purple"
              title="ম্যানুয়াল পরিমাণ লিখুন"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (cartQuantity < maxStock) {
                  onUpdateCartQty?.(product.id, cartQuantity, 1);
                }
              }}
              disabled={cartQuantity >= maxStock}
              className="w-7 h-7 bg-white text-brand-purple border border-brand-purple/20 hover:bg-brand-purple hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-brand-purple rounded-lg transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
              title="পরিমাণ বাড়ান"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {/* Quantity Selector Counter with Manual Input */}
            <div className="flex items-center border border-slate-200 bg-slate-50 rounded-xl overflow-hidden shrink-0">
              <button
                type="button"
                onClick={handleDecrementOrderQty}
                className="w-6 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                title="পরিমাণ কমান"
              >
                <Minus className="w-3 h-3" />
              </button>
              <input
                type="number"
                min={1}
                max={maxStock}
                value={orderQtyInput}
                onClick={(e) => e.stopPropagation()}
                onChange={handleOrderQtyInputChange}
                onBlur={handleOrderQtyInputBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="w-9 text-center text-xs font-black text-slate-800 font-mono bg-transparent outline-none border-none py-1 px-0.5"
                title="ম্যানুয়াল পরিমাণ লিখুন"
              />
              <button
                type="button"
                onClick={handleIncrementOrderQty}
                disabled={orderQty >= maxStock}
                className="w-6 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-200 disabled:opacity-40 rounded-none transition-colors cursor-pointer"
                title="পরিমাণ বাড়ান"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Add to Cart Button or Out of Stock Notify */}
            {isOutOfStock ? (
              <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                <StockAlertButton 
                  productId={product.id} 
                  productName={product.name} 
                  compact={true} 
                  className="w-full justify-center py-2"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isAdding}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                  isAdded
                    ? "bg-emerald-600 text-white shadow-md"
                    : isAdding
                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                    : "bg-brand-lime hover:bg-brand-lime-dark text-slate-950 hover:shadow-md"
                }`}
              >
                {isAdded ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>যোগ হয়েছে!</span>
                  </>
                ) : isAdding ? (
                  <span>যোগ হচ্ছে...</span>
                ) : (
                  <>
                    <ShoppingCart className="w-3.5 h-3.5 text-slate-950" />
                    <span>কার্টে যোগ করুন</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const ProductCard = React.memo(ProductCardComponent);
export default ProductCard;


