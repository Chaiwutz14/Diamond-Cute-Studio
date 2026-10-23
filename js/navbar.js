/* ═══════════════════════════════════════════════
   Diamond Cute Studio — Storefront navbar
   Homepage-only global search, responsive links and retained mobile drawer
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
      'product.html':'<rect x="3.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.4"',
      'cart.html':'<path d="M2.8 4h2.5l2.3 11.1a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.5l1.6-6.6H6.2"/><circle cx="9.8" cy="20" r="1.4"/><circle cx="17.1" cy="20" r="1.4"',
      'contact.html':'<path d="M6.5 3.5h3l1.5 4-2 1.7a14 14 0 0 0 5.8 5.8l1.7-2 4 1.5v3a2 2 0 0 1-2.2 2C10.6 18.6 5.4 13.4 4.5 5.7a2 2 0 0 1 2-2.2Z"/>'
    };
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (paths[href] || '') + '</svg>';
  }

  function renderNavbar() {
    const page = location.pathname.split('/').pop() || 'index.html';
    const isAdmin = page.startsWith('admin');
    const pageTitles = { 'catalog.html':'สินค้า', 'product.html':'รายละเอียดสินค้า', 'orders.html':'ติดตามออเดอร์', 'cart.html':'ตะกร้าสินค้า', 'about.html':'วิธีสั่งซื้อ', 'gallery.html':'ตัวอย่างงาน', 'contact.html':'ติดต่อเรา', '404.html':'ไม่พบหน้า' };
    const pageTitle = pageTitles[page] || 'ร้านค้า';

    const links = [
      { href: 'index.html',   label: 'หน้าแรก' },
      { href: 'catalog.html', label: 'สินค้าทั้งหมด' },
      { href: 'orders.html',  label: 'ติดตามออเดอร์' },
      { href: 'about.html',   label: 'วิธีสั่งซื้อ' },
      { href: 'gallery.html', label: 'ตัวอย่างงาน' },
      { href: 'contact.html', label: 'ติดต่อเรา' },
    ];
    const isCurrentNav = href => page === href || (page === 'product.html' && href === 'catalog.html');

    const desktopLinks = links.map(l =>
      `<a href="${l.href}" class="nav-link ${isCurrentNav(l.href) ? 'active' : ''}"${isCurrentNav(l.href) ? ' aria-current="page"' : ''}><span class="nav-link-icon">${navVector(l.href)}</span><span>${l.label}</span></a>`
    ).join('');

    const drawerLinks = links.map(l =>
      `<a href="${l.href}" class="drawer-link ${isCurrentNav(l.href) ? 'active' : ''}"${isCurrentNav(l.href) ? ' aria-current="page"' : ''}>
         <span class="drawer-link-icon">${navVector(l.href)}</span><span>${l.label}</span>
       </a>`
    ).join('');

    const isHome = page === 'index.html' || page === '';
    const pageTitleMarkup = isHome ? '' : `<span class="nav-page-label" aria-current="page">${pageTitle}</span>`;
    const homeSearchMarkup = isHome ? `
      <div class="nav-search-wrap" id="nav-search-wrap">
        <button class="nav-search-toggle" id="nav-search-toggle" type="button" aria-label="เปิดค้นหาสินค้า" aria-controls="nav-search-form" aria-expanded="false">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>
        </button>
        <form class="nav-search" id="nav-search-form" action="catalog.html" method="get" role="search" aria-label="ค้นหาสินค้า">
          <label class="nav-search-label" for="nav-search-input">ค้นหาสินค้า</label>
          <input id="nav-search-input" name="q" type="search" maxlength="120" placeholder="ค้นหาสินค้า เช่น โพลารอยด์ นามบัตร…" autocomplete="off">
          <button type="submit" aria-label="ค้นหา" class="nav-search-submit"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg></button>
        </form>
      </div>` : '';

    if (isAdmin) {
      getMountEl().innerHTML = `
        <nav class="navbar" id="main-nav">
          <div class="nav-inner">
            <a href="index.html" class="nav-logo">
              <img class="nav-logo-image" src="assets/dmc-logo.svg" alt="DMC Studio">
            </a>
            <div style="display:flex;align-items:center;gap:.5rem">
              <span class="badge badge-rose" style="font-size:.7rem"><svg viewBox="0 0 24 24" aria-hidden="true" style="width:1em;height:1em;vertical-align:-.15em"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2.6V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.6-1H6v-2.6h.2A1.7 1.7 0 0 0 8 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2H15V5a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v2.6H21a1.7 1.7 0 0 0-1.6 1Z"/></svg> Admin</span>
              <a href="index.html" class="btn btn-ghost btn-sm">← กลับร้าน</a>
            </div>
          </div>
        </nav>`;
      return;
    }

    getMountEl().innerHTML = `
      <nav class="navbar ${isHome ? 'navbar-home' : 'navbar-subpage'}" id="main-nav">
        <div class="nav-inner">
          <a href="index.html" class="nav-logo">
            <img class="nav-logo-image" src="assets/dmc-logo.svg" alt="DMC Studio">
          </a>

          ${pageTitleMarkup}
          <ul class="nav-links" role="list">${desktopLinks}</ul>
          ${homeSearchMarkup}
          <div class="nav-actions">
            <a href="orders.html" class="nav-icon-btn nav-account-btn" aria-label="ติดตามออเดอร์" title="ติดตามออเดอร์">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.7-3.5 3.1-5.3 7-5.3s6.3 1.8 7 5.3"/></svg>
            </a>
            <a href="cart.html" class="nav-icon-btn nav-cart-btn" aria-label="ตะกร้าสินค้า" title="ตะกร้า">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.8 4h2.5l2.3 11.1a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.5l1.6-6.6H6.2"/><circle cx="9.8" cy="20" r="1.4"/><circle cx="17.1" cy="20" r="1.4"/></svg>
              <span class="nav-cart-badge" style="display:none">0</span>
            </a>
            <button class="nav-hamburger" id="hamburger-btn" type="button" aria-label="เมนู" aria-controls="mobile-drawer" aria-expanded="false">
              <span class="hamburger-line"></span>
              <span class="hamburger-line"></span>
              <span class="hamburger-line"></span>
            </button>
          </div>
        </div>
      </nav>

      <!-- Mobile Drawer -->
      <nav class="mobile-drawer" id="mobile-drawer" aria-label="เมนูมือถือ" aria-hidden="true">
        <div class="drawer-links">${drawerLinks}</div>
        <div class="drawer-actions">
          <a href="contact.html" id="drawer-line-btn" class="btn btn-line btn-md" style="flex:1"><span class="drawer-action-icon">${navVector('contact.html')}</span><span class="drawer-action-label">ดูช่องทางติดต่อ</span></a>
          <a href="cart.html" class="btn btn-secondary btn-md" style="flex:1"><span class="drawer-action-icon">${navVector('cart.html')}</span><span>ตะกร้า</span></a>
        </div>
      </nav>`;

    initBehavior();
    applyLineLinks();
    applyAnnounce();
    if (page === 'index.html' || page === '') initHeaderSearch();
  }

  function initHeaderSearch() {
    var wrap = document.getElementById('nav-search-wrap');
    var toggle = document.getElementById('nav-search-toggle');
    var input = document.getElementById('nav-search-input');
    if (!wrap || !toggle || !input) return;
    var searchIcon = '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>';
    var closeIcon = '<path d="m6 6 12 12M18 6 6 18"/>';
    function setOpen(open) {
      wrap.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'ปิดช่องค้นหา' : 'เปิดค้นหาสินค้า');
      toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + (open ? closeIcon : searchIcon) + '</svg>';
    }
    function close(restoreFocus) {
      setOpen(false);
      if (restoreFocus) toggle.focus();
    }
    toggle.addEventListener('click', function () {
      var open = !wrap.classList.contains('is-open');
      setOpen(open);
      if (open) input.focus();
    });
    document.addEventListener('click', function (event) {
      if (!wrap.contains(event.target) && window.innerWidth > 900) close(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && wrap.classList.contains('is-open')) close(true);
    });
  }

  function applyAnnounce() {
    if (typeof CMS === 'undefined') return;
    var page = location.pathname.split('/').pop() || 'index.html';
    if (page.indexOf('admin') === 0) return;          // ไม่โชว์ในหลังบ้าน
    CMS.get().then(function (c) {
      var a = c.announce || {};
      if (!a.active || !a.text) return;
      if (document.getElementById('dmc-announce-bar')) return;
      var bar = document.createElement('div');
      bar.id = 'dmc-announce-bar';
      var span = document.createElement('span');
      span.textContent = a.text;                      // textContent — กัน XSS
      bar.appendChild(span);
      var x = document.createElement('button');
      x.type = 'button'; x.className = 'dmc-an-x'; x.textContent = '✕';
      x.setAttribute('aria-label', 'ปิดประกาศ');
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
      var href = CMS.lineChat ? CMS.lineChat(c.contact) : ((c.contact && c.contact.line) || 'contact.html');
      var b2 = document.getElementById('drawer-line-btn');
      if (b2) {
        try {
          var url = new URL(href);
          var host = url.hostname.toLowerCase().replace(/^www\./, '');
          var safeLine = url.protocol === 'https:' && (host === 'line.me' || host === 'lin.ee') && url.pathname !== '/';
          b2.href = safeLine ? url.href : 'contact.html';
          if (safeLine) { b2.target = '_blank'; b2.rel = 'noopener noreferrer'; b2.querySelector('.drawer-action-label').textContent = 'ติดต่อ LINE'; }
          else { b2.removeAttribute('target'); b2.removeAttribute('rel'); b2.querySelector('.drawer-action-label').textContent = 'ดูช่องทางติดต่อ'; }
        } catch (e) { b2.href = 'contact.html'; b2.removeAttribute('target'); b2.removeAttribute('rel'); b2.querySelector('.drawer-action-label').textContent = 'ดูช่องทางติดต่อ'; }
      }
    }).catch(function(){ var b2 = document.getElementById('drawer-line-btn'); if (b2) { b2.href = 'contact.html'; b2.removeAttribute('target'); b2.removeAttribute('rel'); b2.querySelector('.drawer-action-label').textContent = 'ดูช่องทางติดต่อ'; } });
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
      drawer?.setAttribute('aria-hidden', String(!open));
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
      if (open) drawer?.querySelector('.drawer-link')?.focus();
    }

    hamburger?.addEventListener('click', () => setOpen(!open));

    // Close on outside click or drawer link click
    document.addEventListener('click', e => {
      if (open && !nav.contains(e.target) && !drawer?.contains(e.target)) setOpen(false);
    });
    drawer?.querySelectorAll('.drawer-link').forEach(l => l.addEventListener('click', () => setOpen(false)));

    // Close the drawer once desktop links return.
    window.addEventListener('resize', () => { if (open && window.innerWidth > 1040) setOpen(false); }, { passive: true });

    // Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && open) { setOpen(false); hamburger?.focus(); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderNavbar);
  } else {
    renderNavbar();
  }
})();
