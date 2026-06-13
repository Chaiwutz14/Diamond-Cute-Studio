/* Diamond Cute Studio 💎 — แยกจาก contact.html (V15: Separation of Concerns) */
document.getElementById('cf-submit').addEventListener('click', async function(){
  var name    = document.getElementById('cf-name').value.trim();
  var contact = document.getElementById('cf-contact').value.trim();
  var topic   = document.getElementById('cf-topic').value;
  var msg     = document.getElementById('cf-msg').value.trim();
  var result  = document.getElementById('cf-result');

  if (!name || !msg) { DMC.toast('กรุณากรอกชื่อและข้อความ', 'error'); return; }

  var btn = document.getElementById('cf-submit');
  if (typeof Loading !== 'undefined') Loading.buttonLoad(btn);
  else { btn.disabled = true; btn.innerHTML = '<span class="spinner" style="width:18px;height:18px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:.4rem"></span> กำลังส่ง...'; }

  try {
    // Save to Firestore
    var db = await DMC.getFirebaseReady();
    await db.collection('contacts').add({
      name, contact, topic, message: msg,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Notify LINE
    await DMC.sendLineNotify({
      orderId: 'CONTACT',
      customerName: name,
      customerPhone: contact,
      itemsSummary: '['+topic+'] '+msg,
      total: 0,
      paymentMethod: 'contact_form'
    });

    result.style.display = 'block';
    result.style.color = 'var(--emerald)';
    result.innerHTML = '✅ ส่งข้อความสำเร็จแล้ว! เราจะติดต่อกลับเร็วๆ นี้';
    if (typeof Loading !== 'undefined') { Loading.buttonDone(btn); btn.innerHTML = '✅ ส่งแล้ว'; btn.disabled = true; }
    else btn.innerHTML = '✅ ส่งแล้ว';

  } catch(e) {
    DMC.toast('เกิดข้อผิดพลาด กรุณาติดต่อผ่าน LINE โดยตรง', 'error');
    if (typeof Loading !== 'undefined') Loading.buttonDone(btn);
    else { btn.disabled = false; btn.innerHTML = '💬 ส่งข้อความ'; }
  }
});

// ── ช่องทางติดต่อจากหลังบ้าน (CMS) ──
(function(){
  if (typeof CMS === 'undefined') return;
  CMS.get().then(function(c){
    var ct = c.contact || {};
    function setHref(id, url){ var el = document.getElementById(id); if (el && url) el.href = url; }
    setHref('ch-line', CMS.lineChat ? CMS.lineChat(ct) : ct.line);
    setHref('ch-fb',   ct.facebook);
    setHref('ch-ig',   ct.instagram);
    setHref('ch-tt',   ct.tiktok);
    if (ct.email) {
      var m = document.getElementById('ch-mail');
      if (m) m.href = ct.email.indexOf('mailto:') === 0 ? ct.email : 'mailto:' + ct.email;
      var ml = document.getElementById('ch-mail-label');
      if (ml) ml.textContent = ct.email.replace('mailto:','');
    }
    if (ct.lineLabel) {
      var ll = document.getElementById('ch-line-label');
      if (ll) ll.textContent = ct.lineLabel + ' · ตอบเร็วที่สุด';
    }
    var hrs = document.getElementById('contact-hours');
    if (hrs && ct.hours) hrs.textContent = ct.hours;
  }).catch(function(){});
})();
