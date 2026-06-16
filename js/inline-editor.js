/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Inline Editor V17
   js/inline-editor.js

   - ตรวจว่า "แอดมิน login อยู่" (Firebase Auth หรือ session) ไหม
   - ถ้าใช่ + อยู่หน้าบ้าน → แสดงแถบโหมดแอดมิน + ไอคอนดินสอตรงข้อความที่แก้ได้
   - มาร์คจุดแก้ด้วย data-edit="path.to.field" (path ใน siteContent/main)
   - กดดินสอ → แก้ inline → บันทึกเข้า Firestore ทันที (เฉพาะแอดมินจริง)
   - ?edit=1 ใน URL = เปิดโหมดแก้ทันที (ปุ่มจากหลังบ้านส่งมา)
═══════════════════════════════════════════════ */
(function(){
  'use strict';

  // ไม่ทำงานในหน้า admin เอง
  if (location.pathname.toLowerCase().indexOf('admin') !== -1) return;

  var isAdmin = false;
  var db = null;
  var editMode = false;

  // ─── ตรวจสิทธิ์แอดมิน (Firebase Auth ก่อน → session สำรอง) ───
  function checkAdmin() {
    return new Promise(function(resolve){
      var adminEmail = ((window.DMC_CONFIG || {}).ADMIN_EMAIL || '').trim().toLowerCase();

      // มี Firebase Auth ตั้งไว้
      if (adminEmail && typeof DMC !== 'undefined' && DMC.getFirebaseReady) {
        DMC.getFirebaseReady().then(function(_db){
          db = _db;
          if (!window.firebase || !firebase.auth) { resolve(sessionFallback()); return; }
          var unsub = firebase.auth().onAuthStateChanged(function(user){
            unsub();
            resolve(!!(user && (user.email || '').toLowerCase() === adminEmail));
          });
          setTimeout(function(){ resolve(false); }, 4000);
        }).catch(function(){ resolve(sessionFallback()); });
      } else {
        // ไม่ได้ตั้ง Auth → ใช้ session แบบเดิม
        if (typeof DMC !== 'undefined' && DMC.getFirebaseReady) {
          DMC.getFirebaseReady().then(function(_db){ db = _db; resolve(sessionFallback()); })
                                .catch(function(){ resolve(sessionFallback()); });
        } else resolve(sessionFallback());
      }
    });
  }
  function sessionFallback() {
    try { return typeof DMC !== 'undefined' && DMC.isAdminAuthenticated && DMC.isAdminAuthenticated(); }
    catch(e) { return false; }
  }

  // ─── helper: อ่าน/เขียน nested path ("pages.about.title") ───
  function getPath(obj, path) {
    return path.split('.').reduce(function(o, k){ return (o && o[k] !== undefined) ? o[k] : undefined; }, obj);
  }

  function injectCSS() {
    if (document.getElementById('inline-editor-style')) return;
    var css = ''
      // แถบโหมดแอดมิน
      + '#admin-mode-bar{position:fixed;top:0;left:0;right:0;z-index:10000;'
      +   'background:linear-gradient(135deg,var(--accent,#7c5cff),#6384ff);color:#fff;'
      +   'display:flex;align-items:center;gap:.75rem;padding:.5rem 1rem;'
      +   'box-shadow:0 2px 12px rgba(0,0,0,.18);font-family:var(--font-display,sans-serif)}'
      + '#admin-mode-bar .amb-icon{font-size:1.1rem}'
      + '#admin-mode-bar .amb-text{flex:1;font-weight:700;font-size:.86rem;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + '#admin-mode-bar .amb-btn{border:none;border-radius:var(--r-pill,999px);padding:.4rem .85rem;'
      +   'font-family:inherit;font-weight:700;font-size:.78rem;cursor:pointer;white-space:nowrap;transition:all .15s}'
      + '#admin-mode-bar .amb-edit{background:rgba(255,255,255,.22);color:#fff}'
      + '#admin-mode-bar .amb-edit.on{background:#fff;color:var(--accent,#7c5cff)}'
      + '#admin-mode-bar .amb-edit:hover{background:rgba(255,255,255,.35)}'
      + '#admin-mode-bar .amb-edit.on:hover{background:#f0f0ff}'
      + '#admin-mode-bar .amb-back{background:rgba(255,255,255,.18);color:#fff}'
      + '#admin-mode-bar .amb-back:hover{background:rgba(255,255,255,.3)}'
      + '#admin-mode-bar .amb-exit{background:#fff;color:var(--accent,#7c5cff)}'
      + '#admin-mode-bar .amb-exit:hover{opacity:.88}'
      + 'body.has-admin-bar{padding-top:48px}'
      // ดินสอ
      + '.edit-pencil{display:none;align-items:center;justify-content:center;'
      +   'width:30px;height:30px;border-radius:8px;background:var(--accent,#7c5cff);color:#fff;'
      +   'border:none;cursor:pointer;font-size:.85rem;vertical-align:middle;margin-left:.4rem;'
      +   'box-shadow:0 2px 6px rgba(124,92,255,.35);transition:transform .15s;flex-shrink:0;padding:0}'
      + '.edit-pencil:hover{transform:scale(1.12)}'
      + 'body.edit-mode-on .edit-pencil{display:inline-flex}'
      + 'body.edit-mode-on [data-edit]{outline:2px dashed rgba(124,92,255,.4);outline-offset:3px;border-radius:4px;transition:outline .15s}'
      + 'body.edit-mode-on [data-edit]:hover{outline-color:var(--accent,#7c5cff);background:rgba(124,92,255,.04)}'
      // modal แก้ไข
      + '#edit-modal-overlay{position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,.5);'
      +   'backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;padding:1rem}'
      + '#edit-modal-overlay.show{display:flex}'
      + '.edit-modal{background:var(--bg-card,#fff);border-radius:var(--r-2xl,18px);'
      +   'width:min(94vw,520px);max-height:88vh;overflow-y:auto;padding:1.5rem;'
      +   'box-shadow:0 20px 60px rgba(0,0,0,.3)}'
      + '.edit-modal h3{font-family:var(--font-display,sans-serif);font-weight:800;font-size:1.1rem;'
      +   'margin-bottom:.3rem;color:var(--text-1,#222)}'
      + '.edit-modal .em-hint{font-size:.8rem;color:var(--text-3,#888);margin-bottom:1rem}'
      + '.edit-modal textarea,.edit-modal input{width:100%;box-sizing:border-box;padding:.8rem;'
      +   'border:1.5px solid var(--border,#e5e5ec);border-radius:var(--r-md,10px);'
      +   'font-family:inherit;font-size:.95rem;color:var(--text-1,#222);background:var(--bg,#fff);resize:vertical}'
      + '.edit-modal textarea:focus,.edit-modal input:focus{outline:none;border-color:var(--accent,#7c5cff)}'
      + '.edit-modal .em-actions{display:flex;gap:.6rem;margin-top:1.2rem}'
      + '.edit-modal .em-btn{flex:1;padding:.75rem;border:none;border-radius:var(--r-md,10px);'
      +   'font-family:var(--font-display,sans-serif);font-weight:700;font-size:.9rem;cursor:pointer;transition:all .15s}'
      + '.edit-modal .em-save{background:var(--accent,#7c5cff);color:#fff}'
      + '.edit-modal .em-save:hover{opacity:.9}'
      + '.edit-modal .em-save:disabled{opacity:.6;cursor:default}'
      + '.edit-modal .em-cancel{background:var(--bg-mid,#f0f0f4);color:var(--text-2,#555)}'
      + '.edit-modal .em-cancel:hover{background:var(--border,#e0e0e8)}';
    var st = document.createElement('style');
    st.id = 'inline-editor-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  // ─── แถบโหมดแอดมิน ───
  function renderBar() {
    if (document.getElementById('admin-mode-bar')) return;
    var bar = document.createElement('div');
    bar.id = 'admin-mode-bar';
    bar.innerHTML =
      '<span class="amb-icon">🛠️</span>'
      + '<span class="amb-text">คุณอยู่ในโหมดแอดมิน</span>'
      + '<button class="amb-btn amb-edit" id="amb-edit-btn">✏️ แก้เนื้อหา</button>'
      + '<button class="amb-btn amb-back" id="amb-back-btn">🗄️ ไปหลังบ้าน</button>'
      + '<button class="amb-btn amb-exit" id="amb-exit-btn">ออกจากโหมด</button>';
    document.body.appendChild(bar);
    document.body.classList.add('has-admin-bar');

    // ดัน navbar (fixed) + เนื้อหา + drawer ลงให้พ้นแถบโหมดแอดมิน (วัดความสูงจริง — รองรับปุ่มขึ้น 2 บรรทัด)
    function applyAdminBarOffset() {
      var h = bar.offsetHeight;
      var navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 60;
      document.body.style.paddingTop = h + 'px';
      var nav = document.getElementById('main-nav'); if (nav) nav.style.top = h + 'px';
      var dr = document.getElementById('mobile-drawer'); if (dr) dr.style.top = (h + navH) + 'px';
    }
    applyAdminBarOffset();
    window.addEventListener('resize', applyAdminBarOffset, { passive: true });
    setTimeout(applyAdminBarOffset, 300);

    document.getElementById('amb-edit-btn').addEventListener('click', toggleEdit);
    document.getElementById('amb-back-btn').addEventListener('click', function(){
      location.href = 'admin.html';
    });
    document.getElementById('amb-exit-btn').addEventListener('click', function(){
      // ออกจากโหมดแอดมิน = ดูเว็บแบบลูกค้า (ไม่ logout จริง)
      try { sessionStorage.setItem('dmc_hide_admin_bar', '1'); } catch(e) {}
      location.reload();
    });
  }

  function toggleEdit() {
    editMode = !editMode;
    document.body.classList.toggle('edit-mode-on', editMode);
    var btn = document.getElementById('amb-edit-btn');
    if (btn) {
      btn.classList.toggle('on', editMode);
      btn.textContent = editMode ? '✓ กำลังแก้ไข' : '✏️ แก้เนื้อหา';
    }
    if (editMode) attachPencils();
  }

  // ─── ติดดินสอให้ทุก [data-edit] ───
  function attachPencils() {
    document.querySelectorAll('[data-edit]').forEach(function(el){
      if (el.dataset.pencilDone) return;
      el.dataset.pencilDone = '1';
      var pencil = document.createElement('button');
      pencil.className = 'edit-pencil';
      pencil.type = 'button';
      pencil.innerHTML = '✏️';
      pencil.title = 'แก้ไขข้อความนี้';
      pencil.addEventListener('click', function(e){
        e.preventDefault(); e.stopPropagation();
        openEditModal(el);
      });
      // วางดินสอหลัง element (inline) — ถ้าเป็น block ใส่ข้างใน
      if (el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3' || el.tagName === 'P' || el.tagName === 'SPAN') {
        el.appendChild(pencil);
      } else {
        el.style.position = el.style.position || 'relative';
        el.appendChild(pencil);
      }
    });
  }

  // ─── modal แก้ไข ───
  function openEditModal(el) {
    var path = el.dataset.edit;
    var label = el.dataset.editLabel || 'ข้อความ';
    var multiline = el.dataset.editMultiline === '1';
    // ค่าปัจจุบัน = textContent (ตัดดินสอออก)
    var clone = el.cloneNode(true);
    var p = clone.querySelector('.edit-pencil'); if (p) p.remove();
    var current = clone.textContent.trim();

    var overlay = document.getElementById('edit-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'edit-modal-overlay';
      document.body.appendChild(overlay);
    }
    overlay.innerHTML =
      '<div class="edit-modal">'
      + '<h3>✏️ แก้ไข: ' + label + '</h3>'
      + '<div class="em-hint">บันทึกแล้วจะแสดงผลทันทีบนเว็บจริง</div>'
      + (multiline
          ? '<textarea id="em-input" rows="4">' + escapeHtml(current) + '</textarea>'
          : '<input type="text" id="em-input" value="' + escapeAttr(current) + '">')
      + '<div class="em-actions">'
      +   '<button class="em-btn em-cancel" id="em-cancel">ยกเลิก</button>'
      +   '<button class="em-btn em-save" id="em-save">💾 บันทึก</button>'
      + '</div></div>';
    overlay.classList.add('show');

    var input = document.getElementById('em-input');
    input.focus();
    document.getElementById('em-cancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', function(e){ if (e.target === overlay) closeModal(); });

    document.getElementById('em-save').addEventListener('click', function(){
      var btn = this;
      var newVal = input.value.trim();
      if (newVal === current) { closeModal(); return; }
      btn.disabled = true; btn.textContent = '⏳ กำลังบันทึก...';
      saveField(path, newVal).then(function(){
        // อัปเดตหน้าทันที (คงดินสอไว้)
        var pen = el.querySelector('.edit-pencil');
        el.textContent = newVal;
        if (pen) el.appendChild(pen);
        if (typeof DMC !== 'undefined' && DMC.toast) DMC.toast('บันทึกแล้ว ✅', 'success');
        // ล้าง cache CMS ให้หน้าอื่นเห็นค่าใหม่
        try { if (typeof CMS !== 'undefined' && CMS.clearCache) CMS.clearCache(); } catch(e) {}
        closeModal();
      }).catch(function(err){
        btn.disabled = false; btn.textContent = '💾 บันทึก';
        if (typeof DMC !== 'undefined' && DMC.toast) DMC.toast('บันทึกไม่สำเร็จ: ' + err.message, 'error');
      });
    });
  }

  function closeModal() {
    var overlay = document.getElementById('edit-modal-overlay');
    if (overlay) overlay.classList.remove('show');
  }

  // ─── บันทึก field เข้า Firestore (merge nested) ───
  function saveField(path, value) {
    if (!db) return Promise.reject(new Error('ยังไม่ได้เชื่อมต่อฐานข้อมูล'));
    // สร้าง object ซ้อนตาม path: "pages.about.title" → {pages:{about:{title:value}}}
    var update = {};
    var parts = path.split('.');
    var cur = update;
    for (var i = 0; i < parts.length - 1; i++) { cur[parts[i]] = {}; cur = cur[parts[i]]; }
    cur[parts[parts.length - 1]] = value;
    return db.collection('siteContent').doc('main').set(update, { merge: true });
  }

  function escapeHtml(s){ var d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
  function escapeAttr(s){ return String(s).replace(/"/g,'&quot;'); }

  // ─── apply ค่า CMS ลง [data-edit] ตอนโหลด (ให้หน้าแสดงค่าจริง) ───
  function applyContent() {
    if (typeof CMS === 'undefined') return;
    CMS.get().then(function(content){
      document.querySelectorAll('[data-edit]').forEach(function(el){
        var val = getPath(content, el.dataset.edit);
        if (val !== undefined && val !== null && val !== '') {
          var pen = el.querySelector('.edit-pencil');
          el.textContent = val;
          if (pen) el.appendChild(pen);
        }
      });
    }).catch(function(){});
  }

  // ─── boot ───
  function boot() {
    applyContent();  // แสดงค่าจาก CMS เสมอ (ทุกคนเห็น)

    // ซ่อนแถบถ้าผู้ใช้กด "ออกจากโหมด" ไว้ (ดูแบบลูกค้า)
    try { if (sessionStorage.getItem('dmc_hide_admin_bar') === '1') return; } catch(e) {}

    checkAdmin().then(function(ok){
      isAdmin = ok;
      if (!isAdmin) return;
      injectCSS();
      renderBar();
      // ?edit=1 → เปิดโหมดแก้ทันที (มาจากปุ่มในหลังบ้าน)
      var params = new URLSearchParams(location.search);
      if (params.get('edit') === '1') setTimeout(toggleEdit, 300);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
