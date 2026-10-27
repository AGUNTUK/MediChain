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
    groupName: "Oral Solid Dosages",
    groupNameBn: "মুখে খাওয়ার কঠিন ওষুধ",
    items: [
      { value: "Tablet", label: "Tablet", labelBn: "ট্যাবলেট" },
      { value: "Capsule", label: "Capsule", labelBn: "ক্যাপসুল" },
      { value: "Powder", label: "Powder", labelBn: "পাউডার" },
      { value: "Sachet", label: "Sachet", labelBn: "স্যাচেট" },
      { value: "Chewable Tablet", label: "Chewable Tablet", labelBn: "চিবিয়ে খাওয়ার ট্যাবলেট" },
      { value: "Effervescent Tablet", label: "Effervescent Tablet", labelBn: "পানিতে দ্রবণীয় ট্যাবলেট" }
    ]
  },
  {
    groupName: "Liquid Preparations",
    groupNameBn: "তরল ওষুধ ও সাসপেনশন",
    items: [
      { value: "Syrup", label: "Syrup", labelBn: "সিরাপ" },
      { value: "Suspension", label: "Suspension", labelBn: "সাসপেনশন" },
      { value: "Solution", label: "Solution", labelBn: "দ্রবণ" },
      { value: "Oral Drops", label: "Oral Drops", labelBn: "ওরাল ড্রপ" },
      { value: "Elixir", label: "Elixir", labelBn: "এলিক্সির" }
    ]
  },
  {
    groupName: "Injectables & Infusions",
    groupNameBn: "ইনজেকশন ও স্যালাইন",
    items: [
      { value: "Injection", label: "Injection", labelBn: "ইনজেকশন" },
      { value: "Infusion", label: "Infusion", labelBn: "স্যালাইন / ইনফিউশন" },
      { value: "Vaccine", label: "Vaccine", labelBn: "ভ্যাকসিন" },
      { value: "IV Fluid", label: "IV Fluid", labelBn: "আইভি ফ্লুইড" }
    ]
  },
  {
    groupName: "Eye, Ear & Nasal Preparations",
    groupNameBn: "চোখ, কান ও নাকের ওষুধ",
    items: [
      { value: "Ophthalmic", label: "Ophthalmic", labelBn: "চক্ষু ওষুধ (চোখের ড্রপ/মলম)" },
      { value: "Ear Drops", label: "Ear Drops", labelBn: "কানের ড্রপ" },
      { value: "Nasal Spray", label: "Nasal Spray", labelBn: "নাসাল স্প্রে" },
      { value: "Nasal Drops", label: "Nasal Drops", labelBn: "নাকের ড্রপ" }
    ]
  },
  {
    groupName: "Topicals & Dermatologicals",
    groupNameBn: "মলম, ক্রিম ও বাহ্যিক ওষুধ",
    items: [
      { value: "Ointment", label: "Ointment", labelBn: "মলম" },
      { value: "Cream", label: "Cream", labelBn: "ক্রিম" },
      { value: "Gel", label: "Gel", labelBn: "জেল" },
      { value: "Lotion", label: "Lotion", labelBn: "লোশন" },
      { value: "Dermatological", label: "Dermatological", labelBn: "চর্মরোগের ওষুধ" },
      { value: "Topical Solution", label: "Topical Solution", labelBn: "বাহ্যিক দ্রবণ" }
    ]
  },
  {
    groupName: "Respiratory & Inhalation",
    groupNameBn: "শ্বাসকষ্ট ও ইনহেলার",
    items: [
      { value: "Inhaler", label: "Inhaler", labelBn: "ইনহেলার" },
      { value: "Respiratory", label: "Respiratory", labelBn: "শ্বাসকষ্ট ও অ্যাজমা" },
      { value: "Nebulizer Solution", label: "Nebulizer Solution", labelBn: "নেবুলাইজার সলিউশন" },
      { value: "Rotacap", label: "Rotacap", labelBn: "রোটা ক্যাপসুল" }
    ]
  },
  {
    groupName: "Suppositories & Enemas",
    groupNameBn: "সাপোজিটরি ও পেসারি",
    items: [
      { value: "Suppository", label: "Suppository", labelBn: "সাপোজিটরি" },
      { value: "Pessary", label: "Pessary", labelBn: "পেসারি / ভ্যাজাইনাল ট্যাবলেট" },
      { value: "Enema", label: "Enema", labelBn: "এনিমা" }
    ]
  },
  {
    groupName: "Therapeutic & Disease-Specific Classes",
    groupNameBn: "বিশেষ রোগভিত্তিক থেরাপিউটিক শ্রেণি",
    items: [
      { value: "Antibiotics", label: "Antibiotics", labelBn: "অ্যান্টিবায়োটিক" },
      { value: "Cardiovascular", label: "Cardiovascular", labelBn: "হৃদরোগ ও রক্তচাপ" },
      { value: "Gastrointestinal", label: "Gastrointestinal", labelBn: "গ্যাস্ট্রোইনটেস্টাইনাল / পেটের ওষুধ" },
      { value: "Antidiabetic", label: "Antidiabetic", labelBn: "ডায়াবেটিস" },
      { value: "Analgesic & Antipyretic", label: "Analgesic & Antipyretic", labelBn: "ব্যথানাশক ও জ্বর" },
      { value: "Antihistamine", label: "Antihistamine", labelBn: "অ্যালার্জি ও অ্যান্টিহিস্টামিন" },
      { value: "Vitamins & Supplements", label: "Vitamins & Supplements", labelBn: "ভিটামিন ও সাপ্লিমেন্ট" },
      { value: "Neurological & CNS", label: "Neurological & CNS", labelBn: "মস্তিষ্ক ও স্নায়ুর ওষুধ" },
      { value: "Urology & Nephrology", label: "Urology & Nephrology", labelBn: "কিডনি ও ইউরোলজি" },
      { value: "Gynecology", label: "Gynecology", labelBn: "স্ত্রী রোগ ও প্রসূতি" }
    ]
  },
  {
    groupName: "Medical Supplies & Devices",
    groupNameBn: "চিকিৎসা সরঞ্জাম ও সার্জিক্যাল",
    items: [
      { value: "Medical Supplies", label: "Medical Supplies", labelBn: "চিকিৎসা সামগ্রী" },
      { value: "Surgical Disposables", label: "Surgical Disposables", labelBn: "সার্জিক্যাল ও ডিসপোজেবল" },
      { value: "Diagnostic & Monitoring", label: "Diagnostic & Monitoring", labelBn: "ডায়াগনস্টিক কিট ও মনিটরিং" },
      { value: "First Aid", label: "First Aid", labelBn: "প্রাথমিক চিকিৎসা" }
    ]
  },
  {
    groupName: "Consumer Healthcare & Personal Care",
    groupNameBn: "কনজিউমার হেলথ ও ব্যক্তিগত যত্ন",
    items: [
      { value: "Baby Care", label: "Baby Care", labelBn: "শিশু যত্ন ও পুষ্টি" },
      { value: "Personal Care", label: "Personal Care", labelBn: "ব্যক্তিগত স্বাস্থ্য ও হাইজিন" },
      { value: "Herbal & Ayurvedic", label: "Herbal & Ayurvedic", labelBn: "হারবাল ও ইউনানি" },
      { value: "Dental & Oral Care", label: "Dental & Oral Care", labelBn: "দাঁত ও মুখের যত্ন" }
    ]
  }
];

// Flat list of all unique category values for quick indexing and validation
export const DEFAULT_CATEGORY_OPTIONS: string[] = Array.from(
  new Set(CATEGORY_GROUPS.flatMap(g => g.items.map(i => i.value)))
);

export const ALL_CATEGORY_VALUES = DEFAULT_CATEGORY_OPTIONS;

// Lookup map for fast bilingual translation of any category
export const CATEGORY_BN_MAP: Record<string, string> = CATEGORY_GROUPS.reduce((acc, group) => {
  group.items.forEach(item => {
    acc[item.value] = item.labelBn;
  });
  return acc;
}, {} as Record<string, string>);

export function getCategoryLabelBn(categoryValue: string): string {
  if (!categoryValue) return "";
  return CATEGORY_BN_MAP[categoryValue] || categoryValue;
}


