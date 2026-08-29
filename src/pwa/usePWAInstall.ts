import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined' && window.__pwaInstallPrompt) {
      return window.__pwaInstallPrompt;
    }
    return null;
  });
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 1. Detect Standalone Mode
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches ||
                                window.matchMedia('(display-mode: window-controls-overlay)').matches ||
                                window.matchMedia('(display-mode: minimal-ui)').matches;
      // @ts-ignore
      const isStandaloneIOS = ('standalone' in navigator) && !!navigator.standalone;
      return Boolean(isStandaloneMedia || isStandaloneIOS);
    };

    const standaloneState = checkStandalone();
    setIsStandalone(standaloneState);

    if (standaloneState) {
      return; // Already running standalone
    }

    // 2. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // 3. Check dismissal cooldown (24 hours)
    const checkCooldown = () => {
      const dismissedAt = localStorage.getItem('medichain_pwa_install_dismissed_at');
      if (dismissedAt) {
        const timeDiff = Date.now() - parseInt(dismissedAt, 10);
        const hoursDiff = timeDiff / (1000 * 3600);
        if (hoursDiff < 24) {
          return true; // Dismissed recently
        }
      }
      return false;
    };

    const onCooldown = checkCooldown();

    // Check if global prompt was already caught
    if (window.__pwaInstallPrompt) {
      setDeferredPrompt(window.__pwaInstallPrompt);
      if (!onCooldown) {
        setShowPrompt(true);
      }
    }

    // 4. Handle beforeinstallprompt (Chromium)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__pwaInstallPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
      if (!onCooldown) {
        setShowPrompt(true);
      }
    };

    const handlePromptAvailable = () => {
      if (window.__pwaInstallPrompt) {
        setDeferredPrompt(window.__pwaInstallPrompt);
        if (!onCooldown) {
          setShowPrompt(true);
        }
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-available', handlePromptAvailable);

    // 5. iOS Prompt Trigger (if on iOS and not installed and not on cooldown)
    if (isIOSDevice && !onCooldown) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 1500);
      return () => clearTimeout(timer);
    }

    // 6. Handle successful installation
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      window.__pwaInstallPrompt = undefined;
      setIsStandalone(true);
      localStorage.removeItem('medichain_pwa_install_dismissed_at');
      console.log('[MediChain PWA] App successfully installed as standalone!');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-available', handlePromptAvailable);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    const promptToUse = deferredPrompt || window.__pwaInstallPrompt;
    if (!promptToUse) {
      console.warn('[MediChain PWA] No active install prompt event available.');
      return;
    }

    try {
      await promptToUse.prompt();
      const result = await promptToUse.userChoice;
      if (result.outcome === 'accepted') {
        setShowPrompt(false);
        setIsStandalone(true);
      }
    } catch (err) {
      console.error('[MediChain PWA] Error triggering install prompt:', err);
    } finally {
      setDeferredPrompt(null);
      window.__pwaInstallPrompt = undefined;
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem('medichain_pwa_install_dismissed_at', Date.now().toString());
  }, []);

  const openInstallBanner = useCallback(() => {
    setShowPrompt(true);
  }, []);

  return {
    showPrompt,
    isIOS,
    isStandalone,
    canInstall: Boolean(deferredPrompt || window.__pwaInstallPrompt),
    install,
    dismiss,
    openInstallBanner
  };
}
