import React, { useState, useEffect, useMemo } from "react";
import {
  WhatsAppCampaign,
  WhatsAppCampaignRecipient,
  WhatsAppTemplate,
  WhatsAppAudienceFilter,
  WhatsAppAudienceStats,
  Pharmacy
} from "../types";
import { whatsappClient } from "../services";
import { personalizeMessage } from "../lib/whatsappUtils";
import { storageService } from "../services/storage";
import {
  MessageSquare,
  Send,
  Plus,
  Copy,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Users,
  FileText,
  History,
  Image as ImageIcon,
  Check,
  X,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Sparkles,
  Phone,
  Building2,
  Share2,
  Download,
  Trash2,
  SlidersHorizontal,
  ChevronRight,
  Info,
  UserCheck,
  FastForward,
  CheckSquare,
  Square
} from "lucide-react";

interface WhatsAppMarketingProps {
  pharmacies?: Pharmacy[];
  onRefreshPharmacies?: () => void;
}

export default function WhatsAppMarketing({ pharmacies = [], onRefreshPharmacies }: WhatsAppMarketingProps) {
  // Main Subtabs
  const [activeTab, setActiveTab] = useState<
    "campaigns" | "create" | "queue" | "audience" | "templates" | "history"
  >("campaigns");

  // State
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<WhatsAppCampaign | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [audienceStats, setAudienceStats] = useState<WhatsAppAudienceStats | null>(null);

  // Loading & Toast
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const showToast = (msg: string, isErr = false) => {
    if (isErr) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(""), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(""), 4000);
    }
  };

  // Form State for Creating Campaign
  const [campaignName, setCampaignName] = useState("Somatec 34% Discount Offer");
  const [messageTemplate, setMessageTemplate] = useState(
    "🎉 SOMATEC PHARMA SPECIAL OFFER 🎉\n\nআসসালামু আলাইকুম {{owner_name}},\n{{pharmacy_name}}-এর জন্য Somatec Pharmaceuticals-এর সকল পণ্যে এখন FLAT 34% OFF!\n\nPharmacy-এর প্রয়োজনীয় সকল মেডিসিন পাইকারি দামে MediChain-এ অর্ডার করুন।\n\n🔥 FLAT 34% DISCOUNT\n📦 সকল Dosage Form Available\n🚚 শিডিউলড ফ্রি ডেলিভারি\n\nMediChain — ফার্মেসির স্মার্ট পার্টনার।"
  );
  const [posterImageUrl, setPosterImageUrl] = useState("");
  const [uploadingPoster, setUploadingPoster] = useState(false);
  
  // Default to ALL pharmacies (all onboarded customers are eligible)
  const [audienceFilter, setAudienceFilter] = useState<WhatsAppAudienceFilter>({
    segment: "all"
  });
  
  // Custom manual recipient selection
  const [selectedPharmacyIds, setSelectedPharmacyIds] = useState<string[]>([]);
  const [selectAllPharmacies, setSelectAllPharmacies] = useState(true);
  const [recipientSearch, setRecipientSearch] = useState("");

  // Live Audience Preview
  const [audiencePreview, setAudiencePreview] = useState<{
    eligibleCount: number;
    excludedCount: number;
    eligiblePharmacies: Pharmacy[];
    excludedPharmacies: Array<{ pharmacy: Pharmacy; reason: string }>;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Queue View Filter (All, Pending, Sent)
  const [queueFilter, setQueueFilter] = useState<"all" | "pending" | "sent">("all");
  const [queueSearch, setQueueSearch] = useState("");

  // New Template Modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState<any>("Promotion");
  const [templateMessage, setTemplateMessage] = useState("");

  // Audience Directory Search Filter
  const [audienceSearch, setAudienceSearch] = useState("");

  // Load all initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [cList, tList, stats] = await Promise.all([
        whatsappClient.getCampaigns().catch(() => []),
        whatsappClient.getTemplates().catch(() => []),
        whatsappClient.getStats().catch(() => null)
      ]);
      setCampaigns(cList);
      setTemplates(tList);
      if (stats) setAudienceStats(stats);
      
      // If we have a selected campaign, refresh its detailed recipients
      if (selectedCampaign) {
        const refreshed = await whatsappClient.getCampaignById(selectedCampaign.id).catch(() => null);
        if (refreshed) setSelectedCampaign(refreshed);
      }
    } catch (err: any) {
      console.error("[WhatsAppMarketing] Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update audience preview on filter change
  useEffect(() => {
    if (activeTab === "create") {
      setPreviewLoading(true);
      const filterToSend: WhatsAppAudienceFilter = {
        ...audienceFilter,
        selectedPharmacyIds: selectAllPharmacies ? undefined : selectedPharmacyIds
      };
      whatsappClient
        .previewAudience(filterToSend)
        .then(res => {
          setAudiencePreview(res);
          if (selectAllPharmacies && res?.eligiblePharmacies) {
            setSelectedPharmacyIds(res.eligiblePharmacies.map(p => p.id));
          }
        })
        .catch(() => setAudiencePreview(null))
        .finally(() => setPreviewLoading(false));
    }
  }, [audienceFilter, activeTab, selectAllPharmacies]);

  // Insert Variable Tag Helper
  const insertVariableTag = (tag: string) => {
    setMessageTemplate(prev => prev + ` ${tag}`);
  };

  // Image upload handler
  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast("Poster image must be less than 10MB", true);
      return;
    }
    setUploadingPoster(true);
    try {
      const res = await storageService.uploadProductImage(file);
      if (res?.url) {
        setPosterImageUrl(res.url);
        showToast("Campaign poster uploaded successfully.");
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result) {
            setPosterImageUrl(reader.result as string);
            showToast("Campaign poster attached successfully.");
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setPosterImageUrl(reader.result as string);
          showToast("Campaign poster attached successfully.");
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingPoster(false);
    }
  };

  // Handle Campaign Creation
  const handleCreateCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim()) {
      showToast("Please enter a campaign name", true);
      return;
    }
    if (!messageTemplate.trim()) {
      showToast("Please enter message content", true);
      return;
    }

    setActionLoading(true);
    try {
      const filterToApply: WhatsAppAudienceFilter = {
        ...audienceFilter,
        selectedPharmacyIds: selectAllPharmacies ? undefined : selectedPharmacyIds
      };

      const campaign = await whatsappClient.createCampaign({
        name: campaignName,
        messageTemplate,
        imageUrl: posterImageUrl || undefined,
        audienceFilter: filterToApply
      });

      // If recipients was 0 for any reason, auto-populate immediately
      let finalCamp = campaign;
      if (!campaign.recipients || campaign.recipients.length === 0) {
        finalCamp = await whatsappClient.populateRecipients(campaign.id, { segment: "all" });
      }

      showToast(`Campaign "${finalCamp.name}" ready with ${finalCamp.eligibleCount} pharmacies in queue.`);
      setSelectedCampaign(finalCamp);
      setActiveTab("queue");
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to create campaign", true);
    } finally {
      setActionLoading(false);
    }
  };

  // Populate / Refill recipients for existing campaign
  const handlePopulateRecipientsForCampaign = async (campId: string) => {
    setActionLoading(true);
    try {
      const updated = await whatsappClient.populateRecipients(campId, { segment: "all" });
      setSelectedCampaign(updated);
      showToast(`Queue refreshed with ${updated.eligibleCount} pharmacies ready to send!`);
      loadData();
    } catch (err: any) {
      showToast("Failed to populate recipients", true);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Open WhatsApp for a recipient
  const handleOpenWhatsApp = (recipient: WhatsAppCampaignRecipient, autoMarkSent = false) => {
    if (!recipient.waMeUrl) {
      showToast("Invalid phone number. Could not create WhatsApp deep link.", true);
      return;
    }

    // Open WhatsApp Business in new tab/app
    window.open(recipient.waMeUrl, "_blank", "noopener,noreferrer");

    const newStatus = autoMarkSent ? "sent" : "opened";
    whatsappClient.updateRecipientStatus(recipient.id, newStatus).then(() => {
      if (selectedCampaign) {
        setSelectedCampaign(prev => {
          if (!prev) return null;
          return {
            ...prev,
            sentCount: newStatus === "sent" ? (prev.sentCount || 0) + (recipient.status !== "sent" ? 1 : 0) : prev.sentCount,
            recipients: prev.recipients?.map(r =>
              r.id === recipient.id
                ? {
                    ...r,
                    status: newStatus as any,
                    ...(newStatus === "sent" ? { sentAt: new Date().toISOString() } : { openedAt: new Date().toISOString() })
                  }
                : r
            )
          };
        });
      }
    });
  };

  // Handle Copy Message
  const handleCopyMessage = async (msg: string) => {
    try {
      await navigator.clipboard.writeText(msg);
      showToast("Personalized message copied to clipboard!");
    } catch {
      showToast("Failed to copy message. Please select and copy manually.", true);
    }
  };

  // Handle Recipient Status Update (Sent, Skipped, Failed)
  const handleUpdateRecipient = async (recipientId: string, status: "sent" | "skipped" | "failed") => {
    try {
      await whatsappClient.updateRecipientStatus(recipientId, status);
      showToast(`Marked as ${status.toUpperCase()}.`);

      if (selectedCampaign) {
        setSelectedCampaign(prev => {
          if (!prev) return null;
          const updatedRecips = prev.recipients?.map(r =>
            r.id === recipientId ? { ...r, status } : r
          );
          const sentCount = updatedRecips?.filter(r => r.status === "sent").length || 0;
          const skippedCount = updatedRecips?.filter(r => r.status === "skipped").length || 0;
          return {
            ...prev,
            sentCount,
            skippedCount,
            recipients: updatedRecips
          };
        });
      }
      loadData();
    } catch (err: any) {
      showToast("Failed to update recipient status", true);
    }
  };

  // Open existing campaign in queue view
  const handleSelectCampaignForQueue = async (campaignId: string) => {
    setLoading(true);
    try {
      let camp = await whatsappClient.getCampaignById(campaignId);
      if (!camp.recipients || camp.recipients.length === 0) {
        // Auto populate if empty
        camp = await whatsappClient.populateRecipients(campaignId, { segment: "all" });
      }
      setSelectedCampaign(camp);
      setActiveTab("queue");
    } catch (err: any) {
      showToast("Failed to load campaign details", true);
    } finally {
      setLoading(false);
    }
  };

  // Filtered queue recipients
  const filteredRecipients = useMemo(() => {
    if (!selectedCampaign?.recipients) return [];
    return selectedCampaign.recipients.filter(r => {
      if (queueFilter === "pending" && r.status === "sent") return false;
      if (queueFilter === "sent" && r.status !== "sent") return false;
      if (queueSearch.trim()) {
        const q = queueSearch.toLowerCase();
        const match =
          r.pharmacyName.toLowerCase().includes(q) ||
          r.ownerName.toLowerCase().includes(q) ||
          r.rawPhone.includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [selectedCampaign?.recipients, queueFilter, queueSearch]);

  // First pending recipient for "Open Next"
  const nextPendingRecipient = useMemo(() => {
    return selectedCampaign?.recipients?.find(r => r.status === "pending" || r.status === "opened");
  }, [selectedCampaign?.recipients]);

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 pb-12">
      {/* Toast notifications */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 animate-slide-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-4 right-4 z-50 bg-rose-600 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 animate-slide-in">
          <AlertTriangle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TOP HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/70 backdrop-blur-md p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                WhatsApp Business Marketing
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                100% FREE Manual Send
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Draft promotional campaigns, click to open WhatsApp Business with prefilled message, and send directly from your phone.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab("create")}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Campaign</span>
          </button>
          <button
            onClick={loadData}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* SUBTABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-bold no-scrollbar">
        {[
          { id: "campaigns", label: "Campaigns", icon: MessageSquare },
          { id: "create", label: "Create Campaign", icon: Plus },
          ...(selectedCampaign ? [{ id: "queue", label: `Queue: ${selectedCampaign.name.slice(0, 16)}...`, icon: Send }] : []),
          { id: "audience", label: "Pharmacy Directory", icon: Users },
          { id: "templates", label: "Templates", icon: FileText },
          { id: "history", label: "History & Logs", icon: History }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2.5 rounded-xl whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
                isActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white/60 hover:bg-white text-slate-600 hover:text-slate-900 border border-slate-200/60"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. CAMPAIGNS OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === "campaigns" && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          {audienceStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-1 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Pharmacies</span>
                <div className="text-xl font-black text-slate-900">{audienceStats.totalPharmacies}</div>
                <p className="text-[10px] text-slate-400">Onboarded accounts</p>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-1 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Ready for WhatsApp</span>
                <div className="text-xl font-black text-emerald-700">{audienceStats.validBangladeshNumbersCount}</div>
                <p className="text-[10px] text-emerald-600 font-medium">100% Eligible to reach</p>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-1 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Campaigns</span>
                <div className="text-xl font-black text-blue-700">{campaigns.length}</div>
                <p className="text-[10px] text-slate-400">Promotional broadcasts</p>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-1 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">WhatsApp Cost</span>
                <div className="text-xl font-black text-purple-700">৳0.00 FREE</div>
                <p className="text-[10px] text-purple-600 font-medium">Manual send workflow</p>
              </div>
            </div>
          )}

          {/* Campaigns List */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Marketing Campaigns</h3>
                <p className="text-xs text-slate-500">Select any campaign to open its send queue and start messaging pharmacies on WhatsApp.</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {campaigns.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-3">
                  <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-medium">No campaigns created yet. Click "Create Campaign" to launch your promotional offer.</p>
                  <button
                    onClick={() => setActiveTab("create")}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Create First Campaign
                  </button>
                </div>
              ) : (
                campaigns.map(camp => (
                  <div key={camp.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{camp.name}</h4>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          camp.sentCount > 0 && camp.sentCount >= camp.eligibleCount
                            ? "bg-emerald-100 text-emerald-800"
                            : camp.sentCount > 0
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}>
                          {camp.sentCount > 0 && camp.sentCount >= camp.eligibleCount ? "Completed" : camp.sentCount > 0 ? "In Progress" : "Ready to Send"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1 max-w-xl font-mono">
                        {camp.messageTemplate.slice(0, 100)}...
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                        <span>Created: <strong>{new Date(camp.createdAt).toLocaleDateString()}</strong></span>
                        <span>Recipients: <strong className="text-slate-700">{camp.eligibleCount} pharmacies</strong></span>
                        <span>Sent: <strong className="text-emerald-600">{camp.sentCount}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSelectCampaignForQueue(camp.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Open Send Queue</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CREATE CAMPAIGN (EASY & FAST) */}
      {/* ========================================================================= */}
      {activeTab === "create" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Form (2 cols) */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create WhatsApp Campaign</h3>
              <p className="text-xs text-slate-500">Pick template or write offer, select target pharmacies, and start sending.</p>
            </div>

            {/* Quick Templates / Presets */}
            <div>
              <label className="block font-bold text-slate-700 mb-1.5 text-xs">Quick Fill from Popular Templates</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  {
                    name: "🎉 Somatec 34% Discount",
                    title: "Somatec Flat 34% OFF",
                    msg: "🎉 SOMATEC PHARMA SPECIAL OFFER 🎉\n\nআসসালামু আলাইকুম {{owner_name}},\n{{pharmacy_name}}-এর জন্য Somatec Pharmaceuticals-এর সকল পণ্যে এখন FLAT 34% OFF!\n\nPharmacy-এর প্রয়োজনীয় সকল মেডিসিন পাইকারি দামে MediChain-এ অর্ডার করুন।\n\n🔥 FLAT 34% DISCOUNT\n📦 সকল Dosage Form Available\n🚚 শিডিউলড ফ্রি ডেলিভারি\n\nMediChain — ফার্মেসির স্মার্ট পার্টনার।"
                  },
                  {
                    name: "📦 Weekly Restock Reminder",
                    title: "Weekly Restock Reminder",
                    msg: "📦 WEEKLY PHARMACY RESTOCK REMINDER 📦\n\nআসসালামু আলাইকুম {{owner_name}},\n{{pharmacy_name}}-এর ওষুধের স্টক কি শেষ হয়ে আসছে?\n\nMediChain-এ আজই অর্ডার প্লেস করে আগামী ডেলিভারি শিডিউলে আপনার ফার্মেসির প্রয়োজনীয় সকল মেডিসিন সংগ্রহ করুন।\n\n✅ 100% Genuine DGDA Compliant Medicines\n✅ সেরা পাইকারি ক্যাশব্যাক ও ছাড়\n\nঅর্ডার করতে ভিজিট করুন: medichain.com.bd"
                  },
                  {
                    name: "✨ New Medicine Lines Added",
                    title: "New Products In Stock",
                    msg: "✨ নতুন মেডিসিন ও হেলথকেয়ার প্রোডাক্ট যুক্ত হয়েছে ✨\n\nশ্রদ্ধেয় {{owner_name}},\n{{pharmacy_name}}-এর কাস্টমারদের জন্য MediChain ক্যাটালগে নতুন শীর্ষস্থানীয় কোম্পানির মেডিসিন ও অ্যান্টিবায়োটিক স্টক করা হয়েছে।\n\nএখনই অ্যাপে লগইন করে সেরা পাইকারি মূল্যে অর্ডার কনফার্ম করুন।"
                  },
                  {
                    name: "🚚 Tomorrow Delivery Cutoff",
                    title: "Next Scheduled Delivery",
                    msg: "🚚 ডেলিভারি রিমাইন্ডার 🚚\n\nআসসালামু আলাইকুম {{owner_name}},\n{{pharmacy_name}}-এর আগামী ডেলিভারি শিডিউলে ওষুধ পেতে আজই দুপুর ১২:০০টার মধ্যে আপনার অর্ডার কনফার্ম করুন।"
                  }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCampaignName(item.title);
                      setMessageTemplate(item.msg);
                      showToast(`Applied "${item.title}"`);
                    }}
                    className="text-left p-2.5 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-xl transition-all text-xs font-semibold text-slate-800"
                  >
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateCampaignSubmit} className="space-y-4 text-xs">
              {/* Campaign Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Campaign Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Somatec Flat 34% Discount Offer"
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                />
              </div>

              {/* Message Text */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Message Content (Bengali / English) *</label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">Insert tag:</span>
                    <button
                      type="button"
                      onClick={() => insertVariableTag("{{pharmacy_name}}")}
                      className="px-2 py-0.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded text-[10px] font-bold"
                    >
                      + Pharmacy Name
                    </button>
                    <button
                      type="button"
                      onClick={() => insertVariableTag("{{owner_name}}")}
                      className="px-2 py-0.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded text-[10px] font-bold"
                    >
                      + Owner Name
                    </button>
                  </div>
                </div>
                <textarea
                  rows={8}
                  required
                  value={messageTemplate}
                  onChange={e => setMessageTemplate(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-mono text-xs leading-relaxed focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
                  placeholder="Enter message text with optional {{pharmacy_name}} or {{owner_name}}..."
                />
              </div>

              {/* Poster / Image Attachment */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Promotional Poster / Banner (Optional)</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <label className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-all">
                    <ImageIcon className="w-4 h-4 text-slate-600" />
                    <span>{uploadingPoster ? "Uploading..." : "Upload Poster Image"}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handlePosterUpload}
                      disabled={uploadingPoster}
                      className="hidden"
                    />
                  </label>
                  {posterImageUrl && (
                    <div className="flex items-center gap-2 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                      <Check className="w-3.5 h-3.5" />
                      <span>Poster Attached</span>
                      <button
                        type="button"
                        onClick={() => setPosterImageUrl("")}
                        className="text-rose-600 hover:text-rose-800 ml-1 font-semibold"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Target Audience Segment */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-slate-700">Target Audience *</label>
                  <span className="text-[11px] text-emerald-600 font-bold">
                    {audiencePreview?.eligibleCount ?? pharmacies.length} Pharmacies Eligible
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: "all", label: "All Registered Pharmacies", desc: "Send to all active pharmacies (Recommended)" },
                    { id: "active_buyers", label: "Active Buyers", desc: "Pharmacies with at least 1 completed order" },
                    { id: "frequent_buyers", label: "Frequent Buyers (3+ Orders)", desc: "Regular repeat pharmacy accounts" },
                    { id: "first_order", label: "First-Time Buyers", desc: "Pharmacies with 1 initial order" },
                    { id: "high_value", label: "High-Value Accounts", desc: "Pharmacies with ৳50,000+ total spend" },
                    { id: "inactive", label: "Inactive Pharmacies", desc: "Registered pharmacies with 0 orders placed" }
                  ].map(seg => (
                    <label
                      key={seg.id}
                      className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                        audienceFilter.segment === seg.id
                          ? "bg-emerald-50/70 border-emerald-500 text-emerald-950 font-bold"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <input
                        type="radio"
                        name="audienceSegment"
                        checked={audienceFilter.segment === seg.id}
                        onChange={() => {
                          setAudienceFilter(prev => ({ ...prev, segment: seg.id as any }));
                          setSelectAllPharmacies(true);
                        }}
                        className="mt-0.5 text-emerald-600"
                      />
                      <div>
                        <span className="font-bold block text-xs">{seg.label}</span>
                        <span className="text-[10px] text-slate-500 font-normal leading-tight">{seg.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab("campaigns")}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{actionLoading ? "Preparing Queue..." : "Prepare Send Queue"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Col: Live Preview & Eligibility */}
          <div className="space-y-4">
            {/* Live Message Preview */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <span>WhatsApp Message Preview</span>
                <span className="text-emerald-400">Simulated Render</span>
              </div>

              {posterImageUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-700 max-h-48 bg-black">
                  <img src={posterImageUrl} alt="Campaign Poster Preview" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="bg-emerald-950/60 border border-emerald-800/80 p-3.5 rounded-xl text-xs font-mono text-emerald-200 whitespace-pre-wrap leading-relaxed">
                {personalizeMessage(messageTemplate, {
                  pharmacyName: "জননী ফার্মেসি",
                  ownerName: "ডা. রফিকুল ইসলাম",
                  city: "ঢাকা"
                })}
              </div>
            </div>

            {/* Target Audience Summary */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recipients Summary</h4>

              {previewLoading ? (
                <div className="py-4 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading pharmacies...</span>
                </div>
              ) : audiencePreview ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                    <div className="flex items-center justify-between font-bold text-emerald-900">
                      <span>Ready to Receive</span>
                      <span className="text-base font-black">{audiencePreview.eligibleCount} pharmacies</span>
                    </div>
                    <p className="text-[10px] text-emerald-700">Validated Bangladesh mobile numbers (+8801...)</p>
                  </div>

                  {audiencePreview.excludedCount > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between font-bold text-amber-900">
                        <span>Missing / Invalid Phone</span>
                        <span>{audiencePreview.excludedCount}</span>
                      </div>
                      <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                        {audiencePreview.excludedPharmacies.map((ex, idx) => (
                          <div key={idx} className="text-[10px] text-amber-800 flex items-center justify-between">
                            <span className="truncate max-w-[140px] font-medium">{ex.pharmacy.pharmacyName}</span>
                            <span className="text-slate-500">{ex.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CAMPAIGN DISPATCH QUEUE (MAIN SEND SCREEN) */}
      {/* ========================================================================= */}
      {activeTab === "queue" && selectedCampaign && (
        <div className="space-y-6">
          {/* Important Workflow Notice Banner */}
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-start gap-3 shadow-xs">
            <Info className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-emerald-900">How Free WhatsApp Sending Works:</p>
              <p className="text-emerald-800 leading-relaxed">
                1. Tap <strong>Open WhatsApp</strong> on each recipient below to open WhatsApp with the message ready.<br />
                2. Tap <strong>SEND</strong> in WhatsApp (attach poster from gallery if needed).<br />
                3. Tap <strong>Mark Sent</strong> in MediChain to track progress.
              </p>
            </div>
          </div>

          {/* Campaign Header, Progress & Controls */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{selectedCampaign.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    (selectedCampaign.sentCount || 0) >= (selectedCampaign.eligibleCount || 0) && (selectedCampaign.eligibleCount || 0) > 0
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-blue-100 text-blue-800"
                  }`}>
                    {selectedCampaign.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Queue: {selectedCampaign.recipients?.length || 0} pharmacies • Sent: {selectedCampaign.sentCount || 0} • Remaining: {Math.max(0, (selectedCampaign.recipients?.length || 0) - (selectedCampaign.sentCount || 0))}
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {(!selectedCampaign.recipients || selectedCampaign.recipients.length === 0) ? (
                  <button
                    onClick={() => handlePopulateRecipientsForCampaign(selectedCampaign.id)}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{actionLoading ? "Loading..." : "Add All Registered Pharmacies to Queue"}</span>
                  </button>
                ) : (
                  <>
                    {nextPendingRecipient && (
                      <button
                        onClick={() => handleOpenWhatsApp(nextPendingRecipient, true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                        title="Open WhatsApp for the next unsent pharmacy"
                      >
                        <FastForward className="w-4 h-4" />
                        <span>Send Next ({nextPendingRecipient.pharmacyName.slice(0, 14)}...)</span>
                      </button>
                    )}
                    {selectedCampaign.imageUrl && (
                      <a
                        href={selectedCampaign.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Poster</span>
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {selectedCampaign.recipients && selectedCampaign.recipients.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-600">
                    Campaign Dispatch Progress: {selectedCampaign.sentCount || 0} / {selectedCampaign.recipients.length} Sent
                  </span>
                  <span className="text-emerald-700">
                    {Math.round(((selectedCampaign.sentCount || 0) / (selectedCampaign.recipients.length || 1)) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.round(((selectedCampaign.sentCount || 0) / (selectedCampaign.recipients.length || 1)) * 100))}%`
                    }}
                  />
                </div>
              </div>
            )}

            {/* Filter Tabs & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setQueueFilter("all")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${queueFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600"}`}
                >
                  All ({selectedCampaign.recipients?.length || 0})
                </button>
                <button
                  onClick={() => setQueueFilter("pending")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${queueFilter === "pending" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600"}`}
                >
                  Unsent / Pending ({selectedCampaign.recipients?.filter(r => r.status !== "sent").length || 0})
                </button>
                <button
                  onClick={() => setQueueFilter("sent")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${queueFilter === "sent" ? "bg-white text-emerald-800 shadow-xs" : "text-slate-600"}`}
                >
                  Sent ({selectedCampaign.recipients?.filter(r => r.status === "sent").length || 0})
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search recipient..."
                  value={queueSearch}
                  onChange={e => setQueueSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs w-full sm:w-64"
                />
              </div>
            </div>
          </div>

          {/* Recipient Cards Queue */}
          <div className="space-y-3">
            {(!selectedCampaign.recipients || selectedCampaign.recipients.length === 0) ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
                <Users className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">No recipients in this campaign queue yet.</p>
                <button
                  onClick={() => handlePopulateRecipientsForCampaign(selectedCampaign.id)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Populate Queue with All Pharmacies</span>
                </button>
              </div>
            ) : filteredRecipients.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs">
                No recipients match your filter.
              </div>
            ) : (
              filteredRecipients.map((recip, index) => (
                <div
                  key={recip.id}
                  className={`bg-white border p-4 sm:p-5 rounded-2xl shadow-xs transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    recip.status === "sent"
                      ? "border-emerald-200 bg-emerald-50/20"
                      : recip.status === "opened"
                      ? "border-blue-200 bg-blue-50/20"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* Left info */}
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 font-mono">#{index + 1}</span>
                      <h4 className="text-sm font-bold text-slate-900">{recip.pharmacyName}</h4>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        recip.status === "sent"
                          ? "bg-emerald-100 text-emerald-800"
                          : recip.status === "opened"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {recip.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                      <span>Owner: <strong>{recip.ownerName}</strong></span>
                      <span>WhatsApp: <strong className="font-mono text-emerald-700">+{recip.formattedWhatsappNumber || recip.rawPhone}</strong></span>
                    </div>

                    <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 font-mono whitespace-pre-wrap line-clamp-3">
                      {recip.personalizedMessage}
                    </p>
                  </div>

                  {/* Right Action buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCopyMessage(recip.personalizedMessage)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Copy personalized text to clipboard"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Text</span>
                    </button>

                    <button
                      onClick={() => handleOpenWhatsApp(recip)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer ${
                        recip.status === "sent"
                          ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Open WhatsApp</span>
                    </button>

                    {recip.status !== "sent" ? (
                      <button
                        onClick={() => handleUpdateRecipient(recip.id, "sent")}
                        className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Mark Sent</span>
                      </button>
                    ) : (
                      <span className="text-emerald-700 text-xs font-bold flex items-center gap-1 px-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Sent</span>
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. PHARMACY DIRECTORY & DIRECT MESSAGING */}
      {/* ========================================================================= */}
      {activeTab === "audience" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pharmacy WhatsApp Directory</h3>
              <p className="text-xs text-slate-500">List of all onboarded pharmacies with valid WhatsApp numbers ready for direct or broadcast messaging.</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search pharmacies..."
                value={audienceSearch}
                onChange={e => setAudienceSearch(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[10px]">
                  <th className="py-3 px-4">Pharmacy</th>
                  <th className="py-3 px-4">Owner Name</th>
                  <th className="py-3 px-4">Phone / WhatsApp</th>
                  <th className="py-3 px-4">City / Area</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {pharmacies
                  .filter(p => {
                    const match = (p.pharmacyName || "").toLowerCase().includes(audienceSearch.toLowerCase()) ||
                                  (p.ownerName || "").toLowerCase().includes(audienceSearch.toLowerCase()) ||
                                  (p.phone || "").includes(audienceSearch);
                    return match;
                  })
                  .map(p => {
                    const cleanPhone = (p.phone || "").replace(/\D/g, "");
                    const bdPhone = cleanPhone.startsWith("88") ? cleanPhone : `88${cleanPhone.startsWith("0") ? cleanPhone : `0${cleanPhone}`}`;
                    const waLink = `https://wa.me/${bdPhone}?text=${encodeURIComponent(`আসসালামু আলাইকুম ${p.ownerName || ""}, ${p.pharmacyName}-এর জন্য MediChain-এর পক্ষ থেকে শুভেচ্ছা।`)}`;

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{p.pharmacyName}</td>
                        <td className="py-3 px-4">{p.ownerName}</td>
                        <td className="py-3 px-4 font-mono text-slate-800">{p.phone}</td>
                        <td className="py-3 px-4 text-slate-500">{p.city || p.area || "Dhaka"}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Eligible & Active
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-all"
                          >
                            <Send className="w-3 h-3" />
                            <span>Message</span>
                          </a>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. TEMPLATES */}
      {/* ========================================================================= */}
      {activeTab === "templates" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Reusable WhatsApp Message Templates</h3>
            <button
              onClick={() => setShowTemplateModal(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Template</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(tpl => (
              <div key={tpl.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-bold uppercase">
                      {tpl.category}
                    </span>
                    <button
                      onClick={() => whatsappClient.deleteTemplate(tpl.id).then(() => loadData())}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{tpl.name}</h4>
                  <p className="text-xs text-slate-600 font-mono whitespace-pre-wrap line-clamp-4 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    {tpl.message}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setMessageTemplate(tpl.message);
                    setCampaignName(`${tpl.name} Campaign`);
                    if (tpl.imageUrl) setPosterImageUrl(tpl.imageUrl);
                    setActiveTab("create");
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Use This Template</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. CAMPAIGN HISTORY & AUDIT LOGS */}
      {/* ========================================================================= */}
      {activeTab === "history" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Campaign History & Dispatch Logs</h3>
            <p className="text-xs text-slate-500">Historical performance metrics of executed marketing broadcasts.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[10px]">
                  <th className="py-3 px-4">Campaign Name</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4">Total Target</th>
                  <th className="py-3 px-4">Eligible</th>
                  <th className="py-3 px-4 text-emerald-700">Sent</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {campaigns.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{c.name}</td>
                    <td className="py-3 px-4">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4">{c.totalAudience}</td>
                    <td className="py-3 px-4 font-bold">{c.eligibleCount}</td>
                    <td className="py-3 px-4 font-black text-emerald-600">{c.sentCount}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                        {c.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NEW TEMPLATE MODAL */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scale-in space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Create Message Template</h3>
              <button onClick={() => setShowTemplateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async e => {
                e.preventDefault();
                try {
                  await whatsappClient.createTemplate({
                    name: templateName,
                    category: templateCategory,
                    message: templateMessage
                  });
                  showToast("Template saved successfully.");
                  setShowTemplateModal(false);
                  setTemplateName("");
                  setTemplateMessage("");
                  loadData();
                } catch (err: any) {
                  showToast(err.message || "Failed to save template", true);
                }
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Template Name *</label>
                <input
                  required
                  placeholder="e.g. Festival 20% Cashback Offer"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={templateCategory}
                  onChange={e => setTemplateCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                >
                  <option value="Promotion">Promotion</option>
                  <option value="Product Discount">Product Discount</option>
                  <option value="New Product">New Product</option>
                  <option value="Announcement">Announcement</option>
                  <option value="Festival Offer">Festival Offer</option>
                  <option value="Reminder">Reminder</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Message Content *</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Enter message with {{pharmacy_name}} and {{owner_name}}..."
                  value={templateMessage}
                  onChange={e => setTemplateMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
