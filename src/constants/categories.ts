/**
 * MediChain Pharmaceutical Categories & Dosage Forms System
 * DGDA (Directorate General of Drug Administration, Bangladesh) & WHO standard pharmaceutical classifications
 */

export interface CategoryItem {
  value: string;
  label: string;
  labelBn: string;
}

export interface CategoryGroup {
  groupName: string;
  groupNameBn: string;
  items: CategoryItem[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    groupName: "Oral Solid Dosage Forms",
    groupNameBn: "মুখে খাওয়ার কঠিন ওষুধ",
    items: [
      { value: "Tablet", label: "Tablet", labelBn: "ট্যাবলেট" },
      { value: "Capsule", label: "Capsule", labelBn: "ক্যাপসুল" },
      { value: "Chewable Tablet", label: "Chewable Tablet", labelBn: "চিবিয়ে খাওয়ার ট্যাবলেট" },
      { value: "Effervescent Tablet", label: "Effervescent Tablet", labelBn: "পানিতে দ্রবণীয় ট্যাবলেট" },
      { value: "Powder", label: "Powder", labelBn: "পাউডার" },
      { value: "Sachet", label: "Sachet / ORS", labelBn: "স্যাচেট / ওরস্যালাইন" },
    ],
  },
  {
    groupName: "Oral Liquid Dosage Forms",
    groupNameBn: "মুখে খাওয়ার তরল ওষুধ",
    items: [
      { value: "Syrup", label: "Syrup", labelBn: "সিরাপ" },
      { value: "Suspension", label: "Suspension", labelBn: "সাসপেনশন" },
      { value: "Oral Solution", label: "Oral Solution", labelBn: "ওরাল সলিউশন" },
      { value: "Oral Drops", label: "Oral Drops / Paediatric Drops", labelBn: "ড্রপস / পেডিয়াট্রিক ড্রপস" },
      { value: "Oral Saline", label: "Oral Saline", labelBn: "খাবার স্যালাইন" },
    ],
  },
  {
    groupName: "Injectables & Infusions",
    groupNameBn: "ইনজেকশন ও স্যালাইন",
    items: [
      { value: "Injection", label: "Injection", labelBn: "ইনজেকশন" },
      { value: "Infusion", label: "Infusion / IV Drip (Saline)", labelBn: "আইভি স্যালাইন / ইনফিউশন" },
      { value: "Insulin", label: "Insulin", labelBn: "ইনসুলিন" },
      { value: "Vaccine", label: "Vaccine", labelBn: "ভ্যাকসিন / টিকা" },
    ],
  },
  {
    groupName: "Respiratory & Inhalation",
    groupNameBn: "শ্বাসকষ্ট ও ইনহেলার",
    items: [
      { value: "Inhaler", label: "Inhaler / Aerosol", labelBn: "ইনহেলার / অ্যারোসল" },
      { value: "Rotacaps", label: "Rotacaps / Rotahaler", labelBn: "রোটাক্যাপস" },
      { value: "Nebulizer Solution", label: "Nebulizer Solution", labelBn: "নেবুলাইজার সলিউশন" },
      { value: "Nasal Spray", label: "Nasal Spray", labelBn: "নাসাল স্প্রে" },
      { value: "Nasal Drops", label: "Nasal Drops", labelBn: "নাসাল ড্রপস" },
    ],
  },
  {
    groupName: "Topical & Dermatological",
    groupNameBn: "মলম ও ত্বকের ওষুধ",
    items: [
      { value: "Cream", label: "Cream", labelBn: "ক্রিম" },
      { value: "Ointment", label: "Ointment", labelBn: "অয়েন্টমেন্ট / মলম" },
      { value: "Gel", label: "Gel", labelBn: "জেল" },
      { value: "Lotion", label: "Lotion", labelBn: "লোশন" },
      { value: "Scalp Solution", label: "Scalp Solution / Medicated Shampoo", labelBn: "স্ক্যাল্প লোশন / শ্যাম্পু" },
      { value: "Topical Spray", label: "Topical Spray", labelBn: "বাহ্যিক স্প্রে" },
    ],
  },
  {
    groupName: "Ophthalmic & Otic (Eye & Ear)",
    groupNameBn: "চোখ ও কানের ওষুধ",
    items: [
      { value: "Eye Drops", label: "Eye Drops", labelBn: "চোখের ড্রপ" },
      { value: "Eye Ointment", label: "Eye Ointment", labelBn: "চোখের মলম" },
      { value: "Ear Drops", label: "Ear Drops", labelBn: "কানের ড্রপ" },
    ],
  },
  {
    groupName: "Suppository & Rectal",
    groupNameBn: "সাপোজিটরি ও অন্যান্য",
    items: [
      { value: "Suppository", label: "Suppository", labelBn: "সাপোজিটরি" },
      { value: "Pessary", label: "Pessary / Vaginal Tablet", labelBn: "পেসারি / ভ্যাজাইনাল ট্যাবলেট" },
      { value: "Enema", label: "Enema", labelBn: "এনিমা" },
      { value: "Patch", label: "Transdermal Patch", labelBn: "মেডিকেটেড প্যাচ" },
    ],
  },
  {
    groupName: "Supplements, Vitamins & Nutrition",
    groupNameBn: "সাপ্লিমেন্ট ও ভিটামিন",
    items: [
      { value: "Supplement", label: "Supplement", labelBn: "সাপ্লিমেন্ট" },
      { value: "Vitamins", label: "Vitamins & Minerals", labelBn: "ভিটামিন ও মিনারেল" },
      { value: "Herbal", label: "Herbal / Ayurvedic", labelBn: "ভেষজ ও আয়ুর্বেদিক" },
      { value: "Homeopathic", label: "Homeopathic", labelBn: "হোমিওপ্যাথিক" },
      { value: "Diabetic Care", label: "Diabetic Care", labelBn: "ডায়াবেটিস যত্ন" },
      { value: "Baby Care", label: "Baby Care & Nutrition", labelBn: "শিশু খাদ্য ও যত্ন" },
      { value: "Personal Care", label: "Personal & Hygiene Care", labelBn: "ব্যক্তিগত যত্ন" },
    ],
  },
  {
    groupName: "Medical Devices, Surgical & First Aid",
    groupNameBn: "মেডিকেল ডিভাইস, সার্জিক্যাল ও ফার্স্ট এইড",
    items: [
      { value: "Medical Device", label: "Medical Device", labelBn: "মেডিকেল ডিভাইস" },
      { value: "Surgical Items", label: "Surgical Items & Instruments", labelBn: "সার্জিক্যাল সামগ্রী" },
      { value: "Dressing & Bandage", label: "Dressing, Bandage & Gauze", labelBn: "ব্যান্ডেজ ও ড্রেসিং" },
      { value: "First Aid", label: "First Aid Supplies", labelBn: "ফার্স্ট এইড" },
      { value: "Gloves & Masks", label: "Gloves & Masks", labelBn: "গ্লাভস ও মাস্ক" },
      { value: "Test Kits", label: "Diagnostic Test Kits", labelBn: "টেস্ট কিটস" },
      { value: "Others", label: "Others", labelBn: "অন্যান্য" },
    ],
  },
];

export const ALL_CATEGORY_VALUES: string[] = CATEGORY_GROUPS.flatMap((group) =>
  group.items.map((item) => item.value)
);

export const DEFAULT_CATEGORY_OPTIONS = ALL_CATEGORY_VALUES;
