/* Diamond Cute Studio 💎 — แยกจาก about.html (V15: Separation of Concerns) */
function renderAboutShipping(fees) {
  var target = document.getElementById('about-shipping-summary');
  if (!target) return;
  var config = (window.DMC_CONFIG || {}).SHIPPING || {};
  target.textContent = DMCShippingDisplay.format(fees, config);
}

// ── FAQ จากหลังบ้าน (CMS) — มีข้อมูลจึงแทนที่ค่า default ──
(function(){
  if (typeof CMS === 'undefined') {
    renderAboutShipping({});
    return;
  }
  CMS.get().then(function(c){
    renderAboutShipping(c.fees || {});
    var faq = c.faq || [];
    if (!faq.length) return;
    var wrap = document.getElementById('faq-list');
    if (!wrap) return;
    wrap.innerHTML = '';
    faq.forEach(function(f){
      var item = document.createElement('details');
      item.className = 'faq-item';
      var q = document.createElement('summary');
      q.className = 'faq-q';
      q.textContent = f.q + ' ';
      var arrow = document.createElement('span');
      arrow.className = 'arrow';
      arrow.textContent = '▼';
      q.appendChild(arrow);
      var ans = document.createElement('div');
      ans.className = 'faq-a';
      ans.textContent = f.a;
      item.appendChild(q);
      item.appendChild(ans);
      wrap.appendChild(item);
    });
  }).catch(function(){});
})();
