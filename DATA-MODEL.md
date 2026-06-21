# 🗄️ DATA-MODEL — โครงสร้างข้อมูล Firestore

โปรเจกต์ Firebase: `diamond-cute-studio` (asia-southeast3) · ทุก collection อยู่ระดับ root

## products — สินค้า
| field | type | ตัวอย่าง/หมายเหตุ |
|---|---|---|
| name | string | "รูปโพลารอยด์ 3×4 นิ้ว" |
| category | string | ชื่อไทย เช่น "โพลารอยด์" (จับคู่ slug ผ่าน js/categories.js) |
| price | number | 29 |
| unit | string | "ใบ" |
| emoji | string | ใช้เมื่อไม่มีรูป |
| images | array | `[{url, label}]` — label ผูกกับตัวเลือกขนาด/วัสดุ |
| coverIndex | number | index รูปปกใน images |
| videoUrl | string | ลิงก์ YouTube/TikTok |
| shortDesc / description | string | คำอธิบาย |
| sizes / materials | string | ตัวเลือก คั่นด้วย , |
| bulkDiscount | string | "5+ ชิ้น ลด 10%" |
| minQty | number | ขั้นต่ำ |
| hasPreview | boolean | เปิด Canvas Preview |
| templates | array | id/ชื่อเทมเพลตที่อนุญาต |
| isHot / isNew / active | boolean | ป้าย/สถานะ |
| createdAt | timestamp | |

## orders — ออเดอร์
| field | type | หมายเหตุ |
|---|---|---|
| orderId | string | "DCS-2665" (แสดงลูกค้า) |
| customerName / customerPhone / address | string | |
| phoneSearch | string | เบอร์ตัวเลขล้วน — ใช้ค้นหลัง OTP |
| items | array | `[{name, qty, price, options}]` |
| itemsSummary | string | สรุปย่อ |
| subtotal / shipping / discount / total | number | |
| paymentMethod | string | 'promptpay' \| 'cod' |
| slipUrl | string | URL สลิป (เก็บที่ ImgBB ผ่าน Worker — ที่เดียวกับรูปสินค้า) |
| slipRef | string | อ้างอิงจาก QR ในสลิป (อ่านง่าย — แสดงให้แอดมิน) |
| slipVerify | object | ผลตรวจสลิปอัตโนมัติ `{status:'passed'\|'failed'\|'unverified', reason, provider:'local'\|'easyslip'\|'slipok', amount, checkedAt}` |
| fileUrls | array | รูปที่ลูกค้าแนบ (ImgBB) |
| customerNote | string | |
| status | string | pending → processing → shipping → done \| cancelled |
| carrier | string | kerry \| flash \| jt \| thaipost |
| trackingNo | string | เลขพัสดุ |
| createdAt | timestamp | |

## slipGuard — กันสลิปซ้ำ
doc id = hash ของเนื้อ QR ในสลิป (ไม่มี PII) · field: orderId · at(timestamp)
> existence = สลิปนี้เคยถูกใช้แล้ว → ตอนสั่งซื้อจะเช็ก doc นี้ก่อน (อ่านทีละ doc ได้ตาม rules)

## reviews — รีวิว
name(2-40) · rating(1-5) · text(10-500) · productId · productName · status(`pending`/`approved`/`rejected`) · source(`customer`/`admin`) · createdAt

## gallery — ตัวอย่างงาน
name · cat (slug) · image (URL) · emoji · size('tall'/'wide'/'') · active(bool) · createdAt
> โค้ดอ่านเผื่อ field เก่า: imageUrl, url, title, category

## siteContent/main — เนื้อหาเว็บ (CMS, doc เดียว)
hero{badge,title1,title2,title3,desc} · promo{active,tag,title,desc,btnText,btnLink} · stats{orders,rating,days} · contact{line,lineLabel,facebook,instagram,tiktok,email,phone,hours} · payment{promptpayId,promptpayName,qrImageUrl, **methods{promptpay,cod,truemoney,credit : {shown,ready}}**} · faq[{q,a}] · **pages{about{title,subtitle,stepsHead}, gallery{title,subtitle}}** (แก้ inline บนหน้าบ้านได้)

## templates — กรอบรูป PNG ของร้าน
name · frameUrl (PNG กลางโปร่งใส) · active · createdAt

## categories — หมวดหมู่ที่ร้านเพิ่มเอง
name · emoji · slug · createdAt  *(หมวด built-in 7 หมวดอยู่ใน js/categories.js)*

## contacts — กล่องข้อความจากฟอร์มติดต่อ
name · phone/email · topic · message · createdAt · read(bool)

## settings — ตั้งค่าอื่นๆ (เผื่ออนาคต)
