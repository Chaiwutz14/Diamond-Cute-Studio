/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Footer Component
   Shared footer injected on every page
═══════════════════════════════════════════════ */
(function(){
  'use strict';

  // ── Config: แก้ลิงก์จริงตรงนี้ ──
  var LINKS = {
    line:      'https://line.me/R/ti/p/YOUR_LINE_OA',
    facebook:  'https://facebook.com/YOUR_PAGE',
    instagram: 'https://instagram.com/YOUR_ACCOUNT',
    tiktok:    'https://tiktok.com/@YOUR_ACCOUNT',
    email:     'mailto:YOUR_EMAIL@gmail.com',
  };

  function render() {
    var mount = document.getElementById('footer-mount');
    if (!mount) return;

    mount.innerHTML = `
      <footer class="footer">
        <div class="footer-main">
          <div class="footer-brand">
            <a href="index.html" class="logo-text">💎 Diamond Cute Studio</a>
            <p>บริการพิมพ์ภาพและสิ่งพิมพ์คุณภาพ<br>รับออเดอร์ทุกวัน ส่งทั่วประเทศไทย</p>
            <div class="footer-socials">
              <a href="${LINKS.line}"      target="_blank" rel="noopener" class="social-btn" title="LINE OA"   aria-label="LINE">💬</a>
              <a href="${LINKS.facebook}"  target="_blank" rel="noopener" class="social-btn" title="Facebook"  aria-label="Facebook">📘</a>
              <a href="${LINKS.instagram}" target="_blank" rel="noopener" class="social-btn" title="Instagram" aria-label="Instagram">📸</a>
              <a href="${LINKS.tiktok}"    target="_blank" rel="noopener" class="social-btn" title="TikTok"    aria-label="TikTok">🎵</a>
            </div>
          </div>

          <div class="footer-col">
            <h4>สินค้า</h4>
            <a href="catalog.html?cat=polaroid">📸 รูปโพลารอยด์</a>
            <a href="catalog.html?cat=lanyard">🪪 บัตรแขวนคอ</a>
            <a href="catalog.html?cat=business-card">💼 นามบัตร</a>
            <a href="catalog.html?cat=shop-sign">🏪 ป้ายร้านค้า</a>
            <a href="catalog.html?cat=qrcode">📱 QR Code</a>
            <a href="catalog.html?cat=doll-tag">🧸 ป้ายตุ๊กตา</a>
          </div>

          <div class="footer-col">
            <h4>ข้อมูล</h4>
            <a href="about.html">📋 วิธีสั่งซื้อ</a>
            <a href="gallery.html">🖼️ ตัวอย่างงาน</a>
            <a href="contact.html">💬 ติดต่อเรา</a>
            <a href="about.html#faq">❓ คำถามที่พบบ่อย</a>
            <a href="about.html#policy">🔒 นโยบายความเป็นส่วนตัว</a>
          </div>

          <div class="footer-col">
            <h4>ติดต่อเรา</h4>
            <a href="${LINKS.line}"      target="_blank" rel="noopener">💬 LINE OA</a>
            <a href="${LINKS.facebook}"  target="_blank" rel="noopener">📘 Facebook</a>
            <a href="${LINKS.instagram}" target="_blank" rel="noopener">📸 Instagram</a>
            <a href="${LINKS.tiktok}"    target="_blank" rel="noopener">🎵 TikTok</a>
            <a href="${LINKS.email}">📧 อีเมล</a>
          </div>
        </div>

        <div class="footer-bottom">
          <span>© 2025 Diamond Cute Studio 💎 — All rights reserved.</span>
          <span>Powered by Firebase + Cloudflare</span>
        </div>
      </footer>
    `;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
