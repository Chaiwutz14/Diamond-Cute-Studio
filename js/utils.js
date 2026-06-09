/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Firebase & Utils
   js/utils.js
═══════════════════════════════════════════════ */

// ─── Firebase Config ───
// TODO: Replace with your actual Firebase project config
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyB7bssyVp57OOX2Q0PDcmjdL259VuEOP-0",
  authDomain:        "diamond-cute-studio.firebaseapp.com",
  projectId:         "diamond-cute-studio",
  storageBucket:     "diamond-cute-studio.firebasestorage.app",
  messagingSenderId: "896135008460",
  appId:             "1:896135008460:web:be9bb385f3aca1533f3269"
};

// ─── Firebase Ready Promise ───
let _db = null;
let _firebaseReady = null;

function getFirebaseReady() {
  if (_firebaseReady) return _firebaseReady;

  _firebaseReady = new Promise((resolve, reject) => {
    try {
      // Load Firebase SDK dynamically
      const scripts = [
        'https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js',
        'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js'
      ];

      let loaded = 0;

      scripts.forEach(src => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
          loaded++;
          if (loaded === scripts.length) {
            try {
              if (!firebase.apps.length) {
                firebase.initializeApp(FIREBASE_CONFIG);
              }
              _db = firebase.firestore();

              // Enable offline persistence
              _db.enablePersistence({ synchronizeTabs: true })
                .catch(err => {
                  if (err.code !== 'failed-precondition' && err.code !== 'unimplemented') {
                    console.warn('Persistence error:', err);
                  }
                });

              console.log('✅ Firebase ready');
              resolve(_db);
            } catch (e) {
              reject(e);
            }
          }
        };
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
      });
    } catch (e) {
      reject(e);
    }
  });

  return _firebaseReady;
}

function getDb() { return _db; }

// ─── ImgBB Upload ───
const IMGBB_API_KEY = "df00a7ad6294a89bc99d7c6f900e7393"; // TODO: replace

async function uploadToImgBB(file) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(
    `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) throw new Error('ImgBB upload failed');
  const data = await response.json();
  return {
    url:       data.data.url,
    thumbUrl:  data.data.thumb?.url || data.data.url,
    deleteUrl: data.data.delete_url,
    id:        data.data.id
  };
}

// ─── Cloudflare Worker LINE Notify ───
const CF_WORKER_URL = "https://dmc-studio-notify.peeza1482546.workers.dev"; // TODO: replace

async function sendLineNotify(payload) {
  try {
    // payload can be a string (legacy) or an orderData object (Flex Card)
    const body = typeof payload === 'string'
      ? { message: payload }
      : payload;

    const res = await fetch(`${CF_WORKER_URL}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;
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
  const num = String(Math.floor(Math.random() * 9000) + 1000);
  return `DCS-${num}`;
}

// ─── Date / Time Helpers ───
function formatDate(date, includeTime = false) {
  const d = date instanceof Date ? date : date?.toDate ? date.toDate() : new Date(date);
  const opts = { day: '2-digit', month: 'short', year: 'numeric', locale: 'th-TH' };
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
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(item) {
  const cart = getCart();
  const existing = cart.find(i => i.id === item.id && (i.options||'') === (item.options||''));
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
    .replace(/"/g, '&quot;');
}

// ─── Export ───
window.DMC = {
  // Firebase
  getFirebaseReady,
  getDb,
  // Image
  uploadToImgBB,
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

// Init cart badge on load
document.addEventListener('DOMContentLoaded', () => {
  DMC.updateCartBadge();
});
