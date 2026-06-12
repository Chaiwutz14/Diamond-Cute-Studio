/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Navbar JS  v2
   Mobile-first · theme-switcher ready
═══════════════════════════════════════════════ */
(function () {
  'use strict';

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
      `<a href="${l.href}" class="nav-link ${page === l.href ? 'active' : ''}">${l.label}</a>`
    ).join('');

    const drawerLinks = links.map(l =>
      `<a href="${l.href}" class="drawer-link ${page === l.href ? 'active' : ''}">
         <span>${l.icon}</span> ${l.label}
       </a>`
    ).join('');

    if (isAdmin) {
      getMountEl().innerHTML = `
        <nav class="navbar" id="main-nav">
          <div class="nav-inner">
            <a href="index.html" class="nav-logo">
              <span class="nav-logo-icon">💎</span>
              <span class="nav-logo-text">Diamond Cute Studio</span>
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
            <span class="nav-logo-icon">💎</span>
            <span class="nav-logo-text">Diamond Cute Studio</span>
          </a>

          <ul class="nav-links" role="list">${desktopLinks}</ul>

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
