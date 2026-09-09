import React, { useState, useEffect } from "react";
import { 
  Plus, Edit, Trash2, CheckCircle2, AlertTriangle, Search, X, Package, Calendar, 
  Shield, Zap, Truck, Check, Star, ArrowRight, Loader2, Eye
} from "lucide-react";
import { bulkDealsService, productService } from "../services";
import { BulkCampaign, BulkCampaignProduct, Product, TrustBadgeItem } from "../types";
import BulkDealBillboardBanner from "./BulkDealBillboardBanner";

const FIXED_ICON_OPTIONS: Array<{ key: TrustBadgeItem["icon"]; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: "shield", label: "Shield", icon: Shield },
  { key: "lightning", label: "Lightning", icon: Zap },
  { key: "truck", label: "Truck", icon: Truck },
  { key: "check", label: "Checkmark", icon: Check },
  { key: "star", label: "Star", icon: Star }
];

export default function BulkDealsAdmin() {
  const [campaigns, setCampaigns] = useState<BulkCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [currentCampaign, setCurrentCampaign] = useState<Partial<BulkCampaign> | null>(null);
  const [campaignProducts, setCampaignProducts] = useState<Partial<BulkCampaignProduct>[]>([]);
  const [featuredProduct, setFeaturedProduct] = useState<Product | null>(null);
  
  // Featured Product Search state
  const [featuredSearchQuery, setFeaturedSearchQuery] = useState("");
  const [featuredSearchResults, setFeaturedSearchResults] = useState<Product[]>([]);
  const [searchingFeatured, setSearchingFeatured] = useState(false);
  
  // Products & Tiers Search state
  const [tierSearchQuery, setTierSearchQuery] = useState("");
  const [tierSearchResults, setTierSearchResults] = useState<Product[]>([]);
  const [searchingTiers, setSearchingTiers] = useState(false);

  // Form feedback state
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Tiers for a newly added product
  const defaultTiers = [{ minQty: 10, discountPercent: 10 }];

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const data = await bulkDealsService.getCampaigns();
      setCampaigns(data);
    } catch (err: any) {
      console.error("Failed to load campaigns:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (campaign: BulkCampaign) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setCurrentCampaign({
      ...campaign,
      trust_badges: (campaign.trust_badges && campaign.trust_badges.length > 0)
        ? campaign.trust_badges
        : [
            { icon: "shield", label: "Trusted Brands" },
            { icon: "lightning", label: "Bulk Discounts" },
            { icon: "truck", label: "Fast Delivery" }
          ]
    });

    if (campaign.featured_product) {
      setFeaturedProduct(campaign.featured_product);
    } else if (campaign.featured_product_id) {
      try {
        const p = await productService.getProductById(campaign.featured_product_id);
        setFeaturedProduct(p);
      } catch {
        setFeaturedProduct(null);
      }
    } else {
      setFeaturedProduct(null);
    }

    try {
      const products = await bulkDealsService.getCampaignProducts(campaign.id);
      setCampaignProducts(products);
    } catch {
      setCampaignProducts([]);
    }
    setIsEditing(true);
  };

  const handleCreate = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setCurrentCampaign({
      title: "Super Bulk Savings",
      subtext: "B2B Pharma Wholesale, Made Smarter",
      banner_color: "bg-brand-purple",
      banner_image_url: "",
      cta_text: "Order Now",
      cta_link: "/products",
      status: "Draft",
      discount_display_percent: 25,
      trust_badges: [
        { icon: "shield", label: "Trusted Brands" },
        { icon: "lightning", label: "Bulk Discounts" },
        { icon: "truck", label: "Fast Delivery" }
      ]
    });
    setFeaturedProduct(null);
    setCampaignProducts([]);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!currentCampaign) return;
    if (!currentCampaign.title?.trim()) {
      setErrorMsg("Please enter a campaign title/badge text.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let savedCampaign: BulkCampaign | null = null;
      if (currentCampaign.id) {
        savedCampaign = await bulkDealsService.updateCampaign(currentCampaign.id, currentCampaign);
      } else {
        savedCampaign = await bulkDealsService.createCampaign(currentCampaign as Omit<BulkCampaign, "id" | "created_at">);
      }

      if (savedCampaign) {
        // Save multi-product tiers
        await bulkDealsService.setCampaignProducts(
          savedCampaign.id,
          campaignProducts.map(cp => ({
            product_id: cp.product_id as string,
            tiers: cp.tiers as any[]
          }))
        );

        setSuccessMsg("Campaign saved successfully!");
        setTimeout(() => {
          setIsEditing(false);
          loadCampaigns();
        }, 600);
      } else {
        throw new Error("Failed to save campaign. The server did not return the saved record.");
      }
    } catch (err: any) {
      console.error("[Bulk Deals Admin] Save error:", err);
      setErrorMsg(err.message || "Failed to save campaign. Check console for details.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this campaign? This action cannot be undone.")) {
      return;
    }

    try {
      const ok = await bulkDealsService.deleteCampaign(id);
      if (ok) {
        if (isEditing && currentCampaign?.id === id) {
          setIsEditing(false);
        }
        loadCampaigns();
      } else {
        alert("Failed to delete campaign.");
      }
    } catch (err: any) {
      alert("Error deleting campaign: " + err.message);
    }
  };

  // Search for Featured Product
  const handleSearchFeaturedProduct = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setFeaturedSearchQuery(q);
    if (q.length >= 2) {
      setSearchingFeatured(true);
      try {
        const res = await productService.getProductsPaginated({ search: q, limit: 8 });
        setFeaturedSearchResults(res.products);
      } catch {
        setFeaturedSearchResults([]);
      } finally {
        setSearchingFeatured(false);
      }
    } else {
      setFeaturedSearchResults([]);
    }
  };

  const selectFeaturedProduct = (p: Product) => {
    setFeaturedProduct(p);
    setCurrentCampaign(prev => prev ? ({ ...prev, featured_product_id: p.id, featured_product: p }) : null);
    setFeaturedSearchQuery("");
    setFeaturedSearchResults([]);
  };

  const removeFeaturedProduct = () => {
    setFeaturedProduct(null);
    setCurrentCampaign(prev => prev ? ({ ...prev, featured_product_id: undefined, featured_product: undefined }) : null);
  };

  // Search for Tier Products
  const handleSearchTierProduct = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setTierSearchQuery(q);
    if (q.length >= 2) {
      setSearchingTiers(true);
      try {
        const res = await productService.getProductsPaginated({ search: q, limit: 10 });
        setTierSearchResults(res.products);
      } catch {
        setTierSearchResults([]);
      } finally {
        setSearchingTiers(false);
      }
    } else {
      setTierSearchResults([]);
    }
  };

  const addProductToCampaign = (product: Product) => {
    if (campaignProducts.find(cp => cp.product_id === product.id)) return;
    setCampaignProducts([
      ...campaignProducts,
      {
        product_id: product.id,
        product,
        tiers: [...defaultTiers]
      }
    ]);
    setTierSearchQuery("");
    setTierSearchResults([]);
  };

  const updateTier = (productIdx: number, tierIdx: number, field: "minQty" | "discountPercent", value: number) => {
    const newProducts = [...campaignProducts];
    const newTiers = [...(newProducts[productIdx].tiers || [])];
    newTiers[tierIdx] = { ...newTiers[tierIdx], [field]: value };
    newProducts[productIdx].tiers = newTiers;
    setCampaignProducts(newProducts);
  };

  const addTier = (productIdx: number) => {
    const newProducts = [...campaignProducts];
    const tiers = newProducts[productIdx].tiers || [];
    const lastQty = tiers.length > 0 ? tiers[tiers.length - 1].minQty : 0;
    newProducts[productIdx].tiers = [...tiers, { minQty: lastQty + 10, discountPercent: 15 }];
    setCampaignProducts(newProducts);
  };

  const removeTier = (productIdx: number, tierIdx: number) => {
    const newProducts = [...campaignProducts];
    const tiers = [...(newProducts[productIdx].tiers || [])];
    tiers.splice(tierIdx, 1);
    newProducts[productIdx].tiers = tiers;
    setCampaignProducts(newProducts);
  };

  const removeProduct = (productIdx: number) => {
    const newProducts = [...campaignProducts];
    newProducts.splice(productIdx, 1);
    setCampaignProducts(newProducts);
  };

  const updateTrustBadge = (index: number, field: "icon" | "label", value: string) => {
    const badges: TrustBadgeItem[] = currentCampaign?.trust_badges ? [...currentCampaign.trust_badges] : [
      { icon: "shield", label: "Trusted Brands" },
      { icon: "lightning", label: "Bulk Discounts" },
      { icon: "truck", label: "Fast Delivery" }
    ];
    while (badges.length <= index) {
      badges.push({ icon: "shield", label: "" });
    }
    badges[index] = { ...badges[index], [field]: value };
    setCurrentCampaign(prev => prev ? ({ ...prev, trust_badges: badges }) : null);
  };

  if (isEditing && currentCampaign) {
    const badges = currentCampaign.trust_badges || [
      { icon: "shield", label: "Trusted Brands" },
      { icon: "lightning", label: "Bulk Discounts" },
      { icon: "truck", label: "Fast Delivery" }
    ];

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-wrap justify-between items-center gap-3 bg-slate-50/70">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span>{currentCampaign.id ? "Edit Bulk Campaign" : "New Bulk Campaign"}</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                currentCampaign.status === "Live" ? "bg-emerald-100 text-emerald-800" :
                currentCampaign.status === "Draft" ? "bg-amber-100 text-amber-800" :
                "bg-slate-100 text-slate-600"
              }`}>
                {currentCampaign.status || "Draft"}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Configure the homepage billboard banner, featured product, trust badges, and volume tiers.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={saving}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-100 font-semibold text-xs sm:text-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            {currentCampaign.id && (
              <button
                type="button"
                onClick={() => handleDelete(currentCampaign.id!)}
                disabled={saving}
                className="px-3 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl font-semibold text-xs sm:text-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                title="Delete Campaign"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-2 text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Campaign</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feedback Alert Banners */}
        {errorMsg && (
          <div className="mx-6 mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <p className="font-bold">Error saving campaign</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <p className="text-xs sm:text-sm font-bold">{successMsg}</p>
          </div>
        )}

        <div className="p-4 sm:p-6 space-y-8">
          {/* REAL-TIME PREVIEW OF BILLBOARD BANNER */}
          <div className="bg-slate-50 border border-purple-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-purple-600" />
                Live Billboard Banner Preview
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                Updates dynamically as you edit the fields below
              </span>
            </div>
            <div className="rounded-3xl p-1 bg-white border border-purple-100 shadow-2xs">
              <BulkDealBillboardBanner
                campaign={{
                  ...currentCampaign,
                  status: "Live", // Always show in preview
                  featured_product: featuredProduct || currentCampaign.featured_product,
                  trust_badges: badges
                } as BulkCampaign}
              />
            </div>
          </div>

          {/* SECTION 1: BILLBOARD BANNER SHOWCASE FIELDS */}
          <div className="bg-purple-50/40 rounded-2xl p-4 sm:p-5 border border-purple-100 space-y-6">
            <div className="flex items-center justify-between border-b border-purple-200/60 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-black text-purple-950 flex items-center gap-2">
                  <span>🎨 Homepage Billboard Banner Display</span>
                  <span className="text-[10px] bg-purple-200 text-purple-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Spec 2026
                  </span>
                </h3>
                <p className="text-xs text-purple-700/80 mt-0.5">
                  These fields populate the wide 4:1 billboard banner below the homepage hero section.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Campaign Title / Rotated Pill Text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Campaign Title / Pill Badge <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={currentCampaign.title || ""}
                  onChange={e => setCurrentCampaign({ ...currentCampaign, title: e.target.value })}
                  placeholder="e.g. Super Bulk Savings"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">Displays in the small rotated pill badge on the right.</p>
              </div>

              {/* Discount Percentage */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Billboard Discount % <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={currentCampaign.discount_display_percent ?? 25}
                    onChange={e => setCurrentCampaign({ ...currentCampaign, discount_display_percent: parseFloat(e.target.value) || 0 })}
                    placeholder="25"
                    className="w-full pl-3 pr-8 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none font-bold"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-black text-slate-400">%</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Shows in large bold lime-green text on the torn paper badge.</p>
              </div>

              {/* Status Toggle */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Campaign Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={currentCampaign.status || "Draft"}
                  onChange={e => setCurrentCampaign({ ...currentCampaign, status: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none font-semibold"
                >
                  <option value="Draft">Draft (Hidden from Homepage)</option>
                  <option value="Live">Live (Displayed as Billboard Banner)</option>
                  <option value="Expired">Expired</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">Only "Live" campaigns render on the homepage.</p>
              </div>

              {/* CTA Button Text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  CTA Button Label
                </label>
                <input
                  type="text"
                  value={currentCampaign.cta_text || "Order Now"}
                  onChange={e => setCurrentCampaign({ ...currentCampaign, cta_text: e.target.value })}
                  placeholder="Order Now"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* CTA Destination Link */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  CTA Destination Link
                </label>
                <input
                  type="text"
                  value={currentCampaign.cta_link || "/products"}
                  onChange={e => setCurrentCampaign({ ...currentCampaign, cta_link: e.target.value })}
                  placeholder="/products"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* Subtext / Tagline */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Left Brand Tagline
                </label>
                <input
                  type="text"
                  value={currentCampaign.subtext || ""}
                  onChange={e => setCurrentCampaign({ ...currentCampaign, subtext: e.target.value })}
                  placeholder="B2B Pharma Wholesale, Made Smarter"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {/* FEATURED PRODUCT PICKER */}
            <div className="border-t border-purple-200/60 pt-5">
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Featured Product (Middle Section Showcase)
              </label>

              {featuredProduct ? (
                <div className="bg-white border-2 border-purple-300/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                      {featuredProduct.imageUrl || (featuredProduct as any).image_url ? (
                        <img 
                          src={featuredProduct.imageUrl || (featuredProduct as any).image_url} 
                          alt={featuredProduct.name} 
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <Package className="w-7 h-7 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900 truncate">{featuredProduct.name}</h4>
                        {featuredProduct.strength && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                            {featuredProduct.strength}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {featuredProduct.company} • {featuredProduct.genericName || (featuredProduct as any).generic_name}
                      </p>
                      <p className="text-xs font-bold text-purple-700 mt-0.5">
                        Trade: ৳{featuredProduct.sellingPrice} | MRP: ৳{featuredProduct.mrp}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={removeFeaturedProduct}
                      className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Change Product</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="flex items-center bg-white border border-slate-300 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-purple-500">
                    <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={featuredSearchQuery}
                      onChange={handleSearchFeaturedProduct}
                      placeholder="Search medicine by name or generic to feature on banner..."
                      className="w-full text-xs sm:text-sm bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400"
                    />
                    {searchingFeatured && (
                      <Loader2 className="w-4 h-4 text-purple-600 animate-spin shrink-0" />
                    )}
                  </div>

                  {featuredSearchResults.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100">
                      {featuredSearchResults.map(p => (
                        <div
                          key={p.id}
                          onClick={() => selectFeaturedProduct(p)}
                          className="p-3 hover:bg-purple-50/60 cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                              {p.imageUrl || (p as any).image_url ? (
                                <img src={p.imageUrl || (p as any).image_url} alt="" className="w-full h-full object-contain p-0.5" />
                              ) : (
                                <Package className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                {p.name} {p.strength ? `(${p.strength})` : ""}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {p.company} • ৳{p.sellingPrice}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs bg-purple-100 text-purple-700 font-bold px-2.5 py-1 rounded-lg shrink-0">
                            Select
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Type at least 2 characters to search the 2,200+ product catalog. Selected product details will be rendered on the banner automatically.
                  </p>
                </div>
              )}
            </div>

            {/* 3 TRUST BADGES CONFIGURATION */}
            <div className="border-t border-purple-200/60 pt-5">
              <div className="mb-3">
                <h4 className="text-xs font-bold text-slate-800">
                  Left Section: 3 Trust Badges (Icon + 2-Word Label)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Pick an icon from the fixed set (shield, lightning, truck, check, star) and type a short label for each badge.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[0, 1, 2].map(idx => {
                  const badge = badges[idx] || { icon: "shield", label: "" };
                  const IconComp = FIXED_ICON_OPTIONS.find(o => o.key === badge.icon)?.icon || Shield;
                  return (
                    <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase text-purple-700">Badge #{idx + 1}</span>
                        <div className="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center text-purple-700">
                          <IconComp className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Icon</label>
                        <select
                          value={badge.icon || "shield"}
                          onChange={e => updateTrustBadge(idx, "icon", e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                        >
                          {FIXED_ICON_OPTIONS.map(opt => (
                            <option key={opt.key} value={opt.key}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Label</label>
                        <input
                          type="text"
                          value={badge.label || ""}
                          onChange={e => updateTrustBadge(idx, "label", e.target.value)}
                          placeholder={`e.g. ${idx === 0 ? "Trusted Brands" : idx === 1 ? "Bulk Discounts" : "Fast Delivery"}`}
                          className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 2: MULTI-PRODUCT TIERS (RETAINED CAPABILITY) */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <div>
                <h3 className="text-md font-bold text-slate-800">Volume Quantity Tiers (Catalog Discounts)</h3>
                <p className="text-xs text-slate-500">Configure tiered bulk pricing on specific wholesale items</p>
              </div>
            </div>
            
            <div className="relative">
              <div className="flex items-center bg-white border border-slate-300 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-purple-500">
                <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={tierSearchQuery}
                  onChange={handleSearchTierProduct}
                  placeholder="Search and add product to bulk pricing list..."
                  className="w-full text-xs sm:text-sm bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400"
                />
                {searchingTiers && <Loader2 className="w-4 h-4 text-purple-600 animate-spin shrink-0" />}
              </div>

              {tierSearchResults.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {tierSearchResults.map(p => (
                    <div
                      key={p.id}
                      onClick={() => addProductToCampaign(p)}
                      className="px-4 py-2 hover:bg-purple-50/60 cursor-pointer flex justify-between items-center"
                    >
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-slate-800">{p.name}</p>
                        <p className="text-[11px] text-slate-500">{p.company} • ৳{p.sellingPrice}</p>
                      </div>
                      <Plus className="w-4 h-4 text-purple-600" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {campaignProducts.length === 0 && (
                <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs">
                  No tiered volume products added yet. Optional: add products above to configure tiered quantity pricing.
                </div>
              )}
              {campaignProducts.map((cp, pIdx) => (
                <div key={cp.product_id} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-slate-800">{cp.product?.name || `Product #${cp.product_id}`}</p>
                      {cp.product?.sellingPrice && (
                        <p className="text-[11px] text-slate-500">Base Price: ৳{cp.product.sellingPrice}</p>
                      )}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => removeProduct(pIdx)} 
                      className="text-rose-500 hover:bg-rose-50 p-1 rounded-lg cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-3 bg-white space-y-2">
                    <div className="grid grid-cols-12 gap-3 text-[11px] font-bold text-slate-500 px-1">
                      <div className="col-span-4">Min Qty (বক্স/কার্টন)</div>
                      <div className="col-span-4">ডিসকাউন্ট % (MRP থেকে)</div>
                      <div className="col-span-3">কার্যকর রেট (৳)</div>
                      <div className="col-span-1"></div>
                    </div>
                    {cp.tiers?.map((tier, tIdx) => {
                      const prodMrp = Number(cp.product?.mrp || 0);
                      const previewEffective = prodMrp > 0
                        ? (prodMrp * (1 - (Number(tier.discountPercent) || 0) / 100)).toFixed(2)
                        : null;

                      return (
                        <div key={tIdx} className="grid grid-cols-12 gap-3 items-center">
                          <div className="col-span-4">
                            <input
                              type="number"
                              min="1"
                              value={tier.minQty}
                              onChange={e => updateTier(pIdx, tIdx, "minQty", parseInt(e.target.value) || 0)}
                              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                              placeholder="10"
                            />
                          </div>
                          <div className="col-span-4">
                            <div className="relative">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={tier.discountPercent}
                                onChange={e => updateTier(pIdx, tIdx, "discountPercent", parseFloat(e.target.value) || 0)}
                                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs pr-6"
                                placeholder="73"
                              />
                              <span className="absolute right-2 top-1.5 text-xs text-slate-400">%</span>
                            </div>
                          </div>
                          <div className="col-span-3">
                            <div className="px-2 py-1.5 bg-purple-50 border border-purple-200 rounded-lg text-xs font-mono font-bold text-brand-purple text-center">
                              {previewEffective ? `৳${previewEffective}` : "-"}
                            </div>
                          </div>
                          <div className="col-span-1 text-right">
                            <button 
                              type="button" 
                              onClick={() => removeTier(pIdx, tIdx)} 
                              className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                              title="টিয়ার মুছুন"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => addTier(pIdx)}
                      className="text-purple-600 text-xs font-bold flex items-center gap-1 hover:text-purple-700 pt-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Tier
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Bulk Campaigns & Billboard Banners</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage live homepage billboard deals, featured products, discount percentages, and trust badges.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-xs text-slate-500 mt-2">Loading campaigns...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 border-dashed p-6">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No bulk campaigns yet</h3>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-sm mx-auto">
            Create your first bulk campaign to display the Billboard Banner on the homepage and offer volume discounts.
          </p>
          <button
            onClick={handleCreate}
            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Campaign
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Campaign</th>
                  <th className="px-5 py-3.5">Featured Product</th>
                  <th className="px-5 py-3.5">Discount %</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{campaign.title}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{campaign.subtext}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      {campaign.featured_product ? (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{campaign.featured_product.name}</span>
                          {campaign.featured_product.strength && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                              {campaign.featured_product.strength}
                            </span>
                          )}
                        </div>
                      ) : campaign.featured_product_id ? (
                        <span className="text-xs text-slate-600 font-mono">#{campaign.featured_product_id.substring(0, 8)}</span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">None selected</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-black text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md text-xs">
                        {campaign.discount_display_percent ?? 0}% OFF
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                        campaign.status === "Live" ? "bg-emerald-100 text-emerald-800" :
                        campaign.status === "Draft" ? "bg-slate-100 text-slate-700" :
                        "bg-rose-100 text-rose-700"
                      }`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(campaign)}
                          className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(campaign.id, e)}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded-lg cursor-pointer transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
