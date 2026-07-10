/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Product Detail V12
   js/product.js (เขียนใหม่ทั้งไฟล์)

   - Multi-image gallery + thumbnails (แบบ Shopee)
   - วิดีโอ YouTube/TikTok ฝังใน gallery
   - กดเลือกขนาด/วัสดุ → รูปสลับตาม label ที่ผูกไว้
   - รีวิวสินค้า (แสดง approved + ฟอร์มส่งรีวิวผ่านตัวกรอง)
   - Canvas Preview แสดงเฉพาะสินค้าที่ร้านเปิด hasPreview
═══════════════════════════════════════════════ */
'use strict';

let db = null;
let product = null;
let productId = null;
let qty = 1;
let selectedSize = '';
let selectedMaterial = '';
let selectedVariant = '';   // V35: แบบสินค้า (จากชื่อแบบของรูปที่แอดมินตั้ง)
let galleryItems = [];   // [{type:'image', url, label} | {type:'video', embedUrl}]
let activeGalleryIndex = 0;

document.addEventListener('DOMContentLoaded', async () => {
  if (typeof Loading !== 'undefined') Loading.progressStart();

  const params = new URLSearchParams(location.search);
  productId = params.get('id');
  if (!productId) { showNotFound(); return; }

  // Skeleton ระหว่างโหลด
  const loadingEl = document.getElementById('product-loading');
  if (loadingEl && typeof Loading !== 'undefined') {
    loadingEl.innerHTML = Loading.Skeleton.productDetail();
  }

  loadProductFlow();
});

// V16: แยก "โหลดไม่สำเร็จ (เน็ต/ชั่วคราว)" ออกจาก "ไม่มีสินค้าจริง (404)"
//      เดิม error ทุกชนิดเด้งไปหน้า "ไม่พบสินค้า" แม้แค่เน็ตช้า/รูปโหลดไม่ทัน — ทำให้เหมือนสินค้าหาย
async function loadProductFlow() {
  const loadingEl = document.getElementById('product-loading');
  if (loadingEl) {
    loadingEl.style.display = '';
    if (typeof Loading !== 'undefined') loadingEl.innerHTML = Loading.Skeleton.productDetail();
  }
  const errEl = document.getElementById('product-error');
  if (errEl) errEl.style.display = 'none';

  // V17 (LOW-02): ลองหาในสแนปช็อต/แคชก่อน → ถ้าเจอ อ่าน Firestore = 0
  try {
    const list = await DMC.loadProducts();
    const hit  = Array.isArray(list) ? list.find(p => String(p.id) === String(productId)) : null;
    if (hit) {
      product = hit;
      DMC.getFirebaseReady().then(d => { db = d; }).catch(() => {});  // เผื่อรีวิว/ส่วนอื่นต้องใช้ db (ไม่บล็อก)
      try { renderProduct(); loadRelated(); initReviews(); }
      catch (e) {
        console.error('Product render error:', e);
        if (typeof Loading !== 'undefined') Loading.progressDone();
        if (loadingEl) loadingEl.style.display = 'none';
      }
      return;
    }
  } catch (e) { /* สแนปช็อตมีปัญหา → อ่าน Firestore ต่อด้านล่าง */ }

  let doc;
  try {
    db = await DMC.getFirebaseReady();
    doc = await fetchProductWithRetry(productId, 2);   // ลองซ้ำ 2 ครั้งถ้าเน็ตสะดุด (backoff)
  } catch (e) {
    console.error('Product load error (network):', e);
    showLoadError();          // โหลดไม่สำเร็จ → แสดงปุ่มลองใหม่ (ไม่ใช่ 404)
    return;
  }

  if (!doc || !doc.exists) { showNotFound(); return; }   // ไม่มีสินค้านี้จริงๆ → 404

  product = { id: doc.id, ...doc.data() };
  try {
    renderProduct();
    loadRelated();
    initReviews();
  } catch (e) {
    console.error('Product render error:', e);   // render พัง ก็ไม่เด้ง 404 — โชว์เท่าที่โหลดได้
    if (typeof Loading !== 'undefined') Loading.progressDone();
    if (loadingEl) loadingEl.style.display = 'none';
  }
}

// ลองโหลดสินค้าซ้ำถ้าเน็ตสะดุด (กัน 404 หลอกจากการเชื่อมต่อชั่วคราว)
async function fetchProductWithRetry(id, retries) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try { return await db.collection('products').doc(id).get(); }
    catch (e) {
      lastErr = e;
      if (i < retries) await new Promise(r => setTimeout(r, 600 * (i + 1)));
    }
  }
  throw lastErr;
}

// สถานะ "โหลดไม่สำเร็จ" พร้อมปุ่มลองใหม่ (แยกจากหน้า "ไม่พบสินค้า")
function showLoadError() {
  if (typeof Loading !== 'undefined') Loading.progressDone();
  const l = document.getElementById('product-loading');
  if (!l) { showNotFound(); return; }
  l.style.display = '';
  l.innerHTML =
    '<div style="grid-column:1/-1;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:4rem 1.5rem;color:var(--text-2)">'
    + '<div style="font-size:2.6rem;margin-bottom:.6rem">📡</div>'
    + '<p style="margin:0 0 .35rem;font-weight:700;font-size:1.05rem">โหลดข้อมูลไม่สำเร็จ</p>'
    + '<p style="margin:0 0 1.2rem;color:var(--text-3)">เน็ตอาจช้าหรือหลุดชั่วคราว ลองอีกครั้งได้เลย</p>'
    + '<button id="retry-product-btn" class="btn btn-primary btn-md" style="border-radius:var(--r-lg)">↻ ลองอีกครั้ง</button>'
    + '</div>';
  const b = document.getElementById('retry-product-btn');
  if (b) b.addEventListener('click', loadProductFlow);
}

function showNotFound() {
  if (typeof Loading !== 'undefined') Loading.progressDone();
  const l = document.getElementById('product-loading');
  if (l) l.style.display = 'none';
  const err = document.getElementById('product-error');
  if (err) err.style.display = '';
}

// ══════════════════════════════════════════════
//  RENDER PRODUCT
// ══════════════════════════════════════════════
function renderProduct() {
  document.getElementById('product-loading').style.display = 'none';
  document.getElementById('product-detail').style.display  = '';
  if (typeof Loading !== 'undefined') Loading.progressDone();

  // V2: เปิดแถบสั่งซื้อลอย (มือถือ) + เติมค่าส่งจริงจาก config
  document.getElementById('sticky-buy-bar')?.classList.add('show');
  const sh = (window.DMC_CONFIG || {}).SHIPPING || {};
  const shipEl = document.getElementById('price-shipping-hint');
  if (shipEl && (sh.transfer != null || sh.cod != null)) {
    shipEl.textContent = `🚚 ค่าจัดส่งเริ่ม ฿${sh.transfer ?? 50} · เก็บเงินปลายทาง ฿${sh.cod ?? 80}`;
  }

  document.title = product.name + ' — Diamond Cute Studio 💎';
  setText('breadcrumb-name', product.name);
  setText('product-title', product.name);

  // ── ราคา ──
  setText('price-main', DMC.formatPrice(product.price));
  setText('price-unit', '/' + (product.unit || 'ชิ้น'));
  if (product.oldPrice && product.oldPrice > product.price) {
    const oldEl = document.getElementById('price-old');
    oldEl.textContent = DMC.formatPrice(product.oldPrice);
    oldEl.style.display = '';
  }

  // ── ส่วนลดปริมาณ ──
  const tiersEl = document.getElementById('price-tiers');
  if (tiersEl && product.priceTiers?.length) {
    tiersEl.innerHTML = product.priceTiers.map(t =>
      `<span class="price-tier-chip">🎁 ${DMC.escapeHtml(t)}</span>`).join('');
  }

  // ── ยอดสั่งซื้อ ──
  setText('order-count', `สั่งซื้อแล้ว ${product.orderCount || 0}+ ครั้ง`);

  // ── Badge ──
  const badgeEl = document.getElementById('gallery-badge');
  if (badgeEl) {
    if (product.isNew)       badgeEl.innerHTML = '<span class="badge badge-new">✨ ใหม่</span>';
    else if (product.isHot)  badgeEl.innerHTML = '<span class="badge badge-hot">🔥 ขายดี</span>';
    else if (product.isSale) badgeEl.innerHTML = '<span class="badge badge-sale">💰 ลด</span>';
  }

  // ── Gallery (multi-image + video) ──
  buildGalleryItems();
  renderGallery();

  // ── ตัวเลือกแบบ/ขนาด/วัสดุ ──
  renderVariantChips();                                // V35: แบบสินค้า (จากชื่อแบบของรูป)
  renderOptionChips('size', product.sizes || []);
  renderOptionChips('material', product.materials || []);

  // ── คำอธิบาย ──
  if (product.fullDesc) {
    document.getElementById('product-desc-section').style.display = '';
    document.getElementById('product-desc-text').textContent = product.fullDesc;
  }

  // ── จำนวน ──
  qty = Math.max(1, product.minQty || 1);
  setText('qty-unit', product.unit || 'ชิ้น');
  if (product.minQty > 1) setText('qty-hint', `ขั้นต่ำ ${product.minQty} ${product.unit || 'ชิ้น'}`);
  updateQtyUI();
  document.getElementById('qty-minus')?.addEventListener('click', () => {
    const min = Math.max(1, product.minQty || 1);
    if (qty > min) { qty--; updateQtyUI(); }
  });
  document.getElementById('qty-plus')?.addEventListener('click', () => {
    if (qty < 9999) { qty++; updateQtyUI(); }
  });

  // ── ปุ่ม ──
  document.getElementById('add-to-cart-btn')?.addEventListener('click', () => addToCart(false));
  document.getElementById('order-now-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    addToCart(true);
  });
  // V2: ปุ่มในแถบสั่งซื้อลอย ใช้ logic เดียวกัน
  document.getElementById('sticky-add-cart')?.addEventListener('click', () => addToCart(false));
  document.getElementById('sticky-order-now')?.addEventListener('click', () => addToCart(true));

  // ── Canvas Preview — เฉพาะสินค้าที่ร้านเปิดใช้ ──
  const previewToolEl = document.getElementById('preview-tool');
  if (previewToolEl) {
    if (product.hasPreview) {
      previewToolEl.style.display = '';
      const isCard   = (product.category || '').includes('บัตร');
      const isSquare = (product.category || '').toLowerCase().includes('qr');
      const size = isCard ? { w: 250, h: 390 } : isSquare ? { w: 280, h: 280 } : { w: 280, h: 390 };
      // ดึงลิงก์ LINE จาก CMS ให้ชิป "เพิ่มเติม"
      const initPreview = (lineUrl) => {
        if (typeof window.initPreviewTool === 'function') {
          window.initPreviewTool({
            containerId: 'preview-tool-container',
            size,
            templates: product.templates || [],
            lineUrl: lineUrl || '#',
            productId: product.id,            // V2: เพื่อแนบแบบเข้าออเดอร์
            productName: product.name,
          });
        }
      };
      if (typeof CMS !== 'undefined') {
        CMS.get().then(content => initPreview(content.contact?.line)).catch(() => initPreview('#'));
      } else {
        initPreview('#');
      }
    } else {
      previewToolEl.style.display = 'none';
    }
  }
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ══════════════════════════════════════════════
//  GALLERY — Multi-image + Video (สไตล์ Shopee)
// ══════════════════════════════════════════════
function buildGalleryItems() {
  galleryItems = [];

  // รูปจาก images[] (V12) — fallback ไป image เดี่ยว (สินค้าเก่า)
  const imgs = Array.isArray(product.images) && product.images.length
    ? product.images
    : (product.image ? [{ url: product.image, label: '' }] : []);

  imgs.forEach(im => {
    const url = typeof im === 'string' ? im : im.url;
    if (url) galleryItems.push({ type: 'image', url, label: ((im && im.label) || '').trim() });
  });

  // วิดีโอ (YouTube/TikTok ลิงก์)
  const embed = toVideoEmbed(product.videoUrl);
  if (embed) {
    galleryItems.push({ type: 'video', embedUrl: embed, vertical: /tiktok\.com/.test(embed) });
  } else if (isVideoLink(product.videoUrl)) {
    // V26: ลิงก์วิดีโอที่ฝังไม่ได้ (เช่นลิงก์แชร์สั้น vt.tiktok.com / tiktok.com/t/)
    //   → ยังโชว์เป็นรายการวิดีโอ กดแล้วเปิดดูบนแอป/เว็บต้นทาง (เดิมหายไปจากแกลเลอรีเลย)
    galleryItems.push({ type: 'video-link', url: String(product.videoUrl).trim() });
  }

  // เริ่มที่รูปปก
  const cover = Number(product.coverIndex);
  activeGalleryIndex = (!isNaN(cover) && cover >= 0 && cover < galleryItems.length) ? cover : 0;
}

// แปลงลิงก์ YouTube / TikTok → embed URL (คืน '' ถ้าฝังไม่ได้)
function toVideoEmbed(url) {
  if (!url) return '';
  const u = String(url).trim();
  // YouTube: watch?v= | youtu.be/ | shorts/ | live/
  //   ใช้โดเมน youtube-nocookie + rel=0 (ไม่แนะนำคลิปช่องอื่นตอนพัก) + playsinline (มือถือเล่นในหน้า)
  //   หมายเหตุ: โลโก้/ชื่อช่องบนตัวเล่นเป็นข้อกำหนดของ YouTube ปิดไม่ได้ (ทุกเว็บเป็นเหมือนกัน)
  let m = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,15})/);
  if (m) return 'https://www.youtube-nocookie.com/embed/' + m[1] + '?rel=0&playsinline=1&modestbranding=1';
  // TikTok: ลิงก์เต็มแบบ /video/{id} หรือ /photo/{id}
  m = u.match(/tiktok\.com\/.*(?:video|photo)\/(\d{8,25})/);
  if (m) return 'https://www.tiktok.com/embed/v2/' + m[1];
  return '';
}

// เป็นลิงก์วิดีโอที่รู้จักไหม (ใช้ทำ tile "เปิดดู" เมื่อฝังไม่ได้ เช่นลิงก์แชร์สั้นของ TikTok)
function isVideoLink(url) {
  return /(?:youtube\.com|youtu\.be|tiktok\.com)/i.test(String(url || ''));
}

function renderGallery() {
  const mainEl   = document.getElementById('gallery-main');
  const thumbsEl = document.getElementById('gallery-thumbs');
  const emojiEl  = document.getElementById('gallery-emoji');
  if (!mainEl) return;

  // เคลียร์ media เดิม (เก็บ badge + emoji + overlay ไว้)
  mainEl.querySelectorAll('.gallery-media, .gallery-track, .gallery-counter').forEach(el => el.remove());

  if (!galleryItems.length) {
    if (emojiEl) { emojiEl.style.display = ''; emojiEl.textContent = product.emoji || '📦'; }
    if (thumbsEl) thumbsEl.innerHTML = '';
    return;
  }
  if (emojiEl) emojiEl.style.display = 'none';

  // ── V27: track ปัดซ้าย-ขวาได้ (scroll-snap = ลื่นแบบ native เหมือน Shopee) ──
  const track = document.createElement('div');
  track.className = 'gallery-track';
  track.setAttribute('aria-label', 'รูปสินค้า ปัดซ้ายขวาเพื่อดูรูปถัดไป');

  galleryItems.forEach((item, i) => {
    const slide = document.createElement('div');
    slide.className = 'gallery-slide';

    if (item.type === 'image') {
      const img = document.createElement('img');
      img.src = DMC.imgCDN(item.url, 900);
      img.setAttribute('data-full', item.url);
      img.alt = product.name + (item.label ? ' — ' + item.label : '');
      img.loading = i === activeGalleryIndex ? 'eager' : 'lazy';
      img.draggable = false;
      img.addEventListener('click', () => openProductLightbox(item.url));
      slide.appendChild(img);
      if (typeof Loading !== 'undefined') Loading.blurUpImage(img);
    } else if (item.type === 'video-link') {
      const a = document.createElement('a');
      a.className = 'gallery-video-open';
      a.href = item.url; a.target = '_blank'; a.rel = 'noopener';
      const isTT = /tiktok/i.test(item.url);
      a.innerHTML = '<span class="gvo-play">▶</span><span class="gvo-text">ดูวิดีโอบน ' + (isTT ? 'TikTok' : 'YouTube') + '</span><span class="gvo-sub">แตะเพื่อเปิดดูวิดีโอ</span>';
      slide.appendChild(a);
    } else {
      // วิดีโอฝัง: แสดง tile กดเล่นก่อน (iframe กิน gesture ปัด) → กดแล้วค่อยใส่ iframe
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gallery-video-open gallery-video-playbtn';
      btn.innerHTML = '<span class="gvo-play">▶</span><span class="gvo-text">เล่นวิดีโอ</span><span class="gvo-sub">แตะเพื่อเล่นตรงนี้</span>';
      btn.addEventListener('click', () => {
        const wrap = document.createElement('div');
        wrap.className = 'gallery-video-wrap' + (item.vertical ? ' vertical' : '');
        const iframe = document.createElement('iframe');
        iframe.src = item.embedUrl + (item.embedUrl.includes('?') ? '&' : '?') + 'autoplay=1';
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
        iframe.title = 'วิดีโอสินค้า ' + product.name;
        wrap.appendChild(iframe);
        slide.innerHTML = '';
        slide.appendChild(wrap);
      });
      slide.appendChild(btn);
    }
    track.appendChild(slide);
  });
  mainEl.appendChild(track);

  // ตัวนับ "1/3" มุมขวาล่าง
  let counter = null;
  if (galleryItems.length > 1) {
    counter = document.createElement('div');
    counter.className = 'gallery-counter';
    mainEl.appendChild(counter);
  }

  // ── Thumbnails ──
  const thumbEls = [];
  if (thumbsEl) {
    thumbsEl.innerHTML = '';
    if (galleryItems.length > 1) {
      galleryItems.forEach((g, i) => {
        const t = document.createElement('div');
        t.className = 'gallery-thumb' + (i === activeGalleryIndex ? ' active' : '');
        if (g.type === 'image') {
          const im = document.createElement('img');
          im.src = DMC.imgCDN(g.url, 160);
          im.setAttribute('data-full', g.url);
          im.alt = g.label || ('รูปที่ ' + (i + 1));
          im.loading = 'lazy';
          im.style.cssText = 'width:100%;height:100%;object-fit:contain;padding:2px';
          t.appendChild(im);
          if (g.label) t.title = g.label;
        } else {
          t.innerHTML = '<span class="gallery-thumb-video">▶</span>';
          t.title = 'วิดีโอ';
        }
        t.addEventListener('click', () => goToSlide(i, true));
        thumbsEl.appendChild(t);
        thumbEls.push(t);
      });
    }
  }

  // ── sync สองทาง: ปัด track → thumbs/counter ตาม · กด thumb → เลื่อน track ──
  function setActive(i) {
    if (i === activeGalleryIndex) return;
    activeGalleryIndex = i;
    thumbEls.forEach((t, k) => t.classList.toggle('active', k === i));
    if (counter) counter.textContent = (i + 1) + '/' + galleryItems.length;
    // เลื่อน thumb ที่ active มาให้เห็นในแถบ
    const th = thumbEls[i];
    if (th && th.scrollIntoView) { try { th.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' }); } catch (e) {} }
  }
  if (counter) counter.textContent = (activeGalleryIndex + 1) + '/' + galleryItems.length;

  window.__goToGallerySlide = goToSlide;   // ให้ switchImageByLabel เรียกใช้
  function goToSlide(i, smooth) {
    i = Math.max(0, Math.min(galleryItems.length - 1, i));
    track.scrollTo({ left: i * track.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
    setActive(i);
  }

  let scrollRAF = 0;
  track.addEventListener('scroll', () => {
    if (scrollRAF) return;
    scrollRAF = requestAnimationFrame(() => {
      scrollRAF = 0;
      const w = track.clientWidth || 1;
      const i = Math.round(track.scrollLeft / w);
      if (i >= 0 && i < galleryItems.length) setActive(i);
    });
  }, { passive: true });

  // เริ่มที่รูปปก (ไม่ animate)
  if (activeGalleryIndex > 0) {
    requestAnimationFrame(() => { track.scrollTo({ left: activeGalleryIndex * track.clientWidth, behavior: 'auto' }); });
  }
}

// Lightbox ดูรูปเต็มจอ (createElement — ห้ามใช้ onclick ใน template string)
function openProductLightbox(url) {
  let lb = document.getElementById('product-lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'product-lightbox';
    lb.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;padding:1rem;cursor:zoom-out;backdrop-filter:blur(4px)';
    const img = document.createElement('img');
    img.id = 'product-lightbox-img';
    img.style.cssText = 'max-width:95vw;max-height:92vh;border-radius:12px;object-fit:contain';
    const close = document.createElement('button');
    close.textContent = '✕';
    close.style.cssText = 'position:absolute;top:1rem;right:1rem;width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.15);border:none;color:#fff;font-size:1.3rem;cursor:pointer';
    close.addEventListener('click', () => { lb.style.display = 'none'; });
    lb.appendChild(img); lb.appendChild(close);
    lb.addEventListener('click', e => { if (e.target === lb) lb.style.display = 'none'; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') lb.style.display = 'none'; });
    document.body.appendChild(lb);
  }
  document.getElementById('product-lightbox-img').src = url;
  lb.style.display = 'flex';
}

// ══════════════════════════════════════════════
//  OPTION CHIPS (ขนาด/วัสดุ) + สลับรูปตาม label
// ══════════════════════════════════════════════
function renderOptionChips(kind, options) {
  const group = document.getElementById(kind + '-group');
  const chips = document.getElementById(kind + '-chips');
  if (!group || !chips || !options.length) return;

  group.style.display = '';
  chips.innerHTML = '';

  options.forEach((opt, i) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'option-chip' + (i === 0 ? ' active' : '');
    chip.textContent = opt;
    chip.addEventListener('click', () => {
      chips.querySelectorAll('.option-chip').forEach(x => x.classList.remove('active'));
      chip.classList.add('active');
      setSelectedOption(kind, opt);
      setText(kind + '-selected', opt);
      switchImageByLabel(opt);
    });
    chips.appendChild(chip);
  });

  // ค่าเริ่มต้น = ตัวแรก
  setSelectedOption(kind, options[0]);
  setText(kind + '-selected', options[0]);
}

// V35: จำค่าที่ลูกค้าเลือกไว้ตามชนิดตัวเลือก
function setSelectedOption(kind, val) {
  if (kind === 'size') selectedSize = val;
  else if (kind === 'material') selectedMaterial = val;
  else if (kind === 'variant') selectedVariant = val;
}

// ══ V35: แบบสินค้า — สร้างตัวเลือกจาก "ชื่อแบบ" ที่แอดมินตั้งให้รูปสินค้า ══
//  · รูปที่มีชื่อแบบ → ขึ้นเป็นตัวเลือก "แบบ" ให้ลูกค้ากดเลือก (กดแล้วรูปสลับตาม)
//  · รูปที่ไม่ใส่ชื่อแบบ → เป็นรูปแกลเลอรีปกติ ไม่ขึ้นเป็นตัวเลือก (เช่น รูปอธิบายขนาด)
//  · ชื่อแบบที่ตรงกับตัวเลือกขนาด/วัสดุอยู่แล้ว → คงพฤติกรรมเดิม (รูปสลับตามขนาด/วัสดุ)
//    ไม่สร้างกลุ่มตัวเลือกซ้ำซ้อน
function renderVariantChips() {
  const optSet = new Set(
    [...(product.sizes || []), ...(product.materials || [])]
      .map(s => String(s).trim().toLowerCase())
  );
  const seen = new Set();
  const variants = [];
  galleryItems.forEach(g => {
    if (g.type !== 'image' || !g.label) return;
    const key = g.label.toLowerCase();
    if (optSet.has(key) || seen.has(key)) return;
    seen.add(key);
    variants.push(g.label);
  });
  if (variants.length) renderOptionChips('variant', variants);
}

// หารูปของแบบที่เลือกอยู่ (ใช้เป็นรูปตะกร้า)
function findVariantImage() {
  if (!selectedVariant) return null;
  const want = selectedVariant.trim().toLowerCase();
  return galleryItems.find(g =>
    g.type === 'image' && g.label && g.label.toLowerCase() === want) || null;
}

// ลูกค้ากดเลือกแบบ → ถ้ามีรูปที่ label ตรงกัน สลับรูปให้ทันที
function switchImageByLabel(label) {
  if (!label) return;
  const want = String(label).trim().toLowerCase();
  const idx = galleryItems.findIndex(g =>
    g.type === 'image' && g.label && g.label.toLowerCase() === want);
  if (idx >= 0 && idx !== activeGalleryIndex) {
    if (typeof window.__goToGallerySlide === 'function') window.__goToGallerySlide(idx, true);
    else { activeGalleryIndex = idx; renderGallery(); }
  }
}

// ══════════════════════════════════════════════
//  QTY + CART
// ══════════════════════════════════════════════
function updateQtyUI() {
  setText('qty-val', qty);
  setText('qty-display', qty);
  const sub = DMC.formatPrice((product.price || 0) * qty);
  setText('subtotal-display', sub);
  setText('sticky-buy-value', sub);   // V2: ซิงค์ราคากับแถบสั่งซื้อลอย
}

function addToCart(goToCart) {
  // V35: แนบ "แบบ" ที่เลือกเข้าออเดอร์ด้วย — ตะกร้าแยกรายการตามแบบให้อัตโนมัติ
  const options = [
    selectedVariant ? ('แบบ: ' + selectedVariant) : '',
    selectedSize,
    selectedMaterial,
  ].filter(Boolean).join(' · ');
  const customDetails = (document.getElementById('product-details')?.value || '').trim();   // V4.6
  const variantImg = findVariantImage();   // V35: รูปตะกร้า = รูปของแบบที่เลือก
  DMC.addToCart({
    id: product.id,
    name: product.name,
    price: product.price || 0,
    qty,
    unit: product.unit || 'ชิ้น',
    minQty: Math.max(1, product.minQty || 1),   // V28: ให้ตะกร้าเคารพขั้นต่ำตอนกด +/-
    options,
    customDetails,                                                                          // V4.6: เก็บใน cart
    emoji: product.emoji || '📦',
    image: (variantImg || galleryItems.find(g => g.type === 'image') || {}).url || product.image || '',
  });
  // V.upgrade1: ตัด toast ซ้ำออก — DMC.addToCart() แจ้งเตือนให้แล้ว
  if (goToCart) setTimeout(() => { window.location.href = 'cart.html'; }, 350);
}

// ══════════════════════════════════════════════
//  RELATED PRODUCTS
// ══════════════════════════════════════════════
async function loadRelated() {
  const grid = document.getElementById('related-products');
  if (!grid) return;
  try {
    // V17 (LOW-02): ใช้สแนปช็อต/แคชแทนการอ่าน Firestore (อ่าน = 0 ถ้ามีสแนปช็อต)
    let items = [];
    try {
      const list = await DMC.loadProducts();
      if (Array.isArray(list)) items = list.filter(p => p && p.id !== productId).map(p => ({ ...p }));
    } catch (e) {}
    // fallback: แคชว่าง + มี db → อ่าน Firestore เหมือนเดิม
    if (!items.length && db) {
      const snap = await db.collection('products')
        .where('active', '==', true)
        .limit(20)
        .get();
      snap.forEach(doc => {
        if (doc.id === productId) return;
        items.push({ id: doc.id, ...doc.data() });
      });
    }
    // สินค้าหมวดเดียวกันก่อน
    items.sort((a, b) =>
      (b.category === product.category ? 1 : 0) - (a.category === product.category ? 1 : 0));
    const top = items.slice(0, 4);
    if (!top.length) { grid.parentElement.style.display = 'none'; return; }

    grid.innerHTML = top.map(p => {
      const cover = coverImageOf(p);
      return `
      <a class="product-card" href="product.html?id=${p.id}">
        <div class="product-img-wrap">
          ${cover ? `<img src="${DMC.imgCDN(cover, 440)}" data-full="${DMC.escapeHtml(cover)}" alt="${DMC.escapeHtml(p.name)}" loading="lazy" decoding="async">` : `<span>${p.emoji || '📦'}</span>`}
        </div>
        <div class="product-card-body">
          <div class="product-card-name">${DMC.escapeHtml(p.name)}</div>
          <div class="product-card-price">${DMC.formatPrice(p.price)}<span class="product-card-unit">/${p.unit || 'ชิ้น'}</span></div>
        </div>
      </a>`;
    }).join('');
    if (typeof Loading !== 'undefined') Loading.animateCards('#related-products .product-card', 50);
  } catch (e) { /* related ไม่สำคัญ — เงียบไว้ */ }
}

// รูปปกของสินค้า (รองรับทั้ง images[] + coverIndex และ image เดี่ยว)
function coverImageOf(p) {
  if (Array.isArray(p.images) && p.images.length) {
    const ci = Number(p.coverIndex);
    const item = (!isNaN(ci) && p.images[ci]) ? p.images[ci] : p.images[0];
    return item ? (typeof item === 'string' ? item : (item.url || '')) : '';   // V.fix(A4): guard null
  }
  return p.image || '';
}

// ══════════════════════════════════════════════
//  REVIEWS
// ══════════════════════════════════════════════
let rvRating = 0;

async function initReviews() {
  if (typeof Reviews === 'undefined') return;

  // ── ดาวแบบกดเลือก ──
  const starWrap = document.getElementById('rv-star-input');
  if (starWrap) {
    for (let i = 1; i <= 5; i++) {
      const s = document.createElement('button');
      s.type = 'button';
      s.className = 'rv-star-btn';
      s.textContent = '★';
      s.setAttribute('aria-label', i + ' ดาว');
      s.addEventListener('click', () => {
        rvRating = i;
        starWrap.querySelectorAll('.rv-star-btn').forEach((b, j) => b.classList.toggle('on', j < i));
      });
      starWrap.appendChild(s);
    }
  }

  // ── นับตัวอักษร ──
  const txtEl = document.getElementById('rv-text');
  txtEl?.addEventListener('input', () => setText('rv-char', txtEl.value.length));

  // ── ส่งรีวิว ──
  document.getElementById('rv-submit-btn')?.addEventListener('click', submitReview);

  // ── โหลดรีวิวที่อนุมัติแล้ว ──
  await loadApprovedReviews();
}

async function loadApprovedReviews() {
  const listEl = document.getElementById('rv-list');
  const sumEl  = document.getElementById('rv-summary');
  if (!listEl) return;

  const reviews = await Reviews.fetchApproved(db, productId, 30);

  // อัปเดต rating ด้านบน
  if (reviews.length) {
    const avg = Reviews.avgRating(reviews);
    setText('rating-score', avg.toFixed(1));
    setText('review-count', reviews.length + ' รีวิว');
    if (sumEl) sumEl.innerHTML = Reviews.starsHtml(avg) +
      ` <strong>${avg.toFixed(1)}</strong> <span style="color:var(--text-3)">(${reviews.length} รีวิว)</span>`;
    listEl.innerHTML = reviews.map(r => Reviews.cardHtml({ ...r, _hideProduct: true })).join('');
    if (typeof Loading !== 'undefined') Loading.staggerItems('#rv-list .rv-card', 60);
  } else {
    setText('review-count', 'ยังไม่มีรีวิว');
    if (sumEl) sumEl.innerHTML = '<span style="color:var(--text-3);font-size:.88rem">เป็นคนแรกที่รีวิวสินค้านี้ ⭐</span>';
    listEl.innerHTML = '';
  }
}

async function submitReview() {
  const btn = document.getElementById('rv-submit-btn');
  const res = { name: document.getElementById('rv-name')?.value,
                text: document.getElementById('rv-text')?.value,
                honeypot: document.getElementById('rv-website')?.value };

  if (typeof Loading !== 'undefined') Loading.buttonLoad(btn);
  try {
    const out = await Reviews.submit(db, {
      productId,
      productName: product.name,
      name: res.name,
      rating: rvRating,
      text: res.text,
      honeypot: res.honeypot,
    });
    if (out.ok) {
      DMC.toast('ส่งรีวิวแล้ว 🙏 จะแสดงหลังร้านอนุมัติครับ', 'success', 4500);
      document.getElementById('rv-name').value = '';
      document.getElementById('rv-text').value = '';
      setText('rv-char', '0');
      rvRating = 0;
      document.querySelectorAll('#rv-star-input .rv-star-btn').forEach(b => b.classList.remove('on'));
    } else {
      DMC.toast('❌ ' + out.reason, 'error', 4000);
    }
  } finally {
    if (typeof Loading !== 'undefined') Loading.buttonDone(btn);
  }
}
