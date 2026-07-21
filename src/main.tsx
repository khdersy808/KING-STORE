import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

// Register the PWA Service Worker and signal readiness
if ('serviceWorker' in navigator) {
  // Listen for controllerchange to reload the page with new service worker assets immediately
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      console.log('[PWA] New service worker activated. Reloading to apply fresh updates!');
      window.location.reload();
    }
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[PWA] ServiceWorker registered successfully with scope: ', registration.scope);
        
        // If already active or controller exists
        if (navigator.serviceWorker.controller) {
          (window as any).__swReady = true;
          window.dispatchEvent(new CustomEvent('sw-ready'));
        }
        
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'activated') {
                console.log('[PWA] ServiceWorker activated and ready.');
                (window as any).__swReady = true;
                window.dispatchEvent(new CustomEvent('sw-ready'));
              }
            });
          }
        });
      })
      .catch((err) => {
        console.error('[PWA] ServiceWorker registration failed: ', err);
        (window as any).__swReady = true;
        window.dispatchEvent(new CustomEvent('sw-ready'));
      });

    // Fallback trigger when SW becomes ready
    navigator.serviceWorker.ready.then(() => {
      (window as any).__swReady = true;
      window.dispatchEvent(new CustomEvent('sw-ready'));
    });
  });
} else {
  (window as any).__swReady = true;
  window.dispatchEvent(new CustomEvent('sw-ready'));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
