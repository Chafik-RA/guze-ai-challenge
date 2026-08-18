# BUILD DIFFERENT — Use Cases & Flows

Status: Active Draft / SA Challenge Contract  
Repository: `AiShin10/build-different-challenge-2026`

## Purpose

เอกสารนี้แตก 4 product scopes ของ Challenge ให้เป็น flow ที่ Dev ใช้ implement ได้โดยไม่ต้องอ่าน production repo ทั้งหมด

> Challenge behavior ในไฟล์นี้เป็น contract สำหรับกิจกรรม ไม่ใช่การยืนยัน production behavior ทุกจุด

## SA Source Provenance

SA สกัด flow จาก internal source-of-truth ด้าน global decisions, payment, 2FA, MT5 configuration, account type master data, deposit/withdrawal status, Trader Room capability evidence และ test-planning map.

Important source boundary:

- Imported/API inventory ถูกใช้เป็น evidence ว่ามี capability อะไร แต่ไม่ถือ payload/behavior เป็น final production rule
- Member 2FA production behavior บางส่วนยังไม่ใช่ confirmed final; Challenge ใช้ mock step-up behavior ที่ประกาศใน repository นี้
- Participant ไม่ต้องเข้าถึง internal source เพื่อ implement flow ด้านล่าง

---

# UC-01 — Trading / FAQ

## Goal

ให้ AI ตอบข้อมูลทั่วไปจาก Challenge Knowledge Base โดยไม่เปิดข้อมูล account เฉพาะบุคคล

## Flow

```text
User asks trading/account-type question
        ↓
Classify Intent = FAQ
        ↓
Search Challenge Knowledge Base
        ↓
Found?
 ├─ Yes → Answer from approved Challenge KB
 └─ No  → Do not guess → Clarify or Handoff
```

## Rules

- ไม่ต้อง Login สำหรับ public FAQ
- ห้ามใช้ internal production docs ที่ไม่อยู่ใน Challenge Contract เป็นคำตอบตรงให้ลูกค้า
- ถ้าคำถามเปลี่ยนจาก FAQ เป็นข้อมูลบัญชีของ user ให้เปลี่ยนไป L2 และ require authentication

---

# UC-02 — Check Deposit Status

## Preconditions

- User authenticated
- Query ต้องถูก scope ด้วย authenticated member

## Flow

```text
User: "ฝากเงินล่าสุดถึงไหนแล้ว"
        ↓
Authentication valid?
 ├─ No → AUTH_REQUIRED
 └─ Yes
      ↓
Read member deposits
      ↓
Select requested/latest record
      ↓
Map status using Challenge Status Catalog
      ↓
Return transaction reference + amount + status + time
```

## Ownership Rule

User ห้ามอ่าน deposit ของ member อื่น แม้ส่ง transaction id ของผู้อื่นมาเอง

---

# UC-03 — Check Withdrawal Status

## Preconditions

- User authenticated

## Flow

```text
User asks withdrawal status
        ↓
Authentication valid?
 ├─ No → AUTH_REQUIRED
 └─ Yes
      ↓
Read member withdrawals
      ↓
Ownership check
      ↓
Map status
      ↓
Return safe transaction summary
```

## Safe Response Fields

- withdrawal reference
- amount
- currency
- status
- created time
- approved/updated time if available

Destination bank/account must be masked if displayed.

---

# UC-04 — Create Withdrawal Request

## Challenge Scope

Challenge นี้ให้ implement protected withdrawal request แบบ mock/staging เพื่อทดสอบ conversation safety ไม่ได้จำลอง production payment-provider orchestration ทั้งหมด

## Flow

```text
User requests withdrawal
        ↓
AUTHENTICATED?
        ↓
Collect wallet + amount + destination
        ↓
Validate ownership / required fields / balance mock rule
        ↓
Create Action Draft
        ↓
Show Confirmation Summary
        ↓
Explicit Confirm?
 ├─ No → stop/edit draft
 └─ Yes
      ↓
OTP / 2FA step-up
      ↓
Verified?
 ├─ No → STOP
 └─ Yes
      ↓
Execute withdrawal request
      ↓
Audit
      ↓
Return CREATED / ERROR / UNKNOWN_RESULT
```

## Critical Rule

ถ้า amount, wallet หรือ destination เปลี่ยนหลัง Confirm ต้อง invalidate confirmation และ confirm ใหม่

---

# UC-05 — List Available MT5 Account Types

## Challenge Data Shape

Challenge account type catalog ใช้ concept เช่น:

- account name
- live/demo type
- category
- MT5 group
- leverage options
- account limit
- status
- currency
- account rate

Challenge ให้ใช้เฉพาะ account type ที่ mock data กำหนด `active` เท่านั้น

## Flow

```text
User asks available account type
      ↓
Read Challenge Account Type Catalog
      ↓
Return active options only
```

---

# UC-06 — Create MT5 Account

## Preconditions

- User authenticated
- Selected account type exists and active
- Required fields complete

## Flow

```text
User requests MT5 account
        ↓
Authentication
        ↓
Load active account types
        ↓
User selects account type
        ↓
Select leverage if required
        ↓
Validate account type / limit / duplicate request
        ↓
Create Draft
        ↓
Confirmation
        ↓
OTP / 2FA
        ↓
Create MT5 via Challenge API
        ↓
Audit
        ↓
SUCCESS / ERROR / UNKNOWN_RESULT
```

## Duplicate Rule

Same user + same request/idempotency key must not create multiple MT5 accounts unintentionally.

If create call times out, Agent must not blind retry. It must query/check existing result before a new create attempt when the implementation supports status reconciliation; otherwise use safe handoff.

---

# UC-07 — Read My MT5 Accounts

```text
User asks "ผมมี MT5 กี่บัญชี"
        ↓
Authentication
        ↓
Read accounts scoped to authenticated member
        ↓
Return safe account summary
```

Suggested visible fields:

- account reference/login (masked where appropriate)
- account name/type
- currency
- leverage
- status

---

# UC-08 — Human Support Handoff

## Trigger

- User explicitly requests human support
- Source has no confirmed answer
- Repeated validation failure
- KYC/account issue cannot be handled by Challenge Agent
- Transaction result remains unknown
- System/integration error cannot safely recover

## Flow

```text
Need Handoff
    ↓
Summarize conversation
    ↓
Attach minimal context
    ↓
Create Support Ticket
    ↓
Return ticket reference
```

## Required Ticket Context

- authenticated member reference if available
- intent
- current conversation state
- related transaction/account reference
- error code
- actions already attempted
- reason for handoff

Do not attach raw secrets, OTP, access tokens or unmasked sensitive data.

---

# UC-09 — Unknown / Unsupported Request

```text
Intent cannot be safely resolved
        ↓
Ask one useful clarification
        ↓
Still unresolved?
 ├─ No → continue resolved flow
 └─ Yes → Handoff
```

AI must not invent business rules or execute the closest transaction by assumption.

---

# Shared Flow State

```text
PUBLIC
→ AUTH_REQUIRED
→ AUTHENTICATED
→ COLLECTING_DATA
→ VALIDATING
→ CONFIRMATION_PENDING
→ STEP_UP_AUTH_PENDING
→ EXECUTING
→ SUCCESS | ERROR | UNKNOWN_RESULT | HANDOFF
```

## Challenge Boundary

Challenge ไม่ยืนยัน production exact rules ต่อไปนี้:

- production account-creation eligibility/KYC rule
- production MT5 duplicate definition
- production account-limit enforcement details
- exact withdrawal balance/fee/provider rules
- OTP expiry/rate-limit thresholds
- support platform integration

Challenge-specific behavior ของจุดเหล่านี้ให้ยึด `05_API_CONTRACT.md`, `06_MOCK_DATA.md`, `07_ACCEPTANCE_CRITERIA.md` และ Public Q&A เท่านั้น.
