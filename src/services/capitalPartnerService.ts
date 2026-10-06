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
    return data.stats;
  },

  async getPartners(filter?: { search?: string; type?: string; status?: string }): Promise<Partner[]> {
    const query = new URLSearchParams();
    if (filter?.search) query.append("search", filter.search);
    if (filter?.type) query.append("type", filter.type);
    if (filter?.status) query.append("status", filter.status);

    const res = await apiFetch(`/api/admin/capital/partners?${query.toString()}`);
    const data = await res.json();
    return data.partners || [];
  },

  async getPartnerById(id: string): Promise<Partner> {
    const res = await apiFetch(`/api/admin/capital/partners/${id}`);
    const data = await res.json();
    return data.partner;
  },

  async createPartner(payload: Partial<Partner>): Promise<Partner> {
    const res = await apiFetch("/api/admin/capital/partners", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return data.partner;
  },

  async updatePartner(id: string, payload: Partial<Partner>): Promise<Partner> {
    const res = await apiFetch(`/api/admin/capital/partners/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return data.partner;
  },

  async deletePartner(id: string): Promise<boolean> {
    const res = await apiFetch(`/api/admin/capital/partners/${id}`, {
      method: "DELETE"
    });
    const data = await res.json();
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
    return await res.json();
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
      body: JSON.stringify(payload)
    });
    return await res.json();
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
      body: JSON.stringify(payload)
    });
    return await res.json();
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
    return data.documents || [];
  },

  async getDocumentById(id: string): Promise<{ document: CapitalDocument; history: CapitalDocument[] }> {
    const res = await apiFetch(`/api/admin/capital/documents/${id}`);
    return await res.json();
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
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return data.document;
  },

  async finalizeDocument(id: string): Promise<CapitalDocument> {
    const res = await apiFetch(`/api/admin/capital/documents/${id}/finalize`, {
      method: "POST"
    });
    const data = await res.json();
    return data.document;
  },

  async createNewVersion(id: string, updatedPayload: any, reason: string): Promise<CapitalDocument> {
    const res = await apiFetch(`/api/admin/capital/documents/${id}/new-version`, {
      method: "POST",
      body: JSON.stringify({ updatedPayload, reason })
    });
    const data = await res.json();
    return data.document;
  },

  async voidDocument(id: string, reason: string): Promise<CapitalDocument> {
    const res = await apiFetch(`/api/admin/capital/documents/${id}/void`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });
    const data = await res.json();
    return data.document;
  },

  async deleteDocument(id: string): Promise<boolean> {
    const res = await apiFetch(`/api/admin/capital/documents/${id}`, {
      method: "DELETE"
    });
    const data = await res.json();
    return data.success;
  },

  getPdfUrl(id: string): string {
    return `/api/admin/capital/documents/${id}/pdf`;
  }
};
