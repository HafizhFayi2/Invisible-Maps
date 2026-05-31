import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Service Worker: Unregister ALL old SWs first, then register the fresh one.
// This ensures stale caches (old versions of the app) are NEVER served again.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // 1. Get all registered service workers
      const registrations = await navigator.serviceWorker.getRegistrations();

      // 2. Unregister every single one (kills all old caches held by old SWs)
      await Promise.all(registrations.map((reg) => {
        console.log('[App] Unregistering old SW:', reg.scope);
        return reg.unregister();
      }));

      // 3. Nuke any leftover Cache Storage entries directly
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => {
        console.log('[App] Deleting cache:', key);
        return caches.delete(key);
      }));

      // 4. Register the new, clean service worker
      await navigator.serviceWorker.register('/sw.js');
      console.log('[App] New SW registered successfully.');
    } catch (err) {
      console.warn('[App] SW setup failed:', err);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
