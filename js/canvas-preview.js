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

   ใหม่ใน V35 (07/2026):
   ① Free Transform — จุดจับปรับขนาดบน canvas (สไตล์ Canva)
      · ข้อความ: ✕ ลบ (มุมขวาบน) + ⤡ ลากปรับขนาดฟอนต์ (มุมขวาล่าง)
      · รูปภาพ: 8 จุดรอบกรอบ — มุม = คงสัดส่วน · ขอบ = ยืดกว้าง/สูงอิสระ
   ② แถบขนาดฟอนต์: สไลเดอร์ + ปุ่ม −/+ + ช่องตัวเลขพิมพ์ระบุเองได้ (8–200)
   ③ B (ตัวหนา) ย้ายเข้าแถบ dock เป็นไอคอนเวกเตอร์เหมือนเครื่องมืออื่น
   ④ "เลือกเทมเพลต" ย้ายเป็น Drop-down มุมซ้ายบน (เดิมชื่อ "เลือกแบบ" อยู่ใน dock)
   ⑤ export (💾 บันทึก / 📎 แนบออเดอร์) ซ่อนกรอบเลือก+จุดจับอัตโนมัติ ไม่ติดไปกับไฟล์จริง
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
          if (t.kind === 'design' && Array.isArray(t.layers)) {
            frames.push({
              id: doc.id,
              name: t.name || 'เทมเพลต',
              kind: 'design',
              canvas: t.canvas || null,
              layers: t.layers,
              thumbUrl: t.thumbUrl || '',
              custom: true,
            });
          } else if (t.frameUrl) {
            frames.push({
              id: doc.id,
              name: t.name || 'Custom',
              frameUrl: t.frameUrl,
              defaultTexts: t.defaultTexts || '',
              custom: true,
            });
          }
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
    let baseBg      = '#FFFFFF';       // V31: สีพื้นหลัง (เทมเพลตดีไซน์/สตูดิโอ)
    let bgImage     = null;            // V32: รูปพื้นหลังของเทมเพลต (แทนระบบ PNG เจาะรูเดิม)
    let bgImageUrl  = '';
    let imgOff  = { x: 0, y: 0 };   // ⑤ ตำแหน่งรูปหลัก (ลากเลื่อนได้)
    let imgZoom = 1;                //    ซูมรูปหลัก 1–3 เท่า
    let layers  = [];               // ④ เลเยอร์ข้อความ/รูปเสริม (วาดทับบนสุด)
    let dragGuides = null;          // V33: เส้นไกด์ตอนลาก {gx, gy, gap:{x,y1,y2,val}}
    let hideOverlay = false;        // V35: ซ่อนกรอบเลือก/จุดจับตอน export (กันเส้นติดไปกับไฟล์จริง)
    let onLayerResize = null;       // V35: callback แจ้ง UI ตอนลากจุดจับปรับขนาด
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
        // V30: เอฟเฟกต์อิสระแบบ Canva (ทุกค่า export เป็นภาพนิ่งได้จริง)
        colorMode  : opts.colorMode  || 'solid',      // solid | gradient | rainbow
        color2     : opts.color2     || '#F59E0B',    // สีปลายของไล่เฉด
        gradientDir: opts.gradientDir|| 'h',          // h | v
        strokeW    : opts.strokeW    || 0,            // ขอบตัวอักษร 0 = ไม่มี
        strokeColor: opts.strokeColor|| '#FFFFFF',
        shadow     : opts.shadow     || 0,            // เงา 0 = ไม่มี (ระดับ blur)
        shadowColor: opts.shadowColor|| 'rgba(0,0,0,.45)',
        curve      : opts.curve      || 0,            // -100..100 (ลบ=โค้งคว่ำ บวก=โค้งหงาย)
      };
      l.y = clamp(l.y, 14, logicalH - 10);
      layers.push(l);
      selectedIdx = layers.length - 1;
      render(); notifySel(); notifyLayers();
      return l;
    }

    function addImageLayer(img, opts = {}) {
      const w = opts.w || clamp(logicalW * 0.28, 40, 160);
      const ratio = img.height / Math.max(1, img.width);
      const l = {
        type: 'image', img,
        url: opts.url || '',                          // V31: url สำหรับ serialize เทมเพลต
        x: opts.x != null ? opts.x : logicalW / 2,
        y: opts.y != null ? opts.y : logicalH * 0.22,
        w,
        h: opts.h || w * ratio,                       // V31: สูงอิสระ (สัดส่วนกล่องปรับได้)
        ratio,
        imgZ: opts.imgZ || 1,                         // V31: ครอปใน — ซูมรูปในกรอบ
        imgX: opts.imgX || 0,                         //       เลื่อนรูปในกรอบ (โหมดครอป)
        imgY: opts.imgY || 0,
        radius: opts.radius || 0,                     // V31: มุมมน 0–100 (100 = วงกลม/แคปซูล)
        // V32: เครื่องมือปรับภาพ (วาดผ่าน ctx.filter — ติดไปกับงานพิมพ์จริง)
        brP: opts.brP != null ? opts.brP : 100,       // ความสว่าง %
        ctP: opts.ctP != null ? opts.ctP : 100,       // คมชัด (contrast) %
        saP: opts.saP != null ? opts.saP : 100,       // สีสด %
        blP: opts.blP || 0,                           // เบลอ px
        auto: !!opts.auto,
      };
      layers.push(l);
      selectedIdx = layers.length - 1;
      render(); notifySel(); notifyLayers();
      return l;
    }

    function addImageLayerFromFile(file, opts) {
      return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) { reject(new Error('ไฟล์ต้องเป็นรูปภาพ')); return; }
        if (file.size > 10 * 1024 * 1024) { reject(new Error('ไฟล์ใหญ่เกิน 10MB')); return; }
        const reader = new FileReader();
        reader.onload = e => {
          const img = new Image();
          img.onload  = () => resolve(addImageLayer(img, opts || {}));
          img.onerror = () => reject(new Error('โหลดรูปไม่สำเร็จ'));
          img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'));
        reader.readAsDataURL(file);
      });
    }

    function addImageLayerFromUrl(url, opts) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload  = () => resolve(addImageLayer(img, Object.assign({ url }, opts || {})));
        img.onerror = () => reject(new Error('โหลดรูปไม่สำเร็จ'));
        img.src = url;
      });
    }

    // V31: เปลี่ยนรูปในกรอบเดิม (ตำแหน่ง/ขนาด/มุมมน คงไว้ — สไตล์ Canva)
    function replaceSelectedImage(file) {
      return new Promise((resolve, reject) => {
        const l = getSelected();
        if (!l || l.type !== 'image') { reject(new Error('เลือกกรอบรูปก่อน')); return; }
        if (!file || !file.type.startsWith('image/')) { reject(new Error('ไฟล์ต้องเป็นรูปภาพ')); return; }
        const reader = new FileReader();
        reader.onload = e => {
          const img = new Image();
          img.onload = () => {
            l.img = img; l.url = ''; l.ratio = img.height / Math.max(1, img.width);
            l.imgZ = 1; l.imgX = 0; l.imgY = 0;
            render(); resolve(l);
          };
          img.onerror = () => reject(new Error('โหลดรูปไม่สำเร็จ'));
          img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('อ่านไฟล์ไม่สำเร็จ'));
        reader.readAsDataURL(file);
      });
    }

    // V31: จัดลำดับชั้น (ส่งไปหลัง/มาหน้า)
    function moveSelected(dir) {
      if (selectedIdx < 0) return;
      const to = dir === 'back' ? 0 : layers.length - 1;
      if (selectedIdx === to) return;
      const [l] = layers.splice(selectedIdx, 1);
      dir === 'back' ? layers.unshift(l) : layers.push(l);
      selectedIdx = to;
      render(); notifySel();
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
      if (currentTpl.custom || currentTpl.design) return { x: 0, y: 0, w: logicalW, h: logicalH };
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
        const h = l.h || l.w * l.ratio;
        return { x: l.x - l.w / 2, y: l.y - h / 2, w: l.w, h };
      }
      ctx.font = layerFont(l);
      const w = Math.max(24, ctx.measureText(l.text).width) + (l.strokeW || 0) * 2;
      let h = l.size * 1.3 + (l.strokeW || 0) * 2;
      if (l.curve) {                              // เผื่อความสูงส่วนโค้ง (sagitta โดยประมาณ)
        const R = Math.max(w * 0.65, 5200 / Math.abs(l.curve));
        const sag = R - Math.sqrt(Math.max(0, R * R - (w / 2) * (w / 2)));
        h += Math.min(sag, l.size * 2.2);
      }
      return { x: l.x - w / 2, y: l.y - h / 2, w, h };
    }

    // V30: fillStyle ตามโหมดสี (สีเดียว / ไล่เฉด 2 สี / รุ้ง)
    const RAINBOW = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#0A84FF', '#AF52DE'];
    function buildTextFill(l, b) {
      if (l.colorMode === 'gradient' || l.colorMode === 'rainbow') {
        const g = (l.gradientDir === 'v' && l.colorMode === 'gradient')
          ? ctx.createLinearGradient(0, b.y, 0, b.y + b.h)
          : ctx.createLinearGradient(b.x, 0, b.x + b.w, 0);
        if (l.colorMode === 'rainbow') {
          RAINBOW.forEach((c, i) => g.addColorStop(i / (RAINBOW.length - 1), c));
        } else {
          g.addColorStop(0, l.color);
          g.addColorStop(1, l.color2 || '#F59E0B');
        }
        return g;
      }
      return l.color;
    }

    // V30: ข้อความโค้ง — วาดทีละตัวอักษรตามส่วนโค้งวงกลม (แบบ Canva)
    function drawCurvedText(l, fill) {
      const text = l.text || '';
      if (!text) return;
      ctx.font = layerFont(l);
      const widths = [...text].map(ch => ctx.measureText(ch).width);
      const total = widths.reduce((a, b) => a + b, 0);
      const R = Math.max(total * 0.65, 5200 / Math.abs(l.curve));   // โค้งมาก = รัศมีสั้น
      const up = l.curve > 0;                                        // บวก = โค้งหงาย (ยิ้ม)
      const cy = up ? l.y + R : l.y - R;
      let ang = -(total / 2) / R;                                    // เริ่มจากซ้ายของ arc
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      [...text].forEach((ch, i) => {
        const half = widths[i] / 2;
        const a = ang + half / R;
        ctx.save();
        const px = l.x + Math.sin(a) * R;
        const py = cy + (up ? -Math.cos(a) * R : Math.cos(a) * R);
        ctx.translate(px, py);
        ctx.rotate(up ? a : -a);
        if (l.strokeW > 0) {
          ctx.lineWidth = l.strokeW; ctx.lineJoin = 'round';
          ctx.strokeStyle = l.strokeColor || '#FFFFFF';
          ctx.strokeText(ch, 0, 0);
        }
        ctx.fillStyle = fill;
        ctx.fillText(ch, 0, 0);
        ctx.restore();
        ang = a + half / R;
      });
    }

    function drawTextLayer(l) {
      ctx.font = layerFont(l);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const b = layerBox(l);
      const fill = buildTextFill(l, b);
      if (l.shadow > 0) {
        ctx.shadowColor = l.shadowColor || 'rgba(0,0,0,.45)';
        ctx.shadowBlur = l.shadow;
        ctx.shadowOffsetY = Math.round(l.shadow * 0.22);
      }
      if (l.curve) { drawCurvedText(l, fill); return; }
      if (l.strokeW > 0) {
        ctx.lineWidth = l.strokeW; ctx.lineJoin = 'round';
        ctx.strokeStyle = l.strokeColor || '#FFFFFF';
        ctx.strokeText(l.text, l.x, l.y);
      }
      ctx.fillStyle = fill;
      ctx.fillText(l.text, l.x, l.y);
    }

    function roundRectPath(b, r) {
      const rr = Math.min(r, b.w / 2, b.h / 2);
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') { ctx.roundRect(b.x, b.y, b.w, b.h, rr); return; }
      ctx.moveTo(b.x + rr, b.y);
      ctx.arcTo(b.x + b.w, b.y, b.x + b.w, b.y + b.h, rr);
      ctx.arcTo(b.x + b.w, b.y + b.h, b.x, b.y + b.h, rr);
      ctx.arcTo(b.x, b.y + b.h, b.x, b.y, rr);
      ctx.arcTo(b.x, b.y, b.x + b.w, b.y, rr);
      ctx.closePath();
    }

    function drawImageLayer(l) {
      const b = layerBox(l);
      const r = ((l.radius || 0) / 100) * (Math.min(b.w, b.h) / 2);   // 100 = วงกลม/แคปซูล
      ctx.save();
      roundRectPath(b, r);
      ctx.clip();
      // V32: ฟิลเตอร์ปรับภาพ
      const br = l.brP != null ? l.brP : 100, ct = l.ctP != null ? l.ctP : 100,
            sa = l.saP != null ? l.saP : 100, bl = l.blP || 0;
      if (br !== 100 || ct !== 100 || sa !== 100 || bl > 0) {
        ctx.filter = 'brightness(' + br + '%) contrast(' + ct + '%) saturate(' + sa + '%)' + (bl > 0 ? ' blur(' + bl + 'px)' : '');
      }
      // ครอปใน: cover เต็มกรอบ × ซูม + เลื่อน (เหมือนรูปหลัก แต่ต่อเลเยอร์)
      const cover = Math.max(b.w / l.img.width, b.h / l.img.height);
      const sc = cover * (l.imgZ || 1);
      const sw = l.img.width * sc, sh = l.img.height * sc;
      const maxX = Math.max(0, (sw - b.w) / 2), maxY = Math.max(0, (sh - b.h) / 2);
      l.imgX = clamp(l.imgX || 0, -maxX, maxX);
      l.imgY = clamp(l.imgY || 0, -maxY, maxY);
      ctx.drawImage(l.img, b.x + (b.w - sw) / 2 + l.imgX, b.y + (b.h - sh) / 2 + l.imgY, sw, sh);
      ctx.restore();
    }

    function drawLayers() {
      layers.forEach((l, i) => {
        ctx.save();
        if (l.type === 'image') {
          drawImageLayer(l);
        } else {
          drawTextLayer(l);
        }
        ctx.restore();
        if (i === selectedIdx && !hideOverlay) {
          const b = layerBox(l);
          ctx.save();
          ctx.strokeStyle = 'rgba(14,165,233,.95)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 4]);
          ctx.strokeRect(b.x - 5, b.y - 4, b.w + 10, b.h + 8);
          ctx.restore();
          if (!(l.type === 'image' && l._crop)) drawHandles(l);   // V35: จุดจับปรับขนาดอิสระ
        }
      });
    }

    // ═══ V35: จุดจับปรับแต่งอิสระบน canvas (สไตล์ Canva) ═══
    //  ข้อความ: ✕ ลบ (มุมขวาบน) + ⤡ ลากปรับขนาดฟอนต์ (มุมขวาล่าง)
    //  รูปภาพ: 8 จุดรอบกรอบ — มุม = ย่อ/ขยายคงสัดส่วน · ด้าน = ยืดกว้าง/สูงอิสระ
    const HANDLE_HIT = 13;   // รัศมีแตะโดน (logical px — เผื่อนิ้วบนมือถือ)
    function handlePoints(l) {
      const b = layerBox(l);
      const x0 = b.x - 5, y0 = b.y - 4, x1 = b.x + b.w + 5, y1 = b.y + b.h + 4;   // ตรงกับกรอบเลือก
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      if (l.type === 'text') {
        return [ { id: 'del', x: x1, y: y0 }, { id: 'se', x: x1, y: y1 } ];
      }
      return [
        { id: 'nw', x: x0, y: y0 }, { id: 'n', x: cx, y: y0 }, { id: 'ne', x: x1, y: y0 },
        { id: 'w',  x: x0, y: cy },                            { id: 'e',  x: x1, y: cy },
        { id: 'sw', x: x0, y: y1 }, { id: 's', x: cx, y: y1 }, { id: 'se', x: x1, y: y1 },
      ];
    }
    function drawHandles(l) {
      handlePoints(l).forEach(h => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(h.x, h.y, h.id === 'del' ? 8 : 6, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = 'rgba(0,0,0,.32)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1;
        ctx.fill();
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = h.id === 'del' ? 'rgba(225,29,72,.9)' : 'rgba(100,116,139,.7)';
        ctx.stroke();
        if (h.id === 'del') {                       // ✕ ลบ
          ctx.strokeStyle = '#E11D48'; ctx.lineWidth = 1.7; ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(h.x - 3, h.y - 3); ctx.lineTo(h.x + 3, h.y + 3);
          ctx.moveTo(h.x + 3, h.y - 3); ctx.lineTo(h.x - 3, h.y + 3);
          ctx.stroke();
        } else if (l.type === 'text' && h.id === 'se') {   // ⤡ ปรับขนาดฟอนต์
          ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(h.x - 2.6, h.y - 2.6); ctx.lineTo(h.x + 2.6, h.y + 2.6);
          ctx.moveTo(h.x + 2.6, h.y + 2.6); ctx.lineTo(h.x + 0.2, h.y + 2.6);
          ctx.moveTo(h.x + 2.6, h.y + 2.6); ctx.lineTo(h.x + 2.6, h.y + 0.2);
          ctx.stroke();
        }
        ctx.restore();
      });
    }
    function hitHandle(p) {
      const l = layers[selectedIdx];
      if (!l || hideOverlay) return null;
      if (l.type === 'image' && l._crop) return null;   // โหมดครอปมีการลากของตัวเอง
      for (const h of handlePoints(l)) {
        if (Math.hypot(p.x - h.x, p.y - h.y) <= HANDLE_HIT) return h.id;
      }
      return null;
    }

    function render() {
      ctx.clearRect(0, 0, logicalW, logicalH);
      const hasContent = userImage || layers.length;
      if (!hasContent && !currentTpl.custom && !currentTpl.design) { drawPlaceholder(); return; }

      if (currentTpl.design) {
        // V31/32: เทมเพลตดีไซน์ — พื้นสี → รูปพื้นหลัง → รูปหลัก → เลเยอร์
        ctx.fillStyle = baseBg || '#FFFFFF';
        ctx.fillRect(0, 0, logicalW, logicalH);
        if (bgImage) ctx.drawImage(bgImage, 0, 0, logicalW, logicalH);   // สัดส่วน canvas ตรงกับรูปอยู่แล้ว
        else if (userImage) drawPhoto(photoArea());
        if (!layers.length && !bgImage && !userImage) {
          // V32: คำชวนบน canvas ว่าง — user ใหม่รู้ทันทีว่าทำอะไรต่อ
          ctx.save();
          ctx.strokeStyle = 'rgba(100,116,139,.4)'; ctx.setLineDash([7, 6]); ctx.lineWidth = 1.5;
          ctx.strokeRect(10, 10, logicalW - 20, logicalH - 20);
          ctx.fillStyle = '#94A3B8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.font = "600 13px 'Kanit', sans-serif";
          ctx.fillText('ผืนผ้าใบว่าง — เริ่มได้เลย!', logicalW / 2, logicalH / 2 - 22);
          ctx.font = "12px 'Kanit', sans-serif";
          ctx.fillText('กด ➕ ข้อความ / ➕ โลโก้ ด้านล่าง', logicalW / 2, logicalH / 2 + 2);
          ctx.fillText('หรือเลือก 🖼️ รูปพื้นหลัง ด้านบน', logicalW / 2, logicalH / 2 + 24);
          ctx.restore();
        }
      } else if (currentTpl.custom) {
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
      drawCropOverlay();
      drawGuides();
    }

    // V33: โหมดครอป — ส่วนที่เก็บสีเข้มชัด ส่วนตัดทิ้งจางลง + ตาราง 3×3 (แบบ Canva)
    function drawCropOverlay() {
      const l = layers[selectedIdx];
      if (!l || l.type !== 'image' || !l._crop) return;
      const b = layerBox(l);
      ctx.save();
      // พื้นที่นอกกรอบ (evenodd)
      ctx.beginPath();
      ctx.rect(0, 0, logicalW, logicalH);
      ctx.rect(b.x, b.y, b.w, b.h);
      try { ctx.clip('evenodd'); } catch (e) { ctx.clip(); }
      ctx.fillStyle = 'rgba(10,18,30,.55)';
      ctx.fillRect(0, 0, logicalW, logicalH);
      // เงารูปเต็ม (ส่วนที่ถูกตัดทิ้ง) แบบจางๆ ให้เห็นว่าลาก/ซูมแล้วได้อะไร
      const cover = Math.max(b.w / l.img.width, b.h / l.img.height);
      const sc = cover * (l.imgZ || 1);
      const sw = l.img.width * sc, sh = l.img.height * sc;
      ctx.globalAlpha = .4;
      ctx.drawImage(l.img, b.x + (b.w - sw) / 2 + (l.imgX || 0), b.y + (b.h - sh) / 2 + (l.imgY || 0), sw, sh);
      ctx.restore();
      // ขอบขาว + ตาราง 3×3 บนส่วนที่เก็บ
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.lineWidth = .8; ctx.strokeStyle = 'rgba(255,255,255,.55)';
      for (let i = 1; i <= 2; i++) {
        ctx.beginPath(); ctx.moveTo(b.x + b.w * i / 3, b.y); ctx.lineTo(b.x + b.w * i / 3, b.y + b.h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(b.x, b.y + b.h * i / 3); ctx.lineTo(b.x + b.w, b.y + b.h * i / 3); ctx.stroke();
      }
      ctx.restore();
    }

    // V33: เส้นไกด์กึ่งกลาง + ระยะห่างเท่ากัน (สีชมพูแบบ Canva)
    function drawGuides() {
      if (!dragGuides) return;
      const g = dragGuides;
      ctx.save();
      ctx.strokeStyle = '#E01E8F'; ctx.lineWidth = 1.2; ctx.setLineDash([6, 5]);
      if (g.gx != null) { ctx.beginPath(); ctx.moveTo(g.gx, 0); ctx.lineTo(g.gx, logicalH); ctx.stroke(); }
      if (g.gy != null) { ctx.beginPath(); ctx.moveTo(0, g.gy); ctx.lineTo(logicalW, g.gy); ctx.stroke(); }
      if (g.gap) {
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(g.gap.x, g.gap.y1); ctx.lineTo(g.gap.x, g.gap.y2); ctx.stroke();
        // ป้ายตัวเลขระยะ (เท่ากันบน-ล่าง)
        const label = String(Math.round(g.gap.val));
        [ (g.gap.y1 + g.gap.mid) / 2, (g.gap.mid + g.gap.y2) / 2 ].forEach(cy => {
          ctx.fillStyle = '#E01E8F';
          const w = 10 + label.length * 6;
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') ctx.roundRect(g.gap.x + 5, cy - 8, w, 16, 8);
          else ctx.rect(g.gap.x + 5, cy - 8, w, 16);
          ctx.fill();
          ctx.fillStyle = '#fff'; ctx.font = "700 9px 'Kanit', sans-serif";
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(label, g.gap.x + 5 + w / 2, cy + .5);
        });
      }
      ctx.restore();
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
      onLayerResize     = callbacks.onLayerResize || null;   // V35
      canvas.style.touchAction = 'none';

      canvas.addEventListener('pointerdown', ev => {
        const p = toLogical(ev);
        // V35: จุดจับของชิ้นที่เลือกอยู่ มาก่อนการแตะเลเยอร์อื่น
        if (selectedIdx >= 0) {
          const hid = hitHandle(p);
          if (hid) {
            const l = layers[selectedIdx];
            if (hid === 'del') { deleteSelected(); ev.preventDefault(); return; }
            const sh = l.type === 'image' ? (l.h || l.w * l.ratio) : 0;
            drag = {
              kind: 'handle', idx: selectedIdx, h: hid, startX: p.x, startY: p.y, moved: false,
              sw: l.w || 0, sh, sx: l.x, sy: l.y, ssize: l.size || 0,
              sdist: Math.max(8, Math.hypot(p.x - l.x, p.y - l.y)),
            };
            try { canvas.setPointerCapture(ev.pointerId); } catch (e) {}
            ev.preventDefault();
            return;
          }
        }
        const idx = hitLayer(p);
        if (idx >= 0) {
          selectedIdx = idx;
          const l = layers[idx];
          drag = { kind: 'layer', idx, dx: p.x - l.x, dy: p.y - l.y, cx: l.imgX || 0, cy: l.imgY || 0, startX: p.x, startY: p.y, moved: false };
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
        if (drag.kind === 'handle') {
          // V35: ลากจุดจับ = ปรับขนาดอิสระ
          const l = layers[drag.idx]; if (!l) return;
          if (l.type === 'text') {
            // ⤡ มุมขวาล่าง: ขนาดฟอนต์แปรตามระยะจากจุดกึ่งกลางข้อความ
            const d = Math.hypot(p.x - drag.sx, p.y - drag.sy);
            const ns = clamp(Math.round(drag.ssize * d / drag.sdist), 8, 200);
            if (ns !== l.size) { l.size = ns; render(); if (onLayerResize) onLayerResize(l); }
          } else {
            const MIN = 16;
            const left = drag.sx - drag.sw / 2, right = drag.sx + drag.sw / 2;
            const top  = drag.sy - drag.sh / 2, bot   = drag.sy + drag.sh / 2;
            let w = drag.sw, h = drag.sh, ax = null, ay = null;
            if (drag.h.includes('e')) { w = clamp(p.x - left,  MIN, logicalW * 2); ax = left;  }
            if (drag.h.includes('w')) { w = clamp(right - p.x, MIN, logicalW * 2); ax = right; }
            if (drag.h.includes('s')) { h = clamp(p.y - top,   MIN, logicalH * 2); ay = top;   }
            if (drag.h.includes('n')) { h = clamp(bot - p.y,   MIN, logicalH * 2); ay = bot;   }
            if (drag.h.length === 2) {                     // มุม = คงสัดส่วนเดิม
              const k = Math.max(w / drag.sw, h / drag.sh);
              w = Math.max(MIN, drag.sw * k);
              h = Math.max(MIN, drag.sh * k);
            }
            l.w = w; l.h = h;
            l.x = ax != null ? (drag.h.includes('w') ? ax - w / 2 : ax + w / 2) : drag.sx;
            l.y = ay != null ? (drag.h.includes('n') ? ay - h / 2 : ay + h / 2) : drag.sy;
            render();
            if (onLayerResize) onLayerResize(l);
          }
          ev.preventDefault();
          return;
        }
        if (drag.kind === 'layer' && drag.moved) {
          const l = layers[drag.idx]; if (!l) return;
          if (l.type === 'image' && l._crop) {          // V31: โหมดครอป — เลื่อนรูป "ใน" กรอบ
            l.imgX = (drag.cx != null ? drag.cx : 0) + (p.x - drag.startX);
            l.imgY = (drag.cy != null ? drag.cy : 0) + (p.y - drag.startY);
          } else {
            let nx = clamp(p.x - drag.dx, 4, logicalW - 4);
            let ny = clamp(p.y - drag.dy, 4, logicalH - 4);
            // V33: snap กึ่งกลาง + ระยะห่างเท่ากันระหว่างบรรทัด (พร้อมเส้นไกด์)
            const SN = 6;
            const g = { gx: null, gy: null, gap: null };
            if (Math.abs(nx - logicalW / 2) < SN) { nx = logicalW / 2; g.gx = nx; }
            if (Math.abs(ny - logicalH / 2) < SN) { ny = logicalH / 2; g.gy = ny; }
            const others = layers.filter((o, k) => k !== drag.idx && o.type === 'text').map(o => o.y).sort((a, b) => a - b);
            const prev = others.filter(y => y < ny - 2).pop();
            const next = others.find(y => y > ny + 2);
            if (prev != null && next != null) {
              const mid = (prev + next) / 2;
              if (Math.abs(ny - mid) < SN) {
                ny = mid;
                g.gap = { x: Math.min(logicalW - 40, nx + 14), y1: prev, y2: next, mid: ny, val: (next - prev) / 2 };
              }
            }
            l.x = nx; l.y = ny;
            dragGuides = (g.gx != null || g.gy != null || g.gap) ? g : null;
          }
          render();
        } else if (drag.kind === 'photo' && drag.moved) {
          imgOff.x = drag.ox + (p.x - drag.startX);
          imgOff.y = drag.oy + (p.y - drag.startY);
          render();
        }
        ev.preventDefault();
      });

      let lastTap = { t: 0, idx: -1 };
      const endDrag = ev => {
        if (!drag) return;
        if (dragGuides) { dragGuides = null; render(); }   // V33: เก็บเส้นไกด์
        const wasTap = !drag.moved;
        const kind = drag.kind;
        const idx = drag.idx;
        drag = null;
        // V34: แตะพื้นที่ว่าง — ถ้ามีชิ้นเลือกอยู่ → ยกเลิกเลือก · ถ้าไม่มี → เปิดเลือกไฟล์ (เดิม)
        if (wasTap && kind === 'none') {
          if (selectedIdx >= 0) { selectLayer(-1); }
          else if (callbacks.onEmptyTap) callbacks.onEmptyTap();
        }
        // V32: แตะสองครั้งบนชิ้นงาน → แก้ไขทันที (Canva-style)
        if (wasTap && kind === 'layer') {
          const now = Date.now();
          if (idx === lastTap.idx && now - lastTap.t < 400) {
            if (callbacks.onLayerDoubleTap) callbacks.onLayerDoubleTap(layers[idx]);
            lastTap = { t: 0, idx: -1 };
          } else lastTap = { t: now, idx };
        } else lastTap = { t: 0, idx: -1 };
      };
      canvas.addEventListener('pointerup', endDrag);
      canvas.addEventListener('pointercancel', endDrag);
    }

    // ─── บันทึก / export ───
    function download(filename) {
      if (!userImage && !layers.length) return;
      let dataUrl;
      // V35: ซ่อนกรอบเลือก/จุดจับก่อน export แล้วคืนภาพเดิม
      hideOverlay = true; render();
      try { dataUrl = canvas.toDataURL('image/jpeg', 0.92); }
      catch (e) {
        hideOverlay = false; render();
        if (typeof DMC !== 'undefined') DMC.toast('บันทึกภาพไม่ได้ (กรอบนี้มีข้อจำกัดด้านลิขสิทธิ์รูป) — ลองแบบอื่น หรือแคปหน้าจอแทนได้ครับ', 'error', 4500);
        return;
      }
      hideOverlay = false; render();
      const link = document.createElement('a');
      link.download = filename || 'preview-diamond-cute-studio.jpg';
      link.href = dataUrl;
      link.click();
    }

    // ══ V31: Template Studio API — แปลงงานออกแบบ ⇄ JSON ══
    const TEXT_FIELDS = ['text','x','y','size','color','bold','font','colorMode','color2','gradientDir','strokeW','strokeColor','shadow','shadowColor','curve'];
    function getTemplateData() {
      const out = [];
      layers.forEach(l => {
        if (l.type === 'text') {
          const t = { type: 'text' };
          TEXT_FIELDS.forEach(k => { t[k] = l[k]; });
          out.push(t);
        } else if (l.type === 'image' && l.url) {   // เก็บเฉพาะรูปที่มี URL (อัปโหลดแล้ว)
          out.push({ type: 'image', url: l.url, x: l.x, y: l.y, w: l.w, h: l.h, imgZ: l.imgZ || 1, imgX: l.imgX || 0, imgY: l.imgY || 0, radius: l.radius || 0,
            brP: l.brP != null ? l.brP : 100, ctP: l.ctP != null ? l.ctP : 100, saP: l.saP != null ? l.saP : 100, blP: l.blP || 0 });
        }
      });
      return { canvas: { w: logicalW, h: logicalH, bg: baseBg, bgImageUrl: bgImageUrl || '' }, layers: out };
    }

    async function loadTemplateData(tpl) {
      const data = tpl || {};
      const cw = (data.canvas && data.canvas.w) || baseSize.w;
      const ch = (data.canvas && data.canvas.h) || baseSize.h;
      currentTpl = { design: true, name: data.name || 'เทมเพลต' };
      const fit = fitSize(cw / Math.max(1, ch));
      applySize(fit.w, fit.h);
      const sc = fit.w / cw;                                       // สเกลพิกัดจากขนาดต้นฉบับ
      baseBg = (data.canvas && data.canvas.bg) || '#FFFFFF';
      bgImage = null; bgImageUrl = '';
      if (data.canvas && data.canvas.bgImageUrl) {
        try { await setBgImageFromUrl(data.canvas.bgImageUrl); } catch (e) { console.warn('bg image load failed', e); }
      }
      imgOff = { x: 0, y: 0 };
      // เคลียร์เลเยอร์ของเทมเพลตก่อนหน้า (ที่ลูกค้ายังไม่ได้แก้) — เก็บงานของลูกค้าไว้
      layers = layers.filter(l => !l.auto);
      selectedIdx = -1;
      const arr = Array.isArray(data.layers) ? data.layers : [];
      for (const d of arr) {
        if (d.type === 'text') {
          addTextLayer(d.text, Object.assign({}, d, {
            auto: true,
            x: d.x * sc, y: d.y * sc,
            size: Math.max(8, Math.round((d.size || 16) * sc)),
          }));
        } else if (d.type === 'image' && d.url) {
          try {
            await addImageLayerFromUrl(d.url, {
              auto: true,
              x: d.x * sc, y: d.y * sc,
              w: d.w * sc, h: d.h * sc,
              imgZ: d.imgZ, imgX: (d.imgX || 0) * sc, imgY: (d.imgY || 0) * sc,
              radius: d.radius,
              brP: d.brP, ctP: d.ctP, saP: d.saP, blP: d.blP,
            });
          } catch (e) { console.warn('tpl image load failed', e); }
        }
      }
      selectedIdx = -1;
      render(); notifySel(); notifyLayers();
    }

    function setBgImageFromUrl(url) {                // V32: รูปพื้นหลัง — canvas ปรับสัดส่วนตามรูปจริง
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          bgImage = img; bgImageUrl = url;
          currentTpl = { design: true, name: currentTpl.name || 'studio' };
          const fit = fitSize(img.width / Math.max(1, img.height));
          applySize(fit.w, fit.h);
          render(); resolve(img);
        };
        img.onerror = () => reject(new Error('โหลดรูปพื้นหลังไม่สำเร็จ'));
        img.src = url;
      });
    }
    function clearBgImage() { bgImage = null; bgImageUrl = ''; render(); }
    function hasBgImage() { return !!bgImage; }

    function setBase(opts = {}) {                    // สตูดิโอ: ตั้งขนาด/พื้นหลัง
      if (opts.w && opts.h) {
        currentTpl = { design: true, name: 'studio' };
        bgImage = null; bgImageUrl = '';             // เปลี่ยนขนาด = เริ่มผืนใหม่
        const fit = fitSize(opts.w / opts.h);
        applySize(fit.w, fit.h);
      }
      if (opts.bg) baseBg = opts.bg;
      render();
    }
    function getLayers() { return layers; }

    render();
    return {
      loadImage, selectBuiltin, selectCustomFrame, setCaption, render, download,
      hasImage: () => !!userImage,
      hasContent: () => !!userImage || layers.length > 0,
      getBlob: (cb) => {
        // V35: toBlob เก็บพิกเซล ณ ตอนเรียก — ซ่อนกรอบเลือก/จุดจับก่อน แล้วคืนภาพเดิมได้ทันที
        try { hideOverlay = true; render(); canvas.toBlob(b => cb(b), 'image/jpeg', 0.92); }
        catch (e) { cb(null); }
        finally { hideOverlay = false; render(); }
      },
      // V13 layer API
      addTextLayer, addImageLayerFromFile, updateSelected, deleteSelected,
      getSelected, selectLayer, setPhotoZoom, attachInteraction,
      isCustomActive: () => !!(currentTpl.custom || currentTpl.design),
      // V31 Template Studio API
      addImageLayerFromUrl, replaceSelectedImage, moveSelected,
      getTemplateData, loadTemplateData, setBase, getLayers,
      setBgImageFromUrl, clearBgImage, hasBgImage,
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
  { v:'Kanit',        label:'Kanit — ทันสมัย'   },
  { v:'Sarabun',      label:'Sarabun — ทางการ'  },
  { v:'Prompt',       label:'Prompt — สะอาดตา'  },
  { v:'Mali',         label:'Mali — ลายมือน่ารัก' },
  { v:'Mitr',         label:'Mitr — กลมมน'      },
  { v:'Itim',         label:'Itim — เขียนเล่น'   },
  { v:'Sriracha',     label:'Sriracha — ลายมือเอียง' },
  { v:'Charm',        label:'Charm — หวานพลิ้ว'  },
  { v:'Pattaya',      label:'Pattaya — ป้ายร้าน' },
  { v:'Chonburi',     label:'Chonburi — หัวกลมหนา' },
  { v:'Pridi',        label:'Pridi — คลาสสิก'    },
  { v:'Taviraj',      label:'Taviraj — หนังสือพิมพ์' },
  { v:'Athiti',       label:'Athiti — บางเฉียบ'  },
  { v:'Bai Jamjuree', label:'Bai Jamjuree — เหลี่ยมสมัยใหม่' },
  { v:'Krub',         label:'Krub — โมโนสไตล์'   },
  { v:'Chakra Petch', label:'Chakra Petch — เกม/เทค' },
];

// ═══ V31: mountDesigner — ตัว editor ใช้ร่วมกัน (ลูกค้า + Template Studio ของแอดมิน) ═══
window.__PV_mountDesigner = async function mountDesigner(body, options) {
  if (!body) return null;
  const IS_ADMIN = options.mode === 'admin';

    const allowed = (options.templates && options.templates.length)
      ? options.templates.map(t => String(t).trim().toLowerCase())
      : null;

    const fontMenuItems = (window.__PV_FONTS || []).map(f =>
      '<button type="button" class="pv-font-item" data-font="' + f.v + '" data-label="' + f.label + '" role="option" disabled>' +
        '<span class="pv-font-sample" style="font-family:\'' + f.v + '\'">สวัสดี Aa</span>' +
        '<span class="pv-font-name">' + f.label + '</span>' +
        '<span class="pv-font-state">⏳</span>' +
      '</button>').join('');

    body.innerHTML = [
      // ═══ V33: โครงแบบ Canva — ภาพอยู่บนเสมอ (ย่ออัตโนมัติ) · แผงเด้ง "เหนือ" dock · dock ไอคอน+ข้อความล่างสุด ═══
      '<div class="pvd-layout">',
        // ── V35: เลือกเทมเพลต — Drop-down มุมซ้ายบน (ย้ายจาก dock) ──
        '<div class="pvd-topbar" id="pv-tpl-topbar">',
          '<div class="pv-tpl-dd" id="pv-tpl-dd">',
            '<button type="button" class="pv-tpl-dd-btn" id="pv-tpl-dd-btn" aria-haspopup="listbox" aria-expanded="false">',
              '🎨 <span id="pv-tpl-dd-label">เลือกเทมเพลต</span> <span class="pv-tpl-dd-caret" aria-hidden="true">▾</span>',
            '</button>',
            '<div class="pv-tpl-dd-menu" id="pv-tpl-dd-menu" style="display:none" role="listbox" aria-label="เลือกเทมเพลต">',
              '<div class="template-scroll pv-tpl-dd-list" id="template-chips-row"></div>',
              '<div id="pv-caption-row" class="pv-tpl-dd-cap"><input class="form-input" id="preview-caption" maxlength="60" placeholder="ข้อความใต้รูป (ไม่บังคับ) เช่น Happy Birthday 🎂" style="font-size:.85rem"></div>',
            '</div>',
          '</div>',
        '</div>',
        '<div class="pvd-stage" id="pvd-stage">',
          '<canvas id="preview-canvas" title="แตะเพื่อเลือกชิ้นงาน"></canvas>',
        '</div>',
        '<div id="preview-upload-hint" class="preview-hint pvd-hintline">💡 <b>① เลือกเทมเพลต (มุมซ้ายบน)</b> → <b>② แตะข้อความเพื่อแก้</b> (แตะ 2 ครั้ง = พิมพ์ทันที) → <b>③ ลากเพื่อย้าย</b></div>',

        // ── แผงเครื่องมือ (โผล่เหนือ dock ทีละแผง) ──
        '<div class="pvd-panel" id="pv-panel" style="display:none">',

          '<div class="pv-pane" id="pv-panel-edit" style="display:none">',
            '<div class="pv-layer-row" id="pv-text-row">',
              '<input type="text" class="form-input pv-text-input" id="pv-text-input" maxlength="60" placeholder="พิมพ์ข้อความ...">',
            '</div>',
            // V35: ปรับขนาดฟอนต์ครบวงจร — สไลเดอร์ + ปุ่ม −/+ + ช่องตัวเลขพิมพ์เองได้ (B ย้ายไปแถบ dock)
            '<div class="pv-layer-row">',
              '<span class="pv-row-ico" title="ขนาด">🔠</span>',
              '<input type="range" id="pv-size" min="10" max="72" step="1" aria-label="ขนาดตัวอักษร">',
              '<button type="button" class="pv-mini-btn pv-step-btn" id="pv-size-minus" title="ลดขนาด" aria-label="ลดขนาดตัวอักษร">−</button>',
              '<input type="number" class="pv-size-num" id="pv-size-num" min="8" max="200" step="1" inputmode="numeric" aria-label="ขนาดตัวอักษร (พิมพ์ระบุเองได้)" title="พิมพ์ขนาดที่ต้องการได้เลย">',
              '<button type="button" class="pv-mini-btn pv-step-btn" id="pv-size-plus" title="เพิ่มขนาด" aria-label="เพิ่มขนาดตัวอักษร">+</button>',
            '</div>',
          '</div>',

          '<div class="pv-pane" id="pv-pane-color" style="display:none">',
            '<div class="pv-mode-row" id="pv-color-modes">',
              '<button type="button" class="pv-mode active" data-mode="solid">สีเดียว</button>',
              '<button type="button" class="pv-mode" data-mode="gradient">ไล่เฉด</button>',
              '<button type="button" class="pv-mode" data-mode="rainbow">🌈 รุ้ง</button>',
            '</div>',
            '<div class="pv-grad-row" id="pv-grad-row" style="display:none">',
              '<div class="pv-ab" id="pv-grad-target">',
                '<button type="button" class="pv-ab-btn active" data-t="color">สีต้น</button>',
                '<button type="button" class="pv-ab-btn" data-t="color2">สีปลาย</button>',
              '</div>',
              '<div class="pv-ab" id="pv-grad-dir">',
                '<button type="button" class="pv-ab-btn active" data-d="h">↔︎</button>',
                '<button type="button" class="pv-ab-btn" data-d="v">↕︎</button>',
              '</div>',
            '</div>',
            '<div class="pv-swatch-row" id="pv-color-row">',
              '<div class="pv-swatches" id="pv-swatches"></div>',
              '<button type="button" class="pv-swatch pv-swatch-custom" id="pv-custom-toggle" title="ปรับสีเอง">🎨</button>',
            '</div>',
            '<div class="pv-hsl" id="pv-hsl" style="display:none">',
              '<input type="range" id="pv-hue" class="pv-hue" min="0" max="360" step="1" value="160" aria-label="เฉดสี">',
              '<input type="range" id="pv-light" class="pv-light" min="8" max="95" step="1" value="45" aria-label="ความสว่าง">',
            '</div>',
          '</div>',

          '<div class="pv-pane" id="pv-pane-fx" style="display:none">',
            '<div class="pv-preset-row" id="pv-presets">',
              '<button type="button" class="pv-preset" data-p="none">ธรรมดา</button>',
              '<button type="button" class="pv-preset" data-p="soft">เงานุ่ม</button>',
              '<button type="button" class="pv-preset" data-p="white">ขอบขาว</button>',
              '<button type="button" class="pv-preset" data-p="black">ขอบดำ</button>',
              '<button type="button" class="pv-preset" data-p="neon">นีออน</button>',
              '<button type="button" class="pv-preset" data-p="poster">โปสเตอร์</button>',
            '</div>',
            '<div class="pv-fx-row"><span class="pv-fx-label">🖊️ ขอบ</span><input type="range" id="pv-stroke" min="0" max="12" step="1" value="0"><span class="pv-val" id="pv-stroke-val">0</span><div class="pv-strokecolors" id="pv-strokecolors"></div></div>',
            '<div class="pv-fx-row"><span class="pv-fx-label">🌫️ เงา</span><input type="range" id="pv-shadow" min="0" max="30" step="1" value="0"><span class="pv-val" id="pv-shadow-val">0</span></div>',
            '<div class="pv-fx-row"><span class="pv-fx-label">🌈 โค้ง</span><input type="range" id="pv-curve" min="-100" max="100" step="2" value="0"><span class="pv-val" id="pv-curve-val">0</span><button type="button" class="pv-mini-btn" id="pv-curve-reset" title="คืนตรง">↺</button></div>',
          '</div>',

          '<div class="pv-pane" id="pv-pane-font" style="display:none">',
            '<div class="pv-font-menu pv-font-inline" id="pv-font-menu" role="listbox">', fontMenuItems, '</div>',
          '</div>',

          // รูป: ครอป / รูปทรง / ปรับภาพ
          '<div class="pv-pane" id="pv-panel-crop" style="display:none">',
            '<div class="pvd-panel-tip">✂️ ลากบนรูป = เลื่อนรูปในกรอบ · ส่วนจาง = ถูกตัดทิ้ง</div>',
            '<div class="pv-fx-row"><span class="pv-fx-label">🔍 ซูมใน</span><input type="range" id="pv-imgzoom" min="1" max="3" step="0.02" value="1" aria-label="ซูมรูปในกรอบ"><span class="pv-val" id="pv-imgzoom-val">1.0×</span></div>',
            '<button type="button" class="pv-btn" id="pv-crop-toggle" style="width:100%;justify-content:center">✅ เสร็จสิ้นการครอป</button>',
          '</div>',
          '<div class="pv-pane" id="pv-panel-shape" style="display:none">',
            '<div class="pv-fx-row"><span class="pv-fx-label">🔠 ขนาด</span><input type="range" id="pv-size-img" min="24" max="240" step="1" aria-label="ขนาดรูป"><span class="pv-val" id="pv-size-img-val">0</span></div>',
            '<div class="pv-fx-row">',
              '<span class="pv-fx-label">📐 สัดส่วน</span>',
              '<div class="pv-preset-row" id="pv-aspects" style="padding-bottom:0">',
                '<button type="button" class="pv-preset" data-a="orig">ตามรูป</button>',
                '<button type="button" class="pv-preset" data-a="1">1:1</button>',
                '<button type="button" class="pv-preset" data-a="0.8">4:5</button>',
                '<button type="button" class="pv-preset" data-a="1.7778">16:9</button>',
              '</div>',
            '</div>',
            '<div class="pv-fx-row"><span class="pv-fx-label">⭕ มุมมน</span><input type="range" id="pv-radius" min="0" max="100" step="1" value="0"><span class="pv-val" id="pv-radius-val">0</span></div>',
          '</div>',
          '<div class="pv-pane" id="pv-panel-adjust" style="display:none">',
            '<div class="pv-fx-row"><span class="pv-fx-label">☀️ สว่าง</span><input type="range" id="pv-flt-br" min="40" max="160" step="2" value="100"><span class="pv-val" id="pv-flt-br-val">100%</span></div>',
            '<div class="pv-fx-row"><span class="pv-fx-label">◐ คมชัด</span><input type="range" id="pv-flt-ct" min="40" max="160" step="2" value="100"><span class="pv-val" id="pv-flt-ct-val">100%</span></div>',
            '<div class="pv-fx-row"><span class="pv-fx-label">🌈 สีสด</span><input type="range" id="pv-flt-sa" min="0" max="200" step="4" value="100"><span class="pv-val" id="pv-flt-sa-val">100%</span></div>',
            '<div class="pv-fx-row"><span class="pv-fx-label">💧 เบลอ</span><input type="range" id="pv-flt-bl" min="0" max="6" step="0.2" value="0"><span class="pv-val" id="pv-flt-bl-val">0</span><button type="button" class="pv-mini-btn" id="pv-flt-reset" title="คืนค่าเดิม">↺</button></div>',
          '</div>',
          '<div class="pv-pane" id="pv-panel-order" style="display:none">',
            '<div class="pv-add-row" style="margin:0">',
              '<button type="button" class="pv-btn" id="pv-to-back">⬇️ ไปหลังสุด</button>',
              '<button type="button" class="pv-btn" id="pv-to-front">⬆️ มาหน้าสุด</button>',
            '</div>',
          '</div>',

          // V34: สติกเกอร์ + อิโมจิ (วางเป็นเลเยอร์ข้อความ emoji)
          '<div class="pv-pane" id="pv-panel-sticker" style="display:none">',
            '<div class="pvd-panel-tip">แตะสติกเกอร์เพื่อวางบนภาพ แล้วลาก/ปรับขนาดได้</div>',
            '<div class="pv-emoji-grid" id="pv-sticker-grid"></div>',
          '</div>',
          '<div class="pv-pane" id="pv-panel-emoji" style="display:none">',
            '<div class="pvd-panel-tip">แตะอิโมจิเพื่อวางบนภาพ</div>',
            '<div class="pv-emoji-grid" id="pv-emoji-grid"></div>',
          '</div>',
          // ซูม/เลื่อนรูปพื้น (ลูกค้า)
          '<div class="pv-pane" id="pv-panel-zoom" style="display:none">',
            '<div class="pv-zoom-row" id="pv-zoom-row" style="margin:0;max-width:none">',
              '<span>🔍</span>',
              '<input type="range" id="pv-zoom" min="1" max="3" step="0.02" value="1" aria-label="ซูมรูป">',
              '<span class="pv-zoom-hint">ลากรูปเพื่อเลื่อนตำแหน่งได้</span>',
            '</div>',
          '</div>',

          // (V35: "เลือกเทมเพลต" ย้ายไป Drop-down มุมซ้ายบนแล้ว — pv-tpl-topbar)
        '</div>',

        // ── Dock ไอคอน+ข้อความ (เปลี่ยนตามสิ่งที่เลือก) ──
        '<div class="pvd-dock" id="pv-dock"></div>',

        // ── แถวปุ่มหลัก (ลูกค้า) ──
        '<div class="pvd-foot" id="pv-upload-row">',
          '<button class="btn btn-primary pvd-cta" id="preview-attach-btn" disabled>📎 ใช้แบบนี้ในออเดอร์</button>',
          '<input type="file" id="preview-file-input" accept="image/*" style="display:none">',
          '<button id="preview-download-btn" class="pvd-cta-mini" disabled title="บันทึกภาพลงเครื่อง">💾</button>',
        '</div>',

        // input แฝง (เลเยอร์รูป)
        '<input type="file" id="pv-logo-input" accept="image/*" style="display:none">',
        '<input type="file" id="pv-replace-input" accept="image/*" style="display:none">',
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
    const textIn    = document.getElementById('pv-text-input');
    const sizeIn    = document.getElementById('pv-size');
    const sizeNumIn = document.getElementById('pv-size-num');       // V35: ช่องเลขขนาดฟอนต์ (พิมพ์เองได้)
    const delBtn    = document.getElementById('pv-del');
    const capRow    = document.getElementById('pv-caption-row');
    // ── V33: ระบบแผง (เด้งเหนือ dock) + dock ไอคอน ──
    const panelEl = document.getElementById('pv-panel');
    const dockEl  = document.getElementById('pv-dock');
    const PANES = {};
    ['pv-panel-edit','pv-pane-color','pv-pane-fx','pv-pane-font','pv-panel-crop','pv-panel-shape',
     'pv-panel-adjust','pv-panel-order','pv-panel-zoom',
     'pv-panel-sticker','pv-panel-emoji'].forEach(id => { PANES[id] = document.getElementById(id); });
    let openPane = null;
    function openPanel(id) {
      openPane = id;
      Object.keys(PANES).forEach(k => { if (PANES[k]) PANES[k].style.display = (k === id) ? '' : 'none'; });
      if (panelEl) panelEl.style.display = id ? '' : 'none';
      // V35: แตะเฉพาะปุ่มที่ผูกกับแผง — ไม่ไปล้างสถานะปุ่ม toggle อย่าง "ตัวหนา"
      dockEl?.querySelectorAll('.pv-dock-item').forEach(b => { if (b.dataset.pane) b.classList.toggle('active', b.dataset.pane === id); });
    }
    function closePanel() { openPanel(null); }
    const sizeImgIn = document.getElementById('pv-size-img');
    const swatchBox = document.getElementById('pv-swatches');
    const modesEl   = document.getElementById('pv-color-modes');
    const gradRow   = document.getElementById('pv-grad-row');
    const hslBox    = document.getElementById('pv-hsl');
    const hueIn     = document.getElementById('pv-hue');
    const lightIn   = document.getElementById('pv-light');
    const strokeIn  = document.getElementById('pv-stroke');
    const shadowIn  = document.getElementById('pv-shadow');
    const curveIn   = document.getElementById('pv-curve');
    const fontMenu  = document.getElementById('pv-font-menu');
    const gradTargetEl = document.getElementById('pv-grad-target');
    const gradDirEl    = document.getElementById('pv-grad-dir');
    const presetsEl    = document.getElementById('pv-presets');

    // ── V30: ระบบสีหนึ่งเดียว (ไร้ dialog ระบบ) ──
    const SWATCHES = ['#111111','#FFFFFF','#6B7280','#E11D48','#F97316','#F59E0B','#FFD84D','#10B981','#0B6B54','#0EA5E9','#2563EB','#7C3AED','#EC4899','#92400E'];
    let colorTarget = 'color';                       // color | color2 (สีต้น/สีปลายของไล่เฉด)
    const hslToHex = (h, sPct, lPct) => {
      const l = lPct / 100, sat = sPct / 100;
      const a = sat * Math.min(l, 1 - l);
      const f = n => { const k = (n + h / 30) % 12; const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1))); return Math.round(255 * c).toString(16).padStart(2, '0'); };
      return '#' + f(0) + f(8) + f(4);
    };
    function markActiveSwatch(color) {
      swatchBox?.querySelectorAll('.pv-swatch').forEach(el => {
        el.classList.toggle('active', (el.dataset.color || '').toLowerCase() === String(color || '').toLowerCase());
      });
    }
    function applyColor(c) {
      const l = api.getSelected(); if (!l) return;
      const props = {}; props[colorTarget] = c;
      api.updateSelected(props);
      markActiveSwatch(c);
    }
    if (swatchBox) {
      SWATCHES.forEach(c => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'pv-swatch';
        b.dataset.color = c; b.style.background = c; b.title = c;
        b.setAttribute('aria-label', 'สี ' + c);
        b.addEventListener('click', () => applyColor(c));
        swatchBox.appendChild(b);
      });
    }
    document.getElementById('pv-custom-toggle')?.addEventListener('click', e => {
      if (!hslBox) return;
      const open = hslBox.style.display === 'none';
      hslBox.style.display = open ? '' : 'none';
      e.currentTarget.classList.toggle('open', open);
    });
    function hslApply() {
      const c = hslToHex(Number(hueIn.value), 90, Number(lightIn.value));
      lightIn.style.setProperty('--h', hueIn.value);
      applyColor(c);
    }
    hueIn?.addEventListener('input', hslApply);
    lightIn?.addEventListener('input', hslApply);

    // โหมดสี: solid / gradient / rainbow
    modesEl?.querySelectorAll('.pv-mode').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        modesEl.querySelectorAll('.pv-mode').forEach(x => x.classList.toggle('active', x === btn));
        gradRow.style.display = mode === 'gradient' ? '' : 'none';
        const showPalette = mode !== 'rainbow';
        document.getElementById('pv-color-row').style.display = showPalette ? '' : 'none';
        if (mode !== 'gradient') { colorTarget = 'color'; syncGradTarget(); }
        api.updateSelected({ colorMode: mode });
      });
    });
    function syncGradTarget() {
      gradTargetEl?.querySelectorAll('.pv-ab-btn').forEach(b => b.classList.toggle('active', b.dataset.t === colorTarget));
    }
    gradTargetEl?.querySelectorAll('.pv-ab-btn').forEach(b => {
      b.addEventListener('click', () => {
        colorTarget = b.dataset.t; syncGradTarget();
        const l = api.getSelected(); if (l) markActiveSwatch(l[colorTarget]);
      });
    });
    gradDirEl?.querySelectorAll('.pv-ab-btn').forEach(b => {
      b.addEventListener('click', () => {
        gradDirEl.querySelectorAll('.pv-ab-btn').forEach(x => x.classList.toggle('active', x === b));
        api.updateSelected({ gradientDir: b.dataset.d });
      });
    });

    // ── V30: เอฟเฟกต์ — สีขอบย่อ + preset สำเร็จ ──
    const STROKE_COLORS = ['#FFFFFF','#111111','#E11D48','#F59E0B','#10B981','#2563EB'];
    const strokeBox = document.getElementById('pv-strokecolors');
    if (strokeBox) {
      STROKE_COLORS.forEach(c => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'pv-swatch pv-swatch-sm';
        b.dataset.color = c; b.style.background = c; b.title = 'สีขอบ ' + c;
        b.addEventListener('click', () => {
          api.updateSelected({ strokeColor: c });
          strokeBox.querySelectorAll('.pv-swatch').forEach(x => x.classList.toggle('active', x === b));
        });
        strokeBox.appendChild(b);
      });
    }
    function markStroke(color) {
      strokeBox?.querySelectorAll('.pv-swatch').forEach(x => x.classList.toggle('active', (x.dataset.color || '').toLowerCase() === String(color || '').toLowerCase()));
    }
    const PRESETS = {
      none:  { strokeW: 0, shadow: 0 },
      soft:  { strokeW: 0, shadow: 12, shadowColor: 'rgba(0,0,0,.45)' },
      white: { strokeW: 4, strokeColor: '#FFFFFF', shadow: 6, shadowColor: 'rgba(0,0,0,.35)' },
      black: { strokeW: 4, strokeColor: '#111111', shadow: 0 },
      neon:  { strokeW: 0, shadow: 22, shadowColor: '#22E4AC' },
      poster:{ strokeW: 7, strokeColor: '#111111', shadow: 10, shadowColor: 'rgba(0,0,0,.5)' },
    };
    presetsEl?.querySelectorAll('.pv-preset').forEach(b => {
      b.addEventListener('click', () => {
        const pr = PRESETS[b.dataset.p]; if (!pr) return;
        api.updateSelected(pr);
        presetsEl.querySelectorAll('.pv-preset').forEach(x => x.classList.toggle('active', x === b));
        const l = api.getSelected();
        if (l) { strokeIn.value = l.strokeW || 0; shadowIn.value = l.shadow || 0; setVal('pv-stroke-val', l.strokeW || 0); setVal('pv-shadow-val', l.shadow || 0); markStroke(l.strokeColor); }
      });
    });
    // V34: badge ตัวเลขระดับ (sync ทุกครั้งที่เลื่อน)
    function setVal(id, txt) { const el = document.getElementById(id); if (el) el.textContent = txt; }
    function curveTxt(v) { v = parseInt(v, 10) || 0; return v === 0 ? '0 (ตรง)' : (v > 0 ? '+' + v : String(v)); }
    strokeIn?.addEventListener('input', e => { const v = parseInt(e.target.value, 10) || 0; api.updateSelected({ strokeW: v }); setVal('pv-stroke-val', v); });
    shadowIn?.addEventListener('input', e => { const v = parseInt(e.target.value, 10) || 0; api.updateSelected({ shadow: v }); setVal('pv-shadow-val', v); });
    curveIn?.addEventListener('input', e => { const v = parseInt(e.target.value, 10) || 0; api.updateSelected({ curve: v }); setVal('pv-curve-val', curveTxt(v)); });
    document.getElementById('pv-curve-reset')?.addEventListener('click', () => { curveIn.value = 0; api.updateSelected({ curve: 0 }); setVal('pv-curve-val', curveTxt(0)); });

    // ── V31/33: เครื่องมือเลเยอร์รูป ──
    const radiusIn  = document.getElementById('pv-radius');
    const cropBtn   = document.getElementById('pv-crop-toggle');   // V33: ปุ่ม "เสร็จสิ้นการครอป"
    const imgZoomIn = document.getElementById('pv-imgzoom');
    const aspectsEl = document.getElementById('pv-aspects');
    function setCropMode(on) {
      const l = api.getSelected(); if (!l || l.type !== 'image') return;
      l._crop = !!on;
      if (on) {
        imgZoomIn.value = l.imgZ || 1;
        if (hintEl) hintEl.innerHTML = '✂️ <b>ลากบนรูป = เลื่อนรูปในกรอบ</b> · ส่วนจาง = ถูกตัดทิ้ง · เสร็จแล้วกด ✅';
      } else if (hintEl) hintEl.textContent = '📌 ลากเพื่อจัดตำแหน่ง · แตะชิ้นอื่นเพื่อสลับ';
      api.render();
    }

    radiusIn?.addEventListener('input', e => {
      const v = parseInt(e.target.value, 10) || 0;
      api.updateSelected({ radius: v });
      setVal('pv-radius-val', v >= 100 ? '⭕ วงกลม' : v + '%');
    });
    cropBtn?.addEventListener('click', () => { setCropMode(false); closePanel(); });   // ✅ เสร็จสิ้นการครอป
    imgZoomIn?.addEventListener('input', e => { const v = clampNum(parseFloat(e.target.value) || 1, 1, 3); api.updateSelected({ imgZ: v }); setVal('pv-imgzoom-val', v.toFixed(1) + '×'); });
    function clampNum(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    aspectsEl?.querySelectorAll('.pv-preset').forEach(b => {
      b.addEventListener('click', () => {
        const l = api.getSelected(); if (!l || l.type !== 'image') return;
        const a = b.dataset.a;
        const h = a === 'orig' ? l.w * l.ratio : l.w / parseFloat(a);
        api.updateSelected({ h, imgZ: 1, imgX: 0, imgY: 0 });
        aspectsEl.querySelectorAll('.pv-preset').forEach(x => x.classList.toggle('active', x === b));
      });
    });
    document.getElementById('pv-replace-input')?.addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return;
      try { await api.replaceSelectedImage(f); DMC.toast('เปลี่ยนรูปแล้ว ✓', 'success'); }
      catch (err) { DMC.toast(err.message || 'เปลี่ยนรูปไม่สำเร็จ', 'error'); }
      e.target.value = '';
    });
    document.getElementById('pv-to-back')?.addEventListener('click', () => api.moveSelected('back'));
    document.getElementById('pv-to-front')?.addEventListener('click', () => api.moveSelected('front'));

    // V32: เครื่องมือปรับภาพ
    const fltBr = document.getElementById('pv-flt-br');
    const fltCt = document.getElementById('pv-flt-ct');
    const fltSa = document.getElementById('pv-flt-sa');
    const fltBl = document.getElementById('pv-flt-bl');
    fltBr?.addEventListener('input', e => { const v = parseInt(e.target.value, 10); api.updateSelected({ brP: v }); setVal('pv-flt-br-val', v + '%'); });
    fltCt?.addEventListener('input', e => { const v = parseInt(e.target.value, 10); api.updateSelected({ ctP: v }); setVal('pv-flt-ct-val', v + '%'); });
    fltSa?.addEventListener('input', e => { const v = parseInt(e.target.value, 10); api.updateSelected({ saP: v }); setVal('pv-flt-sa-val', v + '%'); });
    fltBl?.addEventListener('input', e => { const v = parseFloat(e.target.value); api.updateSelected({ blP: v }); setVal('pv-flt-bl-val', v.toFixed(1)); });
    document.getElementById('pv-flt-reset')?.addEventListener('click', () => {
      api.updateSelected({ brP: 100, ctP: 100, saP: 100, blP: 0 });
      if (fltBr) fltBr.value = 100; if (fltCt) fltCt.value = 100;
      if (fltSa) fltSa.value = 100; if (fltBl) fltBl.value = 0;
      setVal('pv-flt-br-val', '100%'); setVal('pv-flt-ct-val', '100%'); setVal('pv-flt-sa-val', '100%'); setVal('pv-flt-bl-val', '0.0');
    });


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

    // โหลดฟอนต์ทั้งหมดทันทีที่เปิด Designer — แถวไหนพร้อมแล้วค่อยกดได้ (User เห็นสถานะ ⏳→✓ ชัด)
    (window.__PV_FONTS || []).forEach(f => {
      loadFontFamily(f.v).then(() => {
        const it = fontMenu?.querySelector('.pv-font-item[data-font="' + f.v + '"]');
        if (it) {
          it.disabled = false;
          const st = it.querySelector('.pv-font-state');
          if (st) st.textContent = '';
          const sample = it.querySelector('.pv-font-sample');
          if (sample) sample.style.fontFamily = "'" + f.v + "', sans-serif";   // ตอกย้ำหลังไฟล์ฟอนต์มาแล้ว
        }
        // ฟอนต์ที่เลเยอร์ใช้อยู่เพิ่งโหลดเสร็จ → วาดใหม่ให้เห็นผลทันที
        try { api.render(); } catch (e) {}
      });
    });

    // ── V30: เลือกฟอนต์ (แถวในแท็บฟอนต์) ──
    function markActiveFont(fam) {
      fontMenu?.querySelectorAll('.pv-font-item').forEach(it => {
        it.classList.toggle('active', it.dataset.font === fam);
      });
    }
    fontMenu?.querySelectorAll('.pv-font-item').forEach(it => {
      it.addEventListener('click', () => {
        const fam = it.dataset.font;
        api.updateSelected({ font: fam });
        markActiveFont(fam);
        ensureFont(fam, () => { try { api.render(); } catch (err) {} });
      });
    });

    // ── V33: Dock — ไอคอน+ข้อความ เปลี่ยนตามสิ่งที่เลือก · แผงเด้งเหนือ dock ──
    function doAddText() {
      api.addTextLayer('');
      openPanel('pv-panel-edit');
      setTimeout(() => { try { textIn.focus(); } catch (e) {} }, 60);
      if (hintEl) hintEl.textContent = '✍️ พิมพ์ข้อความในช่องด้านล่าง แล้วลากบนภาพเพื่อจัดตำแหน่ง';
    }

    // ── V34: ไอคอนเวกเตอร์ SVG เส้น (currentColor) — สะอาด มืออาชีพ ── 
    const SVG = {
      text:    '<path d="M4 7V5h16v2M9 5v14M15 5v14"/>',
      image:   '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 16-5-5L5 20"/>',
      sticker: '<path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9l7-7V5a2 2 0 0 0-2-2Z"/><path d="M14 21v-5a2 2 0 0 1 2-2h5"/>',
      emoji:   '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>',
      zoom:    '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/>',
      layout:  '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
      edit:    '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
      font:    '<path d="M4 20V6a2 2 0 0 1 2-2h4M4 12h6M14 20l4-11 4 11M15.5 16h5"/>',
      bold:    '<path d="M8 4.5h5.5a3.6 3.6 0 0 1 0 7.2H8zM8 11.7h6.5a3.6 3.6 0 0 1 0 7.2H8zM8 4.5v14.4"/>',
      color:   '<circle cx="13.5" cy="6.5" r="1.2"/><circle cx="17.5" cy="10.5" r="1.2"/><circle cx="8.5" cy="7.5" r="1.2"/><circle cx="6.5" cy="12.5" r="1.2"/><path d="M12 2a10 10 0 1 0 0 20 2.5 2.5 0 0 0 2-4 2.5 2.5 0 0 1 2-4h1a5 5 0 0 0 5-5c0-4.4-4.5-7-10-7Z"/>',
      effect:  '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2"/><circle cx="12" cy="12" r="2.5"/>',
      order:   '<path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>',
      crop:    '<path d="M6 2v14a2 2 0 0 0 2 2h14M2 6h14a2 2 0 0 1 2 2v14"/>',
      shape:   '<rect x="4" y="4" width="16" height="16" rx="4"/>',
      adjust:  '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
      replace: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
      trash:   '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
      done:    '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
    };
    function ico(name) {
      return '<svg class="pv-dock-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (SVG[name] || '') + '</svg>';
    }
    function dockItem(iconName, txt, opts = {}) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pv-dock-item' + (opts.danger ? ' pv-dock-danger' : '') + (opts.done ? ' pv-dock-done' : '');
      if (opts.id) b.id = opts.id;
      if (opts.pane) b.dataset.pane = opts.pane;
      b.innerHTML = ico(iconName) + '<span class="pv-dock-txt">' + txt + '</span>';
      b.addEventListener('click', () => {
        if (opts.pane) { (openPane === opts.pane) ? closePanel() : openPanel(opts.pane); }
        if (opts.action) opts.action();
      });
      dockEl.appendChild(b);
      return b;
    }
    function refreshDock(sel) {
      if (!dockEl) return;
      dockEl.innerHTML = '';
      if (!sel) {
        if (!IS_ADMIN) dockItem('image', 'อัปรูป', { action: () => fileInput?.click() });
        dockItem('text', 'ข้อความ', { id: 'pv-add-text', action: doAddText });
        dockItem('image', 'โลโก้/รูป', { action: () => logoInput?.click() });
        dockItem('sticker', 'สติกเกอร์', { pane: 'pv-panel-sticker' });
        dockItem('emoji', 'อิโมจิ', { pane: 'pv-panel-emoji' });
        if (!IS_ADMIN && api.hasImage()) dockItem('zoom', 'ซูมรูป', { pane: 'pv-panel-zoom' });
      } else if (sel.type === 'text') {
        dockItem('edit', 'แก้ไข', { pane: 'pv-panel-edit' });
        dockItem('font', 'ฟอนต์', { pane: 'pv-pane-font' });
        // V35: B (ตัวหนา) ย้ายจากแถวสไลเดอร์มาอยู่ในแถบ dock — ไอคอนเวกเตอร์เหมือนตัวอื่น
        const bBtn = dockItem('bold', 'ตัวหนา', { id: 'pv-dock-bold', action: () => {
          const l = api.getSelected(); if (!l || l.type !== 'text') return;
          api.updateSelected({ bold: !l.bold });
          document.getElementById('pv-dock-bold')?.classList.toggle('active', !!api.getSelected().bold);
        } });
        bBtn.classList.toggle('active', !!sel.bold);
        dockItem('color', 'สี', { pane: 'pv-pane-color' });
        dockItem('effect', 'เอฟเฟกต์', { pane: 'pv-pane-fx' });
        dockItem('order', 'ลำดับ', { pane: 'pv-panel-order' });
        dockItem('trash', 'ลบ', { danger: true, action: () => { api.deleteSelected(); } });
        dockItem('done', 'เสร็จสิ้น', { done: true, id: 'pv-done-text', action: () => api.selectLayer(-1) });
      } else {
        dockItem('crop', 'ครอป', { action: () => { setCropMode(true); openPanel('pv-panel-crop'); } });
        dockItem('shape', 'รูปทรง', { pane: 'pv-panel-shape' });
        dockItem('adjust', 'ปรับภาพ', { pane: 'pv-panel-adjust' });
        dockItem('replace', 'เปลี่ยนรูป', { action: () => document.getElementById('pv-replace-input')?.click() });
        dockItem('order', 'ลำดับ', { pane: 'pv-panel-order' });
        dockItem('trash', 'ลบ', { danger: true, action: () => { api.deleteSelected(); } });
        dockItem('done', 'เสร็จสิ้น', { done: true, id: 'pv-done-img', action: () => api.selectLayer(-1) });
      }
      dockEl.querySelectorAll('.pv-dock-item').forEach(b => { if (b.dataset.pane) b.classList.toggle('active', !!openPane && b.dataset.pane === openPane); });
    }

    // ── V33: sync ค่าทุกคอนโทรลให้ตรงกับชิ้นที่เลือก + จัด dock/แผง ──
    function syncToolbar(layer) {
      if (!layer) {
        // ออกจากโหมดครอปค้าง (ถ้ามี)
        closePanel();
        refreshDock(null);
        return;
      }
      const isText = layer.type === 'text';
      if (isText) {
        textIn.value = layer.text;
        sizeIn.min = 10; sizeIn.max = 72; sizeIn.value = layer.size;
        if (sizeNumIn) sizeNumIn.value = layer.size;   // V35: เลขขนาดฟอนต์ตรงกับชิ้นที่เลือกเสมอ
        // (V35: สถานะปุ่ม "ตัวหนา" sync ใน refreshDock แล้ว)
        // สี: โหมด + จานสี + เป้า A/B + ทิศ
        colorTarget = 'color'; syncGradTarget();
        const mode = layer.colorMode || 'solid';
        modesEl?.querySelectorAll('.pv-mode').forEach(x => x.classList.toggle('active', x.dataset.mode === mode));
        gradRow.style.display = mode === 'gradient' ? '' : 'none';
        document.getElementById('pv-color-row').style.display = mode === 'rainbow' ? 'none' : '';
        gradDirEl?.querySelectorAll('.pv-ab-btn').forEach(x => x.classList.toggle('active', x.dataset.d === (layer.gradientDir || 'h')));
        markActiveSwatch(layer.color);
        // เอฟเฟกต์
        strokeIn.value = layer.strokeW || 0;
        shadowIn.value = layer.shadow || 0;
        curveIn.value  = layer.curve || 0;
        setVal('pv-stroke-val', layer.strokeW || 0);
        setVal('pv-shadow-val', layer.shadow || 0);
        setVal('pv-curve-val', curveTxt(layer.curve || 0));
        markStroke(layer.strokeColor);
        presetsEl?.querySelectorAll('.pv-preset').forEach(x => x.classList.remove('active'));
        markActiveFont(layer.font || 'Kanit');
        refreshDock(layer);
        // เลือกข้อความ → เปิดแผงแก้ไขให้เลย (รู้ทันทีว่าพิมพ์ตรงไหน)
        openPanel('pv-panel-edit');
      } else {
        if (sizeImgIn) { sizeImgIn.value = Math.round(layer.w); setVal('pv-size-img-val', Math.round(layer.w)); }
        if (radiusIn) { radiusIn.value = layer.radius || 0; setVal('pv-radius-val', (layer.radius || 0) >= 100 ? '⭕ วงกลม' : (layer.radius || 0) + '%'); }
        if (imgZoomIn) { imgZoomIn.value = layer.imgZ || 1; setVal('pv-imgzoom-val', (layer.imgZ || 1).toFixed(1) + '×'); }
        const _br = layer.brP != null ? layer.brP : 100, _ct = layer.ctP != null ? layer.ctP : 100, _sa = layer.saP != null ? layer.saP : 100, _bl = layer.blP || 0;
        if (fltBr) { fltBr.value = _br; setVal('pv-flt-br-val', _br + '%'); }
        if (fltCt) { fltCt.value = _ct; setVal('pv-flt-ct-val', _ct + '%'); }
        if (fltSa) { fltSa.value = _sa; setVal('pv-flt-sa-val', _sa + '%'); }
        if (fltBl) { fltBl.value = _bl; setVal('pv-flt-bl-val', _bl.toFixed(1)); }
        refreshDock(layer);
        // รูป: โชว์ dock เฉยๆ (แผงเปิดเมื่อกดเครื่องมือ) — ยกเว้นกำลังครอปอยู่
        if (layer._crop) openPanel('pv-panel-crop'); else closePanel();
      }
    }

    api.attachInteraction({
      onSelectionChange: syncToolbar,
      onLayersChange: refreshActionButtons,
      onLayerResize: (l) => {                                     // V35: ลากจุดจับ → ค่าบนแผงตามทันที
        if (!l) return;
        if (l.type === 'text') {
          if (sizeIn) sizeIn.value = l.size;
          if (sizeNumIn) sizeNumIn.value = l.size;
        } else if (sizeImgIn) {
          sizeImgIn.value = Math.round(l.w);
          setVal('pv-size-img-val', Math.round(l.w));
        }
      },
      onEmptyTap: () => { if (!IS_ADMIN && !api.hasImage()) fileInput?.click(); },
      onLayerDoubleTap: (l) => {                                  // V32: แตะสองครั้ง = แก้ทันที
        if (l.type === 'text') {
          openPanel('pv-panel-edit');
          textIn?.focus();
          try { textIn.select(); } catch (e) {}
          if (hintEl) hintEl.textContent = '✍️ พิมพ์แก้ข้อความได้เลย — เสร็จแล้วแตะที่อื่นเพื่อวาง';
        } else {
          document.getElementById('pv-replace-input')?.click();   // รูป: เปลี่ยนรูปทันที
        }
      },
    });

    // ─── V35: Drop-down "เลือกเทมเพลต" มุมซ้ายบน ───
    const tplDD   = document.getElementById('pv-tpl-dd');
    const tplBtn  = document.getElementById('pv-tpl-dd-btn');
    const tplMenu = document.getElementById('pv-tpl-dd-menu');
    const tplLbl  = document.getElementById('pv-tpl-dd-label');
    function setTplLabel(t) { if (tplLbl && t) tplLbl.textContent = t; }
    function closeTplMenu() {
      if (tplMenu) tplMenu.style.display = 'none';
      tplBtn?.setAttribute('aria-expanded', 'false');
    }
    tplBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = tplMenu && tplMenu.style.display === 'none';
      if (tplMenu) tplMenu.style.display = willOpen ? '' : 'none';
      tplBtn.setAttribute('aria-expanded', String(!!willOpen));
    });
    // แตะนอกเมนู → ปิด (ผูกกับ body ของ Designer เอง — ไม่ค้าง listener ระดับ document)
    body.addEventListener('click', (e) => { if (tplDD && !tplDD.contains(e.target)) closeTplMenu(); });

    // ─── template chips (แสดงในเมนู Drop-down) ───
    function addChip(label, emojiOrImg, onClick, isImg, isCustomTpl, isMore) {
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
        if (!isMore) setTplLabel(label);   // "เพิ่มเติม…" ไม่ใช่เทมเพลต — ไม่เปลี่ยนป้าย
        closeTplMenu();
      });
      row.appendChild(chip);
      return chip;
    }

    const builtins = IS_ADMIN ? [] : (allowed === null
      ? CanvasPreview.TEMPLATES
      : CanvasPreview.TEMPLATES.filter(t => allowed.includes(t.id) || allowed.includes(t.name.toLowerCase())));

    const chipActions = [];
    builtins.forEach(t => {
      const act = () => api.selectBuiltin(t.id);
      const chip = addChip(t.name, t.emoji, act);
      chip.title = t.description;
      chipActions.push({ chip, act, label: t.name });
    });

    let frames = [];
    if (!IS_ADMIN) {
      try { frames = await CanvasPreview.loadCustomFrames(); } catch (e) { frames = []; }
    }
    frames.forEach(f => {
      if (allowed && !allowed.includes(f.id.toLowerCase()) && !allowed.includes((f.name || '').toLowerCase())) return;
      const isDesign = f.kind === 'design';
      const act = isDesign ? (() => api.loadTemplateData(f)) : (() => api.selectCustomFrame(f));
      const icon = isDesign ? (f.thumbUrl || '') : f.frameUrl;
      const chip = addChip(f.name, icon || '✨', act, !!icon, true);
      chipActions.push({ chip, act, label: f.name });
    });

    if (chipActions.length) {
      chipActions[0].chip.classList.add('active');
      chipActions[0].act();
      capRow.style.display = (builtins.length === 0) ? 'none' : '';
      setTplLabel(chipActions[0].label);   // V35: ป้าย Drop-down = เทมเพลตที่ใช้อยู่
    }

    const moreChip = IS_ADMIN ? null : addChip('เพิ่มเติม…', '✨', () => {
      if (hintEl) hintEl.innerHTML = '💬 ร้านมีแบบมากกว่านี้! <a href="' + (options.lineUrl || '#') + '" target="_blank" rel="noopener" style="color:var(--accent);font-weight:700">ทักไลน์เพื่อดูแบบเพิ่มเติม →</a>';
      if (typeof DMC !== 'undefined') DMC.toast('ทักไลน์ร้านเพื่อดูแบบเพิ่มเติมได้เลยครับ 💬', 'info');
    }, false, false, true);   // V35: isMore — ไม่ใช่เทมเพลต ไม่เปลี่ยนป้าย Drop-down
    if (moreChip) {
      moreChip.classList.add('template-chip-more');
      moreChip.title = 'ติดต่อ LINE เพื่อดูแบบอื่นๆ นอกเหนือจากในเว็บ';
    }

    // ─── อัปโหลดรูปหลัก ───
    async function handleFile(file) {
      try {
        await api.loadImage(file);
        refreshActionButtons();
        zoomIn.value = 1;
        if (!api.getSelected()) { refreshDock(null); openPanel('pv-panel-zoom'); }   // V33: ซูมอยู่ในแผงเหนือ dock
        hintEl.textContent = '✅ อัปโหลดแล้ว — ลากรูปเพื่อเลื่อน · เลื่อน 🔍 เพื่อซูม · เพิ่มข้อความได้เลย';
      } catch (e) {
        DMC.toast(e.message || 'โหลดรูปไม่สำเร็จ', 'error');
      }
    }
    fileInput?.addEventListener('change', () => { if (fileInput.files[0]) { handleFile(fileInput.files[0]); fileInput.value = ''; } });

    // ── V34: คลังสติกเกอร์ + อิโมจิ (วางเป็นเลเยอร์ข้อความ emoji ขนาดใหญ่) ──
    const STICKERS = ['⭐','❤️','🎉','🎂','🎈','🎁','👑','🏆','✨','🌟','💯','🔥','💖','🌈','☀️','🌸','🍀','⚡','💎','🎀','📌','✅','🎯','💐'];
    const EMOJIS = ['😀','😍','🥰','😎','🤩','😂','🥳','😇','😊','🙌','👍','👏','🙏','💪','🤝','👋','🐶','🐱','🌺','🌹','🍰','🍕','☕','🎵','📷','💌','🎓','💼'];
    function placeEmoji(ch) {
      api.addTextLayer(ch, { size: 40, bold: false });
      openPanel('pv-panel-edit');
      if (hintEl) hintEl.textContent = '👍 ลากเพื่อจัดตำแหน่ง · แผง "แก้ไข" ปรับขนาดได้';
    }
    function fillGrid(gridId, arr) {
      const grid = document.getElementById(gridId);
      if (!grid) return;
      arr.forEach(ch => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'pv-emoji-cell'; b.textContent = ch;
        b.addEventListener('click', () => placeEmoji(ch));
        grid.appendChild(b);
      });
    }
    fillGrid('pv-sticker-grid', STICKERS);
    fillGrid('pv-emoji-grid', EMOJIS);

    const canvasEl = document.getElementById('preview-canvas');
    canvasEl?.addEventListener('dragover', e => { e.preventDefault(); canvasEl.style.opacity = '.7'; });
    canvasEl?.addEventListener('dragleave', () => { canvasEl.style.opacity = ''; });
    canvasEl?.addEventListener('drop', e => {
      e.preventDefault(); canvasEl.style.opacity = '';
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });

    zoomIn?.addEventListener('input', e => api.setPhotoZoom(e.target.value));

    // ─── เลเยอร์ ─── (ปุ่มเพิ่มข้อความย้ายไปอยู่ใน dock → doAddText)
    const logoInput = document.getElementById('pv-logo-input');
    logoInput?.addEventListener('change', async () => {
      const f = logoInput.files[0];
      if (!f) return;
      try {
        if (IS_ADMIN) {
          DMC.toast('⏳ กำลังอัปโหลดรูป...', 'info');
          const up = await DMC.uploadToImgBB(f);               // เทมเพลตต้องมี URL ถาวรให้ลูกค้าโหลด
          if (!up || !up.url) throw new Error('อัปโหลดไม่สำเร็จ');
          await api.addImageLayerFromUrl(up.url);
        } else {
          await api.addImageLayerFromFile(f);
        }
        hintEl.textContent = '🖼️ ลากรูปเพื่อจัดตำแหน่ง · เลื่อนแถบขนาดเพื่อย่อ/ขยาย · ✂️ ครอปได้อิสระ';
      } catch (e) { DMC.toast(e.message || 'เพิ่มรูปไม่สำเร็จ', 'error'); }
      logoInput.value = '';
    });

    textIn?.addEventListener('input',  e => api.updateSelected({ text: e.target.value || ' ' }));
    // (V30: สีย้ายไปแท็บสี — จานสี + HSL picker ของระบบเราเอง)
    // (V29: การเลือกฟอนต์ย้ายไปที่เมนู .pv-font-item ด้านบน)
    // ── V35: ปรับขนาดฟอนต์ครบวงจร — สไลเดอร์ / ช่องเลข (พิมพ์เอง) / ปุ่ม −/+ ทำงานร่วมกัน ──
    function setTextSize(v) {
      const l = api.getSelected(); if (!l || l.type !== 'text') return;
      const n = clampNum(parseInt(v, 10) || l.size || 16, 8, 200);
      api.updateSelected({ size: n });
      if (sizeIn) sizeIn.value = n;         // สไลเดอร์ clamp ที่ 10–72 เองถ้าเกินช่วง
      if (sizeNumIn) sizeNumIn.value = n;
    }
    sizeIn?.addEventListener('input', e => setTextSize(e.target.value));
    sizeNumIn?.addEventListener('input', e => {
      // พิมพ์สด: อัปเดตเมื่อเลขอยู่ในช่วงแล้วเท่านั้น (ไม่แย่งแก้ค่าระหว่างพิมพ์)
      const v = parseInt(e.target.value, 10);
      if (isNaN(v) || v < 8 || v > 200) return;
      const l = api.getSelected(); if (!l || l.type !== 'text') return;
      api.updateSelected({ size: v });
      if (sizeIn) sizeIn.value = v;
    });
    sizeNumIn?.addEventListener('change', e => setTextSize(e.target.value));   // เบลอ/Enter → clamp ให้เรียบร้อย
    document.getElementById('pv-size-minus')?.addEventListener('click', () => {
      const l = api.getSelected(); if (l && l.type === 'text') setTextSize((l.size || 16) - 1);
    });
    document.getElementById('pv-size-plus')?.addEventListener('click', () => {
      const l = api.getSelected(); if (l && l.type === 'text') setTextSize((l.size || 16) + 1);
    });
    sizeImgIn?.addEventListener('input', e => {
      const l = api.getSelected(); if (!l || l.type !== 'image') return;
      const w = parseInt(e.target.value, 10) || 60;
      const k = w / Math.max(1, l.w);
      api.updateSelected({ w, h: (l.h || l.w * l.ratio) * k });     // สเกลทั้งกล่อง คงสัดส่วน
      setVal('pv-size-img-val', w);
    });
    // (V35: ปุ่มตัวหนา B ย้ายไปแถบ dock — ดู refreshDock)
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
            if (options.onClose) options.onClose();   // ปิดกลับหน้าสินค้าให้กดสั่งซื้อต่อ
          }, 1400);
        } catch (e) {
          console.warn('attach design failed', e);
          attachBtn.innerHTML = original; attachBtn.disabled = false; attachBtn.dataset.busy = '';
          DMC.toast('แนบแบบไม่สำเร็จ ลองใหม่ หรือส่งรูปทาง LINE ได้ครับ', 'error', 4500);
        }
      });
    });
  // ── V33: สร้าง dock เริ่มต้น (ยังไม่เลือกอะไร) ──
  try { syncToolbar(null); } catch (e) {}

  // ── V31: โหมดแอดมิน (Template Studio) — ตัดส่วนที่ผูกกับออเดอร์ออก ──
  if (IS_ADMIN) {
    ['preview-attach-btn', 'pv-caption-row', 'pv-upload-row', 'pv-tpl-topbar'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    if (hintEl) hintEl.textContent = '🎨 จัดวางข้อความ/รูป ให้เป็นเบสเทมเพลต — ลูกค้าจะเห็นตามนี้แล้วแก้ต่อเอง';
  }
  return api;
};

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

  // ─── 3) ตัว editor → ย้ายไปเป็น mountDesigner ระดับไฟล์ (ใช้ร่วมกับ Template Studio) ───
  async function buildEditor() {
    const body = document.getElementById('pvd-body');
    return window.__PV_mountDesigner(body, Object.assign({}, options, {
      mode: 'customer',
      onClose: () => closeDesigner(false),
    }));
  }
};

// ═══════════════════════════════════════════════
//  TEMPLATE STUDIO (แอดมิน) — V31
//  สร้าง "เทมเพลตดีไซน์" แบบ Canva: จัดวางข้อความ/รูปเป็นเบส
//  เซฟลง Firestore collection 'templates' (kind:'design') — เอกสาร PNG แบบเก่าใช้ได้ต่อ
//  ใช้จากหน้าแอดมิน: TemplateStudio.open({ docId?, onSaved(id, name) })
// ═══════════════════════════════════════════════
window.TemplateStudio = (function () {
  const SIZES = [
    { v: '280x390', label: 'โพลารอยด์' },
    { v: '215x340', label: 'บัตรตั้ง' },
    { v: '320x200', label: 'บัตรนอน' },
    { v: '300x300', label: 'จัตุรัส' },
    { v: '320x110', label: 'ป้ายกว้าง' },
  ];
  const BGS = ['#FFFFFF', '#FFF8EE', '#F3F7F5', '#111111', '#0B6B54', '#DFF3EA', '#EAF2FF', '#FDE8EF', '#FFF3C9', '#F1E8FF'];
  let modal = null, api = null, editingId = null, savedCb = null;

  function close() {
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  async function open(opts = {}) {
    editingId = opts.docId || null;
    savedCb = opts.onSaved || null;

    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'ts-modal';
      modal.innerHTML = [
        '<div class="pvd-sheet" style="max-width:620px">',
          '<div class="pvd-header">',
            '<div class="pvd-title">🎨 Template Studio — สร้างเทมเพลตแบบดีไซน์</div>',
            '<button type="button" class="pvd-close" id="ts-close" aria-label="ปิด">✕</button>',
          '</div>',
          '<div class="ts-bar">',
            '<button type="button" class="ts-bar-toggle" id="ts-bar-toggle" aria-expanded="true">⚙️ ตั้งค่าเทมเพลต (ชื่อ · ขนาด · พื้นหลัง) <span class="ts-caret" id="ts-caret">▲ พับเก็บ</span></button>',
            '<div class="ts-bar-body" id="ts-bar-body">',
            '<input class="form-input" id="ts-name" maxlength="30" placeholder="ชื่อเทมเพลต เช่น บัตรพนักงานเขียว" style="font-size:.85rem">',
            // V32: ชิปขนาดแบบเห็นรูปทรงจริง (ไม่มี dialog ระบบ)
            '<div class="ts-row-label">📐 ขนาดผืนงาน <span>(แตะเพื่อเลือก)</span></div>',
            '<div class="ts-sizes" id="ts-sizes">',
              SIZES.map((z, i) => {
                const p2 = z.v.split('x');
                return '<button type="button" class="ts-size-chip' + (i === 0 ? ' active' : '') + '" data-v="' + z.v + '">' +
                  '<span class="ts-shape" style="aspect-ratio:' + p2[0] + '/' + p2[1] + '"></span>' +
                  '<span class="ts-size-name">' + z.label + '</span></button>';
              }).join(''),
            '</div>',
            // V32: พื้นหลัง — สีสำเร็จ + สีกำหนดเอง + อัปรูปพื้นหลัง
            '<div class="ts-row-label">🖼️ พื้นหลัง <span>(สีพื้น หรืออัปรูปดีไซน์ของร้าน)</span></div>',
            '<div class="ts-bar-row">',
              '<div class="ts-bgs" id="ts-bgs"></div>',
              '<button type="button" class="pv-swatch pv-swatch-sm pv-swatch-custom" id="ts-bg-custom" title="เลือกสีเอง">🎨</button>',
              '<label class="pv-btn" style="cursor:pointer;font-size:.7rem;padding:.3rem .65rem">🖼️ รูปพื้นหลัง<input type="file" id="ts-bg-file" accept="image/*" style="display:none"></label>',
              '<button type="button" class="pv-btn" id="ts-bg-clear" style="display:none;font-size:.7rem;padding:.3rem .65rem">✕ ล้างรูปพื้น</button>',
            '</div>',
            '<div class="pv-hsl" id="ts-hsl" style="display:none">',
              '<input type="range" id="ts-hue" class="pv-hue" min="0" max="360" step="1" value="160" aria-label="เฉดสีพื้น">',
              '<input type="range" id="ts-light" class="pv-light" min="8" max="97" step="1" value="90" aria-label="ความสว่างพื้น">',
            '</div>',
            '</div>',   // ปิด ts-bar-body
          '</div>',
          '<div class="pvd-body" id="ts-body"></div>',
          '<div class="ts-foot">',
            '<button type="button" class="btn btn-primary ts-save-btn" id="ts-save">💾 บันทึกเทมเพลต</button>',
          '</div>',
        '</div>',
      ].join('');
      document.body.appendChild(modal);
      modal.style.cssText = 'position:fixed;inset:0;z-index:9500;display:flex;background:rgba(10,25,20,.45);align-items:center;justify-content:center;';
      document.getElementById('ts-close').addEventListener('click', close);

      // V33: ลิ้นชักพับเก็บ/กางออก — ส่วนตั้งค่าไม่บังพื้นที่แต่งงานอีกต่อไป
      document.getElementById('ts-bar-toggle').addEventListener('click', () => {
        const bodyEl = document.getElementById('ts-bar-body');
        const caret = document.getElementById('ts-caret');
        const tog = document.getElementById('ts-bar-toggle');
        const open = bodyEl.style.display === 'none';
        bodyEl.style.display = open ? '' : 'none';
        caret.textContent = open ? '▲ พับเก็บ' : '▼ กางออก';
        tog.setAttribute('aria-expanded', String(open));
      });

      // พื้นหลัง
      const bgWrap = document.getElementById('ts-bgs');
      BGS.forEach(c => {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'pv-swatch pv-swatch-sm';
        b.style.background = c; b.title = 'พื้นหลัง ' + c;
        b.addEventListener('click', () => {
          api?.setBase({ bg: c });
          bgWrap.querySelectorAll('.pv-swatch').forEach(x => x.classList.toggle('active', x === b));
        });
        bgWrap.appendChild(b);
      });

      // V32: ชิปขนาด — เห็นรูปทรงก่อนเลือก
      document.getElementById('ts-sizes').querySelectorAll('.ts-size-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const [w, h] = chip.dataset.v.split('x').map(Number);
          api?.setBase({ w, h });
          document.getElementById('ts-sizes').querySelectorAll('.ts-size-chip').forEach(x => x.classList.toggle('active', x === chip));
          syncBgClear();
        });
      });

      // V32: สีพื้นกำหนดเอง (HSL ระบบเราเอง)
      const tsHsl = document.getElementById('ts-hsl');
      const tsHue = document.getElementById('ts-hue');
      const tsLight = document.getElementById('ts-light');
      document.getElementById('ts-bg-custom').addEventListener('click', () => {
        tsHsl.style.display = tsHsl.style.display === 'none' ? '' : 'none';
      });
      const hsl2hex = (h, sPct, lPct) => {
        const l = lPct / 100, sat = sPct / 100;
        const a = sat * Math.min(l, 1 - l);
        const f = n => { const k = (n + h / 30) % 12; const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1))); return Math.round(255 * c).toString(16).padStart(2, '0'); };
        return '#' + f(0) + f(8) + f(4);
      };
      function tsHslApply() {
        tsLight.style.setProperty('--h', tsHue.value);
        api?.setBase({ bg: hsl2hex(Number(tsHue.value), 85, Number(tsLight.value)) });
        document.getElementById('ts-bgs').querySelectorAll('.pv-swatch').forEach(x => x.classList.remove('active'));
      }
      tsHue.addEventListener('input', tsHslApply);
      tsLight.addEventListener('input', tsHslApply);

      // V32: รูปพื้นหลัง — อัปโหลดเป็น URL ถาวร แล้ว canvas ปรับสัดส่วนตามรูปจริง
      const bgClearBtn = document.getElementById('ts-bg-clear');
      function syncBgClear() { bgClearBtn.style.display = api && api.hasBgImage() ? '' : 'none'; }
      document.getElementById('ts-bg-file').addEventListener('change', async e => {
        const f = e.target.files[0]; if (!f) return;
        try {
          DMC.toast('⏳ กำลังอัปโหลดรูปพื้นหลัง...', 'info');
          const up = await DMC.uploadToImgBB(f);
          if (!up || !up.url) throw new Error('อัปโหลดไม่สำเร็จ');
          await api.setBgImageFromUrl(up.url);
          document.getElementById('ts-sizes').querySelectorAll('.ts-size-chip').forEach(x => x.classList.remove('active'));
          syncBgClear();
          DMC.toast('ตั้งรูปพื้นหลังแล้ว — ผืนงานปรับตามสัดส่วนรูปอัตโนมัติ ✓', 'success', 3500);
        } catch (err) { DMC.toast(err.message || 'ตั้งพื้นหลังไม่สำเร็จ', 'error'); }
        e.target.value = '';
      });
      bgClearBtn.addEventListener('click', () => { api?.clearBgImage(); syncBgClear(); });

      document.getElementById('ts-save').addEventListener('click', save);
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.getElementById('ts-name').value = '';
    document.getElementById('ts-body').innerHTML = '';

    // mount editor (เครื่องมือเดียวกับลูกค้าเป๊ะ — โหมดแอดมิน)
    api = await window.__PV_mountDesigner(document.getElementById('ts-body'), { mode: 'admin', size: { w: 280, h: 390 } });
    if (!api) { DMC.toast('เปิดสตูดิโอไม่สำเร็จ', 'error'); return; }
    api.setBase({ w: 280, h: 390, bg: '#FFFFFF' });
    const szWrap = document.getElementById('ts-sizes');
    szWrap.querySelectorAll('.ts-size-chip').forEach((x, i) => x.classList.toggle('active', i === 0));
    document.getElementById('ts-bg-clear').style.display = 'none';
    document.getElementById('ts-hsl').style.display = 'none';
    document.getElementById('ts-bar-body').style.display = '';
    document.getElementById('ts-caret').textContent = '▲ พับเก็บ';

    // โหมดแก้ไขเทมเพลตเดิม
    if (editingId) {
      try {
        const db = await DMC.getFirebaseReady();
        const doc = await db.collection('templates').doc(editingId).get();
        if (doc.exists) {
          const t = doc.data();
          document.getElementById('ts-name').value = t.name || '';
          if (t.kind === 'design') {
            await api.loadTemplateData(t);
            document.getElementById('ts-bg-clear').style.display = api.hasBgImage() ? '' : 'none';
          }
        }
      } catch (e) { DMC.toast('โหลดเทมเพลตเดิมไม่สำเร็จ: ' + e.message, 'error'); }
    }
  }

  async function save() {
    const name = document.getElementById('ts-name').value.trim();
    if (!name) { DMC.toast('กรอกชื่อเทมเพลตก่อนครับ', 'error'); return; }
    const data = api.getTemplateData();
    if (!data.layers.length) { DMC.toast('เพิ่มข้อความหรือรูปอย่างน้อย 1 ชิ้นก่อนบันทึก', 'warning'); return; }
    const btn = document.getElementById('ts-save');
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> กำลังบันทึก...';
    try {
      // thumbnail จากภาพจริงบน canvas
      let thumbUrl = '';
      const blob = await new Promise(res => api.getBlob(res));
      if (blob) {
        try {
          const up = await DMC.uploadToImgBB(new File([blob], 'tpl-thumb-' + Date.now() + '.jpg', { type: 'image/jpeg' }));
          thumbUrl = (up && up.url) || '';
        } catch (e) { /* thumb ไม่ได้ก็บันทึกต่อ (ชิปจะโชว์ ✨ แทน) */ }
      }
      const db = await DMC.getFirebaseReady();
      const payload = {
        name, kind: 'design', active: true,
        canvas: data.canvas, layers: data.layers, thumbUrl,
      };
      let id = editingId;
      if (editingId) {
        await db.collection('templates').doc(editingId).set(
          Object.assign({}, payload, { updatedAt: firebase.firestore.FieldValue.serverTimestamp() }), { merge: true });
      } else {
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        const ref = await db.collection('templates').add(payload);
        id = ref.id;
      }
      DMC.toast('บันทึกเทมเพลต "' + name + '" แล้ว ✅', 'success');
      if (savedCb) savedCb(id, name);
      close();
    } catch (e) {
      DMC.toast('บันทึกไม่สำเร็จ: ' + e.message, 'error');
    } finally {
      btn.disabled = false; btn.innerHTML = original;
    }
  }

  return { open, close };
})();
