/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Categories Module V15
   js/categories.js

   ⭐ "แหล่งเดียว" ของหมวดหมู่ทั้งระบบ ⭐
   หน้าแรก / สินค้า / ตัวอย่างงาน / หลังบ้าน ใช้ไฟล์นี้ร่วมกัน
   เพิ่มหมวด built-in → แก้ที่นี่ที่เดียว
   หมวดที่ร้านเพิ่มเอง → เก็บใน Firestore collection "categories"
═══════════════════════════════════════════════ */
(function(){
  'use strict';

  var BUILTIN = [
    { slug:'polaroid',      name:'รูปโพลารอยด์', emoji:'📸', match:['โพลารอยด์','รูปโพลารอยด์','polaroid'] },
    { slug:'lanyard',       name:'บัตรแขวนคอ',   emoji:'🪪', match:['บัตรแขวนคอ','lanyard'] },
    { slug:'business-card', name:'นามบัตร',       emoji:'💼', match:['นามบัตร','business-card'] },
    { slug:'shop-sign',     name:'ป้ายร้านค้า',   emoji:'🏪', match:['ป้ายร้านค้า','shop-sign'] },
    { slug:'qrcode',        name:'QR Code',       emoji:'📱', match:['qr code','qrcode'] },
    { slug:'doll-tag',      name:'ป้ายตุ๊กตา',    emoji:'🧸', match:['ป้ายตุ๊กตา','doll-tag'] },
    { slug:'student-card',  name:'บัตรนักเรียน',  emoji:'🎓', match:['บัตรนักเรียน','student-card'] },
  ];

  var _allCache = null;

  // โหลด built-in + custom จาก Firestore (cache ต่อหน้า)
  async function loadAll(db) {
    if (_allCache) return _allCache;
    var list = BUILTIN.slice();
    try {
      // PERF-03: อ่าน custom categories ผ่าน snapshot/cache ร่วมกับทั้งระบบ (fallback อ่าน Firestore ตรง)
      var custom = [];
      if (window.DMC && DMC.loadCategoriesRaw) {
        custom = await DMC.loadCategoriesRaw();
      } else {
        var snap = await db.collection('categories').get();
        snap.forEach(function(d){ var data = d.data(); data.id = d.id; custom.push(data); });
      }
      custom.forEach(function(x){
        var name = x.name || x.id;
        if (list.some(function(c){ return c.name === name; })) return;
        list.push({
          slug:   x.slug || x.id,
          name:   name,
          emoji:  x.emoji || '🏷️',
          match:  [String(name).toLowerCase(), String(x.slug || x.id).toLowerCase()],
          custom: true,
        });
      });
    } catch(e) { /* ออฟไลน์ → ใช้ built-in */ }
    _allCache = list;
    return list;
  }

  // product.category (ชื่อไทยหรือ slug) ตรงกับ slug นี้ไหม
  function matches(productCategory, slug) {
    var v = String(productCategory || '').trim().toLowerCase();
    if (v === String(slug).toLowerCase()) return true;
    var cat = BUILTIN.concat(_allCache || []).find(function(c){ return c.slug === slug; });
    return !!(cat && cat.match.indexOf(v) !== -1);
  }

  // ป้ายชื่อจากค่าใดก็ได้ (slug หรือชื่อ)
  function labelFor(value) {
    var v = String(value || '').trim().toLowerCase();
    var all = BUILTIN.concat(_allCache || []);
    var hit = all.find(function(c){
      return c.slug.toLowerCase() === v || c.match.indexOf(v) !== -1 || c.name.toLowerCase() === v;
    });
    return hit ? hit.name : (value || 'อื่นๆ');
  }

  window.DMCCat = { BUILTIN: BUILTIN, loadAll: loadAll, matches: matches, labelFor: labelFor };
})();
