/* Diamond Cute Studio 💎 — แยกจาก about.html (V15: Separation of Concerns) */
// FAQ accordion
  document.querySelectorAll('.faq-q').forEach(function(q){
    q.addEventListener('click', function(){
      var item = q.closest('.faq-item');
      item.classList.toggle('open');
    });
  });

// ── FAQ จากหลังบ้าน (CMS) — มีข้อมูลจึงแทนที่ค่า default ──
(function(){
  if (typeof CMS === 'undefined') return;
  CMS.get().then(function(c){
    var faq = c.faq || [];
    if (!faq.length) return;
    var wrap = document.getElementById('faq-list');
    if (!wrap) return;
    wrap.innerHTML = '';
    faq.forEach(function(f){
      var item = document.createElement('div');
      item.className = 'faq-item';
      var q = document.createElement('div');
      q.className = 'faq-q';
      q.textContent = f.q + ' ';
      var arrow = document.createElement('span');
      arrow.className = 'arrow';
      arrow.textContent = '▼';
      q.appendChild(arrow);
      var ans = document.createElement('div');
      ans.className = 'faq-a';
      ans.textContent = f.a;
      q.addEventListener('click', function(){ item.classList.toggle('open'); });
      item.appendChild(q);
      item.appendChild(ans);
      wrap.appendChild(item);
    });
  }).catch(function(){});
})();
