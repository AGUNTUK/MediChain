import React, { useState, Suspense, lazy } from "react";
import MediChainLogo from "./MediChainLogo";
import { motion } from "motion/react";
import { Mail, Lock, User, RefreshCw, AlertCircle, ArrowRight, ShieldCheck, UserPlus, LogIn } from "lucide-react";
import { authService } from "../services";
import type { LegalPolicyTab } from "./LegalPolicyModal";

const LegalPolicyModal = lazy(() => import("./LegalPolicyModal"));

const GoogleIcon = () => (
  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

interface LoginProps {
  onLoginSuccess: (user: any, needsSetup: boolean, pharmacy?: any) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [legalModalTab, setLegalModalTab] = useState<LegalPolicyTab | null>(null);

  const handleGoogleSignIn = async () => {
    setError("");
    setSuccessMsg("");
    setGoogleLoading(true);

    try {
      const data = await authService.signInWithGoogle();
      if (data && (data as any).user) {
        setSuccessMsg("Logged in with Google successfully!");
        setTimeout(() => {
          onLoginSuccess((data as any).user, (data as any).needsSetup, (data as any).pharmacy);
        }, 400);
      }
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      setError(err.message || "Failed to initialize Google Sign-In. Please try again.");
      setGoogleLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (mode === "signup" && !name) {
      setError("Please provide your full name.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      if (mode === "login") {
        const data = await authService.login(email, password);
        setSuccessMsg("Logged in successfully!");
        setTimeout(() => {
          onLoginSuccess(data.user, data.needsSetup, data.pharmacy);
        }, 500);
      } else {
        await authService.signUp(email, password, name, "Pharmacy Owner");
        setSuccessMsg("Account created. Please log in.");
        setMode("login");
      }
    } catch (err: any) {
      if (err.fields) {
        setError(Object.values(err.fields).join(" "));
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Authentication failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full bg-brand-bg flex flex-col justify-between p-6 select-none relative overflow-y-auto">
      {/* Upper Logo Section */}
      <div className="flex flex-col items-center mt-6">
        <MediChainLogo size="lg" withText={true} textColor="dark" />
      </div>

      {/* Dynamic Form container */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="my-auto py-4"
      >
        <div className="mb-5">
          <h1 className="text-xl font-extrabold text-brand-charcoal tracking-tight">
            {mode === "login" ? "Welcome Back" : "Create B2B Account"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {mode === "login"
              ? "Sign in with your email to access the B2B pharmacy portal."
              : "Register trade credentials to join DGDA-certified procurement."}
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-4 border border-slate-200/50">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === "login"
                ? "bg-white text-brand-purple shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError("");
              setSuccessMsg("");
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === "signup"
                ? "bg-white text-brand-purple shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Sign Up
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl mb-4 font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] p-3 rounded-xl mb-4 leading-relaxed font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-3.5">
          {mode === "signup" && (
            <div>
              <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                Full Name
              </label>
              <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus-within:border-brand-purple focus-within:ring-1 focus-within:ring-brand-purple transition-all">
                <User className="text-slate-400 w-4 h-4 mr-2 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Zahid Hasan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full outline-none text-slate-800 font-semibold text-xs bg-transparent"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
              Email Address
            </label>
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus-within:border-brand-purple focus-within:ring-1 focus-within:ring-brand-purple transition-all">
              <Mail className="text-slate-400 w-4 h-4 mr-2 flex-shrink-0" />
              <input
                type="email"
                placeholder="owner@medichain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full outline-none text-slate-800 font-semibold text-xs bg-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
              Password
            </label>
            <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus-within:border-brand-purple focus-within:ring-1 focus-within:ring-brand-purple transition-all">
              <Lock className="text-slate-400 w-4 h-4 mr-2 flex-shrink-0" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full outline-none text-slate-800 font-semibold text-xs bg-transparent"
                required
              />
            </div>
          </div>



          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-lime hover:bg-brand-lime-dark text-slate-900 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-brand-lime/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : mode === "login" ? (
              <>
                Sign In
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                Create Account
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-brand-bg px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest absolute">
              OR
            </span>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-600" />
            ) : (
              <>
                <GoogleIcon />
                <span>Continue with Google</span>
              </>
            )}
          </button>
        </form>
      </motion.div>

      {/* Enterprise Security & Legal Policies Footer */}
      <div className="border-t border-slate-200/80 pt-4 text-center space-y-2">
        <div className="flex items-center justify-center gap-3 text-[10px] text-slate-500 font-medium flex-wrap">
          <button
            type="button"
            onClick={() => setLegalModalTab("privacy")}
            className="hover:text-purple-600 transition-colors cursor-pointer underline-offset-2 hover:underline"
          >
            Privacy Policy
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setLegalModalTab("terms")}
            className="hover:text-purple-600 transition-colors cursor-pointer underline-offset-2 hover:underline"
          >
            Terms of Service
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setLegalModalTab("refund")}
            className="hover:text-purple-600 transition-colors cursor-pointer underline-offset-2 hover:underline"
          >
            Refund & Returns
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setLegalModalTab("compliance")}
            className="hover:text-purple-600 transition-colors cursor-pointer underline-offset-2 hover:underline"
          >
            DGDA Compliance
          </button>
        </div>
        <p className="text-[9px] text-slate-400 leading-relaxed max-w-sm mx-auto">
          🔒 Secured by DGDA Bangladesh-approved serialization. Procurement access is exclusively granted to authorized pharmacies holding active trade licenses.
        </p>
      </div>

      {/* Lazy Loaded Legal Policy Modal */}
      {legalModalTab && (
        <Suspense fallback={null}>
          <LegalPolicyModal
            isOpen={true}
            initialTab={legalModalTab}
            onClose={() => setLegalModalTab(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
