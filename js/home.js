/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Homepage JS
   js/home.js
═══════════════════════════════════════════════ */

'use strict';

// ── รูปปกของสินค้า (V12: รองรับหลายรูป + coverIndex) ──
function homeCoverOf(p) {
  if (Array.isArray(p.images) && p.images.length) {
    const i = (typeof p.coverIndex === 'number' && p.images[p.coverIndex]) ? p.coverIndex : 0;
    const im = p.images[i];                                  // V.fix(A4): guard กัน null/undefined ใน array
    const selected = im ? (typeof im === 'string' ? im : (im.url || '')) : '';
    return selected || p.image || '';
  }
  return p.image || '';
}


const homeProductsById = new Map();

document.addEventListener('DOMContentLoaded', async () => {
  applyCMSContent();    // เนื้อหาจากหลังบ้าน (hero/stats) — V24: อ่าน snapshot ก่อน ไม่บังคับโหลด Firebase
  loadHomeReviews();    // รีวิวจริง — V24: อ่าน snapshot (data/reviews.json) ไม่บังคับโหลด Firebase
  loadCategoryCounts(); // นับจำนวนสินค้าจริงต่อหมวด (เจ้าของ #categories-grid)
  loadHomeGallery();    // Gallery strip with existing shared loader
  initHeroShowcase();   // Responsive collage from real product photos
  initTypewriter();     // V25: ข้อความจุดเด่นแบบพิมพ์/ลบวนลูป (อ่านค่าจาก #stat-* ที่ CMS เขียนได้)

  // ─── V24/PERF-B: โหลดสินค้าจาก snapshot โดยตรง (ไม่ await getFirebaseReady ก่อน) ──
  //   loadFeaturedProducts ใช้ DMC.loadProducts() (snapshot → cache → Firestore) อยู่แล้ว
  //   ผล: หน้าแรกเรนเดอร์สินค้าได้ทันทีจากไฟล์ CDN ไม่ต้องรอ Firebase SDK
  loadFeaturedProducts().catch(() => renderProductState('error'));

  // ─── Intersection Observer (scroll animations) ───
  initScrollAnimations();
});

// ─── V25: Typewriter trust line ─────────────────
//   พิมพ์ทีละตัว → ค้าง → ลบ → ประโยคถัดไป (วนลูป)
//   • อ่านค่าจาก span[hidden] #stat-orders / #stat-rating / #stat-days "ทุกรอบ"
//     → แอดมินแก้ตัวเลขจาก CMS หลังบ้านแล้วเห็นผลทันทีรอบถัดไป ไม่ต้องแก้โค้ด
//   • prefers-reduced-motion → แสดงข้อความนิ่งทั้งหมด ไม่มีอนิเมชัน
//   • แท็บถูกซ่อน → หยุดพิมพ์ชั่วคราว (ประหยัดแบต/CPU)
function initTypewriter() {
  const textEl = document.getElementById('hp-type-text');
  const noteEl = document.getElementById('hp-type-note');
  const srEl   = document.getElementById('hp-type-sr');
  if (!textEl) return;

  const val = (id, fb) => {
    const el = document.getElementById(id);
    const t = el ? (el.textContent || '').trim() : '';
    return t || fb;
  };

  // ประกอบ 3 ประโยคจากค่าปัจจุบัน (CMS เขียนทับ stat-* ได้)
  function buildSentences() {
    const orders = val('stat-orders', '500+');
    let rating   = val('stat-rating', '4.9/5');
    const days   = val('stat-days',   '1-3');

    if (rating && rating.indexOf('/') === -1) rating += '/5';   // "4.9" → "4.9/5"
    const ordersNum = orders.replace(/\+\s*$/, '');             // "500+" → "500"
    const dayMatch  = days.match(/(\d+)\s*$/);                  // "1-3" → "3"
    const maxDay    = dayMatch ? dayMatch[1] : days;

    return [
      { text: 'จำนวนมากกว่า ' + ordersNum + ' ออเดอร์', note: false },
      { text: 'คะแนนรีวิวร้าน ' + rating,                note: false },
      { text: 'ได้รับสินค้าไม่เกิน ' + maxDay + ' วัน',   note: true  },
    ];
  }

  // screen reader: สรุปนิ่งอ่านครั้งเดียว
  if (srEl) srEl.textContent = buildSentences().map(s => s.text).join(' · ');

  // ลดการเคลื่อนไหว → ข้อความนิ่ง
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    textEl.textContent = buildSentences().map(s => s.text).join(' · ');
    if (noteEl) noteEl.classList.add('show');
    return;
  }

  const TYPE_MS = 58, DELETE_MS = 26, HOLD_MS = 1700, GAP_MS = 420;
  let idx = 0, timer = null;

  const wait = (ms) => new Promise(r => { timer = setTimeout(r, ms); });
  const visible = () => !document.hidden;
  async function waitVisible() {
    while (!visible()) { await wait(600); }
  }

  async function loop() {
    // เริ่มรอบใหม่ทุกครั้ง → อ่านค่าล่าสุด (รองรับ CMS อัปเดต)
    for (;;) {
      const sentences = buildSentences();
      const s = sentences[idx % sentences.length];
      await waitVisible();

      // พิมพ์
      for (let i = 1; i <= s.text.length; i++) {
        textEl.textContent = s.text.slice(0, i);
        await wait(TYPE_MS);
        if (!visible()) await waitVisible();
      }
      if (noteEl) noteEl.classList.toggle('show', s.note);
      await wait(HOLD_MS);

      // ลบ
      for (let i = s.text.length - 1; i >= 0; i--) {
        textEl.textContent = s.text.slice(0, i);
        await wait(DELETE_MS);
        if (!visible()) await waitVisible();
      }
      if (noteEl) noteEl.classList.remove('show');
      await wait(GAP_MS);
      idx++;
    }
  }

  loop().catch(() => {
    // fallback สุดท้าย: อะไรพังก็แสดงข้อความนิ่ง ระบบอื่นไม่กระทบ
    try {
      clearTimeout(timer);
      textEl.textContent = buildSentences().map(s => s.text).join(' · ');
    } catch (e) { /* เงียบ */ }
  });
}

// ─── Load Featured Products ───
async function loadFeaturedProducts() {
  const container = document.getElementById('featured-products');
  if (!container) return;

  try {
    // V16: ใช้ตัวโหลดกลาง (snapshot → cache → Firestore) — อ่านสินค้า "ครั้งเดียว/เซสชัน" หรือ 0 (snapshot)
    const all = await DMC.loadProducts();
    if (!all || !all.length) { renderProductState('empty'); return; }

    let items = all.slice();
    items.sort((a, b) => {
      const fa = a.featured ? 1 : 0, fb = b.featured ? 1 : 0;
      if (fb !== fa) return fb - fa;                                  // featured ก่อน
      return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0); // ใหม่ก่อน
    });
    items = items.slice(0, 8);

    homeProductsById.clear();
    items.forEach(p => homeProductsById.set(String(p.id), p));
    container.innerHTML = '';
    items.forEach(p => container.insertAdjacentHTML('beforeend', buildProductCard(p)));

    bindProductCardEvents(container);

  } catch (e) {
    console.warn('Products load error:', e);
    renderProductState('error');
  }
}

function homeOptionGroups(product) {
  const cleanList = values => [...new Map(
    (Array.isArray(values) ? values : [])
      .map(value => String(value == null ? '' : value).trim())
      .filter(Boolean)
      .map(value => [value.toLocaleLowerCase(), value])
  ).values()];
  const sizes = cleanList(product.sizes);
  const materials = cleanList(product.materials);
  const existing = new Set([...sizes, ...materials].map(value => value.toLocaleLowerCase()));
  const variants = cleanList((Array.isArray(product.images) ? product.images : [])
    .filter(image => image && typeof image === 'object' && image.url)
    .map(image => image.label)
    .filter(label => label && !existing.has(String(label).trim().toLocaleLowerCase())));
  return [
    { key: 'variant', label: 'แบบ', values: variants },
    { key: 'size', label: 'ขนาด', values: sizes },
    { key: 'material', label: 'วัสดุ', values: materials },
  ].filter(group => group.values.length);
}

function homeMinimumQuantity(product) {
  const value = Number(product.minQty);
  return Number.isFinite(value) && value > 1 ? Math.ceil(value) : 1;
}

function homeCartItem(product, selection, quantity) {
  const options = [
    selection.variant ? 'แบบ: ' + selection.variant : '',
    selection.size || '',
    selection.material || '',
  ].filter(Boolean).join(' · ');
  const selectedImage = selection.variant && Array.isArray(product.images)
    ? product.images.find(image => image && typeof image === 'object' && image.url &&
      String(image.label || '').trim().toLocaleLowerCase() === selection.variant.trim().toLocaleLowerCase())
    : null;
  return {
    id: product.id,
    name: product.name,
    price: Number(product.price) || 0,
    qty: quantity,
    unit: product.unit || 'ชิ้น',
    minQty: homeMinimumQuantity(product),
    options,
    customDetails: '',
    image: selectedImage ? selectedImage.url : homeCoverOf(product),
  };
}

function addHomeProduct(product, selection, quantity, button) {
  try {
    DMC.addToCart(homeCartItem(product, selection, quantity));
    if (button) {
      const name = product.name || '';
      button.innerHTML = DMC.iconSvg('check');
      button.setAttribute('aria-label', `เพิ่ม ${name} ลงตะกร้าแล้ว`);
      window.setTimeout(() => {
        if (!button.isConnected) return;
        button.innerHTML = DMC.iconSvg('plus');
        button.setAttribute('aria-label', `เพิ่ม ${name} ลงตะกร้า`);
      }, 1200);
    }
    return true;
  } catch (error) {
    console.error('Home add-to-cart error:', error);
    return false;
  }
}

function openHomeOptionDialog(product, groups, trigger) {
  closeHomeOptionDialog(false);
  const selection = { variant: '', size: '', material: '' };
  groups.forEach(group => {
    if (group.values.length === 1) selection[group.key] = group.values[0];
  });
  const requiredGroups = groups.filter(group => group.values.length > 1);
  const minQty = homeMinimumQuantity(product);
  const overlay = document.createElement('div');
  overlay.className = 'home-option-backdrop';
  overlay.innerHTML = `
    <section class="home-option-dialog" role="dialog" aria-modal="true" aria-labelledby="home-option-title" aria-describedby="home-option-description" tabindex="-1">
      <header class="home-option-header">
        <div><p class="home-option-eyebrow">เลือกให้ตรงใจ</p><h2 id="home-option-title">${DMC.escapeHtml(product.name || 'ตัวเลือกสินค้า')}</h2></div>
        <button type="button" class="home-option-close" aria-label="ปิดหน้าต่าง">${DMC.iconSvg('close')}</button>
      </header>
      <p id="home-option-description" class="home-option-description">เลือกตัวเลือกและจำนวนก่อนเพิ่มสินค้าลงตะกร้า</p>
      <div class="home-option-groups">${groups.map(group => `
        <div class="home-option-group" role="group" aria-labelledby="home-option-label-${group.key}">
          <h3 id="home-option-label-${group.key}">${group.label}</h3>
          <div class="home-option-choices">${group.values.map((value, index) => `
            <button type="button" class="home-option-choice" data-group="${group.key}" data-index="${index}" aria-pressed="${selection[group.key] === value}">${DMC.escapeHtml(value)}</button>
          `).join('')}</div>
        </div>`).join('')}
      </div>
      <div class="home-option-quantity-row">
        <label for="home-option-quantity">จำนวน <span>${DMC.escapeHtml(product.unit || 'ชิ้น')}</span></label>
        <input id="home-option-quantity" type="number" inputmode="numeric" min="${minQty}" step="1" value="${minQty}" aria-describedby="home-option-minimum">
      </div>
      <p id="home-option-minimum" class="home-option-minimum">${minQty > 1 ? `สั่งขั้นต่ำ ${minQty} ${DMC.escapeHtml(product.unit || 'ชิ้น')}` : `ราคาเริ่มต้น ${DMC.formatPrice(product.price || 0)} ต่อ ${DMC.escapeHtml(product.unit || 'ชิ้น')}`}</p>
      <p class="home-option-error" role="status" aria-live="polite"></p>
      <footer class="home-option-footer"><span>รวม <strong class="home-option-total"></strong></span><button type="button" class="home-option-confirm btn btn-primary btn-md" disabled>เพิ่มลงตะกร้า</button></footer>
    </section>`;
  document.body.appendChild(overlay);
  document.body.classList.add('home-option-open');
  const dialog = overlay.querySelector('[role="dialog"]');
  const quantityInput = overlay.querySelector('#home-option-quantity');
  const confirmButton = overlay.querySelector('.home-option-confirm');
  const total = overlay.querySelector('.home-option-total');
  const error = overlay.querySelector('.home-option-error');

  function updateQuantity(commit = true) {
    const parsed = Number.parseInt(quantityInput.value, 10);
    const quantity = Number.isFinite(parsed) ? Math.max(minQty, parsed) : minQty;
    if (commit) quantityInput.value = String(quantity);
    total.textContent = DMC.formatPrice((Number(product.price) || 0) * quantity);
    return quantity;
  }
  function syncChoices() {
    overlay.querySelectorAll('.home-option-choice').forEach(button => {
      const chosen = selection[button.dataset.group] === groups.find(group => group.key === button.dataset.group)?.values[Number(button.dataset.index)];
      button.classList.toggle('is-selected', chosen);
      button.setAttribute('aria-pressed', String(chosen));
    });
    confirmButton.disabled = requiredGroups.some(group => !selection[group.key]);
    error.textContent = '';
  }
  overlay.addEventListener('click', event => {
    if (event.target === overlay) closeHomeOptionDialog();
    const choice = event.target.closest('.home-option-choice');
    if (!choice) return;
    const group = groups.find(item => item.key === choice.dataset.group);
    if (!group) return;
    selection[group.key] = group.values[Number(choice.dataset.index)] || '';
    syncChoices();
  });
  overlay.querySelector('.home-option-close').addEventListener('click', () => closeHomeOptionDialog());
  quantityInput.addEventListener('input', () => updateQuantity(false));
  quantityInput.addEventListener('change', () => updateQuantity());
  let confirmed = false;
  confirmButton.addEventListener('click', () => {
    if (confirmed || confirmButton.disabled) return;
    if (requiredGroups.some(group => !selection[group.key])) {
      error.textContent = 'กรุณาเลือกตัวเลือกที่ต้องการให้ครบ';
      return;
    }
    confirmButton.disabled = true;
    if (addHomeProduct(product, selection, updateQuantity(), trigger)) {
      confirmed = true;
      closeHomeOptionDialog();
    } else {
      confirmButton.disabled = false;
      error.textContent = 'เพิ่มสินค้าไม่สำเร็จ กรุณาลองอีกครั้ง';
    }
  });
  overlay.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closeHomeOptionDialog(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll('button:not(:disabled), input:not(:disabled)')];
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  updateQuantity();
  syncChoices();
  dialog.focus();
  homeOptionDialogState = { overlay, trigger };
}

let homeOptionDialogState = null;
function closeHomeOptionDialog(restoreFocus = true) {
  if (!homeOptionDialogState) return;
  const { overlay, trigger } = homeOptionDialogState;
  homeOptionDialogState = null;
  overlay.remove();
  document.body.classList.remove('home-option-open');
  if (restoreFocus && trigger?.isConnected) trigger.focus();
}

// V.fix(A5): ลบ loadCategories() ที่เป็น dead code ออก
//   (เจ้าของ #categories-grid คือ loadCategoryCounts() — ตัวนี้ไม่เคยถูกเรียก)

// ─── Build Product Card HTML ───
function buildProductCard(p) {
  const productId = DMC.escapeHtml(p.id);
  const badges = [];
  if (p.isNew)  badges.push(`<span class="badge badge-new">${DMC.iconSvg('sparkle')} ใหม่</span>`);
  if (p.isHot)  badges.push(`<span class="badge badge-hot">${DMC.iconSvg('check')} ขายดี</span>`);
  if (p.isSale) badges.push(`<span class="badge badge-sale">${DMC.iconSvg('card')} ลด</span>`);
  // V29: ป้าย "ออกแบบได้" ย้ายเป็นแถบทึบชิดขอบล่างรูป (design-strip) — อ่านออกชัดบนภาพทุกโทนสี

  const oldPrice = p.oldPrice
    ? `<span class="product-price-old">${DMC.formatPrice(p.oldPrice)}</span>`
    : '';

  return `
    <article class="product-card" data-id="${productId}">
      <a href="product.html?id=${encodeURIComponent(p.id)}" class="product-card-link">
      <div class="product-img-wrap">
        ${homeCoverOf(p)
          ? `<img src="${DMC.imgCDN(homeCoverOf(p), 440)}" data-full="${DMC.escapeHtml(homeCoverOf(p))}" alt="${DMC.escapeHtml(p.name)}" loading="lazy" decoding="async">`
          : `<span class="product-card-placeholder">${DMC.iconSvg('package')}</span>`
        }
        <div class="product-img-overlay"></div>
        ${badges.length ? `<div class="product-badges">${badges.join('')}</div>` : ''}
        ${p.hasPreview ? `<div class="design-strip"><span class="design-strip-ico">${DMC.iconSvg('palette')}</span> ออกแบบเองได้ · ฟรี</div>` : ''}
      </div>
      <div class="product-info">
        <h3 class="product-name">${DMC.escapeHtml(p.name)}</h3>
      </div>
      </a>
      <button type="button" class="product-wish" data-id="${productId}" title="บันทึก ${DMC.escapeHtml(p.name)}" aria-label="บันทึก ${DMC.escapeHtml(p.name)}" aria-pressed="false">${DMC.iconSvg('heart')}</button>
      <div class="product-info product-actions">
        <div class="product-footer">
          <div>
            <div class="product-price">
              ${DMC.formatPrice(p.price)}
              <span class="unit">/${p.unit || 'ชิ้น'}</span>
            </div>
            ${oldPrice}
          </div>
          <button type="button" class="btn-add-cart" data-id="${productId}" title="เพิ่ม ${DMC.escapeHtml(p.name)} ลงตะกร้า" aria-label="เพิ่ม ${DMC.escapeHtml(p.name)} ลงตะกร้า">${DMC.iconSvg('plus')}</button>
        </div>
      </div>
    </article>
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
      const product = homeProductsById.get(String(id));
      if (!product) return;
      const groups = homeOptionGroups(product);
      if (groups.some(group => group.values.length > 1)) {
        openHomeOptionDialog(product, groups, btn);
        return;
      }
      const selection = { variant: '', size: '', material: '' };
      groups.forEach(group => { selection[group.key] = group.values[0] || ''; });
      addHomeProduct(product, selection, homeMinimumQuantity(product), btn);
    });
  });

  // Wishlist
  container.querySelectorAll('.product-wish').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.toggle('active');
      const active = btn.classList.contains('active');
      btn.innerHTML = DMC.iconSvg('heart');
      btn.setAttribute('aria-pressed', String(active));
    });
  });
}

// Render explicit empty/error states instead of sample products.
function renderProductState(state) {
  const container = document.getElementById('featured-products');
  if (!container) return;
  if (state === 'error') {
    container.innerHTML = '<div class="home-products-message" role="alert"><p>โหลดสินค้าไม่สำเร็จ ตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง</p><button type="button" class="btn btn-ghost btn-md" id="retry-home-products">ลองอีกครั้ง</button></div>';
    container.querySelector('#retry-home-products')?.addEventListener('click', async function (event) {
      event.currentTarget.disabled = true;
      event.currentTarget.textContent = 'กำลังโหลด...';
      await loadFeaturedProducts();
    });
    return;
  }
  container.innerHTML = '<div class="home-products-message" role="status"><p>ขณะนี้ยังไม่มีสินค้าแนะนำ</p></div>';
}
function initScrollAnimations() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = '';
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.product-card, .feature-card').forEach((el, i) => {
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

    // When the new carousel is active, CMS may update the hero copy only on slide 1.
    // This avoids an async CMS response overwriting the campaign copy on another slide.
    const heroSlides = document.getElementById('dmc-hero-slides');
    const activeSlide = heroSlides && heroSlides.querySelector('.dmc-hero-slide.is-active');
    const firstSlide = heroSlides && heroSlides.firstElementChild;
    const canApplyHeroCopy = !heroSlides || !activeSlide || activeSlide === firstSlide;
    if (canApplyHeroCopy) {
      set('hero-badge-text', c.hero.badge);
      set('hero-t1', c.hero.title1);
      set('hero-t2', c.hero.title2);
      set('hero-t3', c.hero.title3);
      const desc = document.getElementById('hero-desc-text');
      if (desc && c.hero.desc) desc.innerHTML = DMC.escapeHtml(c.hero.desc).replace(/\n/g, '<br>');
    }

    set('stat-orders', c.stats.orders);
    set('stat-rating', c.stats.rating);
    set('stat-days',   c.stats.days);

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
 const grid=document.getElementById('categories-grid');if(!grid)return;
 grid.querySelectorAll('.cat-card img').forEach(img=>img.addEventListener('error',()=>img.closest('.cat-icon')?.classList.add('art-fallback'),{once:true}));
}

function homeProductPriority(product) {
  const category = String(product && product.category || '').trim().toLowerCase();
  if (/โพลารอยด์|polaroid|ความทรงจำ/.test(category)) return 0;
  if (/นามบัตร|business.card/.test(category)) return 1;
  if (/บัตรแขวน|บัตรพนักงาน|lanyard|student.card|บัตรนักเรียน/.test(category)) return 2;
  if (/ตุ๊กตา|doll/.test(category)) return 3;
  if (/qr|คิวอาร์/.test(category)) return 4;
  return 5;
}

function homeProductPhotoList(products) {
  const seen = new Set();
  return (Array.isArray(products) ? products : [])
    .filter(p => p && p.active !== false)
    .map(p => ({ product: p, url: homeCoverOf(p), name: p.name || 'ผลงาน DMC Studio' }))
    .filter(item => item.url && !seen.has(item.url) && seen.add(item.url))
    .sort((a, b) => homeProductPriority(a.product) - homeProductPriority(b.product));
}

// ─── Hero carousel: collage from real DMC product images ───
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
const DMC_HOME_BANNERS = [
  { src: 'assets/banners/1.png', alt: 'DMC Studio — เปลี่ยนภาพความทรงจำให้เป็นของขวัญที่มีความหมาย', href: 'catalog.html' },
  { src: 'assets/banners/2.png', alt: 'DMC Studio — เก็บทุกโมเมนต์ให้เป็นมากกว่ารูปภาพ', href: 'catalog.html' },
  { src: 'assets/banners/3.png', alt: 'DMC Studio — ภาพพิมพ์และของขวัญดีไซน์พิเศษ', href: 'catalog.html' },
  { src: 'assets/banners/4.png', alt: 'DMC Studio — ผลงานพิมพ์ภาพและสินค้าสั่งทำ', href: 'catalog.html' }
];

function initHeroShowcase() {
  const desktopRoot = document.getElementById('dmc-home-hero');
  const desktopStage = document.getElementById('dmc-hero-slides');
  const desktopDotsEl = document.getElementById('dmc-hero-dots');
  const mobileRoot = document.getElementById('dmc-mobile-hero-carousel');
  const mobileStage = document.getElementById('dmc-mobile-hero-slides');
  const mobileDotsEl = document.getElementById('dmc-mobile-hero-dots');
  if (!desktopRoot || !desktopStage || !desktopDotsEl) return;

  const banners = DMC_HOME_BANNERS.filter(item => item && item.src && item.alt && item.href);
  if (!banners.length) return;
  const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let active = 0, timer = null, paused = reduced, inView = true;
  let pointerStart = null, suppressClickUntil = 0;

  function buildSlides(stage, dotsEl, isMobile = false) {
    if (!stage || !dotsEl) return { slides: [], dots: [] };
    stage.replaceChildren();
    dotsEl.replaceChildren();
    banners.forEach((banner, index) => {
      const slide = document.createElement('div');
      slide.className = (isMobile ? 'dmc-mobile-hero-slide' : 'dmc-hero-slide') + (index === 0 ? ' is-active' : '');
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', 'แบนเนอร์ ' + (index + 1) + ' จาก ' + banners.length);
      slide.setAttribute('aria-hidden', index === 0 ? 'false' : 'true');

      const link = document.createElement('a');
      link.className = 'dmc-hero-picture';
      try {
        const target = new URL(banner.href, window.location.href);
        if (target.protocol === 'http:' || target.protocol === 'https:') {
          link.href = banner.href;
          if (target.origin !== window.location.origin) {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
          }
        } else link.href = 'catalog.html';
      } catch (error) {
        link.href = 'catalog.html';
      }

      const image = document.createElement('img');
      image.className = 'dmc-hero-art';
      image.src = banner.src;
      image.alt = banner.alt;
      image.width = 1200;
      image.height = 630;
      image.loading = index === 0 ? 'eager' : 'lazy';
      image.decoding = 'async';
      if (index === 0) image.fetchPriority = 'high';
      link.appendChild(image);
      slide.appendChild(link);
      stage.appendChild(slide);

      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = isMobile ? 'dmc-mobile-hero-dot' : 'dmc-hero-dot';
      if (index === 0) dot.classList.add('is-active');
      dot.setAttribute('aria-label', 'แสดงแบนเนอร์ที่ ' + (index + 1));
      dot.setAttribute('aria-current', index === 0 ? 'true' : 'false');
      dot.addEventListener('click', () => { show(index); start(); });
      dotsEl.appendChild(dot);
    });
    return { slides: Array.from(stage.children), dots: Array.from(dotsEl.children) };
  }

  const desktop = buildSlides(desktopStage, desktopDotsEl);
  const mobile = buildSlides(mobileStage, mobileDotsEl, true);
  if (!desktop.slides.length) return;

  function show(index) {
    active = (index + desktop.slides.length) % desktop.slides.length;
    [desktop, mobile].forEach(group => {
      group.slides.forEach((slide, i) => {
        const selected = i === active;
        slide.classList.toggle('is-active', selected);
        slide.setAttribute('aria-hidden', selected ? 'false' : 'true');
        slide.toggleAttribute('inert', !selected);
      });
      group.dots.forEach((dot, i) => {
        const selected = i === active;
        dot.classList.toggle('is-active', selected);
        dot.setAttribute('aria-current', selected ? 'true' : 'false');
      });
    });
  }
  function stop() {
    if (timer) window.clearInterval(timer);
    timer = null;
  }
  function start() {
    stop();
    if (paused || !inView || document.hidden || reduced || desktop.slides.length < 2 ||
        window.innerWidth <= 760 || desktopRoot.matches(':hover') || desktopRoot.contains(document.activeElement)) return;
    timer = window.setInterval(() => show(active + 1), 6000);
  }

  const previous = document.getElementById('dmc-hero-prev');
  const next = document.getElementById('dmc-hero-next');
  const pause = document.getElementById('dmc-hero-pause');
  const mobilePrevious = document.getElementById('dmc-mobile-hero-prev');
  const mobileNext = document.getElementById('dmc-mobile-hero-next');
  previous?.addEventListener('click', () => { show(active - 1); start(); });
  next?.addEventListener('click', () => { show(active + 1); start(); });
  mobilePrevious?.addEventListener('click', () => { show(active - 1); start(); });
  mobileNext?.addEventListener('click', () => { show(active + 1); start(); });
  pause?.addEventListener('click', () => {
    paused = !paused;
    pause.setAttribute('aria-pressed', paused ? 'true' : 'false');
    pause.setAttribute('aria-label', paused ? 'เล่นสไลด์อัตโนมัติ' : 'หยุดสไลด์อัตโนมัติ');
    pause.innerHTML = DMC.iconSvg(paused ? 'play' : 'pause');
    start();
  });
  if (pause) {
    pause.setAttribute('aria-pressed', paused ? 'true' : 'false');
    pause.setAttribute('aria-label', paused ? 'เล่นสไลด์อัตโนมัติ' : 'หยุดสไลด์อัตโนมัติ');
    pause.innerHTML = DMC.iconSvg(paused ? 'play' : 'pause');
  }

  function bindSwipe(root, selector) {
    if (!root) return;
    const isMobile = root === mobileRoot;
    root.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' || !event.target.closest(selector)) return;
      pointerStart = { x: event.clientX, y: event.clientY, isMobile };
    }, { passive: true });
    root.addEventListener('pointerup', event => {
      if (!pointerStart || pointerStart.isMobile !== isMobile) return;
      const dx = event.clientX - pointerStart.x, dy = event.clientY - pointerStart.y;
      pointerStart = null;
      if (Math.abs(dx) < 42 || Math.abs(dx) <= Math.abs(dy)) return;
      show(active + (dx < 0 ? 1 : -1));
      suppressClickUntil = Date.now() + 350;
      start();
    }, { passive: true });
    root.addEventListener('pointercancel', () => { pointerStart = null; }, { passive: true });
    root.addEventListener('click', event => {
      if (Date.now() >= suppressClickUntil) return;
      event.preventDefault();
      event.stopPropagation();
    }, true);
    root.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); show(active - 1); start(); }
      if (event.key === 'ArrowRight') { event.preventDefault(); show(active + 1); start(); }
    });
  }
  bindSwipe(desktopRoot, '.dmc-hero-picture');
  bindSwipe(mobileRoot, '.dmc-hero-picture');

  desktopRoot.addEventListener('mouseenter', stop);
  desktopRoot.addEventListener('mouseleave', start);
  desktopRoot.addEventListener('focusin', stop);
  desktopRoot.addEventListener('focusout', start);
  document.addEventListener('visibilitychange', start);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = !!(entries[0] && entries[0].isIntersecting);
      start();
    }, { threshold: 0.1 }).observe(desktopRoot);
  }
  show(0);
  start();
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
  { url: 'https://images.unsplash.com/photo-1606293459339-aa5d34a7b0e1?w=600&h=750&fit=crop', name: 'โพลารอยด์สุดน่ารัก' },
  { url: 'https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?w=600&h=750&fit=crop', name: 'เก็บทุกความทรงจำ' },
  { url: 'https://images.unsplash.com/photo-1554080353-a576cf803bda?w=600&h=750&fit=crop', name: 'งานพิมพ์คุณภาพ' },
];
