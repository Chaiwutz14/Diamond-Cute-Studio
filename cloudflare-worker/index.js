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
//  BUILD FLEX MESSAGE CARD
// ════════════════════════════════════════════════
function buildOrderCard(data) {
  const {
    orderId       = '—',
    customerName  = '—',
    customerPhone = '—',
    itemsSummary  = '—',
    total         = 0,
    paymentMethod = '—',
    address       = '—',
    note          = '',
    shippingMethod = '—',
  } = data;

  const payLabel = paymentMethod === 'promptpay' ? '📱 PromptPay QR' : '🚚 เก็บเงินปลายทาง';
  const totalStr = '฿' + Number(total).toLocaleString('th-TH');
  const now      = new Date().toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  return {
    type: 'flex',
    altText: `📦 ออเดอร์ใหม่ #${orderId} — ${customerName} (${totalStr})`,
    contents: {
      type: 'bubble',
      size: 'kilo',

      // ── Header ──
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0EA5E9',
        paddingAll: '16px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '💎 Diamond Cute Studio',
                color: '#FFFFFF',
                size: 'sm',
                weight: 'bold',
                flex: 1
              },
              {
                type: 'text',
                text: '🛍️ ออเดอร์ใหม่',
                color: '#DBEAFE',
                size: 'xs',
                align: 'end'
              }
            ]
          },
          {
            type: 'text',
            text: `#${orderId}`,
            color: '#FFFFFF',
            size: 'xl',
            weight: 'bold',
            margin: 'sm'
          },
          {
            type: 'text',
            text: now,
            color: '#BFDBFE',
            size: 'xs',
            margin: 'xs'
          }
        ]
      },

      // ── Body ──
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '16px',
        spacing: 'md',
        contents: [

          // ── ราคา (big) ──
          {
            type: 'box',
            layout: 'horizontal',
            backgroundColor: '#F0F9FF',
            cornerRadius: '8px',
            paddingAll: '12px',
            contents: [
              { type: 'text', text: '💰 ยอดรวม', size: 'sm', color: '#0369A1', flex: 1 },
              { type: 'text', text: totalStr, size: 'lg', weight: 'bold', color: '#0EA5E9', align: 'end' }
            ]
          },

          // ── Divider ──
          { type: 'separator', color: '#E0F2FE' },

          // ── ข้อมูลลูกค้า ──
          infoRow('👤', 'ลูกค้า',    customerName),
          infoRow('📞', 'เบอร์',     customerPhone),
          infoRow('🛒', 'สินค้า',   itemsSummary),
          infoRow('💳', 'ชำระ',     payLabel),
          infoRow('🚚', 'ขนส่ง',    shippingMethod),
          infoRow('📍', 'ที่อยู่',   address),

          // ── หมายเหตุ (ถ้ามี) ──
          ...(note ? [
            { type: 'separator', color: '#E0F2FE' },
            {
              type: 'box',
              layout: 'vertical',
              backgroundColor: '#FFFBEB',
              cornerRadius: '8px',
              paddingAll: '10px',
              contents: [
                { type: 'text', text: '💬 หมายเหตุ', size: 'xs', color: '#92400E', weight: 'bold' },
                { type: 'text', text: note, size: 'sm', color: '#78350F', wrap: true, margin: 'xs' }
              ]
            }
          ] : [])
        ]
      },

      // ── Footer ──
      footer: {
        type: 'box',
        layout: 'horizontal',
        paddingAll: '12px',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#0EA5E9',
            height: 'sm',
            action: {
              type: 'uri',
              label: '⚙️ จัดการออเดอร์',
              uri: 'https://chaiwutz14.github.io/Diamond-Cute-Studio/admin.html'
            },
            flex: 1
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'uri',
              label: '📋 ดูรายละเอียด',
              uri: 'https://chaiwutz14.github.io/Diamond-Cute-Studio/admin.html#orders'
            },
            flex: 1
          }
        ]
      },

      styles: {
        header: { separator: false },
        footer: { separator: true, separatorColor: '#E0F2FE' }
      }
    }
  };
}

// ─── Helper: แถวข้อมูลแต่ละบรรทัด ───
function infoRow(icon, label, value) {
  return {
    type: 'box',
    layout: 'horizontal',
    contents: [
      {
        type: 'text',
        text: `${icon} ${label}`,
        size: 'xs',
        color: '#64748B',
        flex: 2,
        offsetTop: '1px'
      },
      {
        type: 'text',
        text: String(value || '—'),
        size: 'xs',
        color: '#0F172A',
        flex: 4,
        wrap: true,
        align: 'end'
      }
    ]
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
