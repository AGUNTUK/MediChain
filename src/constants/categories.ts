export const DEFAULT_CATEGORY_OPTIONS: string[] = [
  "Tablet",
  "Capsule",
  "Syrup",
  "Injection",
  "Suspension",
  "Eye Drops",
  "Ear Drops",
  "Ointment",
  "Cream",
  "Gel",
  "Suppository",
  "Inhaler",
  "Nasal Spray",
  "Infusion",
  "Powder",
  "Sachet",
  "Lotion",
  "Solution",
  "Vaccine",
  "Antibiotics",
  "Cardiovascular",
  "Gastrointestinal",
  "Antidiabetic",
  "Analgesic & Antipyretic",
  "Respiratory",
  "Dermatological",
  "Vitamins & Supplements",
  "Medical Supplies"
];

export const ALL_CATEGORY_VALUES = DEFAULT_CATEGORY_OPTIONS;

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
    groupNameBn: "মুখে খাওয়ার ওষুধ",
    items: [
      { value: "Tablet", label: "Tablet", labelBn: "ট্যাবলেট" },
      { value: "Capsule", label: "Capsule", labelBn: "ক্যাপসুল" }
    ]
  },
  {
    groupName: "Liquid Preparations",
    groupNameBn: "তরল ওষুধ",
    items: [
      { value: "Syrup", label: "Syrup", labelBn: "সিরাপ" },
      { value: "Suspension", label: "Suspension", labelBn: "সাসপেনশন" },
      { value: "Solution", label: "Solution", labelBn: "দ্রবণ" }
    ]
  },
  {
    groupName: "Injectables & Infusions",
    groupNameBn: "ইনজেকশন",
    items: [
      { value: "Injection", label: "Injection", labelBn: "ইনজেকশন" },
      { value: "Infusion", label: "Infusion", labelBn: "স্যালাইন/ইনফিউশন" },
      { value: "Vaccine", label: "Vaccine", labelBn: "ভ্যাকসিন" }
    ]
  },
  {
    groupName: "Topicals & Ophthalmic",
    groupNameBn: "বাহ্যিক ব্যবহারের ওষুধ",
    items: [
      { value: "Eye Drops", label: "Eye Drops", labelBn: "চোখের ড্রপ" },
      { value: "Ear Drops", label: "Ear Drops", labelBn: "কানের ড্রপ" },
      { value: "Ointment", label: "Ointment", labelBn: "মলম" },
      { value: "Cream", label: "Cream", labelBn: "ক্রিম" },
      { value: "Gel", label: "Gel", labelBn: "জেল" }
    ]
  },
  {
    groupName: "Specialized Classes",
    groupNameBn: "বিশেষ শ্রেণি",
    items: [
      { value: "Antibiotics", label: "Antibiotics", labelBn: "অ্যান্টিবায়োটিক" },
      { value: "Cardiovascular", label: "Cardiovascular", labelBn: "হৃদরোগের ওষুধ" },
      { value: "Antidiabetic", label: "Antidiabetic", labelBn: "ডায়াবেটিস" },
      { value: "Respiratory", label: "Respiratory", labelBn: "শ্বাসকষ্ট" },
      { value: "Medical Supplies", label: "Medical Supplies", labelBn: "চিকিৎসা সামগ্রী" }
    ]
  }
];


