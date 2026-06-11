/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Skeleton Loading V10
   Shared skeleton builders for all pages
═══════════════════════════════════════════════ */
'use strict';

window.Skeleton = (function(){

  // ── Product Grid Skeleton (catalog + home) ──
  function productGrid(count = 8) {
    return Array.from({length: count}, () => `
      <div class="skeleton-card">
        <div class="skeleton skeleton-card-img"></div>
        <div class="skeleton-card-body">
          <div class="skeleton skeleton-line w80"></div>
          <div class="skeleton skeleton-line sm w60"></div>
          <div class="skeleton skeleton-line lg" style="margin-top:.2rem"></div>
          <div class="skeleton skeleton-btn" style="margin-top:.3rem"></div>
        </div>
      </div>`
    ).join('');
  }

  // ── Product Detail Skeleton ──
  function productDetail() {
    return `
      <div class="detail-layout" style="padding-top:1.75rem">
        <!-- Gallery -->
        <div class="detail-gallery">
          <div class="skeleton skeleton-gallery-main"></div>
          <div class="skeleton-gallery-thumbs">
            ${Array.from({length:4}, () => `<div class="skeleton skeleton-thumb"></div>`).join('')}
          </div>
        </div>
        <!-- Info -->
        <div class="skeleton-hero">
          <div class="skeleton skeleton-line lg" style="margin-bottom:.65rem"></div>
          <div class="skeleton skeleton-line sm w60" style="margin-bottom:1rem"></div>
          <div class="skeleton skeleton-line full" style="height:80px;border-radius:var(--r-lg);margin-bottom:1rem"></div>
          <div class="skeleton skeleton-line w80" style="margin-bottom:.4rem"></div>
          <div style="display:flex;gap:.4rem;margin-bottom:1rem">
            ${Array.from({length:3}, () => `<div class="skeleton skeleton-line" style="height:34px;width:90px;border-radius:var(--r-md)"></div>`).join('')}
          </div>
          <div class="skeleton skeleton-line w60" style="margin-bottom:.4rem"></div>
          <div style="display:flex;gap:.4rem;margin-bottom:1rem">
            ${Array.from({length:3}, () => `<div class="skeleton skeleton-line" style="height:34px;width:120px;border-radius:var(--r-md)"></div>`).join('')}
          </div>
          <div style="display:flex;gap:.65rem;margin-top:1.5rem">
            <div class="skeleton skeleton-btn" style="flex:1;height:48px"></div>
            <div class="skeleton skeleton-btn" style="flex:1;height:48px"></div>
          </div>
        </div>
      </div>`;
  }

  // ── Category Grid Skeleton ──
  function categoryGrid(count = 8) {
    return Array.from({length: count}, () =>
      `<div class="skeleton skeleton-cat"></div>`
    ).join('');
  }

  // ── Orders Table Skeleton ──
  function ordersTable(count = 5) {
    return Array.from({length: count}, () => `
      <div class="skeleton-order-row">
        <div class="skeleton skeleton-line" style="width:80px;height:16px;flex-shrink:0"></div>
        <div class="skeleton skeleton-line w80" style="flex:1;height:14px"></div>
        <div class="skeleton skeleton-line" style="width:70px;height:14px;flex-shrink:0"></div>
        <div class="skeleton skeleton-line" style="width:60px;height:28px;border-radius:var(--r-pill);flex-shrink:0"></div>
      </div>`
    ).join('');
  }

  // ── Admin KPI Skeleton ──
  function adminKPIs() {
    return Array.from({length: 4}, () =>
      `<div class="skeleton skeleton-kpi"></div>`
    ).join('');
  }

  // ── Gallery Grid Skeleton ──
  function galleryGrid(count = 9) {
    const sizes = ['tall','','wide','','tall','','','wide',''];
    return Array.from({length: count}, (_, i) => `
      <div class="skeleton skeleton-card" style="break-inside:avoid;margin-bottom:1rem">
        <div class="skeleton skeleton-card-img ${sizes[i]||''}" style="${sizes[i]==='tall'?'aspect-ratio:3/4':''}${sizes[i]==='wide'?'aspect-ratio:4/3':''}"></div>
        <div class="skeleton-card-body" style="padding:.65rem .85rem">
          <div class="skeleton skeleton-line w80"></div>
        </div>
      </div>`
    ).join('');
  }

  // ── Featured Products (homepage) ──
  function featuredProducts(count = 4) {
    return `<div class="product-grid">${productGrid(count)}</div>`;
  }

  return { productGrid, productDetail, categoryGrid, ordersTable, adminKPIs, galleryGrid, featuredProducts };
})();
