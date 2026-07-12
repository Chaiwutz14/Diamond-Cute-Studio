/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Service Worker V13.1
   sw.js  ·  network-first strategy

   เป้าหมาย:
   - เปิดซ้ำเร็วขึ้น (cache ไฟล์ static)
   - ออฟไลน์ยังเปิดหน้าเว็บได้
   - network-first → ได้ไฟล์ใหม่เสมอเมื่อมีเน็ต (ไม่ค้างเวอร์ชันเก่าเวลาอัปไฟล์)
   - ไม่แตะ Firebase / ImgBB / API (ให้ผ่านตรงเสมอ)
═══════════════════════════════════════════════ */

const CACHE_VERSION = 'dcs-v38-admin-redesign';
const CACHE_NAME = 'dcs-cache-' + CACHE_VERSION;

// ไฟล์หลักที่ pre-cache ตอนติดตั้ง (โหลดครั้งแรกเร็วขึ้น + ออฟไลน์ได้)
const PRECACHE = [
  './',
  './index.html',
  './catalog.html',
  './product.html',
  './cart.html',
  './orders.html',
  './about.html',
  './gallery.html',
  './contact.html',
  './404.html',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './css/core.css',
  './css/themes.css',
  './css/loading.css',
  './css/main.css',
  './css/navbar.css',
  './css/home.css',
  './css/product.css',
  './css/order.css',
  './js/theme-init.js',
  './js/config.js',
  './js/loading.js',
  './js/utils.js',
  './js/analytics.js',
  './js/slip-verify.js',
  './js/cms.js',
  './js/categories.js',
  './js/search-engine.js',
  './js/reviews.js',
  './js/navbar.js',
  './js/footer.js',
  './js/bottom-nav.js',
  './js/custom-select.js',
  './js/skeleton.js',
  './js/theme-switcher.js',
  './js/admin-access.js',
  './js/inline-editor.js',
  './js/home.js',
  './js/catalog.js',
  './js/product.js',
  './js/gallery.js',
  './js/canvas-preview.js',
  './js/order.js',
  './js/order-history.js',
  './js/about-page.js',
  './js/contact-page.js',
  './js/pwa-install.js',
  './js/sw-register.js',
];

// โดเมนที่ "ห้าม" แคช — ต้องสดเสมอ
const BYPASS_HOSTS = [
  'firestore.googleapis.com',
  'firebase',
  'googleapis.com',
  'gstatic.com',
  'google.com',
  'i.ibb.co',
  'api.imgbb.com',
  'ibb.co',
  'promptpay.io',
  'workers.dev',
  'line.me',
];

// ─── Install: pre-cache ───
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate: ลบ cache เก่า ───
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch: network-first สำหรับไฟล์ของเรา ───
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // เฉพาะ GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // ข้าม cross-origin sensitive (Firebase/ImgBB/etc) — ให้ผ่านตรง
  if (url.origin !== self.location.origin) {
    if (BYPASS_HOSTS.some((h) => url.hostname.includes(h))) return;
  }
  // admin ไม่แคช (ต้องสดเสมอ + ปลอดภัย)
  if (url.pathname.includes('admin')) return;

  // network-first: ลองเน็ตก่อน → สำเร็จก็อัปเดต cache, ล้มเหลวค่อยใช้ cache
  event.respondWith(
    fetch(req)
      .then((res) => {
        // แคชเฉพาะ same-origin ที่สำเร็จ
        if (res && res.status === 200 && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => {
          if (cached) return cached;
          // ถ้าเป็นการขอหน้า HTML แล้วออฟไลน์ → คืนหน้าแรกจาก cache
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('', { status: 504, statusText: 'Offline' });
        })
      )
  );
});

// ─── รับคำสั่ง skipWaiting จากหน้าเว็บ (อัปเดตทันที) ───
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
