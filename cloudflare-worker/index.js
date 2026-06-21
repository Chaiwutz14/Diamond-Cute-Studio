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
      passed:     { bg:'#DCFCE7', fg:'#166534', icon:'✅', label:'ตรวจสลิปอัตโนมัติผ่าน' },
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
// V.upgrade1: จำกัด Origin (เปิดใช้เมื่อตั้ง ALLOWED_ORIGIN = "https://โดเมนร้าน" คั่น , ได้)
function originAllowed(request, env) {
  const allow = String(env.ALLOWED_ORIGIN || '').trim();
  if (!allow) return true;                       // ไม่ตั้ง = อนุญาตทุก origin (ค่าเริ่มต้น)
  const origin = request.headers.get('Origin') || '';
  if (!origin) return true;                       // ไม่มี Origin (server-to-server) = ผ่าน
  return allow.split(',').map(s => s.trim()).filter(Boolean).includes(origin);
}
function json(data)           { return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } }); }
function cors(res, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (res === null) return new Response(null, { status, headers });
  const r = new Response(res.body, { status, headers: { ...Object.fromEntries(res.headers), ...headers } });
  return r;
}
