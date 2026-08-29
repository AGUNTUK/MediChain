// Global store for the install prompt so early browser events are never missed
declare global {
  interface Window {
    __pwaInstallPrompt?: any;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.__pwaInstallPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-prompt-available'));
    console.log('[MediChain PWA] Captured beforeinstallprompt event.');
  });
}

export function registerServiceWorker() {
  if (typeof window === 'undefined') {
    return; // Don't run on server
  }

  if (!('serviceWorker' in navigator)) {
    console.info('[MediChain PWA] Service Workers are not supported in this browser.');
    return;
  }

  const register = () => {
    navigator.serviceWorker
      .register('/sw.js', {
        scope: '/'
      })
      .then((registration) => {
        console.log('[MediChain PWA] Service Worker registered with scope:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('[MediChain PWA] New content is available; please refresh.');
                } else {
                  console.log('[MediChain PWA] Content is cached for offline use.');
                }
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('[MediChain PWA] Service Worker registration failed:', error);
      });
  };

  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register);
  }
}
