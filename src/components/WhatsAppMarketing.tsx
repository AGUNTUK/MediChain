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
  Info
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
  const [campaignName, setCampaignName] = useState("");
  const [messageTemplate, setMessageTemplate] = useState(
    "🎉 SOMATEC PHARMA SPECIAL OFFER 🎉\n\nআসসালামু আলাইকুম {{owner_name}},\n{{pharmacy_name}}-এর জন্য Somatec Pharmaceuticals-এর সকল পণ্যে এখন FLAT 34% OFF!\n\nPharmacy-এর প্রয়োজনীয় সকল মেডিসিন পাইকারি দামে MediChain-এ অর্ডার করুন।\n\n🔥 FLAT 34% DISCOUNT\n🚚 শিডিউলড ডেলিভারি\n\nMediChain — ফার্মেসির স্মার্ট পার্টনার।"
  );
  const [posterImageUrl, setPosterImageUrl] = useState("");
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [audienceFilter, setAudienceFilter] = useState<WhatsAppAudienceFilter>({
    segment: "all_opted_in"
  });

  // Live Audience Preview
  const [audiencePreview, setAudiencePreview] = useState<{
    eligibleCount: number;
    excludedCount: number;
    eligiblePharmacies: Pharmacy[];
    excludedPharmacies: Array<{ pharmacy: Pharmacy; reason: string }>;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // New Template Modal
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateCategory, setTemplateCategory] = useState<any>("Promotion");
  const [templateMessage, setTemplateMessage] = useState("");

  // Audience Search Filter
  const [audienceSearch, setAudienceSearch] = useState("");
  const [consentFilter, setConsentFilter] = useState<"all" | "opted_in" | "opted_out">("all");

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
      whatsappClient
        .previewAudience(audienceFilter)
        .then(res => setAudiencePreview(res))
        .catch(() => setAudiencePreview(null))
        .finally(() => setPreviewLoading(false));
    }
  }, [audienceFilter, activeTab]);

  // Insert Variable Tag Helper
  const insertVariableTag = (tag: string) => {
    setMessageTemplate(prev => prev + ` ${tag}`);
  };

  // Image upload handler
  const handlePosterUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast("Poster image must be less than 5MB", true);
      return;
    }
    setUploadingPoster(true);
    try {
      const res = await storageService.uploadVerificationDocument(file, "campaign-posters");
      if (res.url) {
        setPosterImageUrl(res.url);
        showToast("Campaign poster uploaded successfully.");
      } else {
        showToast("Failed to upload poster image", true);
      }
    } catch (err: any) {
      showToast(err.message || "Image upload failed", true);
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
      const campaign = await whatsappClient.createCampaign({
        name: campaignName,
        messageTemplate,
        imageUrl: posterImageUrl || undefined,
        audienceFilter
      });

      showToast(`Campaign "${campaign.name}" created with ${campaign.eligibleCount} recipients ready.`);
      setSelectedCampaign(campaign);
      setActiveTab("queue");
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to create campaign", true);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Open WhatsApp for a recipient
  const handleOpenWhatsApp = (recipient: WhatsAppCampaignRecipient) => {
    if (recipient.status === "sent") {
      const confirmSendAgain = window.confirm(
        `This message to ${recipient.pharmacyName} is already marked as SENT. Do you want to open WhatsApp again?`
      );
      if (!confirmSendAgain) return;
    }

    if (!recipient.waMeUrl) {
      showToast("Invalid phone number. Could not create WhatsApp deep link.", true);
      return;
    }

    // Open WhatsApp Business in new window / phone app
    window.open(recipient.waMeUrl, "_blank", "noopener,noreferrer");

    // Automatically transition to "opened" if currently pending
    if (recipient.status === "pending") {
      whatsappClient.updateRecipientStatus(recipient.id, "opened").then(() => {
        if (selectedCampaign) {
          setSelectedCampaign(prev => {
            if (!prev) return null;
            return {
              ...prev,
              recipients: prev.recipients?.map(r => r.id === recipient.id ? { ...r, status: "opened", openedAt: new Date().toISOString() } : r)
            };
          });
        }
      });
    }
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
      showToast(`Recipient marked as ${status.toUpperCase()}.`);

      if (selectedCampaign) {
        setSelectedCampaign(prev => {
          if (!prev) return null;
          const updatedRecips = prev.recipients?.map(r =>
            r.id === recipientId ? { ...r, status } : r
          );
          return {
            ...prev,
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
      const camp = await whatsappClient.getCampaignById(campaignId);
      setSelectedCampaign(camp);
      setActiveTab("queue");
    } catch (err: any) {
      showToast("Failed to load campaign details", true);
    } finally {
      setLoading(false);
    }
  };

  // Toggle pharmacy consent
  const handleToggleConsent = async (pharmacy: Pharmacy) => {
    const newStatus = !pharmacy.whatsappMarketingOptIn;
    try {
      await whatsappClient.updateConsent(pharmacy.id, newStatus, "Admin Manual Toggle");
      showToast(`Updated WhatsApp marketing consent for ${pharmacy.pharmacyName} to ${newStatus ? "OPTED IN" : "OPTED OUT"}`);
      if (onRefreshPharmacies) onRefreshPharmacies();
      loadData();
    } catch (err: any) {
      showToast("Failed to update consent", true);
    }
  };

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
              Prepare personalized campaigns & promotional posters, open conversations in your WhatsApp Business app, and send manually with zero Meta subscription cost.
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
          { id: "audience", label: "Audience & Consent", icon: Users },
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
          {/* Top Quick Metrics */}
          {audienceStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-1 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Pharmacies</span>
                <div className="text-xl font-black text-slate-900">{audienceStats.totalPharmacies}</div>
                <p className="text-[10px] text-slate-400">Registered pharmacy accounts</p>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-1 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Opted In for Marketing</span>
                <div className="text-xl font-black text-emerald-700">{audienceStats.optedInCount}</div>
                <p className="text-[10px] text-slate-400">Explicit consent verified</p>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-1 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Valid BD WhatsApp #</span>
                <div className="text-xl font-black text-blue-700">{audienceStats.validBangladeshNumbersCount}</div>
                <p className="text-[10px] text-slate-400">Valid +8801X mobile numbers</p>
              </div>
              <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-1 shadow-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Active Campaigns</span>
                <div className="text-xl font-black text-purple-700">{campaigns.length}</div>
                <p className="text-[10px] text-slate-400">Ready or in-progress</p>
              </div>
            </div>
          )}

          {/* Campaigns List */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Marketing Campaigns</h3>
                <p className="text-xs text-slate-500">Select a campaign to open its dispatch queue and start sending messages.</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {campaigns.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-3">
                  <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs font-medium">No campaigns created yet. Click "Create Campaign" to launch your first promotional broadcast.</p>
                  <button
                    onClick={() => setActiveTab("create")}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
                  >
                    Create First Campaign
                  </button>
                </div>
              ) : (
                campaigns.map(camp => (
                  <div key={camp.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{camp.name}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          camp.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : camp.status === "in_progress"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-700"
                        }`}>
                          {camp.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">{camp.messageTemplate}</p>
                      <div className="flex items-center gap-4 text-[11px] text-slate-400 font-medium">
                        <span>Created: {new Date(camp.createdAt).toLocaleDateString()}</span>
                        <span>Audience: <strong>{camp.eligibleCount}</strong> eligible</span>
                        <span className="text-emerald-600 font-bold">Sent: {camp.sentCount} / {camp.eligibleCount}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleSelectCampaignForQueue(camp.id)}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Open Dispatch Queue</span>
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
      {/* 2. CREATE CAMPAIGN */}
      {/* ========================================================================= */}
      {activeTab === "create" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Form */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Create New WhatsApp Campaign</h3>
              <p className="text-xs text-slate-500">Draft promotional message, attach poster, and target audience segments.</p>
            </div>

            <form onSubmit={handleCreateCampaignSubmit} className="space-y-4 text-xs">
              {/* Campaign Name */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Campaign Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Somatec Flat 34% Discount Offer"
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Template Quick Loader */}
              {templates.length > 0 && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quick Load from Template</label>
                  <div className="flex flex-wrap gap-1.5">
                    {templates.map(tpl => (
                      <button
                        type="button"
                        key={tpl.id}
                        onClick={() => {
                          setMessageTemplate(tpl.message);
                          if (tpl.imageUrl) setPosterImageUrl(tpl.imageUrl);
                          showToast(`Loaded template "${tpl.name}"`);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium transition-all"
                      >
                        {tpl.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Template */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Message Text *</label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400">Insert tag:</span>
                    <button
                      type="button"
                      onClick={() => insertVariableTag("{{pharmacy_name}}")}
                      className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded text-[10px] font-bold"
                    >
                      + Pharmacy Name
                    </button>
                    <button
                      type="button"
                      onClick={() => insertVariableTag("{{owner_name}}")}
                      className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded text-[10px] font-bold"
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
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-mono text-xs leading-relaxed focus:ring-2 focus:ring-emerald-500"
                  placeholder="Enter message text with optional {{pharmacy_name}} or {{owner_name}}..."
                />
              </div>

              {/* Poster / Image Attachment */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Promotional Poster / Banner (Optional)</label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <label className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-all">
                    <ImageIcon className="w-4 h-4" />
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
                        className="text-rose-600 hover:text-rose-800 ml-1"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Audience Target Segment */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block font-bold text-slate-700">Audience Segmentation *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: "all_opted_in", label: "All Opted-In Pharmacies", desc: "Explicit WhatsApp marketing consent verified" },
                    { id: "active_buyers", label: "Active Buyers", desc: "Pharmacies with at least 1 completed order" },
                    { id: "frequent_buyers", label: "Frequent Buyers", desc: "Pharmacies with 3+ completed wholesale orders" },
                    { id: "first_order", label: "First-Time Buyers", desc: "Pharmacies that placed exactly 1 order" },
                    { id: "high_value", label: "High-Value Accounts", desc: "Pharmacies with ৳50,000+ total purchase" },
                    { id: "inactive", label: "Inactive Pharmacies", desc: "Registered pharmacies with 0 orders placed" }
                  ].map(seg => (
                    <label
                      key={seg.id}
                      className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                        audienceFilter.segment === seg.id
                          ? "bg-emerald-50/50 border-emerald-500 text-emerald-950"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <input
                        type="radio"
                        name="audienceSegment"
                        checked={audienceFilter.segment === seg.id}
                        onChange={() => setAudienceFilter(prev => ({ ...prev, segment: seg.id as any }))}
                        className="mt-0.5 text-emerald-600"
                      />
                      <div>
                        <span className="font-bold block text-xs">{seg.label}</span>
                        <span className="text-[10px] text-slate-500 leading-tight">{seg.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
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
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>{actionLoading ? "Preparing Campaign..." : "Launch Campaign Queue"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Col: Live Preview & Eligibility Breakdown */}
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
                  pharmacyName: " জননী ফার্মেসি",
                  ownerName: "ডা. রফিকুল ইসলাম",
                  city: "ঢাকা"
                })}
              </div>
            </div>

            {/* Live Audience Count & Exclusions */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Target Audience Summary</h4>

              {previewLoading ? (
                <div className="py-4 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Calculating eligible recipients...</span>
                </div>
              ) : audiencePreview ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                    <div className="flex items-center justify-between font-bold text-emerald-900">
                      <span>Eligible Recipients</span>
                      <span className="text-base">{audiencePreview.eligibleCount} pharmacies</span>
                    </div>
                    <p className="text-[10px] text-emerald-700">Passed consent check & valid +8801X number</p>
                  </div>

                  {audiencePreview.excludedCount > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between font-bold text-amber-900">
                        <span>Excluded Pharmacies</span>
                        <span>{audiencePreview.excludedCount}</span>
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                        {audiencePreview.excludedPharmacies.slice(0, 5).map((ex, idx) => (
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
      {/* 3. CAMPAIGN DISPATCH QUEUE (MAIN MOBILE SEND SCREEN) */}
      {/* ========================================================================= */}
      {activeTab === "queue" && selectedCampaign && (
        <div className="space-y-6">
          {/* Important Workflow Notice Banner */}
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-start gap-3 shadow-xs">
            <Info className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-emerald-900">Manual Send Workflow (100% Free WhatsApp Business)</p>
              <p className="text-emerald-800">
                1. Tap <strong>Open WhatsApp</strong> on each recipient card below.<br />
                2. Your WhatsApp Business app will open with the prefilled message.<br />
                3. Manually tap <strong>SEND</strong> in WhatsApp Business (attach poster from gallery if needed).<br />
                4. Return to MediChain and tap <strong>Mark Sent</strong>.
              </p>
            </div>
          </div>

          {/* Campaign Header & Progress */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">{selectedCampaign.name}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                  {selectedCampaign.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Dispatch Queue: {selectedCampaign.recipients?.length || 0} total recipients
              </p>
            </div>

            {/* Poster Download / Share Tool */}
            {selectedCampaign.imageUrl && (
              <div className="flex items-center gap-2">
                <a
                  href={selectedCampaign.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Poster</span>
                </a>
              </div>
            )}
          </div>

          {/* Recipient Cards Queue */}
          <div className="space-y-3">
            {(!selectedCampaign.recipients || selectedCampaign.recipients.length === 0) ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs">
                No recipients in this campaign queue.
              </div>
            ) : (
              selectedCampaign.recipients.map((recip, index) => (
                <div
                  key={recip.id}
                  className={`bg-white border p-4 sm:p-5 rounded-2xl shadow-xs transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    recip.status === "sent"
                      ? "border-emerald-200 bg-emerald-50/20"
                      : recip.status === "opened"
                      ? "border-blue-200 bg-blue-50/20"
                      : recip.status === "skipped"
                      ? "border-slate-200 opacity-60"
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
                          : recip.status === "skipped"
                          ? "bg-slate-100 text-slate-600"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {recip.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600 font-medium">
                      <span>Owner: <strong>{recip.ownerName}</strong></span>
                      <span>WhatsApp: <strong className="font-mono text-emerald-700">+{recip.formattedWhatsappNumber || recip.rawPhone}</strong></span>
                    </div>

                    <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 font-mono line-clamp-2">
                      {recip.personalizedMessage}
                    </p>
                  </div>

                  {/* Right Action buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCopyMessage(recip.personalizedMessage)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                      title="Copy personalized text to clipboard"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>

                    <button
                      onClick={() => handleOpenWhatsApp(recip)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${
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
                        className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1"
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

                    {recip.status !== "skipped" && recip.status !== "sent" && (
                      <button
                        onClick={() => handleUpdateRecipient(recip.id, "skipped")}
                        className="px-2.5 py-2 text-slate-400 hover:text-slate-600 text-xs font-medium"
                      >
                        Skip
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. AUDIENCE & CONSENT MANAGEMENT */}
      {/* ========================================================================= */}
      {activeTab === "audience" && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pharmacy Marketing Consent Management</h3>
              <p className="text-xs text-slate-500">GDPR/compliance audit list of WhatsApp marketing opt-in preferences.</p>
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
                  <th className="py-3 px-4">City</th>
                  <th className="py-3 px-4">Marketing Consent</th>
                  <th className="py-3 px-4 text-right">Action</th>
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
                  .map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{p.pharmacyName}</td>
                      <td className="py-3 px-4">{p.ownerName}</td>
                      <td className="py-3 px-4 font-mono text-slate-800">{p.phone}</td>
                      <td className="py-3 px-4 text-slate-500">{p.city || p.area || "Dhaka"}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.whatsappMarketingOptIn
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {p.whatsappMarketingOptIn ? "Opted In" : "Opted Out"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleToggleConsent(p)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            p.whatsappMarketingOptIn
                              ? "text-rose-600 hover:bg-rose-50"
                              : "text-emerald-600 hover:bg-emerald-50"
                          }`}
                        >
                          {p.whatsappMarketingOptIn ? "Opt Out" : "Grant Opt-In"}
                        </button>
                      </td>
                    </tr>
                  ))}
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
                  <th className="py-3 px-4 text-slate-500">Skipped</th>
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
                    <td className="py-3 px-4 text-slate-400">{c.skippedCount}</td>
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
