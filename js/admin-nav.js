/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Admin Bottom Nav V16
   js/admin-nav.js
   แถบล่างเฉพาะหลังบ้าน (มือถือ) — สลับ section ได้เร็ว
   ใช้ data-section เดียวกับ sidebar เดิม → กดแล้ว trigger คลิก sidebar
═══════════════════════════════════════════════ */
(function(){
  'use strict';
  // เฉพาะหน้า dashboard
  if (!document.getElementById('admin-dashboard')) return;

  var NAV = [
    { sec:'overview', icon:'📊', label:'ภาพรวม' },
    { sec:'orders',   icon:'📦', label:'ออเดอร์' },
    { sec:'products', icon:'🛍️', label:'สินค้า' },
    { sec:'content',  icon:'📝', label:'เนื้อหา' },
    { sec:'settings', icon:'⚙️', label:'ตั้งค่า' },
  ];

  function injectCSS() {
    if (document.getElementById('admin-nav-style')) return;
    var css = ''
      + '#admin-bottom-nav{display:none}'
      + '@media(max-width:860px){'
      +   '#admin-bottom-nav{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:9000;box-sizing:border-box;'
      +     'background:var(--bg-card);border-top:1px solid var(--border);'
      +     'box-shadow:0 -3px 16px rgba(0,0,0,.08);padding:.3rem .2rem calc(.3rem + env(safe-area-inset-bottom,0))}'
      +   '.abn-item{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;gap:2px;'
      +     'padding:.35rem .1rem;border:none;background:transparent;cursor:pointer;color:var(--text-3);'
      +     'transition:color .15s;box-sizing:border-box}'
      +   '.abn-item .ic{font-size:1.2rem;line-height:1;transition:transform .15s}'
      +   '.abn-item .lb{font-size:.62rem;font-family:var(--font-display,sans-serif);font-weight:600;'
      +     'max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      +   '.abn-item.active{color:var(--accent)}'
      +   '.abn-item.active .ic{transform:translateY(-2px) scale(1.1)}'
      +   '.abn-item.active::before{content:"";position:absolute;top:0;width:24px;height:3px;'
      +     'border-radius:0 0 3px 3px;background:var(--accent)}'
      +   '.admin-main{padding-bottom:70px !important}'
      + '}';
    var st = document.createElement('style');
    st.id = 'admin-nav-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function render() {
    if (document.getElementById('admin-bottom-nav')) return;
    var nav = document.createElement('nav');
    nav.id = 'admin-bottom-nav';
    nav.setAttribute('aria-label', 'เมนูหลังบ้าน');
    nav.innerHTML = NAV.map(function(n){
      return '<button class="abn-item" data-sec="' + n.sec + '">'
        + '<span class="ic">' + n.icon + '</span>'
        + '<span class="lb">' + n.label + '</span></button>';
    }).join('');
    document.body.appendChild(nav);

    nav.querySelectorAll('.abn-item').forEach(function(btn){
      btn.addEventListener('click', function(){
        var sec = btn.dataset.sec;
        // คลิก sidebar item เดิม (ใช้ logic switch section ที่มีอยู่)
        var side = document.querySelector('.sidebar-item[data-section="' + sec + '"]');
        if (side) side.click();
        syncActive(sec);
        // ปิด sidebar overlay ถ้าเปิดอยู่
        var sb = document.getElementById('admin-sidebar');
        var ov = document.getElementById('sidebar-overlay');
        if (sb) sb.classList.remove('open');
        if (ov) ov.classList.remove('show');
      });
    });
  }

  function syncActive(sec) {
    document.querySelectorAll('.abn-item').forEach(function(b){
      b.classList.toggle('active', b.dataset.sec === sec);
    });
  }

  function boot() {
    injectCSS();
    render();
    syncActive('overview');
    // sync เมื่อกด sidebar ปกติด้วย
    document.querySelectorAll('.sidebar-item[data-section]').forEach(function(item){
      item.addEventListener('click', function(){ syncActive(item.dataset.section); });
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
