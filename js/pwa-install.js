/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — PWA Install V14
   js/pwa-install.js
   แบนเนอร์ "ติดตั้งแอป" + จำการปิด (ไม่กวน)
═══════════════════════════════════════════════ */
(function(){
  'use strict';
  if (location.pathname.toLowerCase().indexOf('admin') !== -1) return;

  var DISMISS_KEY = 'dmc_pwa_dismissed';
  var deferredPrompt = null;

  // ถ้าเคยปิด หรือ ติดตั้งแล้ว → ไม่แสดง
  function dismissed() {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch(e) { return false; }
  }
  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    deferredPrompt = e;
    if (!dismissed() && !isStandalone()) showBanner();
  });

  window.addEventListener('appinstalled', function(){
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch(e) {}
    removeBanner();
  });

  function showBanner() {
    if (document.getElementById('pwa-install-banner')) return;
    injectCSS();
    var bar = document.createElement('div');
    bar.id = 'pwa-install-banner';
    bar.innerHTML =
      '<div class="pwa-ib-icon">💎</div>'
      + '<div class="pwa-ib-text"><strong>ติดตั้งแอป Diamond Cute Studio</strong>'
      + '<span>เปิดใช้งานเร็วขึ้น เหมือนแอปจริง</span></div>'
      + '<button class="pwa-ib-install" id="pwa-ib-install">ติดตั้ง</button>'
      + '<button class="pwa-ib-close" id="pwa-ib-close" aria-label="ปิด">✕</button>';
    document.body.appendChild(bar);
    requestAnimationFrame(function(){ bar.classList.add('show'); });

    document.getElementById('pwa-ib-install').addEventListener('click', async function(){
      if (!deferredPrompt) { removeBanner(); return; }
      deferredPrompt.prompt();
      try { await deferredPrompt.userChoice; } catch(e) {}
      deferredPrompt = null;
      removeBanner();
    });
    document.getElementById('pwa-ib-close').addEventListener('click', function(){
      try { localStorage.setItem(DISMISS_KEY, '1'); } catch(e) {}
      removeBanner();
    });
  }

  function removeBanner() {
    var bar = document.getElementById('pwa-install-banner');
    if (bar) { bar.classList.remove('show'); setTimeout(function(){ bar.remove(); }, 300); }
  }

  function injectCSS() {
    if (document.getElementById('pwa-ib-style')) return;
    var css = ''
      + '#pwa-install-banner{position:fixed;left:50%;transform:translate(-50%,120%);bottom:74px;z-index:9990;'
      +   'display:flex;align-items:center;gap:.7rem;background:var(--bg-card,#fff);color:var(--text-1);'
      +   'border:1.5px solid var(--border);border-radius:16px;padding:.7rem .85rem;width:min(92vw,420px);'
      +   'box-shadow:0 10px 35px rgba(0,0,0,.2);transition:transform .35s cubic-bezier(.2,.9,.3,1)}'
      + '#pwa-install-banner.show{transform:translate(-50%,0)}'
      + '.pwa-ib-icon{font-size:1.8rem;flex-shrink:0}'
      + '.pwa-ib-text{flex:1;display:flex;flex-direction:column;line-height:1.3}'
      + '.pwa-ib-text strong{font-family:var(--font-display,sans-serif);font-size:.9rem}'
      + '.pwa-ib-text span{font-size:.76rem;color:var(--text-3)}'
      + '.pwa-ib-install{background:var(--accent);color:#fff;border:none;border-radius:999px;'
      +   'padding:.5rem 1.1rem;font-family:var(--font-display,sans-serif);font-weight:700;font-size:.84rem;cursor:pointer;flex-shrink:0}'
      + '.pwa-ib-close{background:transparent;border:none;color:var(--text-3);font-size:1rem;cursor:pointer;'
      +   'width:28px;height:28px;border-radius:50%;flex-shrink:0}'
      + '.pwa-ib-close:hover{background:var(--bg-mid,rgba(125,125,125,.1))}'
      + '@media(min-width:761px){#pwa-install-banner{bottom:20px}}';
    var st = document.createElement('style');
    st.id = 'pwa-ib-style';
    st.textContent = css;
    document.head.appendChild(st);
  }
})();
