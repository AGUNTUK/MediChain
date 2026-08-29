import React from 'react';
import { usePWAInstall } from './usePWAInstall';
import { X, Share, Download, Zap, ShieldCheck } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const { showPrompt, isIOS, canInstall, isStandalone, install, dismiss } = usePWAInstall();

  if (!showPrompt || isStandalone) {
    return null;
  }

  // Ensure it only renders if we have the prompt OR it's iOS
  if (!canInstall && !isIOS) {
    return null;
  }

  return (
    <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-[120] pt-[env(safe-area-inset-top)] animate-in slide-in-from-top-6 fade-in duration-300">
      <div className="bg-[#17121F]/95 border border-purple-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.7)] rounded-2xl overflow-hidden backdrop-blur-xl ring-1 ring-white/10">
        
        {/* Top Gradient accent */}
        <div className="h-1 w-full bg-gradient-to-r from-purple-500 via-brand-lime to-purple-400" />

        {/* Header/Content Area */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-xl p-1.5 flex-shrink-0 shadow-md flex items-center justify-center">
              <img 
                src="/icons/icon-192.png" 
                alt="MediChain App" 
                className="w-full h-full object-contain"
              />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-white font-bold text-sm truncate">
                  Install MediChain App
                </h3>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-brand-lime/20 text-brand-lime border border-brand-lime/30 rounded-full">
                  PWA
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Fast B2B procurement & offline access
              </p>
            </div>

            <button 
              onClick={dismiss}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors -mr-1 -mt-1"
              aria-label="Close install prompt"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick value props */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-300 py-2 border-y border-white/5">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Zap className="w-3.5 h-3.5 text-brand-lime" />
              <span>Instant Launch</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              <span>Offline Ready</span>
            </div>
          </div>

          {/* Action Area */}
          <div className="mt-3">
            {isIOS ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-center gap-2 text-xs text-slate-300">
                <Share className="w-4 h-4 text-brand-lime flex-shrink-0" />
                <span>
                  Tap <strong className="text-white">Share</strong> then select <strong className="text-brand-lime">Add to Home Screen</strong>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={dismiss}
                  className="flex-1 py-2 px-3 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all text-center"
                >
                  Not now
                </button>
                <button 
                  onClick={install}
                  className="flex-1 py-2 px-4 bg-brand-lime hover:bg-brand-lime/90 active:scale-95 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-brand-lime/20 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Install App
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default PWAInstallPrompt;
