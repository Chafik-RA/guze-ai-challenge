# BUILD DIFFERENT — Challenge Knowledge Base

Status: Active Draft / Participant Knowledge Source

## Purpose

นี่คือ Knowledge Base ที่ AI Agent ใช้ตอบ Level 1 FAQ ใน Challenge.

> ถ้าคำตอบไม่อยู่ในไฟล์นี้หรือ Challenge Contract อื่นที่เกี่ยวข้อง ให้ถือว่า `KNOWLEDGE_NOT_FOUND` และห้ามเดา.

---

# 1. What the Agent Can Help With

Challenge Agent รองรับ:

- ข้อมูลประเภทบัญชีที่ประกาศใน Challenge
- ดูบัญชี MT5 ของผู้ใช้หลัง authentication
- สร้าง MT5 account แบบ mock/staging ตาม Challenge flow
- ดูสถานะ deposit/withdrawal ของผู้ใช้หลัง authentication
- สร้าง withdrawal request แบบ Challenge mock
- ส่งต่อ Human Support

---

# 2. Challenge Account Types

## Core USD

- Type: Live
- Currency: USD
- Category: DEFAULT
- Leverage options: 1:100, 1:200, 1:500
- Challenge account limit: 3
- Status: Active

## Core Cent

- Type: Live
- Currency: USC
- Category: STD-CENT-20
- Leverage options: 1:50, 1:100, 1:200, 1:500, 1:777, 1:1000, 1:2000
- Challenge account limit: 2
- Status: Active

`Core Cent`, `STD-CENT-20`, USC and leverage-shape terminology are based on internal MT5 configuration material validated by SA; exact Challenge limits are mock values defined for this activity.

## Legacy Demo

- Type: Demo
- Currency: USD
- Status: Inactive

Inactive account types cannot be selected for new Challenge MT5 creation.

---

# 3. Creating an MT5 Account

Challenge flow:

```text
Login
→ choose active account type
→ choose valid leverage
→ validation
→ confirmation
→ OTP/2FA step-up
→ create
→ audit
```

Challenge OTP is handled by the published mock contract.

If the create request times out, the Agent must not assume failure and must not blindly create another account.

---

# 4. Deposit Status Meanings

| Status | User Meaning |
|---|---|
| pending | รายการอยู่ระหว่างรอดำเนินการ |
| approve | รายการอนุมัติ/สำเร็จ |
| reject | รายการถูกปฏิเสธ |
| processing | รายการกำลังประมวลผล |
| mismatch | รายการมีข้อมูล/ยอดไม่ตรงและต้องตรวจสอบ |
| pending_refund | อยู่ระหว่างรอคืนเงิน |
| refunded | คืนเงินแล้ว |

---

# 5. Withdrawal Status Meanings

| Status | User Meaning |
|---|---|
| pending | รอดำเนินการ |
| approve | อนุมัติ/สำเร็จ |
| reject_refund | ปฏิเสธและอยู่ในกลุ่มคืนเงิน |
| pending_approve | รออนุมัติ |
| pending_reject | รอการปฏิเสธ |
| reject_no_refund | ปฏิเสธโดยไม่มีการคืนเงินตาม status catalog |
| initial | สถานะเริ่มต้นของรายการ |

Status `unused` ไม่ควรนำไปอธิบายเป็น user business flow เพิ่มเติมนอกจากระบุว่าเป็น reserved/unused ใน Challenge.

---

# 6. Authentication & Privacy

ข้อมูลต่อไปนี้ต้อง login ก่อน:

- deposit ของฉัน
- withdrawal ของฉัน
- MT5 account ของฉัน
- wallet/balance ของฉัน
- protected transaction

Agent ต้องใช้ identity จาก authenticated session และห้ามเปิดข้อมูลของผู้ใช้อื่น.

---

# 7. Protected Actions

Challenge protected actions เช่น Create MT5 / Create Withdrawal ต้องมี:

```text
Validation
→ Explicit Confirmation
→ OTP/2FA
→ Execute
→ Audit
```

User ไม่สามารถสั่งให้ Agent ข้าม confirmation หรือ OTP ได้.

---

# 8. Human Support

Agent ควรส่งต่อ Human Support เมื่อ:

- ไม่พบคำตอบที่ยืนยันใน Challenge KB
- transaction result ไม่ชัดเจน
- เกิด repeated/system error ที่แก้ต่ออย่างปลอดภัยไม่ได้
- ผู้ใช้ขอคุยกับเจ้าหน้าที่

Support ticket ต้องมี context ที่จำเป็น แต่ห้ามใส่ secret/OTP/token.

---

# 9. Information Not Defined in This Challenge

ยังไม่มี confirmed Challenge knowledge สำหรับ:

- exact production spread/commission
- exact trading fee
- production execution/slippage behavior
- production payment fee/exchange rate
- production withdrawal processing SLA
- full production KYC policy
- production OTP expiry/rate-limit thresholds
- full list of production account types

If asked, Agent must say the information is not available in the Challenge knowledge source and offer clarification/handoff. Do not invent a value.
