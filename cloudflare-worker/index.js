/**
 * Diamond Cute Studio 💎 — Cloudflare Worker
 * LINE Flex Message Notification
 *
 * Secrets (Dashboard → Settings → Variables and Secrets):
 *   LINE_TOKEN   = Channel Access Token
 *   LINE_USER_ID = User ID (U-prefix)
 */

export default {
  async fetch(request, env) {

    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    const url = new URL(request.url);

    // POST /notify
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
            messages: [buildFlexCard(body)]
          })
        });

        const result = await lineRes.json();
        if (!lineRes.ok) {
          console.error('LINE error:', JSON.stringify(result));
          return corsResponse(jsonRes({ ok: false, error: result }), 502);
        }

        return corsResponse(jsonRes({ ok: true }));

      } catch (e) {
        return corsResponse(jsonRes({ ok: false, error: e.message }), 500);
      }
    }

    // GET /health
    if (request.method === 'GET' && url.pathname === '/health') {
      return corsResponse(jsonRes({
        ok: true,
        service: 'DMC Studio Notify Worker',
        ts: new Date().toISOString()
      }));
    }

    return corsResponse(jsonRes({ ok: false, error: 'Not found' }), 404);
  }
};

// ════════════════════════════════════════════════
//  FLEX MESSAGE CARD
// ════════════════════════════════════════════════

function buildFlexCard(data) {
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
  } = data;

  const isPP     = paymentMethod === 'promptpay';
  const payLabel = isPP ? 'PromptPay QR' : 'เก็บเงินปลายทาง';
  const payIcon  = isPP ? '📱' : '🚚';
  const totalStr = '฿' + Number(total).toLocaleString('th-TH');

  const now = new Date().toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit'
  });

  // TODO: แทน URL ไซต์จริงของคุณ
  const ADMIN_URL = 'https://YOUR_GITHUB_PAGES_URL/admin.html';

  return {
    type: 'flex',
    altText: `💎 ออเดอร์ใหม่ #${orderId} · ${customerName} · ${totalStr}`,
    contents: {
      type: 'bubble',
      size: 'kilo',

      // ───── HEADER ─────
      header: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '0px',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            paddingAll: '18px',
            paddingBottom: '14px',
            background: {
              type: 'linearGradient',
              angle: '135deg',
              startColor: '#0EA5E9',
              endColor:   '#6366F1'
            },
            contents: [
              // top row
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '💎 Diamond Cute Studio',
                    color: '#FFFFFF',
                    size: 'xs',
                    weight: 'bold',
                    flex: 1
                  },
                  {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                      {
                        type: 'text',
                        text: '🛍 NEW ORDER',
                        color: '#BAE6FD',
                        size: 'xxs',
                        weight: 'bold',
                        align: 'end'
                      }
                    ]
                  }
                ]
              },
              // order id
              {
                type: 'text',
                text: `#${orderId}`,
                color: '#FFFFFF',
                size: 'xxl',
                weight: 'bold',
                margin: 'sm'
              },
              // timestamp
              {
                type: 'text',
                text: `🕐 ${now}`,
                color: '#BAE6FD',
                size: 'xxs',
                margin: 'xs'
              }
            ]
          }
        ]
      },

      // ───── BODY ─────
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '16px',
        spacing: 'none',
        contents: [

          // ── ยอดรวม highlight ──
          {
            type: 'box',
            layout: 'horizontal',
            backgroundColor: '#F0F9FF',
            cornerRadius: '10px',
            paddingAll: '12px',
            margin: 'none',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  { type: 'text', text: 'ยอดชำระ', size: 'xxs', color: '#64748B' },
                  { type: 'text', text: totalStr, size: 'xl', weight: 'bold', color: '#0369A1', margin: 'xs' }
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                alignItems: 'flex-end',
                contents: [
                  {
                    type: 'box',
                    layout: 'vertical',
                    backgroundColor: isPP ? '#DBEAFE' : '#DCFCE7',
                    cornerRadius: '20px',
                    paddingAll: '6px',
                    paddingStart: '10px',
                    paddingEnd: '10px',
                    contents: [
                      {
                        type: 'text',
                        text: `${payIcon} ${payLabel}`,
                        size: 'xxs',
                        color: isPP ? '#1D4ED8' : '#166534',
                        weight: 'bold'
                      }
                    ]
                  }
                ]
              }
            ]
          },

          { type: 'box', layout: 'vertical', height: '12px', contents: [] },

          // ── Info rows ──
          infoCard('👤', 'ชื่อลูกค้า',  customerName),
          infoCard('📞', 'โทรศัพท์',    customerPhone),
          infoCard('🛒', 'รายการสินค้า', itemsSummary),
          infoCard('🚚', 'ขนส่ง',        shippingMethod),
          infoCard('📍', 'ที่อยู่จัดส่ง', address),

          // ── หมายเหตุ ──
          ...(note ? [
            { type: 'box', layout: 'vertical', height: '10px', contents: [] },
            {
              type: 'box',
              layout: 'vertical',
              backgroundColor: '#FFFBEB',
              cornerRadius: '10px',
              paddingAll: '10px',
              borderColor: '#FDE68A',
              contents: [
                {
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    { type: 'text', text: '💬', size: 'sm', flex: 0 },
                    { type: 'text', text: ' หมายเหตุ', size: 'xs', weight: 'bold', color: '#92400E', flex: 1 }
                  ]
                },
                {
                  type: 'text',
                  text: note,
                  size: 'sm',
                  color: '#78350F',
                  wrap: true,
                  margin: 'xs'
                }
              ]
            }
          ] : [])
        ]
      },

      // ───── FOOTER ─────
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '12px',
        paddingTop: '8px',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#0EA5E9',
            height: 'sm',
            action: {
              type: 'uri',
              label: '⚙️  เปิด Admin Dashboard',
              uri: ADMIN_URL
            }
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: 'Diamond Cute Studio · ระบบแจ้งเตือนอัตโนมัติ',
                size: 'xxs',
                color: '#94A3B8',
                align: 'center',
                wrap: true
              }
            ]
          }
        ]
      },

      styles: {
        header: { separator: false },
        body:   { backgroundColor: '#FFFFFF' },
        footer: { separator: true, separatorColor: '#E2E8F0' }
      }
    }
  };
}

// ─── Info row component ───────────────────────
function infoCard(icon, label, value) {
  return {
    type: 'box',
    layout: 'horizontal',
    paddingTop: '7px',
    paddingBottom: '7px',
    borderColor: '#F1F5F9',
    contents: [
      {
        type: 'text',
        text: icon,
        size: 'sm',
        flex: 0,
        offsetTop: '1px'
      },
      {
        type: 'text',
        text: label,
        size: 'xs',
        color: '#94A3B8',
        flex: 3,
        margin: 'sm',
        offsetTop: '2px'
      },
      {
        type: 'text',
        text: String(value || '—'),
        size: 'xs',
        color: '#1E293B',
        flex: 5,
        wrap: true,
        align: 'end',
        weight: 'bold'
      }
    ]
  };
}

// ─── Utility ─────────────────────────────────
function jsonRes(data) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  });
}

function corsResponse(res, status = 200) {
  const h = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (res === null) return new Response(null, { status, headers: h });
  return new Response(res.body, {
    status,
    headers: { ...Object.fromEntries(res.headers), ...h }
  });
}