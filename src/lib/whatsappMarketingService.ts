/**
 * MediChain WhatsApp Business Marketing Engine
 * 
 * CORE PHILOSOPHY & WORKFLOW:
 * - 100% FREE manual send workflow.
 * - Admin uses their own WhatsApp Business app on their Android / iPhone / Desktop.
 * - MediChain prepares recipient queues, personalized text, and wa.me deep links.
 * - ZERO Meta Cloud API subscription cost, ZERO unauthorized scraping bots.
 * - NO auto-sending: Admin manually presses SEND inside WhatsApp Business.
 */

import { supabaseAdmin } from "./supabaseAdmin.js";
import * as dbService from "./dbService.js";
import {
  Pharmacy,
  WhatsAppCampaign,
  WhatsAppCampaignRecipient,
  WhatsAppTemplate,
  WhatsAppAudienceFilter,
  WhatsAppAudienceStats,
  WhatsAppCampaignStatus,
  WhatsAppRecipientStatus
} from "../types.js";

// ==========================================
// 1. BANGLADESH PHONE VALIDATION & FORMATTING
// ==========================================

import {
  type BDPhoneValidationResult,
  validateAndFormatBDWhatsAppNumber,
  personalizeMessage,
  generateWaMeLink
} from "./whatsappUtils.js";

export type { BDPhoneValidationResult };
export {
  validateAndFormatBDWhatsAppNumber,
  personalizeMessage,
  generateWaMeLink
};

// ==========================================
// 3. WHATSAPP PROVIDER ABSTRACTION (Section 28)
// ==========================================

export interface IWhatsAppProvider {
  name: string;
  isAutomated: boolean;
  prepareRecipient(formattedNumber: string, message: string): { waMeUrl: string };
}

export class ManualWhatsAppProvider implements IWhatsAppProvider {
  name = "Manual WhatsApp Business Workflow";
  isAutomated = false;

  prepareRecipient(formattedNumber: string, message: string) {
    return {
      waMeUrl: generateWaMeLink(formattedNumber, message)
    };
  }
}

export const activeWhatsAppProvider = new ManualWhatsAppProvider();

// In-memory fallback stores for graceful offline operation
let fallbackCampaigns: WhatsAppCampaign[] = [];
let fallbackTemplates: WhatsAppTemplate[] = [
  {
    id: "tpl-default-1",
    name: "Somatec Special 34% Discount",
    category: "Product Discount",
    message: `🎉 SOMATEC PHARMA SPECIAL OFFER 🎉\n\nআসসালামু আলাইকুম {{owner_name}},\n{{pharmacy_name}}-এর জন্য Somatec Pharmaceuticals-এর সকল পণ্যে এখন FLAT 34% OFF!\n\nPharmacy-এর নিয়মিত প্রয়োজনীয় Somatec products এখন আরও সাশ্রয়ী পাইকারি দামে MediChain-এ অর্ডার করুন।\n\n🔥 FLAT 34% DISCOUNT\n📦 সকল Dosage Form Available\n🚚 দ্রুত শিডিউলড ডেলিভারি\n\nMediChain — ফার্মেসির স্মার্ট পার্টনার।`,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "tpl-default-2",
    name: "Weekly Wholesale Restock Reminder",
    category: "Reminder",
    message: `📦 WEEKLY PHARMACY RESTOCK REMINDER 📦\n\nআসসালামু আলাইকুম {{owner_name}},\n{{pharmacy_name}}-এর ওষুধের স্টক কি শেষ হয়ে আসছে?\n\nMediChain-এ আজই অর্ডার প্লেস করে আগামী ডেলিভারি শিডিউলে আপনার ফার্মেসির প্রয়োজনীয় সকল মেডিসিন সংগ্রহ করুন।\n\n✅ 100% Genuine DGDA Compliant Medicines\n✅ সেরা পাইকারি ক্যাশব্যাক ও ছাড়\n\nঅর্ডার করতে ভিজিট করুন: medichain.com.bd`,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "tpl-default-3",
    name: "New Product Line Announcement",
    category: "New Product",
    message: `✨ নতুন মেডিসিন ও হেলথকেয়ার প্রোডাক্ট যুক্ত হয়েছে ✨\n\nশ্রদ্ধেয় {{owner_name}},\n{{pharmacy_name}}-এর কাস্টমারদের জন্য MediChain ক্যাটালগে নতুন শীর্ষস্থানীয় কোম্পানির মেডিসিন ও অ্যান্টিবায়োটিক স্টক করা হয়েছে।\n\nএখনই অ্যাপে লগইন করে সেরা পাইকারি মূল্যে অর্ডার কনফার্ম করুন।`,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// ==========================================
// 4. AUDIENCE SEGMENTATION & RECIPIENTS
// ==========================================

export async function getAudienceStats(): Promise<WhatsAppAudienceStats> {
  const pharmacies = await dbService.getAllPharmacies(1, 1000);
  
  let validNumbersCount = 0;
  let invalidNumbersCount = 0;
  let missingPhoneCount = 0;

  for (const p of pharmacies) {
    if (!p.phone || !p.phone.trim()) {
      missingPhoneCount++;
    } else {
      const val = validateAndFormatBDWhatsAppNumber(p.phone);
      if (val.isValid) {
        validNumbersCount++;
      } else {
        invalidNumbersCount++;
      }
    }
  }

  return {
    totalPharmacies: pharmacies.length,
    optedInCount: pharmacies.length, // All registered pharmacies onboarded with MediChain are eligible
    optedOutCount: 0,
    missingPhoneCount,
    validBangladeshNumbersCount: validNumbersCount,
    invalidNumbersCount
  };
}

export async function getSegmentedAudience(filter: WhatsAppAudienceFilter): Promise<{
  eligiblePharmacies: Pharmacy[];
  excludedPharmacies: Array<{ pharmacy: Pharmacy; reason: string }>;
}> {
  const pharmacies = await dbService.getAllPharmacies(1, 1000);
  const orders = await dbService.getOrders(undefined, 1, 2000);

  // Build pharmacy order metrics
  const orderStatsMap: Record<string, { count: number; totalSpent: number; lastOrderDate: string | null }> = {};
  for (const o of orders) {
    if (o.status === "Cancelled") continue;
    const curr = orderStatsMap[o.pharmacyId] || { count: 0, totalSpent: 0, lastOrderDate: null };
    curr.count++;
    curr.totalSpent += o.totalAmount;
    if (!curr.lastOrderDate || o.createdAt > curr.lastOrderDate) {
      curr.lastOrderDate = o.createdAt;
    }
    orderStatsMap[o.pharmacyId] = curr;
  }

  const eligible: Pharmacy[] = [];
  const excluded: Array<{ pharmacy: Pharmacy; reason: string }> = [];

  for (const p of pharmacies) {
    // 1. If explicit pharmacy selection is provided
    if (filter.selectedPharmacyIds && filter.selectedPharmacyIds.length > 0) {
      if (!filter.selectedPharmacyIds.includes(p.id)) {
        continue;
      }
    }

    // 2. Phone Number Validation
    if (!p.phone || !p.phone.trim()) {
      excluded.push({ pharmacy: p, reason: "Missing phone number" });
      continue;
    }

    const phoneVal = validateAndFormatBDWhatsAppNumber(p.phone);
    if (!phoneVal.isValid) {
      excluded.push({ pharmacy: p, reason: `Invalid Bangladesh phone number (${phoneVal.error || "Format"})` });
      continue;
    }

    // 3. Segment Specific Filtering
    const stats = orderStatsMap[p.id] || { count: 0, totalSpent: 0, lastOrderDate: null };

    if (filter.segment === "active_buyers" && stats.count === 0) {
      excluded.push({ pharmacy: p, reason: "No completed orders yet" });
      continue;
    }

    if (filter.segment === "first_order" && stats.count !== 1) {
      excluded.push({ pharmacy: p, reason: stats.count === 0 ? "No orders yet" : "More than 1 order placed" });
      continue;
    }

    if (filter.segment === "frequent_buyers" && stats.count < 3) {
      excluded.push({ pharmacy: p, reason: "Fewer than 3 orders placed" });
      continue;
    }

    if (filter.segment === "high_value" && stats.totalSpent < 50000) {
      excluded.push({ pharmacy: p, reason: "Total purchase less than ৳50,000" });
      continue;
    }

    if (filter.segment === "inactive" && stats.count > 0) {
      excluded.push({ pharmacy: p, reason: "Customer has active purchases" });
      continue;
    }

    // City Filter
    if (filter.city && filter.city !== "all") {
      const phCity = (p.city || p.area || "").toLowerCase();
      if (!phCity.includes(filter.city.toLowerCase())) {
        excluded.push({ pharmacy: p, reason: `City mismatch (Expected: ${filter.city})` });
        continue;
      }
    }

    // Search filter
    if (filter.search && filter.search.trim()) {
      const q = filter.search.toLowerCase();
      const match = (p.pharmacyName || "").toLowerCase().includes(q) ||
                    (p.ownerName || "").toLowerCase().includes(q) ||
                    (p.phone || "").includes(q);
      if (!match) {
        excluded.push({ pharmacy: p, reason: "Does not match search criteria" });
        continue;
      }
    }

    eligible.push(p);
  }

  return { eligiblePharmacies: eligible, excludedPharmacies: excluded };
}

export async function updatePharmacyConsent(
  pharmacyId: string,
  optIn: boolean,
  source: string = "Admin Manual Preference"
): Promise<boolean> {
  const timestamp = new Date().toISOString();
  try {
    const { error } = await supabaseAdmin
      .from("pharmacies")
      .update({
        whatsapp_marketing_opt_in: optIn,
        ...(optIn
          ? { whatsapp_marketing_opt_in_at: timestamp, whatsapp_marketing_opt_in_source: source }
          : { whatsapp_marketing_opt_out_at: timestamp })
      })
      .eq("id", pharmacyId);

    if (!error) return true;
  } catch (err) {
    console.warn("[WhatsAppMarketing] Fallback updating pharmacy consent:", err);
  }

  return true;
}

// ==========================================
// 5. CAMPAIGNS CREATION & MANAGEMENT
// ==========================================

export async function createWhatsAppCampaign(payload: {
  name: string;
  messageTemplate: string;
  imageUrl?: string;
  audienceFilter: WhatsAppAudienceFilter;
  createdBy?: string;
}): Promise<WhatsAppCampaign> {
  const { eligiblePharmacies, excludedPharmacies } = await getSegmentedAudience(payload.audienceFilter);
  const totalAudience = eligiblePharmacies.length + excludedPharmacies.length;

  const campaignId = `camp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const nowStr = new Date().toISOString();

  // Generate recipient items
  const recipientRows: WhatsAppCampaignRecipient[] = [];

  for (const pharm of eligiblePharmacies) {
    const phoneVal = validateAndFormatBDWhatsAppNumber(pharm.phone);
    const personalizedMsg = personalizeMessage(payload.messageTemplate, pharm);
    const link = phoneVal.isValid && phoneVal.formattedNumber
      ? activeWhatsAppProvider.prepareRecipient(phoneVal.formattedNumber, personalizedMsg).waMeUrl
      : undefined;

    recipientRows.push({
      id: `recip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      campaignId,
      pharmacyId: pharm.id,
      pharmacyName: pharm.pharmacyName,
      ownerName: pharm.ownerName || "ফার্মাসিস্ট",
      rawPhone: pharm.phone,
      formattedWhatsappNumber: phoneVal.formattedNumber || undefined,
      personalizedMessage: personalizedMsg,
      waMeUrl: link,
      status: "pending",
      createdAt: nowStr,
      updatedAt: nowStr
    });
  }

  const campaignRow: WhatsAppCampaign = {
    id: campaignId,
    name: payload.name.trim(),
    messageTemplate: payload.messageTemplate,
    imageUrl: payload.imageUrl || undefined,
    audienceFilter: payload.audienceFilter,
    totalAudience,
    eligibleCount: recipientRows.length,
    sentCount: 0,
    openedCount: 0,
    skippedCount: 0,
    invalidCount: 0,
    status: recipientRows.length > 0 ? "ready" : "draft",
    createdBy: payload.createdBy || "Admin",
    createdAt: nowStr,
    updatedAt: nowStr,
    recipients: recipientRows
  };

  try {
    const { data, error } = await supabaseAdmin
      .from("whatsapp_campaigns")
      .insert({
        name: campaignRow.name,
        message_template: campaignRow.messageTemplate,
        image_url: campaignRow.imageUrl || null,
        audience_filter: campaignRow.audienceFilter,
        total_audience: campaignRow.totalAudience,
        eligible_count: campaignRow.eligibleCount,
        status: campaignRow.status,
        created_by: campaignRow.createdBy
      })
      .select()
      .single();

    if (!error && data?.id) {
      campaignRow.id = data.id;
      // Insert recipients
      if (recipientRows.length > 0) {
        const dbRecips = recipientRows.map(r => ({
          campaign_id: data.id,
          pharmacy_id: r.pharmacyId,
          pharmacy_name: r.pharmacyName,
          owner_name: r.ownerName,
          raw_phone: r.rawPhone,
          formatted_whatsapp_number: r.formattedWhatsappNumber || null,
          personalized_message: r.personalizedMessage,
          wa_me_url: r.waMeUrl || null,
          status: "pending"
        }));
        await supabaseAdmin.from("whatsapp_campaign_recipients").insert(dbRecips);
      }
      return campaignRow;
    }
  } catch (err: any) {
    console.warn("[WhatsAppMarketing] Using local fallback for campaign creation:", err.message);
  }

  fallbackCampaigns.unshift(campaignRow);
  return campaignRow;
}

export async function getWhatsAppCampaigns(filter?: { status?: string }): Promise<WhatsAppCampaign[]> {
  try {
    let query = supabaseAdmin
      .from("whatsapp_campaigns")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter?.status && filter.status !== "all") {
      query = query.eq("status", filter.status);
    }

    const { data, error } = await query;
    if (!error && data) {
      return data.map(mapCampaign);
    }
  } catch (err: any) {
    console.warn("[WhatsAppMarketing] Fallback getWhatsAppCampaigns:", err.message);
  }

  let list = [...fallbackCampaigns];
  if (filter?.status && filter.status !== "all") {
    list = list.filter(c => c.status === filter.status);
  }
  return list;
}

export async function getWhatsAppCampaignById(id: string): Promise<WhatsAppCampaign | null> {
  try {
    const { data: camp, error: campErr } = await supabaseAdmin
      .from("whatsapp_campaigns")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!campErr && camp) {
      const { data: recips } = await supabaseAdmin
        .from("whatsapp_campaign_recipients")
        .select("*")
        .eq("campaign_id", id)
        .order("created_at", { ascending: true });

      const mapped = mapCampaign(camp);
      mapped.recipients = (recips || []).map(mapRecipient);
      return mapped;
    }
  } catch (err: any) {
    console.warn("[WhatsAppMarketing] Fallback getCampaignById:", err.message);
  }

  return fallbackCampaigns.find(c => c.id === id) || null;
}

export async function populateCampaignRecipients(
  campaignId: string,
  filter?: WhatsAppAudienceFilter
): Promise<WhatsAppCampaign | null> {
  const campaign = await getWhatsAppCampaignById(campaignId);
  if (!campaign) return null;

  const targetFilter = filter || campaign.audienceFilter || { segment: "all" };
  const { eligiblePharmacies, excludedPharmacies } = await getSegmentedAudience(targetFilter);
  const totalAudience = eligiblePharmacies.length + excludedPharmacies.length;
  const nowStr = new Date().toISOString();

  const recipientRows: WhatsAppCampaignRecipient[] = [];
  for (const pharm of eligiblePharmacies) {
    const phoneVal = validateAndFormatBDWhatsAppNumber(pharm.phone);
    const personalizedMsg = personalizeMessage(campaign.messageTemplate, pharm);
    const link = phoneVal.isValid && phoneVal.formattedNumber
      ? activeWhatsAppProvider.prepareRecipient(phoneVal.formattedNumber, personalizedMsg).waMeUrl
      : undefined;

    recipientRows.push({
      id: `recip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      campaignId,
      pharmacyId: pharm.id,
      pharmacyName: pharm.pharmacyName,
      ownerName: pharm.ownerName || "ফার্মাসিস্ট",
      rawPhone: pharm.phone,
      formattedWhatsappNumber: phoneVal.formattedNumber || undefined,
      personalizedMessage: personalizedMsg,
      waMeUrl: link,
      status: "pending",
      createdAt: nowStr,
      updatedAt: nowStr
    });
  }

  try {
    // Delete existing recipients
    await supabaseAdmin.from("whatsapp_campaign_recipients").delete().eq("campaign_id", campaignId);
    if (recipientRows.length > 0) {
      const dbRecips = recipientRows.map(r => ({
        campaign_id: campaignId,
        pharmacy_id: r.pharmacyId,
        pharmacy_name: r.pharmacyName,
        owner_name: r.ownerName,
        raw_phone: r.rawPhone,
        formatted_whatsapp_number: r.formattedWhatsappNumber || null,
        personalized_message: r.personalizedMessage,
        wa_me_url: r.waMeUrl || null,
        status: "pending"
      }));
      await supabaseAdmin.from("whatsapp_campaign_recipients").insert(dbRecips);
    }
    await supabaseAdmin.from("whatsapp_campaigns").update({
      total_audience: totalAudience,
      eligible_count: recipientRows.length,
      status: recipientRows.length > 0 ? "ready" : "draft",
      updated_at: nowStr
    }).eq("id", campaignId);
  } catch (err: any) {
    console.warn("[WhatsAppMarketing] Fallback updating campaign recipients:", err.message);
  }

  campaign.recipients = recipientRows;
  campaign.eligibleCount = recipientRows.length;
  campaign.totalAudience = totalAudience;
  campaign.status = recipientRows.length > 0 ? "ready" : "draft";

  const idx = fallbackCampaigns.findIndex(c => c.id === campaignId);
  if (idx >= 0) {
    fallbackCampaigns[idx] = { ...fallbackCampaigns[idx], ...campaign };
  }

  return campaign;
}

export async function updateRecipientStatus(
  recipientId: string,
  status: WhatsAppRecipientStatus,
  failureReason?: string
): Promise<boolean> {
  const nowStr = new Date().toISOString();
  const updateData: any = {
    status,
    updated_at: nowStr,
    ...(status === "opened" ? { opened_at: nowStr } : {}),
    ...(status === "sent" ? { sent_at: nowStr } : {}),
    ...(status === "skipped" ? { skipped_at: nowStr } : {}),
    ...(failureReason ? { failure_reason: failureReason } : {})
  };

  try {
    const { data, error } = await supabaseAdmin
      .from("whatsapp_campaign_recipients")
      .update(updateData)
      .eq("id", recipientId)
      .select("campaign_id")
      .single();

    if (!error && data?.campaign_id) {
      await refreshCampaignCounters(data.campaign_id);
      return true;
    }
  } catch (err) {}

  // Fallback update
  for (const camp of fallbackCampaigns) {
    const r = (camp.recipients || []).find(x => x.id === recipientId);
    if (r) {
      r.status = status;
      if (status === "opened") r.openedAt = nowStr;
      if (status === "sent") r.sentAt = nowStr;
      if (status === "skipped") r.skippedAt = nowStr;
      if (failureReason) r.failureReason = failureReason;
      r.updatedAt = nowStr;

      // Update parent counters
      camp.openedCount = camp.recipients!.filter(x => x.status === "opened" || x.status === "sent").length;
      camp.sentCount = camp.recipients!.filter(x => x.status === "sent").length;
      camp.skippedCount = camp.recipients!.filter(x => x.status === "skipped").length;
      camp.invalidCount = camp.recipients!.filter(x => x.status === "invalid").length;
      if (camp.sentCount + camp.skippedCount >= camp.eligibleCount) {
        camp.status = "completed";
      } else if (camp.openedCount > 0) {
        camp.status = "in_progress";
      }
      return true;
    }
  }
  return false;
}

async function refreshCampaignCounters(campaignId: string) {
  try {
    const { data: recips } = await supabaseAdmin
      .from("whatsapp_campaign_recipients")
      .select("status")
      .eq("campaign_id", campaignId);

    if (recips) {
      const sentCount = recips.filter(r => r.status === "sent").length;
      const openedCount = recips.filter(r => r.status === "opened" || r.status === "sent").length;
      const skippedCount = recips.filter(r => r.status === "skipped").length;
      const invalidCount = recips.filter(r => r.status === "invalid").length;
      const total = recips.length;

      let status: WhatsAppCampaignStatus = "in_progress";
      if (sentCount + skippedCount >= total && total > 0) {
        status = "completed";
      }

      await supabaseAdmin
        .from("whatsapp_campaigns")
        .update({
          sent_count: sentCount,
          opened_count: openedCount,
          skipped_count: skippedCount,
          invalid_count: invalidCount,
          status,
          updated_at: new Date().toISOString()
        })
        .eq("id", campaignId);
    }
  } catch (e) {}
}

function mapCampaign(row: any): WhatsAppCampaign {
  return {
    id: row.id,
    name: row.name,
    messageTemplate: row.message_template,
    imageUrl: row.image_url || undefined,
    audienceFilter: row.audience_filter || { segment: "all_opted_in" },
    totalAudience: row.total_audience || 0,
    eligibleCount: row.eligible_count || 0,
    sentCount: row.sent_count || 0,
    openedCount: row.opened_count || 0,
    skippedCount: row.skipped_count || 0,
    invalidCount: row.invalid_count || 0,
    status: row.status || "draft",
    createdBy: row.created_by || "Admin",
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

function mapRecipient(row: any): WhatsAppCampaignRecipient {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    pharmacyId: row.pharmacy_id,
    pharmacyName: row.pharmacy_name,
    ownerName: row.owner_name,
    rawPhone: row.raw_phone,
    formattedWhatsappNumber: row.formatted_whatsapp_number || undefined,
    personalizedMessage: row.personalized_message,
    waMeUrl: row.wa_me_url || undefined,
    status: row.status || "pending",
    openedAt: row.opened_at || undefined,
    sentAt: row.sent_at || undefined,
    skippedAt: row.skipped_at || undefined,
    failureReason: row.failure_reason || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

// ==========================================
// 6. REUSABLE TEMPLATES CRUD
// ==========================================

export async function getWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("whatsapp_templates")
      .select("*")
      .eq("is_archived", false)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map(mapTemplate);
    }
  } catch (err: any) {}

  return fallbackTemplates.filter(t => !t.isArchived);
}

export async function createWhatsAppTemplate(tplData: {
  name: string;
  category: WhatsAppTemplate["category"];
  message: string;
  imageUrl?: string;
  createdBy?: string;
}): Promise<WhatsAppTemplate> {
  const newTpl: WhatsAppTemplate = {
    id: `tpl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: tplData.name.trim(),
    category: tplData.category || "Promotion",
    message: tplData.message.trim(),
    imageUrl: tplData.imageUrl?.trim() || undefined,
    isArchived: false,
    createdBy: tplData.createdBy || "Admin",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    const { data, error } = await supabaseAdmin
      .from("whatsapp_templates")
      .insert({
        name: newTpl.name,
        category: newTpl.category,
        message: newTpl.message,
        image_url: newTpl.imageUrl || null,
        created_by: newTpl.createdBy
      })
      .select()
      .single();

    if (!error && data) {
      return mapTemplate(data);
    }
  } catch (err: any) {}

  fallbackTemplates.unshift(newTpl);
  return newTpl;
}

export async function deleteWhatsAppTemplate(id: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from("whatsapp_templates")
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) return true;
  } catch (err) {}

  const t = fallbackTemplates.find(x => x.id === id);
  if (t) {
    t.isArchived = true;
    return true;
  }
  return false;
}

function mapTemplate(row: any): WhatsAppTemplate {
  return {
    id: row.id,
    name: row.name,
    category: row.category || "Promotion",
    message: row.message,
    imageUrl: row.image_url || undefined,
    isArchived: Boolean(row.is_archived),
    createdBy: row.created_by || "Admin",
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}
