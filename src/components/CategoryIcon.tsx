import React from "react";
import { 
  Pill, 
  Syringe, 
  Eye, 
  Sparkles, 
  ShieldAlert, 
  Activity, 
  Package, 
  HeartPulse, 
  Droplet, 
  Thermometer,
  ShieldCheck,
  Stethoscope
} from "lucide-react";

export function getCategoryConfig(categoryName: string = "") {
  const cat = categoryName.toLowerCase();
  if (cat.includes("tablet") || cat.includes("capsule") || cat.includes("pill")) {
    return { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" };
  }
  if (cat.includes("injection") || cat.includes("vaccine") || cat.includes("infusion")) {
    return { bg: "bg-rose-50", text: "text-rose-600", border: "border-rose-200" };
  }
  if (cat.includes("syrup") || cat.includes("suspension") || cat.includes("drop") || cat.includes("liquid")) {
    return { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" };
  }
  if (cat.includes("eye") || cat.includes("ear")) {
    return { bg: "bg-cyan-50", text: "text-cyan-600", border: "border-cyan-200" };
  }
  if (cat.includes("cardio") || cat.includes("heart")) {
    return { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" };
  }
  if (cat.includes("antibiotic")) {
    return { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" };
  }
  return { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200" };
}

interface CategoryIconProps {
  name: string;
  className?: string;
}

export default function CategoryIcon({ name, className = "w-5 h-5" }: CategoryIconProps) {
  const cat = (name || "").toLowerCase();

  if (cat.includes("tablet") || cat.includes("capsule")) {
    return <Pill className={className} />;
  }
  if (cat.includes("injection") || cat.includes("vaccine") || cat.includes("infusion")) {
    return <Syringe className={className} />;
  }
  if (cat.includes("eye") || cat.includes("ear")) {
    return <Eye className={className} />;
  }
  if (cat.includes("syrup") || cat.includes("suspension") || cat.includes("drop")) {
    return <Droplet className={className} />;
  }
  if (cat.includes("cardio") || cat.includes("heart")) {
    return <HeartPulse className={className} />;
  }
  if (cat.includes("antibiotic")) {
    return <ShieldCheck className={className} />;
  }
  if (cat.includes("analgesic") || cat.includes("fever") || cat.includes("antipyretic")) {
    return <Thermometer className={className} />;
  }
  if (cat.includes("respiratory") || cat.includes("inhaler")) {
    return <Activity className={className} />;
  }
  return <Package className={className} />;
}
