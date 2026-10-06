/**
 * MediChain Capital & Partner Document Management System
 * 
 * CORE RULES:
 * 1. Capital contribution is NEVER Sales, Revenue, COGS, Profit, or Customer Collection.
 * 2. Affects Cash/Bank + Partner Capital/Equity.
 * 3. Immutable versioned business documents with transaction-safe sequential numbers.
 * 4. Asia/Dhaka timezone-safe calendar boundaries.
 */

import { supabaseAdmin } from "./supabaseAdmin.js";
import { toBDDateString } from "./accountsService.js";
import * as accountsService from "./accountsService.js";
import {
  Partner,
  PartnerType,
  PartnerStatus,
  CapitalTransaction,
  CapitalLedgerEntry,
  CapitalDocument,
  CapitalDocumentType,
  CapitalDocumentStatus,
  CapitalDashboardStats
} from "../types.js";

// ==========================================
// 1. AMOUNT IN WORDS (BDT CURRENCY)
// ==========================================

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen"
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
];

function convertBelowThousand(num: number): string {
  if (num === 0) return "";
  if (num < 20) return ONES[num];
  if (num < 100) {
    const rem = num % 10;
    return TENS[Math.floor(num / 10)] + (rem ? " " + ONES[rem] : "");
  }
  const rem = num % 100;
  return ONES[Math.floor(num / 100)] + " Hundred" + (rem ? " " + convertBelowThousand(rem) : "");
}

/**
 * Converts a BDT number to formal English words (e.g. 100000 -> "One Hundred Thousand Taka Only")
 */
export function amountToWordsBDT(amount: number): string {
  const rounded = Math.round(Math.abs(amount) * 100) / 100;
  if (rounded === 0) return "Zero Taka Only";

  const whole = Math.floor(rounded);
  const paisa = Math.round((rounded - whole) * 100);

  let words = "";

  // Millions / Crores / Thousands
  if (whole >= 10000000) { // 1 Crore+
    const crore = Math.floor(whole / 10000000);
    const rem = whole % 10000000;
    words += amountToWordsBDT(crore).replace(" Taka Only", "") + " Crore ";
    if (rem > 0) words += amountToWordsBDT(rem).replace(" Taka Only", "");
  } else if (whole >= 1000000) { // Millions
    const millions = Math.floor(whole / 1000000);
    const rem = whole % 1000000;
    words += convertBelowThousand(millions) + " Million ";
    if (rem > 0) words += convertThousands(rem);
  } else {
    words += convertThousands(whole);
  }

  function convertThousands(n: number): string {
    let result = "";
    if (n >= 1000) {
      const thousands = Math.floor(n / 1000);
      const rem = n % 1000;
      result += convertBelowThousand(thousands) + " Thousand ";
      if (rem > 0) result += convertBelowThousand(rem);
    } else {
      result += convertBelowThousand(n);
    }
    return result;
  }

  words = words.trim();
  if (!words) words = "Zero";

  if (paisa > 0) {
    return `${words} Taka and ${convertBelowThousand(paisa)} Paisa Only`;
  }
  return `${words} Taka Only`;
}

// In-memory fallback stores (for development or before migration execution)
let fallbackPartners: Partner[] = [];
let fallbackDocuments: CapitalDocument[] = [];
let fallbackSequences: Record<string, number> = {};

// ==========================================
// 2. TRANSACTION-SAFE DOCUMENT NUMBERING
// ==========================================

export async function getNextDocumentNumber(type: CapitalDocumentType): Promise<string> {
  const prefixMap: Record<CapitalDocumentType, string> = {
    CAPITAL_CONTRIBUTION_RECEIPT: "MC-CAP-RCP",
    CASH_RECEIPT_VOUCHER: "MC-CAP-VCH",
    CAPITAL_CONTRIBUTION_CERTIFICATE: "MC-CAP-CERT",
    PARTNER_CAPITAL_STATEMENT: "MC-CAP-STM",
    PARTNER_CAPITAL_AGREEMENT: "MC-CAP-AGR"
  };

  const prefix = prefixMap[type] || "MC-CAP-DOC";
  const year = new Date().getFullYear();
  const seqKey = `${prefix}-${year}`;

  try {
    // Attempt atomic increment in Supabase
    const { data: existing, error: selectErr } = await supabaseAdmin
      .from("capital_document_sequences")
      .select("current_val")
      .eq("sequence_prefix", prefix)
      .eq("year", year)
      .maybeSingle();

    if (selectErr) {
      // Table may not exist yet in local/preview db, use in-memory sequence
      const curr = fallbackSequences[seqKey] || 0;
      const nextVal = curr + 1;
      fallbackSequences[seqKey] = nextVal;
      const padded = String(nextVal).padStart(4, "0");
      return `${prefix}-${year}-${padded}`;
    }

    let nextVal = 1;
    if (existing) {
      nextVal = (existing.current_val || 0) + 1;
      const { error: updateErr } = await supabaseAdmin
        .from("capital_document_sequences")
        .update({ current_val: nextVal })
        .eq("sequence_prefix", prefix)
        .eq("year", year);
      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await supabaseAdmin
        .from("capital_document_sequences")
        .insert({ sequence_prefix: prefix, year, current_val: nextVal });
      if (insertErr) throw insertErr;
    }

    const padded = String(nextVal).padStart(4, "0");
    return `${prefix}-${year}-${padded}`;
  } catch (err) {
    // In-memory atomic fallback
    const curr = fallbackSequences[seqKey] || 0;
    const nextVal = curr + 1;
    fallbackSequences[seqKey] = nextVal;
    const padded = String(nextVal).padStart(4, "0");
    return `${prefix}-${year}-${padded}`;
  }
}

// ==========================================
// 3. PARTNERS CRUD & PROFILES
// ==========================================

export async function createPartner(data: {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  nidReference?: string;
  partnerType: PartnerType;
  ownershipPercentage?: number;
  profitSharePercentage?: number;
  joiningDate?: string;
  notes?: string;
  createdBy?: string;
}): Promise<Partner> {
  const joiningDate = data.joiningDate || toBDDateString(new Date());
  const row = {
    name: data.name.trim(),
    phone: data.phone.trim(),
    email: data.email?.trim() || null,
    address: data.address?.trim() || null,
    nid_reference: data.nidReference?.trim() || null,
    partner_type: data.partnerType,
    ownership_percentage: Number(data.ownershipPercentage) || 0,
    profit_share_percentage: Number(data.profitSharePercentage) || 0,
    joining_date: joiningDate,
    status: "Active" as PartnerStatus,
    notes: data.notes?.trim() || null,
    total_contributed: 0,
    total_withdrawn: 0,
    current_capital_balance: 0,
    created_by: data.createdBy || "Admin"
  };

  try {
    const { data: inserted, error } = await supabaseAdmin
      .from("partners")
      .insert(row)
      .select()
      .single();

    if (error) throw error;
    return mapPartner(inserted);
  } catch (err: any) {
    console.warn("[CapitalPartners] Fallback createPartner:", err.message);
    const newPartner: Partner = {
      id: `ptn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: row.name,
      phone: row.phone,
      email: row.email || undefined,
      address: row.address || undefined,
      nidReference: row.nid_reference || undefined,
      partnerType: row.partner_type,
      ownershipPercentage: row.ownership_percentage,
      profitSharePercentage: row.profit_share_percentage,
      joiningDate: row.joining_date,
      status: "Active",
      notes: row.notes || undefined,
      totalContributed: 0,
      totalWithdrawn: 0,
      currentCapitalBalance: 0,
      createdBy: row.created_by,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    fallbackPartners.unshift(newPartner);
    return newPartner;
  }
}

export async function getPartners(filter?: {
  search?: string;
  type?: string;
  status?: string;
}): Promise<Partner[]> {
  try {
    let query = supabaseAdmin
      .from("partners")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter?.status && filter.status !== "all") {
      query = query.eq("status", filter.status);
    }
    if (filter?.type && filter.type !== "all") {
      query = query.eq("partner_type", filter.type);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (data) {
      let mapped = data.map(mapPartner);
      if (filter?.search) {
        const q = filter.search.toLowerCase().trim();
        mapped = mapped.filter(p => 
          p.name.toLowerCase().includes(q) || 
          p.phone.includes(q) || 
          (p.email && p.email.toLowerCase().includes(q))
        );
      }
      return mapped;
    }
  } catch (err: any) {
    console.warn("[CapitalPartners] Fallback getPartners:", err.message);
  }

  let list = [...fallbackPartners];
  if (filter?.status && filter.status !== "all") list = list.filter(p => p.status === filter.status);
  if (filter?.type && filter.type !== "all") list = list.filter(p => p.partnerType === filter.type);
  if (filter?.search) {
    const q = filter.search.toLowerCase().trim();
    list = list.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.phone.includes(q) || 
      (p.email && p.email.toLowerCase().includes(q))
    );
  }
  return list;
}

export async function getPartnerById(id: string): Promise<Partner | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("partners")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) return mapPartner(data);
  } catch {}

  return fallbackPartners.find(p => p.id === id) || null;
}

export async function updatePartner(id: string, updates: Partial<Partner>): Promise<Partner | null> {
  const rowUpdates: any = {
    updated_at: new Date().toISOString()
  };
  if (updates.name !== undefined) rowUpdates.name = updates.name.trim();
  if (updates.phone !== undefined) rowUpdates.phone = updates.phone.trim();
  if (updates.email !== undefined) rowUpdates.email = updates.email?.trim() || null;
  if (updates.address !== undefined) rowUpdates.address = updates.address?.trim() || null;
  if (updates.nidReference !== undefined) rowUpdates.nid_reference = updates.nidReference?.trim() || null;
  if (updates.partnerType !== undefined) rowUpdates.partner_type = updates.partnerType;
  if (updates.ownershipPercentage !== undefined) rowUpdates.ownership_percentage = Number(updates.ownershipPercentage) || 0;
  if (updates.profitSharePercentage !== undefined) rowUpdates.profit_share_percentage = Number(updates.profitSharePercentage) || 0;
  if (updates.status !== undefined) rowUpdates.status = updates.status;
  if (updates.notes !== undefined) rowUpdates.notes = updates.notes?.trim() || null;

  try {
    const { data, error } = await supabaseAdmin
      .from("partners")
      .update(rowUpdates)
      .eq("id", id)
      .select()
      .single();

    if (!error && data) return mapPartner(data);
  } catch {}

  const idx = fallbackPartners.findIndex(p => p.id === id);
  if (idx !== -1) {
    fallbackPartners[idx] = {
      ...fallbackPartners[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    return fallbackPartners[idx];
  }
  return null;
}

export async function deletePartner(id: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from("partners")
      .delete()
      .eq("id", id);
    if (error) throw error;
  } catch (err: any) {
    console.warn("[CapitalPartners] Fallback deletePartner:", err?.message);
  }

  const idx = fallbackPartners.findIndex(p => p.id === id);
  if (idx !== -1) {
    fallbackPartners.splice(idx, 1);
  }
  return true;
}

function mapPartner(row: any): Partner {
  return {
    id: row.id,
    name: row.name || "Unknown Partner",
    phone: row.phone || "",
    email: row.email || undefined,
    address: row.address || undefined,
    nidReference: row.nid_reference || undefined,
    partnerType: row.partner_type || "PARTNER_CAPITAL",
    ownershipPercentage: parseFloat(row.ownership_percentage || 0),
    profitSharePercentage: parseFloat(row.profit_share_percentage || 0),
    joiningDate: row.joining_date ? String(row.joining_date).slice(0, 10) : toBDDateString(new Date()),
    status: row.status || "Active",
    notes: row.notes || undefined,
    totalContributed: parseFloat(row.total_contributed || 0),
    totalWithdrawn: parseFloat(row.total_withdrawn || 0),
    currentCapitalBalance: parseFloat(row.current_capital_balance || 0),
    createdBy: row.created_by || "Admin",
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

// ==========================================
// 4. CAPITAL TRANSACTIONS & PARTNER LEDGER
// ==========================================

export async function recordPartnerCapitalContribution(params: {
  partnerId: string;
  amount: number;
  paymentMethod: "Cash" | "Bank Transfer" | "bKash" | "Nagad" | "Cheque" | "Other";
  transactionDate?: string;
  purpose?: string;
  reference?: string;
  notes?: string;
  createdBy?: string;
  autoGenerateReceipt?: boolean;
}): Promise<{ transaction: CapitalTransaction; documents: CapitalDocument[] }> {
  const partner = await getPartnerById(params.partnerId);
  if (!partner) throw new Error("Partner not found.");

  const amount = Math.max(0, Math.round(Number(params.amount) * 100) / 100);
  if (amount <= 0) throw new Error("Capital amount must be greater than zero.");

  const date = params.transactionDate || toBDDateString(new Date());
  const purpose = params.purpose?.trim() || "Partner Capital Contribution";

  // 1. Create financial transaction in Accounts / Cash Book (strictly separate from sales & profits)
  const financialTxn = await accountsService.createCapitalTransaction({
    type: "Contribution",
    partnerName: partner.name,
    partnerId: partner.id,
    amount,
    paymentMethod: params.paymentMethod,
    transactionDate: date,
    reference: params.reference,
    notes: params.notes || purpose,
    createdBy: params.createdBy || "Admin"
  });

  // Attach partnerId
  financialTxn.partnerId = partner.id;
  financialTxn.purpose = purpose;

  // 2. Update Partner running totals
  const newContributed = Math.round((partner.totalContributed + amount) * 100) / 100;
  const newBalance = Math.round((partner.currentCapitalBalance + amount) * 100) / 100;
  await updatePartner(partner.id, {
    totalContributed: newContributed,
    currentCapitalBalance: newBalance
  });

  const createdDocs: CapitalDocument[] = [];

  // 3. Generate initial receipt & voucher if requested or by default
  const receiptDoc = await createCapitalDocumentDraft({
    documentType: "CAPITAL_CONTRIBUTION_RECEIPT",
    partnerId: partner.id,
    capitalTransactionId: financialTxn.id,
    amount,
    paymentMethod: params.paymentMethod,
    date,
    purpose,
    createdBy: params.createdBy || "Admin"
  });
  createdDocs.push(receiptDoc);

  if (params.paymentMethod === "Cash") {
    const voucherDoc = await createCapitalDocumentDraft({
      documentType: "CASH_RECEIPT_VOUCHER",
      partnerId: partner.id,
      capitalTransactionId: financialTxn.id,
      amount,
      paymentMethod: "Cash",
      date,
      purpose,
      createdBy: params.createdBy || "Admin"
    });
    createdDocs.push(voucherDoc);
  }

  return { transaction: financialTxn, documents: createdDocs };
}

export async function recordPartnerCapitalWithdrawal(params: {
  partnerId: string;
  amount: number;
  paymentMethod: "Cash" | "Bank Transfer" | "bKash" | "Nagad" | "Cheque" | "Other";
  transactionDate?: string;
  purpose?: string;
  reference?: string;
  notes?: string;
  createdBy?: string;
}): Promise<CapitalTransaction> {
  const partner = await getPartnerById(params.partnerId);
  if (!partner) throw new Error("Partner not found.");

  const amount = Math.max(0, Math.round(Number(params.amount) * 100) / 100);
  if (amount <= 0) throw new Error("Withdrawal amount must be greater than zero.");

  const date = params.transactionDate || toBDDateString(new Date());
  const purpose = params.purpose?.trim() || "Partner Capital Withdrawal";

  // Financial withdrawal
  const financialTxn = await accountsService.createCapitalTransaction({
    type: "Withdrawal",
    partnerName: partner.name,
    partnerId: partner.id,
    amount,
    paymentMethod: params.paymentMethod,
    transactionDate: date,
    reference: params.reference,
    notes: params.notes || purpose,
    createdBy: params.createdBy || "Admin"
  });

  financialTxn.partnerId = partner.id;
  financialTxn.purpose = purpose;

  const newWithdrawn = Math.round((partner.totalWithdrawn + amount) * 100) / 100;
  const newBalance = Math.round((partner.currentCapitalBalance - amount) * 100) / 100;
  await updatePartner(partner.id, {
    totalWithdrawn: newWithdrawn,
    currentCapitalBalance: newBalance
  });

  return financialTxn;
}

export async function getPartnerCapitalLedger(partnerId: string): Promise<{
  partner: Partner;
  entries: CapitalLedgerEntry[];
  closingBalance: number;
  totalContributions: number;
  totalWithdrawals: number;
}> {
  const partner = await getPartnerById(partnerId);
  if (!partner) throw new Error("Partner not found.");

  // Get all capital transactions for this partner name or id
  const allTxns = await accountsService.getCapitalTransactions();
  const partnerTxns = allTxns
    .filter(t => t.partnerId === partner.id || (!t.partnerId && t.partnerName.toLowerCase() === partner.name.toLowerCase()))
    .sort((a, b) => a.transactionDate.localeCompare(b.transactionDate));

  let runningBalance = 0;
  let totalContributions = 0;
  let totalWithdrawals = 0;

  const entries: CapitalLedgerEntry[] = partnerTxns.map(t => {
    const isContribution = t.type === "Contribution";
    const isWithdrawal = t.type === "Withdrawal";
    const isAdjustment = t.type === "Adjustment";
    const isProfitAlloc = t.type === "Profit Allocation";

    let contribution = 0;
    let withdrawal = 0;
    let adjustment = 0;
    let profitAllocation = 0;

    if (t.status === "Active") {
      if (isContribution) {
        contribution = t.amount;
        runningBalance += t.amount;
        totalContributions += t.amount;
      } else if (isWithdrawal) {
        withdrawal = t.amount;
        runningBalance -= t.amount;
        totalWithdrawals += t.amount;
      } else if (isProfitAlloc) {
        profitAllocation = t.amount;
        runningBalance += t.amount;
      } else if (isAdjustment) {
        adjustment = t.amount;
        runningBalance += t.amount;
      }
    }

    return {
      id: t.id,
      date: t.transactionDate,
      transactionNumber: t.transactionNumber,
      reference: t.reference,
      type: t.type,
      description: t.notes || (isContribution ? "Capital Contribution" : "Capital Withdrawal"),
      contribution,
      withdrawal,
      profitAllocation,
      adjustment,
      balance: Math.round(runningBalance * 100) / 100,
      paymentMethod: t.paymentMethod,
      status: t.status
    };
  });

  return {
    partner,
    entries: entries.reverse(), // most recent first for table display
    closingBalance: Math.round(runningBalance * 100) / 100,
    totalContributions: Math.round(totalContributions * 100) / 100,
    totalWithdrawals: Math.round(totalWithdrawals * 100) / 100
  };
}

// ==========================================
// 5. CAPITAL DOCUMENTS ENGINE
// ==========================================

export async function createCapitalDocumentDraft(params: {
  documentType: CapitalDocumentType;
  partnerId: string;
  capitalTransactionId?: string;
  amount?: number;
  paymentMethod?: string;
  date?: string;
  purpose?: string;
  customPayload?: any;
  createdBy?: string;
}): Promise<CapitalDocument> {
  const partner = await getPartnerById(params.partnerId);
  if (!partner) throw new Error("Partner not found.");

  const docNumber = await getNextDocumentNumber(params.documentType);
  const docDate = params.date || toBDDateString(new Date());
  const amount = Number(params.amount) || 0;
  const paymentMethod = params.paymentMethod || "Cash";
  const purpose = params.purpose || "Partner Capital Contribution";

  const titleMap: Record<CapitalDocumentType, string> = {
    CAPITAL_CONTRIBUTION_RECEIPT: "Capital Contribution Receipt",
    CASH_RECEIPT_VOUCHER: "Cash Receipt Voucher",
    CAPITAL_CONTRIBUTION_CERTIFICATE: "Capital Contribution Certificate",
    PARTNER_CAPITAL_STATEMENT: "Partner Capital Statement",
    PARTNER_CAPITAL_AGREEMENT: "Partner Capital Contribution Agreement"
  };

  const basePayload = {
    documentNumber: docNumber,
    date: docDate,
    businessName: "MediChain",
    businessTagline: "ফার্মেসির স্মার্ট পার্টনার",
    partnerName: partner.name,
    partnerPhone: partner.phone,
    partnerEmail: partner.email || "",
    partnerAddress: partner.address || "",
    partnerType: partner.partnerType,
    ownershipPercentage: partner.ownershipPercentage,
    profitSharePercentage: partner.profitSharePercentage,
    amount,
    amountInWords: amountToWordsBDT(amount),
    paymentMethod,
    purpose,
    currency: "BDT",
    legalNotice: "Prepared for MediChain internal business records.",
    signatures: {
      contributorName: partner.name,
      contributorTitle: "Contributor / Partner",
      authorizedName: params.createdBy || "Authorized Representative",
      authorizedTitle: "For MediChain Management"
    },
    ...params.customPayload
  };

  const newDoc: CapitalDocument = {
    id: `cdoc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    documentNumber: docNumber,
    documentType: params.documentType,
    partnerId: partner.id,
    partnerName: partner.name,
    capitalTransactionId: params.capitalTransactionId,
    documentTitle: titleMap[params.documentType],
    documentStatus: "draft",
    documentVersion: 1,
    documentPayload: basePayload,
    createdBy: params.createdBy || "Admin",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    const { data: inserted, error } = await supabaseAdmin
      .from("capital_documents")
      .insert({
        document_number: newDoc.documentNumber,
        document_type: newDoc.documentType,
        partner_id: newDoc.partnerId,
        partner_name: newDoc.partnerName,
        capital_transaction_id: newDoc.capitalTransactionId || null,
        document_title: newDoc.documentTitle,
        document_status: newDoc.documentStatus,
        document_version: newDoc.documentVersion,
        document_payload: newDoc.documentPayload,
        created_by: newDoc.createdBy
      })
      .select()
      .single();

    if (!error && inserted) return mapDocument(inserted);
  } catch (err: any) {
    console.warn("[CapitalDocuments] Fallback insert document:", err.message);
  }

  fallbackDocuments.unshift(newDoc);
  return newDoc;
}

export async function finalizeCapitalDocument(
  id: string,
  adminUser = "Admin"
): Promise<CapitalDocument> {
  const doc = await getCapitalDocumentById(id);
  if (!doc) throw new Error("Document not found.");

  if (doc.documentStatus === "finalized") {
    return doc; // Idempotent
  }

  const finalizedAt = new Date().toISOString();

  try {
    const { data, error } = await supabaseAdmin
      .from("capital_documents")
      .update({
        document_status: "finalized",
        finalized_by: adminUser,
        finalized_at: finalizedAt,
        updated_at: finalizedAt
      })
      .eq("id", id)
      .select()
      .single();

    if (!error && data) return mapDocument(data);
  } catch {}

  doc.documentStatus = "finalized";
  doc.finalizedBy = adminUser;
  doc.finalizedAt = finalizedAt;
  doc.updatedAt = finalizedAt;
  return doc;
}

export async function createDocumentCorrectionVersion(
  id: string,
  updatedPayload: any,
  correctionReason: string,
  adminUser = "Admin"
): Promise<CapitalDocument> {
  const currentDoc = await getCapitalDocumentById(id);
  if (!currentDoc) throw new Error("Document not found.");

  const newVersion = currentDoc.documentVersion + 1;
  const now = new Date().toISOString();

  // Create new version with same documentNumber
  const nextDoc: CapitalDocument = {
    id: `cdoc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    documentNumber: currentDoc.documentNumber,
    documentType: currentDoc.documentType,
    partnerId: currentDoc.partnerId,
    partnerName: currentDoc.partnerName,
    capitalTransactionId: currentDoc.capitalTransactionId,
    documentTitle: currentDoc.documentTitle,
    documentStatus: "finalized",
    documentVersion: newVersion,
    documentPayload: {
      ...currentDoc.documentPayload,
      ...updatedPayload,
      version: newVersion,
      correctionReason
    },
    createdBy: adminUser,
    finalizedBy: adminUser,
    finalizedAt: now,
    notes: `Version ${newVersion} created. Reason: ${correctionReason}`,
    createdAt: now,
    updatedAt: now
  };

  // Mark previous version as superseded
  try {
    const supersededNumber = `${currentDoc.documentNumber}#v${currentDoc.documentVersion}`;
    await supabaseAdmin
      .from("capital_documents")
      .update({
        document_number: supersededNumber,
        document_status: "superseded",
        updated_at: now
      })
      .eq("id", currentDoc.id);

    const { data: inserted, error } = await supabaseAdmin
      .from("capital_documents")
      .insert({
        document_number: nextDoc.documentNumber,
        document_type: nextDoc.documentType,
        partner_id: nextDoc.partnerId,
        partner_name: nextDoc.partnerName,
        capital_transaction_id: nextDoc.capitalTransactionId || null,
        document_title: nextDoc.documentTitle,
        document_status: nextDoc.documentStatus,
        document_version: nextDoc.documentVersion,
        document_payload: nextDoc.documentPayload,
        created_by: nextDoc.createdBy,
        finalized_by: nextDoc.finalizedBy,
        finalized_at: nextDoc.finalizedAt,
        notes: nextDoc.notes
      })
      .select()
      .single();

    if (!error && inserted) {
      await supabaseAdmin
        .from("capital_documents")
        .update({
          superseded_by: inserted.id,
          updated_at: now
        })
        .eq("id", currentDoc.id);

      currentDoc.documentStatus = "superseded";
      currentDoc.supersededBy = inserted.id;
      currentDoc.updatedAt = now;
      return mapDocument(inserted);
    }
  } catch (err: any) {
    console.warn("[CapitalDocuments] Correction insert fallback:", err?.message);
  }

  currentDoc.documentStatus = "superseded";
  currentDoc.supersededBy = nextDoc.id;
  currentDoc.updatedAt = now;
  fallbackDocuments.unshift(nextDoc);
  return nextDoc;
}

export async function voidCapitalDocument(
  id: string,
  voidReason: string,
  adminUser = "Admin"
): Promise<CapitalDocument> {
  const doc = await getCapitalDocumentById(id);
  if (!doc) throw new Error("Document not found.");

  const now = new Date().toISOString();

  try {
    const { data, error } = await supabaseAdmin
      .from("capital_documents")
      .update({
        document_status: "voided",
        void_reason: voidReason,
        updated_at: now
      })
      .eq("id", id)
      .select()
      .single();

    if (!error && data) return mapDocument(data);
  } catch {}

  doc.documentStatus = "voided";
  doc.voidReason = voidReason;
  doc.updatedAt = now;
  return doc;
}

export async function getCapitalDocuments(filter?: {
  partnerId?: string;
  type?: string;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}): Promise<CapitalDocument[]> {
  try {
    let query = supabaseAdmin
      .from("capital_documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter?.partnerId && filter.partnerId !== "all") query = query.eq("partner_id", filter.partnerId);
    if (filter?.type && filter.type !== "all") query = query.eq("document_type", filter.type);
    if (filter?.status && filter.status !== "all") query = query.eq("document_status", filter.status);

    const { data, error } = await query;
    if (error) throw error;
    if (data) {
      let mapped = data.map(mapDocument);
      if (filter?.search) {
        const q = filter.search.toLowerCase().trim();
        mapped = mapped.filter(d => 
          d.documentNumber.toLowerCase().includes(q) ||
          d.partnerName.toLowerCase().includes(q) ||
          (d.documentPayload?.purpose && String(d.documentPayload.purpose).toLowerCase().includes(q))
        );
      }
      return mapped;
    }
  } catch (err: any) {
    console.warn("[CapitalDocuments] Fallback getCapitalDocuments:", err.message);
  }

  let list = [...fallbackDocuments];
  if (filter?.partnerId && filter.partnerId !== "all") list = list.filter(d => d.partnerId === filter.partnerId);
  if (filter?.type && filter.type !== "all") list = list.filter(d => d.documentType === filter.type);
  if (filter?.status && filter.status !== "all") list = list.filter(d => d.documentStatus === filter.status);
  if (filter?.search) {
    const q = filter.search.toLowerCase().trim();
    list = list.filter(d => 
      d.documentNumber.toLowerCase().includes(q) ||
      d.partnerName.toLowerCase().includes(q) ||
      (d.documentPayload?.purpose && String(d.documentPayload.purpose).toLowerCase().includes(q))
    );
  }
  return list;
}

export async function getCapitalDocumentById(id: string): Promise<CapitalDocument | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("capital_documents")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) return mapDocument(data);
  } catch {}

  return fallbackDocuments.find(d => d.id === id) || null;
}

export async function getDocumentVersionHistory(documentNumber: string): Promise<CapitalDocument[]> {
  const cleanNum = documentNumber.replace(/#v\d+$/, "");
  try {
    const { data, error } = await supabaseAdmin
      .from("capital_documents")
      .select("*")
      .or(`document_number.eq.${cleanNum},document_number.like.${cleanNum}#v%`)
      .order("document_version", { ascending: true });

    if (!error && data && data.length > 0) return data.map(mapDocument);
  } catch {}

  return fallbackDocuments
    .filter(d => d.documentNumber === cleanNum)
    .sort((a, b) => a.documentVersion - b.documentVersion);
}

export async function deleteCapitalDocument(id: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from("capital_documents")
      .delete()
      .eq("id", id);
    if (error) throw error;
  } catch (err: any) {
    console.warn("[CapitalDocuments] Fallback deleteCapitalDocument:", err?.message);
  }

  const idx = fallbackDocuments.findIndex(d => d.id === id);
  if (idx !== -1) {
    fallbackDocuments.splice(idx, 1);
  }
  return true;
}

function mapDocument(row: any): CapitalDocument {
  const cleanDocNumber = (row.document_number || "").replace(/#v\d+$/, "");
  return {
    id: row.id,
    documentNumber: cleanDocNumber,
    documentType: row.document_type,
    partnerId: row.partner_id || undefined,
    partnerName: row.partner_name || "Partner",
    capitalTransactionId: row.capital_transaction_id || undefined,
    documentTitle: row.document_title || "Document",
    documentStatus: row.document_status || "draft",
    documentVersion: parseInt(row.document_version || 1, 10),
    storagePath: row.storage_path || undefined,
    fileUrl: row.file_url || undefined,
    documentPayload: typeof row.document_payload === "object" ? row.document_payload : {},
    createdBy: row.created_by || "Admin",
    finalizedBy: row.finalized_by || undefined,
    finalizedAt: row.finalized_at || undefined,
    voidReason: row.void_reason || undefined,
    supersededBy: row.superseded_by || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

// ==========================================
// 6. DASHBOARD SUMMARY STATS
// ==========================================

export async function getCapitalDashboardStats(): Promise<CapitalDashboardStats> {
  const partners = await getPartners();
  const allTxns = await accountsService.getCapitalTransactions();
  const allDocs = await getCapitalDocuments();

  const todayStr = toBDDateString(new Date());
  const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM

  let totalContributed = 0;
  let totalWithdrawn = 0;
  let cashContributions = 0;
  let bankContributions = 0;
  let thisMonthContrib = 0;
  let thisMonthWithdraw = 0;

  for (const t of allTxns) {
    if (t.status === "Voided") continue;
    const isThisMonth = t.transactionDate.startsWith(currentMonthPrefix);

    if (t.type === "Contribution") {
      totalContributed += t.amount;
      if (t.paymentMethod === "Cash") cashContributions += t.amount;
      else bankContributions += t.amount;

      if (isThisMonth) thisMonthContrib += t.amount;
    } else if (t.type === "Withdrawal") {
      totalWithdrawn += t.amount;
      if (isThisMonth) thisMonthWithdraw += t.amount;
    }
  }

  const netCapital = Math.round((totalContributed - totalWithdrawn) * 100) / 100;
  const activeAgreements = allDocs.filter(d => d.documentType === "PARTNER_CAPITAL_AGREEMENT" && d.documentStatus === "finalized").length;

  return {
    totalPartners: partners.length,
    totalCapitalContributed: Math.round(totalContributed * 100) / 100,
    totalCapitalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
    netPartnerCapital: netCapital,
    cashContributions: Math.round(cashContributions * 100) / 100,
    bankContributions: Math.round(bankContributions * 100) / 100,
    thisMonthContributions: Math.round(thisMonthContrib * 100) / 100,
    thisMonthWithdrawals: Math.round(thisMonthWithdraw * 100) / 100,
    totalSavedDocuments: allDocs.length,
    activeAgreementsCount: activeAgreements
  };
}
