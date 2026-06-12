/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Footer Component V13
   ฉีด CSS ในตัว → ทุกหน้าได้ footer เหมือนกัน ไม่พึ่ง home.css
   ดึงลิงก์จาก CMS (หลังบ้านแก้ได้) + icon SVG + จัด 2 ฝั่งบนมือถือ
═══════════════════════════════════════════════ */
(function(){
  'use strict';

  var LINKS = {
    line:      'https://line.me/R/ti/p/@your_line_oa',
    facebook:  'https://facebook.com/yourpage',
    instagram: 'https://instagram.com/youraccount',
    tiktok:    'https://tiktok.com/@youraccount',
    email:     'mailto:contact@example.com',
  };

  // ─── SVG icons (คมชัดทุกขนาด แทน emoji) ───
  var IC = {
    line:    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 5.7 2 10.27c0 4.09 3.58 7.51 8.42 8.16.33.07.78.22.89.5.1.26.07.66.03.92l-.14.86c-.04.26-.2 1.02.9.56 1.1-.46 5.9-3.48 8.05-5.96C21.6 13.62 22 12 22 10.27 22 5.7 17.52 2 12 2zM8.1 12.85H6.06c-.3 0-.54-.24-.54-.53V8.66c0-.3.24-.54.54-.54s.54.24.54.54v3.12H8.1c.3 0 .54.24.54.53s-.24.54-.54.54zm2.13-.53c0 .29-.24.53-.54.53s-.54-.24-.54-.53V8.66c0-.3.24-.54.54-.54s.54.24.54.54v3.66zm4.34 0c0 .23-.15.43-.37.5a.6.6 0 01-.17.03c-.17 0-.32-.08-.43-.21l-1.87-2.54v2.22c0 .29-.24.53-.54.53s-.54-.24-.54-.53V8.66c0-.23.15-.43.37-.5.05-.02.11-.03.17-.03.16 0 .32.08.42.22l1.88 2.54V8.66c0-.3.24-.54.54-.54s.54.24.54.54v3.66zm3.47-2.36c.3 0 .54.24.54.54s-.24.53-.54.53h-1.5v.96h1.5c.3 0 .54.24.54.53 0 .3-.24.54-.54.54h-2.04c-.29 0-.53-.24-.53-.54V8.66c0-.3.24-.54.53-.54h2.04c.3 0 .54.24.54.54s-.24.53-.54.53h-1.5v.96h1.5z"/></svg>',
    facebook:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.99 3.66 9.13 8.44 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.23.2 2.23.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99C18.34 21.13 22 16.99 22 12z"/></svg>',
    instagram:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 01-1.38-.9 3.7 3.7 0 01-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.12 1.38C1.36 2.67.94 3.34.63 4.14.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.72 1.46 1.38 2.12.66.66 1.33 1.08 2.12 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.3 1.46-.72 2.12-1.38.66-.66 1.08-1.33 1.38-2.12.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91-.3-.79-.72-1.46-1.38-2.12C21.33 1.36 20.66.94 19.86.63 19.1.33 18.22.13 16.95.07 15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 1018.16 12 6.16 6.16 0 0012 5.84zm0 10.16A4 4 0 1116 12a4 4 0 01-4 4zm6.41-10.4a1.44 1.44 0 11-1.44-1.44 1.44 1.44 0 011.44 1.44z"/></svg>',
    tiktok:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1.04 0z"/></svg>',
    email:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>',
  };

  function injectCSS() {
    if (document.getElementById('dcs-footer-style')) return;
    var css = ''
      + '.footer{background:var(--bg-mid);border-top:1px solid var(--border);margin-top:2rem}'
      + '.footer-main{max-width:1200px;margin:0 auto;padding:2.5rem 1.5rem 1.75rem;display:grid;grid-template-columns:1.6fr 1fr 1fr 1.2fr;gap:2.5rem}'
      + '.footer-brand .logo-text{font-family:var(--font-display);font-weight:800;font-size:1.12rem;background:linear-gradient(135deg,var(--accent),var(--gold));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:.55rem;display:block;text-decoration:none}'
      + '.footer-brand p{font-size:.82rem;color:var(--text-2);line-height:1.7;max-width:240px;margin-bottom:1.05rem}'
      + '.footer-socials{display:flex;gap:.55rem;flex-wrap:wrap}'
      + '.social-btn{width:38px;height:38px;border-radius:var(--r-md);background:var(--glass,rgba(125,125,125,.08));border:1px solid var(--border);display:flex;align-items:center;justify-content:center;transition:all var(--t-fast,.2s);color:var(--text-2)}'
      + '.social-btn svg{width:19px;height:19px}'
      + '.social-btn:hover{border-color:var(--accent);color:var(--accent);transform:translateY(-2px)}'
      + '.social-btn.line:hover{background:#06c755;color:#fff;border-color:#06c755}'
      + '.social-btn.fb:hover{background:#1877f2;color:#fff;border-color:#1877f2}'
      + '.social-btn.ig:hover{background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);color:#fff;border-color:transparent}'
      + '.social-btn.tt:hover{background:#000;color:#fff;border-color:#000}'
      + '.social-btn.mail:hover{background:var(--accent);color:#fff;border-color:var(--accent)}'
      + '.footer-col h4{font-family:var(--font-display);font-weight:600;font-size:.86rem;color:var(--accent);margin-bottom:.85rem;text-transform:uppercase;letter-spacing:.7px}'
      + '.footer-col a{display:flex;align-items:center;gap:.4rem;font-size:.83rem;color:var(--text-2);padding:.18rem 0;transition:color var(--t-fast,.2s);margin-bottom:.3rem;text-decoration:none}'
      + '.footer-col a:hover{color:var(--accent)}'
      + '.footer-bottom{max-width:1200px;margin:0 auto;padding:1.05rem 1.5rem;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;font-size:.77rem;color:var(--text-3);gap:1rem;flex-wrap:wrap}'
      + '@media(max-width:880px){.footer-main{grid-template-columns:1fr 1fr;gap:1.75rem 1.5rem;padding:2rem 1.25rem 1.5rem}.footer-brand{grid-column:1/-1}}'
      + '@media(max-width:480px){.footer-bottom{flex-direction:column;text-align:center;gap:.4rem}}';
    var st = document.createElement('style');
    st.id = 'dcs-footer-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function lineHref() {
    if (typeof CMS !== 'undefined' && CMS.lineChat) return CMS.lineChat(_contact);
    return LINKS.line;
  }
  function social(kind, cls, url, label) {
    return '<a href="' + url + '" target="_blank" rel="noopener" class="social-btn ' + cls + '" title="' + label + '" aria-label="' + label + '">' + IC[kind] + '</a>';
  }

  var _contact = null;
  function render(cms) {
    _contact = cms;
    var mount = document.getElementById('footer-mount');
    if (!mount) return;
    if (cms) {
      if (cms.line)      LINKS.line      = cms.line;
      if (cms.facebook)  LINKS.facebook  = cms.facebook;
      if (cms.instagram) LINKS.instagram = cms.instagram;
      if (cms.tiktok)    LINKS.tiktok    = cms.tiktok;
      if (cms.email)     LINKS.email     = cms.email.indexOf('mailto:') === 0 ? cms.email : 'mailto:' + cms.email;
    }
    injectCSS();

    mount.innerHTML = ''
      + '<footer class="footer">'
      +   '<div class="footer-main">'
      +     '<div class="footer-brand">'
      +       '<a href="index.html" class="logo-text">💎 Diamond Cute Studio</a>'
      +       '<p>บริการพิมพ์ภาพและสิ่งพิมพ์คุณภาพ<br>รับออเดอร์ทุกวัน ส่งทั่วประเทศไทย</p>'
      +       '<div class="footer-socials">'
      +         social('line','line',lineHref(),'LINE')
      +         social('facebook','fb',LINKS.facebook,'Facebook')
      +         social('instagram','ig',LINKS.instagram,'Instagram')
      +         social('tiktok','tt',LINKS.tiktok,'TikTok')
      +         social('email','mail',LINKS.email,'อีเมล')
      +       '</div>'
      +     '</div>'
      +     '<div class="footer-col">'
      +       '<h4>สินค้า</h4>'
      +       '<a href="catalog.html?cat=polaroid">📸 รูปโพลารอยด์</a>'
      +       '<a href="catalog.html?cat=lanyard">🪪 บัตรแขวนคอ</a>'
      +       '<a href="catalog.html?cat=business-card">💼 นามบัตร</a>'
      +       '<a href="catalog.html?cat=qrcode">📱 QR Code</a>'
      +     '</div>'
      +     '<div class="footer-col">'
      +       '<h4>ข้อมูล</h4>'
      +       '<a href="about.html">📋 วิธีสั่งซื้อ</a>'
      +       '<a href="orders.html">📦 ติดตามออเดอร์</a>'
      +       '<a href="gallery.html">🖼️ ตัวอย่างงาน</a>'
      +       '<a href="contact.html">💬 ติดต่อเรา</a>'
      +     '</div>'
      +     '<div class="footer-col">'
      +       '<h4>ติดต่อเรา</h4>'
      +       '<a href="' + lineHref() + '" target="_blank" rel="noopener">💬 แชท LINE</a>'
      +       '<a href="about.html#faq">❓ คำถามที่พบบ่อย</a>'
      +       '<a href="about.html#policy">🔒 นโยบายความเป็นส่วนตัว</a>'
      +     '</div>'
      +   '</div>'
      +   '<div class="footer-bottom">'
      +     '<span>© 2026 Diamond Cute Studio 💎 — All rights reserved.</span>'
      +     '<span>Powered by Firebase + Cloudflare</span>'
      +   '</div>'
      + '</footer>';
  }

  function boot() {
    if (typeof CMS !== 'undefined') {
      CMS.get().then(function(c){ render(c.contact || null); }).catch(function(){ render(null); });
    } else {
      render(null);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
