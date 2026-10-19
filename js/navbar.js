/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Navbar JS  v2
   Mobile-first · theme-switcher ready
═══════════════════════════════════════════════ */
(function () {
  'use strict';

  function navVector(href) {
    const paths = {
      'index.html':'<path d="m3 10 9-7 9 7"/><path d="M5.5 9v11h5v-6h3v6h5V9"/>',
      'catalog.html':'<rect x="3.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.4"/>',
      'orders.html':'<path d="M7 3.5h8l4 4v13H5V5.5a2 2 0 0 1 2-2Z"/><path d="M15 3.8v4h4M8 12h8M8 16h6"/>',
      'about.html':'<rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="m7.5 9 1.8 1.8L12 8M13.5 9.5h3M7.5 15l1.8 1.8L12 14M13.5 15.5h3"/>',
      'gallery.html':'<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 17 5-5 3 3 3-4 5 6"/>',
      'contact.html':'<path d="M6.5 3.5h3l1.5 4-2 1.7a14 14 0 0 0 5.8 5.8l1.7-2 4 1.5v3a2 2 0 0 1-2.2 2C10.6 18.6 5.4 13.4 4.5 5.7a2 2 0 0 1 2-2.2Z"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[href] || '') + '</svg>';
  }

  function renderNavbar() {
    const page = location.pathname.split('/').pop() || 'index.html';
    const isAdmin = page.startsWith('admin');

    const links = [
      { href: 'index.html',   label: 'หน้าแรก',      icon: '🏠' },
      { href: 'catalog.html', label: 'สินค้าทั้งหมด', icon: '🛍️' },
      { href: 'orders.html',  label: 'ติดตามออเดอร์', icon: '📦' },
      { href: 'about.html',   label: 'วิธีสั่งซื้อ',  icon: '📋' },
      { href: 'gallery.html', label: 'ตัวอย่างงาน',  icon: '🖼️' },
      { href: 'contact.html', label: 'ติดต่อเรา',    icon: '💬' },
    ];

    const desktopLinks = links.map(l =>
      `<a href="${l.href}" class="nav-link ${page === l.href ? 'active' : ''}"><span class="nav-link-icon">${navVector(l.href)}</span><span>${l.label}</span></a>`
    ).join('');

    const drawerLinks = links.map(l =>
      `<a href="${l.href}" class="drawer-link ${page === l.href ? 'active' : ''}">
         <span>${l.icon}</span> ${l.label}
       </a>`
    ).join('');

    const searchMarkup = (page === 'index.html' || page === '') ? '<form class="nav-search" action="catalog.html" method="get" role="search" aria-label="ค้นหาสินค้า"><label class="nav-search-label" for="nav-search-input">ค้นหาสินค้า</label><span class="nav-search-icon" aria-hidden="true">⌕</span><input id="nav-search-input" name="q" type="search" maxlength="120" placeholder="ค้นหาสินค้า เช่น โพลารอยด์ นามบัตร…" autocomplete="off"><button type="submit" aria-label="ค้นหา"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg></button></form>' : '';

    if (isAdmin) {
      getMountEl().innerHTML = `
        <nav class="navbar" id="main-nav">
          <div class="nav-inner">
            <a href="index.html" class="nav-logo">
              <img class="nav-logo-image" src="assets/dmc-logo.svg" alt="DMC Studio">
            </a>
            <div style="display:flex;align-items:center;gap:.5rem">
              <span class="badge badge-rose" style="font-size:.7rem">⚙️ Admin</span>
              <a href="index.html" class="btn btn-ghost btn-sm">← กลับร้าน</a>
            </div>
          </div>
        </nav>`;
      return;
    }

    getMountEl().innerHTML = `
      <nav class="navbar" id="main-nav">
        <div class="nav-inner">
          <a href="index.html" class="nav-logo">
            <img class="nav-logo-image" src="assets/dmc-logo.svg" alt="DMC Studio">
          </a>

          <ul class="nav-links" role="list">${desktopLinks}</ul>
${searchMarkup}
          <div class="nav-actions">
            <!-- theme switcher injected here by theme-switcher.js -->
            <a href="#" id="nav-line-btn"
               target="_blank" rel="noopener"
               class="btn btn-line btn-sm hide-mobile">💬 LINE</a>
            <a href="cart.html" class="nav-icon-btn" aria-label="ตะกร้าสินค้า" title="ตะกร้า">
              🛒<span class="nav-cart-badge" style="display:none">0</span>
            </a>
            <button class="nav-hamburger" id="hamburger-btn" aria-label="เมนู" aria-expanded="false">
              <span class="hamburger-line"></span>
              <span class="hamburger-line"></span>
              <span class="hamburger-line"></span>
            </button>
          </div>
        </div>
      </nav>

      <!-- Mobile Drawer -->
      <div class="mobile-drawer" id="mobile-drawer" role="navigation" aria-label="เมนูมือถือ">
        <div class="drawer-links">${drawerLinks}</div>
        <div class="drawer-actions">
          <a href="#" id="drawer-line-btn"
             target="_blank" rel="noopener"
             class="btn btn-line btn-md" style="flex:1">💬 ติดต่อ LINE</a>
          <a href="cart.html" class="btn btn-secondary btn-md" style="flex:1">🛒 ตะกร้า</a>
        </div>
      </div>`;

    initBehavior();
    applyLineLinks();
    applyAnnounce();
    if (page === 'index.html' || page === '') initHeaderSearch();
  }

  function initHeaderSearch() {
    var input = document.getElementById('nav-search-input');
    if (!input) return;
    if ((location.pathname.split('/').pop() || '') === 'catalog.html') {
      var q = new URLSearchParams(location.search).get('q');
      if (q) input.value = q.slice(0, 120);
    }
  }

  function applyAnnounce() {
    if (typeof CMS === 'undefined') return;
    var page = location.pathname.split('/').pop() || 'index.html';
    if (page.indexOf('admin') === 0) return;          // ไม่โชว์ในหลังบ้าน
    CMS.get().then(function (c) {
      var a = c.announce || {};
      if (!a.active || !a.text) return;
      if (document.getElementById('dmc-announce-bar')) return;
      if (!document.getElementById('dmc-announce-style')) {
        var st = document.createElement('style');
        st.id = 'dmc-announce-style';
        st.textContent = '#dmc-announce-bar{position:fixed;top:0;left:0;right:0;z-index:901;background:linear-gradient(90deg,var(--accent,#0EA5E9),var(--accent-dark,#0369A1));color:#fff;font-family:var(--font-display),sans-serif;font-size:.78rem;font-weight:600;text-align:center;padding:.45rem 2.3rem .45rem 1rem;line-height:1.4}#dmc-announce-bar .dmc-an-x{position:absolute;right:.55rem;top:50%;transform:translateY(-50%);cursor:pointer;opacity:.85;font-size:.95rem;line-height:1;padding:.2rem}';
        document.head.appendChild(st);
      }
      var bar = document.createElement('div');
      bar.id = 'dmc-announce-bar';
      var span = document.createElement('span');
      span.textContent = a.text;                      // textContent — กัน XSS
      bar.appendChild(span);
      var x = document.createElement('span');
      x.className = 'dmc-an-x'; x.textContent = '✕';
      x.setAttribute('role', 'button'); x.setAttribute('aria-label', 'ปิดประกาศ');
      bar.appendChild(x);
      document.body.insertAdjacentElement('afterbegin', bar);

      function applyOffset() {
        var h = bar.offsetHeight;
        var navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 64;
        document.body.style.paddingTop = h + 'px';
        var nav = document.getElementById('main-nav'); if (nav) nav.style.top = h + 'px';
        var dr = document.getElementById('mobile-drawer'); if (dr) dr.style.top = (h + navH) + 'px';
      }
      applyOffset();
      window.addEventListener('resize', applyOffset, { passive: true });
      x.addEventListener('click', function () {
        bar.remove();
        document.body.style.paddingTop = '';
        var nav = document.getElementById('main-nav'); if (nav) nav.style.top = '';
        var dr = document.getElementById('mobile-drawer'); if (dr) dr.style.top = '';
      });
    }).catch(function () {});
  }

  function applyLineLinks() {
    if (typeof CMS === 'undefined') return;
    CMS.get().then(function(c){
      var href = CMS.lineChat ? CMS.lineChat(c.contact) : ((c.contact && c.contact.line) || '#');
      var b1 = document.getElementById('nav-line-btn');
      var b2 = document.getElementById('drawer-line-btn');
      if (b1) b1.href = href;
      if (b2) b2.href = href;
    }).catch(function(){});
  }

  function getMountEl() {
    let el = document.getElementById('navbar-mount');
    if (!el) {
      el = document.createElement('div');
      el.id = 'navbar-mount';
      document.body.insertAdjacentElement('afterbegin', el);
    }
    return el;
  }

  function initBehavior() {
    const nav       = document.getElementById('main-nav');
    const hamburger = document.getElementById('hamburger-btn');
    const drawer    = document.getElementById('mobile-drawer');
    if (!nav) return;

    // Scroll effect
    function onScroll() { nav.classList.toggle('scrolled', window.scrollY > 40); }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Hamburger
    let open = false;
    function setOpen(val) {
      open = val;
      drawer?.classList.toggle('open', open);
      hamburger?.setAttribute('aria-expanded', open);
      const lines = hamburger?.querySelectorAll('.hamburger-line');
      if (lines) {
        if (open) {
          lines[0].style.transform = 'translateY(5.5px) rotate(45deg)';
          lines[1].style.opacity   = '0';
          lines[2].style.transform = 'translateY(-5.5px) rotate(-45deg)';
        } else {
          lines[0].style.transform = '';
          lines[1].style.opacity   = '';
          lines[2].style.transform = '';
        }
      }
    }

    hamburger?.addEventListener('click', () => setOpen(!open));

    // Close on outside click or drawer link click
    document.addEventListener('click', e => {
      if (open && !nav.contains(e.target) && !drawer?.contains(e.target)) setOpen(false);
    });
    drawer?.querySelectorAll('.drawer-link').forEach(l => l.addEventListener('click', () => setOpen(false)));

    // Close on resize ≥ 900
    window.addEventListener('resize', () => { if (open && window.innerWidth >= 900) setOpen(false); }, { passive: true });

    // Escape key
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && open) setOpen(false); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderNavbar);
  } else {
    renderNavbar();
  }
})();
