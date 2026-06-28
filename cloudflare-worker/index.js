/**
 * Diamond Cute Studio 💎 — Cloudflare Worker
 * LINE Flex Message Notification
 *
 * Secrets (set in Dashboard → Settings → Variables and Secrets):
 *   LINE_TOKEN   = Channel Access Token
 *   LINE_USER_ID = User ID (U-prefix) — หลายคนคั่นด้วย ,
 *   IMGBB_KEY    = ImgBB API key (สำหรับ /upload — key ไม่หลุดสู่หน้าเว็บ)
 */

export default {
  async fetch(request, env) {

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return cors(null, 204);
    }

    const url = new URL(request.url);

    // ─── POST /upload — proxy อัปรูปขึ้น ImgBB (key เป็น secret) ───
    if (request.method === 'POST' && url.pathname === '/upload') {
      try {
        if (!originAllowed(request, env)) return cors(JSON.stringify({ error: 'origin not allowed' }), 403);
        if (!clientSecretOk(request, env)) return cors(JSON.stringify({ error: 'unauthorized' }), 401);
        if (!(await turnstileOk(request, env))) return cors(JSON.stringify({ error: 'captcha failed' }), 403);
        if (!(await rateLimitOk(request, 'upload', 20, 600))) return cors(JSON.stringify({ error: 'rate limited, try again later' }), 429);
        if (!env.IMGBB_KEY) {
          return cors(JSON.stringify({ error: 'IMGBB_KEY not set in Worker secrets' }), 500);
        }
        const inForm = await request.formData();
        const img = inForm.get('image');
        if (!img) return cors(JSON.stringify({ error: 'no image field' }), 400);

        const outForm = new FormData();
        outForm.append('image', img);   // รองรับทั้ง File และ base64 string

        const res = await fetch('https://api.imgbb.com/1/upload?key=' + env.IMGBB_KEY, {
          method: 'POST',
          body: outForm,
        });
        const data = await res.json();
        if (!data.success) {
          return cors(JSON.stringify({ error: (data.error && data.error.message) || 'imgbb failed' }), 502);
        }
        return cors(JSON.stringify({
          url: data.data.url,
          deleteUrl: data.data.delete_url || '',
        }), 200);
      } catch (e) {
        return cors(JSON.stringify({ error: e.message }), 500);
      }
    }

    // ─── POST /verify-slip — ตรวจสลิปกับธนาคารผ่านผู้ให้บริการ (EasySlip/SlipOK) ───
    // ปิดอยู่จนกว่าจะตั้ง secret SLIP_VERIFY_KEY ใน Worker (ค่าใช้จ่ายตามผู้ให้บริการ)
    // คืนค่ามาตรฐาน: { ok, amount, ref, receiver, sender, reason }
    if (request.method === 'POST' && url.pathname === '/verify-slip') {
      try {
        if (!originAllowed(request, env)) return cors(json({ ok: null, reason: 'origin not allowed' }), 403);
        if (!clientSecretOk(request, env)) return cors(json({ ok: null, reason: 'unauthorized' }), 401);
        if (!(await rateLimitOk(request, 'verify', 20, 600))) return cors(json({ ok: null, reason: 'rate limited' }), 429);
        if (!env.SLIP_VERIFY_KEY) {
          // ยังไม่เปิดใช้ → ตอบ ok:null เพื่อให้ฝั่งเว็บใช้ผลตรวจฟรี (local) ต่อไป
          return cors(json({ ok: null, reason: 'slip verify not configured' }), 200);
        }
        const provider = (env.SLIP_VERIFY_PROVIDER || 'easyslip').toLowerCase();
        const inForm   = await request.formData();
        const img      = inForm.get('image');
        const amount   = Number(inForm.get('amount') || 0);
        if (!img) return cors(json({ ok: null, reason: 'no image field' }), 400);

        let out;
        if (provider === 'easyslip') out = await verifyEasySlip(img, env);
        else if (provider === 'slipok') out = await verifySlipOk(img, amount, env);
        else return cors(json({ ok: null, reason: 'unknown provider' }), 200);

        return cors(json(out), 200);
      } catch (e) {
        return cors(json({ ok: null, reason: e.message }), 200);   // fail-soft → คงผล local
      }
    }

    // ─── POST /notify ───────────────────────────
    if (request.method === 'POST' && url.pathname === '/notify') {
      try {
        // V.upgrade1: (ออปชัน) จำกัด Origin ถ้าตั้ง ALLOWED_ORIGIN ไว้ — กันคนนอกยิง Worker
        if (!originAllowed(request, env)) return cors(json({ ok: false, error: 'origin not allowed' }), 403);
        if (!clientSecretOk(request, env)) return cors(json({ ok: false, error: 'unauthorized' }), 401);
        if (!(await rateLimitOk(request, 'notify', 40, 600))) return cors(json({ ok: false, error: 'rate limited' }), 429);
        const body = await request.json();

        // V.upgrade1: รองรับหลาย User ID คั่นด้วย , → ใช้ multicast (push รับ ID เดียวเท่านั้น)
        const ids = String(env.LINE_USER_ID || '').split(',').map(s => s.trim()).filter(Boolean);
        if (!ids.length) return cors(json({ ok: false, error: 'LINE_USER_ID not set' }), 500);
        const useMulticast = ids.length > 1;
        const endpoint = useMulticast ? 'multicast' : 'push';
        const payload = useMulticast
          ? { to: ids, messages: [buildOrderCard(body)] }
          : { to: ids[0], messages: [buildOrderCard(body)] };

        const lineRes = await fetch(`https://api.line.me/v2/bot/message/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.LINE_TOKEN}`
          },
          body: JSON.stringify(payload)
        });

        const result = await lineRes.json().catch(() => ({}));
        if (!lineRes.ok) {
          console.error('LINE API error:', JSON.stringify(result));
          return cors(json({ ok: false, error: result }), 502);
        }

        return cors(json({ ok: true }));

      } catch (e) {
        return cors(json({ ok: false, error: e.message }), 500);
      }
    }

    // ─── POST /create-order — สร้างออเดอร์ฝั่งเซิร์ฟเวอร์ (ปิดช่องโหว่ CRIT-01) ───
    //   คำนวณยอดรวมใหม่จาก "ราคาจริง" ใน snapshot สินค้า (ไม่เชื่อ total จากลูกค้า)
    //   → ส่งออเดอร์ ฿1 ไม่ได้อีกต่อไป
    //   ต้องตั้ง secret ก่อนใช้งานจริง: GCP_SERVICE_ACCOUNT (JSON ทั้งก้อน), PRODUCTS_SNAPSHOT_URL
    //   ถ้ายังไม่ตั้ง → ตอบ {ok:false, fallback:true} ให้หน้าเว็บเขียน Firestore ตรงแบบเดิม (ไม่พัง)
    if (request.method === 'POST' && url.pathname === '/create-order') {
      try {
        if (!originAllowed(request, env)) return cors(json({ ok:false, error:'origin not allowed' }), 403);
        if (!clientSecretOk(request, env)) return cors(json({ ok:false, error:'unauthorized' }), 401);
        if (!(await rateLimitOk(request, 'order', 15, 600))) return cors(json({ ok:false, error:'rate limited' }), 429);
        if (!env.GCP_SERVICE_ACCOUNT) {
          return cors(json({ ok:false, fallback:true, reason:'server order not configured' }), 200);
        }
        const body = await request.json();
        const out  = await createOrderServerSide(body, env);
        return cors(json(out), (out.ok || out.fallback) ? 200 : 400);
      } catch (e) {
        return cors(json({ ok:false, fallback:true, reason: e.message }), 200);   // fail-soft → หน้าเว็บ fallback
      }
    }

    // ─── POST /publish-snapshot — commit ไฟล์ snapshot ขึ้น GitHub อัตโนมัติ ───
    //   หน้าแอดมินสร้าง JSON (products/gallery) แล้วส่งมา → Worker push ขึ้น repo ให้
    //   (GitHub token เก็บเป็น secret ฝั่ง Worker — ไม่หลุดสู่หน้าเว็บ)
    //   ต้องตั้ง secret: GITHUB_TOKEN (PAT สิทธิ์ Contents:write), GITHUB_REPO ("user/repo"), (GITHUB_BRANCH)
    //   ถ้ายังไม่ตั้ง → ตอบ {ok:false} ให้หน้าแอดมินใช้ปุ่มดาวน์โหลด+อัปเองแทน (ไม่พัง)
    if (request.method === 'POST' && url.pathname === '/publish-snapshot') {
      try {
        if (!originAllowed(request, env)) return cors(json({ ok:false, error:'origin not allowed' }), 403);
        if (!clientSecretOk(request, env)) return cors(json({ ok:false, error:'unauthorized' }), 401);
        if (!(await rateLimitOk(request, 'publish', 20, 600))) return cors(json({ ok:false, error:'rate limited' }), 429);
        if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
          return cors(json({ ok:false, reason:'github publish not configured' }), 200);
        }
        const body = await request.json();   // { files: { "data/products.json": <obj|string>, ... } }
        const out  = await publishToGithub(body, env);
        return cors(json(out), out.ok ? 200 : 400);
      } catch (e) {
        return cors(json({ ok:false, reason: e.message }), 200);
      }
    }

    // ─── GET /health ────────────────────────────
    if (request.method === 'GET' && url.pathname === '/health') {
      return cors(json({ ok: true, service: 'DMC Studio Notify', ts: new Date().toISOString() }));
    }

    return cors(json({ ok: false, error: 'Not found' }), 404);
  }
};

// ════════════════════════════════════════════════
//  SLIP VERIFY PROVIDERS  ·  คืนรูปแบบมาตรฐานเดียวกัน
//  { ok:true|false|null, amount, ref, receiver, sender, reason }
// ════════════════════════════════════════════════
async function verifyEasySlip(img, env) {
  // EasySlip: POST multipart 'file' → developer.easyslip.com/api/v1/verify
  const fd = new FormData();
  fd.append('file', img);
  const res = await fetch('https://developer.easyslip.com/api/v1/verify', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + env.SLIP_VERIFY_KEY },
    body: fd,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j || !j.data) {
    return { ok: false, reason: (j && (j.message || (j.status))) || 'easyslip verify failed' };
  }
  const d = j.data;
  return {
    ok: true,
    amount:   d.amount && (d.amount.amount != null ? Number(d.amount.amount) : null),
    ref:      d.transRef || d.ref || '',
    receiver: (d.receiver && (d.receiver.account && (d.receiver.account.name && (d.receiver.account.name.th || d.receiver.account.name.en)))) || '',
    sender:   (d.sender && (d.sender.account && (d.sender.account.name && (d.sender.account.name.th || d.sender.account.name.en)))) || '',
    reason:   'verified',
  };
}

async function verifySlipOk(img, amount, env) {
  // SlipOK: POST multipart 'files' → api.slipok.com/api/line/apikey/{BRANCH_ID}
  const branch = env.SLIPOK_BRANCH_ID || '';
  if (!branch) return { ok: null, reason: 'SLIPOK_BRANCH_ID not set' };
  const fd = new FormData();
  fd.append('files', img);
  if (amount) fd.append('amount', String(amount));
  const res = await fetch('https://api.slipok.com/api/line/apikey/' + branch, {
    method: 'POST',
    headers: { 'x-authorization': env.SLIP_VERIFY_KEY },
    body: fd,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j || j.success === false || !j.data) {
    return { ok: false, reason: (j && j.message) || 'slipok verify failed' };
  }
  const d = j.data;
  return {
    ok: true,
    amount:   d.amount != null ? Number(d.amount) : null,
    ref:      d.transRef || d.transRef || '',
    receiver: (d.receiver && d.receiver.displayName) || (d.receivingBank || ''),
    sender:   (d.sender && d.sender.displayName) || '',
    reason:   'verified',
  };
}

// ════════════════════════════════════════════════
//  BUILD FLEX MESSAGE CARD  ·  "Vibrant Cute" หลายโทนหมุนเวียน
//  แต่ละออเดอร์เปลี่ยนโทนสีอัตโนมัติตามเลขออเดอร์
//  → ร้านแยกออกง่ายว่าออเดอร์ไหนจัดการแล้ว/ยัง
// ════════════════════════════════════════════════
const CARD_PALETTES = [
  { name:'pink',     h1:'#FB7185', h2:'#F472B6', h3:'#C084FC', accent:'#DB2777', soft:'#FFF1F8', lbl:'#BE6593', val:'#831843', btnBg:'#FCE7F3', btnTx:'#DB2777' },
  { name:'sky',      h1:'#38BDF8', h2:'#3B82F6', h3:'#6366F1', accent:'#2563EB', soft:'#EFF6FF', lbl:'#3B6CA8', val:'#1E3A8A', btnBg:'#DBEAFE', btnTx:'#2563EB' },
  { name:'mint',     h1:'#34D399', h2:'#10B981', h3:'#06B6D4', accent:'#059669', soft:'#ECFDF5', lbl:'#3C8A6E', val:'#064E3B', btnBg:'#D1FAE5', btnTx:'#059669' },
  { name:'peach',    h1:'#FBBF24', h2:'#FB923C', h3:'#FB7185', accent:'#EA580C', soft:'#FFF7ED', lbl:'#B5764A', val:'#7C2D12', btnBg:'#FFEDD5', btnTx:'#EA580C' },
  { name:'lavender', h1:'#A78BFA', h2:'#8B5CF6', h3:'#6366F1', accent:'#7C3AED', soft:'#F5F3FF', lbl:'#7E6BB0', val:'#4C1D95', btnBg:'#EDE9FE', btnTx:'#7C3AED' },
  { name:'coral',    h1:'#FB7185', h2:'#F43F5E', h3:'#EC4899', accent:'#E11D48', soft:'#FFF1F2', lbl:'#B05670', val:'#881337', btnBg:'#FFE4E6', btnTx:'#E11D48' },
  { name:'teal',     h1:'#2DD4BF', h2:'#06B6D4', h3:'#0EA5E9', accent:'#0891B2', soft:'#ECFEFF', lbl:'#3C7E8A', val:'#164E63', btnBg:'#CFFAFE', btnTx:'#0891B2' },
  { name:'gold',     h1:'#FCD34D', h2:'#FBBF24', h3:'#F59E0B', accent:'#D97706', soft:'#FFFBEB', lbl:'#A6824A', val:'#78350F', btnBg:'#FEF3C7', btnTx:'#D97706' },
];

// เลือกพาเลตจากเลขออเดอร์ (หมุนเวียน — ออเดอร์ติดกันจะคนละโทนเสมอ)
function pickPalette(orderId) {
  const n = parseInt(String(orderId).replace(/\D/g, ''), 10);
  const i = Number.isFinite(n) ? n : Math.floor(Math.random() * CARD_PALETTES.length);
  return CARD_PALETTES[((i % CARD_PALETTES.length) + CARD_PALETTES.length) % CARD_PALETTES.length];
}

// การ์ดข้อมูลย่อย (พื้นพาสเทลตามโทน) — flex กำหนดเองได้สำหรับแถว 2 คอลัมน์
function cardlet(label, value, P, flex) {
  const box = {
    type: 'box', layout: 'vertical', backgroundColor: P.soft, cornerRadius: '12px',
    paddingAll: '10px', spacing: 'xs',
    contents: [
      { type: 'text', text: label, size: 'xxs', color: P.lbl, weight: 'bold' },
      { type: 'text', text: String(value || '—'), size: 'sm', color: P.val, weight: 'bold', wrap: true }
    ]
  };
  if (flex !== undefined) box.flex = flex;
  return box;
}

function buildOrderCard(data) {
  const {
    orderId        = '—',
    customerName   = '—',
    customerPhone  = '—',
    itemsSummary   = '—',
    total          = 0,
    paymentMethod  = '—',
    address        = '—',
    note           = '',
    shippingMethod = '—',
    slipVerify     = null
  } = data;

  const P = pickPalette(orderId);
  const payLabel = paymentMethod === 'promptpay' ? '📱 PromptPay QR'
                 : paymentMethod === 'cod'       ? '🚚 เก็บเงินปลายทาง (COD)'
                 : (paymentMethod || '—');
  const totalStr = '฿' + Number(total || 0).toLocaleString('th-TH');
  let when = '';
  try {
    when = new Date().toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok', day: '2-digit', month: 'short',
      year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch (e) { when = ''; }

  const bodyContents = [
    // ── ยอดรวม (กล่องเด่น พื้นพาสเทล ขอบสีโทน) ──
    {
      type: 'box', layout: 'vertical', backgroundColor: P.soft,
      borderColor: P.accent, borderWidth: '1px', cornerRadius: '14px',
      paddingAll: '14px', spacing: 'xs',
      contents: [
        { type: 'text', text: 'ยอดรวมทั้งสิ้น', align: 'center', size: 'xs', color: P.lbl, weight: 'bold' },
        { type: 'text', text: totalStr, align: 'center', size: '3xl', weight: 'bold', color: P.accent },
        { type: 'text', text: payLabel, align: 'center', size: 'xs', color: P.accent }
      ]
    },
    // ── ข้อมูลลูกค้า: 2 คอลัมน์ ──
    { type: 'box', layout: 'horizontal', spacing: 'sm',
      contents: [ cardlet('👤 ลูกค้า', customerName, P, 1), cardlet('📞 เบอร์', customerPhone, P, 1) ] },
    // ── สินค้า: เต็มแถว ──
    cardlet('🛒 สินค้า', itemsSummary, P),
    // ── ขนส่ง | ชำระเงิน ──
    { type: 'box', layout: 'horizontal', spacing: 'sm',
      contents: [ cardlet('🚚 ขนส่ง', shippingMethod, P, 1), cardlet('💳 ชำระ', payLabel, P, 1) ] },
    // ── ที่อยู่: เต็มแถว ──
    cardlet('📍 ที่อยู่', address, P)
  ];

  // ── หมายเหตุ (ถ้ามี) — โทนเหลืองคงที่ ──
  if (note) {
    bodyContents.push({
      type: 'box', layout: 'vertical', backgroundColor: '#FEF9C3',
      cornerRadius: '12px', paddingAll: '11px', spacing: 'xs',
      contents: [
        { type: 'text', text: '💬 หมายเหตุจากลูกค้า', size: 'xxs', color: '#854D0E', weight: 'bold' },
        { type: 'text', text: note, size: 'sm', color: '#713F12', wrap: true }
      ]
    });
  }

  // ── ผลตรวจสลิปอัตโนมัติ (เฉพาะ PromptPay) ──
  if (paymentMethod === 'promptpay' && slipVerify && slipVerify.status) {
    const SV = {
      passed:     { bg:'#DCFCE7', fg:'#166534', icon:'✅', label:'สลิปถูกต้อง · ยังไม่ยืนยันยอด (โปรดตรวจยอด)' },
      failed:     { bg:'#FEF3C7', fg:'#92400E', icon:'⚠️', label:'ตรวจสลิปไม่ผ่าน — โปรดตรวจเอง' },
      unverified: { bg:'#F1F5F9', fg:'#475569', icon:'ℹ️', label:'ยังไม่ได้ตรวจสลิปอัตโนมัติ' },
    }[slipVerify.status] || { bg:'#F1F5F9', fg:'#475569', icon:'ℹ️', label:'สถานะสลิป' };
    const lines = [
      { type:'text', text: SV.icon + ' ' + SV.label, size:'xs', color: SV.fg, weight:'bold', wrap:true }
    ];
    if (slipVerify.reason) lines.push({ type:'text', text: String(slipVerify.reason), size:'xxs', color: SV.fg, wrap:true });
    bodyContents.push({
      type:'box', layout:'vertical', backgroundColor: SV.bg,
      cornerRadius:'12px', paddingAll:'11px', spacing:'xs', contents: lines
    });
  }

  // ── ขอบคุณ ──
  bodyContents.push({
    type: 'text', text: 'ขอบคุณที่ไว้วางใจ Diamond Cute Studio 💕',
    align: 'center', size: 'xxs', color: P.lbl, margin: 'md', wrap: true
  });

  return {
    type: 'flex',
    altText: `🎉 ออเดอร์ใหม่ #${orderId} — ${customerName} (${totalStr})`,
    contents: {
      type: 'bubble',
      size: 'mega',
      // ── หัวการ์ด: ไล่สีตามโทน ──
      header: {
        type: 'box', layout: 'vertical', paddingAll: '18px', spacing: 'xs',
        background: { type: 'linearGradient', angle: '135deg', startColor: P.h1, centerColor: P.h2, endColor: P.h3, centerPosition: '50%' },
        contents: [
          { type: 'text', text: '🎉 ✨', align: 'center', size: 'lg', color: '#FFFFFF' },
          { type: 'text', text: 'มีออเดอร์ใหม่เข้ามา!', align: 'center', size: 'xl', weight: 'bold', color: '#FFFFFF' },
          { type: 'text', text: `#${orderId}${when ? ' · ' + when : ''}`, align: 'center', size: 'xs', color: '#FFFFFF', margin: 'sm', wrap: true }
        ]
      },
      body: {
        type: 'box', layout: 'vertical', paddingAll: '16px', spacing: 'md',
        contents: bodyContents
      },
      footer: {
        type: 'box', layout: 'horizontal', paddingAll: '12px', spacing: 'sm',
        contents: [
          {
            type: 'button', style: 'primary', color: P.accent, height: 'sm',
            action: { type: 'uri', label: '⚙️ จัดการออเดอร์', uri: 'https://chaiwutz14.github.io/Diamond-Cute-Studio/admin.html' },
            flex: 1
          },
          {
            type: 'button', style: 'secondary', height: 'sm',
            action: { type: 'uri', label: '📋 ดูรายละเอียด', uri: 'https://chaiwutz14.github.io/Diamond-Cute-Studio/admin.html#orders' },
            flex: 1
          }
        ]
      },
      styles: {
        header: { separator: false },
        footer: { separator: true, separatorColor: P.soft }
      }
    }
  };
}

// ─── Helpers ───
// V17: จำกัด Origin แบบ "fail-closed" + ตรงเป๊ะ (ปิดช่องโหว่ HIGH-02)
//   เดิมมี 2 จุดอ่อน:
//     (1) ไม่มี Origin = ผ่าน  → curl/Postman ยิงได้
//     (2) ใช้ indexOf(o)===0 (ขึ้นต้นด้วย) → https://chaiwutz14.github.io.evil.com ผ่านได้
//   ใหม่:
//     • ไม่มี Origin = ปฏิเสธ (เบราว์เซอร์จริงส่ง Origin เสมอใน cross-origin POST)
//     • โดเมน production ต้อง "ตรงเป๊ะ" เท่านั้น
//     • localhost / 127.0.0.1 อนุญาตทุกพอร์ต (เครื่อง dev)
//   ตั้ง secret ALLOWED_ORIGIN (คั่น , ) เพื่อ override รายการ production ได้
function originAllowed(request, env) {
  const DEFAULTS = [
    'https://chaiwutz14.github.io',   // โดเมนร้าน (GitHub Pages)
  ];
  const configured = String(env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  const list = configured.length ? configured : DEFAULTS;
  const origin = request.headers.get('Origin') || '';
  if (!origin) return false;          // ไม่มี Origin (curl/Postman/server-to-server) = ปฏิเสธ
  // เครื่อง dev: localhost / 127.0.0.1 ทุกพอร์ต = ผ่าน
  try {
    const host = new URL(origin).hostname;
    if (host === 'localhost' || host === '127.0.0.1') return true;
  } catch (e) { return false; }       // origin เพี้ยน = ปฏิเสธ
  // production: ต้องตรงเป๊ะเท่านั้น (กัน suffix-injection เช่น github.io.evil.com)
  return list.some(o => origin === o);
}

// V17: shared secret กับหน้าเว็บ (defense-in-depth) — กันสคริปต์ยิงมั่วที่ไม่รู้คีย์
//   หน้าเว็บส่ง header  X-DMC-Key: <CLIENT_KEY>  มาด้วย
//   หมายเหตุ: หน้าเว็บเป็น static สาธารณะ คีย์นี้จึง "ไม่ลับสนิท" (เปิดดู source ได้)
//             แต่ช่วยกันสแปมอัตโนมัติเป็นชั้นเสริม ร่วมกับ Origin + Rate limit + App Check
//   ถ้ายังไม่ตั้ง secret CLIENT_KEY ใน Worker → ข้ามการเช็ก (ระบบไม่พังก่อนตั้งค่า)
function clientSecretOk(request, env) {
  const want = String(env.CLIENT_KEY || '').trim();
  if (!want) return true;             // ยังไม่ตั้งค่า = ไม่บังคับ (fail-open)
  const got = String(request.headers.get('X-DMC-Key') || '').trim();
  return got === want;
}

// V24/SEC-B: Cloudflare Turnstile (CAPTCHA ฟรี) ป้องกันบอตยิง /upload
//   ถ้ายังไม่ตั้ง secret TURNSTILE_SECRET ใน Worker → ข้ามการเช็ก (fail-open, ระบบไม่พังก่อนตั้งค่า)
//   เปิดใช้: ตั้ง TURNSTILE_SECRET ใน Worker + TURNSTILE.siteKey ใน config.js (ฝั่งเว็บจะแนบ token มาเอง)
async function turnstileOk(request, env) {
  const secret = String(env.TURNSTILE_SECRET || '').trim();
  if (!secret) return true;           // ยังไม่ตั้งค่า = ไม่บังคับ
  try {
    const token = request.headers.get('CF-Turnstile-Token') || '';
    if (!token) return false;
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const form = new FormData();
    form.append('secret', secret);
    form.append('response', token);
    if (ip) form.append('remoteip', ip);
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const j = await r.json().catch(() => ({}));
    return !!(j && j.success);
  } catch (e) {
    return true;   // fail-open: ถ้า siteverify ล่ม ไม่บล็อกลูกค้าจริง
  }
}

// V17: Rate limit ต่อ IP (กันยิงถล่ม /upload /notify เผาโควต้า)
//   ใช้ Cache API (ฟรี ไม่ต้องตั้ง KV/Durable Object) — นับต่อ edge ต่อช่วงเวลา
//   ⚠️ เป็นการนับ "ต่อ data center" (per-colo) จึงเป็นการ "ลดแรง" ไม่ใช่เพดานตายตัว
//      ถ้าต้องการเพดานจริงจัง แนะนำเพิ่ม Rate Limiting rule ใน Cloudflare Dashboard
//   fail-open: ถ้า Cache มีปัญหา จะปล่อยผ่าน (ไม่บล็อกลูกค้าจริงเพราะ Cache ล่ม)
async function rateLimitOk(request, bucket, max, windowSec) {
  try {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const slot = Math.floor(Date.now() / 1000 / windowSec);   // หน้าต่างเวลาแบบ fixed-window
    const key = 'https://rl.dmc.internal/' + bucket + '/' + ip + '/' + slot;
    const cache = caches.default;
    const cacheKey = new Request(key);
    let count = 0;
    const hit = await cache.match(cacheKey);
    if (hit) { count = Number(await hit.text()) || 0; }
    if (count >= max) return false;
    const res = new Response(String(count + 1), {
      headers: { 'Cache-Control': 'max-age=' + windowSec, 'Content-Type': 'text/plain' }
    });
    await cache.put(cacheKey, res);
    return true;
  } catch (e) {
    return true;   // fail-open
  }
}
function json(data)           { return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } }); }
function cors(res, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-DMC-Key, CF-Turnstile-Token',
  };
  // bug-fix: ก่อนหน้านี้รองรับเฉพาะ Response object — แต่ทุก handler ส่ง string (JSON.stringify) เข้ามา
  // ทำให้ Response ที่คืนกลับไม่มี CORS header → browser แสดง error เป็น "CORS policy" แทนข้อความจริง
  // ผลคือ fallback path ฝั่งเว็บไม่รู้ว่าเกิดอะไรขึ้น (เห็นแค่ "Failed to fetch")
  if (res === null)                  return new Response(null, { status, headers });
  if (typeof res === 'string')       return new Response(res, { status, headers: { ...headers, 'Content-Type': 'application/json' } });
  // Response object (legacy path) — รวม headers เดิม + CORS
  const r = new Response(res.body, { status, headers: { ...Object.fromEntries(res.headers), ...headers } });
  return r;
}

// ════════════════════════════════════════════════
//  V17 · สร้างออเดอร์ฝั่งเซิร์ฟเวอร์ (CRIT-01)
//  คำนวณยอดจากราคาจริงใน snapshot → เขียน Firestore ผ่าน REST (service account)
//  ⚠️ ปิดไว้โดยปริยาย (ต้องตั้ง GCP_SERVICE_ACCOUNT + PRODUCTS_SNAPSHOT_URL ก่อน)
//     และควรตรวจ "ความตรงกันของค่าส่ง/คูปอง" (ตั้ง SHIP_* ให้ตรงกับ CMS) ก่อนเปิดใช้จริง
// ════════════════════════════════════════════════
async function createOrderServerSide(body, env) {
  body = body || {};
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) return { ok:false, reason:'no items' };
  if (!body.customerName || !body.customerPhone || !body.address) return { ok:false, reason:'missing customer info' };

  // 1) ราคาจริงจาก snapshot (อ่านไฟล์ public บน GitHub Pages — ไม่ใช้ค่าจากลูกค้า)
  const snapUrl = env.PRODUCTS_SNAPSHOT_URL || '';
  if (!snapUrl) return { ok:false, fallback:true, reason:'PRODUCTS_SNAPSHOT_URL not set' };
  const priceMap = {};
  try {
    const r = await fetch(snapUrl, { cf: { cacheTtl: 30 } });
    const j = await r.json();
    const list = Array.isArray(j) ? j : (j.items || []);
    list.forEach(p => { if (p && p.id != null) priceMap[String(p.id)] = Number(p.price) || 0; });
  } catch (e) { return { ok:false, fallback:true, reason:'cannot read price snapshot' }; }

  // 2) คำนวณ subtotal จากราคาจริง (id ไม่อยู่ใน snapshot → ปฏิเสธ กันสินค้าปลอม/ราคาปลอม)
  let subtotal = 0;
  for (const it of items) {
    const id  = String(it.id != null ? it.id : '');
    const qty = Math.max(1, Math.min(999, Number(it.qty) || 1));
    const real = priceMap[id];
    if (real == null) return { ok:false, reason:'unknown product: ' + id };
    subtotal += real * qty;
  }

  // 3) ค่าส่ง + ค่าธรรมเนียม + ส่วนลดคูปอง (ตรวจคูปองกับ Firestore จริง)
  const pay = String(body.paymentMethod || 'promptpay');
  const shipTransfer = Number(env.SHIP_TRANSFER || 35);
  const shipCod      = Number(env.SHIP_COD || 40);
  const freeShipMin  = Number(env.FREE_SHIP_MIN || 0);
  let shipping  = (pay === 'cod') ? shipCod : shipTransfer;
  let surcharge = (pay === 'cod') ? Number(env.SURCHARGE_COD || 0) : Number(env.SURCHARGE_PROMPTPAY || 0);
  let discount  = 0, freeship = false;

  const token = await getGoogleAccessToken(env);
  if (body.couponCode) {
    const c = await firestoreGetDoc(env, token, 'coupons', String(body.couponCode));
    if (c && c.active === true) {
      if (c.type === 'percent') {
        discount = Math.floor(subtotal * Number(c.value) / 100);
        const cap = Number(c.maxDiscount || 0);
        if (cap > 0) discount = Math.min(discount, cap);
      } else if (c.type === 'fixed') {
        discount = Math.min(Number(c.value) || 0, subtotal);
      } else if (c.type === 'freeship') {
        freeship = true;
      }
    }
  }
  if (freeship || (freeShipMin > 0 && subtotal >= freeShipMin)) shipping = 0;
  const total = Math.max(0, subtotal + shipping + surcharge - discount);
  if (total < 1) return { ok:false, reason:'total too low' };

  // 4) เขียนออเดอร์ลง Firestore ผ่าน REST (token จาก service account — ปลอมไม่ได้)
  const orderId = body.orderId || ('DCS-' + Date.now());
  const doc = {
    orderId,
    customerName:   String(body.customerName).slice(0,120),
    customerPhone:  String(body.customerPhone).slice(0,30),
    phoneSearch:    String(body.phoneSearch || '').slice(0,30),
    customerLine:   String(body.customerLine || '').slice(0,120),
    address:        String(body.address).slice(0,1000),
    shippingMethod: String(body.shippingMethod || 'kerry').slice(0,40),
    note:           String(body.note || '').slice(0,1000),
    paymentMethod:  pay,
    items,
    itemsSummary:   String(body.itemsSummary || '').slice(0,1500),
    subtotal, shipping, surcharge,
    couponCode:     String(body.couponCode || ''),
    couponDiscount: discount,
    total,                          // ★ ยอดจากเซิร์ฟเวอร์ (เชื่อถือได้)
    status:         'pending',
    slipUrl:        String(body.slipUrl || ''),
    fileUrls:       Array.isArray(body.fileUrls) ? body.fileUrls.slice(0,30) : [],
    slipVerify:     (body.slipVerify && typeof body.slipVerify === 'object') ? body.slipVerify : null,
    serverVerified: true,
    createdAt:      new Date(),            // ★ future-bug fix: เขียน timestamp จริง เพื่อให้ orderBy('createdAt') ฝั่งแอดมินเห็นออเดอร์ที่สร้างจากเซิร์ฟเวอร์ (ตอนเปิด server-order)
    createdAtIso:   new Date().toISOString(),
  };
  const docId = await firestoreCreateDoc(env, token, 'orders', doc);
  return { ok:true, docId, orderId, total, subtotal, shipping, discount };
}

// ─── Google service-account → access token (RS256 JWT, ใช้ Web Crypto) ───
let _gTokenCache = { token: '', exp: 0 };
async function getGoogleAccessToken(env) {
  if (_gTokenCache.token && Date.now() < _gTokenCache.exp - 60000) return _gTokenCache.token;
  const sa  = JSON.parse(env.GCP_SERVICE_ACCOUNT);
  const now = Math.floor(Date.now() / 1000);
  const enc = (o) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const signingInput = enc({ alg:'RS256', typ:'JWT' }) + '.' + enc({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  });
  const key = await importPrivateKey(sa.private_key);
  const sig = await crypto.subtle.sign({ name:'RSASSA-PKCS1-v1_5' }, key, new TextEncoder().encode(signingInput));
  const jwt = signingInput + '.' + b64url(new Uint8Array(sig));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:'POST',
    headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + jwt,
  });
  const j = await res.json();
  if (!j.access_token) throw new Error('token exchange failed: ' + (j.error_description || j.error || 'unknown'));
  _gTokenCache = { token: j.access_token, exp: Date.now() + (Number(j.expires_in) || 3600) * 1000 };
  return j.access_token;
}
function b64url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
async function importPrivateKey(pem) {
  const b = String(pem).replace(/-----BEGIN PRIVATE KEY-----/,'').replace(/-----END PRIVATE KEY-----/,'').replace(/\\n/g,'').replace(/\s+/g,'');
  const der = Uint8Array.from(atob(b), c => c.charCodeAt(0));
  return crypto.subtle.importKey('pkcs8', der.buffer, { name:'RSASSA-PKCS1-v1_5', hash:'SHA-256' }, false, ['sign']);
}

// ─── Firestore REST helpers ───
function _projectId(env) {
  if (env.FIREBASE_PROJECT_ID) return env.FIREBASE_PROJECT_ID;
  try { return JSON.parse(env.GCP_SERVICE_ACCOUNT).project_id; } catch (e) { return ''; }
}
function toFirestoreValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string')  return { stringValue: v };
  if (v instanceof Date)      return { timestampValue: v.toISOString() };   // ★ รองรับ timestamp (ต้องมาก่อน object)
  if (Array.isArray(v))       return { arrayValue: { values: v.map(toFirestoreValue) } };
  if (typeof v === 'object') {
    const fields = {};
    for (const k of Object.keys(v)) fields[k] = toFirestoreValue(v[k]);
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}
function fromFirestoreFields(fields) {
  const o = {};
  for (const k of Object.keys(fields || {})) o[k] = fromFirestoreValue(fields[k]);
  return o;
}
function fromFirestoreValue(val) {
  if ('nullValue' in val)     return null;
  if ('booleanValue' in val)  return val.booleanValue;
  if ('integerValue' in val)  return Number(val.integerValue);
  if ('doubleValue' in val)   return Number(val.doubleValue);
  if ('stringValue' in val)   return val.stringValue;
  if ('arrayValue' in val)    return (val.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in val)      return fromFirestoreFields(val.mapValue.fields);
  if ('timestampValue' in val) return val.timestampValue;
  return null;
}
async function firestoreCreateDoc(env, token, collection, data) {
  const pid = _projectId(env);
  const url = 'https://firestore.googleapis.com/v1/projects/' + pid + '/databases/(default)/documents/' + collection;
  const fields = {};
  for (const k of Object.keys(data)) fields[k] = toFirestoreValue(data[k]);
  const res = await fetch(url, {
    method:'POST',
    headers:{ 'Authorization':'Bearer ' + token, 'Content-Type':'application/json' },
    body: JSON.stringify({ fields }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error('firestore create failed: ' + JSON.stringify(j).slice(0,200));
  return (j.name || '').split('/').pop();
}
async function firestoreGetDoc(env, token, collection, docId) {
  const pid = _projectId(env);
  const url = 'https://firestore.googleapis.com/v1/projects/' + pid + '/databases/(default)/documents/' + collection + '/' + encodeURIComponent(docId);
  const res = await fetch(url, { headers:{ 'Authorization':'Bearer ' + token } });
  if (!res.ok) return null;
  const j = await res.json();
  return j.fields ? fromFirestoreFields(j.fields) : null;
}

// ════════════════════════════════════════════════
//  V17 · publish snapshot ขึ้น GitHub (Contents API)
//  ⚠️ ปิดไว้โดยปริยาย (ต้องตั้ง GITHUB_TOKEN + GITHUB_REPO ก่อน)
// ════════════════════════════════════════════════
async function publishToGithub(body, env) {
  const files = (body && body.files) || {};
  const paths = Object.keys(files);
  if (!paths.length) return { ok:false, reason:'no files' };
  const repo   = env.GITHUB_REPO;                 // "user/repo"
  const branch = env.GITHUB_BRANCH || 'main';
  const published = [];
  for (const path of paths) {
    if (!/^data\/[A-Za-z0-9._-]+\.json$/.test(path)) return { ok:false, reason:'path not allowed: ' + path };
    const content = files[path];
    const text = (typeof content === 'string') ? content : JSON.stringify(content, null, 2);
    const apiUrl = 'https://api.github.com/repos/' + repo + '/contents/' + path;
    const ghHeaders = { 'Authorization':'Bearer ' + env.GITHUB_TOKEN, 'User-Agent':'dmc-worker', 'Accept':'application/vnd.github+json' };
    let sha = '';
    try {
      const g = await fetch(apiUrl + '?ref=' + encodeURIComponent(branch), { headers: ghHeaders });
      if (g.ok) { const gj = await g.json(); sha = gj.sha || ''; }
    } catch (e) {}
    const put = await fetch(apiUrl, {
      method:'PUT',
      headers: { ...ghHeaders, 'Content-Type':'application/json' },
      body: JSON.stringify({
        message: 'chore: update ' + path + ' (auto snapshot)',
        content: b64encodeUtf8(text),
        branch,
        ...(sha ? { sha } : {}),
      }),
    });
    const pj = await put.json().catch(() => ({}));
    if (!put.ok) return { ok:false, path, reason: (pj.message || 'github put failed') };
    published.push(path);
  }
  return { ok:true, published };
}
function b64encodeUtf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
