/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Homepage JS
   js/home.js
═══════════════════════════════════════════════ */

'use strict';

document.addEventListener('DOMContentLoaded', async () => {

  // ─── Hero Particle Canvas ───
  initParticles();

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
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const particles = [];
  const COUNT = 55;

  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x:  Math.random() * canvas.width,
      y:  Math.random() * canvas.height,
      r:  Math.random() * 1.5 + 0.5,
      dx: (Math.random() - 0.5) * 0.35,
      dy: (Math.random() - 0.5) * 0.35,
      alpha: Math.random() * 0.5 + 0.15,
      color: Math.random() > 0.65 ? '#FCD34D' : '#38BDF8'
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connection lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 110) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(14,165,233,${0.07 * (1 - dist/110)})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    // Draw dots
    particles.forEach(p => {
      p.x += p.dx;
      p.y += p.dy;
      if (p.x < 0 || p.x > canvas.width)  p.dx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.dy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color.replace(')', `,${p.alpha})`).replace('rgb', 'rgba');
      if (p.color.startsWith('#')) {
        const hex = p.color.slice(1);
        const r = parseInt(hex.slice(0,2),16);
        const g = parseInt(hex.slice(2,4),16);
        const b = parseInt(hex.slice(4,6),16);
        ctx.fillStyle = `rgba(${r},${g},${b},${p.alpha})`;
      }
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

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
        ${p.image
          ? `<img src="${p.image}" alt="${DMC.escapeHtml(p.name)}" loading="lazy">`
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
