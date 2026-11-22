/* Walid AI install invitation: show on every new mobile visit until installed.
   The flower icon and all existing page content remain unchanged. */
(() => {
  'use strict';
  if (window.__walidPwaInit) return;
  window.__walidPwaInit = true;

  const INSTALL_KEY = 'walid-pwa-installed-v2';
  const VISIT_KEY = 'walid-pwa-invite-seen';
  const installButton = document.getElementById('pwa-install');
  const isMobile = navigator.userAgentData?.mobile === true ||
    /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
  const storageGet = (store, key) => {
    try { return store.getItem(key); } catch (_) { return null; }
  };
  const storageSet = (store, key, value) => {
    try { store.setItem(key, value); } catch (_) { /* Restricted browser storage. */ }
  };
  const storageDelete = (store, key) => {
    try { store.removeItem(key); } catch (_) { /* Restricted browser storage. */ }
  };

  let installPrompt = null;
  let invite = null;
  let installed = isStandalone() || storageGet(localStorage, INSTALL_KEY) === '1';

  function hideInvite() {
    invite?.remove();
    invite = null;
  }

  function markInstalled() {
    installed = true;
    storageSet(localStorage, INSTALL_KEY, '1');
    hideInvite();
    if (installButton) installButton.hidden = true;
    installPrompt = null;
  }

  if (isStandalone()) markInstalled();

  window.addEventListener('appinstalled', markInstalled);
  window.addEventListener('beforeinstallprompt', event => {
    // Browsers normally withhold this event once the PWA is installed.
    event.preventDefault();
    installPrompt = event;
    if (installed && !isStandalone()) {
      installed = false; // The prior marker may be stale after uninstall.
      storageDelete(localStorage, INSTALL_KEY);
    }
    if (installButton && isMobile) installButton.hidden = false;
    if (invite) updateAction();
  });

  function addStyle() {
    if (document.getElementById('walid-pwa-invite-style')) return;
    const style = document.createElement('style');
    style.id = 'walid-pwa-invite-style';
    style.textContent = [
      '#walid-pwa-invite{position:fixed;right:14px;bottom:max(14px,env(safe-area-inset-bottom));',
      'z-index:2147483000;width:min(380px,calc(100vw - 28px));padding:17px 17px 14px;',
      'border:1px solid #cfe0d5;border-radius:16px;background:#fff;color:#24352e;',
      'box-shadow:0 12px 38px rgba(18,44,32,.22);font:16px/1.45 "Times New Roman",Times,serif;',
      'box-sizing:border-box;text-align:left;direction:ltr}',
      '#walid-pwa-invite *{box-sizing:border-box}',
      '#walid-pwa-invite .walid-pwa-head{display:flex;gap:12px;align-items:center;padding-right:22px}',
      '#walid-pwa-invite .walid-pwa-flower{width:67px;height:73px;object-fit:contain;flex:none;',
      'border:0;background:transparent;border-radius:0;box-shadow:none}',
      '#walid-pwa-invite h2{font:700 21px/1.25 "Times New Roman",Times,serif;',
      'margin:0 0 3px;color:#20352c}',
      '#walid-pwa-invite p{font:15px/1.45 "Times New Roman",Times,serif;',
      'margin:0;color:#4a5a51}',
      '#walid-pwa-invite .walid-pwa-x{position:absolute;top:8px;right:8px;',
      'border:0;background:transparent;color:#52645a;font:25px/1 Arial,sans-serif;',
      'cursor:pointer;padding:5px 9px}',
      '#walid-pwa-invite .walid-pwa-actions{display:flex;align-items:center;gap:10px;',
      'margin-top:14px;flex-wrap:wrap}',
      '#walid-pwa-invite button{cursor:pointer}',
      '#walid-pwa-invite .walid-pwa-primary{background:#146d54;color:#fff;',
      'border:1px solid #146d54;padding:10px 16px;border-radius:10px;',
      'font:700 15px/1.2 "Times New Roman",Times,serif}',
      '#walid-pwa-invite .walid-pwa-later{background:none;color:#42554b;border:0;',
      'padding:8px 6px;font:15px/1.2 "Times New Roman",Times,serif}',
      '#walid-pwa-invite .walid-pwa-confirm{display:block;background:none;border:0;',
      'padding:8px 0 0;color:#426c57;text-decoration:underline;',
      'font:14px/1.2 "Times New Roman",Times,serif}',
      '#walid-pwa-invite .walid-pwa-instructions{display:none;margin-top:12px;',
      'padding:11px 12px;border-radius:10px;background:#f3f8f5;color:#2d493b;',
      'font:15px/1.45 "Times New Roman",Times,serif}',
      '#walid-pwa-invite .walid-pwa-instructions[data-visible="true"]{display:block}',
      '#walid-pwa-invite button:focus-visible{outline:3px solid #16785c;outline-offset:3px}',
      '@media(max-width:420px){#walid-pwa-invite{right:12px;bottom:max(12px,env(safe-area-inset-bottom));',
      'width:calc(100vw - 24px);padding:15px}}',
      '@media(prefers-reduced-motion:no-preference){#walid-pwa-invite{animation:walid-pwa-enter .2s ease-out}',
      '@keyframes walid-pwa-enter{from{opacity:0;transform:translateY(12px)}',
      'to{opacity:1;transform:translateY(0)}}}'
    ].join('');
    document.head.append(style);
  }

  function instructions() {
    const inApp = /FBAN|FBAV|Instagram|; wv\)|\bwv\b|Line\/|Snapchat/i.test(navigator.userAgent);
    if (ios) {
      return 'In Safari, tap Share (the square with an arrow), choose Add to Home Screen, then tap Add.' +
        (inApp ? ' First open walid-ai.com in Safari.' : '');
    }
    if (inApp) return 'Open walid-ai.com in Chrome, tap the three-dot menu (⋮), then choose Install app or Add to Home screen.';
    return 'In Chrome, open the three-dot menu (⋮) and choose Install app or Add to Home screen.';
  }

  function updateAction() {
    if (!invite) return;
    const button = invite.querySelector('[data-action="install"]');
    if (button) button.textContent = installPrompt ? 'Install now' : 'How to install';
  }

  function openInvite() {
    if (!isMobile || installed || isStandalone() || invite) return;
    addStyle();
    const aside = document.createElement('aside');
    aside.id = 'walid-pwa-invite';
    aside.setAttribute('role', 'dialog');
    aside.setAttribute('aria-label', 'Install Walid AI');
    aside.innerHTML = '<button class="walid-pwa-x" type="button" aria-label="Close install invitation">×</button>' +
      '<div class="walid-pwa-head"><img class="walid-pwa-flower" src="/walid-ai-approved-flower.png" ' +
      'width="67" height="73" alt="Walid AI flower">' +
      '<div><h2>Install Walid AI</h2><p>Keep Walid AI on your home screen for easy access.</p></div></div>' +
      '<div class="walid-pwa-actions"><button class="walid-pwa-primary" type="button" ' +
      'data-action="install">How to install</button>' +
      '<button class="walid-pwa-later" type="button" data-action="later">Not now</button></div>' +
      '<div class="walid-pwa-instructions" data-visible="false" aria-live="polite"></div>' +
      '<button class="walid-pwa-confirm" type="button" data-action="installed">Already installed?</button>';
    invite = aside;
    document.body.append(aside);
    updateAction();
    aside.querySelector('.walid-pwa-x').addEventListener('click', hideInvite);
    aside.querySelector('[data-action="later"]').addEventListener('click', hideInvite);
    aside.querySelector('[data-action="installed"]').addEventListener('click', markInstalled);
    aside.querySelector('[data-action="install"]').addEventListener('click', async () => {
      if (installPrompt) {
        const prompt = installPrompt;
        installPrompt = null;
        updateAction();
        try {
          await prompt.prompt();
          const choice = await prompt.userChoice;
          if (choice?.outcome === 'accepted') {
            hideInvite(); // Only appinstalled can confirm installation.
            return;
          }
        } catch (error) {
          console.warn('Walid AI install prompt could not open', error);
        }
      }
      const panel = aside.querySelector('.walid-pwa-instructions');
      panel.textContent = instructions();
      panel.dataset.visible = 'true';
    });
    storageSet(sessionStorage, VISIT_KEY, '1');
  }

  if (isMobile && !installed) {
    if (installButton) {
      installButton.hidden = false;
      installButton.addEventListener('click', openInvite);
    }
    // Returning from another site (or direct opening) starts a new visit.
    // Browsing between Walid AI's internal pages does not repeatedly pop up.
    let fromSameSite = false;
    try {
      fromSameSite = Boolean(document.referrer) &&
        new URL(document.referrer).origin === location.origin;
    } catch (_) { /* An unusable referrer starts a fresh visit. */ }
    if (!fromSameSite) storageDelete(sessionStorage, VISIT_KEY);
    if (storageGet(sessionStorage, VISIT_KEY) !== '1') {
      // Show an independent invitation even if the browser never emits beforeinstallprompt.
      window.setTimeout(openInvite, 700);
    }
  }

  if ('serviceWorker' in navigator &&
      (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', {scope: '/'})
        .catch(error => console.warn('Offline fallback unavailable', error));
    });
  }
})();
