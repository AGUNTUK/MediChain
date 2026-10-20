// Ensure window.fetch has both a getter and setter in iframe environments to prevent getter-only TypeErrors
if (typeof window !== 'undefined') {
  try {
    const origFetch = window.fetch ? window.fetch.bind(window) : null;
    let curFetch = origFetch;
    Object.defineProperty(window, 'fetch', {
      get() { return curFetch; },
      set(fn) { curFetch = fn; },
      configurable: true,
      enumerable: true
    });
  } catch (e) {}
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './pwa/registerServiceWorker';
import { ThemeProvider } from './context/ThemeContext';

registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
