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

  // ── 2. (ยกเลิกแล้ว V24) แตะโลโก้ 5 ครั้ง / Ctrl+Shift+A ──
  //   เหตุผล: เสี่ยงกดโดนเองโดยไม่ตั้งใจ — ทางเข้าแอดมินใช้ "ไอคอนเฟือง ⚙ ที่ Footer" ได้เลย
  //   (ด่านความปลอดภัยจริงคือ Firebase Auth ในหน้า admin-login.html อยู่แล้ว)

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectFooterLink);
  } else {
    injectFooterLink();
  }
})();
