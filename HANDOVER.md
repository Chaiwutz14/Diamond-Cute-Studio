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
