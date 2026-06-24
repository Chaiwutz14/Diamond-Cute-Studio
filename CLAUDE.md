# CLAUDE.md — Guide for AI Assistants

Notes for Claude (and other AI coding assistants) working in this repo. The user-facing docs (`README.md`, `USER-MANUAL.md`, `DATA-MODEL.md`, `HANDOVER.md`, `CHANGELOG*.md`) are written in Thai for the shop owner — this file is the technical orientation for code work.

---

## 1. What this project is

**Diamond Cute Studio** — a Thai print-shop storefront (โพลารอยด์, นามบัตร, บัตรแขวนคอ, ป้ายร้าน, QR Code) with cart, OTP order tracking, reviews, full admin backend, and PWA support.

**Stack (no build step):**
- Pure HTML + CSS + vanilla JS — one `<script>` tag per file in each HTML page
- Firebase Firestore + Auth (project `diamond-cute-studio`, region `asia-southeast3`)
- Cloudflare Worker (`dmc-studio-notify`) for LINE notifications + ImgBB upload proxy + optional slip-verify
- ImgBB (via Worker proxy) or Firebase Storage (private) for image hosting
- Hosted on GitHub Pages from the `main` branch via `.github/workflows/deploy.yml`

There is **no `package.json`, no bundler, no test runner, no TypeScript**. Everything loads directly in the browser. Don't introduce a build step.

---

## 2. Repository layout

```
index.html, catalog.html, product.html, cart.html, orders.html,
about.html, gallery.html, contact.html, admin.html, admin-login.html,
404.html                              ← one page = one HTML file at repo root
manifest.webmanifest, sw.js           ← PWA shell + service worker
robots.txt, sitemap.xml

js/
  config.js          ⭐ ALL site-wide config (Firebase, admin email, URLs, shipping)
  categories.js      ⭐ Built-in product categories — single source of truth
  utils.js           Firebase init + DMC.* helpers (cart, uploads, toasts, auth, IDs)
  cms.js             Loads siteContent/main from Firestore (hero, contact, FAQ…)
  theme-init.js      Runs FIRST on every page — picks theme, frame-buster
  theme-switcher.js  Theme picker UI
  loading.js, skeleton.js
  navbar.js, footer.js, bottom-nav.js, custom-select.js, pwa-install.js
                     ↑ Self-injecting components: each file ships its OWN CSS
  inline-editor.js   Admin-only inline content editing on public pages
  admin-access.js    Gate that hides admin bits when not logged in

  home.js, catalog.js, product.js, gallery.js, contact-page.js, about-page.js,
  order.js, order-history.js, cart-ish via utils.js
                     ↑ One JS file per page (matches HTML filename roughly)

  admin-core.js      Login (Firebase Auth + PBKDF2 fallback), shared state
  admin-page.js      Section router/bootstrap for admin.html
  admin-nav.js, admin-templates.js
  admin-overview.js, admin-orders.js, admin-products.js, admin-gallery.js,
  admin-contacts.js, admin-reviews.js, admin-content.js, admin-coupons.js,
  admin-settings.js  ← one file per admin sidebar section
  admin-login-page.js

  reviews.js, canvas-preview.js, slip-verify.js, sw-register.js
  vendor/jsqr.min.js ← only third-party JS (QR reader for slip verify)

css/
  themes.css         CSS variables for 6+ themes (sky, peach, gold, etc.)
  main.css, navbar.css, loading.css
  home.css, product.css, order.css, admin.css
  (component CSS lives INSIDE its component JS — see §4)

data/
  products.json, gallery.json   ← static snapshot served from GH Pages CDN
  README.txt                    ← how to regenerate via tools/export-snapshot.html

firebase-rules/
  firestore.rules    ← copy-paste into Firebase Console → Firestore → Rules
  storage.rules      ← copy-paste into Firebase Console → Storage → Rules

cloudflare-worker/
  index.js           Worker source (LINE notify + /upload proxy + /verify-slip)
  wrangler.toml

tools/
  export-snapshot.html   Admin runs this in a browser to regenerate data/*.json
  hero-preview.html      Preview of the desktop hero coverflow across themes
accent-preview.html      Quick preview of accent color across themes

assets/                  Icons + OG image
.github/workflows/deploy.yml   GH Pages deploy on push to main
```

---

## 3. Configuration — change in ONE place

`js/config.js` exposes `window.DMC_CONFIG`. **Loaded before `js/utils.js` on every page.** Keys to know:

| Key | Purpose |
|---|---|
| `FIREBASE_CONFIG` | Firebase web app config (apiKey is public — protection lives in Firestore Rules) |
| `ADMIN_EMAIL` | The Firebase Auth user that `isAdmin()` checks in rules. **Must match `firestore.rules` line `request.auth.token.email == '…'`.** Currently `peeza1482546@gmail.com`. |
| `UPLOAD_PROXY_URL` | Cloudflare Worker `/upload` endpoint (keeps ImgBB key off the client) |
| `IMGBB_API_KEY` | Intentionally empty in V3+ — uploads must go through the Worker |
| `APP_CHECK_SITE_KEY` | reCAPTCHA v3 key for Firebase App Check; empty = disabled |
| `PRIVATE_UPLOADS` | `true` → slips/customer files go to Firebase Storage `orders/<orderId>/`; auto-falls-back to ImgBB if Storage isn't enabled |
| `CF_WORKER_URL` | Worker base URL for `/notify` and `/verify-slip` |
| `SLIP_VERIFY` | Free local QR check (`enabled:true`) + optional paid API mode (`api.enabled`) |
| `SHIPPING` | `{ cod, transfer }` baht — must stay in sync with shop's actual rates |
| `USE_SNAPSHOT`, `SNAPSHOT_BASE` | Read products/gallery from `data/*.json` instead of Firestore (massive read-quota saver) |
| `IMG_CDN` | Route image URLs through `wsrv.nl` for WebP + resize; falls back to original if CDN fails |

**Built-in product categories live in `js/categories.js`** (BUILTIN array). Custom categories the shop adds via admin go to Firestore `categories/`. Use `window.DMCCat.{loadAll, matches, labelFor}` — don't hardcode category strings anywhere else.

---

## 4. Architecture conventions

### Global namespace: `window.DMC`
`js/utils.js` exports a single `window.DMC` object with everything: `getFirebaseReady`, `loadProducts`, `loadGallery`, `cachedQuery`, `uploadToImgBB`, `uploadSensitive`, `imgCDN`, `toast`, `confirm`, `getCart`/`addToCart`/`removeFromCart`/`updateCartBadge`, `generateOrderId`, `formatPrice`, `formatDate`, `escapeHtml`, `$`/`$$`, etc. Read the export block at the bottom of `utils.js` (around line 668) before adding helpers.

Similarly: `window.DMCCat` (categories), `window.DMC_CONFIG` (config). Stay on these globals — there is no module system.

### Script load order (matters!)
Every HTML page loads in this order:
1. `theme-init.js` in `<head>` (sets `data-theme` before paint, prevents flash + frame-busts iframing)
2. `loading.js`, `config.js`, `utils.js` (in `<body>` or just before `</body>`)
3. `cms.js`, `categories.js`, page-specific JS, component JS (`footer.js`, `bottom-nav.js`, etc.)

If you reorder, expect breakage. Use existing pages as templates.

### Self-injecting components
`footer.js`, `bottom-nav.js`, `custom-select.js`, `pwa-install.js` each render their own DOM **and inject their own `<style>` tag**. To restyle one of them, edit the CSS string inside the JS file — there is no separate CSS file.

### Data layer: snapshot-first, Firestore-fallback
`DMC.loadProducts()` / `DMC.loadGallery()` read from `data/*.json` first (when `USE_SNAPSHOT` is on), fall back to Firestore on miss, and cache in `sessionStorage` with TTL. `DMC.cachedQuery(key, fn)` is the generic wrapper. **Don't call `db.collection('products').get()` directly from page code** — it defeats the read-budget design (free tier = 50k reads/day, target is ~0-10 per visit).

When products or gallery change, the admin must re-export via `tools/export-snapshot.html` and commit the new JSON. The fallback to Firestore means stale snapshots aren't catastrophic.

### Images
Pass any image URL through `DMC.imgCDN(url, width)` before putting it in an `<img src>`. It routes through `wsrv.nl` for WebP + resize when `IMG_CDN: true`. Pair with `decoding="async"` and appropriate `loading="lazy"`.

### CSP
Every HTML page has a strict CSP `<meta>`. Inline scripts are **not allowed**. Inline `onclick="someUrl(...)"` is blocked too — wire up listeners in JS via `addEventListener` or `data-*` attributes + event delegation. `admin-core.js` line 6 spells this out: *"ห้ามใส่ onclick ที่มี URL/ชื่อ ใน template string"*.

### Service worker cache version
`sw.js` `CACHE_VERSION` (currently `'dcs-v16-7-glow'`). **Bump it whenever you change a precached JS/CSS file**, otherwise returning visitors keep the stale copy. The precache list at the top of `sw.js` is authoritative — add new top-level JS/CSS files there.

### Theme system
6 themes via CSS variables in `css/themes.css`, switched by `data-theme` on `<html>`. `theme-init.js` runs synchronously in `<head>` to avoid a flash. Don't hardcode colors — use the CSS vars (`--accent`, `--bg-card`, `--text-1`, `--text-2`, `--border`, `--r-lg`, `--r-2xl`, `--font-display`).

### Security model summary
- Firebase config is intentionally public; real protection is in `firebase-rules/firestore.rules` (`isAdmin()` checks `request.auth.token.email`).
- Orders: anyone can `get` a single doc by `docId` (the random 20-char id IS the access token); `list` requires admin OR a phone-OTP-verified caller matching the order's `phoneSearch`/`customerPhone`.
- Server-side secrets (LINE token, ImgBB key, optional SlipOK/EasySlip key) live as Cloudflare Worker secrets only.
- Admin fallback password is a PBKDF2-SHA256 hash in `js/admin-core.js` (no plaintext anywhere).
- Slip dedupe via `slipGuard/<hash>` doc-id-as-existence pattern.
- Worker is fail-closed on CORS — only the shop domain + localhost by default.

---

## 5. Data model (cheat sheet)

Full reference in `DATA-MODEL.md`. Collections at Firestore root:

- `products` — items with `images[{url,label}]`, `coverIndex`, sizes/materials, `templates[]`, flags `isHot/isNew/active`
- `orders` — full order incl. `slipUrl`, `slipVerify{status,reason,provider,amount}`, `phoneSearch` (digits only, for OTP query), `status: pending → processing → shipping → done | cancelled`, `carrier`, `trackingNo`
- `reviews` — `status: pending/approved/rejected`, customer-created must be `pending`
- `gallery` — work samples (`cat` slug, `image`, `size`)
- `siteContent/main` — single doc CMS: `hero`, `promo`, `stats`, `contact`, `payment{methods{...}}`, `faq[]`, `pages{about,gallery}`, `lastDeliveredAt`
- `templates` — PNG frames for customer canvas preview
- `categories` — custom shop categories (built-ins are in `js/categories.js`)
- `contacts` — contact form inbox
- `coupons` + `couponGuard` (per-customer marker) — usage atomically increments via rules
- `slipGuard` — anti-duplicate slip marker keyed by QR payload hash

---

## 6. Workflow conventions

### Branch & deploy
- Current working branch for docs/AI work: `claude/claude-md-docs-gej7zd`
- Production deploys on every push to `main` via `.github/workflows/deploy.yml` (uploads the whole repo as a Pages artifact — no build).
- Don't push to `main` without explicit user authorization. Branch policies in this session: develop on the assigned branch, push there, do NOT open PRs unless asked.

### Commit messages
Follow existing style — short, imperative, often Thai+English mix with a `feat/fix/chore(scope):` prefix. Examples from history:
- `fix(home): bump hero accent halo opacity so the glow is actually visible`
- `chore(sw): bump cache version so the hero accent CSS update invalidates old caches on deploy`

### After changing JS/CSS
1. Bump `CACHE_VERSION` in `sw.js`.
2. If you added a new top-level JS/CSS asset, also add it to the `PRECACHE` list in `sw.js`.
3. If you changed product/gallery rendering shape, remember `data/*.json` snapshots may need re-exporting (admin does this; not a code task).

### When editing rules
`firebase-rules/firestore.rules` and `firebase-rules/storage.rules` are **source files** — they don't auto-deploy. The shop owner copies them into Firebase Console after merging. Keep the admin email in both rule files in sync with `ADMIN_EMAIL` in `js/config.js` (currently `peeza1482546@gmail.com`).

### Worker changes
Editing `cloudflare-worker/index.js` does not deploy automatically. The owner copy-pastes into the Cloudflare Dashboard (or runs `wrangler` themselves). Mention this in PR/commit messages if you change Worker code.

---

## 7. Things to avoid

- ❌ Don't introduce a bundler, transpiler, framework, or package manager — the explicit design is "edit a file, push, GitHub Pages serves it."
- ❌ Don't add inline `<script>` or inline `onclick="…"` handlers (CSP will block them; `admin-core.js` has explicit rules).
- ❌ Don't query Firestore directly from page code for products/gallery — use `DMC.loadProducts` / `DMC.loadGallery` / `DMC.cachedQuery`.
- ❌ Don't hardcode category names — go through `window.DMCCat`.
- ❌ Don't hardcode theme colors — use the CSS variables.
- ❌ Don't bump `IMGBB_API_KEY` back into client config (the V3 security work removed it on purpose).
- ❌ Don't change `ADMIN_EMAIL` in only one of the three places (`config.js`, `firestore.rules`, `storage.rules`).
- ❌ Don't forget to bump `sw.js` `CACHE_VERSION` when changing precached files — returning users will see stale code.
- ❌ Don't create new top-level docs (`*.md`) unless asked. The Thai docs (`README/USER-MANUAL/DATA-MODEL/HANDOVER/CHANGELOG`) are owner-maintained.

---

## 8. Quick orientation tasks

- "Why is X showing the wrong color/text on the homepage?" → likely `js/home.js`, `css/home.css`, or a `siteContent/main` field (admin CMS, not code).
- "Add a new admin section" → new `js/admin-foo.js`, add `<script>` to `admin.html`, add sidebar entry, register in `admin-page.js` router.
- "New built-in category" → add to `BUILTIN` array in `js/categories.js`; no other code changes needed.
- "Change shipping cost" → `SHIPPING` in `js/config.js` only.
- "Order flow bug" → start at `js/order.js` (checkout) and `js/admin-orders.js` (status changes); rules constraints in `firestore.rules` `match /orders`.
- "Slip verify behavior" → `js/slip-verify.js` (local jsQR), `cloudflare-worker/index.js` `/verify-slip` (paid API), config in `SLIP_VERIFY`.

For deeper history of why things are the way they are, `CHANGELOG-DMC-STUDIO.md` (V16 remediation) is the most useful single doc.
