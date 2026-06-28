/* Diamond Cute Studio 💎 — แยกจาก gallery.html (V15: Separation of Concerns) */
'use strict';

// ─── หมวดหมู่เริ่มต้น (จะถูกแทนด้วย categories จาก Firestore ถ้ามี) ───
// หมวดหมู่จาก module กลาง (js/categories.js) — แก้ที่เดียวใช้ทั้งระบบ
var CAT_LABELS = {};
(window.DMCCat ? DMCCat.BUILTIN : []).forEach(function(c){ CAT_LABELS[c.slug] = c.name; });

// ─── รูปตัวอย่าง demo (ใช้เฉพาะตอนร้านยังไม่เพิ่มรูปจริง) ───
var DEMO_ITEMS = [
  { cat:'polaroid', name:'โพลารอยด์ขอบขาว', emoji:'📸', size:'tall', _demo:true },
  { cat:'business-card', name:'นามบัตรเคลือบมัน', emoji:'💼', size:'wide', _demo:true },
  { cat:'qrcode', name:'ป้าย QR PromptPay', emoji:'📱', _demo:true },
  { cat:'business-card', name:'นามบัตรด้าน Matte', emoji:'🗒️', _demo:true },
  { cat:'polaroid', name:'โพลารอยด์ Square', emoji:'📷', _demo:true },
  { cat:'shop-sign', name:'ป้ายชื่อร้าน', emoji:'🏪', size:'tall', _demo:true },
  { cat:'doll-tag', name:'ป้ายตุ๊กตาหัวดุ๊กดิ๊ก', emoji:'🧸', _demo:true },
  { cat:'lanyard', name:'บัตรนักเรียน', emoji:'🪪', _demo:true },
];

var GALLERY_ITEMS = DEMO_ITEMS.slice();
var _currentCat = 'all';

// ─── normalize: รองรับ field เก่า/ใหม่ (image, imageUrl, url) ───
function normItem(raw, id) {
  return {
    id: id || raw.id || '',
    cat: raw.cat || raw.category || 'other',
    name: raw.name || raw.title || 'ผลงาน',
    image: raw.image || raw.imageUrl || raw.url || '',
    emoji: raw.emoji || '🖼️',
    size: raw.size || '',
    createdAt: raw.createdAt || null,
  };
}

function renderGallery(cat) {
  _currentCat = cat;
  var grid = document.getElementById('gallery-grid');
  if (!grid) return;
  var items = (cat === 'all') ? GALLERY_ITEMS : GALLERY_ITEMS.filter(function(i){ return i.cat === cat; });

  if (items.length === 0) {
    grid.innerHTML = '<div class="empty-gallery" style="grid-column:1/-1;text-align:center;padding:2.5rem 1rem;color:var(--text-2)">'
      + '<div style="font-size:2.5rem;margin-bottom:.75rem">🔍</div>'
      + '<h3>ยังไม่มีตัวอย่างงานในหมวดนี้</h3>'
      + '<p style="margin-top:.4rem">ติดต่อเราผ่าน LINE เพื่อดูตัวอย่างเพิ่มเติม</p></div>';
    return;
  }

  grid.innerHTML = items.map(function(item, i){
    var inner = item.image
      ? '<img src="'+DMC.imgCDN(item.image, 520)+'" data-full="'+esc(item.image)+'" alt="'+esc(item.name)+'" loading="lazy" decoding="async" data-emoji="'+esc(item.emoji)+'">'
      : '<span class="gallery-emoji-ph">'+item.emoji+'</span>';
    return '<div class="gallery-item" data-idx="'+i+'" data-cat="'+esc(item.cat)+'">'
      + '<div class="gallery-img '+(item.size||'')+'">' + inner + '</div>'
      + '<div class="gallery-overlay"><div class="gallery-overlay-text">🔍 ดูเต็ม</div></div>'
      + '<div class="gallery-caption">'
      + '<div class="gallery-cat">'+esc(CAT_LABELS[item.cat]||item.cat)+'</div>'
      + '<div class="gallery-name">'+esc(item.name)+'</div>'
      + '</div></div>';
  }).join('');

  if (typeof Loading !== 'undefined') Loading.staggerItems('#gallery-grid .gallery-item', 55);

  grid.querySelectorAll('.gallery-item').forEach(function(el){
    el.addEventListener('click', function(){
      var item = items[parseInt(el.dataset.idx)];
      var lbc = document.getElementById('lightbox-content');
      lbc.innerHTML = item.image
        ? '<img class="lightbox-img" src="'+item.image+'" alt="'+esc(item.name)+'">'
        : '<div class="lightbox-emoji">'+item.emoji+'</div>';
      document.getElementById('lightbox').classList.add('open');
    });
  });
}

function esc(s){ return typeof DMC!=='undefined' ? DMC.escapeHtml(s) : String(s||''); }

// ─── สร้างแท็บหมวดหมู่จาก categories (dynamic) ───
function rebuildTabs(cats) {
  var wrap = document.getElementById('gallery-tabs');
  if (!wrap || !cats || !cats.length) return;
  var html = '<button class="gallery-tab active" data-cat="all">ทั้งหมด</button>';
  cats.forEach(function(cat){
    CAT_LABELS[cat.id] = cat.name;
    html += '<button class="gallery-tab" data-cat="'+esc(cat.id)+'">'+(cat.emoji?cat.emoji+' ':'')+esc(cat.name)+'</button>';
  });
  wrap.innerHTML = html;
  bindTabs();
}

function bindTabs() {
  document.querySelectorAll('.gallery-tab').forEach(function(tab){
    tab.addEventListener('click', function(){
      document.querySelectorAll('.gallery-tab').forEach(function(t){ t.classList.remove('active'); });
      tab.classList.add('active');
      renderGallery(tab.dataset.cat);
    });
  });
}

// Lightbox close
document.getElementById('lightbox-close').addEventListener('click', function(){
  document.getElementById('lightbox').classList.remove('open');
});
document.getElementById('lightbox').addEventListener('click', function(e){
  if (e.target === this) this.classList.remove('open');
});
document.addEventListener('keydown', function(e){
  if (e.key === 'Escape') document.getElementById('lightbox').classList.remove('open');
});

// ─── โหลดข้อมูล: วาด demo ทันที แล้วค่อยแทนด้วยของจริง ───
document.addEventListener('DOMContentLoaded', function(){
  bindTabs();
  renderGallery('all');   // วาดทันที — ไม่มีทางหน้าว่าง

  // โหลด categories + gallery แบบเบื้องหลัง
  (async function(){
    if (typeof DMC === 'undefined') return;
    try {
      var db = await DMC.getFirebaseReady();

      // categories (แท็บ dynamic — built-in + ที่ร้านเพิ่มเอง ผ่าน module กลาง)
      try {
        if (window.DMCCat) {
          var allCats = await DMCCat.loadAll(db);
          rebuildTabs(allCats.map(function(c){ return { id: c.slug, name: c.name, emoji: c.emoji }; }));
        }
      } catch(e) {}

      // gallery items (รูปจริง) — ไม่กรอง active เพื่อรองรับข้อมูลเก่า
      var snap = await db.collection('gallery').limit(100).get();
      if (!snap.empty) {
        var real = [];
        snap.forEach(function(doc){
          var x = doc.data();
          if (x.active === false) return;           // ซ่อนเฉพาะที่ปิดชัดเจน
          real.push(normItem(x, doc.id));
        });
        if (real.length) {
          real.sort(function(a,b){ return (b.createdAt&&b.createdAt.seconds||0)-(a.createdAt&&a.createdAt.seconds||0); });
          GALLERY_ITEMS = real;                     // รูปจริงแทน demo ทั้งหมด
          renderGallery(_currentCat);
        }
      }
    } catch(e) { /* ออฟไลน์/พลาด → คง demo ไว้ */ }
  })();
});
