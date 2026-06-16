/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Custom Select V14
   js/custom-select.js

   แปลง <select data-custom> เป็น dropdown/bottom-sheet สวยตามธีม
   - มือถือ: เด้ง bottom sheet เต็มความกว้าง
   - เดสก์ท็อป: dropdown ลอยใต้ปุ่ม
   - JS พัง/ไม่รองรับ → ใช้ <select> เดิม (graceful fallback)
   - sync ค่ากลับไป <select> จริง + ยิง event 'change'
═══════════════════════════════════════════════ */
(function(){
  'use strict';

  function injectCSS() {
    if (document.getElementById('dcs-cs-style')) return;
    var css = ''
      + '.cs-wrap{position:relative;width:100%}'
      + '.cs-trigger{width:100%;display:flex;align-items:center;justify-content:space-between;gap:.5rem;'
      +   'padding:.7rem .9rem;border:1.5px solid var(--border);border-radius:var(--r-md,10px);'
      +   'background:var(--bg-card,#fff);color:var(--text-1);font-family:var(--font-body,inherit);'
      +   'font-size:.9rem;cursor:pointer;text-align:left;transition:border-color .15s}'
      + '.cs-trigger:hover{border-color:var(--accent)}'
      + '.cs-trigger.cs-open{border-color:var(--accent);box-shadow:0 0 0 3px rgba(125,125,255,.12)}'
      + '.cs-trigger-label{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + '.cs-caret{transition:transform .2s;font-size:.7rem;color:var(--text-3);flex-shrink:0}'
      + '.cs-trigger.cs-open .cs-caret{transform:rotate(180deg)}'
      // desktop dropdown
      + '.cs-panel{position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:9500;'
      +   'background:var(--bg-card,#fff);border:1.5px solid var(--border);border-radius:var(--r-md,10px);'
      +   'box-shadow:0 10px 30px rgba(0,0,0,.14);max-height:300px;overflow-y:auto;padding:.3rem;'
      +   'opacity:0;transform:translateY(-6px);pointer-events:none;transition:opacity .15s,transform .15s}'
      + '.cs-panel.cs-show{opacity:1;transform:translateY(0);pointer-events:auto}'
      + '.cs-opt{display:flex;align-items:center;gap:.5rem;padding:.6rem .75rem;border-radius:var(--r-sm,7px);'
      +   'cursor:pointer;font-size:.9rem;color:var(--text-1);transition:background .12s}'
      + '.cs-opt:hover{background:var(--bg-mid,rgba(125,125,125,.08))}'
      + '.cs-opt.cs-sel{background:var(--accent);color:#fff}'
      + '.cs-opt-check{margin-left:auto;font-size:.85rem;opacity:0}'
      + '.cs-opt.cs-sel .cs-opt-check{opacity:1}'
      // mobile bottom sheet
      + '.cs-backdrop{position:fixed;inset:0;z-index:9600;background:rgba(0,0,0,.45);opacity:0;'
      +   'transition:opacity .2s;display:none}'
      + '.cs-backdrop.cs-show{display:block;opacity:1}'
      + '.cs-sheet{position:fixed;left:0;right:0;bottom:0;z-index:9601;background:var(--bg-card,#fff);'
      +   'border-radius:18px 18px 0 0;max-height:72vh;overflow-y:auto;'
      +   'padding:.5rem .5rem calc(.5rem + env(safe-area-inset-bottom,0));'
      +   'transform:translateY(100%);transition:transform .26s cubic-bezier(.2,.9,.3,1);'
      +   'box-shadow:0 -8px 30px rgba(0,0,0,.2)}'
      + '.cs-sheet.cs-show{transform:translateY(0)}'
      + '.cs-sheet-handle{width:42px;height:5px;border-radius:3px;background:var(--border);margin:.55rem auto .35rem}'
      + '.cs-sheet-title{text-align:center;font-family:var(--font-display);font-weight:700;font-size:.95rem;'
      +   'color:var(--text-1);padding:.3rem 1rem .7rem;border-bottom:1px solid var(--border);margin-bottom:.4rem}'
      + '.cs-sheet .cs-opt{padding:.95rem 1rem;font-size:1rem}'
      + '.cs-sheet .cs-opt.cs-sel{border-radius:var(--r-md,10px)}';
    var st = document.createElement('style');
    st.id = 'dcs-cs-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function isMobile() { return window.matchMedia('(max-width:760px)').matches; }

  function build(select) {
    if (select.dataset.csReady) return;
    select.dataset.csReady = '1';

    var wrap = document.createElement('div');
    wrap.className = 'cs-wrap';
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);
    select.style.display = 'none';   // ซ่อน native แต่คงไว้เพื่อ form/value

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'cs-trigger';
    trigger.innerHTML = '<span class="cs-trigger-label"></span><span class="cs-caret">▼</span>';
    wrap.appendChild(trigger);

    var labelEl = trigger.querySelector('.cs-trigger-label');

    function syncLabel() {
      var opt = select.options[select.selectedIndex];
      labelEl.textContent = opt ? opt.textContent : '';
    }
    syncLabel();

    function buildOptions(container) {
      container.innerHTML = '';
      Array.prototype.forEach.call(select.options, function(opt, i){
        var row = document.createElement('div');
        row.className = 'cs-opt' + (i === select.selectedIndex ? ' cs-sel' : '');
        row.innerHTML = '<span>' + opt.textContent + '</span><span class="cs-opt-check">✓</span>';
        row.addEventListener('click', function(){
          select.selectedIndex = i;
          syncLabel();
          close();
          select.dispatchEvent(new Event('change', { bubbles: true }));
        });
        container.appendChild(row);
      });
    }

    var panel = null, backdrop = null, sheet = null;

    function openDesktop() {
      panel = document.createElement('div');
      panel.className = 'cs-panel';
      buildOptions(panel);
      wrap.appendChild(panel);
      requestAnimationFrame(function(){ panel.classList.add('cs-show'); });
      trigger.classList.add('cs-open');
      document.addEventListener('click', onOutside, true);
    }
    function openMobile() {
      backdrop = document.createElement('div');
      backdrop.className = 'cs-backdrop';
      sheet = document.createElement('div');
      sheet.className = 'cs-sheet';
      var lbl = select.getAttribute('aria-label') || select.dataset.title || 'เลือกตัวเลือก';
      sheet.innerHTML = '<div class="cs-sheet-handle"></div><div class="cs-sheet-title">' + lbl + '</div>';
      var optWrap = document.createElement('div');
      buildOptions(optWrap);
      sheet.appendChild(optWrap);
      document.body.appendChild(backdrop);
      document.body.appendChild(sheet);
      requestAnimationFrame(function(){ backdrop.classList.add('cs-show'); sheet.classList.add('cs-show'); });
      trigger.classList.add('cs-open');
      backdrop.addEventListener('click', close);
    }
    function open() {
      if (select.disabled) return;
      if (isMobile()) openMobile(); else openDesktop();
    }
    function close() {
      trigger.classList.remove('cs-open');
      document.removeEventListener('click', onOutside, true);
      if (panel) { panel.classList.remove('cs-show'); var p = panel; panel = null; setTimeout(function(){ p.remove(); }, 160); }
      if (sheet) { sheet.classList.remove('cs-show'); var s = sheet; sheet = null; setTimeout(function(){ s.remove(); }, 260); }
      if (backdrop) { backdrop.classList.remove('cs-show'); var b = backdrop; backdrop = null; setTimeout(function(){ b.remove(); }, 260); }
    }
    function onOutside(e) { if (!wrap.contains(e.target)) close(); }

    trigger.addEventListener('click', function(e){
      e.stopPropagation();
      if (panel || sheet) close(); else open();
    });

    // ถ้า option เปลี่ยนจากภายนอก (เช่น เพิ่มหมวดใหม่) → refresh label
    select.addEventListener('change', syncLabel);
    // observer เผื่อ option ถูกเพิ่ม
    if (window.MutationObserver) {
      new MutationObserver(syncLabel).observe(select, { childList: true });
    }
  }

  function initAll(root) {
    injectCSS();
    (root || document).querySelectorAll('select[data-custom]').forEach(build);
    startGlobalObserver();
  }

  // จับ <select data-custom> ที่ถูก render ทีหลัง (modal/section) → enhance อัตโนมัติ
  var _globalObs = false;
  function startGlobalObserver() {
    if (_globalObs || !window.MutationObserver || !document.body) return;
    _globalObs = true;
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes && m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.matches && node.matches('select[data-custom]')) build(node);
          if (node.querySelectorAll) node.querySelectorAll('select[data-custom]').forEach(build);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  // เปิดให้เรียกซ้ำได้ (หลัง render modal/หน้าใหม่)
  window.CustomSelect = { init: initAll };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ initAll(); });
  } else {
    initAll();
  }
})();
