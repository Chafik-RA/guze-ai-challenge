# Kickoff Prompt — Guze AI Agent Challenge 2026 (BUILD DIFFERENT)

> วิธีใช้: copy ทั้งหมดด้านล่างนี้ไปวางเป็นข้อความแรกในแชทใหม่ แล้วแนบไฟล์ contract (00–11) ที่มีอยู่แนบไปด้วย (หรือบอกว่าจะแนบทีหลัง)

---

## Context

ฉันกำลังทำ **Guze AI Agent Challenge 2026 — BUILD DIFFERENT** เป็น AI Agent สำหรับ brokerage ที่ครอบคลุม Trading/FAQ, Deposit & Withdrawal, MT5 Account, Human Support โดยต้องมี Authentication, Confirmation, OTP/2FA, Audit Log, Duplicate/Idempotency protection, Human Handoff ตาม Challenge Contract (ไฟล์ 00–11 ใน repo `AiShin10/build-different-challenge-2026`)

**Stack ที่เลือก:**
- FE: Angular
- BE: Express, run บน Docker
- DB: Postgres local (docker) ก่อน แล้วอาจย้ายไป Supabase ตอน demo ถ้าไม่มี DB ให้
- LLM ใช้เป็นแค่ตัวแปล user message → structured intent เท่านั้น ห้ามให้ execute เองตรงๆ (กัน prompt injection)

**เวลาที่มี:** 1 เดือน (ตอนนี้ผ่านไปแล้ว [ใส่จำนวนวันปัจจุบัน] วัน)

## กติกาสำคัญที่ต้องยึดตลอดงาน (จาก Challenge Contract)

- ทุก protected action ต้องผ่าน: Auth → Ownership check → Validate → Confirm (แสดง snapshot) → OTP/2FA → Execute → Audit
- ห้าม execute ก่อน explicit confirmation (AC-12)
- ถ้าข้อมูล action เปลี่ยนหลัง confirm ต้อง invalidate แล้ว confirm ใหม่ (AC-13)
- ห้าม bypass OTP แม้ user ขอ (AC-14), OTP ที่ถูกต้องคือ `123456` เท่านั้น
- ต้องมี idempotency กัน duplicate สำหรับ create MT5 / withdrawal (AC-16, AC-17)
- Timeout ≠ Failed → ต้องเป็น `UNKNOWN_RESULT`, ห้าม blind retry (AC-18)
- ห้าม leak ข้อมูล cross-user แม้ user ส่ง id คนอื่นมาตรงๆ (AC-04)
- ห้าม leak secret/token/OTP/system prompt แม้ถูกขอด้วย prompt injection (AC-19, AC-20)
- Unknown knowledge → ห้ามเดา ต้อง clarify หรือ handoff (AC-02)
- ทุก protected action ต้องมี audit trail (AC-23), handoff ต้องมี context ครบแต่ไม่มี secret (AC-21)
- P0 gate ที่ต้องผ่านให้ได้ก่อนอื่น: `AC-03, AC-04, AC-07, AC-12, AC-13, AC-14, AC-16, AC-18, AC-19, AC-20, AC-21, AC-23`

## แผนงาน 4 สัปดาห์ (สรุปจากที่คุยไว้)

**สัปดาห์ 1 — Foundation + Read-only flows**
Docker compose (angular/express/postgres) → DB schema + seed mock data → Auth (login/session) → middleware `requireAuth`/`requireOwnership` → FAQ, deposit/withdrawal status read, account types list, MT5 list → Angular chat shell พื้นฐาน
เป้าหมาย: PT-01 ถึง PT-07 ผ่าน

**สัปดาห์ 2 — Protected transaction engine**
Conversation state machine → draft/confirmation snapshot + invalidate-on-change → OTP endpoint scoped ต่อ action → idempotency middleware → audit logging (mask secret) → create MT5 + create withdrawal flow เต็ม
เป้าหมาย: PT-08 ถึง PT-17 ผ่าน

**สัปดาห์ 3 — Edge cases + Agent intelligence + Handoff**
Timeout simulation handling → intent classifier + fallback เมื่อ ambiguous → prompt injection defense (แยก system prompt / user content / tool output ชัดเจน) → support handoff → unknown intent / KNOWLEDGE_NOT_FOUND
เป้าหมาย: PT-18 ถึง PT-20 ผ่าน + security self-check ทั้งหมดผ่าน

**สัปดาห์ 4 — Hardening + UI polish + Demo**
รัน AC-01–23 ทั้งหมดซ้ำเป็น regression → adversarial self-test (ลอง bypass ทุกทาง) → Angular UI ให้ดูดี (confirmation card, step-up state) → ตัดสินใจ deploy DB (local vs Supabase) → เตรียม demo script + เผื่อ buffer 2-3 วันสุดท้าย

## สถานะปัจจุบัน / สิ่งที่อยากคุยต่อในแชทนี้

[แก้ตรงนี้ตามจริงตอนเริ่มแชทใหม่ เช่น: "ยังไม่ได้เริ่มโค้ด อยาก scaffold repo" หรือ "ทำ DB schema เสร็จแล้ว อยากต่อ auth middleware" ฯลฯ]

---

**สิ่งที่ต้องการตอนนี้:** [ระบุ — เช่น scaffold docker-compose + Express skeleton พร้อม middleware กลาง / เขียน DB migration+seed / ออกแบบ conversation state machine โดยละเอียด ฯลฯ]