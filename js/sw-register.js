/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — SW Register V13.1
   js/sw-register.js
   ลงทะเบียน Service Worker + แจ้งเตือนเมื่อมีเวอร์ชันใหม่
═══════════════════════════════════════════════ */
(function(){
  'use strict';

  // ไม่ลงทะเบียนในหน้า admin (ต้องการความสดเสมอ)
  if (location.pathname.toLowerCase().indexOf('admin') !== -1) return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', function(){
    navigator.serviceWorker.register('sw.js').then(function(reg){

      // ตรวจเวอร์ชันใหม่
      reg.addEventListener('updatefound', function(){
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', function(){
          // มีเวอร์ชันใหม่พร้อม และมี SW เดิมทำงานอยู่
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateToast(reg);
          }
        });
      });
    }).catch(function(){ /* SW ไม่รองรับ — เว็บทำงานปกติ */ });

    // เมื่อ SW ใหม่เข้าควบคุม → reload ครั้งเดียว
    var refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', function(){
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });

  function showUpdateToast(reg){
    if (document.getElementById('sw-update-toast')) return;
    var bar = document.createElement('div');
    bar.id = 'sw-update-toast';
    bar.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:80px;z-index:9997;'
      + 'background:#1f2937;color:#fff;padding:.7rem 1rem;border-radius:999px;'
      + 'box-shadow:0 6px 20px rgba(0,0,0,.25);display:flex;align-items:center;gap:.75rem;'
      + 'font-size:.85rem;font-family:var(--font-display,sans-serif);max-width:92vw';
    bar.innerHTML = '✨ มีเวอร์ชันใหม่'
      + '<button id="sw-update-btn" style="background:#06c755;color:#fff;border:none;border-radius:999px;'
      + 'padding:.35rem .9rem;font-weight:700;cursor:pointer;font-family:inherit">อัปเดต</button>';
    document.body.appendChild(bar);
    document.getElementById('sw-update-btn').addEventListener('click', function(){
      if (reg.waiting) reg.waiting.postMessage('SKIP_WAITING');
      bar.remove();
    });
    // ซ่อนเองใน 12 วิ ถ้าไม่กด
    setTimeout(function(){ if (bar.parentNode) bar.remove(); }, 12000);
  }
})();
