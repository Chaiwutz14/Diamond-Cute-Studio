/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Navbar JS
   js/navbar.js
═══════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── Navbar HTML Template ───
  function renderNavbar() {
    const currentPage = location.pathname.split('/').pop() || 'index.html';
    const isAdmin = currentPage.startsWith('admin');

    const links = [
      { href: 'index.html',   label: 'หน้าแรก',     icon: '🏠' },
      { href: 'catalog.html', label: 'สินค้าทั้งหมด', icon: '🛍️' },
      { href: 'about.html',   label: 'วิธีสั่งซื้อ',  icon: '📋' },
      { href: 'gallery.html', label: 'ตัวอย่างงาน', icon: '🖼️' },
      { href: 'contact.html', label: 'ติดต่อเรา',   icon: '💬' },
    ];

    const navLinksHtml = links.map(l => `
      <a href="${l.href}" class="nav-link ${currentPage === l.href ? 'active' : ''}">
        ${l.label}
      </a>
    `).join('');

    const drawerLinksHtml = links.map(l => `
      <a href="${l.href}" class="drawer-link ${currentPage === l.href ? 'active' : ''}">
        <span>${l.icon}</span> ${l.label}
      </a>
    `).join('');

    if (isAdmin) {
      // Admin nav — simpler
      document.querySelector('#navbar-mount').innerHTML = `
        <nav class="navbar" id="main-nav">
          <div class="nav-inner">
            <a href="index.html" class="nav-logo">
              <span class="nav-logo-icon">💎</span>
              <span class="nav-logo-text">Diamond Cute Studio</span>
            </a>
            <div style="display:flex;align-items:center;gap:0.5rem">
              <span class="badge badge-rose" style="font-size:0.72rem">🔐 Admin Mode</span>
              <a href="index.html" class="btn btn-ghost btn-sm">← กลับหน้าร้าน</a>
            </div>
          </div>
        </nav>
      `;
      return;
    }

    document.querySelector('#navbar-mount').innerHTML = `
      <nav class="navbar" id="main-nav">
        <div class="nav-inner">
          <a href="index.html" class="nav-logo">
            <span class="nav-logo-icon">💎</span>
            <span class="nav-logo-text">Diamond Cute Studio</span>
          </a>

          <ul class="nav-links">
            ${navLinksHtml}
          </ul>

          <div class="nav-actions">
            <a href="https://line.me/R/ti/p/YOUR_LINE_OA" target="_blank" rel="noopener"
               class="btn btn-line btn-sm hide-mobile">
              💬 LINE
            </a>
            <a href="cart.html" class="nav-icon-btn" aria-label="Cart" title="ตะกร้าสินค้า">
              🛒
              <span class="nav-cart-badge" style="display:none">0</span>
            </a>
            <button class="nav-hamburger" id="hamburger-btn" aria-label="Menu">
              <span class="hamburger-line"></span>
              <span class="hamburger-line"></span>
              <span class="hamburger-line"></span>
            </button>
          </div>
        </div>
      </nav>

      <!-- Mobile Drawer -->
      <div class="mobile-drawer" id="mobile-drawer">
        <div class="drawer-links">
          ${drawerLinksHtml}
        </div>
        <div class="drawer-actions">
          <a href="https://line.me/R/ti/p/YOUR_LINE_OA" target="_blank" rel="noopener"
             class="btn btn-line btn-md" style="flex:1">💬 ติดต่อ LINE</a>
          <a href="cart.html" class="btn btn-secondary btn-md" style="flex:1">🛒 ตะกร้า</a>
        </div>
      </div>
    `;

    initNavbarBehavior();
  }

  // ─── Navbar Behavior ───
  function initNavbarBehavior() {
    const nav      = document.getElementById('main-nav');
    const hamburger = document.getElementById('hamburger-btn');
    const drawer    = document.getElementById('mobile-drawer');

    // Scroll effect
    function onScroll() {
      if (window.scrollY > 40) nav?.classList.add('scrolled');
      else nav?.classList.remove('scrolled');
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Hamburger toggle
    let isOpen = false;
    hamburger?.addEventListener('click', () => {
      isOpen = !isOpen;
      drawer?.classList.toggle('open', isOpen);
      const lines = hamburger.querySelectorAll('.hamburger-line');
      if (isOpen) {
        lines[0].style.transform = 'translateY(6px) rotate(45deg)';
        lines[1].style.opacity = '0';
        lines[2].style.transform = 'translateY(-6px) rotate(-45deg)';
      } else {
        lines[0].style.transform = '';
        lines[1].style.opacity = '';
        lines[2].style.transform = '';
      }
    });

    // Close drawer on outside click
    document.addEventListener('click', e => {
      if (isOpen && !nav?.contains(e.target) && !drawer?.contains(e.target)) {
        isOpen = false;
        drawer?.classList.remove('open');
        hamburger?.querySelectorAll('.hamburger-line').forEach(l => {
          l.style.transform = ''; l.style.opacity = '';
        });
      }
    });

    // Close on resize
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900 && isOpen) {
        isOpen = false;
        drawer?.classList.remove('open');
      }
    }, { passive: true });
  }

  // ─── Initialize ───
  function init() {
    if (!document.getElementById('navbar-mount')) {
      const mount = document.createElement('div');
      mount.id = 'navbar-mount';
      document.body.insertAdjacentElement('afterbegin', mount);
    }
    renderNavbar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
