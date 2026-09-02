import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldCheck, 
  FileText, 
  RefreshCw, 
  Scale, 
  X, 
  Printer, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Building2, 
  ThermometerSnowflake, 
  FileCheck2, 
  ExternalLink,
  ChevronRight,
  ArrowLeft
} from "lucide-react";
import MediChainLogo from "./MediChainLogo";

export type LegalPolicyTab = "privacy" | "terms" | "refund" | "compliance";

interface LegalPolicyModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialTab?: LegalPolicyTab;
  isStandalone?: boolean;
  onAccept?: () => void;
  showAcceptButton?: boolean;
}

export default function LegalPolicyModal({
  isOpen = true,
  onClose,
  initialTab = "privacy",
  isStandalone = false,
  onAccept,
  showAcceptButton = false
}: LegalPolicyModalProps) {
  const [activeTab, setActiveTab] = useState<LegalPolicyTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [showBengaliSummary, setShowBengaliSummary] = useState(true);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onClose && !isStandalone) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isStandalone]);

  const tabs: Array<{
    id: LegalPolicyTab;
    labelEn: string;
    labelBn: string;
    icon: React.ReactNode;
    badge: string;
  }> = [
    {
      id: "privacy",
      labelEn: "Privacy Policy",
      labelBn: "প্রাইভেসি পলিসি",
      icon: <ShieldCheck className="w-4 h-4 text-purple-600" />,
      badge: "DGDA & GDPR Compliant"
    },
    {
      id: "terms",
      labelEn: "Terms of Service",
      labelBn: "ব্যবহারের শর্তাবলী",
      icon: <FileText className="w-4 h-4 text-emerald-600" />,
      badge: "B2B Procurement OS"
    },
    {
      id: "refund",
      labelEn: "Refund & Returns",
      labelBn: "রিফান্ড ও রিটার্ন নীতিমালা",
      icon: <RefreshCw className="w-4 h-4 text-teal-600" />,
      badge: "Cold-Chain Integrity"
    },
    {
      id: "compliance",
      labelEn: "DGDA Compliance",
      labelBn: "রেগুলেটরি ডিসক্লেইমার",
      icon: <Scale className="w-4 h-4 text-amber-600" />,
      badge: "Drugs Act 1940"
    }
  ];

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen && !isStandalone) return null;

  const content = (
    <div className={`flex flex-col bg-white ${isStandalone ? "min-h-screen w-full" : "h-[90vh] max-h-[850px] w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"}`}>
      {/* Top Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-[#17121F] to-slate-950 text-white p-5 md:px-8 border-b border-purple-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          {isStandalone && (
            <button
              onClick={() => window.history.back()}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer mr-1"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <MediChainLogo size="sm" withText={true} textColor="light" />
          <div className="hidden sm:block h-6 w-px bg-slate-700" />
          <span className="hidden sm:inline-block text-xs font-bold text-slate-300">
            Legal & Regulatory Compliance Hub
          </span>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Bengali / English summary toggle */}
          <button
            onClick={() => setShowBengaliSummary(!showBengaliSummary)}
            className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              showBengaliSummary 
                ? "bg-brand-lime text-slate-950 border-brand-lime shadow-xs" 
                : "bg-white/10 text-slate-300 border-white/10 hover:bg-white/20"
            }`}
          >
            <span>{showBengaliSummary ? "✓ বাংলা সারসংক্ষেপ চালু" : "বাংলা সারসংক্ষেপ দেখুন"}</span>
          </button>

          <button
            onClick={handlePrint}
            className="p-2 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-all cursor-pointer"
            title="Print Official Document"
          >
            <Printer className="w-4 h-4" />
          </button>

          {!isStandalone && onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-300 hover:text-white bg-white/10 hover:bg-rose-500/80 rounded-xl transition-all cursor-pointer"
              title="Close Modal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Header & Search */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 md:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                  isActive 
                    ? "bg-white text-brand-charcoal shadow-sm border border-slate-200/80 font-black" 
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                {tab.icon}
                <span>{tab.labelEn}</span>
                <span className="hidden lg:inline text-[10px] text-slate-400 font-normal">({tab.labelBn})</span>
              </button>
            );
          })}
        </div>

        {/* In-document Search */}
        <div className="relative w-full sm:w-60 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search policy clauses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-purple/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Main Legal Content Body */}
      <div className="flex-1 overflow-y-auto p-5 md:p-8 text-slate-800 space-y-6 leading-relaxed text-xs md:text-sm">
        {activeTab === "privacy" && (
          <div className="space-y-6 animate-fade-in">
            {/* Header Title */}
            <div className="border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg text-[10px] font-black uppercase tracking-wider">
                  Version 1.0.0 • Effective: January 2026
                </span>
                <span className="text-xs text-slate-500 font-medium">DGDA & Bangladesh Digital Commerce Compliant</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 mt-2">
                MediChain Privacy Policy & Data Protection Charter
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Transparent protocols governing how retail pharmacy records, proprietor National ID (NID), trade licenses, and transaction ledgers are collected, encrypted, and processed.
              </p>
            </div>

            {showBengaliSummary && (
              <div className="bg-purple-50/80 border border-purple-200/80 rounded-2xl p-4 text-purple-950 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-brand-purple">
                  <ShieldCheck className="w-4 h-4 text-brand-purple" />
                  <span>প্রাইভেসি পলিসি সংক্ষেপ (বাংলা)</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-700 leading-normal pl-1">
                  <li><strong>নিরাপত্তা ও এনক্রিপশন:</strong> আপনার ফার্মেসির ড্রাগ লাইসেন্স, ট্রেড লাইসেন্স এবং জাতীয় পরিচয়পত্র (NID) ব্যাংক-গ্রেড AES-256 এনক্রিপশনে প্রাইভেট ক্লাউড স্টোরেজে সুরক্ষিত থাকে।</li>
                  <li><strong>তথ্যের ব্যবহার:</strong> তথ্য শুধুমাত্র ঔষধ প্রশাসন (DGDA) রেগুলেটরি যাচাই, অর্ডার ডেলিভারি এবং ট্যাক্স ইনভয়েস তৈরিতে ব্যবহৃত হয়।</li>
                  <li><strong>তৃতীয় পক্ষ:</strong> মেডিচেইন কোনো বিজ্ঞাপন সংস্থা বা তৃতীয় পক্ষের কাছে ফার্মেসির কোনো ব্যবসায়িক ডেটা বিক্রয় বা শেয়ার করে না।</li>
                </ul>
              </div>
            )}

            {/* Section 1 */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-600" />
                1. Data Collection & Classification
              </h3>
              <p className="text-slate-600">
                MediChain operates as an enterprise-grade B2B pharmaceutical procurement operating system for authorized healthcare providers in the People's Republic of Bangladesh. To guarantee regulatory compliance under the Directorate General of Drug Administration (DGDA) and the Drugs Act 1940, we collect and process the following verified business data:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-700 pl-2">
                <li><strong>Proprietor & Entity Identity:</strong> Full legal name of proprietor/licensee, National Identity Number (NID), biometric scan of physical NID card, and registered contact telephone numbers.</li>
                <li><strong>Statutory Licensing Documents:</strong> Official DGDA Drug License number and expiry date, high-resolution document scans, Municipal Trade License, and Tax Identification Number (TIN/BIN) certificates.</li>
                <li><strong>Physical Pharmacy Geo-Location:</strong> Street address, shop name, landmark, Upazila/Thana, District, and GPS coordinates for precision depot delivery dispatch.</li>
                <li><strong>Wholesale Transaction Ledgers:</strong> Order histories, generated tax invoices, batch serialization records, payment references (bKash, Nagad, bank transfer), and delivery OTP receipts.</li>
              </ul>
            </div>

            {/* Section 2 */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                2. Storage Security & Cryptographic Access Control
              </h3>
              <p className="text-slate-600">
                All regulatory document scans and confidential trade secrets are stored within dedicated private Supabase Storage buckets (<code className="bg-slate-100 px-1 py-0.5 rounded text-purple-700 font-mono text-xs">verification-documents</code>) utilizing Row-Level Security (RLS) policies:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-2">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="font-bold text-xs text-slate-900 block">AES-256 & TLS 1.3 Encryption</span>
                  <span className="text-[11px] text-slate-500 mt-1 block">Data at rest is secured via AES-256; all in-transit traffic is encrypted over TLS 1.3 HTTPS.</span>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="font-bold text-xs text-slate-900 block">Time-Limited Signed URLs</span>
                  <span className="text-[11px] text-slate-500 mt-1 block">Document scans are never publicly exposed; authorized viewers generate 1-hour cryptographically signed access tokens.</span>
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-600" />
                3. Sub-Processors & Artificial Intelligence Scanners
              </h3>
              <p className="text-slate-600">
                MediChain integrates specialized infrastructure partners under strict data-processing agreements:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-700 pl-2">
                <li><strong>Cloud Infrastructure:</strong> Vercel Inc. and Render for containerized API execution and edge caching.</li>
                <li><strong>Database & Storage:</strong> Supabase PostgreSQL (AWS SOC-2 Type II certified cloud).</li>
                <li><strong>SmartOrder AI OCR Engine:</strong> Google Gemini (<code className="bg-slate-100 px-1 py-0.5 rounded text-purple-700 font-mono text-xs">@google/genai</code>) is strictly utilized for optical character recognition of handwritten medicine memos. <em>No personal health information (PHI) or proprietor identity data is retained or utilized for public model training.</em></li>
                <li><strong>SMS Gateways:</strong> Bangladesh PTA-licensed SMS aggregators for transactional OTP and rider dispatch alerts only.</li>
              </ul>
            </div>

            {/* Section 4 */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-amber-600" />
                4. App Store Compliance & Data Retention Standards
              </h3>
              <p className="text-slate-600">
                In compliance with Google Play Developer Policies, Apple App Store Guidelines, and national drug oversight rules:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700 pl-2">
                <li><strong>Mandatory 5-Year Regulatory Archive:</strong> Under DGDA wholesale audit rules, medicine batch procurement and invoice ledgers must be retained for 5 years.</li>
                <li><strong>Right to Account Closure:</strong> Verified pharmacy owners may request account decommissioning and non-statutory data deletion through official support channels (<a href="mailto:compliance@medichain.com" className="text-purple-600 font-bold underline">compliance@medichain.com</a>).</li>
                <li><strong>Zero Data Brokerage:</strong> MediChain does not sell, lease, or monetize pharmacy purchasing trends to third-party advertisers.</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "terms" && (
          <div className="space-y-6 animate-fade-in">
            {/* Header Title */}
            <div className="border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-black uppercase tracking-wider">
                  B2B Master Service Agreement
                </span>
                <span className="text-xs text-slate-500 font-medium">Governed by the Laws of Bangladesh</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 mt-2">
                MediChain Terms and Conditions of Service
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Legally binding operating terms governing B2B pharmaceutical procurement, dispatch rules, payment settlements, and liability limits.
              </p>
            </div>

            {showBengaliSummary && (
              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-2xl p-4 text-emerald-950 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <span>ব্যবহারের শর্তাবলী সংক্ষেপ (বাংলা)</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-700 leading-normal pl-1">
                  <li><strong>ড্রাগ লাইসেন্স নিশ্চয়তা:</strong> রেজিস্ট্রেশনকারী নিশ্চয়তা দিচ্ছেন যে তার ফার্মেসির ডিজিডিএ (DGDA) ড্রাগ লাইসেন্স ও ট্রেড লাইসেন্স সক্রিয় ও বৈধ।</li>
                  <li><strong>মূল্য ও ইনভয়েস:</strong> প্রতিটি অর্ডারের সাথে সরকারি ট্যাক্স ইনভয়েস প্রদান করা হবে। বাকিতে কেনাকাটায় নির্ধারিত বিলিং চক্রে পরিশোধ বাধ্যতামূলক।</li>
                  <li><strong>দায়বদ্ধতার সীমাবদ্ধতা:</strong> ঔষুধের প্রস্তুতকারক ত্রুটি বা রিকলের ক্ষেত্রে মূল প্রস্তুতকারী কোম্পানি (যেমন স্কয়ার, বেক্সিমকো) দায়বদ্ধ থাকবে।</li>
                </ul>
              </div>
            )}

            {/* Terms 1 */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                1. Eligibility & Statutory Licensing Warranty
              </h3>
              <p className="text-slate-600">
                Registration and procurement access on MediChain is strictly restricted to licensed pharmacies, clinics, hospitals, and certified healthcare practitioners. By submitting an onboarding application, the registrant unconditionally warrants that:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700 pl-2">
                <li>They hold a valid, unexpired Retail or Wholesale Drug License issued by the Directorate General of Drug Administration (DGDA).</li>
                <li>They hold a valid Municipal Trade License issued by the local governing corporation or union parishad.</li>
                <li>All uploaded identification credentials (NID, Tax documents) belong to the bona fide proprietor or authorized managing director.</li>
              </ul>
            </div>

            {/* Terms 2 */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                2. Wholesale Pricing, Ordering & DGDA Invoicing
              </h3>
              <p className="text-slate-600">
                MediChain provides wholesale procurement at trade prices with volume-based discount tiers:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700 pl-2">
                <li>Wholesale prices, manufacturer trade offers, and flash bulk deals are proprietary trade information intended strictly for authorized pharmacies.</li>
                <li>Every fulfilled order is accompanied by an official MediChain Tax Invoice detailing manufacturer batch numbers, manufacturing dates, expiry dates, and government-approved Maximum Retail Prices (MRP).</li>
                <li>Minimum Order Values (MOV) and packaging box increments apply based on depot logistics territory.</li>
              </ul>
            </div>

            {/* Terms 3 */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                3. Payment Settlement & B2B Credit Line Governance
              </h3>
              <p className="text-slate-600">
                Payments must be settled via Cash on Delivery (COD), verified Mobile Financial Services (bKash / Nagad Merchant Gateway), or an approved B2B Credit Line:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700 pl-2">
                <li>Credit lines are granted based on licensing verification, credit history, and purchasing volume, subject to 7, 15, or 30-day revolving settlement cycles.</li>
                <li>Default on credit settlements beyond the grace period results in automatic freeze of procurement privileges and potential reporting to credit registries.</li>
              </ul>
            </div>

            {/* Terms 4 */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                4. Order Cancellation & Dispatch Rules
              </h3>
              <p className="text-slate-600">
                Orders may be cancelled free of penalty while in <span className="font-bold text-purple-700">"Pending"</span> or <span className="font-bold text-purple-700">"Confirmed"</span> status prior to warehouse staging. Once an order is marked <span className="font-bold text-amber-700">"Packed"</span> or <span className="font-bold text-emerald-700">"Out for Delivery"</span>, cancellations require depot supervisor approval and may incur a restocking logistics charge.
              </p>
            </div>

            {/* Terms 5 */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                5. Limitation of Liability & Manufacturer Warranty
              </h3>
              <p className="text-slate-600">
                MediChain acts solely as a digital procurement network and logistics fulfillment operating system:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-700 pl-2">
                <li><strong>Manufacturer Responsibility:</strong> Drug efficacy, bio-equivalence, manufacturing defects, and statutory batch recalls remain the exclusive legal liability of the respective pharmaceutical manufacturer (e.g., Square Pharmaceuticals, Beximco Pharma, Incepta Pharmaceuticals, Renata PLC, etc.).</li>
                <li><strong>Maximum Platform Liability:</strong> To the maximum extent permitted by Bangladesh law, MediChain's aggregate liability for any transaction dispute is strictly limited to the actual purchase price paid by the pharmacy for the contested items.</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "refund" && (
          <div className="space-y-6 animate-fade-in">
            {/* Header Title */}
            <div className="border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-teal-100 text-teal-800 rounded-lg text-[10px] font-black uppercase tracking-wider">
                  Cold-Chain & Wholesale Guidelines
                </span>
                <span className="text-xs text-slate-500 font-medium">Quality Assurance Standards</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 mt-2">
                MediChain Refund, Return & Cancellation Policy
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Standardized protocols for transit breakage, short-expiry returns, digital refunds, and cold-chain biologicals safety.
              </p>
            </div>

            {showBengaliSummary && (
              <div className="bg-teal-50/80 border border-teal-200/80 rounded-2xl p-4 text-teal-950 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-teal-800">
                  <RefreshCw className="w-4 h-4 text-teal-700" />
                  <span>রিফান্ড ও রিটার্ন নীতিমালা সংক্ষেপ (বাংলা)</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-700 leading-normal pl-1">
                  <li><strong>২৪ ঘণ্টার মধ্যে ক্লেইম:</strong> ভাঙা, সিল কাটা বা ভুল পণ্যের ক্ষেত্রে ডেলিভারির ২৪ ঘণ্টার মধ্যে ছবিসহ অ্যাপের মাধ্যমে রিটার্ন ক্লেইম করুন।</li>
                  <li><strong>কোল্ড চেইন পণ্য (ইনসুলিন/ভ্যাকসিন):</strong> তাপমাত্রা সংবেদনশীল পণ্য (২°-৮° সেলসিয়াস) ডেলিভারি গ্রহণের পর ফেরতযোগ্য নয়; তবে ডেলিভারির সময় তাপমাত্রা বা সিল নষ্ট থাকলে তাৎক্ষণিক রিজেক্ট করতে হবে।</li>
                  <li><strong>রিফান্ড সময়সীমা:</strong> অনুমোদিত রিটার্নে বিকাশ/নগদে ৩-৭ কার্যদিবসের মধ্যে এবং ক্রেডিট একাউন্টে তাৎক্ষণিক রিফান্ড সমন্বয় করা হয়।</li>
                </ul>
              </div>
            )}

            {/* Refund 1 */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                1. Eligible Return Grounds & 24-Hour Inspection Window
              </h3>
              <p className="text-slate-600">
                Retail pharmacies must inspect physical consignments upon delivery. Return claims are accepted under the following strict parameters:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-slate-700 pl-2">
                <li><strong>Transit Damage & Leaks:</strong> Crushed packaging, broken glass ampoules, or leaking bottles reported within 24 hours of delivery with photographic evidence.</li>
                <li><strong>Wrong Item or Dosage Discrepancy:</strong> Receiving a product differing from the confirmed invoice (e.g., Tab 500mg instead of Tab 250mg).</li>
                <li><strong>Tampered Seals:</strong> Manufacturer hologram or outer security seal compromised prior to handover.</li>
              </ul>
            </div>

            {/* Refund 2 */}
            <div className="space-y-2">
              <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-2xl">
                <h3 className="text-sm font-black text-blue-950 uppercase tracking-wide flex items-center gap-2">
                  <ThermometerSnowflake className="w-4 h-4 text-blue-600" />
                  2. Cold-Chain Integrity & Biologicals Policy (2°C – 8°C)
                </h3>
                <p className="text-xs text-blue-900 mt-1.5 leading-relaxed">
                  Temperature-sensitive biologicals (such as Insulins, Vaccines, Immunoglobulins, and Monoclonal Antibodies) requiring cold-chain preservation (2°C – 8°C) are <strong>strictly non-returnable once accepted and signed for</strong> by the pharmacy to prevent compromised drug efficacy and protect patient safety.
                </p>
                <div className="mt-2.5 p-3 bg-white rounded-xl border border-blue-200 text-[11px] text-blue-800">
                  <strong>Mandatory DGDA Delivery-Inspection Exception:</strong> If at the exact point of delivery, the depot delivery temperature log indicates an out-of-range breach (&gt;8°C or &lt;2°C freeze risk), or if the vial security seal is damaged, the pharmacy must <em>immediately reject the consignment</em> and record an on-the-spot delivery incident note with the delivery rider.
                </div>
              </div>
            </div>

            {/* Refund 3 */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                3. Short-Expiry & Manufacturer Batch Recalls
              </h3>
              <ul className="list-disc list-inside space-y-1 text-slate-700 pl-2">
                <li><strong>Standard Shelf-Life Guarantee:</strong> Regular catalog items maintain a minimum remaining shelf-life of 6 months. Any short-expiry stock (&lt;6 months) is explicitly marked with special discounts before checkout.</li>
                <li><strong>Statutory Recalls:</strong> If the DGDA or a manufacturer issues an official batch recall, MediChain coordinates 100% credit adjustment and free depot collection.</li>
              </ul>
            </div>

            {/* Refund 4 */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                4. Refund Processing & Settlement Timelines
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="font-bold text-xs text-slate-900 block">Digital Payments (bKash / Nagad / Cards)</span>
                  <span className="text-[11px] text-slate-500 mt-1 block">Refunds are processed within 3 to 7 business days following warehouse inspection and return verification.</span>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="font-bold text-xs text-slate-900 block">B2B Credit Accounts</span>
                  <span className="text-[11px] text-slate-500 mt-1 block">Credit notes are generated immediately and reflected in your available credit balance upon return approval.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "compliance" && (
          <div className="space-y-6 animate-fade-in">
            {/* Header Title */}
            <div className="border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg text-[10px] font-black uppercase tracking-wider">
                  Statutory Regulatory Notice
                </span>
                <span className="text-xs text-slate-500 font-medium">Under the Drugs Act 1940 & National Drug Policy</span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 mt-2">
                DGDA Verification & Regulatory Compliance Disclaimer
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Zero-tolerance provisions against counterfeit credentials, unauthorized narcotic trade, and fraudulent licensing.
              </p>
            </div>

            {showBengaliSummary && (
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 text-amber-950 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <Scale className="w-4 h-4 text-amber-700" />
                  <span>রেগুলেটরি ডিসক্লেইমার সংক্ষেপ (বাংলা)</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-700 leading-normal pl-1">
                  <li><strong>জাল কাগজের বিরুদ্ধে কঠোর ব্যবস্থা:</strong> জাল বা মেয়াদোত্তীর্ণ ড্রাগ লাইসেন্স আপলোড করলে তাৎক্ষণিক একাউন্ট স্থায়ীভাবে বাতিল এবং ডিজিডিএ ও আইন প্রয়োগকারী সংস্থায় হস্তান্তর করা হবে।</li>
                  <li><strong>প্ল্যাটফর্ম ভূমিকা:</strong> মেডিচেইন ঔষধ প্রস্তুতকারক নয়; এটি অনুমোদিত ডিপো ও লাইসেন্সপ্রাপ্ত ফার্মেসির মধ্যে নির্ভরযোগ্য বি২বি প্রযুক্তি ও লজিস্টিকস প্ল্যাটফর্ম।</li>
                </ul>
              </div>
            )}

            {/* Compliance 1 */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                1. Zero Tolerance for Fraudulent & Counterfeit Credentials
              </h3>
              <p className="text-slate-600">
                MediChain operates under the strict oversight of the Directorate General of Drug Administration (DGDA). Submission of falsified, expired, edited, or borrowed Drug Licenses, Trade Licenses, or Proprietor NIDs constitutes a serious criminal offense under the Penal Code and the Drugs Act 1940 of Bangladesh.
              </p>
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs leading-relaxed">
                <strong>Mandatory Enforcement Protocol:</strong> In the event of fraudulent credentials, MediChain reserves the unreserved legal right to immediately suspend the account, freeze all pending consignments, and forward the complete digital dossier and IP audit logs to the <strong>DGDA Law Enforcement Cell</strong> and the <strong>Directorate of National Consumer Rights Protection (DNCRP)</strong>.
              </div>
            </div>

            {/* Compliance 2 */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                2. Market Intermediary & Technology Operating System Role
              </h3>
              <p className="text-slate-600">
                MediChain acts as an authorized B2B technology intermediary facilitating transparent cataloging, inventory forecasting, batch tracing, and depot fulfillment for licensed pharmacies. MediChain does not manufacture pharmaceutical compounds or engage in unauthorized direct-to-consumer retail sales.
              </p>
            </div>

            {/* Compliance 3 */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                3. Anti-Counterfeiting & DGDA Batch Serialization
              </h3>
              <p className="text-slate-600">
                Every pharmaceutical item sourced through MediChain depots is procured directly from certified manufacturing plants of licensed companies (e.g., Incepta, Beximco, Square, Renata, Acme, Opsonin, Aristopharma, Eskayef). All consignments maintain complete batch traceability to eliminate spurious or substandard drugs from the supply chain.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="bg-slate-50 border-t border-slate-200 p-4 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="text-[11px] text-slate-500 text-center sm:text-left">
          Questions or compliance inquiries? Contact our Legal Officer at <a href="mailto:legal@medichain.com" className="text-purple-600 font-bold hover:underline">legal@medichain.com</a>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {showAcceptButton && onAccept && (
            <button
              onClick={() => {
                onAccept();
                if (onClose) onClose();
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-brand-lime hover:bg-brand-lime-dark text-slate-950 text-xs font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>I Understand & Accept Terms</span>
            </button>
          )}

          {!isStandalone && onClose && (
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (isStandalone) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl flex items-center justify-center">
        {content}
      </div>
    </div>
  );
}
