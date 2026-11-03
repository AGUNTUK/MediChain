import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle,
  Sparkles
} from "lucide-react";
import MediChainLogo from "./MediChainLogo";
import { profileService } from "../services";

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
  // Frictionless 2-step setup (No mandatory licenses, NID, or photo uploads)
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1: Business & Owner Details
  const [pharmacyName, setPharmacyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState("");

  // Step 2: Location & Address
  const [division, setDivision] = useState("Dhaka");
  const [district, setDistrict] = useState("Dhaka");
  const [thana, setThana] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");

  const [loading, setLoading] = useState(false);
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
      if (!thana.trim()) {
        setError("Thana / Upazila name is required for depot assignment.");
        return false;
      }
      if (!address.trim()) {
        setError("Detailed street address is required for B2B delivery.");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(2);
    }
  };

  const handlePrev = () => {
    setError("");
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2)) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const fullAddress = `${address.trim()}, ${thana.trim()}, ${district.trim()}, ${division}${landmark.trim() ? ` (Near ${landmark.trim()})` : ""}`;
      const payload = {
        pharmacyName: pharmacyName.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        licenseNo: "Optional/Pending",
        tradeLicenseNo: "Optional/Pending",
        address: fullAddress,
        city: district.trim(),
        division,
        district: district.trim(),
        thana: thana.trim(),
        landmark: landmark.trim() || undefined,
        status: "Pending",
        submittedAt: new Date().toISOString()
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
        setError("Failed to submit pharmacy registration. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col my-4">
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
                Frictionless B2B Medicine Procurement Network
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
        <div className="grid grid-cols-2 gap-3 mt-6">
          {[
            { num: 1, label: "Business Details" },
            { num: 2, label: "Delivery Address" }
          ].map((item) => (
            <div key={item.num} className="flex flex-col gap-1">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step >= item.num ? "bg-emerald-400" : "bg-white/20"
                }`}
              />
              <span
                className={`text-xs font-medium text-center ${
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
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {submittedSuccess ? (
          <div className="text-center py-8 px-4 flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-4 shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Registration Completed!</h3>
            <p className="text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
              Your pharmacy profile for <span className="font-semibold text-slate-900">{pharmacyName}</span> is set up and ready for B2B medicine procurement.
            </p>
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 max-w-sm mb-6 text-left flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-900">What happens next?</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Your store is mapped to the nearest regional depot for express wholesale medicine delivery.
                </p>
              </div>
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
              onSubmit={step === 2 ? handleSubmit : (e) => e.preventDefault()}
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
                      Proprietor / Owner Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="Full Name of Owner"
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
                          placeholder="01700-000000"
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

              {/* STEP 2: LOCATION & ADDRESS */}
              {step === 2 && (
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-teal-600" />
                    Delivery Address & Regional Depot Mapping
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
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
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
                        placeholder="e.g. Dhaka North / Gazipur / Bogura"
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
                      placeholder="e.g. Uttara / Dhanmondi / Mirpur / Sadar"
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
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nearest Landmark (Optional, for Courier)</label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Opposite Central Hospital / Near Main Bus Stand"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              )}

              {/* Navigation Actions */}
              <div className="pt-4 flex items-center justify-between border-t border-slate-100 mt-6">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                ) : (
                  <div />
                )}

                {step === 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                  >
                    Continue to Address
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-lg transition-colors cursor-pointer"
                  >
                    {loading ? (
                      <span>Completing Registration...</span>
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
    </div>
  );
}
