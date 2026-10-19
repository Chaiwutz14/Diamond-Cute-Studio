import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:4173';
const ARTIFACTS = 'artifacts';
await fs.mkdir(ARTIFACTS, { recursive: true });
const report = { branch: process.env.GITHUB_REF_NAME || 'local', startedAt: new Date().toISOString(), checks: [], pageErrors: [], environmentWarnings: [], sameOriginHttpErrors: [], consoleErrors: [], measurements: [], screenshots: [] };
let currentRoute = 'startup';
function check(name, condition, details = '') {
  report.checks.push({ name, passed: Boolean(condition), details });
  console.log(`[${condition ? 'PASS' : 'FAIL'}] ${name}${details ? ' — ' + details : ''}`);
}
const server = spawn('python3', ['-m', 'http.server', '4173', '--bind', '127.0.0.1'], { stdio: 'ignore' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let browser;
try {
  let available = false;
  for (let i = 0; i < 40; i++) {
    try { const response = await fetch(BASE + '/index.html'); if (response.ok) { available = true; break; } } catch {}
    await sleep(250);
  }
  assert.ok(available, 'local static server did not start');

  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  // Block the existing Service Worker in this isolated localhost test context.
  // PWA caching is verified by source/cache-version checks; a cached worker must not race route navigation here.
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    serviceWorkers: 'block'
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => {
    const item = { route: currentRoute, message: error.message, stack: String(error.stack || '').slice(0, 1800) };
    if (/Uncaught \(in promise\) cancelled/.test(error.message) && /firebase-app-check-compat\.js/.test(item.stack)) report.environmentWarnings.push({ ...item, reason: 'Firebase App Check reCAPTCHA is not registered for the localhost test origin' });
    else report.pageErrors.push(item);
  });
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const item = { route: currentRoute, message: message.text().slice(0, 500) };
    if (/appCheck\/recaptcha-error|firebase-app-check-compat\.js|@firebase\/app-check/.test(item.message)) report.environmentWarnings.push({ ...item, reason: 'Firebase App Check reCAPTCHA cannot validate the localhost test origin' });
    else report.consoleErrors.push(item);
  });
  page.on('response', response => {
    try {
      const u = new URL(response.url());
      if (u.origin === BASE && u.pathname !== '/favicon.ico' && response.status() >= 400) report.sameOriginHttpErrors.push({ route: currentRoute, status: response.status(), url: u.pathname });
    } catch {}
  });

  async function loadHomeAt(name, width, height) {
    currentRoute = 'home-' + name;
    await page.setViewportSize({ width, height });
    await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#main-nav');
    await page.waitForSelector('#dmc-home-hero');
    await page.waitForFunction(() => document.querySelectorAll('#dmc-hero-slides .dmc-hero-slide').length > 0, null, { timeout: 18000 });
    await page.waitForFunction(() => {
      const img = document.querySelector('#dmc-hero-slides .dmc-hero-slide.is-active img');
      return !!img && img.complete && img.naturalWidth > 0;
    }, null, { timeout: 18000 });
    await page.waitForFunction(() => document.querySelectorAll('#dmc-hero-slides .dmc-hero-slide.is-active .dmc-hero-photo img').length >= 3, null, { timeout: 12000 });
    await page.waitForFunction(() => document.querySelectorAll('#promo-art-el .promo-art-frame img').length >= 3, null, { timeout: 12000 });
    await page.waitForTimeout(250);
    const metrics = await page.evaluate(() => {
      const rect = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height }; };
      const nav = document.querySelector('#main-nav'), hero = document.querySelector('#dmc-home-hero');
      const logo = document.querySelector('.nav-logo'), links = document.querySelector('.nav-links'), search = document.querySelector('.nav-search');
      const actions = document.querySelector('.nav-actions'), hamburger = document.querySelector('#hamburger-btn'), bottom = document.querySelector('#dcs-bottom-nav');
      const ids = [...document.querySelectorAll('[id]')].map(el => el.id).filter(Boolean);
      return {
        viewport: { width: innerWidth, height: innerHeight }, scrollWidth: document.documentElement.scrollWidth, bodyScrollWidth: document.body.scrollWidth,
        nav: rect(nav), hero: rect(hero), heroTitle: rect(document.querySelector('.dmc-hero-title')), heroCollage: rect(document.querySelector('.dmc-hero-collage')), logo: rect(logo), links: rect(links), search: rect(search), actions: rect(actions), hamburger: rect(hamburger), bottom: rect(bottom),
        linksDisplay: links ? getComputedStyle(links).display : 'missing',
        hamburgerDisplay: hamburger ? getComputedStyle(hamburger).display : 'missing',
        bottomDisplay: bottom ? getComputedStyle(bottom).display : 'missing',
        activeSlides: document.querySelectorAll('#dmc-hero-slides .dmc-hero-slide.is-active').length,
        slideCount: document.querySelectorAll('#dmc-hero-slides .dmc-hero-slide').length,
        categoryCount: document.querySelectorAll('#categories-grid .cat-card').length,
        featuredCount: document.querySelectorAll('#featured-products .product-card').length,
        trustStrip: !!document.querySelector('.dmc-trust-strip'),
        categoryDisplay: document.querySelector('#categories-grid') ? getComputedStyle(document.querySelector('#categories-grid')).display : 'missing',
        categoryScrollWidth: document.querySelector('#categories-grid')?.scrollWidth || 0,
        categoryClientWidth: document.querySelector('#categories-grid')?.clientWidth || 0,
        popularMobileVisible: document.querySelector('.hp-popular-mobile') ? getComputedStyle(document.querySelector('.hp-popular-mobile')).display !== 'none' : false,
        heroPhotoCount: document.querySelectorAll('#dmc-hero-slides .dmc-hero-slide.is-active .dmc-hero-photo img').length,
        categoryImageCount: document.querySelectorAll('#categories-grid .cat-icon-image img').length,
        promoImageCount: document.querySelectorAll('#promo-art-el .promo-art-frame img').length,
        duplicates: [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))]
      };
    });
    report.measurements.push({ name, ...metrics });
    const screenshot = `${ARTIFACTS}/home-${name}.png`;
    await page.screenshot({ path: screenshot, fullPage: false, animations: 'disabled', timeout: 15000 });
    report.screenshots.push(screenshot);

    // Capture scroll-position checkpoints instead of fullPage screenshots (which can hang with remote fonts).
    const slices = width === 1440
      ? [
          ['services-trust', '#categories-grid'],
          ['bestsellers', '#featured-products'],
          ['promo-gallery', '#promo-section-el'],
          ['gallery-reviews', '#home-gallery-section']
        ]
      : width === 390
        ? [
            ['services-trust', '#categories-grid'],
            ['bestsellers', '#featured-products'],
            ['mobile-popular-categories', '.hp-popular-mobile']
          ]
        : [];
    for (const [suffix, selector] of slices) {
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 105);
      }, selector);
      await page.waitForTimeout(180);
      const shot = `${ARTIFACTS}/home-${name}-${suffix}.png`;
      await page.screenshot({ path: shot, fullPage: false, animations: 'disabled', timeout: 15000 });
      report.screenshots.push(shot);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    check(`${name}: hero/nav layout`, metrics.hero && metrics.nav && metrics.hero.top >= metrics.nav.bottom - 1, `hero top=${metrics.hero?.top}, navbar bottom=${metrics.nav?.bottom}`);
    check(`${name}: no horizontal overflow`, metrics.scrollWidth <= width + 2 && metrics.bodyScrollWidth <= width + 2, `document=${metrics.scrollWidth}, body=${metrics.bodyScrollWidth}, viewport=${width}`);
    check(`${name}: carousel has exactly one active slide`, metrics.activeSlides === 1, `active=${metrics.activeSlides}, total=${metrics.slideCount}`);
    check(`${name}: no duplicate IDs`, metrics.duplicates.length === 0, metrics.duplicates.join(', ') || 'none');
    check(`${name}: homepage category/product/trust sections rendered`, metrics.categoryCount >= 5 && metrics.featuredCount >= 1 && metrics.trustStrip, `categories=${metrics.categoryCount}, products=${metrics.featuredCount}, trust=${metrics.trustStrip}`);
    check(`${name}: hero renders a product-photo collage`, metrics.heroPhotoCount >= 3, `active hero photos=${metrics.heroPhotoCount}`);
    check(`${name}: category shortcuts use product photos`, metrics.categoryImageCount >= 3, `category image thumbnails=${metrics.categoryImageCount}`);
    check(`${name}: promotion banner uses product photos`, metrics.promoImageCount >= 3, `promo art photos=${metrics.promoImageCount}`);
    if (width <= 760) {
      check(`${name}: floating bottom nav geometry`, metrics.bottom && metrics.bottomDisplay !== 'none' && metrics.bottom.left > 0 && metrics.bottom.right < width && metrics.bottom.bottom <= height + 1, JSON.stringify(metrics.bottom));
      check(`${name}: mobile hamburger remains available`, metrics.hamburgerDisplay !== 'none', metrics.hamburgerDisplay);
      check(`${name}: hero copy stays left of product collage`, metrics.heroTitle && metrics.heroCollage && metrics.heroTitle.right <= metrics.heroCollage.left + 2, JSON.stringify({title:metrics.heroTitle,collage:metrics.heroCollage}));
      check(`${name}: category shortcuts form a horizontal row`, metrics.categoryDisplay === 'flex' && metrics.categoryScrollWidth > metrics.categoryClientWidth, `display=${metrics.categoryDisplay}, scroll=${metrics.categoryScrollWidth}, client=${metrics.categoryClientWidth}`);
      check(`${name}: popular categories appear only on mobile`, metrics.popularMobileVisible, String(metrics.popularMobileVisible));
    } else if (width <= 1180) {
      check(`${name}: tablet uses compact nav`, metrics.linksDisplay === 'none' && metrics.hamburgerDisplay !== 'none', `links=${metrics.linksDisplay}, hamburger=${metrics.hamburgerDisplay}`);
      const headerNoOverlap = metrics.logo && metrics.search && metrics.actions && metrics.logo.right <= metrics.search.left + 2 && metrics.search.right <= metrics.actions.left + 2;
      check(`${name}: tablet header has no overlap`, headerNoOverlap, JSON.stringify({logo:metrics.logo,search:metrics.search,actions:metrics.actions}));
    } else {
      check(`${name}: desktop nav links visible`, metrics.linksDisplay !== 'none', metrics.linksDisplay);
      const noOverlap = metrics.logo && metrics.links && metrics.search && metrics.actions && metrics.logo.right <= metrics.links.left + 2 && metrics.links.right <= metrics.search.left + 2 && metrics.search.right <= metrics.actions.left + 2;
      check(`${name}: desktop header items do not overlap`, noOverlap, JSON.stringify({ logo: metrics.logo, links: metrics.links, search: metrics.search, actions: metrics.actions }));
    }
  }

  await loadHomeAt('desktop-1440', 1440, 1000);
  currentRoute = 'home-cart-interaction';
  const addButton = page.locator('#featured-products .btn-add-cart').first();
  await addButton.scrollIntoViewIfNeeded();
  await addButton.click();
  await page.waitForFunction(() => document.querySelector('#featured-products .btn-add-cart')?.textContent?.trim() === '✓', null, { timeout: 3000 });
  check('featured product add-to-cart interaction remains active', await page.locator('#featured-products .btn-add-cart').first().textContent() === '✓', 'button changes to success state without leaving Home');
  check('add-to-cart does not navigate away from Home', new URL(page.url()).pathname.endsWith('/index.html'), page.url());
  currentRoute = 'home-carousel-interaction';
  const totalSlides = await page.locator('#dmc-hero-slides .dmc-hero-slide').count();
  if (totalSlides > 1) {
    const before = await page.locator('#dmc-hero-slides .dmc-hero-slide').evaluateAll(els => els.findIndex(el => el.classList.contains('is-active')));
    await page.locator('#dmc-hero-next').click();
    await page.waitForTimeout(120);
    const after = await page.locator('#dmc-hero-slides .dmc-hero-slide').evaluateAll(els => els.findIndex(el => el.classList.contains('is-active')));
    check('carousel next control changes active slide', before !== after, `before=${before}, after=${after}`);
    await page.locator('#dmc-hero-pause').click();
    check('carousel pause control toggles pressed state', await page.locator('#dmc-hero-pause').getAttribute('aria-pressed') === 'true', 'aria-pressed should become true');
  } else check('carousel interaction has multiple slides', false, `only ${totalSlides} slide(s) rendered`);

  await loadHomeAt('tablet-1024', 1024, 900);
  await loadHomeAt('mobile-390', 390, 844);
  await loadHomeAt('small-mobile-320', 320, 740);
  currentRoute = 'mobile-menu-regression';
  await page.locator('#hamburger-btn').click();
  check('mobile menu opens', await page.locator('#mobile-drawer').evaluate(el => el.classList.contains('open')), 'drawer should have open class');
  await page.keyboard.press('Escape');
  check('mobile menu closes on Escape', !(await page.locator('#mobile-drawer').evaluate(el => el.classList.contains('open'))), 'drawer should be closed');

  currentRoute = 'header-search-regression';
  await page.locator('#nav-search-input').fill('polaroid');
  await page.locator('#nav-search-input').press('Enter');
  await page.waitForURL(/catalog\.html\?q=polaroid/);
  await page.waitForSelector('#search-input');
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await page.waitForFunction(() => document.querySelector('#search-input')?.value === 'polaroid', null, { timeout: 5000 }).catch(() => {});
  const searchValue = await page.locator('#search-input').inputValue();
  check('header search routes to Catalog and restores query', searchValue === 'polaroid', `catalog input="${searchValue}"`);

  const routes = [
    ['catalog', '/catalog.html', '.catalog-wrapper'],
    ['product', '/product.html', '#product-detail'],
    ['cart', '/cart.html', '#order-wrapper'],
    ['orders', '/orders.html', '.track-page'],
    ['gallery', '/gallery.html', '.gallery-wrapper'],
    ['contact', '/contact.html', '.contact-wrapper'],
    ['about', '/about.html', '.about-wrapper'],
  ];
  for (const [name, path, marker] of routes) {
    currentRoute = 'route-' + name;
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#main-nav');
    check(`${name}: page marker exists`, await page.locator(marker).count() > 0, marker);
  }

  check('no uncaught application JavaScript page errors', report.pageErrors.length === 0, JSON.stringify(report.pageErrors));
  check('no unexpected browser console errors', report.consoleErrors.length === 0, JSON.stringify(report.consoleErrors));
  check('no same-origin HTTP 4xx/5xx assets', report.sameOriginHttpErrors.length === 0, JSON.stringify(report.sameOriginHttpErrors));
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(`${ARTIFACTS}/uxui-qa-results.json`, JSON.stringify(report, null, 2));
  console.log('Unexpected console errors: ' + report.consoleErrors.length + '; known localhost App Check warnings: ' + report.environmentWarnings.length);
  console.log(`QA result: ${report.checks.filter(c => c.passed).length}/${report.checks.length} passed`);
  if (report.checks.some(c => !c.passed)) process.exitCode = 1;
} catch (error) {
  report.fatalError = error.stack || error.message;
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(`${ARTIFACTS}/uxui-qa-results.json`, JSON.stringify(report, null, 2));
  throw error;
} finally {
  if (browser) await browser.close().catch(() => {});
  server.kill('SIGTERM');
}
