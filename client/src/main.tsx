import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

// Older versions used a fake-server worker in development. Remove it if it is still installed.
if ('serviceWorker' in navigator && !import.meta.env.PROD) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.filter((r) => r.active?.scriptURL.endsWith('/mockServiceWorker.js')).forEach((r) => r.unregister());
  }).catch(() => {});
}

function registerPWA() {
  if (!import.meta.env.PROD) return;
  import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: false, onNeedRefresh() {}, onOfflineReady() {} });
  }).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
registerPWA();
