/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Canvas Preview V12
   js/canvas-preview.js

   - 6 template built-in (Classic/Minimal/Dark/Warm/Cool/Cute)
   - Custom frame PNG ที่ร้านอัปโหลดเอง (Firestore: templates)
   - ชิปที่ 7 "เพิ่มเติม" → แจ้งติดต่อ LINE สำหรับแบบอื่นๆ
   - แสดงเฉพาะสินค้าที่ร้านเปิด hasPreview
═══════════════════════════════════════════════ */
'use strict';

window.CanvasPreview = (function(){

  // ─── Built-in templates ───
  const TEMPLATES = [
    { id:'classic', name:'Classic', emoji:'📸', bgColor:'#FFFFFF',
      border:{ color:'#FFFFFF', width:12, shadow:'rgba(0,0,0,0.15)' },
      caption:{ show:true, height:40, bg:'#FFFFFF', textColor:'#333', fontSize:13 },
      filter:'none', description:'ขอบขาวคลาสสิก สไตล์โพลารอยด์แท้' },
    { id:'minimal', name:'Minimal', emoji:'🌸', bgColor:'#F8F4F0',
      border:{ color:'#F0EBE3', width:10, shadow:'rgba(0,0,0,0.08)' },
      caption:{ show:true, height:36, bg:'#F8F4F0', textColor:'#666', fontSize:12 },
      filter:'saturate(0.85) brightness(1.05)', description:'เรียบง่าย สีครีม นุ่มนวล' },
    { id:'dark', name:'Dark', emoji:'🌙', bgColor:'#1A1A2E',
      border:{ color:'#2D2D44', width:12, shadow:'rgba(0,0,0,0.4)' },
      caption:{ show:true, height:40, bg:'#1A1A2E', textColor:'#CCC', fontSize:13 },
      filter:'brightness(0.88) contrast(1.15)', description:'ขอบดำ สไตล์มืด เท่' },
    { id:'warm', name:'Warm', emoji:'☀️', bgColor:'#FFF8F0',
      border:{ color:'#FFE8CC', width:12, shadow:'rgba(245,158,11,0.15)' },
      caption:{ show:true, height:38, bg:'#FFF8F0', textColor:'#8B4513', fontSize:13 },
      filter:'sepia(0.25) saturate(1.2) brightness(1.05)', description:'โทนอบอุ่น สีส้มทอง วินเทจ' },
    { id:'cool', name:'Cool', emoji:'❄️', bgColor:'#F0F8FF',
      border:{ color:'#D0E8FF', width:12, shadow:'rgba(14,165,233,0.15)' },
      caption:{ show:true, height:38, bg:'#F0F8FF', textColor:'#0369A1', fontSize:13 },
      filter:'hue-rotate(15deg) saturate(1.1)', description:'โทนเย็น สีฟ้า สดชื่น' },
    { id:'cute', name:'Cute', emoji:'🎀', bgColor:'#FFF0F5',
      border:{ color:'#FFD6E7', width:14, shadow:'rgba(236,72,153,0.15)' },
      caption:{ show:true, height:42, bg:'#FFF0F5', textColor:'#BE185D', fontSize:13 },
      filter:'saturate(1.3) brightness(1.06)', description:'โทนชมพู น่ารัก หวาน' },
  ];

  // ─── Custom frames (โหลดครั้งเดียวต่อหน้า) ───
  let _customFramesPromise = null;
  function loadCustomFrames() {
    if (_customFramesPromise) return _customFramesPromise;
    _customFramesPromise = (async () => {
      try {
        const db   = await DMC.getFirebaseReady();
        const snap = await db.collection('templates').where('active', '==', true).get();
        const frames = [];
        snap.forEach(doc => {
          const t = doc.data();
          if (t.frameUrl) frames.push({ id: doc.id, name: t.name || 'Custom', frameUrl: t.frameUrl, custom: true });
        });
        return frames;
      } catch (e) {
        console.warn('Custom templates load failed:', e.message);
        return [];
      }
    })();
    return _customFramesPromise;
  }

  // ─── สร้าง instance ต่อ 1 canvas ───
  function create(canvasId, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx  = canvas.getContext('2d');
    const size = options.size || { w: 280, h: 390 };
    canvas.width  = size.w;
    canvas.height = size.h;

    let userImage    = null;
    let currentTpl   = TEMPLATES[0];   // built-in object หรือ {custom:true, frameImg}
    let captionText  = '';

    function drawPlaceholder() {
      ctx.fillStyle = '#F0F4FA';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('📸', canvas.width/2, canvas.height/2 - 18);
      ctx.font = '13px sans-serif';
      ctx.fillText('อัปโหลดรูปเพื่อดูตัวอย่าง', canvas.width/2, canvas.height/2 + 26);
    }

    function loadImage(file) {
      return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) { reject(new Error('ไฟล์ต้องเป็นรูปภาพ (JPG, PNG)')); return; }
        if (file.size > 10 * 1024 * 1024) { reject(new Error('ไฟล์ใหญ่เกิน 10MB')); return; }
        const reader = new FileReader();
        reader.onload = e => {
          const img = new Image();
          img.onload  = () => { userImage = img; render(); resolve(img); };
          img.onerror = () => reject(new Error('โหลดรูปไม่สำเร็จ'));
          img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'));
        reader.readAsDataURL(file);
      });
    }

    function selectBuiltin(tplId) {
      currentTpl = TEMPLATES.find(t => t.id === tplId) || TEMPLATES[0];
      render();
    }

    function selectCustomFrame(frame) {
      // โหลดรูปกรอบก่อน แล้วค่อย render
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = () => { currentTpl = { custom: true, frameImg: img, name: frame.name }; render(); };
      img.onerror = () => { if (typeof DMC !== 'undefined') DMC.toast('โหลดกรอบไม่สำเร็จ', 'error'); };
      img.src = frame.frameUrl;
    }

    function setCaption(text) { captionText = text; render(); }

    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!userImage) { drawPlaceholder(); return; }

      if (currentTpl.custom) { renderCustomFrame(); return; }

      const t      = currentTpl;
      const border = t.border.width;
      const capH   = t.caption.show ? t.caption.height : 0;
      const area   = { x: border, y: border, w: canvas.width - border*2, h: canvas.height - border*2 - capH };

      // พื้นหลัง + เงา
      ctx.fillStyle = t.bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.shadowColor = t.border.shadow;
      ctx.shadowBlur = 12; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 3;
      ctx.fillStyle = t.border.color;
      ctx.fillRect(border/2, border/2, canvas.width - border, canvas.height - border);
      ctx.restore();

      // รูปลูกค้า (cover fit) + filter
      ctx.save();
      ctx.filter = t.filter || 'none';
      drawCover(userImage, area);
      ctx.restore();

      // แถบ caption
      if (t.caption.show) {
        ctx.fillStyle = t.caption.bg;
        ctx.fillRect(border, canvas.height - capH - border/2, canvas.width - border*2, capH + border/2);
        ctx.fillStyle = t.caption.textColor;
        ctx.font = t.caption.fontSize + "px 'Kanit', sans-serif";
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(captionText || '💎 Diamond Cute Studio', canvas.width/2, canvas.height - capH/2 - border/4);
      }
    }

    function renderCustomFrame() {
      // รูปลูกค้าเต็มผืน → ทับด้วยกรอบ PNG (กลางโปร่งใส)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawCover(userImage, { x: 0, y: 0, w: canvas.width, h: canvas.height });
      if (currentTpl.frameImg) {
        ctx.drawImage(currentTpl.frameImg, 0, 0, canvas.width, canvas.height);
      }
      // caption บนกรอบ custom (ถ้ามีข้อความ)
      if (captionText) {
        ctx.save();
        ctx.font = "13px 'Kanit', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,.92)';
        ctx.strokeStyle = 'rgba(0,0,0,.45)';
        ctx.lineWidth = 3; ctx.lineJoin = 'round';
        ctx.strokeText(captionText, canvas.width/2, canvas.height - 14);
        ctx.fillText(captionText, canvas.width/2, canvas.height - 14);
        ctx.restore();
      }
    }

    function drawCover(img, area) {
      const scale = Math.max(area.w / img.width, area.h / img.height);
      const sw = img.width * scale, sh = img.height * scale;
      ctx.save();
      ctx.beginPath();
      ctx.rect(area.x, area.y, area.w, area.h);
      ctx.clip();
      ctx.drawImage(img, area.x + (area.w - sw)/2, area.y + (area.h - sh)/2, sw, sh);
      ctx.restore();
    }

    function download(filename) {
      if (!userImage) return;
      // V.fix(C1): กรอบ custom ที่โฮสต์ไม่ส่ง CORS ทำให้ canvas tainted → toDataURL โยน SecurityError
      let dataUrl;
      try { dataUrl = canvas.toDataURL('image/jpeg', 0.92); }
      catch (e) {
        if (typeof DMC !== 'undefined') DMC.toast('บันทึกภาพไม่ได้ (กรอบนี้มีข้อจำกัดด้านลิขสิทธิ์รูป) — ลองแบบอื่น หรือแคปหน้าจอแทนได้ครับ', 'error', 4500);
        return;
      }
      const link = document.createElement('a');
      link.download = filename || 'preview-diamond-cute-studio.jpg';
      link.href = dataUrl;
      link.click();
    }

    drawPlaceholder();
    return { loadImage, selectBuiltin, selectCustomFrame, setCaption, render, download,
             hasImage: () => !!userImage,
             // V2: ดึงรูป composition เป็น Blob เพื่ออัปแนบออเดอร์
             getBlob: (cb) => { try { canvas.toBlob(b => cb(b), 'image/jpeg', 0.92); } catch(e){ cb(null); } } };
  }

  return { create, loadCustomFrames, TEMPLATES };
})();

// ═══════════════════════════════════════════════
//  PREVIEW TOOL UI (ฝังในหน้าสินค้า)
//  options: { containerId, size, templates: [ชื่อ/ไอดี built-in ที่อนุญาต], lineUrl }
// ═══════════════════════════════════════════════
window.initPreviewTool = async function(options = {}) {
  const containerEl = document.getElementById(options.containerId || 'preview-tool-container');
  if (!containerEl) return;

  const allowed = (options.templates && options.templates.length)
    ? options.templates.map(t => String(t).trim().toLowerCase())
    : null;

  containerEl.innerHTML = [
    '<div class="preview-tool-inner">',
      '<div class="preview-howto">💡 <strong>วิธีใช้:</strong> อัปโหลดรูปของคุณ → เลือกแบบ → เห็นตัวอย่างจริงทันที → กด 💾 บันทึกภาพได้</div>',
      '<div style="position:relative;text-align:center;margin-bottom:.9rem">',
        '<canvas id="preview-canvas" style="border-radius:var(--r-xl);border:1.5px solid var(--border);box-shadow:var(--shadow-card);max-width:100%;height:auto;cursor:pointer;display:block;margin:0 auto" title="คลิกเพื่ออัปโหลดรูป"></canvas>',
        '<div id="preview-upload-hint" class="preview-hint">📌 คลิกที่รูป หรือกดปุ่มด้านล่างเพื่ออัปโหลด</div>',
      '</div>',
      '<div style="display:flex;gap:.5rem;margin-bottom:.9rem">',
        '<label class="btn btn-secondary btn-md" style="flex:1;border-radius:var(--r-lg);cursor:pointer;justify-content:center">📤 เลือกรูปจากเครื่อง<input type="file" id="preview-file-input" accept="image/*" style="display:none"></label>',
        '<button class="btn btn-ghost btn-md" id="preview-download-btn" style="border-radius:var(--r-lg)" title="บันทึกภาพตัวอย่าง" disabled>💾</button>',
      '</div>',
      // V2: ปุ่มแนบแบบที่ออกแบบเข้าออเดอร์โดยตรง (จุดต่างจากร้านอื่น)
      '<button class="btn btn-primary btn-md btn-block" id="preview-attach-btn" style="margin-bottom:.9rem" disabled>📎 ใช้แบบนี้ในออเดอร์</button>',
      '<div style="margin-bottom:.9rem"><input class="form-input" id="preview-caption" placeholder="ข้อความใต้รูป (ไม่บังคับ) เช่น Happy Birthday 🎂" style="font-size:.85rem"></div>',
      '<div>',
        '<div class="preview-tpl-label">🎨 เลือกแบบ</div>',
        '<div class="template-scroll" id="template-chips-row"></div>',
      '</div>',
    '</div>'
  ].join('');

  const api = CanvasPreview.create('preview-canvas', { size: options.size });
  if (!api) return;

  const row = document.getElementById('template-chips-row');

  function addChip(label, emojiOrImg, onClick, isImg) {
    const chip = document.createElement('div');
    chip.className = 'template-chip';
    const icon = document.createElement('span');
    icon.className = 'template-chip-icon';
    if (isImg) {
      const im = document.createElement('img');
      im.src = emojiOrImg;
      im.alt = label;
      im.style.cssText = 'width:26px;height:26px;object-fit:contain;border-radius:4px';
      icon.appendChild(im);
    } else {
      icon.textContent = emojiOrImg;
    }
    const name = document.createElement('span');
    name.className = 'template-chip-name';
    name.textContent = label;
    chip.appendChild(icon);
    chip.appendChild(name);
    chip.addEventListener('click', () => {
      row.querySelectorAll('.template-chip').forEach(x => x.classList.remove('active'));
      chip.classList.add('active');
      onClick();
    });
    row.appendChild(chip);
    return chip;
  }

  // 1) Built-in templates (กรองตามที่สินค้ากำหนด)
  const builtins = allowed
    ? CanvasPreview.TEMPLATES.filter(t => allowed.includes(t.id) || allowed.includes(t.name.toLowerCase()))
    : CanvasPreview.TEMPLATES;
  const list = builtins.length ? builtins : CanvasPreview.TEMPLATES;
  let firstChip = null;
  list.forEach(t => {
    const chip = addChip(t.name, t.emoji, () => api.selectBuiltin(t.id));
    chip.title = t.description;
    if (!firstChip) firstChip = chip;
  });
  if (firstChip) firstChip.classList.add('active');

  // 2) Custom frames จากร้าน (กรองตามชื่อ/ไอดีถ้าสินค้ากำหนด)
  try {
    const frames = await CanvasPreview.loadCustomFrames();
    frames.forEach(f => {
      if (allowed && !allowed.includes(f.id.toLowerCase()) && !allowed.includes((f.name||'').toLowerCase())) return;
      addChip(f.name, f.frameUrl, () => api.selectCustomFrame(f), true);
    });
  } catch (e) { /* ไม่มี custom frames ก็ข้าม */ }

  // 3) ชิปที่ 7 — "เพิ่มเติม" → ติดต่อ LINE
  const moreChip = addChip('เพิ่มเติม…', '✨', () => {
    const hint = document.getElementById('preview-upload-hint');
    if (hint) hint.innerHTML = '💬 ร้านมีแบบมากกว่านี้! <a href="' + (options.lineUrl || '#') + '" target="_blank" rel="noopener" style="color:var(--accent);font-weight:700">ทักไลน์เพื่อดูแบบเพิ่มเติม →</a>';
    if (typeof DMC !== 'undefined') DMC.toast('ทักไลน์ร้านเพื่อดูแบบเพิ่มเติมได้เลยครับ 💬', 'info');
  });
  moreChip.classList.add('template-chip-more');
  moreChip.title = 'ติดต่อ LINE เพื่อดูแบบอื่นๆ นอกเหนือจากในเว็บ';

  // ─── Upload / drag-drop / caption / download ───
  const fileInput = document.getElementById('preview-file-input');
  const dlBtn     = document.getElementById('preview-download-btn');
  const attachBtn = document.getElementById('preview-attach-btn');   // V2
  const canvasEl  = document.getElementById('preview-canvas');
  const hintEl    = document.getElementById('preview-upload-hint');

  async function handleFile(file) {
    try {
      await api.loadImage(file);
      dlBtn.disabled = false;
      if (attachBtn) attachBtn.disabled = false;                     // V2
      hintEl.textContent = '✅ อัปโหลดแล้ว — ลองกดเปลี่ยนแบบด้านล่างได้เลย';
    } catch (e) {
      DMC.toast(e.message || 'โหลดรูปไม่สำเร็จ', 'error');
    }
  }

  fileInput?.addEventListener('change', () => { if (fileInput.files[0]) handleFile(fileInput.files[0]); });
  canvasEl?.addEventListener('click', () => fileInput?.click());
  canvasEl?.addEventListener('dragover', e => { e.preventDefault(); canvasEl.style.opacity = '.7'; });
  canvasEl?.addEventListener('dragleave', () => { canvasEl.style.opacity = ''; });
  canvasEl?.addEventListener('drop', e => {
    e.preventDefault(); canvasEl.style.opacity = '';
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  dlBtn?.addEventListener('click', () => api.download());
  document.getElementById('preview-caption')?.addEventListener('input', e => api.setCaption(e.target.value));

  // ─── V2: แนบแบบที่ออกแบบเข้าออเดอร์ ───
  attachBtn?.addEventListener('click', () => {
    if (!api.hasImage()) { DMC.toast('กรุณาอัปโหลดรูปก่อนครับ', 'warning'); return; }
    const original = attachBtn.innerHTML;
    attachBtn.disabled = true;
    attachBtn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> กำลังแนบ...';
    api.getBlob(async (blob) => {
      try {
        if (!blob) throw new Error('no blob');
        const f = new File([blob], 'design-' + Date.now() + '.jpg', { type: 'image/jpeg' });
        const up = await DMC.uploadToImgBB(f);
        if (!up || !up.url) throw new Error('upload failed');
        // เก็บลง localStorage เพื่อส่งต่อไปหน้าตะกร้า/ชำระเงิน
        let designs = [];
        try { designs = JSON.parse(localStorage.getItem('dmc_pending_designs') || '[]'); } catch(e){}
        designs.push({ productId: options.productId || '', name: options.productName || 'แบบที่ออกแบบ', url: up.url, at: Date.now() });
        localStorage.setItem('dmc_pending_designs', JSON.stringify(designs));
        attachBtn.innerHTML = '✅ แนบเข้าออเดอร์แล้ว';
        DMC.toast('แนบแบบเข้าออเดอร์แล้ว — จะแสดงในหน้าสั่งซื้อ 🛒', 'success', 4000);
        setTimeout(() => { attachBtn.innerHTML = original; attachBtn.disabled = false; }, 2200);
      } catch (e) {
        console.warn('attach design failed', e);
        attachBtn.innerHTML = original; attachBtn.disabled = false;
        DMC.toast('แนบแบบไม่สำเร็จ ลองใหม่ หรือส่งรูปทาง LINE ได้ครับ', 'error', 4500);
      }
    });
  });
};
