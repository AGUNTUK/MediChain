import { apiFetch } from "../lib/apiFetch";
import {
  Partner,
  CapitalTransaction,
  CapitalLedgerEntry,
  CapitalDocument,
  CapitalDocumentType,
  CapitalDashboardStats
} from "../types";

export const capitalClient = {
  async getOverview(): Promise<CapitalDashboardStats> {
    const res = await apiFetch("/api/admin/capital/overview");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load overview");
    return data.stats;
  },

  async getPartners(filter?: { search?: string; type?: string; status?: string }): Promise<Partner[]> {
    const query = new URLSearchParams();
    if (filter?.search) query.append("search", filter.search);
    if (filter?.type) query.append("type", filter.type);
    if (filter?.status) query.append("status", filter.status);

    const res = await apiFetch(`/api/admin/capital/partners?${query.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load partners");
    return data.partners || [];
  },

  async getPartnerById(id: string): Promise<Partner> {
    const res = await apiFetch(`/api/admin/capital/partners/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load partner");
    return data.partner;
  },

  async createPartner(payload: Partial<Partner>): Promise<Partner> {
    const res = await apiFetch("/api/admin/capital/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create partner");
    return data.partner;
  },

  async updatePartner(id: string, payload: Partial<Partner>): Promise<Partner> {
    const res = await apiFetch(`/api/admin/capital/partners/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update partner");
    return data.partner;
  },

  async deletePartner(id: string): Promise<boolean> {
    const res = await apiFetch(`/api/admin/capital/partners/${id}`, {
      method: "DELETE"
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to delete partner");
    return data.success;
  },

  async getPartnerLedger(partnerId: string): Promise<{
    partner: Partner;
    entries: CapitalLedgerEntry[];
    closingBalance: number;
    totalContributions: number;
    totalWithdrawals: number;
  }> {
    const res = await apiFetch(`/api/admin/capital/partners/${partnerId}/ledger`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load partner ledger");
    return data;
  },

  async recordContribution(payload: {
    partnerId: string;
    amount: number;
    paymentMethod: "Cash" | "Bank Transfer" | "bKash" | "Nagad" | "Cheque" | "Other";
    transactionDate?: string;
    purpose?: string;
    reference?: string;
    notes?: string;
  }): Promise<{ transaction: CapitalTransaction; documents: CapitalDocument[] }> {
    const res = await apiFetch("/api/admin/capital/contributions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to record contribution");
    return data;
  },

  async recordWithdrawal(payload: {
    partnerId: string;
    amount: number;
    paymentMethod: "Cash" | "Bank Transfer" | "bKash" | "Nagad" | "Cheque" | "Other";
    transactionDate?: string;
    purpose?: string;
    reference?: string;
    notes?: string;
  }): Promise<{ transaction: CapitalTransaction }> {
    const res = await apiFetch("/api/admin/capital/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to record withdrawal");
    return data;
  },

  async getDocuments(filter?: {
    partnerId?: string;
    type?: string;
    status?: string;
    search?: string;
  }): Promise<CapitalDocument[]> {
    const query = new URLSearchParams();
    if (filter?.partnerId) query.append("partnerId", filter.partnerId);
    if (filter?.type) query.append("type", filter.type);
    if (filter?.status) query.append("status", filter.status);
    if (filter?.search) query.append("search", filter.search);

    const res = await apiFetch(`/api/admin/capital/documents?${query.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load documents");
    return data.documents || [];
  },

  async getDocumentById(id: string): Promise<{ document: CapitalDocument; history: CapitalDocument[] }> {
    const res = await apiFetch(`/api/admin/capital/documents/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load document");
    return data;
  },

  async createDocumentDraft(payload: {
    documentType: CapitalDocumentType;
    partnerId: string;
    capitalTransactionId?: string;
    amount?: number;
    paymentMethod?: string;
    date?: string;
    purpose?: string;
    customPayload?: any;
  }): Promise<CapitalDocument> {
    const res = await apiFetch("/api/admin/capital/documents/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create document draft");
    return data.document;
  },

  async finalizeDocument(id: string): Promise<CapitalDocument> {
    const res = await apiFetch(`/api/admin/capital/documents/${id}/finalize`, {
      method: "POST"
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to finalize document");
    return data.document;
  },

  async createNewVersion(id: string, updatedPayload: any, reason: string): Promise<CapitalDocument> {
    const res = await apiFetch(`/api/admin/capital/documents/${id}/new-version`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updatedPayload, reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create new document version");
    return data.document;
  },

  async voidDocument(id: string, reason: string): Promise<CapitalDocument> {
    const res = await apiFetch(`/api/admin/capital/documents/${id}/void`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to void document");
    return data.document;
  },

  async deleteDocument(id: string): Promise<boolean> {
    const res = await apiFetch(`/api/admin/capital/documents/${id}`, {
      method: "DELETE"
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to delete document");
    return data.success;
  },

  getPdfUrl(id: string): string {
    return `/api/admin/capital/documents/${id}/pdf`;
  }
};
