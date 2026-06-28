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
  applyCMSContent();    // เนื้อหาจากหลังบ้าน (hero/promo/stats) — V24: อ่าน snapshot ก่อน ไม่บังคับโหลด Firebase
  loadHomeReviews();    // รีวิวจริง — V24: อ่าน snapshot (data/reviews.json) ไม่บังคับโหลด Firebase
  loadCategoryCounts(); // นับจำนวนสินค้าจริงต่อหมวด (เจ้าของ #categories-grid)
  loadHomeGallery();    // V4: แถบผลงานจริง (#home-gallery)
  initHeroShowcase();   // V16: coverflow ผลงานฝั่งขวา (เฉพาะเดสก์ท็อป)

  // ─── V24/PERF-B: โหลดสินค้าจาก snapshot โดยตรง (ไม่ await getFirebaseReady ก่อน) ──
  //   loadFeaturedProducts ใช้ DMC.loadProducts() (snapshot → cache → Firestore) อยู่แล้ว
  //   ผล: หน้าแรกเรนเดอร์สินค้าได้ทันทีจากไฟล์ CDN ไม่ต้องรอ Firebase SDK
  loadFeaturedProducts().catch(() => renderPlaceholderProducts());

  // ─── Intersection Observer (scroll animations) ───
  initScrollAnimations();
});

// ─── Load Featured Products ───
async function loadFeaturedProducts() {
  const container = document.getElementById('featured-products');
  if (!container) return;

  try {
    // V16: ใช้ตัวโหลดกลาง (snapshot → cache → Firestore) — อ่านสินค้า "ครั้งเดียว/เซสชัน" หรือ 0 (snapshot)
    const all = await DMC.loadProducts();
    if (!all || !all.length) { renderPlaceholderProducts(); return; }

    let items = all.slice();
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
    // PERF-03: อ่านจาก snapshot/cache (อ่าน Firestore ครั้งเดียว/เซสชัน หรือ 0) แล้วเรียงตาม order ฝั่ง client
    const list = (await DMC.loadCategoriesRaw()).slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (!list.length) return; // keep static HTML

    container.innerHTML = '';
    list.forEach(c => {
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
          ? `<img src="${DMC.imgCDN(homeCoverOf(p), 440)}" data-full="${DMC.escapeHtml(homeCoverOf(p))}" alt="${DMC.escapeHtml(p.name)}" loading="lazy" decoding="async">`
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
      // bug-fix: เดิมไม่ส่ง image → ตะกร้าโชว์เป็น emoji กล่อง 📦 · ตอนนี้อ่านจาก <img> ในการ์ด
      const image = card?.querySelector('.product-card-img img, .product-img img, img')?.src || '';
      DMC.addToCart({ id, name, price, image, qty: 1 });
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
    // V24/PERF-B: อ่านรีวิวจาก snapshot (data/reviews.json) → ไม่บังคับโหลด Firebase บนหน้าแรก
    //   fallback อัตโนมัติไป Firestore ถ้ายังไม่มีไฟล์ (DMC.loadReviews จัดการให้)
    const list = (await DMC.loadReviews({ limit: 6 })).slice(0, 6);
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
    // หมวดหมู่จาก module กลาง (js/categories.js)
    const BUILTIN = (window.DMCCat ? DMCCat.BUILTIN : []);

    // V16: นับจากชุดสินค้าชุดเดียวกับ featured (ไม่อ่านทั้งคอลเลกชันซ้ำอีกต่อไป → ลด Firestore reads ~50%)
    const all = await DMC.loadProducts();
    if (!all || !all.length) return;   // ไม่มีสินค้า → คงตัวเลขเดิม

    const counts = {};
    let total = 0;
    all.forEach(p => {
      const cat = (p.category || '').toString().trim().toLowerCase();
      counts[cat] = (counts[cat] || 0) + 1;
      total++;
    });

    function countFor(matches) {
      return matches.reduce((s, m) => s + (counts[m.toLowerCase()] || 0), 0);
    }

    // built-in เท่านั้น — fix 8 รายการบนหน้าแรกถาวร
    let html = '';
    BUILTIN.forEach(cat => {
      const n = countFor(cat.match);
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
  if (!wrap) return;

  let imgs = [];
  try {
    // V16: ใช้ตัวโหลดกลาง (snapshot → cache → Firestore) — limit พอดีที่โชว์
    const list = await DMC.loadGallery();
    list.forEach(x => {
      const url = x.image || x.imageUrl || x.url;
      if (url) imgs.push({ url, name: x.name || x.title || 'ผลงาน' });
    });
  } catch (e) { /* ออฟไลน์ → ใช้ fallback */ }

  // ยังไม่มีรูปจริงพอ → ใช้ภาพ fallback (ธีมงานพิมพ์/ความทรงจำ)
  if (imgs.length < 3) imgs = HERO_FALLBACK_IMAGES.slice();
  imgs = imgs.slice(0, 8);

  wrap.innerHTML = imgs.map(p =>
    '<div class="hp-gcard"><img src="' + DMC.imgCDN(p.url, 440) + '" data-full="' + DMC.escapeHtml(p.url) + '" alt="' + DMC.escapeHtml(p.name) + '" loading="lazy" decoding="async">'
    + '<div class="hp-gcap">' + DMC.escapeHtml(p.name) + '</div></div>'
  ).join('');

  if (typeof Loading !== 'undefined' && Loading.staggerItems) Loading.staggerItems('#home-gallery .hp-gcard', 60);
}

// รูป fallback (ใช้เมื่อร้านยังไม่อัปผลงานจริง) — ธีมงานพิมพ์/ความทรงจำ สัดส่วน 4:5
// ══════════════════════════════════════════════
//  V16 — Hero Showcase (coverflow) · เฉพาะเดสก์ท็อป
// ══════════════════════════════════════════════
async function initHeroShowcase() {
  const root = document.getElementById('hp-showcase');
  const stage = document.getElementById('hps-stage');
  const dotsEl = document.getElementById('hps-dots');
  if (!root || !stage || !dotsEl) return;

  // เฉพาะเดสก์ท็อป — มือถือใช้การ์ดแขวนเหมือนเดิม
  if (!window.matchMedia || !window.matchMedia('(min-width:1025px)').matches) return;

  // รูป: ใช้แกลเลอรี (ผลงานที่ส่งแล้ว) สูงสุด 5 รูป
  let items = [];
  try {
    const list = await DMC.loadGallery();
    list.forEach(x => {
      const url = x.image || x.imageUrl || x.url;
      if (url) items.push({
        url,
        name: x.name || x.title || 'ผลงานของเรา',
        sub:  x.category || x.subtitle || x.sub || 'Diamond Cute Studio',
        ts:   (x.createdAt && x.createdAt.seconds) || 0
      });
    });
  } catch (e) { /* ออฟไลน์ → ใช้ fallback */ }

  if (items.length < 2) {
    items = HERO_FALLBACK_IMAGES.slice(0, 5).map(p => ({ url: p.url, name: p.name, sub: 'ตัวอย่างผลงาน', ts: 0 }));
  }
  items = items.slice(0, 5);
  if (!items.length) return;

  // ป้าย "ส่งล่าสุด ..."
  updateDeliverBadge(items);

  let active = Math.floor(items.length / 2);   // เริ่มที่รูปกลาง

  stage.innerHTML = '';
  dotsEl.innerHTML = '';
  items.forEach((it, i) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'hps-card';
    card.setAttribute('aria-label', it.name);
    const img = document.createElement('img');
    img.src = DMC.imgCDN(it.url, 420);
    img.setAttribute('data-full', it.url);
    img.alt = it.name;
    img.loading = 'lazy';
    img.decoding = 'async';
    card.appendChild(img);
    card.addEventListener('click', () => { active = i; layout(); });
    stage.appendChild(card);

    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'hps-dot';
    dot.setAttribute('aria-label', 'รูปที่ ' + (i + 1));
    dot.addEventListener('click', () => { active = i; layout(); });
    dotsEl.appendChild(dot);
  });

  const cards = Array.prototype.slice.call(stage.children);
  const dots  = Array.prototype.slice.call(dotsEl.children);

  function setTxt(id, v) { const e = document.getElementById(id); if (e) e.textContent = v; }

  function layout() {
    cards.forEach((card, i) => {
      const off = i - active, aoff = Math.abs(off);
      let tx, scale, ry, op, z;
      if (off === 0)       { tx = 0;        scale = 1;   ry = 0;        op = 1;   z = 30; }
      else if (aoff === 1) { tx = off * 128; scale = .82; ry = off * -26; op = .92; z = 20; }
      else if (aoff === 2) { tx = off * 208; scale = .64; ry = off * -32; op = .55; z = 10; }
      else                 { tx = off * 260; scale = .5;  ry = off * -34; op = 0;   z = 0;  }
      card.style.transform = 'translateX(' + tx + 'px) scale(' + scale + ') rotateY(' + ry + 'deg)';
      card.style.opacity = op;
      card.style.zIndex = z;
      card.style.pointerEvents = op > 0 ? 'auto' : 'none';
      card.classList.toggle('is-active', off === 0);
    });
    dots.forEach((d, i) => d.classList.toggle('on', i === active));
    const it = items[active];
    setTxt('hps-title', it.name);
    setTxt('hps-sub', it.sub);
    setTxt('hps-frameno', 'FRAME ' + String(active + 1).padStart(2, '0'));
    const cntEl = document.getElementById('hps-count');
    if (cntEl) cntEl.innerHTML = '<span class="cur">' + String(active + 1).padStart(2, '0')
      + '</span><span class="sep"> / </span><span class="tot">' + String(items.length).padStart(2, '0') + '</span>';
  }
  function go(dir) { active = (active + dir + items.length) % items.length; layout(); }

  const prev = document.getElementById('hps-prev');
  const next = document.getElementById('hps-next');
  if (prev) prev.addEventListener('click', () => go(-1));
  if (next) next.addEventListener('click', () => go(1));

  layout();
  root.parentElement && root.closest('.hp-hero') && root.closest('.hp-hero').classList.add('has-showcase');

  // เลื่อนอัตโนมัติ (เคารพ reduced-motion + หยุดเมื่อ hover / พ้นจอ / สลับแท็บ)
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && items.length > 1) {
    let timer = null, onScreen = true, hovering = false;
    function start() {
      if (timer || !onScreen || hovering || document.hidden) return;   // เริ่มเฉพาะเมื่อควรเล่นจริง
      timer = setInterval(() => go(1), 4200);
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    root.addEventListener('mouseenter', () => { hovering = true; stop(); });
    root.addEventListener('mouseleave', () => { hovering = false; start(); });
    document.addEventListener('visibilitychange', () => { document.hidden ? stop() : start(); });
    // V17 (LOW-03): หยุดเมื่อ carousel เลื่อนพ้นจอ → ไม่เปลือง CPU/เพนต์ตอนมองไม่เห็น
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((ents) => {
        onScreen = !!(ents[0] && ents[0].isIntersecting);
        onScreen ? start() : stop();
      }, { threshold: 0.1 }).observe(root);
    }
    start();
  }
}

// อัปเดตป้ายเวลาส่งล่าสุด: CMS.lastDeliveredAt → รูปแกลเลอรีล่าสุด → ข้อความทั่วไป
async function updateDeliverBadge(items) {
  const el = document.getElementById('hps-deliver-text');
  if (!el) return;
  let ts = 0;
  try {
    const c = (typeof CMS !== 'undefined') ? await CMS.get() : null;
    const v = c && c.lastDeliveredAt;
    if (v) ts = v.seconds ? v.seconds : (typeof v === 'number' ? v : (Date.parse(v) / 1000 || 0));
  } catch (e) {}
  if (!ts && items) items.forEach(it => { if (it.ts > ts) ts = it.ts; });
  el.textContent = ts ? ('ส่งล่าสุด ' + relTimeTH(ts * 1000)) : 'ส่งทั่วไทย ทุกวัน';
}

// เวลาแบบสัมพัทธ์ภาษาไทย
function relTimeTH(ms) {
  const diff = Date.now() - ms;
  if (diff < 60000) return 'เมื่อสักครู่';
  const min = Math.floor(diff / 60000);
  if (min < 60) return min + ' นาทีที่แล้ว';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + ' ชั่วโมงที่แล้ว';
  const d = Math.floor(hr / 24);
  if (d < 30) return d + ' วันที่แล้ว';
  const mo = Math.floor(d / 30);
  if (mo < 12) return mo + ' เดือนที่แล้ว';
  return Math.floor(mo / 12) + ' ปีที่แล้ว';
}

const HERO_FALLBACK_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1606293459339-aa5d34a7b0e1?w=600&h=750&fit=crop', name: 'โพลารอยด์สุดน่ารัก 📸' },
  { url: 'https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?w=600&h=750&fit=crop', name: 'เก็บทุกความทรงจำ 💕' },
  { url: 'https://images.unsplash.com/photo-1554080353-a576cf803bda?w=600&h=750&fit=crop', name: 'งานพิมพ์คุณภาพ ✨' },
];
