# 🤝 HANDOVER — เช็กลิสต์ส่งมอบระบบ
*สำหรับส่งต่อให้ไอที/ผู้ดูแลคนใหม่ — ห้ามกรอกรหัสผ่านจริงลงไฟล์นี้ ส่งรหัสผ่านผ่านช่องทางปลอดภัยแยกต่างหาก*

## 1) บัญชีและสิทธิ์ที่ต้องส่งมอบ
| บริการ | ใช้ทำอะไร | สิ่งที่ต้องส่งมอบ |
|---|---|---|
| **GitHub** (repo Diamond-Cute-Studio) | โค้ด + โฮสต์เว็บ (GitHub Pages) | สิทธิ์ owner/collaborator |
| **Firebase** (project: diamond-cute-studio) | ฐานข้อมูล Firestore + Authentication | สิทธิ์ Owner ใน Firebase Console |
| **Cloudflare** (Worker: dmc-studio-notify) | แจ้งเตือน LINE + proxy อัปรูป | สิทธิ์เข้า Dashboard |
| **ImgBB** | เก็บรูปภาพ | บัญชี + API key |
| **LINE Official Account** | แชท + แจ้งเตือน | สิทธิ์แอดมิน OA + LINE Developers (Channel Access Token) |

## 2) ค่าตั้งค่าทั้งหมดอยู่ที่ไหน
| ค่า | ไฟล์/ที่เก็บ |
|---|---|
| Firebase config, ADMIN_EMAIL, ImgBB key, Worker URL, ค่าส่ง | `js/config.js` (ไฟล์เดียวจบ) |
| รหัสแอดมินแบบ hash (fallback) | `js/admin.js` (ADMIN_HASH/ADMIN_SALT) |
| LINE_TOKEN, LINE_USER_ID, IMGBB_KEY | Cloudflare Worker → Settings → Variables and Secrets |
| กติกาฐานข้อมูล | `firebase-rules/firestore.rules` → publish ใน Firebase Console |
| อีเมลแอดมินใน Rules | บรรทัด isAdmin() ใน firestore.rules |

## 3) เอกสารประกอบ
README.md (ติดตั้ง/Deploy) · DATA-MODEL.md (โครงสร้างข้อมูล) · USER-MANUAL.md (คู่มือแอดมิน) · CHANGELOG.md (ประวัติเวอร์ชัน)

## 4) เช็กลิสต์วันส่งมอบ
- [ ] โอนสิทธิ์/เพิ่ม collaborator GitHub
- [ ] เพิ่มอีเมลผู้รับเป็น Owner ใน Firebase
- [ ] มอบสิทธิ์ Cloudflare + แจ้งรายชื่อ secrets ที่ตั้งไว้
- [ ] ส่งรหัสผ่าน/keys ผ่านช่องทางปลอดภัย (ไม่ใส่ในไฟล์/แชทสาธารณะ)
- [ ] Export backup ล่าสุด (หลังบ้าน → ตั้งค่า → สำรองข้อมูล) แนบไปด้วย
- [ ] ส่งคู่มือ USER-MANUAL.md ให้ผู้ใช้งานหน้าร้าน

---

## 5) V24 — ขั้นตอนเปิดฟีเจอร์ความปลอดภัย/ประสิทธิภาพ (ตั้ง secret เอง)

> โค้ดพร้อมแล้วทุกอย่าง — ส่วนด้านล่างคือ "สวิตช์" ที่ต้องตั้งค่าเองเพื่อให้ออกฤทธิ์เต็มที่
> ทุกข้อเป็น **ฟรีเทียร์** และถ้ายังไม่ตั้ง ระบบจะ fallback ทำงานเหมือนเดิม (ไม่พัง)

### 5.1 เปิด Server Order — ปิดช่องสั่ง ฿1 (SEC-A) ⭐ สำคัญสุด
1. สร้าง **Service Account** ใน Google Cloud Console (โปรเจกต์ `diamond-cute-studio`) → Role: *Cloud Datastore User* → สร้าง key แบบ JSON
2. Cloudflare → Worker `dmc-studio-notify` → Settings → Variables and Secrets → เพิ่ม:
   - `GCP_SERVICE_ACCOUNT` = เนื้อหา JSON ทั้งก้อน (เป็น Secret)
   - `PRODUCTS_SNAPSHOT_URL` = `https://chaiwutz14.github.io/Diamond-Cute-Studio/data/products.json`
   - (ออปชัน ให้ตรง CMS) `SHIP_TRANSFER`=35 `SHIP_COD`=40 `FREE_SHIP_MIN`=0
3. `config.js` ตั้ง `SERVER_ORDER:{enabled:true}` ไว้แล้ว (V24) — ทดสอบสั่งซื้อ 1 ออเดอร์ ดูว่าขึ้นในหลังบ้านปกติ
4. เสร็จแล้ว: ยอดทุกออเดอร์คำนวณจากราคาจริงฝั่งเซิร์ฟเวอร์ ปลอมยอดไม่ได้

### 5.2 ตั้ง Rate Limiting + Turnstile กันสแปม (SEC-B)
- **Cloudflare Dashboard Rate Limiting Rules** (ได้ผลสุด ไม่ต้องแก้โค้ด): Security → WAF → Rate limiting rules → สร้าง rule:
  - ตรงกับ path `/upload` → เกิน **20 requests / 1 นาที / IP** → Block 10 นาที
  - (ทำซ้ำสำหรับ `/notify` ถ้าต้องการ)
- **Turnstile (ออปชัน):** สร้าง widget ที่ Cloudflare → Turnstile → ได้ Site Key + Secret Key
  - Worker: เพิ่ม secret `TURNSTILE_SECRET`
  - `config.js`: ตั้ง `TURNSTILE:{enabled:true, siteKey:'<site key>'}`
  - (ฝั่งเว็บต้องเพิ่ม widget ส่ง token เป็น header `CF-Turnstile-Token` — ดูหมายเหตุในโค้ด Worker ฟังก์ชัน `turnstileOk`)

### 5.3 เปิด publish-snapshot ปุ่มเดียว (BUG-A)
1. สร้าง **GitHub PAT** (Fine-grained) สิทธิ์ *Contents: Read and write* เฉพาะ repo `Diamond-Cute-Studio`
2. Worker เพิ่ม secret: `GITHUB_TOKEN` = PAT, `GITHUB_REPO` = `chaiwutz14/Diamond-Cute-Studio`, (ออปชัน `GITHUB_BRANCH`=main)
3. เสร็จแล้ว: ปุ่ม "เผยแพร่ snapshot" ในหลังบ้าน commit ขึ้น GitHub ให้เองทันที (ไม่ต้องดาวน์โหลด+อัปเอง)
   - ยังไม่ตั้ง = ปุ่มจะดาวน์โหลดไฟล์ให้อัปเอง (เหมือนเดิม)

### 5.4 ยืนยัน Composite Index (BUG-D)
- ติดตั้ง Firebase CLI แล้วรัน: `firebase deploy --only firestore:indexes`
- หรือเปิดหลังบ้าน → รายการออเดอร์ → ถ้า console แจ้งลิงก์สร้าง index ให้กดลิงก์นั้น
- ไฟล์: `firebase-rules/firestore.indexes.json` (orders: status ASC + createdAt DESC)

### 5.5 หลัง deploy V24 — ทำ 1 ครั้ง
- เข้าหลังบ้าน → กด **"เผยแพร่ snapshot"** 1 ครั้ง เพื่อสร้าง `data/reviews.json` + `data/sitecontent.json`
  → หน้าแรกจะเลิกโหลด Firebase (เร็วขึ้น + ประหยัดโควต้า). ก่อนกด หน้าแรกยัง fallback อ่าน Firestore ได้ปกติ
