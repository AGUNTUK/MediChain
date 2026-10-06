import { apiFetch } from "../lib/apiFetch";
import {
  Purchase,
  CustomerCollection,
  BusinessExpense,
  CapitalTransaction,
  CustomInvoiceData,
  DailyLedgerSummary,
  AccountsOverviewData,
  CustomerReceivableItem,
  SupplierPayableItem,
  ReconciliationReport,
  ExpenseCategory
} from "../types";

export const accountsClient = {
  async getOverview(startDate?: string, endDate?: string): Promise<AccountsOverviewData> {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const res = await apiFetch(`/api/admin/accounts/overview?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to load accounts overview");
    return res.json();
  },

  async getDailyLedger(params?: { date?: string; startDate?: string; endDate?: string }): Promise<{
    summary: DailyLedgerSummary;
    dailyRows: DailyLedgerSummary[];
  }> {
    const query = new URLSearchParams();
    if (params?.date) query.set("date", params.date);
    if (params?.startDate) query.set("startDate", params.startDate);
    if (params?.endDate) query.set("endDate", params.endDate);
    const res = await apiFetch(`/api/admin/accounts/daily-ledger?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch daily ledger");
    return res.json();
  },

  async getPurchases(params?: { startDate?: string; endDate?: string; supplier?: string; status?: string }): Promise<Purchase[]> {
    const query = new URLSearchParams();
    if (params?.startDate) query.set("startDate", params.startDate);
    if (params?.endDate) query.set("endDate", params.endDate);
    if (params?.supplier) query.set("supplier", params.supplier);
    if (params?.status) query.set("status", params.status);
    const res = await apiFetch(`/api/admin/accounts/purchases?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch purchases");
    const data = await res.json();
    return data.purchases || [];
  },

  async createPurchase(payload: {
    supplierName: string;
    invoiceReference?: string;
    purchaseDate: string;
    totalAmount: number;
    paidAmount: number;
    paymentMethod: "Cash" | "Bank Transfer" | "bKash" | "Nagad" | "Cheque" | "Credit/Payable" | "Other";
    notes?: string;
    items?: any[];
  }): Promise<Purchase> {
    const res = await apiFetch("/api/admin/accounts/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to record purchase");
    }
    const data = await res.json();
    return data.purchase;
  },

  async voidPurchase(id: string, reason: string): Promise<boolean> {
    const res = await apiFetch(`/api/admin/accounts/purchases/${id}/void`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason })
    });
    return res.ok;
  },

  async getCollections(params?: { startDate?: string; endDate?: string; pharmacyId?: string; status?: string }): Promise<CustomerCollection[]> {
    const query = new URLSearchParams();
    if (params?.startDate) query.set("startDate", params.startDate);
    if (params?.endDate) query.set("endDate", params.endDate);
    if (params?.pharmacyId) query.set("pharmacyId", params.pharmacyId);
    if (params?.status) query.set("status", params.status);
    const res = await apiFetch(`/api/admin/accounts/collections?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch collections");
    const data = await res.json();
    return data.collections || [];
  },

  async createCollection(payload: {
    customerName: string;
    pharmacyId?: string;
    collectionDate: string;
    amount: number;
    paymentMethod: "Cash" | "Bank Transfer" | "bKash" | "Nagad" | "Cheque" | "Card" | "Other";
    referenceInvoiceId?: string;
    notes?: string;
  }): Promise<CustomerCollection> {
    const res = await apiFetch("/api/admin/accounts/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to record collection");
    }
    const data = await res.json();
    return data.collection;
  },

  async voidCollection(id: string, reason: string): Promise<boolean> {
    const res = await apiFetch(`/api/admin/accounts/collections/${id}/void`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason })
    });
    return res.ok;
  },

  async getExpenses(params?: { startDate?: string; endDate?: string; category?: string; status?: string }): Promise<BusinessExpense[]> {
    const query = new URLSearchParams();
    if (params?.startDate) query.set("startDate", params.startDate);
    if (params?.endDate) query.set("endDate", params.endDate);
    if (params?.category) query.set("category", params.category);
    if (params?.status) query.set("status", params.status);
    const res = await apiFetch(`/api/admin/accounts/expenses?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch expenses");
    const data = await res.json();
    return data.expenses || [];
  },

  async createExpense(payload: {
    category: ExpenseCategory;
    amount: number;
    paymentMethod: "Cash" | "Bank Transfer" | "bKash" | "Nagad" | "Cheque" | "Card" | "Other";
    description: string;
    expenseDate: string;
    reference?: string;
    attachmentUrl?: string;
  }): Promise<BusinessExpense> {
    const res = await apiFetch("/api/admin/accounts/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to record expense");
    }
    const data = await res.json();
    return data.expense;
  },

  async voidExpense(id: string, reason: string): Promise<boolean> {
    const res = await apiFetch(`/api/admin/accounts/expenses/${id}/void`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason })
    });
    return res.ok;
  },

  async getCapital(params?: { startDate?: string; endDate?: string; status?: string }): Promise<CapitalTransaction[]> {
    const query = new URLSearchParams();
    if (params?.startDate) query.set("startDate", params.startDate);
    if (params?.endDate) query.set("endDate", params.endDate);
    if (params?.status) query.set("status", params.status);
    const res = await apiFetch(`/api/admin/accounts/capital?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch capital transactions");
    const data = await res.json();
    return data.transactions || [];
  },

  async createCapital(payload: {
    type: "Contribution" | "Withdrawal";
    partnerName: string;
    amount: number;
    paymentMethod: "Cash" | "Bank Transfer" | "bKash" | "Nagad" | "Cheque" | "Other";
    transactionDate: string;
    reference?: string;
    notes?: string;
  }): Promise<CapitalTransaction> {
    const res = await apiFetch("/api/admin/accounts/capital", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to record capital transaction");
    }
    const data = await res.json();
    return data.transaction;
  },

  async voidCapital(id: string, reason: string): Promise<boolean> {
    const res = await apiFetch(`/api/admin/accounts/capital/${id}/void`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason })
    });
    return res.ok;
  },

  async syncCustomInvoiceToLedger(invoice: CustomInvoiceData): Promise<CustomInvoiceData> {
    const res = await apiFetch("/api/admin/accounts/custom-invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoice)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to sync custom invoice to ledger");
    }
    const data = await res.json();
    return data.invoice;
  },

  async getInventoryValuation(): Promise<{
    totalInventoryValue: number;
    totalItemsCount: number;
    knownCostProductsCount: number;
    unknownCostProductsCount: number;
    items: any[];
  }> {
    const res = await apiFetch("/api/admin/accounts/inventory-value");
    if (!res.ok) throw new Error("Failed to fetch inventory valuation");
    return res.json();
  },

  async getReceivables(): Promise<CustomerReceivableItem[]> {
    const res = await apiFetch("/api/admin/accounts/receivables");
    if (!res.ok) throw new Error("Failed to fetch customer receivables");
    const data = await res.json();
    return data.receivables || [];
  },

  async getPayables(): Promise<SupplierPayableItem[]> {
    const res = await apiFetch("/api/admin/accounts/payables");
    if (!res.ok) throw new Error("Failed to fetch supplier payables");
    const data = await res.json();
    return data.payables || [];
  },

  async getReconciliation(): Promise<ReconciliationReport> {
    const res = await apiFetch("/api/admin/accounts/reconciliation");
    if (!res.ok) throw new Error("Failed to fetch reconciliation report");
    const data = await res.json();
    return data.report;
  }
};
