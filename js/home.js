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
  applyCMSContent();    // เนื้อหาจากหลังบ้าน (hero/promo/stats)
  loadHomeReviews();    // รีวิวจริงจากลูกค้า
  loadCategoryCounts(); // นับจำนวนสินค้าจริงต่อหมวด (เจ้าของ #categories-grid)
  loadHomeGallery();    // V4: แถบผลงานจริง (#home-gallery)

  // ─── Load Firebase + Products ───
  try {
    const db = await DMC.getFirebaseReady();
    await loadFeaturedProducts(db);
  } catch (e) {
    console.warn('Firebase not configured yet, showing placeholder data');
    renderPlaceholderProducts();
  }

  // ─── Intersection Observer (scroll animations) ───
  initScrollAnimations();
});

// ─── Load Featured Products ───
async function loadFeaturedProducts(db) {
  const container = document.getElementById('featured-products');
  if (!container) return;

  try {
    // V.upgrade1: ดึงเฉพาะ active แล้วจัดอันดับ featured ฝั่ง client
    // (เลี่ยง composite index ที่ทำให้หน้าแรกเด้งไปโชว์สินค้า demo เมื่อ index ยังไม่ถูกสร้าง)
    const snap = await db.collection('products')
      .where('active', '==', true)
      .limit(60)
      .get();

    if (snap.empty) { renderPlaceholderProducts(); return; }

    let items = [];
    snap.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
    items.sort((a, b) => {
      const fa = a.featured ? 1 : 0, fb = b.featured ? 1 : 0;
      if (fb !== fa) return fb - fa;                                  // featured ก่อน
      return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0); // ใหม่ก่อน
    });
    items = items.slice(0, 8);

    container.innerHTML = '';
    items.forEach(p => container.insertAdjacentHTML('beforeend', buildProductCard(p)));

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

// V4: หน้าแรกออกแบบใหม่ (Direction B) — hero เป็นการ์ดไล่สี ไม่มี carousel/particle อีกต่อไป

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

// ─── นับจำนวนสินค้าจริงต่อหมวด + รองรับหมวด custom ───
async function loadCategoryCounts() {
  const grid = document.getElementById('categories-grid');
  if (!grid || typeof DMC === 'undefined') return;
  try {
    const db = await DMC.getFirebaseReady();

    // map ชื่อหมวด → slug + emoji (ทั้ง built-in และ custom)
    // หมวดหมู่จาก module กลาง (js/categories.js)
    const BUILTIN = (window.DMCCat ? DMCCat.BUILTIN : []);

    const snap = await db.collection('products').get();
    const counts = {};
    let total = 0;
    snap.forEach(doc => {
      const cat = (doc.data().category || '').toString().trim().toLowerCase();
      counts[cat] = (counts[cat] || 0) + 1;
      total++;
    });
    if (total === 0) return; // ไม่มีสินค้า → คงตัวเลขเดิม

    function countFor(matches) {
      return matches.reduce((s, m) => s + (counts[m.toLowerCase()] || 0), 0);
    }

    // built-in + custom จาก module กลาง
    const allCats = window.DMCCat ? await DMCCat.loadAll(db) : BUILTIN;

    // สร้างการ์ดใหม่
    let html = '';
    let shownTotal = 0;
    allCats.forEach(cat => {
      const n = countFor(cat.match);
      shownTotal += n;
      const label = n > 0 ? (n + ' รายการ') : 'เร็วๆ นี้';
      html += '<a href="catalog.html?cat=' + encodeURIComponent(cat.slug) + '" class="cat-card">'
        + '<span class="cat-icon">' + cat.emoji + '</span>'
        + '<div class="cat-name">' + DMC.escapeHtml(cat.name) + '</div>'
        + '<div class="cat-count">' + label + '</div></a>';
    });
    // การ์ด "ทั้งหมด"
    html += '<a href="catalog.html" class="cat-card"><span class="cat-icon">✨</span>'
      + '<div class="cat-name">ทั้งหมด</div><div class="cat-count">' + total + ' รายการ</div></a>';

    grid.innerHTML = html;
  } catch (e) { /* คงตัวเลขเดิม */ }
}

// ─── Hero showcase: ใช้ผลงานจริงล่าสุด 2-4 ชิ้น ───
async function loadHomeGallery() {
  if (typeof DMC === 'undefined') return;
  const wrap = document.getElementById('home-gallery');
  const section = document.getElementById('home-gallery-section');
  if (!wrap) return;

  let imgs = [];
  try {
    const db = await DMC.getFirebaseReady();
    const snap = await db.collection('gallery').limit(20).get();
    snap.forEach(doc => {
      const x = doc.data();
      if (x.active === false) return;
      const url = x.image || x.imageUrl || x.url;
      if (url) imgs.push({ url, name: x.name || x.title || 'ผลงาน' });
    });
  } catch (e) { /* ออฟไลน์ → ใช้ fallback */ }

  // ยังไม่มีรูปจริงพอ → ใช้ภาพ fallback (ธีมงานพิมพ์/ความทรงจำ)
  if (imgs.length < 3) imgs = HERO_FALLBACK_IMAGES.slice();
  imgs = imgs.slice(0, 8);

  wrap.innerHTML = imgs.map(p =>
    '<div class="hp-gcard"><img src="' + DMC.escapeHtml(p.url) + '" alt="' + DMC.escapeHtml(p.name) + '" loading="lazy">'
    + '<div class="hp-gcap">' + DMC.escapeHtml(p.name) + '</div></div>'
  ).join('');

  if (typeof Loading !== 'undefined' && Loading.staggerItems) Loading.staggerItems('#home-gallery .hp-gcard', 60);
}

// รูป fallback (ใช้เมื่อร้านยังไม่อัปผลงานจริง) — ธีมงานพิมพ์/ความทรงจำ สัดส่วน 4:5
const HERO_FALLBACK_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1606293459339-aa5d34a7b0e1?w=600&h=750&fit=crop', name: 'โพลารอยด์สุดน่ารัก 📸' },
  { url: 'https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?w=600&h=750&fit=crop', name: 'เก็บทุกความทรงจำ 💕' },
  { url: 'https://images.unsplash.com/photo-1554080353-a576cf803bda?w=600&h=750&fit=crop', name: 'งานพิมพ์คุณภาพ ✨' },
];
