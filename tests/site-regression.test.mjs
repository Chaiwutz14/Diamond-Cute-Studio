import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const homeScript = fs.readFileSync(path.join(root, 'js/home.js'), 'utf8');
const orderScript = fs.readFileSync(path.join(root, 'js/order.js'), 'utf8');
const catalogScript = fs.readFileSync(path.join(root, 'js/catalog.js'), 'utf8');
const productHtml = fs.readFileSync(path.join(root, 'product.html'), 'utf8');
const productScript = fs.readFileSync(path.join(root, 'js/product.js'), 'utf8');
const footerScript = fs.readFileSync(path.join(root, 'js/footer.js'), 'utf8');
const aboutHtml = fs.readFileSync(path.join(root, 'about.html'), 'utf8');
const aboutScript = fs.readFileSync(path.join(root, 'js/about-page.js'), 'utf8');
const adminLoginHtml = fs.readFileSync(path.join(root, 'admin-login.html'), 'utf8');
const adminHtml = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
const adminCoreScript = fs.readFileSync(path.join(root, 'js/admin-core.js'), 'utf8');
const adminPageScript = fs.readFileSync(path.join(root, 'js/admin-page.js'), 'utf8');
const products = JSON.parse(fs.readFileSync(path.join(root, 'data/products.json'), 'utf8')).items;
const categories = JSON.parse(fs.readFileSync(path.join(root, 'data/categories.json'), 'utf8')).items;
const require = createRequire(import.meta.url);
const { createFromWorker } = require('../js/order-persistence.js');
const { computeTotals } = require('../js/order-calculations.js');
const { summarize: summarizeCategoryAvailability } = require('../js/category-availability.js');
const { format: formatShipping } = require('../js/shipping-display.js');

function homeCategoryCards() {
  return [...html.matchAll(/<a\b(?=[^>]*\bcat-card\b)([^>]*)>([\s\S]*?)<\/a>/g)].map(([, attrs, body]) => ({
    href: attrs.match(/\bhref="([^"]+)"/)?.[1] || '',
    slug: attrs.match(/\bdata-cat="([^"]+)"/)?.[1] || '',
    label: body.match(/class="cat-name">([^<]+)</)?.[1]?.trim() || '',
  }));
}

test('homepage has one category chooser and no duplicate popular-category row', () => {
  assert.equal((html.match(/id="categories-grid"/g) || []).length, 1);
  assert.doesNotMatch(html, /id="home-popular-categories"|class="hp-popular-section"/);
});

test('authored category buttons link to real categories represented in the local catalog', () => {
  const expected = new Map([
    ['โพลารอยด์', { slug: 'polaroid', productCategory: 'รูปโพลารอยด์' }],
    ['ความทรงจำ', { slug: 'cat-mqarvesg', productCategory: 'ความทรงจำ' }],
    ['บัตรนักเรียน', { slug: 'student-card', productCategory: 'บัตรนักเรียน' }],
    ['บัตรพนักงาน', { slug: 'lanyard', productCategory: 'บัตรแขวนคอ' }],
    ['ป้ายตุ๊กตา', { slug: 'doll-tag', productCategory: 'ป้ายตุ๊กตา' }],
    ['QR Code', { slug: 'qrcode', productCategory: 'QR Code' }],
  ]);
  const cards = homeCategoryCards();

  assert.equal(cards.length, expected.size, 'each available category should have one authored button');
  for (const card of cards) {
    const mapping = expected.get(card.label);
    assert.ok(mapping, `unexpected category label: ${card.label}`);
    assert.equal(card.slug, mapping.slug, `${card.label} should use its real category slug`);
    assert.equal(card.href, `catalog.html?cat=${mapping.slug}`, `${card.label} should preserve the category filter`);
    assert.ok(products.some(product => product.active !== false && product.category === mapping.productCategory), `${card.label} should have an active product in the local catalog`);
  }
  assert.ok(categories.some(category => category.slug === 'cat-mqarvesg' && category.name === 'ความทรงจำ'), 'custom memory category slug should exist in project data');
});

test('homepage carousel does not advertise the unverified first-order free-shipping offer', () => {
  const bannerConfig = homeScript.match(/const DMC_HOME_BANNERS = \[([\s\S]*?)\n\];/)?.[1] || '';
  assert.ok(bannerConfig, 'the authored carousel banner configuration should exist');
  assert.doesNotMatch(bannerConfig, /assets\/banners\/3\.png/, 'banner 3 advertises first-order 15% off and free shipping, which the current coupon data does not confirm');
  assert.match(bannerConfig, /assets\/banners\/1\.png/);
  assert.match(bannerConfig, /assets\/banners\/2\.png/);
  assert.match(bannerConfig, /assets\/banners\/4\.png/);
});

test('checkout clears the cart and shows success only after confirmed Worker persistence', () => {
  assert.match(orderScript, /DMCOrderPersistence\.createFromWorker\(/, 'checkout should use the validated Worker persistence path');
  assert.doesNotMatch(orderScript, /collection\(['"]orders['"]\)\.add\(/, 'checkout must not fall back to a client-trusted order write');
  const persistIndex = orderScript.indexOf('DMCOrderPersistence.createFromWorker(');
  const clearCartIndex = orderScript.indexOf('DMC.saveCart([])');
  const successIndex = orderScript.indexOf('showSuccess(orderId, savedOrder.total');
  assert.ok(persistIndex >= 0 && clearCartIndex > persistIndex, 'cart should be cleared only after persistence is confirmed');
  assert.ok(successIndex > clearCartIndex, 'success should be shown only after the persisted order is confirmed');
});

test('order persistence accepts only a successful Worker response with a saved document ID', async () => {
  const saved = await createFromWorker({
    workerUrl: 'https://dmc.example.workers.dev/',
    payload: { total: 125 },
    fetcher: async (url, options) => {
      assert.equal(url, 'https://dmc.example.workers.dev/create-order');
      assert.equal(options.method, 'POST');
      return { ok: true, json: async () => ({ ok: true, docId: ' order-123 ', total: 118 }) };
    },
  });
  assert.deepEqual(saved, { docId: 'order-123', total: 118 });
});

test('order persistence rejects non-success and unconfirmed Worker responses', async () => {
  const response = body => async () => ({ ok: true, json: async () => body });
  await assert.rejects(
    createFromWorker({ workerUrl: 'https://dmc.example.workers.dev', fetcher: response({ ok: true }) }),
    error => error.code === 'ORDER_SAVE_NOT_CONFIRMED',
  );
  await assert.rejects(
    createFromWorker({ workerUrl: 'https://dmc.example.workers.dev', fetcher: async () => ({ ok: false, json: async () => ({ ok: true, docId: 'order-123' }) }) }),
    error => error.code === 'ORDER_SAVE_NOT_CONFIRMED',
  );
});

test('order persistence rejects service failures and never invents a trusted total', async () => {
  await assert.rejects(
    createFromWorker({ workerUrl: '', fetcher: async () => ({ ok: true, json: async () => ({ ok: true, docId: 'order-123' }) }) }),
    error => error.code === 'ORDER_SERVICE_UNAVAILABLE',
  );
  await assert.rejects(
    createFromWorker({ workerUrl: 'https://dmc.example.workers.dev', fetcher: async () => { throw new Error('offline'); } }),
    error => error.code === 'ORDER_SAVE_FAILED',
  );
  const saved = await createFromWorker({
    workerUrl: 'https://dmc.example.workers.dev',
    fetcher: async () => ({ ok: true, json: async () => ({ ok: true, docId: 'order-123', total: '118' }) }),
  });
  assert.deepEqual(saved, { docId: 'order-123', total: null });
});

test('cart totals are calculated by a pure helper that can return zero for an empty cart', () => {
  assert.match(orderScript, /DMCOrderCalculations\.computeTotals\(/, 'cart totals should use the tested order calculation helper');
  assert.deepEqual(computeTotals({
    itemCount: 0,
    subtotal: 0,
    fees: { shipTransfer: 30, shipCod: 80, surchargeCod: 5 },
    payment: 'cod',
    coupon: { type: 'freeship' },
  }), { subtotal: 0, shipping: 0, surcharge: 0, discount: 0, freeship: false, total: 0 });
});

test('cart total calculation keeps shipping, surcharge and capped discounts correct for items', () => {
  assert.deepEqual(computeTotals({
    itemCount: 2,
    subtotal: 100,
    fees: { shipTransfer: 30, shipCod: 80, surchargeCod: 5, freeShipMin: 0 },
    payment: 'cod',
    coupon: { type: 'percent', value: 15, maxDiscount: 10 },
  }), { subtotal: 100, shipping: 80, surcharge: 5, discount: 10, freeship: false, total: 175 });
});

test('catalog category filters are generated from available products and show real counts', () => {
  assert.match(catalogScript, /DMCCategoryAvailability\.summarize\(/, 'catalog filters should be based on the loaded product categories');
  assert.match(catalogScript, /filter-item-count/);
  const summaries = summarizeCategoryAvailability([
    { slug: 'polaroid', name: 'รูปโพลารอยด์', icon: 'image', match: ['รูปโพลารอยด์', 'polaroid'] },
    { slug: 'lanyard', name: 'บัตรแขวนคอ', icon: 'card', match: ['บัตรแขวนคอ', 'lanyard'] },
    { slug: 'business-card', name: 'นามบัตร', icon: 'card', match: ['นามบัตร', 'business-card'] },
    { slug: 'shop-sign', name: 'ป้ายร้านค้า', icon: 'grid', match: ['ป้ายร้านค้า', 'shop-sign'] },
    { slug: 'qrcode', name: 'QR Code', icon: 'grid', match: ['qr code', 'qrcode'] },
    { slug: 'doll-tag', name: 'ป้ายตุ๊กตา', icon: 'package', match: ['ป้ายตุ๊กตา', 'doll-tag'] },
    { slug: 'student-card', name: 'บัตรนักเรียน', icon: 'card', match: ['บัตรนักเรียน', 'student-card'] },
    { slug: 'cat-mqarvesg', name: 'ความทรงจำ', icon: 'grid', match: ['ความทรงจำ', 'cat-mqarvesg'], custom: true },
  ], products);
  assert.deepEqual(
    summaries.filter(category => category.count > 0).map(category => category.slug).sort(),
    ['cat-mqarvesg', 'doll-tag', 'lanyard', 'polaroid', 'qrcode', 'student-card'].sort(),
  );
  assert.equal(summaries.find(category => category.slug === 'polaroid').count, 3);
});

test('footer product links point to a category that exists in the local catalog', () => {
  assert.match(footerScript, /catalog\.html\?cat=student-card[^>]*>[\s\S]*?บัตรนักเรียน/);
  assert.doesNotMatch(footerScript, /catalog\.html\?cat=business-card[^>]*>[^<]*นามบัตร/);
});

test('about page explains the active shipping fees instead of promising stale prices', () => {
  assert.match(aboutHtml, /id="about-shipping-summary"/);
  assert.doesNotMatch(aboutHtml, /ทั่วไทย ฿50 \/ COD เพิ่ม ฿30 \/ สั่งเกิน ฿500 ส่งฟรี!/);
  assert.match(aboutScript, /DMCShippingDisplay\.format\(/);
});

test('about and product pages format the same CMS shipping fees and only show configured free-shipping thresholds', () => {
  const summary = formatShipping({ shipTransfer: 30, shipCod: 50, freeShipMin: 0 }, { transfer: 35, cod: 40 });
  assert.equal(summary, 'โอน/PromptPay ฿30 · เก็บเงินปลายทาง (COD รวมค่าธรรมเนียม) ฿50');
  assert.doesNotMatch(summary, /ส่งฟรี/);
  assert.match(formatShipping({ shipTransfer: 30, shipCod: 50, freeShipMin: 500 }, {}), /ส่งฟรีเมื่อยอดสินค้าตั้งแต่ ฿500/);
  assert.match(productScript, /DMCShippingDisplay\.format\(/);
  assert.match(productHtml, /id="product-line-contact"[^>]*hidden/);
  assert.doesNotMatch(productHtml, /YOUR_LINE_OA/);
  assert.match(productScript, /CMS\.lineChat/);
});

test('FAQ uses native keyboard-operable disclosure controls for static and CMS content', () => {
  assert.match(aboutHtml, /<details class="faq-item"/);
  assert.match(aboutHtml, /<summary class="faq-q"/);
  assert.match(aboutHtml, /\.faq-item\[open\] \.faq-q \.arrow/);
  assert.match(aboutScript, /document\.createElement\('details'\)/);
  assert.match(aboutScript, /document\.createElement\('summary'\)/);
  assert.doesNotMatch(aboutScript, /q\.addEventListener\('click'/);
});

test('admin login exposes a labeled form that submits with Enter and native validation', () => {
  assert.match(adminLoginHtml, /<form[^>]*id="login-form"/);
  assert.match(adminLoginHtml, /<label[^>]*for="login-password"/);
  assert.match(adminLoginHtml, /id="login-password"[^>]*required/);
  const loginButton = adminLoginHtml.match(/<button\b[^>]*id="login-btn"[^>]*>/)?.[0] || '';
  assert.match(loginButton, /type="submit"/);
  assert.match(adminCoreScript, /loginForm\?\.addEventListener\('submit'/);
  assert.doesNotMatch(adminCoreScript, /passInput\?\.addEventListener\('keydown'/);
});

test('admin navigation sections are native buttons with synchronized selected state', () => {
  assert.equal((adminHtml.match(/<button[^>]*class="sidebar-item[^\"]*"[^>]*data-section=/g) || []).length, 10);
  assert.match(adminHtml, /<nav[^>]*class="admin-sidebar-inner"[^>]*aria-label=/);
  assert.match(adminCoreScript, /aria-pressed/);
  assert.match(fs.readFileSync(path.join(root, 'js/admin-nav.js'), 'utf8'), /aria-pressed/);
});

test('admin logout uses one accessible confirmation and restores keyboard focus when canceled', () => {
  assert.match(adminCoreScript, /getElementById\('logout-btn-2'\)\?\.addEventListener\('click', doLogout\)/);
  assert.doesNotMatch(adminPageScript, /confirm\('ออกจากระบบ\?'/);
  assert.match(adminCoreScript, /aria-modal="true"/);
  assert.match(adminCoreScript, /event\.key === 'Escape'/);
  assert.match(adminCoreScript, /trigger\?\.focus\(\)/);
});
