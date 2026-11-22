/* Make Walid AI installable without modifying its pages or ad delivery. */
(() => {
  'use strict';
  const installButton = document.getElementById('pwa-install');
  let installPrompt = null;
  const installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  if (installButton && !installed) {
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      installPrompt = event;
      installButton.hidden = false;
    });
    installButton.addEventListener('click', async () => {
      const prompt = installPrompt;
      if (!prompt) return;
      installPrompt = null;
      installButton.hidden = true;
      try {
        await prompt.prompt();
        await prompt.userChoice;
      } catch (error) {
        console.warn('PWA installation prompt unavailable', error);
      }
    });
    window.addEventListener('appinstalled', () => {
      installButton.hidden = true;
      installPrompt = null;
    });
  }

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', {scope: '/'})
        .catch(error => console.warn('Offline fallback unavailable', error));
    });
  }
})();
