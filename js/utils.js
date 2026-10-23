/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Firebase & Utils
   js/utils.js
═══════════════════════════════════════════════ */

// ─── Firebase Config ───
// TODO: Replace with your actual Firebase project config
const FIREBASE_CONFIG = (window.DMC_CONFIG || {}).FIREBASE_CONFIG || {};

// V17: header ลับ (ออปชัน) ส่งไปกับทุก request ที่ยิง Cloudflare Worker
//   ถ้าไม่ตั้ง CF_CLIENT_KEY ใน config.js → คืน {} (ไม่ส่ง header, Worker ไม่บังคับ)
function dmcWorkerKeyHeader() {
  const k = ((window.DMC_CONFIG || {}).CF_CLIENT_KEY || '').trim();
  return k ? { 'X-DMC-Key': k } : {};
}

// ── Cloudflare Turnstile (CAPTCHA กันบอต) — ขอ token ตอนจะอัปรูป ──
//   เปิดใช้: ตั้ง TURNSTILE.enabled=true + siteKey ใน config.js + secret TURNSTILE_SECRET ใน Worker
//   แนะนำตั้ง Widget Mode = "Invisible" ใน Cloudflare (จะทำงานเงียบ ไม่ต้องให้ลูกค้าคลิก)
//   ถ้าไม่เปิด/โหลดไม่ได้ → คืน null (ไม่แนบ token) และ Worker จะ fail-open (ยังอัปได้) จนกว่าจะตั้ง secret
let _tsWidgetId = null;
let _tsPending  = null;   // ตัว resolve ของการเรียกครั้งปัจจุบัน (callback จะอ่านค่านี้)
async function dmcGetTurnstileToken() {
  const cfg = (window.DMC_CONFIG || {}).TURNSTILE || {};
  if (!cfg.enabled || !cfg.siteKey) return null;
  try {
    // โหลดสคริปต์ Turnstile ครั้งเดียว
    if (!window.turnstile) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        s.async = true; s.defer = true;
        s.onload = resolve;
        s.onerror = () => reject(new Error('โหลด Turnstile ไม่สำเร็จ'));
        document.head.appendChild(s);
      });
      for (let i = 0; i < 80 && !window.turnstile; i++) await new Promise(r => setTimeout(r, 50));
    }
    if (!window.turnstile) return null;

    // container วางนอกจอ (ไม่ใช่ 0x0 — เผื่อโหมด Managed ต้อง render UI ก็ยัง render ได้นอกจอ)
    let box = document.getElementById('dmc-turnstile-box');
    if (!box) {
      box = document.createElement('div');
      box.id = 'dmc-turnstile-box';
      box.style.cssText = 'position:fixed;left:-9999px;bottom:0;width:300px;height:65px;opacity:0;pointer-events:none;z-index:-1';
      document.body.appendChild(box);
    }

    return await new Promise((resolve) => {
      let done = false;
      const finish = (v) => { if (done) return; done = true; _tsPending = null; resolve(v); };
      const timer  = setTimeout(() => finish(null), 15000);   // กันค้าง → ปล่อยผ่าน (null)
      // callback (ทั้ง render และ reset) จะเรียกตัวนี้ ซึ่งอ่าน _tsPending ของ "ครั้งปัจจุบัน" เสมอ
      _tsPending = (tok) => { clearTimeout(timer); finish(tok || null); };
      const params = {
        sitekey: cfg.siteKey,
        callback: (t) => { if (_tsPending) _tsPending(t); },
        'error-callback':   () => { if (_tsPending) _tsPending(null); },
        'timeout-callback': () => { if (_tsPending) _tsPending(null); },
        'expired-callback': () => { if (_tsPending) _tsPending(null); },
      };
      try {
        if (_tsWidgetId === null) {
          _tsWidgetId = window.turnstile.render(box, params);   // render ครั้งแรก → รัน challenge → callback
        } else {
          window.turnstile.reset(_tsWidgetId);                  // ครั้งถัดไป → reset → รัน challenge ใหม่ → callback
        }
      } catch (e) { finish(null); }
    });
  } catch (e) {
    return null;   // fail-open
  }
}

// ─── Firebase Ready Promise ───
let _db = null;
let _firebaseReady = null;

function getFirebaseReady() {
  if (_firebaseReady) return _firebaseReady;

  // สาเหตุ error "Cannot read properties of undefined (reading 'INTERNAL')":
  //   firebase-storage/appCheck/auth/firestore-compat ต้องการ window.firebase ที่สร้างโดย firebase-app-compat
  //   ถ้าโหลด parallel ทั้งหมดพร้อมกัน SDK ย่อยโหลดเสร็จก่อน app-compat → ไม่มี firebase global → crash
  // แก้: โหลด firebase-app-compat ก่อน (ขั้น 1) แล้วค่อยโหลด SDK ย่อยพร้อมกัน (ขั้น 2)
  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = () => rej(new Error('Failed to load ' + src));
      document.head.appendChild(s);
    });
  }

  _firebaseReady = new Promise((resolve, reject) => {
    try {
      const _cfg = window.DMC_CONFIG || {};
      const _appCheckKey = (_cfg.APP_CHECK_SITE_KEY || '').trim();
      const BASE = 'https://www.gstatic.com/firebasejs/9.22.2/';

      // ขั้น 1: โหลด firebase-app-compat ก่อนเสมอ (สร้าง window.firebase)
      loadScript(BASE + 'firebase-app-compat.js').then(() => {

        // ขั้น 2: โหลด SDK ย่อยพร้อมกัน (firebase global พร้อมแล้ว)
        const rest = [
          BASE + 'firebase-firestore-compat.js',
          BASE + 'firebase-auth-compat.js',
        ];
        if (_appCheckKey)       rest.push(BASE + 'firebase-app-check-compat.js');
        if (_cfg.PRIVATE_UPLOADS) rest.push(BASE + 'firebase-storage-compat.js');

        return Promise.all(rest.map(loadScript));

      }).then(() => {
        try {
          if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);

          if (_appCheckKey && firebase.appCheck) {
            try { firebase.appCheck().activate(_appCheckKey, true); }
            catch (e) { console.warn('App Check activate failed:', e.message); }
          }
          _db = firebase.firestore();
          console.log('✅ Firebase ready');
          resolve(_db);
        } catch (e) { reject(e); }
      }).catch(reject);

    } catch (e) { reject(e); }
  });

  return _firebaseReady;
}

function getDb() { return _db; }

// ─── ImgBB Upload ───
const IMGBB_API_KEY = (window.DMC_CONFIG || {}).IMGBB_API_KEY || ""; // TODO: replace

async function uploadToImgBB(file) {
  // บีบอัดอัตโนมัติ (ยกเว้น PNG เทมเพลตที่ส่ง compressImage มาก่อนแล้ว)
  try { if (file && file.type && file.type.startsWith('image/') && file.type !== 'image/png') file = await compressImage(file); } catch(e) {}

  // อัปผ่าน Cloudflare Worker → Worker เก็บ Cloudinary key/secret ไว้ฝั่งเซิร์ฟเวอร์
  //   → ไม่มี API key โผล่ในหน้าเว็บเลย (กันคนเอา key ไปอัปรูปไม่เหมาะสมเข้าบัญชีเรา)
  //   Cloudinary ไม่บล็อกคำขอจาก Worker (ต่างจาก ImgBB)
  const proxy = (window.DMC_CONFIG || {}).UPLOAD_PROXY_URL || '';
  if (!proxy) throw new Error('อัปโหลดรูปไม่สำเร็จ (ยังไม่ได้ตั้ง UPLOAD_PROXY_URL ใน config.js) — รบกวนส่งรูปทาง LINE ครับ');

  // ขอ Turnstile token ถ้าเปิดใช้ (กันบอท) — ถ้าไม่เปิด/ขอไม่ได้ จะคืน null และไม่แนบ header
  const headers = { ...dmcWorkerKeyHeader() };
  try {
    const tk = (typeof dmcGetTurnstileToken === 'function') ? await dmcGetTurnstileToken() : null;
    if (tk) headers['CF-Turnstile-Token'] = tk;
  } catch (e) { /* ปล่อยผ่าน — Worker จะ fail-open ถ้ายังไม่ตั้ง secret */ }

  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch(proxy, { method: 'POST', body: fd, headers });
  if (!res.ok) {
    let detail = 'HTTP ' + res.status;
    try { const j = await res.json(); if (j && j.error) detail = j.error; } catch(e) {}
    throw new Error('อัปโหลดรูปไม่สำเร็จ: ' + detail);
  }
  const data = await res.json();
  if (!data.url) throw new Error(data.error || 'อัปโหลดรูปไม่สำเร็จ (ไม่ได้รับ URL กลับมา)');
  return { url: data.url, thumbUrl: data.url, deleteUrl: data.deleteUrl || '', id: data.publicId || '' };
}

// ─── V3 Security: อัปไฟล์ "ลับ" (สลิป/รูปลูกค้า) ไป Firebase Storage แบบ private ───
// คืน "path" (ไม่ใช่ URL สาธารณะ) — อ่านได้เฉพาะแอดมินผ่าน resolveImageSrc()
async function uploadPrivateFile(file, pathPrefix) {
  try { if (file && file.type && file.type.startsWith('image/') && file.type !== 'image/png') file = await compressImage(file); } catch (e) {}
  if (!window.firebase || !firebase.storage) throw new Error('Firebase Storage ยังไม่พร้อม (ตรวจ PRIVATE_UPLOADS + เปิด Storage)');
  const safe = (file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-40);
  const path = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
  const ref = firebase.storage().ref(path);
  await ref.put(file, { contentType: file.type || 'image/jpeg' });
  return { path };               // เก็บ path ลง Firestore
}

// อัปไฟล์ลับ: เลือกอัตโนมัติระหว่าง Storage private (ถ้าเปิด) หรือ Worker/ImgBB (เดิม)
// V16: ถ้า PRIVATE_UPLOADS:true แต่ Storage ยังไม่พร้อม → fallback ไป ImgBB ให้เอง
//      (ออเดอร์จะไม่มีวันพังเพราะตั้ง PRIVATE_UPLOADS — สลิปจะกลายเป็น private เองเมื่อเปิด Storage)
async function uploadSensitive(file, pathPrefix) {
  if ((window.DMC_CONFIG || {}).PRIVATE_UPLOADS) {
    try {
      const r = await uploadPrivateFile(file, pathPrefix);
      return { url: r.path, storage: true };   // url = storage path (อ่านได้เฉพาะแอดมิน)
    } catch (e) {
      console.warn('Private upload not ready, falling back to proxy/ImgBB:', e.message);
      // ไหลต่อไปใช้ ImgBB ด้านล่าง — กันออเดอร์หลุด
    }
  }
  return await uploadToImgBB(file);            // url = ImgBB public URL (legacy)
}

// แปลงค่าที่เก็บไว้ (อาจเป็น URL ImgBB หรือ storage path) → src ที่แสดงได้
// storage path ต้องยืนยันตัวตน (แอดมิน) จึงจะได้ download URL → สลิปไม่สาธารณะ
async function resolveImageSrc(value) {
  if (!value) return '';
  if (/^https?:\/\//.test(value) || value.startsWith('data:')) return value;  // ImgBB / legacy
  try { return await firebase.storage().ref(value).getDownloadURL(); }         // private path
  catch (e) { console.warn('resolveImageSrc failed:', e.message); return ''; }
}

// ─── Cloudflare Worker LINE Notify ───
const CF_WORKER_URL = (window.DMC_CONFIG || {}).CF_WORKER_URL || ""; // TODO: replace

async function sendLineNotify(payload) {
  try {
    // payload can be a string (legacy) or an orderData object (Flex Card)
    const body = typeof payload === 'string'
      ? { message: payload }
      : payload;

    const res = await fetch(`${CF_WORKER_URL}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...dmcWorkerKeyHeader() },
      body: JSON.stringify(body)
    });
    return res.ok;
  } catch (e) {
    console.warn('LINE notify failed:', e);
    return false;
  }
}

// ─── Toast Notifications ───
function toast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: 'check', error: 'close', info: 'info', warning: 'alert' };

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  // V.fix(A2): message ใช้ textContent (กัน HTML-injection / การแสดงผลเพี้ยนเมื่อข้อความมี < & ' " เช่น โค้ดคูปอง/ชื่อสินค้า)
  const iconSpan = document.createElement('span');
  iconSpan.innerHTML = DMC.iconSvg(icons[type] || 'info');
  const msgSpan = document.createElement('span');
  msgSpan.textContent = message;
  el.appendChild(iconSpan);
  el.appendChild(msgSpan);
  container.appendChild(el);

  setTimeout(() => {
    el.classList.add('toast-out');
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ─── SHA-256 Hash ───
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── PBKDF2 Hash (Admin auth) ───
async function pbkdf2Hash(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100000 },
    keyMaterial, 256
  );
  return Array.from(new Uint8Array(bits))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Session Management ───
const SESSION_KEY    = 'dmc_admin_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function createSession() {
  const token = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  const session = {
    token,
    expiry: Date.now() + SESSION_TTL_MS,
    createdAt: Date.now()
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (Date.now() > session.expiry) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  // V3 Security: ออกจากระบบ Firebase Auth ด้วย (ยุติ session ที่เซิร์ฟเวอร์ตรวจสอบจริง)
  try { if (window.firebase && firebase.auth) firebase.auth().signOut(); } catch (e) {}
}

function isAdminAuthenticated() {
  return !!getSession();
}

// ─── Rate Limiter (Admin login) ───
const RATE_KEY      = 'dmc_login_attempts';
const MAX_ATTEMPTS  = 5;
const LOCKOUT_MS    = 15 * 60 * 1000; // 15 minutes

function getRateLimit() {
  try {
    return JSON.parse(localStorage.getItem(RATE_KEY)) || { count: 0, lockedUntil: 0 };
  } catch { return { count: 0, lockedUntil: 0 }; }
}

function recordFailedAttempt() {
  const data = getRateLimit();
  data.count++;
  if (data.count >= MAX_ATTEMPTS) {
    data.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  localStorage.setItem(RATE_KEY, JSON.stringify(data));
  return data;
}

function clearRateLimit() {
  localStorage.removeItem(RATE_KEY);
}

function isLockedOut() {
  const data = getRateLimit();
  if (data.lockedUntil && Date.now() < data.lockedUntil) return true;
  if (data.lockedUntil && Date.now() >= data.lockedUntil) {
    clearRateLimit(); // auto-unlock after timeout
  }
  return false;
}

function getRemainingLockout() {
  const data = getRateLimit();
  if (!data.lockedUntil) return 0;
  return Math.max(0, Math.ceil((data.lockedUntil - Date.now()) / 60000));
}

// ─── ID Generator ───
function generateId(prefix = '') {
  const ts  = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}${ts}${rnd}`;
}

function generateOrderId() {
  // รูปแบบสั้น จำง่าย: DCS + เลข 4 หลัก + ตัวอักษร A–Z 1 ตัว  (เช่น DCS4827K)
  // พื้นที่รหัส = 10,000 (0000–9999) × 26 = 260,000 ค่า — เพียงพอสำหรับร้าน
  // (ลูกค้าจำง่ายขึ้นมาก เทียบกับแบบเดิมที่มีวันที่+เวลา)
  const num    = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));   // A–Z
  return `DCS${num}${letter}`;
}

// ─── Date / Time Helpers ───
function formatDate(date, includeTime = false) {
  const d = date instanceof Date ? date : date?.toDate ? date.toDate() : new Date(date);
  const opts = { day: '2-digit', month: 'short', year: 'numeric' };   // V.upgrade1: ตัด key 'locale' ที่ไม่ถูกต้องออก
  if (includeTime) { opts.hour = '2-digit'; opts.minute = '2-digit'; }
  return d.toLocaleDateString('th-TH', opts);
}

function timeAgo(date) {
  const d = date instanceof Date ? date : date?.toDate ? date.toDate() : new Date(date);
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60)    return 'เมื่อกี้';
  if (seconds < 3600)  return `${Math.floor(seconds/60)} นาทีที่แล้ว`;
  if (seconds < 86400) return `${Math.floor(seconds/3600)} ชั่วโมงที่แล้ว`;
  return formatDate(d);
}

// ─── Number Formatter ───
function formatPrice(n) {
  return '฿' + Number(n).toLocaleString('th-TH');
}

// ─── DOM Helpers ───
function $(selector, parent = document) { return parent.querySelector(selector); }
function $$(selector, parent = document) { return [...parent.querySelectorAll(selector)]; }

function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v);
  });
  children.forEach(child => {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else if (child) el.appendChild(child);
  });
  return el;
}

function show(el) { if (el) el.style.display = ''; }
function hide(el) { if (el) el.style.display = 'none'; }
function toggleClass(el, cls, force) { if (el) el.classList.toggle(cls, force); }

// ─── Cart (localStorage) ───
const CART_KEY = 'dmc_cart';

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));      // V.upgrade1: เขียนก่อน แล้วค่อยแจ้ง (กัน listener อ่านค่าเก่า)
  try { window.dispatchEvent(new Event('dcs-cart-changed')); } catch(e) {}
  updateCartBadge();
}

function addToCart(item) {
  const cart = getCart();
  const existing = cart.find(i => i.id === item.id && (i.options||'') === (item.options||'') && (i.customDetails||'') === (item.customDetails||''));   // V4.6: ละเอียดต่าง = แยกชิ้น
  if (existing) {
    existing.qty += item.qty || 1;
  } else {
    cart.push({ ...item, cartItemId: generateId('C'), qty: item.qty || 1 });
  }
  saveCart(cart);
  toast(`เพิ่ม "${item.name}" ลงตะกร้าแล้ว`, 'success');
}

function removeFromCart(cartItemId) {
  const cart = getCart().filter(i => i.cartItemId !== cartItemId);
  saveCart(cart);
}

function updateCartBadge() {
  const count = getCart().reduce((s, i) => s + (i.qty || 1), 0);
  $$('.nav-cart-badge').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? '' : 'none';
  });
}

function getCartTotal() {
  return getCart().reduce((s, i) => s + (i.price * (i.qty || 1)), 0);
}

// ─── Debounce ───
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── Escape HTML ───
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')      // V3: กัน attribute ที่ครอบด้วย single-quote
    .replace(/`/g, '&#96;');     // V3: กัน template-literal context
}

// ─── Export ───

// ─── Phone Helpers (สำหรับ Order History + OTP) ───
function normalizePhone(phone) {
  // คืนเฉพาะตัวเลข เช่น "080-998 7611" → "0809987611"
  return String(phone || '').replace(/\D/g, '');
}

function toIntlPhone(phone) {
  // แปลงเบอร์ไทยเป็น E.164 สำหรับ Firebase Auth: 0809987611 → +66809987611
  const d = normalizePhone(phone);
  if (d.startsWith('66')) return '+' + d;
  if (d.startsWith('0'))  return '+66' + d.slice(1);
  return '+' + d;
}

// ─── My Orders (localStorage — ดูประวัติเครื่องเดิมได้ทันที) ───
const MY_ORDERS_KEY = 'dmc_my_orders';

function saveMyOrder(docId, orderId) {
  try {
    const list = JSON.parse(localStorage.getItem(MY_ORDERS_KEY) || '[]');
    list.unshift({ docId, orderId, at: Date.now() });
    localStorage.setItem(MY_ORDERS_KEY, JSON.stringify(list.slice(0, 30)));
  } catch (e) { /* localStorage เต็มหรือปิดอยู่ — ข้าม */ }
}

function getMyOrders() {
  try { return JSON.parse(localStorage.getItem(MY_ORDERS_KEY) || '[]'); }
  catch (e) { return []; }
}


// ─── บีบอัดรูปก่อนอัปโหลด (เร็วขึ้น 3-10 เท่า) ───
function compressImage(file, opts) {
  opts = opts || {};
  const maxDim  = opts.maxDim  || 1600;
  const quality = opts.quality || 0.85;
  return new Promise((resolve) => {
    // PNG ที่ต้องคงพื้นโปร่งใส (เทมเพลต) — ไม่บีบ
    if (!file || !file.type || !file.type.startsWith('image/') || file.type === 'image/gif') { resolve(file); return; }
    if (opts.keepPng && file.type === 'image/png') { resolve(file); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width <= maxDim && height <= maxDim && file.size < 600 * 1024) { resolve(file); return; }
        const scale = Math.min(1, maxDim / Math.max(width, height));
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob || blob.size >= file.size) { resolve(file); return; }
          resolve(new File([blob], (file.name || 'image').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', quality);
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

// ─── ตัวดักรูปโหลดพลาดทั้งเว็บ — กัน "รูปแตก" ───
// ─── V16: Image CDN — ย่อรูป + แปลง WebP ตามขนาดที่แสดงจริง (เร่งโหลดรูปอย่างมาก) ───
// ใช้ wsrv.nl (ฟรี, Cloudflare) · ข้ามรูป data:/relative/Storage(private) · ถ้าล่ม fallback ต้นฉบับเอง
function imgCDN(url, width) {
  try {
    const cfg = window.DMC_CONFIG || {};
    if (cfg.IMG_CDN === false) return url;
    if (!url || typeof url !== 'string') return url;
    if (url.indexOf('http') !== 0) return url;                  // data:, relative path, storage path
    if (url.indexOf('firebasestorage') !== -1 || url.indexOf('googleapis') !== -1) return url; // private (มี token)
    if (url.indexOf('wsrv.nl') !== -1 || url.indexOf('weserv') !== -1) return url;             // proxy แล้ว
    const w = Math.max(80, Math.min(1600, width || 600));
    return 'https://wsrv.nl/?url=' + encodeURIComponent(url) + '&w=' + w + '&q=80&output=webp&we';
  } catch (e) { return url; }
}

// เพิ่ม preconnect/dns-prefetch ให้โดเมนรูป (เร่ง handshake รูปแรก) — ฉีดครั้งเดียว
function injectImgPreconnect() {
  try {
    if (document.getElementById('dmc-img-preconnect')) return;
    const hosts = ['https://wsrv.nl', 'https://i.ibb.co'];
    const frag = document.createDocumentFragment();
    hosts.forEach((h, i) => {
      const l = document.createElement('link');
      l.rel = 'preconnect'; l.href = h; l.crossOrigin = '';
      if (i === 0) l.id = 'dmc-img-preconnect';
      frag.appendChild(l);
      const d = document.createElement('link');
      d.rel = 'dns-prefetch'; d.href = h;
      frag.appendChild(d);
    });
    (document.head || document.documentElement).appendChild(frag);
  } catch (e) {}
}

function initImageFallback() {
  injectImgPreconnect();
  function handle(img) {
    if (img.dataset.fbDone) return;
    img.dataset.fbDone = '1';
    img.addEventListener('error', function onErr() {
      // 1) ลองรูปต้นฉบับก่อน (กรณี image CDN ย่อรูปล่ม) — ครั้งเดียว
      const full = img.getAttribute('data-full');
      if (full && !img.dataset.triedFull && img.src !== full) {
        img.dataset.triedFull = '1';
        img.src = full;
        return;   // ให้โอกาสโหลดต้นฉบับ (ถ้ายัง error จะวนกลับเข้ามา)
      }
      // 2) ต้นฉบับก็ยังพัง → แสดงไอคอนรูปภาพแทน
      if (img.dataset.fbApplied) return;
      img.dataset.fbApplied = '1';
      const box = document.createElement('div');
      box.className = 'img-fallback';
      box.innerHTML = DMC.iconSvg('image');
      box.style.cssText = 'width:100%;height:100%;min-height:60px;display:flex;align-items:center;justify-content:center;font-size:2rem;background:linear-gradient(135deg,var(--bg-mid),var(--bg-card2,var(--bg-mid)));color:var(--text-3);border-radius:inherit';
      if (img.parentElement) img.parentElement.replaceChild(box, img);
    });
  }
  document.querySelectorAll('img').forEach(handle);
  if (window.MutationObserver) {
    new MutationObserver(function(muts) {
      muts.forEach(function(m) {
        m.addedNodes.forEach(function(n) {
          if (n.tagName === 'IMG') handle(n);
          else if (n.querySelectorAll) n.querySelectorAll('img').forEach(handle);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }
}

// ─── แบนเนอร์แจ้งเตือนออฟไลน์ ───
function initOfflineBanner() {
  function show() {
    if (document.getElementById('offline-banner')) return;
    const b = document.createElement('div');
    b.id = 'offline-banner';
    b.innerHTML = DMC.iconSvg('info') + ' อินเทอร์เน็ตขาดหาย — บางส่วนอาจไม่อัปเดต กำลังลองเชื่อมต่อใหม่...';
    b.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9998;background:#1f2937;color:#fff;text-align:center;padding:.6rem 1rem;font-size:.85rem;font-family:var(--font-display,sans-serif)';
    document.body.appendChild(b);
  }
  function hide() { const b = document.getElementById('offline-banner'); if (b) b.remove(); }
  window.addEventListener('offline', show);
  window.addEventListener('online', hide);
  if (!navigator.onLine) show();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function(){ initImageFallback(); initOfflineBanner(); });
} else { initImageFallback(); initOfflineBanner(); }

// ─── V16: Read Cache (sessionStorage + TTL) — ลดการอ่าน Firestore ───
const DMC_CACHE_PREFIX = 'dmc_cache_';
function cacheGet(key) {
  try {
    const raw = sessionStorage.getItem(DMC_CACHE_PREFIX + key);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || Date.now() > o.exp) { sessionStorage.removeItem(DMC_CACHE_PREFIX + key); return null; }
    return o.val;
  } catch (e) { return null; }
}
function cacheSet(key, val, ttlMs) {
  try { sessionStorage.setItem(DMC_CACHE_PREFIX + key, JSON.stringify({ val, exp: Date.now() + (ttlMs || 180000) })); }
  catch (e) { /* storage เต็ม — ข้าม */ }
}
function cacheClear(key) {
  try {
    if (key) sessionStorage.removeItem(DMC_CACHE_PREFIX + key);
    else Object.keys(sessionStorage).filter(k => k.indexOf(DMC_CACHE_PREFIX) === 0).forEach(k => sessionStorage.removeItem(k));
  } catch (e) {}
}
// dedup คำขอที่ยิงพร้อมกัน (หน้าแรกเรียกสินค้า+หมวด+แกลเลอรีพร้อมกัน → อ่าน Firestore "ครั้งเดียว")
const _dmcInflight = {};
async function cachedQuery(key, ttlMs, loader) {
  const c = cacheGet(key);
  if (c !== null) return c;
  if (_dmcInflight[key]) return _dmcInflight[key];
  _dmcInflight[key] = (async () => {
    try { const v = await loader(); cacheSet(key, v, ttlMs); return v; }
    finally { delete _dmcInflight[key]; }
  })();
  return _dmcInflight[key];
}

// ─── V16: Static Snapshot loader — อ่านจากไฟล์ JSON บน GitHub Pages (อ่าน Firestore = 0) ───
// คืน array ถ้ามีไฟล์ / null ถ้าไม่มีไฟล์หรือปิดสแนปช็อต → ผู้เรียก fallback ไป Firestore
async function loadSnapshot(name) {
  const cfg = window.DMC_CONFIG || {};
  if (cfg.USE_SNAPSHOT === false) return null;
  try {
    const base = cfg.SNAPSHOT_BASE || './data/';
    const res = await fetch(base + name + '.json', { cache: 'no-cache' });
    if (!res.ok) return null;                 // ยังไม่มีไฟล์ (404) → fallback Firestore
    const data = await res.json();
    return Array.isArray(data) ? data : (data && Array.isArray(data.items) ? data.items : null);
  } catch (e) { return null; }
}

// ─── V16: โหลด "สินค้า active" ใช้ร่วมกันทุกหน้า (snapshot → cache → Firestore) ───
// เดิม: หน้าแรกอ่านสินค้าทั้งคอลเลกชัน 2 รอบ (~140 reads). ใหม่: อ่านครั้งเดียว/เซสชัน หรือ 0 (snapshot)
async function loadProducts(opts) {
  opts = opts || {};
  return cachedQuery('products_active', opts.ttlMs || 180000, async () => {
    const snap = await loadSnapshot('products');
    if (snap) return snap.filter(p => p && p.active !== false);
    const db = await getFirebaseReady();
    const qs = await db.collection('products').where('active', '==', true).limit(opts.limit || 300).get();
    const items = [];
    qs.forEach(d => {
      const x = d.data();
      if (x.createdAt && x.createdAt.seconds != null) x.createdAt = { seconds: x.createdAt.seconds }; // ให้ JSON cache ได้
      items.push({ id: d.id, ...x });
    });
    return items;
  });
}

async function loadGallery(opts) {
  opts = opts || {};
  return cachedQuery('gallery_active', opts.ttlMs || 300000, async () => {
    const snap = await loadSnapshot('gallery');
    if (snap) return snap.filter(x => x && x.active !== false);
    const db = await getFirebaseReady();
    const qs = await db.collection('gallery').limit(opts.limit || 60).get();
    const items = [];
    qs.forEach(d => { const x = d.data(); if (x.active !== false) items.push({ id: d.id, ...x }); });
    return items;
  });
}

// ─── PERF-03: โหลด "หมวดหมู่" แบบเดียวกับสินค้า (snapshot → cache → Firestore) ───
// เดิมหน้าแรก + categories.js อ่าน Firestore ตรงทุกครั้ง → ตอนนี้อ่านครั้งเดียว/เซสชัน หรือ 0 (snapshot)
// คืน array ของ raw category docs ({ id, ...fields }) ให้ผู้เรียกแปลงเอง
async function loadCategoriesRaw(opts) {
  opts = opts || {};
  return cachedQuery('categories_all', opts.ttlMs || 300000, async () => {
    const snap = await loadSnapshot('categories');
    if (snap) return snap;
    const db = await getFirebaseReady();
    const qs = await db.collection('categories').get();
    const items = [];
    qs.forEach(d => {
      const x = d.data();
      if (x.createdAt && x.createdAt.seconds != null) x.createdAt = { seconds: x.createdAt.seconds }; // ให้ JSON cache ได้
      items.push({ id: d.id, ...x });
    });
    return items;
  });
}

// ─── V24/PERF-B: โหลดสแนปช็อตแบบ "อ็อบเจ็กต์" (ไม่ใช่ array) เช่น siteContent ───
async function loadSnapshotObject(name) {
  const cfg = window.DMC_CONFIG || {};
  if (cfg.USE_SNAPSHOT === false) return null;
  try {
    const base = cfg.SNAPSHOT_BASE || './data/';
    const res = await fetch(base + name + '.json', { cache: 'no-cache' });
    if (!res.ok) return null;
    const data = await res.json();
    return (data && typeof data === 'object') ? data : null;
  } catch (e) { return null; }
}

// ─── V24/PERF-B: โหลด "รีวิวที่อนุมัติแล้ว" (snapshot → cache → Firestore) ───
//   ทำให้หน้าแรกไม่ต้องโหลด Firebase SDK เพื่อแสดงรีวิว (อ่านจากไฟล์ data/reviews.json)
//   fallback: ถ้าไม่มีไฟล์ → อ่าน Firestore (โหลด Firebase ตามเดิม) เพื่อไม่ให้รีวิวหาย
async function loadReviews(opts) {
  opts = opts || {};
  const limit = opts.limit || 50;
  return cachedQuery('reviews_approved', opts.ttlMs || 300000, async () => {
    const snap = await loadSnapshot('reviews');
    if (snap) return snap.filter(r => r && r.status === 'approved');
    const db = await getFirebaseReady();
    const qs = await db.collection('reviews').where('status', '==', 'approved').limit(limit).get();
    const items = [];
    qs.forEach(d => {
      const x = d.data();
      if (x.createdAt && x.createdAt.seconds != null) x.createdAt = { seconds: x.createdAt.seconds };
      items.push({ id: d.id, ...x });
    });
    return items;
  });
}

// Shared inline SVG set for interface icons. Decorative icons stay hidden from
// assistive technology; controls provide their own accessible names.
const DMC_ICON_PATHS = Object.freeze({
  home: '<path d="m3 10 9-7 9 7"/><path d="M5.5 9v11h5v-6h3v6h5V9"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.4"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.4"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.4"/>',
  bag: '<path d="M4 8h16l-1 12H5L4 8Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/>',
  cart: '<path d="M2.8 4h2.5l2.3 11.1a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.5l1.6-6.6H6.2"/><circle cx="9.8" cy="20" r="1.4"/><circle cx="17.1" cy="20" r="1.4"/>',
  package: '<path d="m12 3 8 4v10l-8 4-8-4V7l8-4Z"/><path d="m4.5 7.2 7.5 4 7.5-4M12 11.2V21"/>',
  document: '<path d="M7 3.5h8l4 4v13H5V5.5a2 2 0 0 1 2-2Z"/><path d="M15 3.8v4h4M8 12h8M8 16h6"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 17 5-5 3 3 3-4 5 6"/>',
  phone: '<path d="M6.5 3.5h3l1.5 4-2 1.7a14 14 0 0 0 5.8 5.8l1.7-2 4 1.5v3a2 2 0 0 1-2.2 2C10.6 18.6 5.4 13.4 4.5 5.7a2 2 0 0 1 2-2.2Z"/>',
  chat: '<path d="M20.5 11.5a8 8 0 0 1-8.5 7.7 10 10 0 0 1-3-.45L4 21l1.3-4A7.1 7.1 0 0 1 3.5 11.5 8 8 0 0 1 12 4a8 8 0 0 1 8.5 7.5Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>',
  upload: '<path d="M12 15V4m0 0L8 8m4-4 4 4"/><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>',
  edit: '<path d="m4 16.5-.8 4.3 4.3-.8L19 8.5 15.5 5 4 16.5Z"/><path d="m13.8 6.7 3.5 3.5"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.3 1-1.4 2.4-1.6-.6a8 8 0 0 1-1.7 1l-.2 1.7h-2.8l-.2-1.7a8 8 0 0 1-1.7-1l-1.6.6-1.4-2.4 1.3-1a7 7 0 0 1 0-2l-1.3-1 1.4-2.4 1.6.6a8 8 0 0 1 1.7-1l.2-1.7h2.8l.2 1.7a8 8 0 0 1 1.7 1l1.6-.6 1.4 2.4-1.3 1a7 7 0 0 1-.1 2Z"/>',
  truck: '<path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"/><circle cx="7.5" cy="18" r="1.8"/><circle cx="17.5" cy="18" r="1.8"/>',
  shield: '<path d="m12 3 7 3v5c0 4.7-2.9 8-7 10-4.1-2-7-5.3-7-10V6l7-3Z"/><path d="m8.5 12 2.2 2.2 4.8-4.8"/>',
  heart: '<path d="M20 8.8c0 5.1-8 10.2-8 10.2S4 13.9 4 8.8A4.3 4.3 0 0 1 12 6.4a4.3 4.3 0 0 1 8 2.4Z"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  alert: '<path d="M10.3 3.9 2.9 17a2 2 0 0 0 1.8 3h14.6a2 2 0 0 0 1.8-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 3h.01"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  trash: '<path d="M4 7h16M10 11v6m4-6v6M5.5 7l1 14h11l1-14M9 7V4h6v3"/>',
  gift: '<rect x="3" y="9" width="18" height="12" rx="1.5"/><path d="M12 9v12M3 13h18M12 9H7.8a2.3 2.3 0 1 1 2.3-2.3V9Zm0 0h4.2a2.3 2.3 0 1 0-2.3-2.3V9Z"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.6 9A7 7 0 0 1 18 6.5L20 12M4 12l2 5.5A7 7 0 0 0 18.4 15"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
  arrowRight: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  arrowLeft: '<path d="M20 12H5m6 6-6-6 6-6"/>',
  arrowUp: '<path d="M12 20V5m-6 6 6-6 6 6"/>',
  arrowDown: '<path d="M12 4v15m-6-6 6 6 6-6"/>',
  move: '<path d="M12 3v18m-4-14 4-4 4 4M8 17l4 4 4-4M3 12h18m-4-4 4 4-4 4M7 8l-4 4 4 4"/>',
  circle: '<circle cx="12" cy="12" r="8.5"/>',
  play: '<path d="m8 5 11 7-11 7V5Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  sparkle: '<path d="m12 3 1.7 6.3L20 11l-6.3 1.7L12 19l-1.7-6.3L4 11l6.3-1.7L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/>',
  star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18h1.2a1.8 1.8 0 0 0 1.4-3c-.7-.9-.1-2.1 1-2.1h1.3A4.1 4.1 0 0 0 21 11.8C21 7 16.9 3 12 3Z"/><circle cx="7.5" cy="10" r=".8"/><circle cx="11" cy="6.8" r=".8"/><circle cx="16" cy="8" r=".8"/>',
  ruler: '<path d="m4 17 13-13 4 4-13 13-4-4Z"/><path d="m14 7 3 3m-6 1 2 2m-5 1 2 2"/>',
  scissors: '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="m8 8 12 12M8 16 20 4M12 12l-2 2"/>',
  file: '<path d="M7 3.5h8l4 4v13H5V5.5a2 2 0 0 1 2-2Z"/><path d="M15 3.8v4h4"/>',
  box: '<path d="m4 7 8-4 8 4v10l-8 4-8-4V7Z"/><path d="m4.5 7.2 7.5 4 7.5-4M12 11.2V21"/>'
});
function dmcIconSvg(name, className) {
  const paths = DMC_ICON_PATHS[name];
  if (!paths) return '';
  const classes = String(className || 'dmc-icon').split(/\s+/).filter(value => /^[a-z0-9_-]+$/i.test(value)).join(' ');
  return '<svg class="' + classes + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + paths + '</svg>';
}

window.DMC = {
  // Firebase
  getFirebaseReady,
  // V16: data layer (cache + snapshot)
  loadProducts,
  loadGallery,
  loadCategoriesRaw,
  loadReviews,
  loadSnapshot,
  loadSnapshotObject,
  cachedQuery,
  cacheGet,
  cacheSet,
  cacheClear,
  imgCDN,
  normalizePhone,
  toIntlPhone,
  saveMyOrder,
  getMyOrders,
  getDb,
  // Image
  uploadToImgBB,
  uploadSensitive,
  uploadPrivateFile,
  resolveImageSrc,
  compressImage,
  // Notify
  sendLineNotify,
  // Toast
  toast,
  // Auth
  sha256,
  pbkdf2Hash,
  createSession,
  getSession,
  clearSession,
  isAdminAuthenticated,
  // Rate limit
  recordFailedAttempt,
  clearRateLimit,
  isLockedOut,
  getRemainingLockout,
  getRateLimit,
  MAX_ATTEMPTS,
  // IDs
  generateId,
  generateOrderId,
  // Date
  formatDate,
  timeAgo,
  // Number
  formatPrice,
  // DOM
  $, $$, createElement, show, hide, toggleClass,
  iconSvg: dmcIconSvg,
  // Cart
  getCart,
  saveCart,
  addToCart,
  removeFromCart,
  updateCartBadge,
  getCartTotal,
  // Misc
  debounce,
  escapeHtml
};

// Static pages can use data-dmc-icon slots so decorative marks share this
// inline SVG set without adding a dependency or changing their accessible text.
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-dmc-icon]').forEach(slot => {
    slot.innerHTML = DMC.iconSvg(slot.dataset.dmcIcon || '');
  });
});

// Init cart badge on load
document.addEventListener('DOMContentLoaded', () => {
  DMC.updateCartBadge();
});

/* ── DMC.confirm — กล่องยืนยันตามธีม (แทน window.confirm ที่ดูไม่สวย) ── */
(function () {
  if (!window.DMC) window.DMC = {};
  window.DMC.confirm = function (message, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var old = document.getElementById('dmc-confirm-modal'); if (old) old.remove();
      var modal = document.createElement('div');
      modal.id = 'dmc-confirm-modal';
      modal.style.cssText = 'position:fixed;inset:0;z-index:10060;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:1rem;backdrop-filter:blur(4px)';
      var box = document.createElement('div');
      box.style.cssText = 'background:var(--bg-card,#fff);border:1.5px solid var(--border,#e5e7eb);border-radius:var(--r-2xl,24px);padding:1.75rem;max-width:340px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,.3);text-align:center';
      var icon = document.createElement('div');
      icon.style.cssText = 'font-size:2.4rem;margin-bottom:.55rem'; icon.innerHTML = window.DMC.iconSvg(opts.iconName || 'alert');
      var title = document.createElement('div');
      title.style.cssText = 'font-family:var(--font-display),sans-serif;font-weight:700;font-size:1.08rem;color:var(--text-1);margin-bottom:.4rem';
      title.textContent = opts.title || 'ยืนยันการทำรายการ';
      var msg = document.createElement('div');
      msg.style.cssText = 'font-size:.88rem;color:var(--text-2);margin-bottom:1.5rem;line-height:1.55;white-space:pre-line';
      msg.textContent = message || '';
      var btns = document.createElement('div'); btns.style.cssText = 'display:flex;gap:.7rem';
      var ok = document.createElement('button'); ok.textContent = opts.okText || 'ยืนยัน';
      ok.style.cssText = 'flex:1;padding:.72rem 1rem;background:' + (opts.danger === false ? 'var(--accent,#0ea5e9)' : 'var(--rose,#f43f5e)') + ';border:none;border-radius:var(--r-lg,14px);color:#fff;font-family:var(--font-display),sans-serif;font-weight:600;font-size:.9rem;cursor:pointer';
      var cancel = document.createElement('button'); cancel.textContent = opts.cancelText || 'ยกเลิก';
      cancel.style.cssText = 'flex:1;padding:.72rem 1rem;background:var(--bg-mid,#f1f5f9);border:1.5px solid var(--border,#e5e7eb);color:var(--text-2);border-radius:var(--r-lg,14px);font-family:var(--font-display),sans-serif;font-weight:600;font-size:.9rem;cursor:pointer';
      btns.appendChild(ok); btns.appendChild(cancel);
      box.appendChild(icon); box.appendChild(title); box.appendChild(msg); box.appendChild(btns);
      modal.appendChild(box); document.body.appendChild(modal);
      function done(v) { modal.remove(); document.removeEventListener('keydown', onKey); resolve(v); }
      function onKey(e) { if (e.key === 'Escape') done(false); if (e.key === 'Enter') done(true); }
      ok.addEventListener('click', function () { done(true); });
      cancel.addEventListener('click', function () { done(false); });
      modal.addEventListener('click', function (e) { if (e.target === modal) done(false); });
      document.addEventListener('keydown', onKey);
      setTimeout(function () { ok.focus(); }, 50);
    });
  };
})();
