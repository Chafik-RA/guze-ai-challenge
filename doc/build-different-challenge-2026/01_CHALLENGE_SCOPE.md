# Guze AI Agent Challenge 2026 — Challenge Scope

Status: Active Draft / SA Challenge Contract  
Theme: **BUILD DIFFERENT.**

## Objective

สร้าง AI Agent สำหรับ brokerage experience ที่ไม่ได้เป็นเพียง FAQ chatbot แต่สามารถเชื่อม workflow ของระบบได้อย่างปลอดภัย โดยผู้พัฒนาต้องรับผิดชอบ End-to-End ตั้งแต่ Architecture, Implementation, Test และ Demo

## Product Scope

### 1. Trading

AI ต้องรองรับข้อมูลทั่วไป เช่น:

- Product / trading FAQ
- Account type information
- Basic trading conditions ที่อยู่ใน Challenge Knowledge Base

Boundary:

- Level 1 Information Agent
- ไม่อ่าน PII หรือข้อมูลบัญชีเฉพาะบุคคลโดยไม่ Authentication

### 2. Deposit & Withdrawal

AI ต้องสามารถ:

- ตรวจสถานะรายการของ authenticated user
- แสดง validation / error state
- สร้าง action draft สำหรับ protected transaction
- ขอ explicit confirmation ก่อน action
- ใช้ OTP/2FA ตาม Challenge Contract ก่อน execute protected action
- ไม่ blind retry เมื่อ result ไม่ชัดเจน

### 3. MT5 Account

AI ต้องสามารถ:

- แสดงข้อมูล account type จาก Challenge Contract
- สร้าง MT5 Account ผ่าน Mock / Staging API
- Validate ก่อนสร้าง
- Confirm ก่อนสร้าง
- ป้องกัน duplicate account/request
- จัดการ timeout / unknown result อย่างปลอดภัย

### 4. Human Support

AI ต้องสามารถ:

- Handoff เมื่อไม่สามารถตอบหรือดำเนินการต่อได้
- เปิด support ticket ผ่าน mock/staging contract
- ส่ง conversation summary และ context ที่จำเป็น
- ไม่ส่ง sensitive data เกินความจำเป็น

## Capability Boundary

| Level | Name | Allowed |
|---|---|---|
| L1 | Information Agent | FAQ / Knowledge Base / Public information |
| L2 | Account Assistant | Read user-specific data หลัง Authentication |
| L3 | Transaction Agent | Protected action หลัง Validation + Confirmation + OTP/2FA + Audit |

## Mandatory Foundations

- Authentication / Session
- Authorization / Data Ownership
- Confirmation
- OTP / 2FA for protected action
- Audit Log
- Error Handling
- Duplicate Protection / Idempotency-equivalent behavior
- Human Handoff
- Responsive UI

## Out of Scope Unless Added Later

- Production credentials
- Real customer data
- Direct production transaction
- Full production business logic ทุกระบบ
- Internal admin-only flows ที่ไม่ได้อยู่ใน Challenge Contract
- IB / Rebate / Referral calculation logic เว้นแต่ SA เพิ่มเข้าโจทย์ภายหลัง

## Challenge Rule

Challenge behavior ต้องมาจากเอกสารใน repository นี้เท่านั้น เว้นแต่ `10_PUBLIC_QA_CLARIFICATIONS.md` จะประกาศ source หรือ behavior เพิ่มภายหลัง

หาก production source ซับซ้อนเกิน Challenge SA สามารถกำหนด Mock Behavior ที่ง่ายกว่าได้ โดยต้องประกาศเป็น Challenge-specific rule ให้ผู้เข้าร่วมทุกคนทราบพร้อมกัน
