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
    else if (/Framing 'https:\/\/www\.google\.com\/' violates .*report-only Content Security Policy directive/i.test(item.message)) report.environmentWarnings.push({ ...item, reason: 'Third-party Google frame emits a report-only CSP warning in the localhost QA environment; it is not an enforced block or application exception' });
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
      const img = document.querySelector('#dmc-hero-slides .dmc-hero-slide.is-active .dmc-hero-art');
      return !!img && img.complete && img.naturalWidth > 0;
    }, null, { timeout: 18000 });
    await page.waitForSelector('#promo-image-slot .promo-image');
    await page.waitForTimeout(250);
    const metrics = await page.evaluate(() => {
      const rect = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height }; };
      const nav = document.querySelector('#main-nav'), hero = document.querySelector('#dmc-home-hero');
      const logo = document.querySelector('.nav-logo'), links = document.querySelector('.nav-links'), search = document.querySelector('.nav-search-wrap'), searchToggle = document.querySelector('.nav-search-toggle');
      const actions = document.querySelector('.nav-actions'), hamburger = document.querySelector('#hamburger-btn'), bottom = document.querySelector('#dcs-bottom-nav');
      const fab = document.querySelector('#dcs-fab-line');
      const ids = [...document.querySelectorAll('[id]')].map(el => el.id).filter(Boolean);
      return {
        viewport: { width: innerWidth, height: innerHeight }, scrollWidth: document.documentElement.scrollWidth, bodyScrollWidth: document.body.scrollWidth,
        nav: rect(nav), hero: rect(hero), heroRatio: hero ? hero.getBoundingClientRect().width / hero.getBoundingClientRect().height : 0,
        heroBorderRadius: hero ? parseFloat(getComputedStyle(hero).borderTopLeftRadius) : 0,
        heroLinkCount: document.querySelectorAll('#dmc-hero-slides .dmc-hero-picture[href="catalog.html"]').length,
        heroImageFit: document.querySelector('.dmc-hero-art') ? getComputedStyle(document.querySelector('.dmc-hero-art')).objectFit : 'missing',
        logo: rect(logo), links: rect(links), search: rect(search), searchForm: rect(document.querySelector('.nav-search')), searchToggle: rect(searchToggle), actions: rect(actions), hamburger: rect(hamburger), bottom: rect(bottom), fab: rect(fab),
        linksDisplay: links ? getComputedStyle(links).display : 'missing',
        hamburgerDisplay: hamburger ? getComputedStyle(hamburger).display : 'missing',
        bottomDisplay: bottom ? getComputedStyle(bottom).display : 'missing',
        activeSlides: document.querySelectorAll('#dmc-hero-slides .dmc-hero-slide.is-active').length,
        slideCount: document.querySelectorAll('#dmc-hero-slides .dmc-hero-slide').length,
        categoryCount: document.querySelectorAll('#categories-grid .cat-card').length,
        categoryChildBounds: [...document.querySelectorAll('#categories-grid .cat-card')].map(el => { const r=el.getBoundingClientRect(); return {left:r.left,right:r.right,width:r.width}; }),
        featuredColumnCount: document.querySelector('#featured-products') ? getComputedStyle(document.querySelector('#featured-products')).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
        featuredVisibleCount: [...document.querySelectorAll('#featured-products .product-card')].filter(el => getComputedStyle(el).display !== 'none').length,
        featuredAddButton: rect(document.querySelector('#featured-products .btn-add-cart')),
        featuredCount: document.querySelectorAll('#featured-products .product-card').length,
        trustStrip: !!document.querySelector('.dmc-trust-strip'),
        categoryDisplay: document.querySelector('#categories-grid') ? getComputedStyle(document.querySelector('#categories-grid')).display : 'missing',
        categoryScrollWidth: document.querySelector('#categories-grid')?.scrollWidth || 0,
        categoryClientWidth: document.querySelector('#categories-grid')?.clientWidth || 0,
        popularVisible: document.querySelector('.hp-popular-section') ? getComputedStyle(document.querySelector('.hp-popular-section')).display !== 'none' : false,
        popularCount: document.querySelectorAll('.hp-popular-grid .hp-popular-card').length,
        heroPhotoCount: document.querySelectorAll('#dmc-hero-slides .dmc-hero-slide.is-active .dmc-hero-art').length,
        heroAssetCount: document.querySelectorAll('#dmc-hero-slides .dmc-hero-art').length,
        heroArtSrc: document.querySelector('#dmc-hero-slides .dmc-hero-slide.is-active .dmc-hero-art')?.currentSrc || '',
        categoryImageCount: document.querySelectorAll('#categories-grid .cat-card img[src*="assets/categories/"]').length,
        categoryAssets: [...document.querySelectorAll('#categories-grid .cat-card img')].map(img=>img.getAttribute('src')),
        categoryLoadedCount: [...document.querySelectorAll('#categories-grid .cat-card img')].filter(img=>img.complete&&img.naturalWidth>0).length,
        logoImageLoaded: !!(document.querySelector('.nav-logo-image')?.complete && document.querySelector('.nav-logo-image')?.naturalWidth>0),
        globalSearchCount: document.querySelectorAll('.nav-search').length,
        desktopVectorIconCount: document.querySelectorAll('.nav-link-icon svg').length,
        mobileVectorIconCount: document.querySelectorAll('#dcs-bottom-nav .ic svg').length,
        promoImageCount: document.querySelectorAll('#promo-image-slot .promo-image').length,
        promoDesktopAsset: document.querySelector('#promo-image-slot .promo-image')?.getAttribute('src') || '',
        promoMobileAsset: document.querySelector('#promo-image-slot source')?.getAttribute('srcset') || '',
        promoHasCopy: !!document.querySelector('#promo-tag-el,#promo-title-el,#promo-desc-el,#promo-btn-el'),
        promoSectionHidden: !!document.querySelector('#promo-section-el')?.hidden,
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
            ['mobile-popular-categories', '.hp-popular-section']
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
    check(`${name}: banner has a clear gap below the navbar`, metrics.hero && metrics.nav && metrics.hero.top >= metrics.nav.bottom + 8, `hero top=${metrics.hero?.top}, navbar bottom=${metrics.nav?.bottom}`);
    check(`${name}: no horizontal overflow`, metrics.scrollWidth <= width + 2 && metrics.bodyScrollWidth <= width + 2, `document=${metrics.scrollWidth}, body=${metrics.bodyScrollWidth}, viewport=${width}`);
    check(`${name}: carousel has exactly one active slide`, metrics.activeSlides === 1, `active=${metrics.activeSlides}, total=${metrics.slideCount}`);
    check(`${name}: no duplicate IDs`, metrics.duplicates.length === 0, metrics.duplicates.join(', ') || 'none');
    check(`${name}: homepage category/product/trust sections rendered`, metrics.categoryCount === 6 && metrics.featuredCount >= 1 && metrics.trustStrip, `categories=${metrics.categoryCount}, products=${metrics.featuredCount}, trust=${metrics.trustStrip}`);
    check(`${name}: hero uses all four authored banners`, metrics.heroAssetCount === 4 && metrics.heroPhotoCount === 1 && metrics.heroLinkCount === 4, `banners=${metrics.heroAssetCount}, active=${metrics.heroPhotoCount}, catalog links=${metrics.heroLinkCount}`);
    check(`${name}: banner keeps the supplied full image ratio`, metrics.heroImageFit === 'contain' && Math.abs(metrics.heroRatio - (1730 / 909)) < .03, `fit=${metrics.heroImageFit}, ratio=${metrics.heroRatio.toFixed(3)}`);
    if (width <= 760) {
      check(`${name}: banner has rounded corners and side gutters`, metrics.heroBorderRadius >= 14 && metrics.hero.left >= 8 && metrics.hero.right <= width - 8, `radius=${metrics.heroBorderRadius}px, left=${metrics.hero.left}, right=${metrics.hero.right}, viewport=${width}`);
    } else {
      check(`${name}: desktop and tablet banner stays within a centered content width`, metrics.hero.width <= 1280 && Math.abs((width - metrics.hero.width) / 2 - metrics.hero.left) < 2, `width=${metrics.hero.width}, left=${metrics.hero.left}, viewport=${width}`);
    }
    const expectedCategories = ['assets/categories/Poraroid.png','assets/categories/Photo.png','assets/categories/Busines card.png','assets/categories/Employee card.png','assets/categories/Premium gift.png','assets/categories/QR Code.png'];
    check(`${name}: six authored PNG category images load`, metrics.categoryCount === 6 && metrics.categoryImageCount === 6 && metrics.categoryLoadedCount === 6 && expectedCategories.every(src=>metrics.categoryAssets.includes(src)), `category art=${metrics.categoryImageCount}, loaded=${metrics.categoryLoadedCount}, paths=${metrics.categoryAssets.join('|')}`);
    check(`${name}: five popular categories remain visible after promotion`, metrics.popularVisible && metrics.popularCount === 5, `visible=${metrics.popularVisible}, cards=${metrics.popularCount}`);
    check(`${name}: compact DMC wordmark loads`, metrics.logoImageLoaded, String(metrics.logoImageLoaded));
    check(`${name}: authored promotion artwork loads without CMS copy`, metrics.promoImageCount === 1 && !metrics.promoSectionHidden && !metrics.promoHasCopy && metrics.promoDesktopAsset.endsWith('CMS-2752x380.png') && metrics.promoMobileAsset.endsWith('CMS-800x364.png'), `desktop=${metrics.promoDesktopAsset}, mobile=${metrics.promoMobileAsset}, copy=${metrics.promoHasCopy}, hidden=${metrics.promoSectionHidden}`);
    if (width <= 760) {
      check(`${name}: mobile navigation uses five custom vector icons`, metrics.mobileVectorIconCount === 5, `icons=${metrics.mobileVectorIconCount}`);
      check(`${name}: floating bottom nav geometry`, metrics.bottom && metrics.bottomDisplay !== 'none' && metrics.bottom.left > 0 && metrics.bottom.right < width && metrics.bottom.bottom <= height + 1, JSON.stringify(metrics.bottom));
      check(`${name}: mobile hamburger remains available`, metrics.hamburgerDisplay !== 'none', metrics.hamburgerDisplay);
      check(`${name}: floating LINE button is visible above bottom navigation`, metrics.fab && metrics.fab.width >= 44 && metrics.fab.height >= 44 && metrics.fab.bottom < metrics.bottom.top, JSON.stringify({fab:metrics.fab,bottom:metrics.bottom}));
      const allCategoriesFit = metrics.categoryChildBounds.length === 6 && metrics.categoryChildBounds.every(item => item.width > 0 && item.left >= metrics.hero.left - 4 && item.right <= width - 8);
      check(`${name}: all six category shortcuts fit across one row`, metrics.categoryDisplay === 'grid' && metrics.categoryScrollWidth <= metrics.categoryClientWidth + 2 && allCategoriesFit, `display=${metrics.categoryDisplay}, scroll=${metrics.categoryScrollWidth}, client=${metrics.categoryClientWidth}, items=${metrics.categoryChildBounds.length}`);
      check(`${name}: mobile best sellers show four larger cards in two columns`, metrics.featuredColumnCount === 2 && metrics.featuredVisibleCount === 4, `columns=${metrics.featuredColumnCount}, visible=${metrics.featuredVisibleCount}`);
      check(`${name}: add-to-cart button remains proportionate`, metrics.featuredAddButton && metrics.featuredAddButton.width <= 32 && metrics.featuredAddButton.height <= 32, JSON.stringify(metrics.featuredAddButton));
      check(`${name}: homepage search is visible in the compact header`, metrics.globalSearchCount === 1 && metrics.search.width > 0, `search count=${metrics.globalSearchCount}, width=${metrics.search?.width}`);
      const touchTargets = await page.locator('#dcs-bottom-nav .dcs-bn-item').evaluateAll(items=>items.every(item=>{const r=item.getBoundingClientRect();return r.width>=44&&r.height>=44}));
      check(`${name}: bottom navigation keeps 44px touch targets`, touchTargets, String(touchTargets));
    } else if (width <= 1180) {
      check(`${name}: tablet uses compact nav`, metrics.linksDisplay === 'none' && metrics.hamburgerDisplay !== 'none', `links=${metrics.linksDisplay}, hamburger=${metrics.hamburgerDisplay}`);
      const headerNoOverlap = metrics.logo && metrics.search && metrics.actions && metrics.logo.right <= metrics.search.left + 2 && metrics.search.right <= metrics.actions.left + 2;
      check(`${name}: tablet header has no overlap`, headerNoOverlap, JSON.stringify({logo:metrics.logo,search:metrics.search,actions:metrics.actions}));
      check(`${name}: homepage search is present on tablet`, metrics.globalSearchCount === 1 && metrics.search.width > 0, `search count=${metrics.globalSearchCount}, width=${metrics.search?.width}`);
    } else {
      check(`${name}: desktop nav links visible`, metrics.linksDisplay !== 'none', metrics.linksDisplay);
      check(`${name}: desktop navigation uses custom vector icons`, metrics.desktopVectorIconCount >= 6, `icons=${metrics.desktopVectorIconCount}`);
      const noOverlap = metrics.logo && metrics.links && metrics.searchToggle && metrics.actions && metrics.logo.right <= metrics.links.left + 2 && metrics.links.right <= metrics.searchToggle.left + 2 && metrics.searchToggle.right <= metrics.actions.left + 2;
      check(`${name}: desktop header items do not overlap`, noOverlap, JSON.stringify({ logo: metrics.logo, links: metrics.links, searchToggle: metrics.searchToggle, actions: metrics.actions }));
      check(`${name}: desktop homepage search opens from its icon`, metrics.globalSearchCount === 1 && metrics.searchForm.width === 0 && metrics.searchToggle.width >= 40, `form width=${metrics.searchForm?.width}, toggle=${metrics.searchToggle?.width}`);
    }
  }

  await loadHomeAt('desktop-1440', 1440, 1000);
  currentRoute = 'desktop-header-regression';
  check('desktop account icon links to order tracking', await page.locator('.nav-account-btn').getAttribute('href') === 'orders.html', 'orders.html');
  await page.locator('#nav-search-toggle').click();
  check('desktop homepage search opens from its icon', await page.locator('#nav-search-toggle').getAttribute('aria-expanded') === 'true' && await page.locator('.nav-search').isVisible(), 'search form should open and receive focus');
  await page.keyboard.press('Escape');
  check('desktop homepage search closes on Escape', await page.locator('#nav-search-toggle').getAttribute('aria-expanded') === 'false', 'search form should close');
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
  check('mobile drawer retains navigation and LINE actions', await page.locator('#mobile-drawer .drawer-link').count() >= 6 && await page.locator('#drawer-line-btn').count() === 1, 'drawer links and LINE action are present');
  await page.locator('#dmc-hero-pause').click({ force: true });
  check('mobile menu closes on outside click', !(await page.locator('#mobile-drawer').evaluate(el => el.classList.contains('open'))), 'outside click should close the drawer');
  await page.locator('#hamburger-btn').click();
  await page.keyboard.press('Escape');
  check('mobile menu closes on Escape', !(await page.locator('#mobile-drawer').evaluate(el => el.classList.contains('open'))), 'drawer should be closed');

  currentRoute = 'header-search-regression';
  check('global search exists on Home', await page.locator('.nav-search').count() === 1, 'one homepage search');
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
    check(`${name}: global navbar search is omitted outside Home`, await page.locator('.nav-search').count() === 0, 'page-specific controls remain');
    if (name === 'catalog' || name === 'cart') {
      const navActionsRight = await page.locator('#main-nav .nav-actions').evaluate(el => {
        const actions=el.getBoundingClientRect(), inner=el.closest('.nav-inner').getBoundingClientRect();
        return {right:actions.right, innerRight:inner.right, isSubpage:el.closest('#main-nav').classList.contains('navbar-subpage')};
      });
      check(`${name}: mobile cart and hamburger stay aligned to the right`, navActionsRight.isSubpage && navActionsRight.innerRight - navActionsRight.right < 2, JSON.stringify(navActionsRight));
    }
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
