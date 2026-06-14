/* Diamond Cute Studio — Theme Init (runs before CSS) */
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

  var t = localStorage.getItem('dmc_theme') || 'sky';
  document.documentElement.setAttribute('data-theme', t);

  // V.upgrade1: ให้สีแถบบนเบราว์เซอร์ (theme-color) ตรงกับธีมที่เลือก
  var THEME_COLORS = {
    sky:      '#0EA5E9',
    sakura:   '#f472b6',
    mint:     '#10b981',
    peach:    '#fb923c',
    lavender: '#8b5cf6',
    midnight: '#0f172a'
  };
  try {
    var col = THEME_COLORS[t] || '#0EA5E9';
    var m = document.querySelector('meta[name="theme-color"]');
    if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
    m.setAttribute('content', col);
  } catch (e) {}
})();
