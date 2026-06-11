/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Homepage JS
   js/home.js
═══════════════════════════════════════════════ */

'use strict';

// ── รูปปกของสินค้า (V12: รองรับหลายรูป + coverIndex) ──
function homeCoverOf(p) {
  if (Array.isArray(p.images) && p.images.length) {
    const i = (typeof p.coverIndex === 'number' && p.images[p.coverIndex]) ? p.coverIndex : 0;
    return p.images[i].url || p.images[i] || '';
  }
  return p.image || '';
}


document.addEventListener('DOMContentLoaded', async () => {
  applyCMSContent();   // เนื้อหาจากหลังบ้าน (hero/promo/stats)
  loadHomeReviews();   // รีวิวจริงจากลูกค้า

  // ─── Hero Particle Canvas ───
  initParticles();

  // ─── Hero Card Carousel ───
  initHeroCarousel();

  // ─── Hero Card Carousel ───
  initHeroCarousel();

  // ─── Load Firebase + Products ───
  try {
    const db = await DMC.getFirebaseReady();
    await Promise.all([
      loadFeaturedProducts(db),
      loadCategories(db)
    ]);
  } catch (e) {
    console.warn('Firebase not configured yet, showing placeholder data');
    renderPlaceholderProducts();
  }

  // ─── Intersection Observer (scroll animations) ───
  initScrollAnimations();

});

// ─── Particle Canvas ───
function initParticles() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = canvas.offsetWidth  || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // Re-init particles when theme changes (MutationObserver on html[data-theme])
  const observer = new MutationObserver(() => { buildParticles(); });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  let particles = [];

  function getAccentRgb() {
    // Read accent from computed CSS variable
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--particle-col').trim() || '#0EA5E9';
    const hex = raw.replace('#','');
    if (hex.length === 6) {
      return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)];
    }
    return [14,165,233];
  }

  function buildParticles() {
    const COUNT = 48;
    particles = [];
    for (let i = 0; i < COUNT; i++) {
      const useGold = Math.random() > 0.72;
      particles.push({
        x:  Math.random() * canvas.width,
        y:  Math.random() * canvas.height,
        r:  Math.random() * 1.4 + 0.5,
        dx: (Math.random() - 0.5) * 0.32,
        dy: (Math.random() - 0.5) * 0.32,
        alpha: Math.random() * 0.45 + 0.12,
        useGold,
      });
    }
  }
  buildParticles();

  let raf;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const [ar, ag, ab] = getAccentRgb();

    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const ddx = particles[i].x - particles[j].x;
        const ddy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(ddx*ddx + ddy*ddy);
        if (dist < 108) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(${ar},${ag},${ab},${0.07 * (1 - dist/108)})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
        }
      }
    }

    particles.forEach(p => {
      p.x += p.dx; p.y += p.dy;
      if (p.x < 0 || p.x > canvas.width)  p.dx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.dy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      if (p.useGold) {
        ctx.fillStyle = `rgba(245,158,11,${p.alpha})`;
      } else {
        ctx.fillStyle = `rgba(${ar},${ag},${ab},${p.alpha})`;
      }
      ctx.fill();
    });

    raf = requestAnimationFrame(draw);
  }

  // Stop animation when tab hidden (perf)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); }
    else { draw(); }
  });

  draw();
}

// ─── Load Featured Products ───
async function loadFeaturedProducts(db) {
  const container = document.getElementById('featured-products');
  if (!container) return;

  try {
    const snap = await db.collection('products')
      .where('active', '==', true)
      .orderBy('featured', 'desc')
      .limit(8)
      .get();

    if (snap.empty) { renderPlaceholderProducts(); return; }

    container.innerHTML = '';
    snap.forEach(doc => {
      const p = { id: doc.id, ...doc.data() };
      container.insertAdjacentHTML('beforeend', buildProductCard(p));
    });

    bindProductCardEvents(container);

  } catch (e) {
    console.warn('Products load error:', e);
    renderPlaceholderProducts();
  }
}

// ─── Load Categories ───
async function loadCategories(db) {
  const container = document.getElementById('categories-grid');
  if (!container) return;

  try {
    const snap = await db.collection('categories')
      .orderBy('order')
      .get();

    if (snap.empty) return; // keep static HTML

    container.innerHTML = '';
    snap.forEach(doc => {
      const c = { id: doc.id, ...doc.data() };
      container.insertAdjacentHTML('beforeend', `
        <a href="catalog.html?cat=${c.id}" class="cat-card">
          <span class="cat-icon">${DMC.escapeHtml(c.icon || '📦')}</span>
          <div class="cat-name">${DMC.escapeHtml(c.name)}</div>
          <div class="cat-count">${c.count || 0} รายการ</div>
        </a>
      `);
    });

  } catch (e) {
    console.warn('Categories load error:', e);
  }
}

// ─── Build Product Card HTML ───
function buildProductCard(p) {
  const badges = [];
  if (p.isNew)  badges.push('<span class="badge badge-new">✨ ใหม่</span>');
  if (p.isHot)  badges.push('<span class="badge badge-hot">🔥 ขายดี</span>');
  if (p.isSale) badges.push('<span class="badge badge-sale">💰 ลด</span>');

  const oldPrice = p.oldPrice
    ? `<span class="product-price-old">${DMC.formatPrice(p.oldPrice)}</span>`
    : '';

  return `
    <a href="product.html?id=${p.id}" class="product-card" data-id="${p.id}">
      <div class="product-img-wrap">
        ${homeCoverOf(p)
          ? `<img src="${homeCoverOf(p)}" alt="${DMC.escapeHtml(p.name)}" loading="lazy">`
          : `<span>${p.emoji || '📦'}</span>`
        }
        <div class="product-img-overlay"></div>
        ${badges.length ? `<div class="product-badges">${badges.join('')}</div>` : ''}
        <button class="product-wish" data-id="${p.id}" title="บันทึก" aria-label="Wishlist">♡</button>
      </div>
      <div class="product-info">
        <div class="product-name">${DMC.escapeHtml(p.name)}</div>
        <div class="product-desc">${DMC.escapeHtml(p.shortDesc || '')}</div>
        <div class="product-footer">
          <div>
            <div class="product-price">
              ${DMC.formatPrice(p.price)}
              <span class="unit">/${p.unit || 'ชิ้น'}</span>
            </div>
            ${oldPrice}
          </div>
          <button class="btn-add-cart" data-id="${p.id}" title="ใส่ตะกร้า" aria-label="Add to cart">+</button>
        </div>
      </div>
    </a>
  `;
}

// ─── Bind product card events ───
function bindProductCardEvents(container) {
  // Add to cart (stop propagation to prevent nav)
  container.querySelectorAll('.btn-add-cart').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.id;
      const card = btn.closest('.product-card');
      const name = card?.querySelector('.product-name')?.textContent || '';
      const priceText = card?.querySelector('.product-price')?.textContent || '0';
      const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
      DMC.addToCart({ id, name, price, qty: 1 });
      btn.textContent = '✓';
      setTimeout(() => btn.textContent = '+', 1200);
    });
  });

  // Wishlist
  container.querySelectorAll('.product-wish').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.toggle('active');
      btn.textContent = btn.classList.contains('active') ? '♥' : '♡';
    });
  });
}

// ─── Placeholder Products (before Firebase configured) ───
function renderPlaceholderProducts() {
  const container = document.getElementById('featured-products');
  if (!container) return;

  const PRODUCTS = [
    { id: 'p1', name: 'รูปโพลารอยด์ 3×4 นิ้ว', shortDesc: 'กระดาษพรีเมียม คุณภาพสูง ทนทาน', price: 29, unit: 'ใบ', emoji: '📸', isHot: true },
    { id: 'p2', name: 'บัตรแขวนคอนักเรียน',      shortDesc: 'PVC อย่างดี พร้อมสายคล้อง',     price: 59, unit: 'ใบ', emoji: '🪪', isNew: true },
    { id: 'p3', name: 'นามบัตรพรีเมียม',         shortDesc: 'เคลือบมัน/ด้าน ขั้นต่ำ 100 ใบ', price: 199, unit: '100 ใบ', emoji: '💼', isSale: true },
    { id: 'p4', name: 'ป้าย QR Code',            shortDesc: 'อะคริลิก กันน้ำ พร้อมขาตั้ง',   price: 149, unit: 'ชิ้น', emoji: '📱' },
    { id: 'p5', name: 'ป้ายตุ๊กตาหัวดุ๊กดิ๊ก',   shortDesc: 'น่ารัก ทำมือ สกรีนสี',          price: 49,  unit: 'ชิ้น', emoji: '🧸', isNew: true },
    { id: 'p6', name: 'บัตรแขวนคอพนักงาน',      shortDesc: 'PVC พร้อมซองใส+สายคล้อง',      price: 69,  unit: 'ใบ', emoji: '🪪' },
    { id: 'p7', name: 'ป้ายชื่อร้านค้า',         shortDesc: 'อะคริลิก UV กันน้ำ ทนแดด',     price: 299, unit: 'ชิ้น', emoji: '🏪', isHot: true },
    { id: 'p8', name: 'โพลารอยด์ขนาดใหญ่ 4×6', shortDesc: 'ขนาดใหญ่ เหมาะตกแต่งห้อง',     price: 39,  unit: 'ใบ', emoji: '🖼️' },
  ];

  container.innerHTML = PRODUCTS.map(buildProductCard).join('');
  bindProductCardEvents(container);
}

// ─── Scroll Animations ───
function initScrollAnimations() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.cat-card, .product-card, .feature-card').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = `opacity 0.5s ease ${i * 0.05}s, transform 0.5s ease ${i * 0.05}s`;
    obs.observe(el);
  });
}

// ── Hero Card Carousel ──────────────────────────
function initHeroCarousel() {
  var carousel = document.getElementById('hero-carousel');
  if (!carousel) return;
  var cards = Array.from(carousel.querySelectorAll('.hcard'));
  if (cards.length < 2) return;

  // Dot indicators
  var dotsWrap = document.createElement('div');
  dotsWrap.className = 'hc-dots';
  cards.forEach(function(_, i){
    var d = document.createElement('div');
    d.className = 'hc-dot' + (i===0?' on':'');
    dotsWrap.appendChild(d);
  });
  carousel.appendChild(dotsWrap);

  var activeIdx = 0;

  function goTo(next) {
    if (next === activeIdx) return;
    cards.forEach(function(card, i){
      card.classList.remove('hc-active','hc-back','hc-hidden');
      var rel = ((i - next) + cards.length) % cards.length;
      if      (rel === 0) card.classList.add('hc-active');
      else if (rel === 1) card.classList.add('hc-back');
      else                card.classList.add('hc-hidden');
    });
    activeIdx = next;
    dotsWrap.querySelectorAll('.hc-dot').forEach(function(d,i){
      d.classList.toggle('on', i === activeIdx);
    });
  }

  // Click back or hidden card to bring to front
  cards.forEach(function(card, i){
    card.addEventListener('click', function(){
      if (card.classList.contains('hc-back') ||
          card.classList.contains('hc-hidden')) {
        goTo(i);
      }
    });
  });

  // Auto-rotate every 4s, pause on hover
  var timer = setInterval(function(){ goTo((activeIdx+1) % cards.length); }, 4000);
  carousel.addEventListener('mouseenter', function(){ clearInterval(timer); });
  carousel.addEventListener('mouseleave', function(){
    timer = setInterval(function(){ goTo((activeIdx+1) % cards.length); }, 4000);
  });
}


// ─── CMS: เนื้อหาหน้าแรกจากหลังบ้าน ───────────
async function applyCMSContent() {
  if (typeof CMS === 'undefined') return;
  try {
    const c = await CMS.get();
    const set = (id, text) => { const el = document.getElementById(id); if (el && text) el.textContent = text; };

    set('hero-badge-text', c.hero.badge);
    set('hero-t1', c.hero.title1);
    set('hero-t2', c.hero.title2);
    set('hero-t3', c.hero.title3);
    const desc = document.getElementById('hero-desc-text');
    if (desc && c.hero.desc) desc.innerHTML = DMC.escapeHtml(c.hero.desc).replace(/\n/g, '<br>');

    set('stat-orders', c.stats.orders);
    set('stat-rating', c.stats.rating);
    set('stat-days',   c.stats.days);

    const promoWrap = document.getElementById('promo-section-el');
    if (promoWrap) {
      if (c.promo.active === false) {
        promoWrap.style.display = 'none';
      } else {
        set('promo-tag-el',   c.promo.tag);
        set('promo-title-el', c.promo.title);
        set('promo-desc-el',  c.promo.desc);
        set('promo-btn-el',   c.promo.btnText);
      }
    }
  } catch (e) { /* ใช้ข้อความเดิมในไฟล์ */ }
}

// ─── รีวิวจริงบนหน้าแรก ───────────────────────
async function loadHomeReviews() {
  const wrap = document.getElementById('home-reviews');
  if (!wrap || typeof Reviews === 'undefined') return;
  try {
    const db   = await DMC.getFirebaseReady();
    const list = await Reviews.fetchApproved(db, null, 6);
    const section = document.getElementById('home-reviews-section');
    if (!list.length) { if (section) section.style.display = 'none'; return; }

    const avg = Reviews.avgRating(list);
    const sum = document.getElementById('home-rv-summary');
    if (sum) sum.innerHTML = Reviews.starsHtml(avg) +
      '<span class="rv-avg-num">' + avg.toFixed(1) + '</span>' +
      '<span class="rv-avg-count">จาก ' + list.length + ' รีวิว</span>';

    wrap.innerHTML = list.map(r => Reviews.cardHtml(r)).join('');
    if (typeof Loading !== 'undefined') Loading.staggerItems('#home-reviews .rv-card', 70);
  } catch (e) {
    const section = document.getElementById('home-reviews-section');
    if (section) section.style.display = 'none';
  }
}
