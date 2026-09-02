import React, { useState, Suspense, lazy } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Building2, 
  User, 
  Phone, 
  Mail, 
  FileCheck, 
  MapPin, 
  Upload, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck, 
  AlertCircle,
  FileSpreadsheet,
  Sparkles,
  CreditCard,
  Check,
  Scale,
  Lock,
  FileText
} from "lucide-react";
import MediChainLogo from "./MediChainLogo";
import { profileService } from "../services";
import { storageService } from "../services/storage";
import type { LegalPolicyTab } from "./LegalPolicyModal";

const LegalPolicyModal = lazy(() => import("./LegalPolicyModal"));

interface PharmacyRegistrationWizardProps {
  initialPhone?: string;
  onComplete?: (pharmacyData: any) => void;
  onCancel?: () => void;
}

export default function PharmacyRegistrationWizard({
  initialPhone = "",
  onComplete,
  onCancel
}: PharmacyRegistrationWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Business & Owner Details
  const [pharmacyName, setPharmacyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState("");

  // Step 2: Licensing & Regulatory
  const [drugLicenseNo, setDrugLicenseNo] = useState("");
  const [tradeLicenseNo, setTradeLicenseNo] = useState("");
  const [nidNumber, setNidNumber] = useState("");
  const [tinNumber, setTinNumber] = useState("");

  // Step 3: Location & Address
  const [division, setDivision] = useState("Dhaka");
  const [district, setDistrict] = useState("Dhaka");
  const [thana, setThana] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");

  // Step 4: Documents Upload & Legal Consent
  const [drugLicenseFile, setDrugLicenseFile] = useState<File | null>(null);
  const [tradeLicenseFile, setTradeLicenseFile] = useState<File | null>(null);
  const [nidFile, setNidFile] = useState<File | null>(null);
  const [acceptedLegalTerms, setAcceptedLegalTerms] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<LegalPolicyTab | null>(null);

  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [error, setError] = useState("");
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const validateStep = (currentStep: number) => {
    setError("");
    if (currentStep === 1) {
      if (!pharmacyName.trim()) {
        setError("Pharmacy Business Name is required.");
        return false;
      }
      if (!ownerName.trim()) {
        setError("Proprietor / Owner Name is required.");
        return false;
      }
      if (!phone.trim()) {
        setError("Contact mobile phone number is required.");
        return false;
      }
    } else if (currentStep === 2) {
      if (!drugLicenseNo.trim()) {
        setError("DGDA Drug License Number is required for legal medicine distribution in Bangladesh.");
        return false;
      }
      if (!tradeLicenseNo.trim()) {
        setError("Municipal Trade License Number is required.");
        return false;
      }
      if (nidNumber.trim() && (nidNumber.trim().length < 10 || nidNumber.trim().length > 17)) {
        setError("National ID (NID) must be between 10 and 17 digits if provided.");
        return false;
      }
    } else if (currentStep === 3) {
      if (!address.trim()) {
        setError("Detailed street address is required for B2B delivery.");
        return false;
      }
      if (!thana.trim()) {
        setError("Thana / Upazila name is required.");
        return false;
      }
    } else if (currentStep === 4) {
      if (!acceptedLegalTerms) {
        setError("You must agree to the Terms of Service and Privacy Policy, and confirm all submitted regulatory documents are authentic.");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => (prev < 4 ? ((prev + 1) as 1 | 2 | 3 | 4) : 4));
    }
  };

  const handlePrev = () => {
    setError("");
    setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4) : 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
      return;
    }

    setLoading(true);
    setError("");
    setUploadStatus("Preparing verification data...");

    try {
      // 1. Upload documents to dedicated private storage bucket if files are selected
      let drugLicensePath = "";
      let drugLicenseUrl = "";
      let tradeLicensePath = "";
      let tradeLicenseUrl = "";
      let nidDocumentPath = "";
      let nidUrl = "";

      // Folder identifier based on phone or unique identifier
      const folderId = phone.replace(/[^a-zA-Z0-9]/g, "") || "new_registration";

      if (drugLicenseFile) {
        setUploadStatus("Uploading Drug License scan to private storage...");
        const res = await storageService.uploadVerificationDocument(drugLicenseFile, folderId, "drug-license");
        drugLicensePath = res.path;
        drugLicenseUrl = res.url;
      }

      if (tradeLicenseFile) {
        setUploadStatus("Uploading Trade License scan to private storage...");
        const res = await storageService.uploadVerificationDocument(tradeLicenseFile, folderId, "trade-license");
        tradeLicensePath = res.path;
        tradeLicenseUrl = res.url;
      }

      if (nidFile) {
        setUploadStatus("Uploading Proprietor NID to private storage...");
        const res = await storageService.uploadVerificationDocument(nidFile, folderId, "proprietor-nid");
        nidDocumentPath = res.path;
        nidUrl = res.url;
      }

      setUploadStatus("Registering pharmacy credentials with MediChain...");

      const payload = {
        pharmacyName: pharmacyName.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        licenseNo: drugLicenseNo.trim(),
        tradeLicenseNo: tradeLicenseNo.trim(),
        nidNumber: nidNumber.trim() || undefined,
        tinNumber: tinNumber.trim() || undefined,
        address: `${address.trim()}, ${thana.trim()}, ${district.trim()}, ${division.trim()}${landmark.trim() ? ` (Near ${landmark.trim()})` : ""}`,
        city: district.trim(),
        division: division.trim(),
        district: district.trim(),
        thana: thana.trim(),
        landmark: landmark.trim() || undefined,
        drugLicensePath: drugLicensePath || undefined,
        tradeLicensePath: tradeLicensePath || undefined,
        nidDocumentPath: nidDocumentPath || undefined,
        drugLicenseUrl: drugLicenseUrl || undefined,
        tradeLicenseUrl: tradeLicenseUrl || undefined,
        nidUrl: nidUrl || undefined,
        nidFrontUrl: nidUrl || undefined,
        status: "Pending",
        submittedAt: new Date().toISOString(),
        legalConsent: {
          termsAcceptedAt: new Date().toISOString(),
          privacyPolicyVersion: "v1.0.0",
          verifiedAuthenticityDeclaration: true
        }
      };

      await profileService.updatePharmacyProfile(payload);

      setSubmittedSuccess(true);
      if (onComplete) {
        onComplete(payload);
      }
    } catch (err: any) {
      if (err.fields) {
        setError(Object.values(err.fields).join(" "));
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Failed to submit pharmacy registration. Please check your credentials and try again.");
      }
    } finally {
      setLoading(false);
      setUploadStatus("");
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col my-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-800 to-emerald-900 p-5 md:p-6 text-white relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <MediChainLogo size="sm" withText={false} className="shrink-0" />
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-bold text-white tracking-wide leading-tight">
                Pharmacy Onboarding Wizard
              </h2>
              <p className="text-xs text-emerald-200 mt-0.5 leading-snug">
                DGDA Compliant B2B Medicine Procurement Network
              </p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              type="button"
              className="shrink-0 text-xs font-medium text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-4 gap-2 mt-6">
          {[
            { num: 1, label: "Business" },
            { num: 2, label: "Licensing" },
            { num: 3, label: "Location" },
            { num: 4, label: "Documents" }
          ].map((item) => (
            <div key={item.num} className="flex flex-col gap-1">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step >= item.num ? "bg-emerald-400" : "bg-white/20"
                }`}
              />
              <span
                className={`text-[10px] font-medium text-center ${
                  step === item.num ? "text-emerald-300 font-semibold" : "text-white/60"
                }`}
              >
                {item.num}. {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Form Content */}
      <div className="p-6 md:p-8 flex-1 overflow-y-auto">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {submittedSuccess ? (
          <div className="text-center py-8 px-4 flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4 shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Registration Submitted!</h3>
            <p className="text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
              Your drug license (<span className="font-semibold text-slate-900">{drugLicenseNo}</span>) and verification documents for <span className="font-semibold text-slate-900">{pharmacyName}</span> have been securely submitted to MediChain Compliance.
            </p>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 max-w-sm mb-6 text-left space-y-1">
              <p className="font-semibold text-slate-700">What happens next?</p>
              <p>1. DGDA license validation against national drug database.</p>
              <p>2. Express wholesale medicine dispatch enabled upon verification.</p>
            </div>
            <button
              onClick={() => onComplete && onComplete({ submittedSuccess: true })}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl shadow-lg transition-all cursor-pointer"
            >
              Continue to Dashboard
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.form
              key={step}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={step === 4 ? handleSubmit : (e) => e.preventDefault()}
              className="space-y-5"
            >
              {/* STEP 1: BUSINESS & OWNER */}
              {step === 1 && (
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-teal-600" />
                    Pharmacy & Proprietor Information
                  </h3>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pharmacy Name (Standard English / Bangla) *
                    </label>
                    <input
                      type="text"
                      value={pharmacyName}
                      onChange={(e) => setPharmacyName(e.target.value)}
                      placeholder="e.g. Popular Pharma & Medicine Corner"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Proprietor / License Holder Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Full Name as in NID / Drug License"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Contact Mobile Phone *
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="01700000000"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Email Address (Optional)
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="pharmacy@gmail.com"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: LICENSING */}
              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-teal-600" />
                    DGDA Regulatory & Tax Credentials
                  </h3>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      DGDA Drug License Number (Required) *
                    </label>
                    <input
                      type="text"
                      value={drugLicenseNo}
                      onChange={(e) => setDrugLicenseNo(e.target.value)}
                      placeholder="e.g. DL-DHAKA-04928"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Must be a valid Directorate General of Drug Administration (DGDA) retail/wholesale license.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Municipal Trade License Number *
                    </label>
                    <input
                      type="text"
                      value={tradeLicenseNo}
                      onChange={(e) => setTradeLicenseNo(e.target.value)}
                      placeholder="e.g. TRAD/DNCC/019283/2025"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Proprietor National ID (NID) Number (Optional)
                    </label>
                    <div className="relative">
                      <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={nidNumber}
                        onChange={(e) => setNidNumber(e.target.value)}
                        placeholder="10-digit Smart NID or 17-digit NID"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      eTIN / BIN Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={tinNumber}
                      onChange={(e) => setTinNumber(e.target.value)}
                      placeholder="12-digit eTIN or 9-digit BIN"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: LOCATION */}
              {step === 3 && (
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-teal-600" />
                    Delivery Address & Depot Mapping
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Division *</label>
                      <select
                        value={division}
                        onChange={(e) => {
                          setDivision(e.target.value);
                          setDistrict(e.target.value);
                        }}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="Dhaka">Dhaka Division</option>
                        <option value="Chittagong">Chittagong Division</option>
                        <option value="Rajshahi">Rajshahi Division</option>
                        <option value="Khulna">Khulna Division</option>
                        <option value="Sylhet">Sylhet Division</option>
                        <option value="Barisal">Barisal Division</option>
                        <option value="Rangpur">Rangpur Division</option>
                        <option value="Mymensingh">Mymensingh Division</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">District / City *</label>
                      <input
                        type="text"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        placeholder="e.g. Dhaka North / Gazipur"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Thana / Upazila *</label>
                    <input
                      type="text"
                      value={thana}
                      onChange={(e) => setThana(e.target.value)}
                      placeholder="e.g. Uttara / Dhanmondi / Mirpur"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Full Street Address *</label>
                    <textarea
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Shop #12, Market Name, Road #04, Block #B"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nearest Landmark (For Courier)</label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Opposite Square Hospital / Near Main Bus Stand"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: DOCUMENTS UPLOAD */}
              {step === 4 && (
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-teal-600" />
                    Verification Document Attachments
                  </h3>
                  <p className="text-xs text-slate-500">
                    Upload scanned photos or PDF copies of your licenses. Documents are stored in secure private storage and protected by DGDA compliance encryption.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Drug License Upload */}
                    <div className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                      drugLicenseFile ? "border-teal-500 bg-teal-50/50" : "border-slate-200 hover:border-teal-500 bg-slate-50"
                    }`}>
                      <FileCheck className={`w-6 h-6 mx-auto mb-2 ${drugLicenseFile ? "text-teal-600" : "text-slate-400"}`} />
                      <span className="block text-xs font-semibold text-slate-800">Drug License Scan</span>
                      <span className="text-[10px] text-slate-500">JPG, PNG, HEIC, PDF (Max 10MB)</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                        onChange={(e) => setDrugLicenseFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="drug-license-file"
                      />
                      <label
                        htmlFor="drug-license-file"
                        className={`mt-2 inline-flex items-center gap-1 px-3 py-1 border rounded text-[11px] font-medium cursor-pointer transition-colors ${
                          drugLicenseFile 
                            ? "bg-teal-600 text-white border-teal-600" 
                            : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {drugLicenseFile ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">{drugLicenseFile.name}</span>
                          </>
                        ) : (
                          "Select File"
                        )}
                      </label>
                    </div>

                    {/* Trade License Upload */}
                    <div className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                      tradeLicenseFile ? "border-teal-500 bg-teal-50/50" : "border-slate-200 hover:border-teal-500 bg-slate-50"
                    }`}>
                      <FileSpreadsheet className={`w-6 h-6 mx-auto mb-2 ${tradeLicenseFile ? "text-teal-600" : "text-slate-400"}`} />
                      <span className="block text-xs font-semibold text-slate-800">Trade License</span>
                      <span className="text-[10px] text-slate-500">JPG, PNG, HEIC, PDF (Max 10MB)</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                        onChange={(e) => setTradeLicenseFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="trade-license-file"
                      />
                      <label
                        htmlFor="trade-license-file"
                        className={`mt-2 inline-flex items-center gap-1 px-3 py-1 border rounded text-[11px] font-medium cursor-pointer transition-colors ${
                          tradeLicenseFile 
                            ? "bg-teal-600 text-white border-teal-600" 
                            : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {tradeLicenseFile ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">{tradeLicenseFile.name}</span>
                          </>
                        ) : (
                          "Select File"
                        )}
                      </label>
                    </div>

                    {/* Proprietor NID Upload */}
                    <div className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                      nidFile ? "border-teal-500 bg-teal-50/50" : "border-slate-200 hover:border-teal-500 bg-slate-50"
                    }`}>
                      <User className={`w-6 h-6 mx-auto mb-2 ${nidFile ? "text-teal-600" : "text-slate-400"}`} />
                      <span className="block text-xs font-semibold text-slate-800">Proprietor NID</span>
                      <span className="text-[10px] text-slate-500">JPG, PNG, HEIC, PDF (Max 10MB)</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                        onChange={(e) => setNidFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="nid-file"
                      />
                      <label
                        htmlFor="nid-file"
                        className={`mt-2 inline-flex items-center gap-1 px-3 py-1 border rounded text-[11px] font-medium cursor-pointer transition-colors ${
                          nidFile 
                            ? "bg-teal-600 text-white border-teal-600" 
                            : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {nidFile ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">{nidFile.name}</span>
                          </>
                        ) : (
                          "Select File"
                        )}
                      </label>
                    </div>
                  </div>

                  {uploadStatus && (
                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-800 flex items-center gap-2 animate-pulse">
                      <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
                      <span className="font-semibold">{uploadStatus}</span>
                    </div>
                  )}

                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2 mt-4">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Instant Verification Perks</p>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Verified partners enjoy wholesale volume pricing, official DGDA tax invoice generation, and priority express delivery across Bangladesh.
                      </p>
                    </div>
                  </div>

                  {/* Mandatory Regulatory & Legal Consent Agreement */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 mt-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="legal-consent-checkbox"
                        checked={acceptedLegalTerms}
                        onChange={(e) => {
                          setAcceptedLegalTerms(e.target.checked);
                          if (error) setError("");
                        }}
                        className="mt-1 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 cursor-pointer shrink-0"
                      />
                      <label htmlFor="legal-consent-checkbox" className="text-xs text-slate-700 leading-relaxed select-none cursor-pointer">
                        I agree to the{" "}
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setLegalModalTab("terms"); }}
                          className="text-teal-700 font-bold underline hover:text-teal-900 cursor-pointer"
                        >
                          Terms of Service
                        </button>
                        {", "}
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setLegalModalTab("privacy"); }}
                          className="text-teal-700 font-bold underline hover:text-teal-900 cursor-pointer"
                        >
                          Privacy Policy
                        </button>
                        {", and "}
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); setLegalModalTab("refund"); }}
                          className="text-teal-700 font-bold underline hover:text-teal-900 cursor-pointer"
                        >
                          Refund & Return Policy
                        </button>
                        {", and confirm all submitted regulatory documents (DGDA Drug License, Trade License, Proprietor NID) are authentic."}
                      </label>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/60 pl-7">
                      <span className="flex items-center gap-1 text-slate-600">
                        <Lock className="w-3.5 h-3.5 text-teal-600" />
                        256-Bit Encrypted Storage
                      </span>
                      <button
                        type="button"
                        onClick={() => setLegalModalTab("compliance")}
                        className="text-purple-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Scale className="w-3.5 h-3.5" />
                        DGDA Regulatory Notice
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Actions */}
              <div className="pt-4 flex items-center justify-between border-t border-slate-100 mt-6">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={loading}
                    className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                ) : (
                  <div />
                )}

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                  >
                    Next Step
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading || !acceptedLegalTerms}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-lg transition-colors cursor-pointer"
                  >
                    {loading ? (
                      <span>{uploadStatus || "Submitting Registration..."}</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Complete & Register Pharmacy
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.form>
          </AnimatePresence>
        )}
      </div>

      {/* Lazy Loaded Legal Policies Modal */}
      {legalModalTab && (
        <Suspense fallback={null}>
          <LegalPolicyModal
            isOpen={true}
            initialTab={legalModalTab}
            onClose={() => setLegalModalTab(null)}
            showAcceptButton={true}
            onAccept={() => {
              setAcceptedLegalTerms(true);
              setLegalModalTab(null);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
