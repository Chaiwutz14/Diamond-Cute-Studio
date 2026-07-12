/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Catalog JS
   js/catalog.js
═══════════════════════════════════════════════ */
'use strict';

// ── รูปปกของสินค้า (V12: รองรับหลายรูป + coverIndex) ──
function catalogCoverOf(p) {
  if (Array.isArray(p.images) && p.images.length) {
    const i = (typeof p.coverIndex === 'number' && p.images[p.coverIndex]) ? p.coverIndex : 0;
    const im = p.images[i];                                  // V.fix(A4): guard กัน null/undefined ใน array
    return im ? (typeof im === 'string' ? im : (im.url || '')) : '';
  }
  return p.image || '';
}


const PLACEHOLDER_PRODUCTS = [
  { id:'p1', name:'รูปโพลารอยด์ 3×4 นิ้ว',      shortDesc:'กระดาษ Fuji Crystal Archive สีสดใส ทนทาน', price:29,  unit:'ใบ',    emoji:'📸', category:'polaroid',      isHot:true  },
  { id:'p2', name:'รูปโพลารอยด์ 4×6 นิ้ว',      shortDesc:'ขนาดใหญ่ เหมาะตกแต่งห้อง คุณภาพสูง',    price:39,  unit:'ใบ',    emoji:'🖼️', category:'polaroid',      isNew:true  },
  { id:'p3', name:'โพลารอยด์ Square 3×3',        shortDesc:'ทรงสี่เหลี่ยมจัตุรัส สไตล์มินิมอล',       price:35,  unit:'ใบ',    emoji:'📷', category:'polaroid'                  },
  { id:'p4', name:'บัตรแขวนคอนักเรียน',          shortDesc:'PVC อย่างดี พร้อมซองใส+สายคล้อง',        price:59,  unit:'ใบ',    emoji:'🪪', category:'lanyard',       isNew:true  },
  { id:'p5', name:'บัตรแขวนคอพนักงาน',           shortDesc:'PVC พรีเมียม พร้อมซองใส ปรับแต่งได้',    price:69,  unit:'ใบ',    emoji:'🪪', category:'lanyard'                   },
  { id:'p6', name:'นามบัตรพรีเมียม (เคลือบมัน)',  shortDesc:'กระดาษ 350 แกรม เคลือบมันเงา',           price:199, unit:'100 ใบ',emoji:'💼', category:'business-card', isSale:true },
  { id:'p7', name:'นามบัตรด้าน (Matte)',          shortDesc:'กระดาษ 350 แกรม เคลือบด้าน ดูสุภาพ',    price:219, unit:'100 ใบ',emoji:'💼', category:'business-card'             },
  { id:'p8', name:'ป้ายชื่อร้านอะคริลิก',          shortDesc:'อะคริลิก UV กันน้ำ ทนแดด หลายขนาด',     price:299, unit:'ชิ้น',  emoji:'🏪', category:'shop-sign',     isHot:true  },
  { id:'p9', name:'ป้ายเมนูร้านค้า',              shortDesc:'พิมพ์ UV บนอะคริลิก คมชัด ทนทาน',        price:199, unit:'ชิ้น',  emoji:'🏪', category:'shop-sign'                 },
  { id:'p10',name:'ป้าย QR สแกนจ่าย',            shortDesc:'PromptPay + TrueMoney อะคริลิกกันน้ำ',   price:149, unit:'ชิ้น',  emoji:'📱', category:'qrcode'                    },
  { id:'p11',name:'ป้าย QR ไวไฟร้าน',            shortDesc:'QR Wifi พร้อมขาตั้ง ดีไซน์สวย',          price:129, unit:'ชิ้น',  emoji:'📶', category:'qrcode',        isNew:true  },
  { id:'p12',name:'ป้ายตุ๊กตาหัวดุ๊กดิ๊ก',        shortDesc:'น่ารัก ทำมือ สกรีนสีสด ทนทาน',          price:49,  unit:'ชิ้น',  emoji:'🧸', category:'doll-tag'                  },
  { id:'p13',name:'ป้ายตุ๊กตาแขวนกระเป๋า',        shortDesc:'PVC ใส พิมพ์ทั้ง 2 ด้าน',               price:39,  unit:'ชิ้น',  emoji:'🎀', category:'doll-tag',      isNew:true  },
  { id:'p14',name:'บัตรนักเรียน (ม.ต้น)',         shortDesc:'PVC คุณภาพสูง พร้อมซองใส',               price:55,  unit:'ใบ',    emoji:'🎓', category:'student-card'              },
  { id:'p15',name:'บัตรนักเรียน (ม.ปลาย)',        shortDesc:'ขนาด CR80 PVC ทนทาน ปรับแต่งได้',        price:55,  unit:'ใบ',    emoji:'🎓', category:'student-card',  isSale:true },
];

let allProducts = [];
let filteredProducts = [];
let currentCat = '';
let currentSort = 'relevance';    // V36: ค่าเริ่มต้น = เกี่ยวข้อง (ไม่มีคำค้น = ยอดนิยม)
let db = null;

// ═══ V36: Search Engine state ═══
let searchReady = false;          // ดัชนีพร้อมหรือยัง
let visibleCount = 0;             // Pagination: จำนวนการ์ดที่แสดงอยู่
const PAGE_SIZE = 12;
let lastLoggedTerm = '';          // Analytics: กันบันทึกคำเดิมซ้ำ
let logTimer = null;
const RECENT_KEY = 'dcs_recent_searches';

document.addEventListener('DOMContentLoaded', async () => {
  // Read URL param for pre-selected category
  const params = new URLSearchParams(location.search);
  currentCat = params.get('cat') || '';

  // Mark active category filter
  if (currentCat) {
    document.querySelectorAll('.filter-item[data-cat]').forEach(el => {
      el.classList.toggle('active', el.dataset.cat === currentCat);
    });
  }

  // Try Firebase, fall back to placeholder
  try {
    db = await DMC.getFirebaseReady();
    await loadFromFirebase();
  } catch {
    allProducts = PLACEHOLDER_PRODUCTS;
    applyFiltersAndRender();
  }

  bindEvents();
});

// ─── Firebase Load ───
async function loadFromFirebase() {
  try {
    // V16: ใช้ตัวโหลดกลาง (snapshot → cache → Firestore) — แชร์แคชกับหน้าแรก ลดการอ่านซ้ำ
    const list = await DMC.loadProducts({ limit: 500 });
    allProducts = (list && list.length) ? list : PLACEHOLDER_PRODUCTS;
  } catch {
    allProducts = PLACEHOLDER_PRODUCTS;
  }
  // โหลดหมวดหมู่ (รวม custom) ให้ DMCCat.matches เทียบ slug↔ชื่อไทยได้ครบ
  try { if (window.DMCCat && DMCCat.loadAll) await DMCCat.loadAll(db); } catch(e) {}
  await buildSearchIndex();       // V36: สร้างดัชนีค้นหา (รวม synonym/alias ของแอดมิน)
  applyFiltersAndRender();
}

// ═══ V36: สร้างดัชนีค้นหา — รวมพจนานุกรมคำพ้องที่แอดมินตั้งใน settings/search ═══
async function buildSearchIndex() {
  if (typeof DCSearch === 'undefined') return;
  let synonyms = [], aliases = {};
  try {
    // cache 10 นาที ลดการอ่าน Firestore (รูปแบบเดียวกับ CMS)
    const CK = 'dcs_search_dict_v1';
    let dict = null;
    try {
      const c = JSON.parse(localStorage.getItem(CK) || 'null');
      if (c && Date.now() - c.at < 10 * 60 * 1000) dict = c.data;
    } catch (e) {}
    if (!dict && db) {
      const doc = await db.collection('settings').doc('search').get();
      dict = doc.exists ? doc.data() : {};
      try { localStorage.setItem(CK, JSON.stringify({ at: Date.now(), data: dict })); } catch (e) {}
    }
    if (dict) {
      // synonyms: บรรทัดละกลุ่ม "คำ = คำพ้อง1, คำพ้อง2"
      String(dict.synonyms || '').split('\n').forEach(line => {
        const parts = line.split(/[=,]/).map(x => x.trim()).filter(Boolean);
        if (parts.length >= 2) synonyms.push(parts);
      });
      // aliases: บรรทัดละคู่ "คำย่อ > คำเต็ม"
      String(dict.aliases || '').split('\n').forEach(line => {
        const m = line.split('>');
        if (m.length === 2 && m[0].trim() && m[1].trim()) aliases[m[0].trim()] = m[1].trim();
      });
    }
  } catch (e) {}
  try {
    DCSearch.buildIndex(allProducts, { synonyms, aliases });
    searchReady = true;
  } catch (e) { searchReady = false; }
}

// ─── Bind UI Events ───
function bindEvents() {
  // Category filter
  document.getElementById('cat-filter-list')?.addEventListener('click', e => {
    const item = e.target.closest('.filter-item[data-cat]');
    if (!item) return;
    document.querySelectorAll('.filter-item[data-cat]').forEach(el => el.classList.remove('active'));
    item.classList.add('active');
    currentCat = item.dataset.cat;
    applyFiltersAndRender();
  });

  // Search (debounced) — V36: + Autocomplete + Enter + ปุ่มล้าง
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.value = new URLSearchParams(location.search).get('q') || '';
    const debouncedRender  = DMC.debounce(() => applyFiltersAndRender({ keepScroll: true }), 300);
    const debouncedSuggest = DMC.debounce(renderSuggest, 140);
    searchInput.addEventListener('input', () => {
      toggleClearBtn();
      debouncedSuggest();
      debouncedRender();
    });
    searchInput.addEventListener('focus', renderSuggest);
    searchInput.addEventListener('keydown', onSearchKeydown);
    document.getElementById('search-clear-btn')?.addEventListener('click', () => {
      searchInput.value = '';
      toggleClearBtn(); hideSuggest();
      applyFiltersAndRender();
      searchInput.focus();
    });
    // แตะนอกกล่อง → ปิด suggestions
    document.addEventListener('click', (e) => {
      if (!document.getElementById('search-bar-wrap')?.contains(e.target)) hideSuggest();
    });
    toggleClearBtn();
  }

  // V36: โหลดเพิ่ม + Infinite Scroll (เลื่อนใกล้ปุ่ม = โหลดต่ออัตโนมัติ)
  const loadBtn = document.getElementById('load-more-btn');
  if (loadBtn) {
    loadBtn.addEventListener('click', loadMore);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && loadBtn.style.display !== 'none') loadMore();
      }, { rootMargin: '300px' }).observe(loadBtn);
    }
  }

  // Sort
  document.getElementById('sort-select')?.addEventListener('change', e => {
    currentSort = e.target.value;
    applyFiltersAndRender();
  });

  // Apply / Clear filters
  document.getElementById('apply-filter-btn')?.addEventListener('click', applyFiltersAndRender);
  document.getElementById('clear-filter-btn')?.addEventListener('click', clearFilters);

  // Mobile dropdown sync
  var mobileSelect = document.getElementById('mobile-cat-select');
  if (mobileSelect) {
    if (currentCat) mobileSelect.value = currentCat;
    mobileSelect.addEventListener('change', function(){
      currentCat = mobileSelect.value;
      document.querySelectorAll('.filter-item[data-cat]').forEach(function(el){
        el.classList.toggle('active', el.dataset.cat === currentCat);
      });
      applyFiltersAndRender();
    });
  }
}

// ─── Apply Filters (V36: ใช้ Search Engine Core) ───
function applyFiltersAndRender(opts) {
  opts = opts || {};
  if (typeof Loading !== 'undefined') Loading.progressStart();
  const search   = document.getElementById('search-input')?.value.trim() || '';
  const priceMin = parseFloat(document.getElementById('price-min')?.value) || 0;
  const priceMax = parseFloat(document.getElementById('price-max')?.value) || Infinity;
  const filterNew  = document.getElementById('filter-new')?.checked;
  const filterHot  = document.getElementById('filter-hot')?.checked;
  const filterSale = document.getElementById('filter-sale')?.checked;

  // ① คำค้น → เอนจิน (เรียงตามความเกี่ยวข้องมาแล้ว) | ไม่มีคำค้น → สินค้าทั้งหมด
  let base, relevanceOrder = null;
  if (search && searchReady) {
    const hits = DCSearch.query(search);
    base = hits.map(h => h.product);
    relevanceOrder = new Map(base.map((p, i) => [p.id, i]));
  } else if (search) {
    // fallback เผื่อเอนจินโหลดไม่ทัน — เทียบตรงแบบเดิม
    const q = search.toLowerCase();
    base = allProducts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.shortDesc || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q));
  } else {
    base = allProducts.slice();
  }

  // ② Filter หมวด (เฉพาะตอนไม่ได้ค้นหา — ค้นหาแล้วดูข้ามหมวด ตามพฤติกรรมเดิม) + ราคา + สถานะ
  filteredProducts = base.filter(p => {
    if (currentCat && !search) {
      const ok = (window.DMCCat && DMCCat.matches)
        ? DMCCat.matches(p.category, currentCat)
        : p.category === currentCat;
      if (!ok) return false;
    }
    if (p.price < priceMin || p.price > priceMax) return false;
    if (filterNew  && !p.isNew)  return false;
    if (filterHot  && !p.isHot)  return false;
    if (filterSale && !p.isSale) return false;
    return true;
  });

  // ③ Sort — 'relevance' คงลำดับเอนจินตอนค้นหา / ไม่ค้นหา = ยอดนิยม
  filteredProducts.sort((a, b) => {
    if (currentSort === 'price-asc')  return a.price - b.price;
    if (currentSort === 'price-desc') return b.price - a.price;
    if (currentSort === 'newest')     return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    if (currentSort === 'az')         return String(a.name).localeCompare(String(b.name), 'th');
    if (currentSort === 'relevance' && relevanceOrder)
      return (relevanceOrder.get(a.id) ?? 9e9) - (relevanceOrder.get(b.id) ?? 9e9);
    // 'featured' หรือ relevance ที่ไม่มีคำค้น: hot > new > sale > rest
    const scoreA = (a.isHot?4:0) + (a.isNew?2:0) + (a.isSale?1:0);
    const scoreB = (b.isHot?4:0) + (b.isNew?2:0) + (b.isSale?1:0);
    return scoreB - scoreA;
  });

  visibleCount = PAGE_SIZE;                       // V36: reset pagination ทุกครั้งที่เงื่อนไขเปลี่ยน
  renderProducts(search);
  updateResultCount();
  updateActiveFilterTags(search, priceMin, priceMax, filterNew, filterHot, filterSale);
  syncSearchURL(search);                          // V36: SEO — ?q= + meta title + JSON-LD
  scheduleSearchLog(search);                      // V36: Analytics — คำค้นยอดนิยม/ไม่พบ
  if (search && !opts.keepScroll) markCommittedSearch(search);
  if (typeof Loading !== 'undefined') Loading.progressDone();   // V.upgrade1: ปิดแถบโหลด (กันค้าง)
}

// ═══ V36: SEO — sync URL (?q=), meta title, Structured Data ═══
const BASE_TITLE = document.title;
function syncSearchURL(search) {
  try {
    const url = new URL(location.href);
    if (search) url.searchParams.set('q', search); else url.searchParams.delete('q');
    history.replaceState(history.state, '', url);
    document.title = search ? ('ค้นหา "' + search + '" — ' + BASE_TITLE) : BASE_TITLE;
    // JSON-LD ItemList (10 อันดับแรกของผลค้นหา)
    let ld = document.getElementById('dcs-search-ld');
    if (search && filteredProducts.length) {
      if (!ld) {
        ld = document.createElement('script');
        ld.type = 'application/ld+json';
        ld.id = 'dcs-search-ld';
        document.head.appendChild(ld);
      }
      ld.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'ผลการค้นหา ' + search,
        itemListElement: filteredProducts.slice(0, 10).map((p, i) => ({
          '@type': 'ListItem', position: i + 1, name: p.name,
          url: location.origin + location.pathname.replace(/[^/]*$/, '') + 'product.html?id=' + p.id,
        })),
      });
    } else if (ld) ld.remove();
  } catch (e) {}
}

// ═══ V36: Analytics — เก็บสถิติคำค้น (ยอดนิยม/ไม่พบ/CTR) แบบ fire-and-forget ═══
function statDocId(term) {
  return encodeURIComponent(DCSearch ? DCSearch.normalize(term) : term.toLowerCase())
    .replace(/[.%~*/\[\]]/g, '_').slice(0, 120);
}
function scheduleSearchLog(search) {
  clearTimeout(logTimer);
  if (!search || search.length < 2 || !db) return;
  logTimer = setTimeout(() => {
    const key = statDocId(search);
    if (!key || key === lastLoggedTerm) return;
    lastLoggedTerm = key;
    // V37: นับ "จำนวนค้นหาต่อวัน" ลงสถิติรายวัน (analytics.js)
    try { if (window.DCA) DCA.count('sq'); } catch (e) {}
    try {
      db.collection('searchStats').doc(key).set({
        term: DCSearch ? DCSearch.normalize(search) : search.toLowerCase(),
        count: firebase.firestore.FieldValue.increment(1),
        results: filteredProducts.length,
        zero: filteredProducts.length === 0,
        lastAt: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true }).catch(() => {});
    } catch (e) {}
  }, 1500);   // ค้างคำเดิม 1.5 วิ ค่อยนับ = คำที่ตั้งใจค้นจริง
}
function logSearchClick() {
  const search = document.getElementById('search-input')?.value.trim();
  if (!search || search.length < 2 || !db) return;
  try {
    db.collection('searchStats').doc(statDocId(search)).set({
      clicks: firebase.firestore.FieldValue.increment(1),
    }, { merge: true }).catch(() => {});
  } catch (e) {}
}

// ═══ V36: คำค้นล่าสุด (localStorage) ═══
function getRecentSearches() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch (e) { return []; }
}
function markCommittedSearch(term) {
  if (!term || term.length < 2 || !filteredProducts.length) return;
  try {
    let list = getRecentSearches().filter(t => t !== term);
    list.unshift(term);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8)));
  } catch (e) {}
}

// ─── Render Grid (V36: pagination + highlight + no-result อัจฉริยะ) ───
function renderProducts(search) {
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;

  if (filteredProducts.length === 0) {
    renderNoResults(grid, search);
    updateLoadMore();
    return;
  }

  const page = filteredProducts.slice(0, visibleCount);
  grid.innerHTML = page.map(p => buildCard(p, search)).join('');
  bindCardEvents(grid);
  updateLoadMore();

  // Scroll-in animation
  grid.querySelectorAll('.product-card').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    requestAnimationFrame(() => {
      setTimeout(() => {
        el.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        el.style.opacity = '1';
        el.style.transform = '';
      }, (i % PAGE_SIZE) * 40);
    });
  });
}

// ═══ V36: No Result Handling — Did you mean + คำใกล้เคียง + สินค้าขายดี + หมวดหมู่ ═══
function renderNoResults(grid, search) {
  const dym    = (search && searchReady) ? DCSearch.didYouMean(search) : null;
  const nearby = (search && searchReady) ? DCSearch.nearbyTerms(search, 4) : [];
  const hot    = allProducts.filter(p => p.isHot || (p.orderCount || 0) > 0).slice(0, 4);
  const cats   = (window.DMCCat && DMCCat.BUILTIN) ? DMCCat.BUILTIN.slice(0, 6) : [];

  let html = `
    <div style="grid-column:1/-1;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:2.5rem 1.25rem;color:var(--text-3)">
      <div style="font-size:2.5rem;margin-bottom:.75rem">🔍</div>
      <p style="margin:0 0 .35rem;font-weight:700;color:var(--text-2)">${search ? 'ไม่พบสินค้าที่ตรงกับ "' + DMC.escapeHtml(search) + '"' : 'ไม่พบสินค้าที่ตรงกับเงื่อนไข'}</p>`;

  if (dym) html += `
      <p style="margin:.25rem 0 0;font-size:.9rem">คุณหมายถึง
        <button type="button" class="dcs-dym-btn" data-term="${DMC.escapeHtml(dym)}" style="background:none;border:none;color:var(--accent);font-weight:800;cursor:pointer;font-size:.95rem;text-decoration:underline;padding:0">${DMC.escapeHtml(dym)}</button> ใช่ไหม?</p>`;

  if (nearby.length) html += `
      <div style="display:flex;gap:.45rem;flex-wrap:wrap;justify-content:center;margin-top:.9rem">
        ${nearby.map(t => `<button type="button" class="dcs-dym-btn" data-term="${DMC.escapeHtml(t)}" style="border:1.5px solid var(--border);background:var(--bg-card);color:var(--text-2);border-radius:999px;padding:.35rem .85rem;font-size:.82rem;cursor:pointer;font-family:var(--font-display)">${DMC.escapeHtml(t)}</button>`).join('')}
      </div>`;

  if (cats.length) html += `
      <div style="margin-top:1.1rem;font-size:.82rem">ลองดูตามหมวดหมู่:
        ${cats.map(c => `<a href="catalog.html?cat=${encodeURIComponent(c.slug || '')}" style="color:var(--accent);font-weight:700;margin:0 .3rem">${DMC.escapeHtml(c.name || '')}</a>`).join(' · ')}
      </div>`;

  html += `<button id="empty-clear-btn" class="btn btn-ghost btn-md" style="border-radius:var(--r-lg);margin-top:1.2rem">ล้างตัวกรอง</button></div>`;

  if (hot.length) html += `
    <div style="grid-column:1/-1;width:100%;margin-top:.25rem">
      <div style="font-family:var(--font-display);font-weight:800;color:var(--text-2);margin:0 0 .8rem">🔥 สินค้าขายดี — เผื่อถูกใจ</div>
    </div>
    ${hot.map(p => buildCard(p, '')).join('')}`;

  grid.innerHTML = html;
  bindCardEvents(grid);
  document.getElementById('empty-clear-btn')?.addEventListener('click', clearFilters);
  grid.querySelectorAll('.dcs-dym-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = document.getElementById('search-input');
      if (inp) inp.value = btn.dataset.term || '';
      applyFiltersAndRender();
    });
  });
}

// ═══ V36: Load More + Infinite Scroll ═══
function updateLoadMore() {
  const btn = document.getElementById('load-more-btn');
  if (!btn) return;
  const remain = filteredProducts.length - visibleCount;
  if (remain > 0) {
    btn.style.display = '';
    btn.textContent = 'โหลดเพิ่ม (' + remain + ' รายการ)';
  } else btn.style.display = 'none';
}
function loadMore() {
  if (visibleCount >= filteredProducts.length) return;
  const grid = document.getElementById('catalog-grid');
  const search = document.getElementById('search-input')?.value.trim() || '';
  const prev = visibleCount;
  visibleCount = Math.min(visibleCount + PAGE_SIZE, filteredProducts.length);
  // ต่อท้ายเฉพาะการ์ดใหม่ (ไม่ re-render ทั้ง grid — ภาพเดิมไม่กระพริบ)
  const frag = document.createElement('div');
  frag.innerHTML = filteredProducts.slice(prev, visibleCount).map(p => buildCard(p, search)).join('');
  while (frag.firstChild) grid.appendChild(frag.firstChild);
  bindCardEvents(grid);
  updateLoadMore();
}

function buildCard(p, search) {
  // V36: ไฮไลต์คำที่ค้นในชื่อ/คำอธิบาย (escape ปลอดภัยในตัว)
  const hlName = (search && searchReady) ? DCSearch.highlight(p.name, search) : DMC.escapeHtml(p.name);
  const hlDesc = (search && searchReady) ? DCSearch.highlight(p.shortDesc || '', search) : DMC.escapeHtml(p.shortDesc || '');
  const badges = [];
  if (p.isNew)  badges.push('<span class="badge badge-new">✨ ใหม่</span>');
  if (p.isHot)  badges.push('<span class="badge badge-hot">🔥 ขายดี</span>');
  if (p.isSale) badges.push('<span class="badge badge-sale">💰 ลด</span>');
  // V29: ป้าย "ออกแบบได้" ย้ายเป็นแถบทึบชิดขอบล่างรูป (design-strip) — อ่านออกชัดบนภาพทุกโทนสี
  const oldPrice = p.oldPrice ? `<span class="product-price-old">${DMC.formatPrice(p.oldPrice)}</span>` : '';

  return `
    <a href="product.html?id=${p.id}" class="product-card" data-id="${p.id}">
      <div class="product-img-wrap">
        ${catalogCoverOf(p) ? `<img src="${DMC.imgCDN(catalogCoverOf(p), 440)}" data-full="${DMC.escapeHtml(catalogCoverOf(p))}" alt="${DMC.escapeHtml(p.name)}" loading="lazy" decoding="async">` : `<span>${p.emoji||'📦'}</span>`}
        <div class="product-img-overlay"></div>
        ${badges.length ? `<div class="product-badges">${badges.join('')}</div>` : ''}
        ${p.hasPreview ? '<div class="design-strip"><span class="design-strip-ico">🎨</span> ออกแบบเองได้ · ฟรี</div>' : ''}
        <button class="product-wish" data-id="${p.id}" aria-label="บันทึก" title="บันทึก">♡</button>
      </div>
      <div class="product-info">
        <div class="product-name">${hlName}</div>
        <div class="product-desc">${hlDesc}</div>
        <div class="product-footer">
          <div>
            <div class="product-price">${DMC.formatPrice(p.price)}<span class="unit">/${p.unit||'ชิ้น'}</span></div>
            ${oldPrice}
          </div>
          <button class="btn-add-cart" data-id="${p.id}" aria-label="ใส่ตะกร้า" title="ใส่ตะกร้า">+</button>
        </div>
      </div>
    </a>
  `;
}

function bindCardEvents(container) {
  // V36: Analytics CTR — คลิกเข้าดูสินค้าหลังค้นหา
  container.querySelectorAll('.product-card').forEach(card => {
    if (card.dataset.ctrBound) return;
    card.dataset.ctrBound = '1';
    card.addEventListener('click', logSearchClick);
  });
  container.querySelectorAll('.btn-add-cart').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      const p = filteredProducts.find(x => x.id === btn.dataset.id);
      if (!p) return;
      // bug-fix: เพิ่ม image field → ตะกร้าโชว์รูปสินค้าจริง (รองรับ p.images[0] ของสินค้าใหม่ + p.image ของสินค้าเก่า)
      const image = (Array.isArray(p.images) && p.images[0] && (p.images[0].url || p.images[0])) || p.image || '';
      DMC.addToCart({ id:p.id, name:p.name, price:p.price, unit:p.unit||'ชิ้น', emoji:p.emoji||'📦', image, qty:1 });
      btn.textContent = '✓';
      setTimeout(() => btn.textContent = '+', 1200);
    });
  });
  container.querySelectorAll('.product-wish').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      btn.classList.toggle('active');
      btn.textContent = btn.classList.contains('active') ? '♥' : '♡';
    });
  });
}

// ─── Result Count ───
function updateResultCount() {
  const el = document.getElementById('result-count');
  if (el) el.textContent = filteredProducts.length;
  // Show cross-category hint when searching with category active
  const search = document.getElementById('search-input')?.value.trim();
  const hintEl = document.getElementById('search-cat-hint');
  if (hintEl) {
    if (search && currentCat) {
      hintEl.style.display = '';
      hintEl.textContent = '🔍 ค้นหาจากทุกหมวดหมู่เนื่องจากมีคำค้นหา';
    } else {
      hintEl.style.display = 'none';
    }
  }
}

// ─── Active Filter Tags ───
function updateActiveFilterTags(search, priceMin, priceMax, filterNew, filterHot, filterSale) {
  const wrap = document.getElementById('active-filters');
  if (!wrap) return;
  const tags = [];
  if (search)            tags.push({ label:`🔍 "${search}"`, clear:() => { document.getElementById('search-input').value=''; applyFiltersAndRender(); } });
  if (priceMin > 0)      tags.push({ label:`ราคา ≥ ${DMC.formatPrice(priceMin)}`, clear:() => { document.getElementById('price-min').value=''; applyFiltersAndRender(); } });
  if (priceMax < Infinity)tags.push({ label:`ราคา ≤ ${DMC.formatPrice(priceMax)}`, clear:() => { document.getElementById('price-max').value=''; applyFiltersAndRender(); } });
  if (filterNew)         tags.push({ label:'✨ ใหม่', clear:() => { document.getElementById('filter-new').checked=false; applyFiltersAndRender(); } });
  if (filterHot)         tags.push({ label:'🔥 ขายดี', clear:() => { document.getElementById('filter-hot').checked=false; applyFiltersAndRender(); } });
  if (filterSale)        tags.push({ label:'💰 ลด', clear:() => { document.getElementById('filter-sale').checked=false; applyFiltersAndRender(); } });

  if (tags.length === 0) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'flex';
  wrap.innerHTML = tags.map((t, i) =>
    `<span class="active-filter-tag">${t.label}<button class="filter-tag-remove" data-idx="${i}">✕</button></span>`
  ).join('');
  wrap.querySelectorAll('.filter-tag-remove').forEach(btn => {
    btn.addEventListener('click', () => tags[+btn.dataset.idx].clear());
  });
}

function clearFilters() {
  currentCat = '';
  document.querySelectorAll('.filter-item[data-cat]').forEach(el => el.classList.toggle('active', el.dataset.cat === ''));
  if (document.getElementById('search-input'))   document.getElementById('search-input').value = '';
  if (document.getElementById('price-min'))      document.getElementById('price-min').value = '';
  if (document.getElementById('price-max'))      document.getElementById('price-max').value = '';
  if (document.getElementById('filter-new'))     document.getElementById('filter-new').checked = false;
  if (document.getElementById('filter-hot'))     document.getElementById('filter-hot').checked = false;
  if (document.getElementById('filter-sale'))    document.getElementById('filter-sale').checked = false;
  applyFiltersAndRender();
}
window.clearFilters = clearFilters;

/* ═══════════════════════════════════════════════
   V36: Search Suggest UI — Autocomplete · คำค้นล่าสุด · ยอดนิยม · Did-you-mean · คีย์บอร์ด
═══════════════════════════════════════════════ */
let _suggestItems = [];   // รายการที่โชว์อยู่ (ไว้ทำ keyboard nav)
let _suggestActive = -1;  // index ที่ไฮไลต์ด้วยลูกศร
let _popularCache = null; // แคชคำค้นยอดนิยม (ต่อ session)

// ปุ่มล้างคำค้น — โชว์เมื่อมีข้อความ
function toggleClearBtn() {
  const btn = document.getElementById('search-clear-btn');
  const inp = document.getElementById('search-input');
  if (btn && inp) btn.style.display = inp.value.trim() ? '' : 'none';
}

function hideSuggest() {
  const box = document.getElementById('search-suggest');
  if (box) { box.style.display = 'none'; box.innerHTML = ''; }
  _suggestItems = []; _suggestActive = -1;
}

// ดึงคำค้นยอดนิยมจาก Firestore (searchStats) — แคชใน sessionStorage 10 นาที
async function getPopularSearches() {
  if (_popularCache) return _popularCache;
  try {
    const c = JSON.parse(sessionStorage.getItem('dcs_popular_searches') || 'null');
    if (c && Date.now() - c.at < 10 * 60 * 1000) { _popularCache = c.data; return _popularCache; }
  } catch (e) {}
  let out = [];
  try {
    if (db) {
      const qs = await db.collection('searchStats').orderBy('count', 'desc').limit(6).get();
      qs.forEach(d => { const x = d.data(); if (x && x.term && !x.zero) out.push(x.term); });
    }
  } catch (e) {}
  _popularCache = out;
  try { sessionStorage.setItem('dcs_popular_searches', JSON.stringify({ at: Date.now(), data: out })); } catch (e) {}
  return out;
}

async function renderSuggest() {
  const box = document.getElementById('search-suggest');
  const inp = document.getElementById('search-input');
  if (!box || !inp) return;
  const q = inp.value.trim();
  const rows = [];

  if (!q) {
    // ยังไม่พิมพ์ → คำค้นล่าสุด + ยอดนิยม
    const recent = getRecentSearches().slice(0, 5);
    if (recent.length) {
      rows.push({ header: '🕘 ค้นหาล่าสุด' });
      recent.forEach(t => rows.push({ text: t, type: 'recent' }));
    }
    const pop = await getPopularSearches();
    // กันแข่งกับผู้ใช้พิมพ์ระหว่างรอ await
    if (inp.value.trim()) return;
    if (pop.length) {
      rows.push({ header: '🔥 คำค้นยอดนิยม' });
      pop.filter(t => !recent.includes(t)).slice(0, 6).forEach(t => rows.push({ text: t, type: 'popular' }));
    }
  } else {
    // พิมพ์แล้ว → Autocomplete
    if (searchReady) {
      DCSearch.suggest(q, 7).forEach(s => rows.push({ text: s.text, type: s.type }));
      // ไม่มี autocomplete แต่พอมี did-you-mean
      if (!rows.length) {
        const dym = DCSearch.didYouMean(q);
        if (dym) rows.push({ text: dym, type: 'dym' });
      }
    }
    if (!rows.length) { hideSuggest(); return; }
  }

  if (!rows.length) { hideSuggest(); return; }

  // เก็บเฉพาะรายการเลือกได้ (ไม่ใช่ header) ไว้ทำ keyboard nav
  _suggestItems = rows.filter(r => !r.header).map(r => r.text);
  _suggestActive = -1;

  const ICON = { recent: '🕘', popular: '🔥', product: '🔍', term: '🔍', dym: '💡' };
  box.innerHTML = rows.map(r => {
    if (r.header) return `<div class="suggest-header">${r.header}</div>`;
    const label = (r.type === 'dym') ? `คุณหมายถึง "<b>${DMC.escapeHtml(r.text)}</b>"?` : DMC.escapeHtml(r.text);
    return `<div class="suggest-item" role="option" data-term="${DMC.escapeHtml(r.text)}">
      <span class="suggest-ico">${ICON[r.type] || '🔍'}</span><span class="suggest-txt">${label}</span></div>`;
  }).join('');
  box.style.display = '';

  box.querySelectorAll('.suggest-item').forEach(el => {
    el.addEventListener('mousedown', (e) => {   // mousedown ก่อน blur ของ input
      e.preventDefault();
      commitSuggest(el.dataset.term || '');
    });
  });
}

function commitSuggest(term) {
  const inp = document.getElementById('search-input');
  if (!inp) return;
  inp.value = term;
  toggleClearBtn();
  hideSuggest();
  currentSort = 'relevance';
  const sortSel = document.getElementById('sort-select');
  if (sortSel) sortSel.value = 'relevance';
  applyFiltersAndRender();
}

function onSearchKeydown(e) {
  const box = document.getElementById('search-suggest');
  const open = box && box.style.display !== 'none' && _suggestItems.length;

  if (e.key === 'Enter') {
    e.preventDefault();
    if (open && _suggestActive >= 0) commitSuggest(_suggestItems[_suggestActive]);
    else { hideSuggest(); applyFiltersAndRender(); }
    return;
  }
  if (e.key === 'Escape') { hideSuggest(); return; }
  if (!open) return;

  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const n = _suggestItems.length;
    _suggestActive = e.key === 'ArrowDown'
      ? (_suggestActive + 1) % n
      : (_suggestActive - 1 + n) % n;
    const items = box.querySelectorAll('.suggest-item');
    items.forEach((el, i) => el.classList.toggle('active', i === _suggestActive));
    if (items[_suggestActive]) items[_suggestActive].scrollIntoView({ block: 'nearest' });
  }
}
