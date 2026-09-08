import React, { useState, useEffect } from "react";
import { Bell, BellRing, CheckCircle2, Sparkles, X, Smartphone, ShieldCheck } from "lucide-react";
import { pushManager } from "../pwa/pushManager";

interface PushNotificationPromptProps {
  userId?: string | null;
  pharmacyName?: string | null;
}

export default function PushNotificationPrompt({ userId, pharmacyName }: PushNotificationPromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check if push is supported and permission is not already decided
    if (!pushManager.isPushSupported()) return;

    const permission = pushManager.getPermissionState();
    if (permission === "granted") {
      // Already granted, silently make sure backend has current subscription
      pushManager.getExistingSubscription().then(sub => {
        if (!sub) {
          pushManager.subscribe(userId, pharmacyName).catch(() => {});
        }
      });
      return;
    }

    if (permission === "denied") return;

    // Check if user dismissed recently (24 hours cooldown)
    const dismissedAt = localStorage.getItem("medichain_push_prompt_dismissed");
    if (dismissedAt) {
      const hoursSince = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60);
      if (hoursSince < 24) return;
    }

    // Check if standalone PWA or appinstalled event fired
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || 
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    // Show prompt after 2.5 seconds delay on standalone PWA or mobile browser
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, isStandalone ? 1500 : 4000);

    // Listen for PWA install event
    const handleAppInstalled = () => {
      console.log("[PWA] App installation completed, triggering push prompt!");
      setIsVisible(true);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [userId, pharmacyName]);

  const handleEnablePush = async () => {
    setIsSubscribing(true);
    setErrorMessage(null);

    const result = await pushManager.subscribe(userId, pharmacyName);
    setIsSubscribing(false);

    if (result.success) {
      setIsSubscribed(true);
      // Send welcome test push to user's device
      pushManager.sendTestPush(userId).catch(() => {});

      setTimeout(() => {
        setIsVisible(false);
      }, 3500);
    } else {
      setErrorMessage(result.error || "নোটিফিকেশন চালু করা সম্ভব হয়নি।");
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("medichain_push_prompt_dismissed", Date.now().toString());
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-xl text-white rounded-3xl p-5 shadow-2xl border border-purple-500/30 relative overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-lime/15 rounded-full blur-2xl pointer-events-none"></div>

        <button
          onClick={handleDismiss}
          className="absolute top-3.5 right-3.5 text-slate-400 hover:text-white p-1 rounded-full bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
          aria-label="Close prompt"
        >
          <X className="w-4 h-4" />
        </button>

        {isSubscribed ? (
          <div className="flex items-center gap-3 py-2">
            <div className="w-12 h-12 rounded-2xl bg-brand-lime/20 border border-brand-lime/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-brand-lime animate-bounce" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                মোবাইল নোটিফিকেশন সক্রিয় হয়েছে! 🎉
              </h4>
              <p className="text-xs text-purple-200/90 mt-0.5">
                আপনার ফোনে একটি কনফার্মেশন টেস্ট নোটিফিকেশন পাঠানো হয়েছে।
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-purple to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-purple-950/50">
                <BellRing className="w-5 h-5 text-brand-lime animate-pulse" />
              </div>
              <div className="pr-4">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] bg-brand-lime text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                    PWA ইনস্টল সুবিধা
                  </span>
                  <span className="text-[10px] text-purple-200 font-bold flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-brand-lime" />
                    সরাসরি ফোনে
                  </span>
                </div>
                <h4 className="text-sm font-black text-white leading-snug">
                  ফোনে সরাসরি ডেলিভারি ও ডিসকাউন্ট নোটিফিকেশন চান?
                </h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  অর্ডারের লাইভ ট্র্যাকিং আপডেট এবং প্রতিদিনের সর্বোচ্চ পাইকারি অফার মিস না করতে নোটিফিকেশন চালু করুন।
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs px-3 py-2 rounded-xl">
                {errorMessage}
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={isSubscribing}
                className="flex-1 bg-brand-lime hover:bg-lime-400 text-slate-950 font-black text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-lime-950/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubscribing ? (
                  <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Bell className="w-3.5 h-3.5" />
                    <span>নোটিফিকেশন চালু করুন</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-xs py-2.5 px-3.5 rounded-xl transition-all cursor-pointer"
              >
                পরে করব
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
