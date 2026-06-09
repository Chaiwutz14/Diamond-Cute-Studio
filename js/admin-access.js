/* ═══════════════════════════════════════════════
   Diamond Cute Studio — Admin Access Helper
   Hidden entry points (footer link + secret tap)
═══════════════════════════════════════════════ */
(function(){
  'use strict';

  // ── 1. Inject hidden footer link ──────────────
  function injectFooterLink(){
    const bottom = document.querySelector('.footer-bottom');
    if (!bottom) return;

    const link = document.createElement('a');
    link.href  = 'admin-login.html';
    link.style.cssText = `
      color: var(--text-3);
      font-size: .7rem;
      opacity: .35;
      transition: opacity .2s;
      font-family: var(--font-display);
    `;
    link.textContent = '⚙';
    link.title = 'Admin';
    link.setAttribute('aria-label', 'Admin');
    link.addEventListener('mouseenter', () => link.style.opacity = '.8');
    link.addEventListener('mouseleave', () => link.style.opacity = '.35');
    bottom.appendChild(link);
  }

  // ── 2. Secret: tap/click logo 5× quickly ──────
  function initLogoSecret(){
    const logo = document.querySelector('.nav-logo');
    if (!logo) return;
    let taps = 0, timer;
    logo.addEventListener('click', e => {
      // Only trigger when NOT navigating (already on page, i.e. href = same page or #)
      taps++;
      clearTimeout(timer);
      timer = setTimeout(() => { taps = 0; }, 2000);
      if (taps >= 5) {
        taps = 0;
        clearTimeout(timer);
        window.location.href = 'admin-login.html';
      }
    });
  }

  // ── 3. Secret keyboard shortcut: Ctrl+Shift+A ─
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      window.location.href = 'admin-login.html';
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { injectFooterLink(); initLogoSecret(); });
  } else {
    injectFooterLink();
    initLogoSecret();
  }
})();
