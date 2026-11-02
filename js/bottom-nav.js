/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Bottom Nav + Floating LINE V13
   js/bottom-nav.js

   - Bottom Navbar (มือถือ): หน้าแรก · สินค้า · ตะกร้า · ออเดอร์ · ติดต่อ
   - Floating LINE: ปุ่มลอยมุมขวาล่าง (ดึงลิงก์จาก CMS)
   - ไม่แสดงในหน้า Admin
   - กันทับกัน: floating ยกสูงเหนือ bottom-nav บนมือถือ
═══════════════════════════════════════════════ */
(function(){
  'use strict';

  // ไม่แสดงในหน้า admin
  var path = location.pathname.toLowerCase();
  if (path.indexOf('admin') !== -1) return;

  // V36: ไอคอนเวกเตอร์เส้น (stroke = currentColor) — โทนเดียวทั้งแถบ ดูทางการ/ทันสมัย
  //      สีตามสถานะอัตโนมัติ: ปกติ = เทา (--text-3) · หน้าปัจจุบัน = สี accent
  var ICON_SVG = {
    home: '<path d="M3.2 10.5 12 3.2l8.8 7.3v9.1a1.2 1.2 0 0 1-1.2 1.2h-4.2v-6.2H8.6v6.2H4.4a1.2 1.2 0 0 1-1.2-1.2Z"/>',
    bag: '<rect x="4.2" y="5.2" width="15.6" height="16" rx="2.7"/><path d="M8.5 8V6.4a3.5 3.5 0 0 1 7 0V8M8.5 12h7"/>',
    cart: '<path d="M2.8 4h2.5l2.3 11.1a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.5l1.6-6.6H6.2"/><circle cx="9.8" cy="20" r="1.5"/><circle cx="17.1" cy="20" r="1.5"/>',
    box: '<path d="M6 3.5h8l4 4v13a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 20.5v-15A2 2 0 0 1 6 3.5Z"/><path d="M14 3.8v4h4M7.5 12h7M7.5 16h7"/>',
    chat: '<path d="M20.5 11.5a8 8 0 0 1-8.5 7.7 10 10 0 0 1-3-.45L4 21l1.3-4A7.1 7.1 0 0 1 3.5 11.5 8 8 0 0 1 12 4a8 8 0 0 1 8.5 7.5Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>',
  };
  function navIcon(key) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON_SVG[key] || '') + '</svg>';
  }

  var NAV = [
    { href: 'index.html',   icon: 'home', label: 'หน้าแรก',  match: ['index.html', '/'] },
    { href: 'catalog.html', icon: 'bag',  label: 'สินค้า',   match: ['catalog.html', 'product.html'] },
    { href: 'cart.html',    icon: 'cart', label: 'ตะกร้า',   match: ['cart.html'], badge: true },
    { href: 'orders.html',  icon: 'box',  label: 'ออเดอร์',  match: ['orders.html'] },
    { href: 'contact.html', icon: 'chat', label: 'ติดต่อ',   match: ['contact.html'] },
  ];

  function currentFile() {
    var p = location.pathname.split('/').pop() || 'index.html';
    return p === '' ? 'index.html' : p;
  }

  var pageFile = currentFile();
  if (pageFile === 'cart.html' || pageFile === 'contact.html') document.body.classList.add('dcs-no-line-fab');

  function injectCSS() {
    if (document.getElementById('dcs-bottomnav-style')) return;
    var css = '#dcs-bottom-nav{display:none}'
      + '@media(max-width:760px){'
      + ':root{--dcs-nav-height:64px;--dcs-nav-bottom:6px;--dcs-fab-gap:16px;--dcs-fab-size:52px}#dcs-bottom-nav{display:flex;box-sizing:border-box;position:fixed;left:12px;right:12px;bottom:calc(var(--dcs-nav-bottom) + env(safe-area-inset-bottom,0px));z-index:9000;width:auto;height:var(--dcs-nav-height);max-width:660px;margin:0 auto;min-height:var(--dcs-nav-height);align-items:stretch;padding:3px 8px;border:1px solid rgba(35,111,174,.12);border-radius:22px;background:rgba(255,255,255,.97);box-shadow:0 5px 18px rgba(24,63,108,.12);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}'
      + '.dcs-bn-item{position:relative;box-sizing:border-box;flex:1 1 0;min-width:0;min-height:48px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:3px 2px;border-radius:12px;color:#5e7891;text-decoration:none;transition:color .15s}'
      + '.dcs-bn-item:focus-visible{outline:3px solid rgba(22,137,210,.38);outline-offset:1px}'
      + '.dcs-bn-item .ic{display:flex;align-items:center;justify-content:center;line-height:0}.dcs-bn-item .ic svg{display:block;width:22px;height:22px}'
      + '.dcs-bn-item .lb{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:600 .68rem/1.15 var(--font-display,sans-serif)}'
      + '.dcs-bn-item.active{color:#b02f6d}.dcs-bn-item.active .ic svg{stroke-width:2}.dcs-bn-item.active::before{content:"";position:absolute;top:0;left:50%;width:22px;height:2px;border-radius:0 0 2px 2px;background:#b02f6d;transform:translateX(-50%)}'
      + '.dcs-bn-badge{position:absolute;top:1px;left:calc(50% + 4px);min-width:15px;height:15px;padding:0 3px;display:flex;align-items:center;justify-content:center;border-radius:9px;background:#e94f98;color:#fff;font:700 .58rem/1 var(--font-display,sans-serif)}'
      + 'body{padding-bottom:calc(var(--dcs-nav-height) + var(--dcs-nav-bottom) + var(--dcs-fab-gap) + var(--dcs-fab-size) + env(safe-area-inset-bottom,0px)) !important}'
      + 'body.dcs-no-line-fab{padding-bottom:calc(var(--dcs-nav-height) + var(--dcs-nav-bottom) + 16px + env(safe-area-inset-bottom,0px)) !important}'
      + '#dcs-fab-line{right:16px;bottom:calc(var(--dcs-nav-bottom) + var(--dcs-nav-height) + var(--dcs-fab-gap) + env(safe-area-inset-bottom,0px));width:var(--dcs-fab-size);height:var(--dcs-fab-size)}'
      + '#dcs-fab-line svg{width:25px;height:25px}'
      + 'body.dcs-no-line-fab #dcs-fab-line,body.dcs-keyboard-open #dcs-bottom-nav,body.dcs-keyboard-open #dcs-fab-line{display:none!important}'
      + '}'
      + '@media(min-width:761px){#dcs-fab-line{display:none!important}}'
      + '@media(max-width:360px){#dcs-bottom-nav{padding-inline:4px}.dcs-bn-item .lb{font-size:.6875rem}.dcs-bn-item .ic svg{width:21px;height:21px}}'
      + '#dcs-fab-line{position:fixed;z-index:8999;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#008f3c;box-shadow:0 5px 14px rgba(0,143,60,.34);text-decoration:none;transition:transform .18s,box-shadow .18s}'
      + '#dcs-fab-line:hover{transform:scale(1.06);box-shadow:0 7px 18px rgba(0,143,60,.42)}#dcs-fab-line svg{fill:#fff}'
      + '#dcs-fab-line .fab-pulse{position:absolute;inset:0;border:2px solid #008f3c;border-radius:50%;animation:fabPulse 2.2s ease infinite;pointer-events:none}'
      + '@keyframes fabPulse{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.55);opacity:0}}'
      + '@media(prefers-reduced-motion:reduce){#dcs-fab-line .fab-pulse{animation:none}}';
    var st = document.createElement('style');
    st.id = 'dcs-bottomnav-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function renderBottomNav() {
    if (document.getElementById('dcs-bottom-nav')) return;
    var cur = currentFile();
    var nav = document.createElement('nav');
    nav.id = 'dcs-bottom-nav';
    nav.setAttribute('aria-label', 'เมนูหลัก');
    nav.innerHTML = NAV.map(function(n) {
      var active = n.match.indexOf(cur) !== -1;
      return '<a href="' + n.href + '" class="dcs-bn-item' + (active ? ' active' : '') + '"' + (active ? ' aria-current="page"' : '') + '>'
        + (n.badge ? '<span class="dcs-bn-badge" id="dcs-cart-badge" style="display:none">0</span>' : '')
        + '<span class="ic">' + navIcon(n.icon) + '</span>'
        + '<span class="lb">' + n.label + '</span>'
        + '</a>';
    }).join('');
    document.body.appendChild(nav);
    updateCartBadge();
  }

  function updateCartBadge() {
    var badge = document.getElementById('dcs-cart-badge');
    if (!badge) return;
    var count = 0;
    try {
      if (typeof DMC !== 'undefined' && DMC.getCart) {
        count = DMC.getCart().reduce(function(s, i){ return s + (i.qty || 1); }, 0);
      }
    } catch(e) {}
    if (count > 0) { badge.textContent = count > 99 ? '99+' : count; badge.style.display = 'flex'; }
    else { badge.style.display = 'none'; }
  }
  // อัปเดต badge เมื่อ storage เปลี่ยน (กดเพิ่มสินค้าอีกแท็บ/หน้าเดียวกัน)
  window.addEventListener('storage', updateCartBadge);
  window.addEventListener('dcs-cart-changed', updateCartBadge);

  var LINE_SVG = '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 5.7 2 10.27c0 4.09 3.58 7.51 8.42 8.16.33.07.78.22.89.5.1.26.07.66.03.92l-.14.86c-.04.26-.2 1.02.9.56 1.1-.46 5.9-3.48 8.05-5.96C21.6 13.62 22 12 22 10.27 22 5.7 17.52 2 12 2zM8.1 12.85H6.06c-.3 0-.54-.24-.54-.53V8.66c0-.3.24-.54.54-.54s.54.24.54.54v3.12H8.1c.3 0 .54.24.54.53s-.24.54-.54.54zm2.13-.53c0 .29-.24.53-.54.53s-.54-.24-.54-.53V8.66c0-.3.24-.54.54-.54s.54.24.54.54v3.66zm4.34 0c0 .23-.15.43-.37.5a.6.6 0 01-.17.03c-.17 0-.32-.08-.43-.21l-1.87-2.54v2.22c0 .29-.24.53-.54.53s-.54-.24-.54-.53V8.66c0-.23.15-.43.37-.5.05-.02.11-.03.17-.03.16 0 .32.08.42.22l1.88 2.54V8.66c0-.3.24-.54.54-.54s.54.24.54.54v3.66zm3.47-2.36c.3 0 .54.24.54.54s-.24.53-.54.53h-1.5v.96h1.5c.3 0 .54.24.54.53 0 .3-.24.54-.54.54h-2.04c-.29 0-.53-.24-.53-.54V8.66c0-.3.24-.54.53-.54h2.04c.3 0 .54.24.54.54s-.24.53-.54.53h-1.5v.96h1.5z"/></svg>';

  function trustedLineUrl(value) {
    try {
      var url = new URL(value);
      var host = url.hostname.toLowerCase().replace(/^www\./, '');
      return url.protocol === 'https:' && (host === 'line.me' || host === 'lin.ee') && url.pathname !== '/' ? url.href : '';
    } catch (e) { return ''; }
  }

  function renderFAB(lineUrl) {
    if (document.getElementById('dcs-fab-line')) return;
    var lineHref = trustedLineUrl(lineUrl);
    var hasLine = !!lineHref;
    var a = document.createElement('a');
    a.id = 'dcs-fab-line';
    a.href = hasLine ? lineHref : 'contact.html';
    if (hasLine) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    a.title = hasLine ? 'ติดต่อร้านผ่าน LINE' : 'ดูช่องทางติดต่อร้าน';
    a.setAttribute('aria-label', hasLine ? 'ติดต่อร้านผ่าน LINE' : 'ดูช่องทางติดต่อร้าน');
    a.innerHTML = '<span class="fab-pulse"></span>' + LINE_SVG;
    document.body.appendChild(a);
  }

  function boot() {
    injectCSS();
    renderBottomNav();
    document.addEventListener('focusin', function(e) {
      var target = e.target;
      if (target && (target.matches('input,textarea,select') || target.isContentEditable)) document.body.classList.add('dcs-keyboard-open');
    });
    document.addEventListener('focusout', function() {
      window.setTimeout(function() {
        var target = document.activeElement;
        if (!target || !(target.matches && target.matches('input,textarea,select')) && !target.isContentEditable) document.body.classList.remove('dcs-keyboard-open');
      }, 120);
    });
    // Floating LINE — ใช้ลิงก์จาก CMS
    if (typeof CMS !== 'undefined') {
      CMS.get().then(function(c){ renderFAB(CMS.lineChat ? CMS.lineChat(c.contact) : ((c.contact && c.contact.line) || '#')); })
               .catch(function(){ renderFAB('#'); });
    } else {
      renderFAB('#');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
