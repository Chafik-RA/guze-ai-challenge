# BUILD DIFFERENT — Participant Guide

Status: Active Draft / Official Participant Contract  
Repository: `AiShin10/build-different-challenge-2026`  
Branch: `main`  
Purpose: Official participant working set for **Guze AI Agent Challenge 2026 — BUILD DIFFERENT.**

## Rule

เอกสารใน repository นี้คือชุดข้อมูลหลักที่ผู้เข้าร่วมกิจกรรมต้องใช้สำหรับ Challenge นี้

> เอกสาร production / internal / evaluator ที่อยู่นอก repository นี้ **ไม่ถือเป็น Challenge Contract** เว้นแต่มีการประกาศเพิ่มผ่าน `10_PUBLIC_QA_CLARIFICATIONS.md`

## Challenge Scope

Prototype ต้องครอบคลุม:

1. Trading / FAQ
2. Deposit & Withdrawal
3. MT5 Account
4. Human Support / Handoff

Required foundation:

- Authentication / Authorization
- Confirmation
- OTP / 2FA สำหรับ protected action
- Audit Log
- Error State
- Duplicate Protection / Idempotency-equivalent behavior
- Human Handoff
- Responsive UI

## Participant Reading Order

1. `01_CHALLENGE_SCOPE.md`
2. `02_AI_CONVERSATION_RULES.md`
3. `03_SOURCE_ALLOWLIST.md`
4. `04_USE_CASES_AND_FLOWS.md`
5. `05_API_CONTRACT.md`
6. `06_MOCK_DATA.md`
7. `07_ACCEPTANCE_CRITERIA.md`
8. `08_ERROR_STATUS_CATALOG.md`
9. `09_CHALLENGE_KNOWLEDGE_BASE.md`
10. `10_PUBLIC_QA_CLARIFICATIONS.md`
11. `11_PARTICIPANT_TEST_CASES.md`

## Priority Rule

สำหรับกิจกรรมนี้:

```text
Latest Public Q&A clarification
        ↓
Challenge Scope / Conversation Rules
        ↓
Use Cases / API Contract
        ↓
Mock Data / Acceptance Criteria / Error Catalog
        ↓
Challenge Knowledge Base / Participant Tests
```

หากข้อมูลไม่อยู่ใน Challenge Contract นี้ ให้ถือว่ายังไม่ใช่ confirmed Challenge behavior จนกว่า SA จะประกาศ clarification เพิ่ม.

## Important Boundary

Participant ไม่จำเป็นต้องเข้าถึง production source-of-truth repository เพื่อทำ Challenge นี้

ถ้าข้อมูลไม่อยู่ใน repository นี้:

```text
Do not infer business rule.
Do not infer API behavior.
Do not infer database behavior.
Ask through Public Q&A / Clarification Log.
```

## Security Boundary

- Sandbox / mock / staging only
- No production credential
- No real customer data
- No production secret
- No hidden evaluator material in this repository

## Source Provenance

SA สกัด requirement ชุดนี้จาก internal source-of-truth และแปลงเฉพาะ behavior ที่จำเป็นมาเป็น Challenge-specific contract แล้ว Participant ให้ยึด repository นี้เป็นหลัก โดยไม่ต้องตีความ production source เอง.
