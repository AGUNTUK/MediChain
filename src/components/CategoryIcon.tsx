import React from "react";

interface CategoryIconProps {
  name: string;
  className?: string;
  size?: number;
}

interface CategoryStyle {
  bg: string;
  border: string;
  text: string;
  icon: React.ReactNode;
}

export function getCategoryConfig(name: string): CategoryStyle {
  const norm = (name || "").trim().toLowerCase();

  // 1. Tablet (Round scored tablet, Chewable, Effervescent)
  if (norm.includes("tablet") || norm.includes("tab") || norm.includes("bolus") || norm.includes("pill")) {
    return {
      bg: "bg-rose-50 hover:bg-rose-100/80",
      border: "border-rose-200/70",
      text: "text-rose-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="3" x2="12" y2="21" />
        </svg>
      )
    };
  }

  // 2. Capsule (Oblong two-tone medicine capsule, Softgel, Rotacaps)
  if (norm.includes("capsule") || norm.includes("cap") || norm.includes("softgel") || norm.includes("rotacap")) {
    return {
      bg: "bg-purple-50 hover:bg-purple-100/80",
      border: "border-purple-200/70",
      text: "text-purple-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
          <line x1="8.5" y1="8.5" x2="15.5" y2="15.5" />
        </svg>
      )
    };
  }

  // 3. Syrup (Liquid bottle with measuring spoon)
  if (norm.includes("syrup") || norm.includes("oral liquid") || norm.includes("elixir") || norm.includes("mixture")) {
    return {
      bg: "bg-amber-50 hover:bg-amber-100/80",
      border: "border-amber-200/70",
      text: "text-amber-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="M9 3h6v3H9z" />
          <path d="M10 6v2a4 4 0 0 1-4 4H5a2 2 0 0 0-2 2v7a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3v-7a2 2 0 0 0-2-2h-1a4 4 0 0 1-4-4V6" />
          <line x1="7" y1="16" x2="17" y2="16" />
          <circle cx="12" cy="16" r="1" fill="currentColor" />
        </svg>
      )
    };
  }

  // 4. Suspension & Solution (Flask / medicinal suspension bottle)
  if (norm.includes("suspension") || norm.includes("solution") || norm.includes("saline") || norm.includes("emulsion")) {
    return {
      bg: "bg-orange-50 hover:bg-orange-100/80",
      border: "border-orange-200/70",
      text: "text-orange-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="M10 2h4" />
          <path d="M12 2v6" />
          <path d="M7 8h10l3 11a2 2 0 0 1-2 3H6a2 2 0 0 1-2-3L7 8z" />
          <path d="M6 15c2-1 4 1 6 0s4-1 6 0" />
          <circle cx="10" cy="18" r="0.75" fill="currentColor" />
          <circle cx="14" cy="19" r="0.75" fill="currentColor" />
        </svg>
      )
    };
  }

  // 5. Drops (Eye / Ear / Pediatric Dropper)
  if (norm.includes("drop")) {
    return {
      bg: "bg-sky-50 hover:bg-sky-100/80",
      border: "border-sky-200/70",
      text: "text-sky-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          <path d="M12 9a3 3 0 0 0-3 3" />
        </svg>
      )
    };
  }

  // 6. Injection (Hypodermic syringe)
  if (norm.includes("injection") || norm.includes("inj") || norm.includes("syringe") || norm.includes("ampoule") || norm.includes("vial")) {
    return {
      bg: "bg-cyan-50 hover:bg-cyan-100/80",
      border: "border-cyan-200/70",
      text: "text-cyan-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="m18 2 4 4" />
          <path d="m17 7 3-3" />
          <path d="M19 9 8.7 19.3c-.4.4-1 .4-1.4 0l-2.6-2.6c-.4-.4-.4-1 0-1.4L15 5" />
          <path d="m9 11 4 4" />
          <path d="m5 19-3 3" />
          <path d="m14 4 6 6" />
        </svg>
      )
    };
  }

  // 7. Infusion / IV Drip (Intravenous drip bag with tubing & chamber)
  if (norm.includes("infusion") || norm.includes("iv drip") || norm.includes("iv saline") || norm.includes("drip")) {
    return {
      bg: "bg-blue-50 hover:bg-blue-100/80",
      border: "border-blue-200/70",
      text: "text-blue-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          {/* Top Hanger */}
          <path d="M10 2h4" />
          <path d="M12 2v2" />
          {/* IV Bag */}
          <path d="M7 4h10a1 1 0 0 1 1 1v10a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V5a1 1 0 0 1 1-1z" />
          {/* Liquid level */}
          <line x1="8" y1="11" x2="16" y2="11" strokeDasharray="2 2" />
          {/* Cross on bag */}
          <path d="M12 7v4M10 9h4" />
          {/* Drip chamber & Tube */}
          <path d="M12 18v3" />
          <path d="M11 21h2" />
        </svg>
      )
    };
  }

  // 8. Inhaler & Nebulizer (Asthma respiratory puff inhaler)
  if (norm.includes("inhaler") || norm.includes("aerosol") || norm.includes("rotahaler") || norm.includes("nebulizer")) {
    return {
      bg: "bg-teal-50 hover:bg-teal-100/80",
      border: "border-teal-200/70",
      text: "text-teal-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          {/* Inhaler Canister & Body */}
          <path d="M8 2h6a1 1 0 0 1 1 1v10l5 3a2 2 0 0 1 1 1.7V20a2 2 0 0 1-2 2H9a3 3 0 0 1-3-3V3a1 1 0 0 1 1-1z" />
          <path d="M10 2v3h4V2" />
          {/* Mouthpiece Spray opening */}
          <path d="M17 18h4" />
          {/* Spray mist particles */}
          <circle cx="21" cy="15" r="0.75" fill="currentColor" />
          <circle cx="22" cy="18" r="0.75" fill="currentColor" />
          <circle cx="20" cy="21" r="0.75" fill="currentColor" />
        </svg>
      )
    };
  }

  // 9. Cream / Ointment / Gel / Lotion (Topical medicine tube)
  if (norm.includes("cream") || norm.includes("ointment") || norm.includes("gel") || norm.includes("lotion") || norm.includes("scalp") || norm.includes("shampoo")) {
    return {
      bg: "bg-emerald-50 hover:bg-emerald-100/80",
      border: "border-emerald-200/70",
      text: "text-emerald-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          {/* Squeeze Tube Body */}
          <path d="m19 5-3-3L4.5 13.5a3 3 0 0 0 0 4.24l1.76 1.76a3 3 0 0 0 4.24 0L22 8l-3-3z" />
          {/* Tube Cap / Nozzle */}
          <path d="M3 19l2 2" />
          <path d="M2 22l2-2" />
          {/* Medical mark */}
          <path d="M12 9l3 3" />
        </svg>
      )
    };
  }

  // 10. Powder / Sachet (Medicinal powder packet)
  if (norm.includes("powder") || norm.includes("sachet") || norm.includes("ors") || norm.includes("granule")) {
    return {
      bg: "bg-yellow-50 hover:bg-yellow-100/80",
      border: "border-yellow-200/70",
      text: "text-yellow-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M5 7h14" />
          <path d="M12 11v6M9 14h6" />
        </svg>
      )
    };
  }

  // 11. Nasal Spray & Topical Spray
  if (norm.includes("nasal") || norm.includes("spray")) {
    return {
      bg: "bg-indigo-50 hover:bg-indigo-100/80",
      border: "border-indigo-200/70",
      text: "text-indigo-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <rect x="7" y="11" width="10" height="11" rx="2" />
          <path d="M12 11V6" />
          <path d="M10 6h4" />
          <path d="M12 6V3" />
          <path d="M14 2l2-1" />
          <path d="M15 4l2 1" />
        </svg>
      )
    };
  }

  // 12. Suppository / Pessary / Enema
  if (norm.includes("suppository") || norm.includes("pessary") || norm.includes("enema")) {
    return {
      bg: "bg-fuchsia-50 hover:bg-fuchsia-100/80",
      border: "border-fuchsia-200/70",
      text: "text-fuchsia-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="M12 2C8.5 7 8 13 8 18a4 4 0 0 0 8 0c0-5-.5-11-4-16z" />
          <line x1="8" y1="16" x2="16" y2="16" />
        </svg>
      )
    };
  }

  // 13. Patch (Transdermal patch)
  if (norm.includes("patch")) {
    return {
      bg: "bg-amber-50 hover:bg-amber-100/80",
      border: "border-amber-200/70",
      text: "text-amber-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <rect x="8" y="8" width="8" height="8" rx="1" strokeDasharray="2 2" />
        </svg>
      )
    };
  }

  // 14. Insulin / Vaccine
  if (norm.includes("insulin") || norm.includes("vaccine")) {
    return {
      bg: "bg-blue-50 hover:bg-blue-100/80",
      border: "border-blue-200/70",
      text: "text-blue-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <rect x="8" y="7" width="8" height="14" rx="2" />
          <path d="M10 7V4h4v3" />
          <line x1="12" y1="2" x2="12" y2="4" />
          <line x1="8" y1="12" x2="16" y2="12" />
          <path d="M12 15v3M10.5 16.5h3" />
        </svg>
      )
    };
  }

  // 15. Medical Devices / Surgical Items
  if (norm.includes("device") || norm.includes("surgical") || norm.includes("instrument")) {
    return {
      bg: "bg-slate-100 hover:bg-slate-200/80",
      border: "border-slate-300/70",
      text: "text-slate-700",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
          <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
          <circle cx="20" cy="10" r="2" />
        </svg>
      )
    };
  }

  // 16. Dressing / Bandage / First Aid
  if (norm.includes("dressing") || norm.includes("bandage") || norm.includes("first aid") || norm.includes("gauze")) {
    return {
      bg: "bg-red-50 hover:bg-red-100/80",
      border: "border-red-200/70",
      text: "text-red-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <rect x="3" y="3" width="18" height="18" rx="4" />
          <path d="M12 7v10M7 12h10" />
        </svg>
      )
    };
  }

  // 17. Gloves / Masks
  if (norm.includes("glove") || norm.includes("mask")) {
    return {
      bg: "bg-teal-50 hover:bg-teal-100/80",
      border: "border-teal-200/70",
      text: "text-teal-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="M4 9h16a2 2 0 0 1 2 2v3a6 6 0 0 1-6 6H8a6 6 0 0 1-6-6v-3a2 2 0 0 1 2-2z" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="16" x2="20" y2="16" />
        </svg>
      )
    };
  }

  // 18. Herbal / Ayurvedic / Homeopathic
  if (norm.includes("herbal") || norm.includes("ayurvedic") || norm.includes("homeopathic")) {
    return {
      bg: "bg-emerald-50 hover:bg-emerald-100/80",
      border: "border-emerald-200/70",
      text: "text-emerald-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
        </svg>
      )
    };
  }

  // 19. Vitamins & Supplements
  if (norm.includes("vitamin") || norm.includes("supplement")) {
    return {
      bg: "bg-amber-50 hover:bg-amber-100/80",
      border: "border-amber-200/70",
      text: "text-amber-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      )
    };
  }

  // 20. Diabetic Care
  if (norm.includes("diabetic") || norm.includes("glucose") || norm.includes("blood")) {
    return {
      bg: "bg-rose-50 hover:bg-rose-100/80",
      border: "border-rose-200/70",
      text: "text-rose-600",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
          <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z" />
          <line x1="12" y1="6" x2="12" y2="12" />
          <line x1="9" y1="9" x2="15" y2="9" />
        </svg>
      )
    };
  }

  // Default: Medical Box
  return {
    bg: "bg-slate-50 hover:bg-slate-100/80",
    border: "border-slate-200/70",
    text: "text-slate-600",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    )
  };
}

export default function CategoryIcon({ name, className = "w-5 h-5" }: CategoryIconProps) {
  const config = getCategoryConfig(name);
  return (
    <div className={`inline-flex items-center justify-center ${config.text} ${className}`}>
      {config.icon}
    </div>
  );
}
