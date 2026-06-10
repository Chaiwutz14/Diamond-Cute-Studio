/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Canvas Preview V6
   js/canvas-preview.js
   
   ระบบ Preview Template แบบ Canvas จริง
   - ลูกค้าอัปโหลดรูป
   - เลือก Template Frame (PNG overlay)
   - เห็น preview จริงบน Canvas
   - ดาวน์โหลด preview ได้
═══════════════════════════════════════════════ */
'use strict';

window.CanvasPreview = (function(){

  // ─── Built-in template definitions ───
  // แต่ละ template มี: id, name, emoji, filter CSS, overlay (ถ้ามี URL), borderColor, bgColor
  const TEMPLATES = [
    {
      id: 'classic',
      name: 'Classic',
      emoji: '📸',
      bgColor: '#FFFFFF',
      border: { color:'#FFFFFF', width:12, shadow:'rgba(0,0,0,0.15)' },
      caption: { show:true, height:40, bg:'#FFFFFF', textColor:'#333', fontSize:13 },
      filter: 'none',
      description: 'ขอบขาวคลาสสิก สไตล์โพลารอยด์แท้'
    },
    {
      id: 'minimal',
      name: 'Minimal',
      emoji: '🌸',
      bgColor: '#F8F4F0',
      border: { color:'#F0EBE3', width:10, shadow:'rgba(0,0,0,0.08)' },
      caption: { show:true, height:36, bg:'#F8F4F0', textColor:'#666', fontSize:12 },
      filter: 'saturate(0.85) brightness(1.05)',
      description: 'เรียบง่าย สีครีม นุ่มนวล'
    },
    {
      id: 'dark',
      name: 'Dark',
      emoji: '🌙',
      bgColor: '#1A1A2E',
      border: { color:'#2D2D44', width:12, shadow:'rgba(0,0,0,0.4)' },
      caption: { show:true, height:40, bg:'#1A1A2E', textColor:'#CCC', fontSize:13 },
      filter: 'brightness(0.88) contrast(1.15)',
      description: 'ขอบดำ สไตล์มืด เท่'
    },
    {
      id: 'warm',
      name: 'Warm',
      emoji: '☀️',
      bgColor: '#FFF8F0',
      border: { color:'#FFE8CC', width:12, shadow:'rgba(245,158,11,0.15)' },
      caption: { show:true, height:38, bg:'#FFF8F0', textColor:'#8B4513', fontSize:13 },
      filter: 'sepia(0.25) saturate(1.2) brightness(1.05)',
      description: 'โทนอบอุ่น สีส้มทอง วินเทจ'
    },
    {
      id: 'cool',
      name: 'Cool',
      emoji: '❄️',
      bgColor: '#F0F8FF',
      border: { color:'#D0E8FF', width:12, shadow:'rgba(14,165,233,0.15)' },
      caption: { show:true, height:38, bg:'#F0F8FF', textColor:'#0369A1', fontSize:13 },
      filter: 'hue-rotate(15deg) saturate(1.1)',
      description: 'โทนเย็น สีฟ้า สดชื่น'
    },
    {
      id: 'cute',
      name: 'Cute',
      emoji: '🎀',
      bgColor: '#FFF0F5',
      border: { color:'#FFD6E7', width:14, shadow:'rgba(236,72,153,0.15)' },
      caption: { show:true, height:42, bg:'#FFF0F5', textColor:'#BE185D', fontSize:13 },
      filter: 'saturate(1.3) brightness(1.06)',
      description: 'โทนชมพู น่ารัก หวาน'
    },
  ];

  // ─── State ───
  let canvas, ctx;
  let userImage = null;
  let currentTemplate = TEMPLATES[0];
  let captionText = '';
  let canvasSize = { w: 300, h: 420 }; // default polaroid size

  // ─── Init ───
  function init(canvasId, options = {}) {
    canvas = document.getElementById(canvasId);
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvasSize = options.size || { w:300, h:420 };
    canvas.width  = canvasSize.w;
    canvas.height = canvasSize.h;
    drawPlaceholder();
    return { loadImage, selectTemplate, setCaptionText, render, download, getTemplates:()=>TEMPLATES };
  }

  // ─── Draw placeholder ───
  function drawPlaceholder() {
    ctx.fillStyle = '#F0F7FF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📸', canvas.width/2, canvas.height/2 - 20);
    ctx.font = '14px sans-serif';
    ctx.fillText('อัปโหลดรูปเพื่อดู Preview', canvas.width/2, canvas.height/2 + 30);
  }

  // ─── Load user image ───
  function loadImage(file) {
    return new Promise((resolve, reject) => {
      if (!file?.type.startsWith('image/')) { reject(new Error('ไฟล์ต้องเป็นรูปภาพเท่านั้น (JPG, PNG)')); return; }
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB
      if (file.size > MAX_SIZE) { reject(new Error('ไฟล์ขนาดใหญ่เกินไป (สูงสุด 10MB)')); return; }
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => { userImage = img; render(); resolve(img); };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // ─── Select template ───
  function selectTemplate(templateId) {
    currentTemplate = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
    render();
  }

  // ─── Set caption text ───
  function setCaptionText(text) {
    captionText = text;
    render();
  }

  // ─── Main render ───
  function render() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const t = currentTemplate;

    if (!userImage) { drawPlaceholder(); return; }

    const border  = t.border.width;
    const capH    = t.caption.show ? t.caption.height : 0;
    const imgArea = {
      x: border,
      y: border,
      w: canvas.width  - border * 2,
      h: canvas.height - border * 2 - capH
    };

    // 1. Background
    ctx.fillStyle = t.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Shadow
    ctx.save();
    ctx.shadowColor  = t.border.shadow;
    ctx.shadowBlur   = 12;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = t.border.color;
    ctx.fillRect(border/2, border/2, canvas.width - border, canvas.height - border);
    ctx.restore();

    // 3. Image with filter
    ctx.save();
    ctx.filter = t.filter || 'none';
    
    // Cover-fit image
    const scale = Math.max(imgArea.w / userImage.width, imgArea.h / userImage.height);
    const sw = userImage.width  * scale;
    const sh = userImage.height * scale;
    const sx = imgArea.x + (imgArea.w - sw) / 2;
    const sy = imgArea.y + (imgArea.h - sh) / 2;

    ctx.drawImage(userImage, sx, sy, sw, sh);
    ctx.restore();

    // 4. Caption area
    if (t.caption.show) {
      ctx.fillStyle = t.caption.bg;
      ctx.fillRect(border, canvas.height - capH - border/2, canvas.width - border*2, capH + border/2);

      ctx.fillStyle = t.caption.textColor;
      ctx.font = `${t.caption.fontSize}px 'Kanit', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const text = captionText || '💎 Diamond Cute Studio';
      ctx.fillText(text, canvas.width/2, canvas.height - capH/2 - border/4);
    }
  }

  // ─── Download ───
  function download(filename = 'preview-diamond-cute-studio.jpg') {
    if (!userImage) return;
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/jpeg', 0.92);
    link.click();
  }

  // ─── Public API ───
  return { init, TEMPLATES };

})();

// ═══════════════════════════════════════════════
//  PREVIEW TOOL COMPONENT (injects into product page)
// ═══════════════════════════════════════════════
window.initPreviewTool = function(options = {}) {
  const containerEl = document.getElementById(options.containerId || 'preview-tool-container');
  if (!containerEl) return;

  const SIZE = options.size || { w:280, h:390 };

  containerEl.innerHTML = `
    <div class="preview-tool-inner">
      <div style="background:rgba(14,165,233,.07);border:1px solid var(--border);border-radius:var(--r-md);padding:.6rem .85rem;margin-bottom:.85rem;font-size:.82rem;color:var(--text-2);line-height:1.6">
        💡 <strong>วิธีใช้:</strong> อัปโหลดรูปของคุณ → เลือก Template → ดูว่าจะออกมาหน้าตาอย่างไร → กด 💾 ดาวน์โหลด preview ได้เลย
      </div>

      <!-- Canvas area -->
      <div style="position:relative;text-align:center;margin-bottom:.9rem">
        <canvas id="preview-canvas"
          style="border-radius:var(--r-xl);border:1.5px solid var(--border);box-shadow:var(--shadow-card);max-width:100%;cursor:pointer"
          title="คลิกเพื่ออัปโหลดรูป">
        </canvas>
        <div id="preview-upload-hint" style="margin-top:.5rem;font-size:.78rem;color:var(--text-3);font-family:var(--font-display)">
          📌 อัปโหลดรูปของคุณเพื่อดูว่าจะออกมาหน้าตาอย่างไร
        </div>
      </div>

      <!-- Upload button -->
      <div style="display:flex;gap:.5rem;margin-bottom:.9rem">
        <label class="btn btn-secondary btn-md" style="flex:1;border-radius:var(--r-lg);cursor:pointer;justify-content:center">
          📤 เลือกรูปจากเครื่อง
          <input type="file" id="preview-file-input" accept="image/*" style="display:none">
        </label>
        <button class="btn btn-ghost btn-md" id="preview-download-btn" style="border-radius:var(--r-lg)" title="ดาวน์โหลด Preview" disabled>
          💾
        </button>
      </div>

      <!-- Caption input -->
      <div style="margin-bottom:.9rem">
        <input class="form-input" id="preview-caption" placeholder="ข้อความใต้รูป (ไม่บังคับ) เช่น วันเกิด 🎂" style="font-size:.85rem">
      </div>

      <!-- Template selector -->
      <div>
        <div style="font-family:var(--font-display);font-size:.8rem;color:var(--text-3);margin-bottom:.5rem;text-transform:uppercase;letter-spacing:.5px">🎨 เลือก Template</div>
        <div class="template-scroll" id="template-chips-row"></div>
      </div>
    </div>`;

  // Init canvas
  const api = CanvasPreview.init('preview-canvas', { size:SIZE });

  // Build template chips
  const row = document.getElementById('template-chips-row');
  CanvasPreview.TEMPLATES.forEach((t, i) => {
    const chip = document.createElement('div');
    chip.className = 'template-chip' + (i===0?' active':'');
    chip.dataset.tpl = t.id;
    chip.title = t.description;
    chip.innerHTML = `<span class="template-chip-icon">${t.emoji}</span><span class="template-chip-name">${t.name}</span>`;
    chip.addEventListener('click', () => {
      row.querySelectorAll('.template-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      api.selectTemplate(t.id);
    });
    row.appendChild(chip);
  });

  // File input handler
  const fileInput = document.getElementById('preview-file-input');
  const dlBtn     = document.getElementById('preview-download-btn');
  const canvas    = document.getElementById('preview-canvas');

  async function handleFile(file) {
    if (!file?.type.startsWith('image/')) {
      DMC.toast('ไฟล์ต้องเป็นรูปภาพเท่านั้น (JPG, PNG)', 'error');
      return;
    }
    try {
      await api.loadImage(file);
      dlBtn.disabled = false;
      document.getElementById('preview-upload-hint').textContent = '✅ อัปโหลดแล้ว — เลือก Template ด้านล่าง';
    } catch(e) {
      DMC.toast(e.message || 'โหลดรูปไม่สำเร็จ', 'error');
    }
  }

  fileInput?.addEventListener('change', () => handleFile(fileInput.files[0]));
  canvas?.addEventListener('click', () => fileInput?.click());
  canvas?.addEventListener('dragover', e => { e.preventDefault(); canvas.style.opacity='.7'; });
  canvas?.addEventListener('dragleave', () => canvas.style.opacity='');
  canvas?.addEventListener('drop', e => {
    e.preventDefault(); canvas.style.opacity='';
    handleFile(e.dataTransfer.files[0]);
  });

  dlBtn?.addEventListener('click', () => api.download());

  // Caption
  document.getElementById('preview-caption')?.addEventListener('input', e => {
    api.setCaptionText(e.target.value);
  });
};
