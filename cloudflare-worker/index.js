/**
 * Diamond Cute Studio 💎 — Cloudflare Worker
 * LINE Flex Message Notification
 *
 * Secrets (set in Dashboard → Settings → Variables and Secrets):
 *   LINE_TOKEN   = Channel Access Token
 *   LINE_USER_ID = User ID (U-prefix)
 */

export default {
  async fetch(request, env) {

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return cors(null, 204);
    }

    const url = new URL(request.url);

    // ─── POST /notify ───────────────────────────
    if (request.method === 'POST' && url.pathname === '/notify') {
      try {
        const body = await request.json();

        const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.LINE_TOKEN}`
          },
          body: JSON.stringify({
            to: env.LINE_USER_ID,
            messages: [buildOrderCard(body)]
          })
        });

        const result = await lineRes.json();
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
              uri: 'https://YOUR_GITHUB_PAGES_URL/admin.html'
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
              uri: 'https://YOUR_GITHUB_PAGES_URL/admin.html#orders'
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
