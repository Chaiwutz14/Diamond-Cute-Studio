/* DMC fixed appearance and frame-busting protection (runs before CSS). */
(function(){
  // V3 Security: กัน clickjacking — ถ้าหน้านี้ถูกฝังใน iframe ของโดเมนอื่น ให้เด้งออก
  try {
    if (window.top !== window.self) {
      document.documentElement.style.display = 'none';
      window.top.location = window.self.location;
    }
  } catch (e) {
    // cross-origin: เข้าถึง top ไม่ได้ = ถูกฝังจากที่อื่น → ซ่อนเนื้อหา
    document.documentElement.style.display = 'none';
  }

  // Keep browser chrome aligned with the fixed storefront palette.
  try {
    var m = document.querySelector('meta[name="theme-color"]');
    if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
    m.setAttribute('content', '#F4F9FE');
  } catch (e) {}
})();
