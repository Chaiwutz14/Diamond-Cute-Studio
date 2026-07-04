/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Canvas Preview V13 (ยกเครื่องระบบเทมเพลต)
   js/canvas-preview.js

   ใหม่ใน V13 (แก้จากรายงานปัญหา 04/07):
   ① Hi-DPI rendering — คมชัดทุกจอ (เดิม 280px ถูกยืดเต็มจอจนแตก)
   ② กรอบ custom ปรับสัดส่วน canvas ตามไฟล์จริงอัตโนมัติ (เดิมโดนบีบลง 280:390 เสมอ)
      → รองรับทุกทรง: ป้ายร้านแนวนอน · บัตรแนวตั้ง · พวงกุญแจจัตุรัส
   ③ แก้กรองเทมเพลต — เลือกเฉพาะ custom แล้วไม่หลุดโชว์ built-in ทั้ง 6 อีก
   ④ ระบบเลเยอร์ — ลูกค้าเพิ่ม "ข้อความ" หลายชิ้น + "โลโก้/รูปเสริม" ลากวางบนภาพได้จริง
      (นามบัตร/บัตรพนักงาน: ชื่อ ตำแหน่ง เบอร์ โลโก้ ครบ) ปรับขนาด/สี/ฟอนต์/หนา ต่อชิ้น
   ⑤ รูปหลักลากเลื่อน + ซูมได้ (แก้ปัญหาหน้าโดนครอป)
   ⑥ เทมเพลตกำหนด "ช่องข้อความอัตโนมัติ" (defaultTexts) → เลือกปุ๊บช่องข้อความโผล่ให้กรอกทันที

   API สาธารณะคงเดิมทั้งหมด: CanvasPreview.create / loadCustomFrames / TEMPLATES
   และ window.initPreviewTool(options) — product.js/order.js ไม่ต้องแก้
═══════════════════════════════════════════════ */
'use strict';

window.CanvasPreview = (function(){

  // ─── Built-in templates (6 แบบมาตรฐาน — เหมือน V12) ───
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

  // ─── Custom frames จาก Firestore (โหลดครั้งเดียวต่อหน้า) ───
  // V13: ส่งผ่าน defaultTexts ด้วย (ช่องข้อความอัตโนมัติของเทมเพลต)
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
          if (t.frameUrl) frames.push({
            id: doc.id,
            name: t.name || 'Custom',
            frameUrl: t.frameUrl,
            defaultTexts: t.defaultTexts || '',
            custom: true,
          });
        });
        return frames;
      } catch (e) {
        console.warn('Custom templates load failed:', e.message);
        return [];
      }
    })();
    return _customFramesPromise;
  }

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ─── สร้าง instance ต่อ 1 canvas ───
  function create(canvasId, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');

    // ① Hi-DPI: วาดที่ความละเอียด RES เท่าของขนาดตรรกะ → คมชัดแม้ CSS ยืดเต็มจอ
    //    (ผลพลอยได้: ไฟล์บันทึก/แนบออเดอร์ก็ความละเอียดสูงขึ้นด้วย)
    const RES = Math.min(3, Math.max(2, window.devicePixelRatio || 1));
    const baseSize = options.size || { w: 280, h: 390 };
    let logicalW = baseSize.w, logicalH = baseSize.h;

    function applySize(w, h) {
      logicalW = Math.round(w); logicalH = Math.round(h);
      canvas.width  = Math.round(logicalW * RES);   // ⚠️ เปลี่ยน width = ล้าง state ทั้ง context
      canvas.height = Math.round(logicalH * RES);
      ctx.setTransform(RES, 0, 0, RES, 0, 0);       // ต้องตั้ง transform ใหม่ทุกครั้งหลัง resize
    }
    applySize(baseSize.w, baseSize.h);

    // ② สัดส่วนอัตโนมัติ: ย่อกรอบให้พอดีกล่อง (ไม่บีบ ไม่ยืด — คงสัดส่วนจริงเสมอ)
    function fitSize(ratio) {                        // ratio = w/h ของกรอบจริง
      const MAXW = 320, MAXH = 430;
      let w = MAXW, h = w / ratio;
      if (h > MAXH) { h = MAXH; w = h * ratio; }
      return { w, h };
    }

    // ─── state ───
    let userImage   = null;
    let currentTpl  = TEMPLATES[0];
    let captionText = '';
    let imgOff  = { x: 0, y: 0 };   // ⑤ ตำแหน่งรูปหลัก (ลากเลื่อนได้)
    let imgZoom = 1;                //    ซูมรูปหลัก 1–3 เท่า
    let layers  = [];               // ④ เลเยอร์ข้อความ/รูปเสริม (วาดทับบนสุด)
    let selectedIdx = -1;
    let onSelectionChange = null;   // callback ให้ UI อัปเดต toolbar
    let onLayersChange    = null;

    // ─── layer helpers ───
    function notifySel()    { if (onSelectionChange) onSelectionChange(getSelected()); }
    function notifyLayers() { if (onLayersChange) onLayersChange(layers.length); }

    function addTextLayer(text, opts = {}) {
      const l = {
        type: 'text',
        text : text || 'ข้อความ',
        x    : opts.x != null ? opts.x : logicalW / 2,
        y    : opts.y != null ? opts.y : logicalH * (0.42 + 0.11 * layers.filter(v => v.type === 'text').length),
        size : opts.size  || Math.round(clamp(logicalW * 0.065, 13, 26)),
        color: opts.color || '#222222',
        bold : opts.bold !== undefined ? opts.bold : true,
        font : opts.font  || 'Kanit',
        auto : !!opts.auto,           // มาจาก defaultTexts ของเทมเพลต
      };
      l.y = clamp(l.y, 14, logicalH - 10);
      layers.push(l);
      selectedIdx = layers.length - 1;
      render(); notifySel(); notifyLayers();
      return l;
    }

    function addImageLayer(img, opts = {}) {
      const w = opts.w || clamp(logicalW * 0.28, 40, 140);
      const l = {
        type: 'image', img,
        x: opts.x != null ? opts.x : logicalW / 2,
        y: opts.y != null ? opts.y : logicalH * 0.22,
        w, ratio: img.height / img.width,
      };
      layers.push(l);
      selectedIdx = layers.length - 1;
      render(); notifySel(); notifyLayers();
      return l;
    }

    function addImageLayerFromFile(file) {
      return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) { reject(new Error('ไฟล์ต้องเป็นรูปภาพ')); return; }
        if (file.size > 10 * 1024 * 1024) { reject(new Error('ไฟล์ใหญ่เกิน 10MB')); return; }
        const reader = new FileReader();
        reader.onload = e => {
          const img = new Image();
          img.onload  = () => resolve(addImageLayer(img));
          img.onerror = () => reject(new Error('โหลดรูปไม่สำเร็จ'));
          img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'));
        reader.readAsDataURL(file);
      });
    }

    function getSelected() { return layers[selectedIdx] || null; }
    function selectLayer(i) { selectedIdx = i; render(); notifySel(); }
    function updateSelected(props) {
      const l = getSelected(); if (!l) return;
      Object.assign(l, props);
      if (l.type === 'text' && props.text !== undefined) l.auto = l.auto && false; // แก้ข้อความแล้วถือว่า user เป็นเจ้าของ
      render();
    }
    function deleteSelected() {
      if (selectedIdx < 0) return;
      layers.splice(selectedIdx, 1);
      selectedIdx = -1;
      render(); notifySel(); notifyLayers();
    }

    // ⑥ สร้างช่องข้อความอัตโนมัติจาก defaultTexts ของเทมเพลต
    //    เพิ่มเฉพาะเมื่อยังไม่มีข้อความของ user (ไม่ทับงานที่ลูกค้าทำไว้)
    function applyDefaultTexts(defaultTexts) {
      const wanted = String(defaultTexts || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 6);
      // ลบชุด auto เดิม (จากเทมเพลตก่อนหน้า) ที่ลูกค้ายังไม่ได้แก้
      layers = layers.filter(l => !(l.type === 'text' && l.auto));
      selectedIdx = -1;
      if (wanted.length && !layers.some(l => l.type === 'text')) {
        wanted.forEach((txt, i) => {
          const size = i === 0 ? Math.round(clamp(logicalW * 0.075, 15, 28)) : Math.round(clamp(logicalW * 0.052, 12, 20));
          addTextLayer(txt, {
            auto: true, size,
            bold: i === 0,
            y: logicalH * (0.5 + 0.09 * i),
          });
        });
        selectedIdx = -1; // ไม่ auto-select — ให้ลูกค้าแตะเลือกเอง
      }
      render(); notifySel(); notifyLayers();
    }

    // ─── รูปหลัก ───
    function loadImage(file) {
      return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) { reject(new Error('ไฟล์ต้องเป็นรูปภาพ (JPG, PNG)')); return; }
        if (file.size > 10 * 1024 * 1024) { reject(new Error('ไฟล์ใหญ่เกิน 10MB')); return; }
        const reader = new FileReader();
        reader.onload = e => {
          const img = new Image();
          img.onload  = () => { userImage = img; imgOff = { x: 0, y: 0 }; imgZoom = 1; render(); resolve(img); };
          img.onerror = () => reject(new Error('โหลดรูปไม่สำเร็จ'));
          img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'));
        reader.readAsDataURL(file);
      });
    }

    function setPhotoZoom(z) { imgZoom = clamp(Number(z) || 1, 1, 3); render(); }

    // ─── เลือกเทมเพลต ───
    function selectBuiltin(tplId) {
      currentTpl = TEMPLATES.find(t => t.id === tplId) || TEMPLATES[0];
      applySize(baseSize.w, baseSize.h);   // กลับสัดส่วนพื้นฐานของสินค้า
      imgOff = { x: 0, y: 0 };
      applyDefaultTexts('');               // เคลียร์ช่อง auto ของเทมเพลตก่อนหน้า
      render();
    }

    function selectCustomFrame(frame) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        currentTpl = { custom: true, frameImg: img, name: frame.name, defaultTexts: frame.defaultTexts || '' };
        // ② canvas ปรับสัดส่วนตามกรอบจริง — ไม่บีบไม่ยืดอีกต่อไป
        const fit = fitSize(img.width / Math.max(1, img.height));
        applySize(fit.w, fit.h);
        imgOff = { x: 0, y: 0 };
        applyDefaultTexts(frame.defaultTexts);
        render();
      };
      img.onerror = () => { if (typeof DMC !== 'undefined') DMC.toast('โหลดกรอบไม่สำเร็จ', 'error'); };
      img.src = frame.frameUrl;
    }

    function setCaption(text) { captionText = text; render(); }

    // ─── วาด ───
    function drawPlaceholder() {
      ctx.fillStyle = '#F0F4FA';
      ctx.fillRect(0, 0, logicalW, logicalH);
      ctx.fillStyle = '#64748B';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText('📸', logicalW / 2, logicalH / 2 - 22);
      ctx.font = "600 14px 'Kanit', sans-serif";
      ctx.fillText('แตะที่นี่เพื่ออัปโหลดรูป', logicalW / 2, logicalH / 2 + 22);
      ctx.font = "12px 'Kanit', sans-serif";
      ctx.fillStyle = '#94A3B8';
      ctx.fillText('แล้วดูตัวอย่างจริงได้ทันที', logicalW / 2, logicalH / 2 + 42);
    }

    function photoArea() {
      if (currentTpl.custom) return { x: 0, y: 0, w: logicalW, h: logicalH };
      const t = currentTpl;
      const b = t.border.width;
      const capH = t.caption.show ? t.caption.height : 0;
      return { x: b, y: b, w: logicalW - b * 2, h: logicalH - b * 2 - capH };
    }

    // ⑤ วาดรูปหลักแบบ cover + zoom + offset (คุมไม่ให้เห็นขอบว่าง)
    function drawPhoto(area) {
      const img = userImage;
      const cover = Math.max(area.w / img.width, area.h / img.height);
      const s  = cover * imgZoom;
      const sw = img.width * s, sh = img.height * s;
      const maxX = (sw - area.w) / 2, maxY = (sh - area.h) / 2;
      imgOff.x = clamp(imgOff.x, -maxX, maxX);
      imgOff.y = clamp(imgOff.y, -maxY, maxY);
      ctx.save();
      ctx.beginPath();
      ctx.rect(area.x, area.y, area.w, area.h);
      ctx.clip();
      ctx.drawImage(img, area.x + (area.w - sw) / 2 + imgOff.x, area.y + (area.h - sh) / 2 + imgOff.y, sw, sh);
      ctx.restore();
    }

    function layerFont(l) {
      return (l.bold ? '700 ' : '400 ') + l.size + "px '" + (l.font || 'Kanit') + "', sans-serif";
    }

    function layerBox(l) {
      if (l.type === 'image') {
        const h = l.w * l.ratio;
        return { x: l.x - l.w / 2, y: l.y - h / 2, w: l.w, h };
      }
      ctx.font = layerFont(l);
      const w = Math.max(24, ctx.measureText(l.text).width);
      const h = l.size * 1.3;
      return { x: l.x - w / 2, y: l.y - h / 2, w, h };
    }

    function drawLayers() {
      layers.forEach((l, i) => {
        ctx.save();
        if (l.type === 'image') {
          const b = layerBox(l);
          ctx.drawImage(l.img, b.x, b.y, b.w, b.h);
        } else {
          ctx.font = layerFont(l);
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = l.color;
          ctx.fillText(l.text, l.x, l.y);
        }
        ctx.restore();
        if (i === selectedIdx) {
          const b = layerBox(l);
          ctx.save();
          ctx.strokeStyle = 'rgba(14,165,233,.95)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 4]);
          ctx.strokeRect(b.x - 5, b.y - 4, b.w + 10, b.h + 8);
          ctx.restore();
        }
      });
    }

    function render() {
      ctx.clearRect(0, 0, logicalW, logicalH);
      const hasContent = userImage || layers.length;
      if (!hasContent && !currentTpl.custom) { drawPlaceholder(); return; }

      if (currentTpl.custom) {
        // พื้นหลัง (โชว์ผ่านช่องโปร่งใสของกรอบเมื่อยังไม่มีรูป)
        ctx.fillStyle = '#EDF2F7';
        ctx.fillRect(0, 0, logicalW, logicalH);
        if (userImage) drawPhoto(photoArea());
        else {
          ctx.fillStyle = '#94A3B8';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = "600 13px 'Kanit', sans-serif";
          ctx.fillText('แตะเพื่ออัปโหลดรูป (ถ้าแบบนี้ใช้รูป)', logicalW / 2, logicalH / 2);
        }
        if (currentTpl.frameImg) ctx.drawImage(currentTpl.frameImg, 0, 0, logicalW, logicalH);
      } else {
        const t = currentTpl;
        const b = t.border.width;
        const capH = t.caption.show ? t.caption.height : 0;
        // พื้น + เงาขอบ
        ctx.fillStyle = t.bgColor;
        ctx.fillRect(0, 0, logicalW, logicalH);
        ctx.save();
        ctx.shadowColor = t.border.shadow;
        ctx.shadowBlur = 12; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 3;
        ctx.fillStyle = t.border.color;
        ctx.fillRect(b / 2, b / 2, logicalW - b, logicalH - b);
        ctx.restore();
        if (userImage) {
          ctx.save();
          ctx.filter = t.filter || 'none';
          drawPhoto(photoArea());
          ctx.restore();
        } else {
          const a = photoArea();
          ctx.fillStyle = '#F0F4FA';
          ctx.fillRect(a.x, a.y, a.w, a.h);
        }
        if (t.caption.show) {
          ctx.fillStyle = t.caption.bg;
          ctx.fillRect(b, logicalH - capH - b / 2, logicalW - b * 2, capH + b / 2);
          ctx.fillStyle = t.caption.textColor;
          ctx.font = t.caption.fontSize + "px 'Kanit', sans-serif";
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(captionText || '💎 Diamond Cute Studio', logicalW / 2, logicalH - capH / 2 - b / 4);
        }
      }
      drawLayers();
    }

    // ─── ④ Interaction: แตะเลือก/ลากเลเยอร์ · ลากรูปหลัก (pointer events = มือถือ+คอม) ───
    let drag = null;   // {kind:'layer'|'photo', idx, dx, dy, startX, startY, moved}
    function toLogical(ev) {
      const r = canvas.getBoundingClientRect();
      return {
        x: (ev.clientX - r.left) * logicalW / r.width,
        y: (ev.clientY - r.top) * logicalH / r.height,
      };
    }
    function hitLayer(p) {
      for (let i = layers.length - 1; i >= 0; i--) {         // บนสุดก่อน
        const b = layerBox(layers[i]);
        if (p.x >= b.x - 6 && p.x <= b.x + b.w + 6 && p.y >= b.y - 6 && p.y <= b.y + b.h + 6) return i;
      }
      return -1;
    }

    function attachInteraction(callbacks = {}) {
      onSelectionChange = callbacks.onSelectionChange || null;
      onLayersChange    = callbacks.onLayersChange || null;
      canvas.style.touchAction = 'none';

      canvas.addEventListener('pointerdown', ev => {
        const p = toLogical(ev);
        const idx = hitLayer(p);
        if (idx >= 0) {
          selectedIdx = idx;
          const l = layers[idx];
          drag = { kind: 'layer', idx, dx: p.x - l.x, dy: p.y - l.y, startX: p.x, startY: p.y, moved: false };
          render(); notifySel();
        } else if (userImage) {
          if (selectedIdx !== -1) { selectedIdx = -1; render(); notifySel(); }
          drag = { kind: 'photo', ox: imgOff.x, oy: imgOff.y, startX: p.x, startY: p.y, moved: false };
        } else {
          drag = { kind: 'none', startX: p.x, startY: p.y, moved: false };
        }
        try { canvas.setPointerCapture(ev.pointerId); } catch (e) {}
        ev.preventDefault();
      });

      canvas.addEventListener('pointermove', ev => {
        if (!drag) return;
        const p = toLogical(ev);
        if (Math.abs(p.x - drag.startX) + Math.abs(p.y - drag.startY) > 3) drag.moved = true;
        if (drag.kind === 'layer' && drag.moved) {
          const l = layers[drag.idx]; if (!l) return;
          l.x = clamp(p.x - drag.dx, 4, logicalW - 4);
          l.y = clamp(p.y - drag.dy, 4, logicalH - 4);
          render();
        } else if (drag.kind === 'photo' && drag.moved) {
          imgOff.x = drag.ox + (p.x - drag.startX);
          imgOff.y = drag.oy + (p.y - drag.startY);
          render();
        }
        ev.preventDefault();
      });

      const endDrag = ev => {
        if (!drag) return;
        const wasTap = !drag.moved;
        const kind = drag.kind;
        drag = null;
        // แตะเฉยๆ (ไม่ลาก) บนที่ว่างตอนยังไม่มีรูป → เปิดเลือกไฟล์ (พฤติกรรมเดิม)
        if (wasTap && kind === 'none' && callbacks.onEmptyTap) callbacks.onEmptyTap();
      };
      canvas.addEventListener('pointerup', endDrag);
      canvas.addEventListener('pointercancel', endDrag);
    }

    // ─── บันทึก / export ───
    function download(filename) {
      if (!userImage && !layers.length) return;
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

    render();
    return {
      loadImage, selectBuiltin, selectCustomFrame, setCaption, render, download,
      hasImage: () => !!userImage,
      hasContent: () => !!userImage || layers.length > 0,
      getBlob: (cb) => { try { canvas.toBlob(b => cb(b), 'image/jpeg', 0.92); } catch (e) { cb(null); } },
      // V13 layer API
      addTextLayer, addImageLayerFromFile, updateSelected, deleteSelected,
      getSelected, selectLayer, setPhotoZoom, attachInteraction,
      isCustomActive: () => !!currentTpl.custom,
    };
  }

  return { create, loadCustomFrames, TEMPLATES };
})();

// ═══════════════════════════════════════════════
//  PREVIEW TOOL UI — V14 "Designer เต็มจอ"
//  แก้จุดตาย UX: canvas ใหญ่กลางหน้าสินค้าบล็อกการปัดเลื่อนเพจ
//  → หน้าสินค้าแสดง "การ์ดชวนออกแบบ" (ปัดผ่านได้ปกติ)
//  → กดแล้วเปิด Designer เต็มจอ (canvas ลากได้เต็มที่ ไม่ชนการเลื่อนเพจ)
//  options เดิม: { containerId, size, templates, lineUrl, productId, productName }
// ═══════════════════════════════════════════════

// ฟอนต์สำหรับข้อความบนภาพ — Google Fonts สัญญาอนุญาต SIL OFL (ฟรี ใช้เชิงพาณิชย์ได้)
// ทุกตัวรองรับไทย+อังกฤษ
window.__PV_FONTS = [
  { v:'Kanit',    label:'Kanit — ทันสมัย'   },
  { v:'Sarabun',  label:'Sarabun — ทางการ'  },
  { v:'Prompt',   label:'Prompt — สะอาดตา'  },
  { v:'Mali',     label:'Mali — ลายมือน่ารัก' },
  { v:'Mitr',     label:'Mitr — กลมมน'      },
  { v:'Itim',     label:'Itim — เขียนเล่น'   },
  { v:'Sriracha', label:'Sriracha — ลายมือเอียง' },
  { v:'Charm',    label:'Charm — หวานพลิ้ว'  },
  { v:'Pattaya',  label:'Pattaya — ป้ายร้าน' },
  { v:'Chonburi', label:'Chonburi — หัวกลมหนา' },
];

window.initPreviewTool = async function(options = {}) {
  const containerEl = document.getElementById(options.containerId || 'preview-tool-container');
  if (!containerEl) return;

  // ─── 1) การ์ดชวนออกแบบบนหน้าสินค้า (แทน canvas เดิม — ไม่บล็อกการปัดจอ) ───
  containerEl.innerHTML = [
    '<div class="pv-teaser" id="pv-teaser" role="button" tabindex="0" aria-label="เปิดหน้าออกแบบ">',
      '<div class="pv-teaser-shine" aria-hidden="true"></div>',
      '<span class="pv-teaser-ribbon">⭐ จุดเด่นของร้าน</span>',
      '<span class="pv-teaser-free">ฟรี!</span>',
      '<div class="pv-teaser-top">',
        '<div class="pv-teaser-emoji" aria-hidden="true">🎨</div>',
        '<div class="pv-teaser-body">',
          '<div class="pv-teaser-title">สินค้านี้ออกแบบเองได้!</div>',
          '<div class="pv-teaser-sub">อัปรูปของคุณ · ใส่ข้อความ/โลโก้ · ลากวางเอง<br>เห็นตัวอย่างจริงก่อนสั่ง <b>ไม่ต้องรอร้านทำแบบ</b></div>',
        '</div>',
      '</div>',
      '<button type="button" class="pv-teaser-btn" id="pv-open-designer">👆 แตะเพื่อเริ่มออกแบบเลย <span class="pv-teaser-arrow">→</span></button>',
    '</div>'
  ].join('');

  // ─── 2) Designer เต็มจอ (สร้างครั้งแรกเมื่อกดเปิด) ───
  let modal = null, built = false, isOpen = false, prevOverflow = '';

  function openDesigner() {
    if (!modal) buildModalShell();
    modal.style.display = 'flex';
    requestAnimationFrame(() => modal.classList.add('open'));
    isOpen = true;
    prevOverflow = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';               // ล็อกเพจหลัง — ใน modal เลื่อนเองได้
    try { history.pushState({ pvDesigner: 1 }, ''); } catch (e) {}
    window.addEventListener('popstate', onPopState);
    if (!built) { built = true; buildEditor().catch(err => console.warn('designer build failed', err)); }
  }

  function closeDesigner(fromPop) {
    if (!isOpen) return;
    isOpen = false;
    modal.classList.remove('open');
    setTimeout(() => { if (!isOpen) modal.style.display = 'none'; }, 180);
    document.body.style.overflow = prevOverflow;
    window.removeEventListener('popstate', onPopState);
    // เปิดด้วย pushState → ปิดด้วยปุ่มต้อง back ทิ้ง state (กัน back ครั้งถัดไปเด้งกลับ)
    if (!fromPop) { try { if (history.state && history.state.pvDesigner) history.back(); } catch (e) {} }
  }
  function onPopState() { closeDesigner(true); }

  document.getElementById('pv-open-designer')?.addEventListener('click', e => { e.stopPropagation(); openDesigner(); });
  document.getElementById('pv-teaser')?.addEventListener('click', openDesigner);
  document.getElementById('pv-teaser')?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDesigner(); } });

  function buildModalShell() {
    modal = document.getElementById('pv-designer-modal');
    if (modal) return;
    modal = document.createElement('div');
    modal.id = 'pv-designer-modal';
    modal.innerHTML = [
      '<div class="pvd-sheet">',
        '<div class="pvd-header">',
          '<div class="pvd-title">🎨 ออกแบบ — ' + (options.productName ? String(options.productName).replace(/[<>&"]/g, '') : 'ตัวอย่างสินค้า') + '</div>',
          '<button type="button" class="pvd-close" id="pvd-close" aria-label="ปิด">✕</button>',
        '</div>',
        '<div class="pvd-body" id="pvd-body">',
          '<div style="text-align:center;padding:3rem 1rem"><span class="spinner" style="display:block;margin:0 auto"></span><div style="margin-top:.8rem;font-size:.85rem;color:var(--text-3)">กำลังเตรียมเครื่องมือออกแบบ...</div></div>',
        '</div>',
      '</div>'
    ].join('');
    document.body.appendChild(modal);
    document.getElementById('pvd-close')?.addEventListener('click', () => closeDesigner(false));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) closeDesigner(false); });
  }

  // ─── 3) ตัว editor (โครงเดิมจาก V13 — ย้ายเข้า modal + ฟอนต์ใหม่) ───
  async function buildEditor() {
    const body = document.getElementById('pvd-body');
    if (!body) return;

    const allowed = (options.templates && options.templates.length)
      ? options.templates.map(t => String(t).trim().toLowerCase())
      : null;

    const fontOptions = (window.__PV_FONTS || []).map(f =>
      '<option value="' + f.v + '" disabled data-label="' + f.label + '" style="font-family:\'' + f.v + '\'">⏳ ' + f.label + '</option>').join('');

    body.innerHTML = [
      '<div class="preview-tool-inner">',
        '<div class="preview-howto">💡 อัปโหลดรูป → เลือกแบบ → เพิ่มข้อความ/โลโก้แล้ว<strong>ลากวาง</strong>บนภาพได้เลย</div>',
        '<div class="pvd-canvas-wrap">',
          '<canvas id="preview-canvas" title="แตะเพื่ออัปโหลด/เลือกชิ้นงาน"></canvas>',
        '</div>',
        '<div id="preview-upload-hint" class="preview-hint" style="text-align:center">📌 แตะที่รูปเพื่ออัปโหลด · แตะข้อความเพื่อเลือกแล้วลากจัดตำแหน่ง</div>',

        '<div class="pv-zoom-row" id="pv-zoom-row" style="display:none">',
          '<span>🔍</span>',
          '<input type="range" id="pv-zoom" min="1" max="3" step="0.02" value="1" aria-label="ซูมรูป">',
          '<span class="pv-zoom-hint">ลากรูปเพื่อเลื่อนตำแหน่งได้</span>',
        '</div>',

        '<div class="pv-add-row">',
          '<button type="button" class="pv-btn" id="pv-add-text">➕ ข้อความ</button>',
          '<label class="pv-btn" style="cursor:pointer">➕ โลโก้/รูปเสริม<input type="file" id="pv-logo-input" accept="image/*" style="display:none"></label>',
        '</div>',

        '<div class="pv-layer-bar" id="pv-layer-bar" style="display:none">',
          '<div class="pv-layer-row" id="pv-text-row">',
            '<input type="text" class="form-input pv-text-input" id="pv-text-input" maxlength="60" placeholder="พิมพ์ข้อความ...">',
          '</div>',
          '<div class="pv-layer-row">',
            '<input type="range" id="pv-size" min="10" max="72" step="1" title="ขนาด" aria-label="ขนาด">',
            '<input type="color" id="pv-color" value="#222222" title="สี" aria-label="สีข้อความ">',
            '<button type="button" class="pv-mini-btn" id="pv-bold" title="ตัวหนา"><b>B</b></button>',
            '<button type="button" class="pv-mini-btn pv-del" id="pv-del" title="ลบชิ้นนี้">🗑️</button>',
          '</div>',
          '<div class="pv-layer-row" id="pv-font-row">',
            '<select id="pv-font" class="pv-font-sel" style="flex:1;max-width:none" aria-label="ฟอนต์">', fontOptions, '</select>',
          '</div>',
        '</div>',

        '<div style="display:flex;gap:.5rem;margin-bottom:.9rem">',
          '<label class="btn btn-secondary btn-md" style="flex:1;border-radius:var(--r-lg);cursor:pointer;justify-content:center">📤 เลือกรูปจากเครื่อง<input type="file" id="preview-file-input" accept="image/*" style="display:none"></label>',
          '<button class="btn btn-ghost btn-md" id="preview-download-btn" style="border-radius:var(--r-lg)" title="บันทึกภาพตัวอย่าง" disabled>💾</button>',
        '</div>',
        '<button class="btn btn-primary btn-md btn-block" id="preview-attach-btn" style="margin-bottom:.9rem" disabled>📎 ใช้แบบนี้ในออเดอร์</button>',
        '<div style="margin-bottom:.9rem" id="pv-caption-row"><input class="form-input" id="preview-caption" maxlength="60" placeholder="ข้อความใต้รูป (ไม่บังคับ) เช่น Happy Birthday 🎂" style="font-size:.85rem"></div>',
        '<div style="padding-bottom:1.2rem">',
          '<div class="preview-tpl-label">🎨 เลือกแบบ</div>',
          '<div class="template-scroll" id="template-chips-row"></div>',
        '</div>',
      '</div>'
    ].join('');

    const api = CanvasPreview.create('preview-canvas', { size: options.size });
    if (!api) return;

    // ─── refs ───
    const row       = document.getElementById('template-chips-row');
    const fileInput = document.getElementById('preview-file-input');
    const dlBtn     = document.getElementById('preview-download-btn');
    const attachBtn = document.getElementById('preview-attach-btn');
    const hintEl    = document.getElementById('preview-upload-hint');
    const zoomRow   = document.getElementById('pv-zoom-row');
    const zoomIn    = document.getElementById('pv-zoom');
    const layerBar  = document.getElementById('pv-layer-bar');
    const textRow   = document.getElementById('pv-text-row');
    const fontRow   = document.getElementById('pv-font-row');
    const textIn    = document.getElementById('pv-text-input');
    const sizeIn    = document.getElementById('pv-size');
    const colorIn   = document.getElementById('pv-color');
    const boldBtn   = document.getElementById('pv-bold');
    const fontSel   = document.getElementById('pv-font');
    const delBtn    = document.getElementById('pv-del');
    const capRow    = document.getElementById('pv-caption-row');

    function refreshActionButtons() {
      const has = api.hasContent();
      dlBtn.disabled = !has;
      if (attachBtn && attachBtn.dataset.busy !== '1') attachBtn.disabled = !has;
    }

    // โหลดฟอนต์ก่อนใช้ — สำคัญ: ต้องส่งข้อความไทยเข้า fonts.load ด้วย
    // (Google Fonts แยกไฟล์ subset ไทย/ละติน — ถ้าไม่ส่ง text ระบบโหลดเฉพาะละติน ตัวไทยเลยไม่เปลี่ยน)
    const FONT_SAMPLE = 'อักษรไทย Aa Bb 0123 ๆฯ';
    function loadFontFamily(fam) {
      try {
        return Promise.race([
          Promise.all([
            document.fonts.load("400 20px '" + fam + "'", FONT_SAMPLE),
            document.fonts.load("700 20px '" + fam + "'", FONT_SAMPLE),
          ]),
          new Promise(res => setTimeout(res, 9000)),   // เน็ตช้ามาก → ปลดล็อกให้กดได้ (ฟอนต์ตามมาทีหลัง)
        ]);
      } catch (e) { return Promise.resolve(); }
    }
    function ensureFont(fam, cb) { loadFontFamily(fam).then(cb).catch(cb); }

    // โหลดฟอนต์ทั้งหมดทันทีที่เปิด Designer — option ไหนพร้อมแล้วค่อยกดได้ (User เห็นสถานะชัด)
    (window.__PV_FONTS || []).forEach(f => {
      loadFontFamily(f.v).then(() => {
        const opt = fontSel?.querySelector('option[value="' + f.v + '"]');
        if (opt) { opt.disabled = false; opt.textContent = opt.dataset.label; }
        // ฟอนต์ที่เลเยอร์ใช้อยู่เพิ่งโหลดเสร็จ → วาดใหม่ให้เห็นผลทันที
        try { api.render(); } catch (e) {}
      });
    });

    function syncToolbar(layer) {
      if (!layer) { layerBar.style.display = 'none'; return; }
      layerBar.style.display = '';
      const isText = layer.type === 'text';
      textRow.style.display = isText ? '' : 'none';
      fontRow.style.display = isText ? '' : 'none';
      colorIn.style.display = isText ? '' : 'none';
      boldBtn.style.display = isText ? '' : 'none';
      if (isText) {
        textIn.value = layer.text;
        sizeIn.min = 10; sizeIn.max = 72; sizeIn.value = layer.size;
        colorIn.value = layer.color;
        boldBtn.classList.toggle('active', !!layer.bold);
        fontSel.value = layer.font || 'Kanit';
      } else {
        sizeIn.min = 24; sizeIn.max = 240; sizeIn.value = Math.round(layer.w);
      }
    }

    api.attachInteraction({
      onSelectionChange: syncToolbar,
      onLayersChange: refreshActionButtons,
      onEmptyTap: () => { if (!api.hasImage()) fileInput?.click(); },
    });

    // ─── template chips ───
    function addChip(label, emojiOrImg, onClick, isImg, isCustomTpl) {
      const chip = document.createElement('div');
      chip.className = 'template-chip';
      const icon = document.createElement('span');
      icon.className = 'template-chip-icon';
      if (isImg) {
        const im = document.createElement('img');
        im.src = emojiOrImg; im.alt = label; im.loading = 'lazy';
        im.style.cssText = 'width:26px;height:26px;object-fit:contain;border-radius:4px';
        icon.appendChild(im);
      } else icon.textContent = emojiOrImg;
      const name = document.createElement('span');
      name.className = 'template-chip-name';
      name.textContent = label;
      chip.appendChild(icon); chip.appendChild(name);
      chip.addEventListener('click', () => {
        row.querySelectorAll('.template-chip').forEach(x => x.classList.remove('active'));
        chip.classList.add('active');
        onClick();
        capRow.style.display = isCustomTpl ? 'none' : '';
      });
      row.appendChild(chip);
      return chip;
    }

    const builtins = allowed === null
      ? CanvasPreview.TEMPLATES
      : CanvasPreview.TEMPLATES.filter(t => allowed.includes(t.id) || allowed.includes(t.name.toLowerCase()));

    const chipActions = [];
    builtins.forEach(t => {
      const act = () => api.selectBuiltin(t.id);
      const chip = addChip(t.name, t.emoji, act);
      chip.title = t.description;
      chipActions.push({ chip, act });
    });

    let frames = [];
    try { frames = await CanvasPreview.loadCustomFrames(); } catch (e) { frames = []; }
    frames.forEach(f => {
      if (allowed && !allowed.includes(f.id.toLowerCase()) && !allowed.includes((f.name || '').toLowerCase())) return;
      const act = () => api.selectCustomFrame(f);
      const chip = addChip(f.name, f.frameUrl, act, true, true);
      chipActions.push({ chip, act });
    });

    if (chipActions.length) {
      chipActions[0].chip.classList.add('active');
      chipActions[0].act();
      capRow.style.display = (builtins.length === 0) ? 'none' : '';
    }

    const moreChip = addChip('เพิ่มเติม…', '✨', () => {
      if (hintEl) hintEl.innerHTML = '💬 ร้านมีแบบมากกว่านี้! <a href="' + (options.lineUrl || '#') + '" target="_blank" rel="noopener" style="color:var(--accent);font-weight:700">ทักไลน์เพื่อดูแบบเพิ่มเติม →</a>';
      if (typeof DMC !== 'undefined') DMC.toast('ทักไลน์ร้านเพื่อดูแบบเพิ่มเติมได้เลยครับ 💬', 'info');
    });
    moreChip.classList.add('template-chip-more');
    moreChip.title = 'ติดต่อ LINE เพื่อดูแบบอื่นๆ นอกเหนือจากในเว็บ';

    // ─── อัปโหลดรูปหลัก ───
    async function handleFile(file) {
      try {
        await api.loadImage(file);
        refreshActionButtons();
        zoomRow.style.display = '';
        zoomIn.value = 1;
        hintEl.textContent = '✅ อัปโหลดแล้ว — ลากรูปเพื่อเลื่อน · เลื่อน 🔍 เพื่อซูม · เพิ่มข้อความได้เลย';
      } catch (e) {
        DMC.toast(e.message || 'โหลดรูปไม่สำเร็จ', 'error');
      }
    }
    fileInput?.addEventListener('change', () => { if (fileInput.files[0]) { handleFile(fileInput.files[0]); fileInput.value = ''; } });

    const canvasEl = document.getElementById('preview-canvas');
    canvasEl?.addEventListener('dragover', e => { e.preventDefault(); canvasEl.style.opacity = '.7'; });
    canvasEl?.addEventListener('dragleave', () => { canvasEl.style.opacity = ''; });
    canvasEl?.addEventListener('drop', e => {
      e.preventDefault(); canvasEl.style.opacity = '';
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });

    zoomIn?.addEventListener('input', e => api.setPhotoZoom(e.target.value));

    // ─── เลเยอร์ ───
    document.getElementById('pv-add-text')?.addEventListener('click', () => {
      api.addTextLayer('ข้อความ');
      hintEl.textContent = '✍️ พิมพ์ข้อความในช่องด้านล่าง แล้วลากบนรูปเพื่อจัดตำแหน่ง';
      textIn?.focus();
      try { textIn.select(); } catch (e) {}
    });

    const logoInput = document.getElementById('pv-logo-input');
    logoInput?.addEventListener('change', async () => {
      const f = logoInput.files[0];
      if (!f) return;
      try {
        await api.addImageLayerFromFile(f);
        hintEl.textContent = '🖼️ ลากโลโก้เพื่อจัดตำแหน่ง · เลื่อนแถบขนาดเพื่อย่อ/ขยาย';
      } catch (e) { DMC.toast(e.message || 'เพิ่มรูปไม่สำเร็จ', 'error'); }
      logoInput.value = '';
    });

    textIn?.addEventListener('input',  e => api.updateSelected({ text: e.target.value || ' ' }));
    colorIn?.addEventListener('input', e => api.updateSelected({ color: e.target.value }));
    fontSel?.addEventListener('change', e => {
      const fam = e.target.value;
      api.updateSelected({ font: fam });                     // ใช้ทันที (ฟอนต์ที่เลือกได้ = โหลดแล้ว)
      ensureFont(fam, () => { try { api.render(); } catch (err) {} });   // กันเคสปลดล็อกจาก timeout
    });
    sizeIn?.addEventListener('input',  e => {
      const l = api.getSelected(); if (!l) return;
      if (l.type === 'text') api.updateSelected({ size: parseInt(e.target.value, 10) || 16 });
      else api.updateSelected({ w: parseInt(e.target.value, 10) || 60 });
    });
    boldBtn?.addEventListener('click', () => {
      const l = api.getSelected(); if (!l || l.type !== 'text') return;
      api.updateSelected({ bold: !l.bold });
      boldBtn.classList.toggle('active', !!api.getSelected().bold);
    });
    delBtn?.addEventListener('click', () => { api.deleteSelected(); refreshActionButtons(); });

    dlBtn?.addEventListener('click', () => api.download());
    document.getElementById('preview-caption')?.addEventListener('input', e => api.setCaption(e.target.value));

    // ─── แนบเข้าออเดอร์ (flow เดิม) — สำเร็จแล้วปิด Designer ให้เลย ───
    attachBtn?.addEventListener('click', () => {
      if (!api.hasContent()) { DMC.toast('กรุณาอัปโหลดรูปหรือใส่ข้อความก่อนครับ', 'warning'); return; }
      const original = attachBtn.innerHTML;
      attachBtn.disabled = true; attachBtn.dataset.busy = '1';
      attachBtn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> กำลังแนบ...';
      api.getBlob(async (blob) => {
        try {
          if (!blob) throw new Error('no blob');
          const f = new File([blob], 'design-' + Date.now() + '.jpg', { type: 'image/jpeg' });
          const up = await DMC.uploadToImgBB(f);
          if (!up || !up.url) throw new Error('upload failed');
          let designs = [];
          try { designs = JSON.parse(localStorage.getItem('dmc_pending_designs') || '[]'); } catch (e) {}
          designs.push({ productId: options.productId || '', name: options.productName || 'แบบที่ออกแบบ', url: up.url, at: Date.now() });
          localStorage.setItem('dmc_pending_designs', JSON.stringify(designs));
          attachBtn.innerHTML = '✅ แนบเข้าออเดอร์แล้ว';
          DMC.toast('แนบแบบเข้าออเดอร์แล้ว — จะแสดงในหน้าสั่งซื้อ 🛒', 'success', 4000);
          setTimeout(() => {
            attachBtn.innerHTML = original; attachBtn.disabled = false; attachBtn.dataset.busy = '';
            closeDesigner(false);           // ปิดกลับหน้าสินค้าให้กดสั่งซื้อต่อ
          }, 1400);
        } catch (e) {
          console.warn('attach design failed', e);
          attachBtn.innerHTML = original; attachBtn.disabled = false; attachBtn.dataset.busy = '';
          DMC.toast('แนบแบบไม่สำเร็จ ลองใหม่ หรือส่งรูปทาง LINE ได้ครับ', 'error', 4500);
        }
      });
    });
  }
};
