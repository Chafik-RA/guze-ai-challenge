# BUILD DIFFERENT — Public Q&A & Clarification Log

Status: Active / Public Challenge Contract Addendum

## Rule

คำตอบในไฟล์นี้มีผลเป็น Challenge Contract ตั้งแต่ประกาศ และต้องเปิดให้ผู้เข้าร่วมทุกคนเห็นพร้อมกัน.

หากคำตอบใหม่ขัดกับ Challenge document เดิม ให้ Q&A entry ที่ใหม่กว่ามีผลสำหรับกิจกรรม และ SA ต้อง update เอกสารหลักภายหลัง.

## Entry Template

```markdown
## Q-XXX — <Topic>
Date:
Question:
Answer:
Affected Docs:
Status: Clarified / Need Confirm
```

---

## Q-001 — Can participants use production docs outside this repository?

Answer:

ไม่ถือเป็น Challenge Contract เว้นแต่ Public Q&A อ้างถึงโดยตรง. Participant ไม่จำเป็นต้องเข้าถึง production repository และห้าม infer business rule จาก production endpoint/schema เอง.

Status: Clarified

## Q-002 — What OTP should be used in the sandbox?

Answer:

Use mock OTP `123456` according to `05_API_CONTRACT.md` and `06_MOCK_DATA.md`.

This is Challenge-only behavior.

Status: Clarified

## Q-003 — Is KYC required for Challenge Create MT5 / Withdrawal?

Answer:

Yes for this Challenge contract. `kyc_status` must be `approved` for protected create actions used in acceptance tests.

This does not claim the exact production eligibility rule.

Status: Clarified

## Q-004 — What should happen when a create API times out?

Answer:

Treat as `UNKNOWN_RESULT`. Do not claim failure and do not blind retry with a new idempotency key. Check existing result/status where possible or hand off.

Status: Clarified

## Q-005 — Can the Agent answer production spread/fee/SLA questions?

Answer:

Only if the value is later added to the Challenge Knowledge Base. Current Challenge KB intentionally does not define those values, so the Agent must not guess.

Status: Clarified
