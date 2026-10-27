import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, ChevronDown, Check, X, Sparkles, Plus, Layers } from "lucide-react";
import { 
  CATEGORY_GROUPS, 
  DEFAULT_CATEGORY_OPTIONS, 
  CATEGORY_BN_MAP, 
  CategoryGroup, 
  CategoryItem 
} from "../constants/categories";
import { productService } from "../services/product";

interface SearchableCategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function SearchableCategorySelect({
  value,
  onChange,
  required = false,
  disabled = false,
  className = ""
}: SearchableCategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch dynamic categories from products DB on mount to ensure 100% parity
  useEffect(() => {
    let isMounted = true;
    productService.getCategories().then((cats) => {
      if (isMounted && Array.isArray(cats)) {
        setDbCategories(cats);
      }
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Merge predefined groups with any uncategorized DB categories
  const allGroups = useMemo<CategoryGroup[]>(() => {
    const definedValues = new Set(CATEGORY_GROUPS.flatMap(g => g.items.map(i => i.value.toLowerCase())));
    const extraCategories = dbCategories.filter(c => c && !definedValues.has(c.toLowerCase()));

    if (extraCategories.length === 0) {
      return CATEGORY_GROUPS;
    }

    const customGroup: CategoryGroup = {
      groupName: "Other Database Categories",
      groupNameBn: "ক্যাটালগের অন্যান্য ক্যাটাগরি",
      items: extraCategories.map(c => ({
        value: c,
        label: c,
        labelBn: CATEGORY_BN_MAP[c] || c
      }))
    };

    return [...CATEGORY_GROUPS, customGroup];
  }, [dbCategories]);

  // Filter groups and items based on search query
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allGroups;

    return allGroups
      .map(group => {
        const groupMatches = 
          group.groupName.toLowerCase().includes(q) || 
          group.groupNameBn.toLowerCase().includes(q);

        const matchingItems = group.items.filter(item => 
          groupMatches ||
          item.value.toLowerCase().includes(q) ||
          item.label.toLowerCase().includes(q) ||
          item.labelBn.toLowerCase().includes(q)
        );

        if (matchingItems.length === 0) return null;

        return {
          ...group,
          items: matchingItems
        };
      })
      .filter((g): g is CategoryGroup => g !== null);
  }, [allGroups, searchQuery]);

  // Total count of matching items
  const totalMatches = useMemo(() => {
    return filteredGroups.reduce((acc, g) => acc + g.items.length, 0);
  }, [filteredGroups]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  const handleSelect = (categoryVal: string) => {
    onChange(categoryVal);
    setIsOpen(false);
  };

  const selectedBn = CATEGORY_BN_MAP[value] || "";

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Selected Category Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full bg-slate-950 border ${
          isOpen ? "border-emerald-500 ring-1 ring-emerald-500/30" : "border-slate-800 hover:border-slate-700"
        } rounded-xl py-2 px-3 text-xs flex items-center justify-between text-left transition-all cursor-pointer ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Layers className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          {value ? (
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-bold text-white truncate">{value}</span>
              {selectedBn && (
                <span className="text-[11px] text-emerald-400 font-medium truncate">
                  ({selectedBn})
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-500 font-medium">ক্যাটাগরি সিলেক্ট করুন...</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="মুছুন"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-emerald-400" : ""
            }`}
          />
        </div>
      </button>

      {/* Hidden input for HTML form validation if required */}
      {required && (
        <input
          type="text"
          value={value}
          readOnly
          required
          tabIndex={-1}
          className="sr-only"
        />
      )}

      {/* Dropdown Floating Panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col max-h-80 animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="p-2.5 border-b border-slate-800 bg-slate-950/80 sticky top-0 z-10 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ক্যাটাগরি খুঁজুন (e.g., Tablet, সিরাপ, Injection)..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-1.5 pl-8 pr-7 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsOpen(false);
                  } else if (e.key === "Enter" && filteredGroups.length > 0 && filteredGroups[0].items.length > 0) {
                    e.preventDefault();
                    handleSelect(filteredGroups[0].items[0].value);
                  }
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between px-1 text-[10px] text-slate-400 font-medium">
              <span>ফার্মেসি ক্যাটাগরি তালিকা ({totalMatches}টি ম্যাচিং)</span>
              {searchQuery && (
                <span className="text-emerald-400 font-semibold">ফিল্টার সক্রিয়</span>
              )}
            </div>
          </div>

          {/* Grouped Category Options List */}
          <div className="overflow-y-auto flex-1 p-1.5 space-y-2 divide-y divide-slate-800/60 scrollbar-thin scrollbar-thumb-slate-700">
            {filteredGroups.length === 0 ? (
              <div className="py-6 px-4 text-center space-y-2">
                <p className="text-xs text-slate-400 font-medium">
                  "{searchQuery}" নামে কোনো ক্যাটাগরি পাওয়া যায়নি
                </p>
                {searchQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => handleSelect(searchQuery.trim())}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>কাস্টম ক্যাটাগরি হিসেবে "{searchQuery.trim()}" যোগ করুন</span>
                  </button>
                )}
              </div>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.groupName} className="pt-2 first:pt-0">
                  {/* Group Header */}
                  <div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>{group.groupName}</span>
                    <span className="text-[9px] text-slate-500 font-normal">{group.groupNameBn}</span>
                  </div>

                  {/* Group Items */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1">
                    {group.items.map((item) => {
                      const isSelected = value === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => handleSelect(item.value)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer group ${
                            isSelected
                              ? "bg-emerald-500/20 text-white font-bold border border-emerald-500/40"
                              : "text-slate-300 hover:bg-slate-800/80 hover:text-white border border-transparent"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="truncate">{item.label}</span>
                            <span className={`text-[10px] truncate ${
                              isSelected ? "text-emerald-300 font-medium" : "text-slate-400 group-hover:text-slate-300"
                            }`}>
                              ({item.labelBn})
                            </span>
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
