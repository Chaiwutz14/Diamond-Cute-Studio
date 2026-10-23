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
    await page.waitForSelector('#dmc-home-hero', { state: 'attached' });
    await page.waitForFunction(() => document.querySelectorAll('#dmc-hero-slides .dmc-hero-slide').length > 0, null, { timeout: 18000 });
    if (width <= 760) {
      await page.waitForSelector('.dmc-mobile-hero-cta');
      await page.waitForSelector('.dmc-mobile-hero-illustration', { state: 'attached' });
      await page.waitForFunction(() => document.querySelectorAll('#dmc-mobile-hero-slides .dmc-mobile-hero-slide').length === 4, null, { timeout: 18000 });
      await page.waitForFunction(() => {
        const img = document.querySelector('#dmc-mobile-hero-slides .dmc-mobile-hero-slide.is-active img');
        return !!img && img.complete && img.naturalWidth > 0;
      }, null, { timeout: 18000 });
    } else {
      await page.waitForFunction(() => {
        const img = document.querySelector('#dmc-hero-slides .dmc-hero-slide.is-active .dmc-hero-art');
        return !!img && img.complete && img.naturalWidth > 0;
      }, null, { timeout: 18000 });
    }
    await page.waitForSelector('#promo-image-slot .promo-image');
    await page.waitForTimeout(250);
    const metrics = await page.evaluate(() => {
      const rect = el => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height }; };
      const nav = document.querySelector('#main-nav'), hero = document.querySelector('#dmc-home-hero');
      const mobileHero = document.querySelector('.dmc-mobile-hero');
      const mobileCarousel = document.querySelector('#dmc-mobile-hero-carousel');
      const trust = document.querySelector('.dmc-trust-strip');
      const logo = document.querySelector('.nav-logo'), links = document.querySelector('.nav-links'), search = document.querySelector('.nav-search-wrap'), searchToggle = document.querySelector('.nav-search-toggle');
      const actions = document.querySelector('.nav-actions'), hamburger = document.querySelector('#hamburger-btn'), bottom = document.querySelector('#dcs-bottom-nav');
      const fab = document.querySelector('#dcs-fab-line');
      const ids = [...document.querySelectorAll('[id]')].map(el => el.id).filter(Boolean);
      return {
        viewport: { width: innerWidth, height: innerHeight }, scrollWidth: document.documentElement.scrollWidth, bodyScrollWidth: document.body.scrollWidth,
        nav: rect(nav), hero: rect(hero), heroDisplay: hero ? getComputedStyle(hero).display : 'missing', heroRatio: hero ? hero.getBoundingClientRect().width / hero.getBoundingClientRect().height : 0,
        mobileCarousel: rect(mobileCarousel), mobileCarouselDisplay: mobileCarousel ? getComputedStyle(mobileCarousel).display : 'missing', mobileCarouselRatio: mobileCarousel ? mobileCarousel.getBoundingClientRect().width / mobileCarousel.getBoundingClientRect().height : 0,
        mobileCarouselSlides: document.querySelectorAll('#dmc-mobile-hero-slides .dmc-mobile-hero-slide').length,
        mobileCarouselActive: document.querySelectorAll('#dmc-mobile-hero-slides .dmc-mobile-hero-slide.is-active').length,
        mobileCarouselDots: document.querySelectorAll('#dmc-mobile-hero-dots .dmc-mobile-hero-dot').length,
        mobileCarouselCurrentDots: document.querySelectorAll('#dmc-mobile-hero-dots .dmc-mobile-hero-dot[aria-current="true"]').length,
        mobileCarouselImageFit: document.querySelector('#dmc-mobile-hero-slides .dmc-mobile-hero-slide.is-active img') ? getComputedStyle(document.querySelector('#dmc-mobile-hero-slides .dmc-mobile-hero-slide.is-active img')).objectFit : 'missing',
        mobileCarouselImageLoaded: !!(document.querySelector('#dmc-mobile-hero-slides .dmc-mobile-hero-slide.is-active img')?.complete && document.querySelector('#dmc-mobile-hero-slides .dmc-mobile-hero-slide.is-active img')?.naturalWidth > 0),
        mobileHero: rect(mobileHero), mobileHeroDisplay: mobileHero ? getComputedStyle(mobileHero).display : 'missing', mobileHeroRadius: mobileHero ? parseFloat(getComputedStyle(mobileHero).borderTopLeftRadius) : 0,
        mobileHeroTitle: mobileHero?.querySelector('h1')?.textContent?.trim() || '', mobileHeroCta: rect(mobileHero?.querySelector('.dmc-mobile-hero-cta')),
        mobileHeroCtaHref: mobileHero?.querySelector('.dmc-mobile-hero-cta')?.getAttribute('href') || '',
        mobileHeroIllustration: !!mobileHero?.querySelector('.dmc-mobile-hero-illustration'),
        heroBorderRadius: hero ? parseFloat(getComputedStyle(hero).borderTopLeftRadius) : 0,
        heroLinkCount: document.querySelectorAll('#dmc-hero-slides .dmc-hero-picture[href="catalog.html"]').length,
        heroAltCount: document.querySelectorAll('#dmc-hero-slides .dmc-hero-art[alt]:not([alt=""])').length + document.querySelectorAll('#dmc-mobile-hero-slides .dmc-hero-art[alt]:not([alt=""])').length,
        heroEmbeddedCtaCount: document.querySelectorAll('#dmc-hero-slides button,#dmc-mobile-hero-slides button').length,
        heroImageFit: document.querySelector('.dmc-hero-art') ? getComputedStyle(document.querySelector('.dmc-hero-art')).objectFit : 'missing',
        logo: rect(logo), links: rect(links), search: rect(search), searchForm: rect(document.querySelector('.nav-search')), searchInputFontSize: parseFloat(getComputedStyle(document.querySelector('#nav-search-input') || document.body).fontSize), searchSubmit: rect(document.querySelector('.nav-search-submit')), searchToggle: rect(searchToggle), actions: rect(actions), cartAction: rect(document.querySelector('.nav-cart-btn')), hamburger: rect(hamburger), bottom: rect(bottom), fab: rect(fab),
        linksDisplay: links ? getComputedStyle(links).display : 'missing',
        hamburgerDisplay: hamburger ? getComputedStyle(hamburger).display : 'missing',
        bottomDisplay: bottom ? getComputedStyle(bottom).display : 'missing', bottomHeight: rect(bottom)?.height || 0,
        bodyPaddingBottom: parseFloat(getComputedStyle(document.body).paddingBottom) || 0,
        fabNavGap: bottom && fab ? bottom.getBoundingClientRect().top - fab.getBoundingClientRect().bottom : null,
        activeSlides: document.querySelectorAll('#dmc-hero-slides .dmc-hero-slide.is-active').length,
        slideCount: document.querySelectorAll('#dmc-hero-slides .dmc-hero-slide').length,
        categoryCount: document.querySelectorAll('#categories-grid .cat-card').length,
        categoryChildBounds: [...document.querySelectorAll('#categories-grid .cat-card')].map(el => { const r=el.getBoundingClientRect(); return {left:r.left,right:r.right,width:r.width,height:r.height}; }),
        categoryIcon: rect(document.querySelector('#categories-grid .cat-icon')),
        categoryLabelFontSize: parseFloat(getComputedStyle(document.querySelector('#categories-grid .cat-name') || document.body).fontSize),
        featuredColumnCount: document.querySelector('#featured-products') ? getComputedStyle(document.querySelector('#featured-products')).gridTemplateColumns.split(' ').filter(Boolean).length : 0,
        featuredVisibleCount: [...document.querySelectorAll('#featured-products .product-card')].filter(el => getComputedStyle(el).display !== 'none').length,
        featuredAddButton: rect(document.querySelector('#featured-products .btn-add-cart')),
        featuredWishButton: rect(document.querySelector('#featured-products .product-wish')),
        featuredCount: document.querySelectorAll('#featured-products .product-card').length,
        trustStrip: !!trust, trustItemCount: document.querySelectorAll('.dmc-trust-item').length,
        trustSignature: rect(document.querySelector('.dmc-trust-signature')), trustRect: rect(trust),
        whyCount: document.querySelectorAll('.hp-why-section .feature-card').length, whyIconCount: document.querySelectorAll('.hp-why-section .feature-icon svg').length,
        categoryScrollbarWidth: getComputedStyle(document.querySelector('#categories-grid') || document.body).scrollbarWidth,
        trustSignatureOverlapsItem: (() => { const s=document.querySelector('.dmc-trust-signature')?.getBoundingClientRect(); return !!s && [...document.querySelectorAll('.dmc-trust-item')].some(el=>{const r=el.getBoundingClientRect();return s.left<r.right&&s.right>r.left&&s.top<r.bottom&&s.bottom>r.top;}); })(),
        featuredDescriptionDisplay: document.querySelector('#featured-products .product-desc') ? getComputedStyle(document.querySelector('#featured-products .product-desc')).display : 'missing',
        featuredImageFit: document.querySelector('#featured-products .product-img-wrap img') ? getComputedStyle(document.querySelector('#featured-products .product-img-wrap img')).objectFit : 'missing',
        featuredAddRadius: document.querySelector('#featured-products .btn-add-cart') ? parseFloat(getComputedStyle(document.querySelector('#featured-products .btn-add-cart')).borderTopLeftRadius) : 0,
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
      : width === 393
        ? [
            ['services-trust', '#categories-grid'],
            ['bestsellers', '#featured-products'],
            ['mobile-products', '#featured-products']
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
    if (width <= 760) {
      check(`${name}: mobile hero has a clear gap below the navbar`, metrics.mobileHero && metrics.nav && metrics.mobileHero.top >= metrics.nav.bottom + 8, `hero top=${metrics.mobileHero?.top}, navbar bottom=${metrics.nav?.bottom}`);
      check(`${name}: mobile hero is visible with one catalog CTA`, metrics.mobileHeroDisplay !== 'none' && metrics.mobileHero.width >= width - 32 && metrics.mobileHeroTitle.length > 0 && metrics.mobileHeroIllustration && metrics.mobileHeroCta?.height >= 44 && metrics.mobileHeroCtaHref === 'catalog.html', JSON.stringify({display:metrics.mobileHeroDisplay,width:metrics.mobileHero?.width,illustration:metrics.mobileHeroIllustration,cta:metrics.mobileHeroCta,href:metrics.mobileHeroCtaHref}));
      check(`${name}: desktop carousel is hidden on mobile`, metrics.heroDisplay === 'none', metrics.heroDisplay);
      check(`${name}: mobile carousel has four banners and synced controls`, metrics.mobileCarouselDisplay !== 'none' && metrics.mobileCarouselSlides === 4 && metrics.mobileCarouselActive === 1 && metrics.mobileCarouselDots === 4 && metrics.mobileCarouselCurrentDots === 1, JSON.stringify({display:metrics.mobileCarouselDisplay,slides:metrics.mobileCarouselSlides,active:metrics.mobileCarouselActive,dots:metrics.mobileCarouselDots,current:metrics.mobileCarouselCurrentDots}));
      check(`${name}: mobile banner preserves artwork ratio and loads`, metrics.mobileCarousel && Math.abs(metrics.mobileCarouselRatio - (1200/630)) < .03 && metrics.mobileCarouselImageFit === 'contain' && metrics.mobileCarouselImageLoaded, JSON.stringify({ratio:metrics.mobileCarouselRatio,fit:metrics.mobileCarouselImageFit,loaded:metrics.mobileCarouselImageLoaded}));
    } else {
      check(`${name}: desktop banner has a clear gap below the navbar`, metrics.hero && metrics.nav && metrics.hero.top >= metrics.nav.bottom + 8, `hero top=${metrics.hero?.top}, navbar bottom=${metrics.nav?.bottom}`);
      check(`${name}: mobile hero remains hidden outside mobile layout`, metrics.mobileHeroDisplay === 'none', metrics.mobileHeroDisplay);
      check(`${name}: mobile carousel remains hidden outside phone layout`, metrics.mobileCarouselDisplay === 'none', metrics.mobileCarouselDisplay);
    }
    check(`${name}: no horizontal overflow`, metrics.scrollWidth <= width + 2 && metrics.bodyScrollWidth <= width + 2, `document=${metrics.scrollWidth}, body=${metrics.bodyScrollWidth}, viewport=${width}`);
    check(`${name}: carousel has exactly one active slide`, metrics.activeSlides === 1, `active=${metrics.activeSlides}, total=${metrics.slideCount}`);
    check(`${name}: trust content and Why Us icons remain complete`, metrics.trustItemCount === 4 && metrics.trustRect && metrics.trustSignature && metrics.trustSignature.left >= metrics.trustRect.left && metrics.trustSignature.right <= metrics.trustRect.right && !metrics.trustSignatureOverlapsItem && metrics.whyCount === 4 && metrics.whyIconCount === 4, JSON.stringify({trustItems:metrics.trustItemCount,signature:metrics.trustSignature,trust:metrics.trustRect,why:metrics.whyCount,whyIcons:metrics.whyIconCount}));
    check(`${name}: no duplicate IDs`, metrics.duplicates.length === 0, metrics.duplicates.join(', ') || 'none');
    check(`${name}: homepage category/product/trust sections rendered`, metrics.categoryCount === 6 && metrics.featuredCount >= 1 && metrics.trustStrip, `categories=${metrics.categoryCount}, products=${metrics.featuredCount}, trust=${metrics.trustStrip}`);
    if (width >= 1024) check(`${name}: desktop product grid uses four columns`, metrics.featuredColumnCount === 4, `columns=${metrics.featuredColumnCount}`);
    else if (width > 760) check(`${name}: tablet product grid uses three columns`, metrics.featuredColumnCount === 3, `columns=${metrics.featuredColumnCount}`);
    check(`${name}: hero uses all four authored banners`, metrics.heroAssetCount === 4 && metrics.heroPhotoCount === 1 && metrics.heroLinkCount === 4, `banners=${metrics.heroAssetCount}, active=${metrics.heroPhotoCount}, catalog links=${metrics.heroLinkCount}`);
    check(`${name}: hero artwork has descriptive alt text and no CTA inside the slides`, metrics.heroAltCount === 8 && metrics.heroEmbeddedCtaCount === 0, `alt images=${metrics.heroAltCount}, embedded buttons=${metrics.heroEmbeddedCtaCount}`);
    if (width > 760) check(`${name}: desktop banner keeps the supplied full image ratio`, metrics.heroImageFit === 'contain' && Math.abs(metrics.heroRatio - (1730 / 909)) < .03, `fit=${metrics.heroImageFit}, ratio=${metrics.heroRatio.toFixed(3)}`);
    if (width <= 760) {
      check(`${name}: mobile hero has rounded corners and side gutters`, metrics.mobileHero && metrics.mobileHeroRadius >= 16 && metrics.mobileHero.left >= 8 && metrics.mobileHero.right <= width - 8, `radius=${metrics.mobileHeroRadius}px, left=${metrics.mobileHero?.left}, right=${metrics.mobileHero?.right}, viewport=${width}`);
    } else {
      check(`${name}: desktop and tablet banner stays within a centered content width`, metrics.hero.width <= 1280 && Math.abs((width - metrics.hero.width) / 2 - metrics.hero.left) < 2, `width=${metrics.hero.width}, left=${metrics.hero.left}, viewport=${width}`);
    }
    const expectedCategories = ['assets/categories/Poraroid.png','assets/categories/Photo.png','assets/categories/Busines card.png','assets/categories/Employee card.png','assets/categories/Premium gift.png','assets/categories/QR Code.png'];
    check(`${name}: six authored PNG category images load`, metrics.categoryCount === 6 && metrics.categoryImageCount === 6 && metrics.categoryLoadedCount === 6 && expectedCategories.every(src=>metrics.categoryAssets.includes(src)), `category art=${metrics.categoryImageCount}, loaded=${metrics.categoryLoadedCount}, paths=${metrics.categoryAssets.join('|')}`);
    if (width > 760) check(`${name}: five popular categories remain visible after promotion`, metrics.popularVisible && metrics.popularCount === 5, `visible=${metrics.popularVisible}, cards=${metrics.popularCount}`);
    else check(`${name}: duplicate popular category row is hidden on mobile`, !metrics.popularVisible, `visible=${metrics.popularVisible}`);
    check(`${name}: compact DMC wordmark loads`, metrics.logoImageLoaded, String(metrics.logoImageLoaded));
    check(`${name}: authored promotion artwork loads without CMS copy`, metrics.promoImageCount === 1 && !metrics.promoSectionHidden && !metrics.promoHasCopy && metrics.promoDesktopAsset.endsWith('CMS-2752x380.png') && metrics.promoMobileAsset.endsWith('CMS-800x364.png'), `desktop=${metrics.promoDesktopAsset}, mobile=${metrics.promoMobileAsset}, copy=${metrics.promoHasCopy}, hidden=${metrics.promoSectionHidden}`);
    if (width <= 760) {
      check(`${name}: mobile navigation uses five custom vector icons`, metrics.mobileVectorIconCount === 5, `icons=${metrics.mobileVectorIconCount}`);
      const headerNoOverlap = metrics.logo && metrics.search && metrics.actions && metrics.logo.right <= metrics.search.left + 2 && metrics.search.right <= metrics.actions.left + 2;
      check(`${name}: mobile header fits without overlap`, headerNoOverlap, JSON.stringify({logo:metrics.logo,search:metrics.search,actions:metrics.actions}));
      check(`${name}: floating bottom nav geometry`, metrics.bottom && metrics.bottomDisplay !== 'none' && metrics.bottom.left > 0 && metrics.bottom.right < width && metrics.bottom.bottom <= height + 1, JSON.stringify(metrics.bottom));
      check(`${name}: mobile hamburger remains available`, metrics.hamburgerDisplay !== 'none', metrics.hamburgerDisplay);
      check(`${name}: cart and menu actions meet 44px touch targets`, metrics.cartAction?.width >= 44 && metrics.cartAction?.height >= 44 && metrics.hamburger?.width >= 44 && metrics.hamburger?.height >= 44, JSON.stringify({cart:metrics.cartAction,hamburger:metrics.hamburger}));
      check(`${name}: floating LINE keeps a 16px gap above bottom navigation`, metrics.fab && metrics.fab.width >= 48 && metrics.fab.height >= 48 && Math.abs(metrics.fabNavGap - 16) <= 1, JSON.stringify({fab:metrics.fab,bottom:metrics.bottom,gap:metrics.fabNavGap}));
      check(`${name}: content reserves space for floating controls`, metrics.bodyPaddingBottom >= metrics.bottomHeight + 70, `padding=${metrics.bodyPaddingBottom}px, nav=${metrics.bottomHeight}px`);
      const categoryTargets = metrics.categoryChildBounds.length === 6 && metrics.categoryChildBounds.every(item => item.width >= 88 && item.width <= 104 && item.height >= 88);
      check(`${name}: category shortcuts scroll horizontally with readable targets and no visible scrollbar`, metrics.categoryDisplay === 'flex' && metrics.categoryScrollWidth > metrics.categoryClientWidth && categoryTargets && metrics.categoryIcon?.width >= 60 && metrics.categoryLabelFontSize >= 12 && metrics.categoryScrollbarWidth === 'none', `display=${metrics.categoryDisplay}, scroll=${metrics.categoryScrollWidth}, client=${metrics.categoryClientWidth}, icon=${metrics.categoryIcon?.width}, label=${metrics.categoryLabelFontSize}px`);
      check(`${name}: mobile best sellers show four larger cards in two columns`, metrics.featuredColumnCount === 2 && metrics.featuredVisibleCount === 4, `columns=${metrics.featuredColumnCount}, visible=${metrics.featuredVisibleCount}`);
      check(`${name}: add-to-cart button meets the 44px touch target`, metrics.featuredAddButton && metrics.featuredAddButton.width >= 44 && metrics.featuredAddButton.height >= 44, JSON.stringify(metrics.featuredAddButton));
      check(`${name}: featured cards hide long copy and use contain-fit artwork with a compact square action`, metrics.featuredDescriptionDisplay === 'none' && metrics.featuredImageFit === 'contain' && metrics.featuredAddRadius >= 8 && metrics.featuredAddRadius <= 16, JSON.stringify({description:metrics.featuredDescriptionDisplay,imageFit:metrics.featuredImageFit,buttonRadius:metrics.featuredAddRadius}));
      check(`${name}: favorite control meets the 40px touch target`, metrics.featuredWishButton && metrics.featuredWishButton.width >= 40 && metrics.featuredWishButton.height >= 40, JSON.stringify(metrics.featuredWishButton));
      check(`${name}: homepage search is visible in the compact header`, metrics.globalSearchCount === 1 && metrics.search.width > 0, `search count=${metrics.globalSearchCount}, width=${metrics.search?.width}`);
      check(`${name}: mobile search submit is a 44px touch target`, metrics.searchSubmit && metrics.searchSubmit.width >= 44 && metrics.searchSubmit.height >= 44, JSON.stringify(metrics.searchSubmit));
      check(`${name}: mobile search text avoids browser auto-zoom`, metrics.searchInputFontSize >= 16, `${metrics.searchInputFontSize}px`);
      if (width <= 520) check(`${name}: compact logo fits the narrow header`, metrics.logo && metrics.logo.width >= 76 && metrics.logo.width <= 86, `${metrics.logo?.width}px`);
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
  currentRoute = 'home-banner-destination';
  const bannerHrefs = await page.locator('#dmc-hero-slides .dmc-hero-slide a').evaluateAll(links => links.map(link => link.getAttribute('href')));
  check('each authored banner has a configured destination', bannerHrefs.length === 4 && bannerHrefs.every(href => href === 'catalog.html'), JSON.stringify(bannerHrefs));
  await page.locator('#dmc-hero-slides .dmc-hero-slide.is-active a').click();
  await page.waitForURL(/catalog\.html/);
  check('clicking the hero banner opens its configured destination', new URL(page.url()).pathname.endsWith('/catalog.html'), page.url());
  await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#main-nav');
  await page.waitForFunction(() => document.querySelectorAll('#featured-products .btn-add-cart').length > 0, null, { timeout: 18000 });

  currentRoute = 'home-cart-interaction';
  const addButton = page.locator('#featured-products .btn-add-cart').first();
  const homeProductId = await addButton.getAttribute('data-id');
  await addButton.scrollIntoViewIfNeeded();
  await addButton.click();
  const optionDialog = page.locator('.home-option-dialog');
  await optionDialog.waitFor();
  const optionConfirm = optionDialog.locator('.home-option-confirm');
  const initiallyBlocked = await optionConfirm.isDisabled();
  for (const group of await optionDialog.locator('.home-option-group').all()) {
    await group.locator('.home-option-choice').first().click();
  }
  const optionsEnableConfirm = await optionConfirm.isEnabled();
  const quantity = optionDialog.locator('#home-option-quantity');
  await quantity.fill('3');
  await quantity.dispatchEvent('change');
  const calculatedTotal = (await optionDialog.locator('.home-option-total').textContent())?.trim();
  const exactTotal = await page.evaluate(id => {
    const product = homeProductsById.get(String(id));
    return product ? DMC.formatPrice((Number(product.price) || 0) * 3) : '';
  }, homeProductId);
  const rapidAddCalls = await page.evaluate(() => {
    const button = document.querySelector('.home-option-confirm');
    const original = DMC.addToCart;
    let calls = 0;
    DMC.addToCart = item => { calls++; return original(item); };
    button.click();
    button.click();
    DMC.addToCart = original;
    return calls;
  });
  await page.waitForFunction(() => !document.querySelector('.home-option-backdrop'));
  const cartSummaryTotal = await page.evaluate(() => DMC.getCartTotal());
  const addedHomeItem = await page.evaluate(id => DMC.getCart().find(item => item.id === String(id) && item.qty === 3), homeProductId);
  check('featured product blocks incomplete options and calculates the selected quantity total', initiallyBlocked && optionsEnableConfirm && calculatedTotal === exactTotal, JSON.stringify({initiallyBlocked,optionsEnableConfirm,calculatedTotal,exactTotal}));
  check('selected product options and quantity are added only once', !!addedHomeItem && !!addedHomeItem.options && addedHomeItem.qty === 3 && rapidAddCalls === 1 && cartSummaryTotal === Number(addedHomeItem.price) * 3, JSON.stringify({item:addedHomeItem && {name:addedHomeItem.name,qty:addedHomeItem.qty,options:addedHomeItem.options,price:addedHomeItem.price},cartSummaryTotal,rapidAddCalls}));
  check('adding a product does not navigate away from Home', new URL(page.url()).pathname.endsWith('/index.html'), page.url());
  await addButton.click();
  await optionDialog.waitFor();
  for (const group of await optionDialog.locator('.home-option-group').all()) {
    await group.locator('.home-option-choice').last().click();
  }
  const alternateConfirm = optionDialog.locator('.home-option-confirm');
  const alternateEnabled = await alternateConfirm.isEnabled();
  await alternateConfirm.click();
  await page.waitForFunction(() => !document.querySelector('.home-option-backdrop'));
  const separateConfigurations = await page.evaluate(id => {
    const items = DMC.getCart().filter(item => item.id === String(id));
    return { count: items.length, options: items.map(item => item.options), quantities: items.map(item => item.qty) };
  }, homeProductId);
  check('different product configurations remain separate in the cart', alternateEnabled && separateConfigurations.count === 2 && separateConfigurations.options[0] !== separateConfigurations.options[1], JSON.stringify(separateConfigurations));
  await addButton.click();
  await optionDialog.waitFor();
  await page.keyboard.press('Escape');
  const afterCancelCount = await page.evaluate(id => DMC.getCart().filter(item => item.id === String(id)).length, homeProductId);
  check('canceling product options closes without another cart item and restores focus', await page.locator('.home-option-backdrop').count() === 0 && afterCancelCount === 2 && await addButton.evaluate(button => document.activeElement === button), 'Escape canceled the unconfirmed selection and restored focus');

  const noOptionResult = await page.evaluate(() => {
    const product = { id: 'uxui-no-options-fixture', name: 'QA only', price: 7, unit: 'ชิ้น', minQty: 2, images: [] };
    homeProductsById.set(product.id, product);
    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildProductCard(product);
    const card = wrapper.firstElementChild;
    document.getElementById('featured-products').appendChild(card);
    bindProductCardEvents(card);
    card.querySelector('.btn-add-cart').click();
    const item = DMC.getCart().find(entry => entry.id === product.id);
    const openedModal = !!document.querySelector('.home-option-dialog');
    if (item) DMC.removeFromCart(item.cartItemId);
    homeProductsById.delete(product.id);
    card.remove();
    return { added: !!item && item.qty === 2, qty: item?.qty, openedModal };
  });
  check('a product with no options keeps the direct add-to-cart flow', noOptionResult.added && !noOptionResult.openedModal, JSON.stringify(noOptionResult));
  await page.evaluate(() => renderProductState('empty'));
  const emptyStateVisible = await page.locator('#featured-products [role="status"]').isVisible();
  await page.evaluate(() => renderProductState('error'));
  const errorStateVisible = await page.locator('#featured-products [role="alert"]').isVisible() && await page.locator('#retry-home-products').isVisible();
  check('featured products have explicit empty and retryable error states', emptyStateVisible && errorStateVisible, `empty=${emptyStateVisible}, error=${errorStateVisible}`);
  await page.locator('#retry-home-products').click();
  await page.waitForFunction(() => document.querySelectorAll('#featured-products .product-card').length > 0, null, { timeout: 18000 });


  currentRoute = 'home-carousel-interaction';
  currentRoute = 'home-carousel-interaction';
  const totalSlides = await page.locator('#dmc-hero-slides .dmc-hero-slide').count();
  if (totalSlides > 1) {
    const before = await page.locator('#dmc-hero-slides .dmc-hero-slide').evaluateAll(els => els.findIndex(el => el.classList.contains('is-active')));
    await page.locator('#dmc-hero-next').click();
    await page.waitForTimeout(120);
    const after = await page.locator('#dmc-hero-slides .dmc-hero-slide').evaluateAll(els => els.findIndex(el => el.classList.contains('is-active')));
    const afterDot = await page.locator('#dmc-hero-dots .dmc-hero-dot').evaluateAll(els => els.findIndex(el => el.getAttribute('aria-current') === 'true'));
    check('desktop carousel next control and indicator stay in sync', before !== after && afterDot === after, `before=${before}, after=${after}, dot=${afterDot}`);
    await page.locator('#dmc-hero-dots .dmc-hero-dot').nth(2).click();
    const dotSlide = await page.locator('#dmc-hero-slides .dmc-hero-slide').evaluateAll(els => els.findIndex(el => el.classList.contains('is-active')));
    check('desktop carousel indicator selects its matching slide', dotSlide === 2, `slide=${dotSlide}`);
    await page.locator('#dmc-hero-prev').click();
    const previousSlide = await page.locator('#dmc-hero-slides .dmc-hero-slide').evaluateAll(els => els.findIndex(el => el.classList.contains('is-active')));
    check('desktop carousel previous control changes slide', previousSlide === 1, `slide=${previousSlide}`);
    await page.locator('#dmc-hero-pause').click();
    check('carousel pause control toggles pressed state', await page.locator('#dmc-hero-pause').getAttribute('aria-pressed') === 'true', 'aria-pressed should become true');
  } else check('carousel interaction has multiple slides', false, `only ${totalSlides} slide(s) rendered`);

  await loadHomeAt('tablet-1024', 1024, 900);
  await loadHomeAt('tablet-768', 768, 900);
  await loadHomeAt('mobile-430', 430, 932);
  await loadHomeAt('mobile-393', 393, 852);
  currentRoute = 'mobile-carousel-interaction';
  await page.locator('#dmc-mobile-hero-next').click();
  let mobileIndex = await page.locator('#dmc-mobile-hero-slides .dmc-mobile-hero-slide').evaluateAll(els => els.findIndex(el => el.classList.contains('is-active')));
  check('mobile carousel next control advances the slide', mobileIndex === 1, `slide=${mobileIndex}`);
  await page.locator('#dmc-mobile-hero-dots .dmc-mobile-hero-dot').nth(2).click();
  mobileIndex = await page.locator('#dmc-mobile-hero-slides .dmc-mobile-hero-slide').evaluateAll(els => els.findIndex(el => el.classList.contains('is-active')));
  const selectedMobileDot = await page.locator('#dmc-mobile-hero-dots .dmc-mobile-hero-dot').evaluateAll(els => els.findIndex(el => el.getAttribute('aria-current') === 'true'));
  check('mobile carousel indicator selects and syncs with its slide', mobileIndex === 2 && selectedMobileDot === 2, `slide=${mobileIndex}, dot=${selectedMobileDot}`);
  await page.locator('#dmc-mobile-hero-prev').click();
  const beforeSwipe = await page.locator('#dmc-mobile-hero-slides .dmc-mobile-hero-slide').evaluateAll(els => els.findIndex(el => el.classList.contains('is-active')));
  await page.locator('#dmc-mobile-hero-slides .dmc-mobile-hero-slide.is-active .dmc-hero-picture').evaluate(link => {
    link.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', clientX: 280, clientY: 200 }));
    link.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', clientX: 100, clientY: 200 }));
  });
  const afterSwipe = await page.locator('#dmc-mobile-hero-slides .dmc-mobile-hero-slide').evaluateAll(els => els.findIndex(el => el.classList.contains('is-active')));
  const swipeDot = await page.locator('#dmc-mobile-hero-dots .dmc-mobile-hero-dot').evaluateAll(els => els.findIndex(el => el.getAttribute('aria-current') === 'true'));
  check('swiping the mobile banner changes the slide and indicator', beforeSwipe !== afterSwipe && afterSwipe === 2 && swipeDot === afterSwipe, `before=${beforeSwipe}, after=${afterSwipe}, dot=${swipeDot}`);
  await page.locator('#dmc-mobile-hero-slides .dmc-mobile-hero-slide.is-active .dmc-hero-picture').evaluate(link => {
    link.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', clientX: 100, clientY: 200 }));
    link.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', clientX: 280, clientY: 200 }));
  });
  const afterReverseSwipe = await page.locator('#dmc-mobile-hero-slides .dmc-mobile-hero-slide').evaluateAll(els => els.findIndex(el => el.classList.contains('is-active')));
  check('swiping the mobile banner in reverse changes the slide', afterReverseSwipe === 1, `slide=${afterReverseSwipe}`);
  await loadHomeAt('mobile-360', 360, 800);
  currentRoute = 'mobile-menu-regression';
  await page.locator('#hamburger-btn').click();
  check('mobile menu opens', await page.locator('#mobile-drawer').evaluate(el => el.classList.contains('open')), 'drawer should have open class');
  check('mobile drawer retains navigation and LINE actions', await page.locator('#mobile-drawer .drawer-link').count() >= 6 && await page.locator('#drawer-line-btn').count() === 1, 'drawer links and LINE action are present');
  await page.locator('#nav-search-input').click();
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
    ['catalog', '/catalog.html', '.catalog-wrapper', 'สินค้า'],
    ['product', '/product.html', '#product-detail', 'รายละเอียดสินค้า'],
    ['cart', '/cart.html', '#order-wrapper', 'ตะกร้าสินค้า'],
    ['orders', '/orders.html', '.track-page', 'ติดตามออเดอร์'],
    ['gallery', '/gallery.html', '.gallery-wrapper', 'ตัวอย่างงาน'],
    ['contact', '/contact.html', '.contact-wrapper', 'ติดต่อเรา'],
    ['about', '/about.html', '.about-wrapper', 'วิธีสั่งซื้อ'],
  ];
  for (const [name, path, marker, expectedTitle] of routes) {
    currentRoute = 'route-' + name;
    await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#main-nav');
    check(`${name}: page marker exists`, await page.locator(marker).count() > 0, marker);
    check(`${name}: global navbar search is omitted outside Home`, await page.locator('.nav-search').count() === 0, 'page-specific controls remain');
    check(`${name}: mobile header shows the correct page title`, (await page.locator('.nav-page-label').textContent())?.trim() === expectedTitle && await page.locator('.nav-page-label').isVisible(), expectedTitle);
    if (name === 'orders') {
      const localOrdersText = await page.locator('#device-orders-list').innerText();
      check('orders: local history shows the empty state for this fresh browser', /ยังไม่มีออเดอร์|ไม่พบข้อมูลออเดอร์/.test(localOrdersText), localOrdersText.slice(0, 180));
      const phoneTab = page.locator('#tab-phone');
      await page.waitForFunction(() => document.querySelector('#tab-phone')?.disabled === false || document.querySelector('#tab-phone')?.disabled === true, null, { timeout: 12000 }).catch(() => {});
      if (await phoneTab.isDisabled()) {
        check('orders: phone lookup stays gated until Firebase is ready', true, 'phone OTP remains disabled; no request was made');
      } else {
        await phoneTab.click();
        const phone = page.locator('#otp-phone');
        await phone.fill('12');
        await page.locator('#otp-send-btn').click();
        check('orders: malformed phone is rejected before any OTP request', /เบอร์โทร/.test(await page.locator('#otp-phone-error').textContent()), 'invalid format was blocked locally');

        await page.evaluate(() => {
          window.__uxuiMockOtpError = { code: 'auth/invalid-verification-code', message: 'Invalid verification code' };
          const fakeAuth = function () {
            return {
              signInWithPhoneNumber: async () => ({ confirm: async () => { throw window.__uxuiMockOtpError; } }),
              signOut: async () => {}
            };
          };
          fakeAuth.RecaptchaVerifier = class { clear() {} };
          window.firebase.auth = fakeAuth;
        });
        await phone.fill('0812345678');
        await page.locator('#otp-send-btn').click();
        await page.locator('#otp-step-code').waitFor({ state: 'visible' });
        await page.locator('#otp-code').fill('123456');
        await page.locator('#otp-verify-btn').click();
        check('orders: incorrect OTP stays on the verification step', /ไม่ถูกต้อง/.test(await page.locator('#otp-code-error').textContent()) && await page.locator('#otp-step-code').isVisible(), await page.locator('#otp-code-error').textContent());

        await page.locator('#otp-back-btn').click();
        await page.evaluate(() => { window.__uxuiMockOtpError = { code: 'auth/code-expired', message: 'Code expired' }; });
        await phone.fill('0812345678');
        await page.locator('#otp-send-btn').click();
        await page.locator('#otp-step-code').waitFor({ state: 'visible' });
        await page.locator('#otp-code').fill('123456');
        await page.locator('#otp-verify-btn').click();
        check('orders: expired OTP reports an error without revealing order data', /Code expired/.test(await page.locator('#otp-code-error').textContent()) && await page.locator('#otp-step-results').isHidden(), await page.locator('#otp-code-error').textContent());
      }
    }
    if (name === 'contact') {
      const links = await page.locator('.contact-wrapper a[href]').evaluateAll(items => items.map(a => ({ href: a.href, target: a.target, rel: a.rel })));
      const line = links.find(a => /^https:\/\/(?:line\.me|lin\.ee)\//i.test(a.href));
      const facebook = links.find(a => /^https:\/\/www\.facebook\.com\//i.test(a.href));
      check('contact: LINE and Facebook destinations are secure external links', !!line && line.target === '_blank' && /noopener/.test(line.rel) && !!facebook && facebook.target === '_blank' && /noopener/.test(facebook.rel), JSON.stringify({ line, facebook }));
    }
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
