/* ═══════════════════════════════════════════════
   Diamond Cute Studio 💎 — Search Engine Core V36
   js/search-engine.js

   เอนจินค้นหาฝั่ง client ครบวงจร (ไม่พึ่ง library ภายนอก) — window.DCSearch

   ความสามารถ:
   ① Matching   — Exact / Prefix / Partial / Keyword / Multi-field (ชื่อ · Tag · หมวด · คำอธิบาย)
   ② Tolerance  — พิมพ์ผิด (Fuzzy: Levenshtein) · ลืมสลับภาษาแป้นพิมพ์ ไทย⇄อังกฤษ (Kedmanee)
                  · ไม่สนตัวใหญ่เล็ก · ไม่สนเว้นวรรค ("บัตร นักเรียน" = "บัตรนักเรียน")
                  · ไม่สนอักขระพิเศษ
   ③ Thai       — ตัดคำแบบ vocab-driven (คำติดกันแยกได้จากคลังคำสินค้าจริง) · คำย่อ/คำพ้อง
   ④ Synonym    — พจนานุกรมคำพ้อง (สองทาง) + Alias (ทางเดียว) ค่าเริ่มต้น + แอดมินเพิ่มเองได้
   ⑤ Ranking    — Exact > ชื่อ > Tag > หมวด > คำอธิบาย + ดันสินค้าขายดี (orderCount/isHot)
                  + Priority ที่แอดมินตั้ง (searchBoost) − ซ่อนสินค้า (hideFromSearch)
   ⑥ Suggest    — Autocomplete · Did you mean...? · คำใกล้เคียงเมื่อไม่พบ
   ⑦ Highlight  — สร้าง HTML ไฮไลต์คำที่ค้น (escape ปลอดภัย)
   ⑧ Performance— ดัชนีสร้างครั้งเดียว · memo cache ผลค้นหา

   API:
     DCSearch.buildIndex(products, { synonyms, aliases })  → สร้างดัชนี
     DCSearch.query(q)                → [{ product, score }] เรียงตามความเกี่ยวข้อง
     DCSearch.suggest(q, limit)       → รายการ autocomplete [{text, type}]
     DCSearch.didYouMean(q)           → คำที่น่าจะตั้งใจพิมพ์ | null
     DCSearch.nearbyTerms(q, limit)   → คำใกล้เคียง (ใช้ตอนไม่พบผลลัพธ์)
     DCSearch.highlight(text, q)      → HTML (escape แล้ว) พร้อม <mark>
     DCSearch.normalize(s)            → รูปแบบมาตรฐานของคำ (ใช้ทำ analytics key)
═══════════════════════════════════════════════ */
'use strict';

window.DCSearch = (function () {

  // ══════════════ 1) NORMALIZATION ══════════════
  var ZERO_WIDTH = /[\u200b-\u200d\ufeff]/g;
  var THAI_MARKS = /[ัิีึืฺุู็่้๊๋์ํ๎]/g;    // สระบน-ล่าง/วรรณยุกต์/การันต์ → ลบทิ้ง (ห้ามแทนด้วยช่องว่าง เดี๋ยวคำแตก)
  var SPECIALS   = /[^\p{L}\p{N}\s]/gu;      // อักขระพิเศษอื่น → ช่องว่าง

  function norm(s) {
    return String(s == null ? '' : s)
      .normalize('NFC')
      .toLowerCase()
      .replace(ZERO_WIDTH, '')
      .replace(THAI_MARKS, '')
      .replace(SPECIALS, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function loose(s) { return norm(s).replace(/ /g, ''); }   // ตัดช่องว่างทิ้งทั้งหมด

  // ══════════════ 2) แป้นพิมพ์ไทย⇄อังกฤษ (Kedmanee ↔ QWERTY) ══════════════
  //  ครอบคลุมกรณีลืมสลับภาษา เช่น พิมพ์ "renkommf" ทั้งที่ตั้งใจพิมพ์ "โพลารอยด์"
  var EN2TH = {
    '`':'_','1':'ๅ','2':'/','3':'-','4':'ภ','5':'ถ','6':'ุ','7':'ึ','8':'ค','9':'ต','0':'จ','-':'ข','=':'ช',
    'q':'ๆ','w':'ไ','e':'ำ','r':'พ','t':'ะ','y':'ั','u':'ี','i':'ร','o':'น','p':'ย','[':'บ',']':'ล','\\':'ฃ',
    'a':'ฟ','s':'ห','d':'ก','f':'ด','g':'เ','h':'้','j':'่','k':'า','l':'ส',';':'ว','\'':'ง',
    'z':'ผ','x':'ป','c':'แ','v':'อ','b':'ิ','n':'ื','m':'ท',',':'ม','.':'ใ','/':'ฝ',
    '~':'%','!':'+','@':'๑','#':'๒','$':'๓','%':'๔','^':'ู','&':'฿','*':'๕','(':'๖',')':'๗','_':'๘','+':'๙',
    'Q':'๐','W':'"','E':'ฎ','R':'ฑ','T':'ธ','Y':'ํ','U':'๊','I':'ณ','O':'ฯ','P':'ญ','{':'ฐ','}':',','|':'ฅ',
    'A':'ฤ','S':'ฆ','D':'ฏ','F':'โ','G':'ฌ','H':'็','J':'๋','K':'ษ','L':'ศ',':':'ซ','"':'.',
    'Z':'(','X':')','C':'ฉ','V':'ฮ','B':'ฺ','N':'์','M':'?','<':'ฒ','>':'ฬ','?':'ฦ',
  };
  var TH2EN = (function () {
    var m = {};
    Object.keys(EN2TH).forEach(function (k) { if (!(EN2TH[k] in m)) m[EN2TH[k]] = k; });
    return m;
  })();
  function convertLayout(s, map) {
    var out = '';
    for (var i = 0; i < s.length; i++) out += (map[s[i]] != null ? map[s[i]] : s[i]);
    return out;
  }
  var TH_RE = /[\u0e00-\u0e7f]/;
  // สร้างชุดคำค้นทางเลือกจากการสลับ layout (เฉพาะเมื่อผลลัพธ์เปลี่ยนชนิดภาษา = น่าจะพิมพ์ผิดแป้นจริง)
  function layoutVariants(q) {
    var out = [];
    var hasTH = TH_RE.test(q);
    if (!hasTH) {                                  // ASCII ล้วน → ลองตีความว่าตั้งใจพิมพ์ไทย
      var th = convertLayout(q, EN2TH);
      if (TH_RE.test(th)) out.push(th);
    } else {                                       // มีไทย → ลองตีความว่าตั้งใจพิมพ์อังกฤษ
      var en = convertLayout(q, TH2EN);
      if (!TH_RE.test(en)) out.push(en);
    }
    return out;
  }

  // ══════════════ 3) LEVENSHTEIN (early-exit) ══════════════
  function lev(a, b, max) {
    if (a === b) return 0;
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > max) return max + 1;
    if (!la) return lb; if (!lb) return la;
    var prev = new Array(lb + 1), cur = new Array(lb + 1), i, j;
    for (j = 0; j <= lb; j++) prev[j] = j;
    for (i = 1; i <= la; i++) {
      cur[0] = i;
      var rowMin = i;
      for (j = 1; j <= lb; j++) {
        var cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (cur[j] < rowMin) rowMin = cur[j];
      }
      if (rowMin > max) return max + 1;            // แถวนี้เกินเพดานแล้ว — ตัดจบ
      var t = prev; prev = cur; cur = t;
    }
    return prev[lb];
  }
  function fuzzMax(len) { return len <= 3 ? 0 : (len <= 5 ? 1 : (len <= 8 ? 2 : 3)); }

  // Fuzzy หา "คำค้น" ที่ซ่อนอยู่ในสตริงยาว — เลื่อนหน้าต่างขนาด len และ len+1 หาค่าต่ำสุด
  // ครอบเคสพิมพ์ผิดของคำที่เป็นส่วนหนึ่งของชื่อยาว เช่น "โพลารอยก" ใน "รูปโพลารอยด์"
  function fuzzyIn(needle, hay, max) {
    var nl = needle.length;
    if (!nl || !hay.length) return max + 1;
    if (hay.length <= nl + 1) return lev(needle, hay, max);
    var best = max + 1, d, i, size;
    for (size = nl; size <= nl + 1; size++) {
      for (i = 0; i + size <= hay.length; i++) {
        d = lev(needle, hay.substr(i, size), max);
        if (d < best) { best = d; if (best === 0) return 0; }
      }
    }
    return best;
  }

  // ══════════════ 4) SYNONYM / ALIAS DICTIONARY ══════════════
  //  synonyms: กลุ่มคำเท่ากันสองทาง  |  aliases: "คำย่อ/ชื่อเรียก → คำเต็ม" ทางเดียว
  var DEFAULT_SYNONYMS = [
    ['รูป', 'ภาพ', 'photo', 'picture', 'พิมพ์รูป', 'ปริ้นรูป', 'ปรินรูป', 'print'],
    ['โพลารอยด์', 'polaroid', 'โพลาลอยด์', 'โฟล่าลอยด์', 'โพราลอยด์', 'โพลา'],
    ['นามบัตร', 'business card', 'businesscard', 'namecard', 'name card'],
    ['บัตรพนักงาน', 'employee card', 'บัตรทำงาน', 'ป้ายพนักงาน'],
    ['บัตรนักเรียน', 'student card', 'บัตรนักศึกษา'],
    ['บัตรแขวนคอ', 'lanyard', 'สายคล้องคอ', 'ป้ายคล้องคอ', 'บัตรห้อยคอ'],
    ['ป้าย', 'sign', 'ป้ายร้าน'],
    ['พวงกุญแจ', 'keychain', 'keyring', 'ที่ห้อยกุญแจ'],
    ['สติกเกอร์', 'sticker', 'สติ๊กเกอร์', 'สะติกเกอร์'],
    ['ตุ๊กตา', 'doll', 'ตุกตา'],
    ['อัลบั้ม', 'album', 'อัลบัม', 'อันบั้ม'],
    ['คิวอาร์', 'qr', 'qr code', 'คิวอาร์โค้ด', 'สแกน'],
    ['อะคริลิก', 'acrylic', 'อคริลิค', 'อะคริลิค'],
    ['เคลือบมัน', 'glossy', 'มันเงา'],
    ['เคลือบด้าน', 'matte', 'แมท'],
  ];
  var DEFAULT_ALIASES = { 'โพลา': 'โพลารอยด์', 'นบ': 'นามบัตร', 'wifi': 'ไวไฟ', 'ไวไฟ': 'wifi' };

  var synGroups = [];      // [[normWord,...], ...]
  var synMap    = {};      // normWord → Set(เพื่อนร่วมกลุ่มทั้งหมด)
  var aliasMap  = {};      // normAlias → normCanonical

  function buildDictionaries(customSynonyms, customAliases) {
    synGroups = DEFAULT_SYNONYMS.map(function (g) { return g.map(norm).filter(Boolean); });
    (customSynonyms || []).forEach(function (g) {
      var gg = (Array.isArray(g) ? g : []).map(norm).filter(Boolean);
      if (gg.length >= 2) synGroups.push(gg);
    });
    synMap = {};
    synGroups.forEach(function (g) {
      g.forEach(function (w) {
        if (!synMap[w]) synMap[w] = {};
        g.forEach(function (x) { if (x !== w) synMap[w][x] = 1; });
      });
    });
    aliasMap = {};
    Object.keys(DEFAULT_ALIASES).forEach(function (k) { aliasMap[norm(k)] = norm(DEFAULT_ALIASES[k]); });
    Object.keys(customAliases || {}).forEach(function (k) {
      var v = norm((customAliases || {})[k]); var kk = norm(k);
      if (kk && v) aliasMap[kk] = v;
    });
  }

  function expandTerm(t) {                          // คำ → [คำ + คำพ้อง + คำเต็มของ alias]
    var out = {}; out[t] = 1;
    if (aliasMap[t]) out[aliasMap[t]] = 1;
    if (synMap[t]) Object.keys(synMap[t]).forEach(function (w) { out[w] = 1; });
    // คำพ้องของคำเต็มด้วย (alias → canonical → synonyms ของ canonical)
    if (aliasMap[t] && synMap[aliasMap[t]]) Object.keys(synMap[aliasMap[t]]).forEach(function (w) { out[w] = 1; });
    return Object.keys(out);
  }

  // ══════════════ 5) INDEX ══════════════
  var INDEX = [];          // ต่อสินค้า: {p, name, nameL, tokens[], keys[], keysL[], cat, catL, desc, descL, boost, hidden, pop}
  var VOCAB = [];          // คำศัพท์ทั้งหมด (ตัดคำ/ตรวจ DYM) [{w, src}]
  var VOCAB_SET = {};
  var cache = new Map();   // memo ผลค้นหา

  function addVocab(w, src, display) {
    var raw = String(w == null ? '' : w).trim();
    w = norm(w);
    if (!w || w.length < 2 || VOCAB_SET[w]) return;
    VOCAB_SET[w] = 1;
    // display = รูปดั้งเดิม (วรรณยุกต์/การันต์ครบ) ไว้โชว์ผู้ใช้ — w = รูป normalize ไว้เทียบ
    VOCAB.push({ w: w, src: src || '', d: display || raw });
  }

  function buildIndex(products, opts) {
    opts = opts || {};
    buildDictionaries(opts.synonyms, opts.aliases);
    INDEX = []; VOCAB = []; VOCAB_SET = {}; cache = new Map();

    (products || []).forEach(function (p) {
      var name  = norm(p.name);
      var keys  = []
        .concat(Array.isArray(p.keywords) ? p.keywords : [])
        .concat(Array.isArray(p.tags) ? p.tags : [])
        .map(norm).filter(Boolean);
      var catTH = (window.DMCCat && DMCCat.labelFor) ? norm(DMCCat.labelFor(p.category) || '') : '';
      var cat   = norm(p.category);
      var desc  = norm((p.shortDesc || '') + ' ' + (p.fullDesc || ''));

      INDEX.push({
        p: p,
        name: name, nameL: loose(p.name),
        tokens: name.split(' ').filter(Boolean),
        keys: keys, keysL: keys.map(function (k) { return k.replace(/ /g, ''); }),
        cat: cat, catTH: catTH, catL: (cat + ' ' + catTH).replace(/ /g, ''),
        desc: desc, descL: desc.replace(/ /g, ''),
        boost: Math.max(-50, Math.min(50, Number(p.searchBoost) || 0)),
        hidden: !!p.hideFromSearch,
        pop: Math.min(15, Math.log2((Number(p.orderCount) || 0) + 1) * 3) + (p.isHot ? 5 : 0),
      });

      String(p.name || '').split(/\s+/).forEach(function (t) { addVocab(t, p.name, t); });
      addVocab(name, p.name, p.name);
      []
        .concat(Array.isArray(p.keywords) ? p.keywords : [])
        .concat(Array.isArray(p.tags) ? p.tags : [])
        .forEach(function (kRaw) {
          addVocab(kRaw, p.name, kRaw);
          String(kRaw).split(/\s+/).forEach(function (t) { addVocab(t, p.name, t); });
        });
      if (catTH) {
        var catRaw = (window.DMCCat && DMCCat.labelFor) ? (DMCCat.labelFor(p.category) || '') : '';
        addVocab(catRaw, catRaw, catRaw);
        catRaw.split(/\s+/).forEach(function (t) { addVocab(t, catRaw, t); });
      }
    });
    // คำจากพจนานุกรมเข้า vocab ด้วย (ให้ตัดคำ/DYM รู้จัก)
    DEFAULT_SYNONYMS.forEach(function (g) { g.forEach(function (w) { addVocab(w, w, w); }); });
    ((opts && opts.synonyms) || []).forEach(function (g) { (Array.isArray(g) ? g : []).forEach(function (w) { addVocab(w, w, w); }); });
    Object.keys(DEFAULT_ALIASES).forEach(function (k) { addVocab(k, k, k); addVocab(DEFAULT_ALIASES[k], DEFAULT_ALIASES[k], DEFAULT_ALIASES[k]); });
    Object.keys((opts && opts.aliases) || {}).forEach(function (k) {
      addVocab(k, k, k); addVocab((opts.aliases || {})[k], (opts.aliases || {})[k], (opts.aliases || {})[k]);
    });
    // เรียงยาว→สั้น สำหรับตัดคำแบบ longest-match
    VOCAB.sort(function (a, b) { return b.w.length - a.w.length; });
  }

  // ══════════════ 6) ตัดคำไทยแบบ vocab-driven (longest match) ══════════════
  //  "บัตรนักเรียนมปลาย" → ["บัตรนักเรียน","มปลาย"...] อิงคลังคำจากสินค้าจริง+พจนานุกรม
  function segment(q) {
    q = loose(q);
    if (!q) return [];
    var out = [], i = 0;
    while (i < q.length) {
      var hit = '';
      for (var v = 0; v < VOCAB.length; v++) {
        var w = VOCAB[v].w.replace(/ /g, '');
        if (w.length > 1 && w.length <= q.length - i && q.substr(i, w.length) === w) { hit = w; break; }
      }
      if (hit) { out.push(hit); i += hit.length; }
      else i++;                                    // ข้ามตัวอักษรที่ไม่รู้จัก
    }
    return out;
  }

  // ══════════════ 7) MATCH + SCORE ══════════════
  //  น้ำหนัก: Exact ชื่อ 100 > ชื่อขึ้นต้น 80 > ชื่อบางส่วน 60 > Tag 55/45 > หมวด 35 > คำอธิบาย 25
  //  Fuzzy ได้คะแนนลดหลั่นตามระยะห่าง · ผ่านคำพ้อง ×0.9
  function scoreTermOnEntry(e, t) {
    var tl = t.replace(/ /g, '');
    if (!tl) return 0;
    if (e.name === t || e.nameL === tl) return 100;
    if (e.nameL.indexOf(tl) === 0)      return 80;
    if (e.nameL.indexOf(tl) !== -1)     return 60;
    for (var i = 0; i < e.keys.length; i++) {
      if (e.keys[i] === t || e.keysL[i] === tl) return 55;
      if (e.keysL[i].indexOf(tl) !== -1)        return 45;
    }
    if (e.cat === t || e.catTH === t || e.catL.indexOf(tl) !== -1) return 35;
    if (e.descL.indexOf(tl) !== -1)     return 25;
    // Fuzzy: เทียบกับ token ของชื่อ + keyword + ชื่อเต็ม (sliding window ครอบคำที่ซ่อนในชื่อยาว)
    var max = fuzzMax(tl.length);
    if (max > 0) {
      var best = max + 1, d, j;
      for (j = 0; j < e.tokens.length; j++) { d = fuzzyIn(tl, e.tokens[j], max); if (d < best) best = d; }
      if (best > 0) { d = fuzzyIn(tl, e.nameL, max); if (d < best) best = d; }
      for (j = 0; j < e.keysL.length && best > 0; j++) { d = fuzzyIn(tl, e.keysL[j], max); if (d < best) best = d; }
      if (best <= max) return Math.max(10, 48 - best * 12);
    }
    return 0;
  }

  function scoreTermSet(e, terms) {                // คำ + คำพ้อง → คะแนนที่ดีที่สุด (คำพ้อง ×0.9)
    var best = 0;
    for (var i = 0; i < terms.length; i++) {
      var s = scoreTermOnEntry(e, terms[i]);
      if (i > 0) s *= 0.9;
      if (s > best) best = s;
    }
    return best;
  }

  function queryOnce(qRaw) {
    var q = norm(qRaw);
    if (!q) return [];
    var tokens = q.split(' ').filter(Boolean);
    // คำติดกันไม่มีช่องว่าง → ลองตัดคำจากคลังคำ
    if (tokens.length === 1 && tokens[0].length >= 5) {
      var seg = segment(tokens[0]);
      if (seg.length > 1) tokens = seg;
    }
    var expanded = tokens.map(expandTerm);          // ต่อ token: [ตัวเอง+คำพ้อง...]
    var wholeSet = tokens.length > 1 ? expandTerm(q) : null;   // ทั้งวลีด้วย (เผื่อชื่อมีช่องว่างตรงกัน)

    var out = [];
    for (var i = 0; i < INDEX.length; i++) {
      var e = INDEX[i];
      if (e.hidden) continue;                       // แอดมินซ่อนจากผลค้นหา
      var total = 0, ok = true;
      for (var t = 0; t < expanded.length; t++) {
        var s = scoreTermSet(e, expanded[t]);
        if (s <= 0) { ok = false; break; }          // ทุกคำต้องเจอ (AND)
        total += s;
      }
      if (!ok && wholeSet) {                        // เผื่อทั้งวลี match ตรงๆ
        var sw = scoreTermSet(e, wholeSet);
        if (sw > 0) { ok = true; total = sw * expanded.length; }
      }
      if (!ok) continue;
      var score = total / expanded.length + e.pop + e.boost;
      out.push({ product: e.p, score: score });
    }
    out.sort(function (a, b) { return b.score - a.score; });
    return out;
  }

  function query(qRaw) {
    var key = norm(qRaw);
    if (!key) return [];
    if (cache.has(key)) return cache.get(key);
    var res = queryOnce(qRaw);
    if (!res.length) {                              // ไม่เจอ → ลองสลับ layout แป้นพิมพ์
      var vars = layoutVariants(String(qRaw));
      for (var i = 0; i < vars.length && !res.length; i++) res = queryOnce(vars[i]);
    }
    if (cache.size > 200) cache.clear();            // กัน memory โต
    cache.set(key, res);
    return res;
  }

  // ══════════════ 8) SUGGEST / DID-YOU-MEAN / NEARBY ══════════════
  function suggest(qRaw, limit) {
    limit = limit || 6;
    var q = norm(qRaw), ql = loose(qRaw);
    if (!q) return [];
    var seen = {}, out = [];
    function push(text, type) {
      var k = norm(text);
      if (!k || seen[k]) return;
      seen[k] = 1;
      out.push({ text: text, type: type });
    }
    // ชื่อสินค้า: ขึ้นต้นก่อน แล้วค่อยบางส่วน
    for (var pass = 0; pass < 2 && out.length < limit; pass++) {
      for (var i = 0; i < INDEX.length && out.length < limit; i++) {
        var e = INDEX[i];
        if (e.hidden) continue;
        var hit = pass === 0 ? e.nameL.indexOf(ql) === 0 : e.nameL.indexOf(ql) > 0;
        if (hit) push(e.p.name, 'product');
      }
    }
    // keyword + หมวด
    for (var v = 0; v < VOCAB.length && out.length < limit; v++) {
      if (VOCAB[v].w.replace(/ /g, '').indexOf(ql) !== -1) push(VOCAB[v].src || VOCAB[v].d || VOCAB[v].w, 'term');
    }
    return out.slice(0, limit);
  }

  function didYouMean(qRaw) {
    var q = norm(qRaw);
    if (!q || q.length < 3) return null;
    var tokens = q.split(' ').filter(Boolean);
    var fixed = [], changed = false;
    tokens.forEach(function (t) {
      var tl = t.replace(/ /g, '');
      var max = Math.max(1, fuzzMax(tl.length));
      var best = null, bestD = max + 1;
      for (var v = 0; v < VOCAB.length; v++) {
        var w = VOCAB[v].w;
        if (w === tl) { best = null; bestD = 0; break; }   // สะกดถูกอยู่แล้ว
        var d = lev(tl, w.replace(/ /g, ''), max);
        if (d < bestD) { bestD = d; best = VOCAB[v].d || w; }
      }
      if (best && bestD > 0) { fixed.push(best); changed = true; }
      else fixed.push(t);
    });
    if (!changed) {
      // เผื่อพิมพ์ผิด layout ทั้งก้อน
      var vars = layoutVariants(String(qRaw));
      for (var i = 0; i < vars.length; i++) {
        if (queryOnce(vars[i]).length) return vars[i];
      }
      return null;
    }
    var candidate = fixed.join(' ');
    return queryOnce(candidate).length ? candidate : null;
  }

  function nearbyTerms(qRaw, limit) {
    limit = limit || 4;
    var ql = loose(qRaw);
    if (!ql) return [];
    var scored = [];
    for (var v = 0; v < VOCAB.length; v++) {
      var w = VOCAB[v].w.replace(/ /g, '');
      if (w.length < 3) continue;
      var max = Math.max(2, fuzzMax(Math.max(ql.length, w.length)));
      var d = lev(ql, w, max);
      var disp = VOCAB[v].d || VOCAB[v].w;
      if (d <= max) scored.push({ w: disp, d: d });
      else if (w.indexOf(ql.slice(0, 3)) === 0) scored.push({ w: disp, d: max });  // ขึ้นต้นคล้าย
    }
    scored.sort(function (a, b) { return a.d - b.d || a.w.length - b.w.length; });
    var seen = {}, out = [];
    for (var i = 0; i < scored.length && out.length < limit; i++) {
      if (!seen[scored[i].w]) { seen[scored[i].w] = 1; out.push(scored[i].w); }
    }
    return out;
  }

  // ══════════════ 9) HIGHLIGHT ══════════════
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function highlight(text, qRaw) {
    var safe = escapeHtml(text == null ? '' : text);
    var q = norm(qRaw);
    if (!q) return safe;
    // รวมคำค้น + คำพ้องทุกตัว เรียงยาว→สั้น (กันคำสั้นไปตัดกลางคำยาว)
    var terms = {};
    q.split(' ').filter(Boolean).forEach(function (t) {
      expandTerm(t).forEach(function (x) { if (x.length >= 2) terms[x] = 1; });
    });
    var list = Object.keys(terms).sort(function (a, b) { return b.length - a.length; });
    if (!list.length) return safe;
    var MARKS = '[ัิีึืฺุู็่้๊๋์ํ๎]*';   // สระบน-ล่าง/วรรณยุกต์/การันต์ (U+0E31, U+0E34–3A, U+0E47–4E)
    var pattern = list.map(function (t) {
      var esc = escapeHtml(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s*');
      // แทรกตัวยอมรับ combining marks หลังอักษรไทยทุกตัว ให้ match คำจริงที่มีวรรณยุกต์ครบคำ
      return esc.replace(/([ก-ฮะาำเ-ๆ])/g, '$1' + MARKS);
    }).join('|');
    try {
      return safe.replace(new RegExp('(' + pattern + ')', 'giu'), '<mark class="dcs-hl">$1</mark>');
    } catch (e) { return safe; }
  }

  return {
    buildIndex: buildIndex,
    query: query,
    suggest: suggest,
    didYouMean: didYouMean,
    nearbyTerms: nearbyTerms,
    highlight: highlight,
    normalize: norm,
    _lev: lev,                 // เผื่อทดสอบ
    _segment: segment,
  };
})();
