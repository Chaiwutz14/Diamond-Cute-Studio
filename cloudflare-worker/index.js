/**
 * Diamond Cute Studio 💎 — Cloudflare Worker
 * LINE Messaging API Notification
 *
 * Deploy: wrangler deploy
 * Add secrets via: wrangler secret put LINE_TOKEN
 *                  wrangler secret put LINE_USER_ID
 */

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    const url = new URL(request.url);

    // ─── POST /notify ───
    if (request.method === 'POST' && url.pathname === '/notify') {
      try {
        const body = await request.json();
        const message = body.message || '📦 แจ้งเตือนจาก Diamond Cute Studio';

        const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.LINE_TOKEN}`
          },
          body: JSON.stringify({
            to: env.LINE_USER_ID,   // must be U-prefix User ID
            messages: [{ type: 'text', text: message }]
          })
        });

        const result = await lineRes.json();

        if (!lineRes.ok) {
          console.error('LINE API error:', result);
          return jsonResponse({ ok: false, error: result }, 502);
        }

        return jsonResponse({ ok: true });

      } catch (e) {
        return jsonResponse({ ok: false, error: e.message }, 500);
      }
    }

    // ─── GET /health ───
    if (request.method === 'GET' && url.pathname === '/health') {
      return jsonResponse({
        ok: true,
        service: 'Diamond Cute Studio Notify Worker',
        timestamp: new Date().toISOString()
      });
    }

    return jsonResponse({ ok: false, error: 'Not found' }, 404);
  }
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
}
