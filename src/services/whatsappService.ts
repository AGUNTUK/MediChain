import { apiFetch } from "../lib/apiFetch";
import {
  WhatsAppCampaign,
  WhatsAppCampaignRecipient,
  WhatsAppTemplate,
  WhatsAppAudienceFilter,
  WhatsAppAudienceStats,
  Pharmacy
} from "../types";

export const whatsappClient = {
  async getStats(): Promise<WhatsAppAudienceStats> {
    const res = await apiFetch("/api/admin/whatsapp/stats");
    if (!res.ok) throw new Error("Failed to fetch WhatsApp audience stats");
    const data = await res.json();
    return data.stats;
  },

  async previewAudience(filter: WhatsAppAudienceFilter): Promise<{
    eligibleCount: number;
    excludedCount: number;
    eligiblePharmacies: Pharmacy[];
    excludedPharmacies: Array<{ pharmacy: Pharmacy; reason: string }>;
  }> {
    const res = await apiFetch("/api/admin/whatsapp/audience-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filter)
    });
    if (!res.ok) throw new Error("Failed to preview WhatsApp audience");
    return res.json();
  },

  async updateConsent(pharmacyId: string, optIn: boolean, source?: string): Promise<boolean> {
    const res = await apiFetch("/api/admin/whatsapp/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pharmacyId, optIn, source })
    });
    return res.ok;
  },

  async getCampaigns(status?: string): Promise<WhatsAppCampaign[]> {
    const query = new URLSearchParams();
    if (status && status !== "all") query.set("status", status);
    const res = await apiFetch(`/api/admin/whatsapp/campaigns?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch WhatsApp campaigns");
    const data = await res.json();
    return data.campaigns || [];
  },

  async getCampaignById(id: string): Promise<WhatsAppCampaign> {
    const res = await apiFetch(`/api/admin/whatsapp/campaigns/${id}`);
    if (!res.ok) throw new Error("Failed to fetch campaign details");
    const data = await res.json();
    return data.campaign;
  },

  async createCampaign(payload: {
    name: string;
    messageTemplate: string;
    imageUrl?: string;
    audienceFilter: WhatsAppAudienceFilter;
  }): Promise<WhatsAppCampaign> {
    const res = await apiFetch("/api/admin/whatsapp/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to create campaign");
    }
    const data = await res.json();
    return data.campaign;
  },

  async populateRecipients(campaignId: string, filter?: WhatsAppAudienceFilter): Promise<WhatsAppCampaign> {
    const res = await apiFetch(`/api/admin/whatsapp/campaigns/${campaignId}/populate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filter })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to populate recipients");
    }
    const data = await res.json();
    return data.campaign;
  },

  async updateRecipientStatus(recipientId: string, status: string, failureReason?: string): Promise<boolean> {
    const res = await apiFetch(`/api/admin/whatsapp/recipients/${recipientId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, failureReason })
    });
    return res.ok;
  },

  async getTemplates(): Promise<WhatsAppTemplate[]> {
    const res = await apiFetch("/api/admin/whatsapp/templates");
    if (!res.ok) throw new Error("Failed to fetch templates");
    const data = await res.json();
    return data.templates || [];
  },

  async createTemplate(payload: {
    name: string;
    category: string;
    message: string;
    imageUrl?: string;
  }): Promise<WhatsAppTemplate> {
    const res = await apiFetch("/api/admin/whatsapp/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to create template");
    const data = await res.json();
    return data.template;
  },

  async deleteTemplate(id: string): Promise<boolean> {
    const res = await apiFetch(`/api/admin/whatsapp/templates/${id}`, {
      method: "DELETE"
    });
    return res.ok;
  }
};
