import { useState, useEffect } from "react";
import { BulkTier } from "../types";
import { bulkDealsService } from "../services/bulkDeals";

export function useLiveBulkTiers() {
  const [tiersMap, setTiersMap] = useState<Record<string, BulkTier[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async (skipCache = false) => {
      try {
        const map = await bulkDealsService.getActiveTiersMap(skipCache);
        if (mounted) {
          setTiersMap(map);
          setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    };

    load();

    const handleUpdate = () => {
      load(true);
    };

    window.addEventListener("bulk-campaign-updated", handleUpdate);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener("visibilitychange", handleVisibility);

    return () => {
      mounted = false;
      window.removeEventListener("bulk-campaign-updated", handleUpdate);
      window.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const getProductTiers = (productId: string): BulkTier[] | null => {
    if (!productId) return null;
    const pid = String(productId).trim();
    return tiersMap[pid] || tiersMap[pid.toLowerCase()] || null;
  };

  const getMaxDiscount = (productId: string): number | null => {
    const tiers = getProductTiers(productId);
    if (!tiers || tiers.length === 0) return null;
    return Math.max(...tiers.map(t => t.discountPercent));
  };

  return { tiersMap, loading, getProductTiers, getMaxDiscount };
}
