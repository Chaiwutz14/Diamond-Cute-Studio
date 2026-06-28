/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Loading Manager V11
═══════════════════════════════════════════════ */
'use strict';

window.Loading = (function(){

  // ── 1. Page Progress Bar ──────────────────────
  let progressTimer = null;
  let progressVal   = 0;

  function progressStart() {
    const bar = getOrCreateBar();
    bar.style.opacity = '1';
    bar.classList.remove('done');
    progressVal = 0;
    bar.style.width = '0%';
    clearInterval(progressTimer);
    progressTimer = setInterval(() => {
      progressVal += Math.random() * 8;
      if (progressVal > 88) progressVal = 88;
      bar.style.width = progressVal + '%';
    }, 200);
  }

  function progressDone() {
    clearInterval(progressTimer);
    const bar = getOrCreateBar();
    bar.style.width = '100%';
    setTimeout(() => bar.classList.add('done'), 300);
    setTimeout(() => { bar.style.opacity='0'; bar.style.width='0%'; bar.classList.remove('done'); }, 750);
  }

  function getOrCreateBar() {
    let bar = document.getElementById('page-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'page-progress';
      document.body.prepend(bar);
    }
    return bar;
  }

  // ── 2. Skeleton Builders ──────────────────────
  const Skeleton = {
    productGrid(n = 8) {
      return Array.from({length:n}, () => `
        <div class="skeleton-card">
          <div class="skeleton skeleton-card-img"></div>
          <div class="skeleton-card-body">
            <div class="skeleton skeleton-line w80"></div>
            <div class="skeleton skeleton-line sm w60"></div>
            <div class="skeleton skeleton-line lg" style="margin-top:.2rem"></div>
            <div class="skeleton skeleton-btn" style="margin-top:.3rem"></div>
          </div>
        </div>`).join('');
    },

    productDetail() {
      return `
        <div class="detail-layout" style="padding-top:1.75rem">
          <div class="detail-gallery">
            <div class="skeleton skeleton-gallery-main"></div>
            <div style="display:flex;gap:.55rem">
              ${Array.from({length:4},()=>`<div class="skeleton skeleton-thumb"></div>`).join('')}
            </div>
          </div>
          <div class="skeleton-hero">
            <div class="skeleton skeleton-line lg" style="margin-bottom:.65rem"></div>
            <div class="skeleton skeleton-line sm w60" style="margin-bottom:1rem"></div>
            <div class="skeleton skeleton-line" style="height:80px;border-radius:var(--r-lg);margin-bottom:1rem"></div>
            <div class="skeleton skeleton-line w80" style="margin-bottom:.4rem"></div>
            <div style="display:flex;gap:.4rem;margin-bottom:1rem">
              ${Array.from({length:3},()=>`<div class="skeleton skeleton-line" style="height:34px;width:90px;border-radius:var(--r-md)"></div>`).join('')}
            </div>
            <div style="display:flex;gap:.65rem;margin-top:1.5rem">
              <div class="skeleton skeleton-btn" style="flex:1;height:48px"></div>
              <div class="skeleton skeleton-btn" style="flex:1;height:48px"></div>
            </div>
          </div>
        </div>`;
    },

    categoryGrid(n = 8) {
      return Array.from({length:n}, () =>
        `<div class="skeleton skeleton-cat" style="height:80px;border-radius:var(--r-xl)"></div>`).join('');
    },

    adminKPIs() {
      return Array.from({length:4}, () =>
        `<div class="skeleton skeleton-kpi"></div>`).join('');
    },

    tableRows(n = 5) {
      return Array.from({length:n}, () => `
        <div class="skeleton-row">
          <div class="skeleton skeleton-line" style="width:80px;height:16px;flex-shrink:0"></div>
          <div class="skeleton skeleton-line w80" style="flex:1;height:14px"></div>
          <div class="skeleton skeleton-line" style="width:70px;height:14px;flex-shrink:0"></div>
          <div class="skeleton skeleton-line" style="width:60px;height:28px;border-radius:var(--r-pill);flex-shrink:0"></div>
        </div>`).join('');
    },
  };

  // ── 3. Pulse Dot (for KPI numbers) ───────────
  const pulseDotHTML = `<span class="pulse-dot"><span></span><span></span><span></span></span>`;

  // ── 4. Blur-up image loader ───────────────────
  function blurUpImage(imgEl) {
    if (!imgEl) return;
    imgEl.classList.add('img-blur-up');
    if (imgEl.complete) {
      imgEl.classList.add('loaded');
    } else {
      imgEl.addEventListener('load',  () => imgEl.classList.add('loaded'), {once:true});
      imgEl.addEventListener('error', () => imgEl.classList.add('loaded'), {once:true});
    }
  }

  // Auto apply blur-up to all product images
  function initBlurUp(selector = '.product-img-wrap img, .gallery-main img') {
    document.querySelectorAll(selector).forEach(blurUpImage);
    // Watch for new images added dynamically
    if (window.MutationObserver) {
      const obs = new MutationObserver(muts => {
        muts.forEach(m => m.addedNodes.forEach(node => {
          if (node.tagName === 'IMG') blurUpImage(node);
          node.querySelectorAll?.('img').forEach(blurUpImage);
        }));
      });
      obs.observe(document.body, {childList:true, subtree:true});
    }
  }

  // ── 5. Staggered gallery fade-in ─────────────
  function staggerItems(selector, delayStep = 50) {
    document.querySelectorAll(selector).forEach((el, i) => {
      el.classList.add('stagger-item');
      el.style.animationDelay = (i * delayStep) + 'ms';
    });
  }

  // ── 6. Button loading state ───────────────────
  function buttonLoad(btn, text = null) {
    if (!btn) return;
    btn._originalHTML = btn.innerHTML;
    btn.classList.add('btn-loading');
    btn.disabled = true;
    if (text) btn.setAttribute('data-loading-text', text);
  }
  function buttonDone(btn) {
    if (!btn) return;
    btn.classList.remove('btn-loading');
    btn.disabled = false;
    if (btn._originalHTML) { btn.innerHTML = btn._originalHTML; delete btn._originalHTML; }
  }

  // ── 7. Card pop-in animation ──────────────────
  function animateCards(selector = '.product-card', delayStep = 40) {
    const cards = document.querySelectorAll(selector);
    cards.forEach((card, i) => {
      card.style.opacity = '0';
      setTimeout(() => {
        card.classList.add('entering');
        card.style.opacity = '';
      }, i * delayStep);
    });
  }

  // ── 8. Overlay loader (heavy actions) ─────────
  function showOverlay(text = 'กำลังดำเนินการ...') {
    let ol = document.getElementById('overlay-loader');
    if (!ol) {
      ol = document.createElement('div');
      ol.id = 'overlay-loader';
      ol.innerHTML = `<div class="overlay-spinner"></div><div class="overlay-text"></div>`;
      document.body.appendChild(ol);
    }
    ol.querySelector('.overlay-text').textContent = text;
    ol.classList.add('active');
  }
  function hideOverlay() {
    document.getElementById('overlay-loader')?.classList.remove('active');
  }

  // ── Auto-init on page load ────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      progressStart();
      window.addEventListener('load', progressDone, {once:true});
      setTimeout(progressDone, 5000); // safety fallback
      initBlurUp();
    });
  } else {
    initBlurUp();
  }

  return {
    progressStart, progressDone,
    Skeleton, pulseDotHTML,
    blurUpImage, initBlurUp,
    staggerItems,
    buttonLoad, buttonDone,
    animateCards,
    showOverlay, hideOverlay,
  };
})();

// Backward compat
window.Skeleton = window.Loading.Skeleton;
