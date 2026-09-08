import React, { useState, useEffect } from "react";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Truck, 
  ShieldCheck, 
  CheckCircle2, 
  Award, 
  Clock, 
  CreditCard, 
  AlertCircle, 
  Save, 
  Edit3, 
  X, 
  PhoneCall, 
  Bell, 
  LogOut, 
  Check, 
  Activity, 
  HeartHandshake, 
  IdCard,
  RefreshCw
} from "lucide-react";
import { RiderProfile as RiderProfileType, RiderDutyStatus, VehicleType } from "../types";
import { apiFetch } from "../lib/apiFetch";
import { pushManager } from "../pwa/pushManager";

interface RiderProfileProps {
  currentUser: { id: string; name: string; phone: string; role: string; email?: string };
  onLogout: () => void;
  onProfileUpdated?: (updated: RiderProfileType) => void;
}

const VEHICLE_OPTIONS: Array<{ value: VehicleType; label: string; icon: string }> = [
  { value: "Motorcycle", label: "মোটরসাইকেল (Motorcycle)", icon: "🏍️" },
  { value: "Bicycle", label: "বাইসাইকেল (Bicycle)", icon: "🚲" },
  { value: "Scooter", label: "ইলেকট্রিক স্কুটার (Scooter)", icon: "🛵" },
  { value: "Delivery Van", label: "ডেলিভারি ভ্যান (Van)", icon: "🚐" },
  { value: "Pickup", label: "পিকআপ / মিনি ট্রাক (Pickup)", icon: "🚚" }
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

export default function RiderProfile({ currentUser, onLogout, onProfileUpdated }: RiderProfileProps) {
  const [profile, setProfile] = useState<RiderProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    vehicleType: "Motorcycle" as VehicleType,
    vehicleNumber: "",
    drivingLicenseNo: "",
    nidNumber: "",
    zone: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    bloodGroup: "B+",
    dutyStatus: "On Duty" as RiderDutyStatus,
    avatarUrl: ""
  });

  // Push Notifications State
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  const fetchProfile = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiFetch("/api/delivery/profile");
      const data = await res.json();
      if (data.success && data.profile) {
        setProfile(data.profile);
        setFormData({
          name: data.profile.name || currentUser.name || "",
          phone: data.profile.phone || currentUser.phone || "",
          email: data.profile.email || currentUser.email || "",
          vehicleType: (data.profile.vehicleType as VehicleType) || "Motorcycle",
          vehicleNumber: data.profile.vehicleNumber || "",
          drivingLicenseNo: data.profile.drivingLicenseNo || "",
          nidNumber: data.profile.nidNumber || "",
          zone: data.profile.zone || "Rangpur Sadar & Central Depot",
          emergencyContactName: data.profile.emergencyContactName || "",
          emergencyContactPhone: data.profile.emergencyContactPhone || "",
          bloodGroup: data.profile.bloodGroup || "B+",
          dutyStatus: (data.profile.dutyStatus as RiderDutyStatus) || "On Duty",
          avatarUrl: data.profile.avatarUrl || ""
        });
      }
    } catch (err: any) {
      console.error("Error fetching rider profile:", err);
      setErrorMessage("প্রোফাইল লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে রিফ্রেশ করুন।");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    if (pushManager.isPushSupported()) {
      setPushEnabled(pushManager.getPermissionState() === "granted");
    }
  }, []);

  const handleDutyStatusChange = async (newStatus: RiderDutyStatus) => {
    setFormData(prev => ({ ...prev, dutyStatus: newStatus }));
    if (profile) {
      setProfile(prev => prev ? { ...prev, dutyStatus: newStatus } : null);
    }
    try {
      const res = await apiFetch("/api/delivery/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, dutyStatus: newStatus })
      });
      const data = await res.json();
      if (data.success && data.profile) {
        setProfile(prev => prev ? { ...prev, ...data.profile } : data.profile);
        if (onProfileUpdated) onProfileUpdated(data.profile);
      }
    } catch (err) {
      console.error("Failed to update duty status:", err);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMessage("অনুগ্রহ করে আপনার পুরো নাম প্রদান করুন।");
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMessage("অনুগ্রহ করে আপনার সক্রিয় মোবাইল নম্বর প্রদান করুন।");
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await apiFetch("/api/delivery/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "প্রোফাইল সংরক্ষণ ব্যর্থ হয়েছে");
      }

      setProfile(prev => prev ? { ...prev, ...data.profile } : data.profile);
      setIsEditing(false);
      setSuccessMessage("রাইডার প্রোফাইল সফলভাবে আপডেট করা হয়েছে!");
      if (onProfileUpdated) onProfileUpdated(data.profile);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "সংরক্ষণে ত্রুটি হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePush = async () => {
    setPushLoading(true);
    try {
      if (pushEnabled) {
        await pushManager.unsubscribe();
        setPushEnabled(false);
      } else {
        const res = await pushManager.subscribe(currentUser.id, formData.name || "Delivery Rider");
        if (res.success) {
          setPushEnabled(true);
          setSuccessMessage("পুশ নোটিফিকেশন সফলভাবে চালু করা হয়েছে!");
          setTimeout(() => setSuccessMessage(null), 3000);
        }
      }
    } catch (err) {
      console.error("Push toggle error:", err);
    } finally {
      setPushLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-3 border-purple-600 border-t-transparent mb-3"></div>
        <p className="text-sm font-bold text-slate-500">রাইডার প্রোফাইল লোড হচ্ছে...</p>
      </div>
    );
  }

  const dutyStatus = profile?.dutyStatus || formData.dutyStatus;
  const shortId = (currentUser.id || "RDR").slice(0, 8).toUpperCase();

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-8">
      {/* Toast Notifications */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-xs sm:text-sm font-bold">{successMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-sm animate-fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="text-xs sm:text-sm font-bold">{errorMessage}</p>
        </div>
      )}

      {/* Hero / Identity Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm relative overflow-hidden">
        {/* Background accent glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-purple-100/60 to-transparent rounded-bl-full pointer-events-none -mr-10 -mt-10" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            {/* Avatar with Status Pip */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-brand-purple to-purple-600 text-white font-black text-2xl flex items-center justify-center shadow-md border-2 border-white">
                {formData.avatarUrl ? (
                  <img 
                    src={formData.avatarUrl} 
                    alt={formData.name} 
                    className="w-full h-full object-cover rounded-2xl" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  formData.name ? formData.name.slice(0, 2).toUpperCase() : "DR"
                )}
              </div>
              {/* Duty Indicator Dot */}
              <span 
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${
                  dutyStatus === "On Duty" 
                    ? "bg-emerald-500" 
                    : dutyStatus === "On Break" 
                    ? "bg-amber-500" 
                    : "bg-slate-400"
                }`}
                title={`Status: ${dutyStatus}`}
              />
            </div>

            {/* Name and Meta */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                  {formData.name || "মেডিচেইন রাইডার"}
                </h2>
                <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3 text-purple-600" />
                  Verified Hero
                </span>
              </div>
              <p className="text-xs font-bold text-slate-500 mt-0.5 flex items-center gap-1.5">
                <span>ID: #{shortId}</span>
                <span>•</span>
                <span>{formData.phone || "No phone"}</span>
              </p>
              <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate max-w-[200px] sm:max-w-xs">{formData.zone || "Central Depot Zone"}</span>
              </p>
            </div>
          </div>

          {/* Quick Edit Toggle Button */}
          <div className="w-full sm:w-auto flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            <button
              onClick={() => {
                setIsEditing(!isEditing);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 sm:flex-none h-10 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs ${
                isEditing 
                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200" 
                  : "bg-brand-purple text-white hover:bg-purple-800"
              }`}
            >
              {isEditing ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  বাতিল করুন
                </>
              ) : (
                <>
                  <Edit3 className="w-3.5 h-3.5" />
                  প্রোফাইল এডিট
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Duty Status Switcher */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-purple-600" />
            লাইভ ডিউটি স্ট্যাটাস (Duty Status)
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDutyStatusChange("On Duty")}
              className={`h-11 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                dutyStatus === "On Duty"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              On Duty
            </button>

            <button
              type="button"
              onClick={() => handleDutyStatusChange("On Break")}
              className={`h-11 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                dutyStatus === "On Break"
                  ? "bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-500/20"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              On Break
            </button>

            <button
              type="button"
              onClick={() => handleDutyStatusChange("Off Duty")}
              className={`h-11 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                dutyStatus === "Off Duty"
                  ? "bg-slate-700 text-white border-slate-700 shadow-md"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Off Duty
            </button>
          </div>
        </div>
      </div>

      {/* Lifetime & Performance Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">মোট সম্পন্ন</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-black text-slate-900">{profile?.totalDelivered ?? 0}</p>
          <p className="text-[10px] font-bold text-emerald-600 mt-0.5">পার্সেল হ্যান্ডওভার</p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">মোট ক্যাশ আদায়</span>
            <CreditCard className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-xl font-black text-purple-700">৳{(profile?.totalCollected ?? 0).toLocaleString()}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-0.5">১০০% COD সংগ্রহ</p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">সফলতার হার</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-black text-slate-900">{profile?.successRate ?? 100}%</p>
          <p className="text-[10px] font-bold text-amber-600 mt-0.5">রেটিং ★ {profile?.rating || "4.9"}</p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">আজকের ডেলিভারি</span>
            <Truck className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-xl font-black text-indigo-700">{profile?.todayDelivered ?? 0}</p>
          <p className="text-[10px] font-bold text-indigo-500 mt-0.5">আজকে ৳{(profile?.todayCollected ?? 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Main Profile Form / Details View */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <IdCard className="w-4 h-4 text-purple-600" />
              রাইডার তথ্য ও লজিস্টিক বিবরণ
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {isEditing ? "নিচের ফর্মটি পূরণ করে তথ্য সংরক্ষণ করুন" : "আপনার অফিসিয়াল ডেলিভারি প্রোফাইল তথ্য"}
            </p>
          </div>
          {isEditing && (
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 bg-amber-100 text-amber-800 rounded-lg">
              Editing Mode
            </span>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-5">
          {/* Section 1: Personal Details */}
          <div>
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              ব্যক্তিগত তথ্য (Personal Info)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  পুরো নাম <span className="text-rose-500">*</span>
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="উদা: মোঃ সোহেল রানা"
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                  />
                ) : (
                  <div className="h-11 px-3.5 bg-slate-50 rounded-xl flex items-center border border-slate-100 text-sm font-bold text-slate-900">
                    {formData.name || "N/A"}
                  </div>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  মোবাইল নম্বর <span className="text-rose-500">*</span>
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="উদা: 017XXXXXXXX"
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                  />
                ) : (
                  <div className="h-11 px-3.5 bg-slate-50 rounded-xl flex items-center border border-slate-100 text-sm font-bold text-slate-900">
                    {formData.phone || "N/A"}
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ইমেইল ঠিকানা
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="rider@medichainbd.com"
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                  />
                ) : (
                  <div className="h-11 px-3.5 bg-slate-50 rounded-xl flex items-center border border-slate-100 text-sm font-medium text-slate-700 truncate">
                    {formData.email || "N/A"}
                  </div>
                )}
              </div>

              {/* Blood Group */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  রক্তের গ্রুপ (Blood Group)
                </label>
                {isEditing ? (
                  <select
                    value={formData.bloodGroup}
                    onChange={e => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all cursor-pointer"
                  >
                    {BLOOD_GROUPS.map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                ) : (
                  <div className="h-11 px-3.5 bg-slate-50 rounded-xl flex items-center border border-slate-100 text-sm font-bold text-purple-700">
                    {formData.bloodGroup || "B+"}
                  </div>
                )}
              </div>

              {/* National ID (NID) */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  জাতীয় পরিচয়পত্র নম্বর (NID Number)
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.nidNumber}
                    onChange={e => setFormData({ ...formData, nidNumber: e.target.value })}
                    placeholder="উদা: 1995471829384"
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                  />
                ) : (
                  <div className="h-11 px-3.5 bg-slate-50 rounded-xl flex items-center border border-slate-100 text-sm font-medium text-slate-700">
                    {formData.nidNumber || "যাচাইকৃত (Verified on File)"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Vehicle & Logistics Details */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-slate-400" />
              বাহন ও অপারেটিং এলাকা (Vehicle & Area)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Vehicle Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  বাহনের ধরন (Vehicle Type)
                </label>
                {isEditing ? (
                  <select
                    value={formData.vehicleType}
                    onChange={e => setFormData({ ...formData, vehicleType: e.target.value as VehicleType })}
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all cursor-pointer"
                  >
                    {VEHICLE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.icon} {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="h-11 px-3.5 bg-slate-50 rounded-xl flex items-center border border-slate-100 text-sm font-bold text-slate-900">
                    {formData.vehicleType || "Motorcycle"}
                  </div>
                )}
              </div>

              {/* Vehicle Plate Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  গাড়ির নম্বর / রেজিস্ট্রেশন প্লেট
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.vehicleNumber}
                    onChange={e => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                    placeholder="উদা: DHAKA METRO-HA 12-3456"
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all font-mono"
                  />
                ) : (
                  <div className="h-11 px-3.5 bg-slate-50 rounded-xl flex items-center border border-slate-100 text-sm font-mono font-bold text-slate-900">
                    {formData.vehicleNumber || "DHAKA METRO-HA 12-3456"}
                  </div>
                )}
              </div>

              {/* Driving License */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ড্রাইভিং লাইসেন্স নম্বর
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.drivingLicenseNo}
                    onChange={e => setFormData({ ...formData, drivingLicenseNo: e.target.value })}
                    placeholder="উদা: DL-BD-893421"
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all font-mono"
                  />
                ) : (
                  <div className="h-11 px-3.5 bg-slate-50 rounded-xl flex items-center border border-slate-100 text-sm font-mono font-medium text-slate-700">
                    {formData.drivingLicenseNo || "DL-BD-893421"}
                  </div>
                )}
              </div>

              {/* Operating Zone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  অপারেটিং ডেলিভারি জোন
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.zone}
                    onChange={e => setFormData({ ...formData, zone: e.target.value })}
                    placeholder="উদা: Rangpur Sadar & Central Depot"
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                  />
                ) : (
                  <div className="h-11 px-3.5 bg-slate-50 rounded-xl flex items-center border border-slate-100 text-sm font-bold text-slate-900">
                    {formData.zone || "Rangpur Sadar"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Emergency Contact */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <HeartHandshake className="w-3.5 h-3.5 text-rose-500" />
              জরুরি যোগাযোগ (Emergency Contact)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Emergency Contact Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  জরুরি ব্যক্তির নাম / সম্পর্ক
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.emergencyContactName}
                    onChange={e => setFormData({ ...formData, emergencyContactName: e.target.value })}
                    placeholder="উদা: পিতা / ভাই / বন্ধু"
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                  />
                ) : (
                  <div className="h-11 px-3.5 bg-slate-50 rounded-xl flex items-center border border-slate-100 text-sm font-medium text-slate-700">
                    {formData.emergencyContactName || "ডিপো অপারেশনস হেল্পলাইন"}
                  </div>
                )}
              </div>

              {/* Emergency Contact Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  জরুরি মোবাইল নম্বর
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.emergencyContactPhone}
                    onChange={e => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                    placeholder="+8801940681989"
                    className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all font-mono"
                  />
                ) : (
                  <div className="h-11 px-3.5 bg-slate-50 rounded-xl flex items-center border border-slate-100 text-sm font-mono font-bold text-slate-900">
                    {formData.emergencyContactPhone || "+8801940681989"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Action Buttons (in edit mode) */}
          {isEditing && (
            <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    সংরক্ষণ হচ্ছে...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    পরিবর্তন সংরক্ষণ করুন
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  fetchProfile();
                }}
                className="px-5 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors cursor-pointer"
              >
                বাতিল
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Notifications & Support Tools */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
          সিস্টেম ও হেল্পলাইন (System & Support)
        </h4>

        {/* Web Push Notification Toggle */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900">মোবাইল পুশ নোটিফিকেশন</p>
              <p className="text-[11px] text-slate-500 font-medium">নতুন ডেলিভারি অ্যাসাইন হলে তাৎক্ষণিক অ্যালার্ট পান</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleTogglePush}
            disabled={pushLoading}
            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
              pushEnabled 
                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200" 
                : "bg-purple-600 text-white hover:bg-purple-700"
            }`}
          >
            {pushLoading ? "..." : pushEnabled ? "চালু আছে ✓" : "চালু করুন"}
          </button>
        </div>

        {/* Support Hotline */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900">ডিপো কন্ট্রোল রুম হেল্পলাইন</p>
              <p className="text-[11px] text-slate-500 font-medium">জরুরি সাহায্য বা রাস্তা সংক্রান্ত তথ্যের জন্য</p>
            </div>
          </div>
          <a
            href="tel:+8801940681989"
            className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:text-purple-600 hover:border-purple-200 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs"
          >
            <Phone className="w-3 h-3 text-emerald-600" />
            কল করুন
          </a>
        </div>

        {/* Logout Action */}
        <div className="pt-2">
          <button
            onClick={onLogout}
            className="w-full h-11 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            লগআউট করুন (Logout)
          </button>
        </div>
      </div>
    </div>
  );
}
