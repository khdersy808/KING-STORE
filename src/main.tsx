import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Unregister Service Worker and clear cache to prevent stale version persistence in development
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    let unregisteredAny = false;
    for (const registration of registrations) {
      registration.unregister();
      unregisteredAny = true;
    }
    if (unregisteredAny) {
      console.log('Unregistered active service workers to clear cached app versions.');
      if ('caches' in window) {
        caches.keys().then((names) => {
          for (const name of names) {
            caches.delete(name);
          }
        });
      }
      const hasReloaded = sessionStorage.getItem('sw_unregistered_reload');
      if (!hasReloaded) {
        sessionStorage.setItem('sw_unregistered_reload', 'true');
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
