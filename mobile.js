'use strict';
(() => {
  const footer = document.querySelector('.site-footer');
  const status = document.createElement('p');
  status.className = 'mobile-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  footer.append(status);
  const standaloneFile = Boolean(document.querySelector('meta[name="pourmind-standalone"]'));
  let offlineReady = standaloneFile;
  function updateStatus() {
    status.textContent = navigator.onLine ? (offlineReady ? 'Ready for offline use' : 'Mobile test build · Education review · v2.0') : (offlineReady ? 'Offline · Your recipes and bar are available' : 'Offline · Reconnect once to prepare offline access');
  }
  updateStatus();
  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);
  if (!standaloneFile && 'serviceWorker' in navigator && window.isSecureContext && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(() => {
      offlineReady = true;
      updateStatus();
    }).catch(() => {
      status.textContent = 'Online test mode · Offline setup is unavailable in this browser';
    });
  }
  const installHelp = document.querySelector('#install-help');
  function updateInstallButton() {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    installHelp.hidden = standalone;
  }
  updateInstallButton();
  window.matchMedia('(display-mode: standalone)').addEventListener('change', updateInstallButton);
  installHelp.addEventListener('click', () => {
    const content = document.querySelector('#dialog-content');
    content.innerHTML = '<div class="dialog-body"><div class="eyebrow">PourMind on your Home Screen</div><h2 id="dialog-title" tabindex="-1">Your bar, always close.</h2><p>On iPhone, open this app’s HTTPS address in Safari, tap Share, then Add to Home Screen. If Safari shows Open as Web App, turn it on, then tap Add.</p><h3>Before going offline</h3><p>Keep the app open until the footer says “Ready for offline use.” Your favorites, ingredients, and quiz progress are saved on this device.</p><h3>Testing from a computer</h3><p>A downloaded HTML file or a local-network HTTP address can be used for browser testing. Full installation and offline access require HTTPS.</p></div>';
    const dialog = document.querySelector('#dialog');
    dialog.showModal();
    document.querySelector('#dialog-title').focus();
  });
})();
