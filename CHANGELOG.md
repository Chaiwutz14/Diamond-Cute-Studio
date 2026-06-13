# 📜 CHANGELOG — Diamond Cute Studio

## V16 — แก้บัค 7 + Header ใหม่
- 🐛 **บัคใหญ่: เลือกหมวดแล้วไม่พบสินค้า** — แก้การเทียบ slug↔ชื่อไทย (สินค้าเก็บชื่อไทย แต่ filter ใช้ slug) ผ่าน DMCCat.matches
- 🖼️ **Hero showcase ไม่ลบป้ายออเดอร์ล่าสุด** — แทนเฉพาะการ์ดรูป + เวลาสุ่มกลับมาทำงาน + รูป fallback สวยงามเมื่อยังไม่มีผลงานจริง
- 🎨 **Header แบบใหม่ (มือถือ)** — รูปผลงานจริงหมุน + 2 ปุ่มขนาดเท่ากันคนละสี (ม่วง/ชมพู) + skeleton ระหว่างโหลด
- 📐 **เทมเพลต responsive** — แก้การ์ด preview ล้นจอมือถือ (template-scroll + canvas ปรับขนาด)
- 📱 **Bottom navbar หลังบ้าน** — แถบล่างเฉพาะ admin (5 เมนูหลัก)
- 💄 **ยกเครื่อง UI หลังบ้าน** — sidebar/stat card/table/ปุ่ม/modal เข้าธีม + responsive
- ↔️ **ระยะห่างหัวข้อหน้าแรก** + ข้อความ "ไม่พบสินค้า" จัดกลาง


## V15 — Production-Ready & Handoff
- 🔐 **Auth ลูกผสม**: login ด้วย Firebase Auth จริง (UI รหัสผ่านช่องเดียวเหมือนเดิม, จำ session ต่อเครื่อง) + fallback ระบบ hash เดิมถ้ายังไม่ตั้งค่า
- 🛡️ **Firestore Rules v2**: เขียน/แก้/ลบต้องเป็นแอดมิน · ลูกค้าสร้างได้เฉพาะออเดอร์/รีวิว pending ที่ validate แล้ว · ค้นออเดอร์ต้องยืนยัน OTP
- 🖼️ **ImgBB ผ่าน Worker proxy** (`/upload`) — API key เก็บเป็น secret ฝั่ง server
- ⚙️ **js/config.js** — รวมการตั้งค่าทั้งระบบไว้ไฟล์เดียว
- 🗂️ **js/categories.js** — หมวดหมู่แหล่งเดียว ใช้ร่วมทุกหน้า
- 🧹 แยก inline script ออกจาก gallery/contact/about → ไฟล์ js
- 💾 **Backup**: ปุ่ม Export/Import JSON ในหลังบ้าน (ตั้งค่า)
- 🛍️ แก้การ์ด "สินค้าที่เกี่ยวข้อง" ให้เป็นการ์ดสมบูรณ์ (เดิมเป็นข้อความเปล่า)
- 📚 เอกสารครบ: USER-MANUAL / DATA-MODEL / HANDOVER / CHANGELOG / .gitignore

## V14 — แก้บัค 12 รายการ
ตัวอย่างงานโหลดทันที+รูปจริง · นับหมวดจริง · เวลาออเดอร์สุ่มสมจริง+Hero รูปจริง · แก้ Footer NaN · เพิ่มหมวดหมู่เอง · Dropdown มือถือ (bottom sheet) · LINE ทุกจุดพร้อมข้อความ · แจ้งส่งรูปทาง LINE · PWA ติดตั้งได้ · ลูกตาในช่องรหัส · Responsive

## V13 / V13.1
Footer component ฉีด CSS เอง + ไอคอน SVG · รูปจริงในตะกร้า · PromptPay การ์ดสไตล์ Thai QR · ลูกตา login · ฟอร์มรูปสินค้าแบบการ์ด · Bottom Navbar · Floating LINE · สั่งสำเร็จ→LINE พร้อมข้อความ · บีบอัดรูปอัตโนมัติ · กันรูปแตก · แบนเนอร์ออฟไลน์ · SEO (robots/sitemap/JSON-LD) · Service Worker (V13.1)

## V12
ติดตามออเดอร์ + OTP SMS · Stepper สถานะ + เลขพัสดุ · หลายรูป/วิดีโอต่อสินค้า · ระบบรีวิว (กรอง+อนุมัติ) · CMS แก้หน้าบ้านจากหลังบ้าน (รวม PromptPay) · เทมเพลตกรอบ PNG ของร้าน

## V6–V11
Admin Dashboard เต็มระบบ · Canvas Preview 6 แบบ · QA audit 25 จุด · ระบบ Loading แบบผสม · แก้บัคสะสม
