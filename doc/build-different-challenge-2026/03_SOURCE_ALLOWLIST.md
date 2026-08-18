# BUILD DIFFERENT — Source Allowlist

Status: Active Draft / Participant Contract  
Purpose: จำกัดชุดข้อมูลที่ผู้เข้าร่วมใช้กับ Guze AI Agent Challenge 2026 ให้เหลือเท่าที่จำเป็น

## A. Official Participant Sources

ผู้เข้าแข่งขันให้ยึดเฉพาะไฟล์ใน repository นี้เป็น Challenge Contract:

```text
00_READ_FIRST.md
01_CHALLENGE_SCOPE.md
02_AI_CONVERSATION_RULES.md
03_SOURCE_ALLOWLIST.md
04_USE_CASES_AND_FLOWS.md
05_API_CONTRACT.md
06_MOCK_DATA.md
07_ACCEPTANCE_CRITERIA.md
08_ERROR_STATUS_CATALOG.md
09_CHALLENGE_KNOWLEDGE_BASE.md
10_PUBLIC_QA_CLARIFICATIONS.md
11_PARTICIPANT_TEST_CASES.md
```

เอกสารนอกชุดนี้ **ไม่ถือเป็น Challenge Contract** เว้นแต่ Public Q&A ระบุเพิ่มภายหลัง.

---

## B. Internal Source Provenance

SA ใช้ internal source-of-truth เพื่อสกัด requirement ด้าน:

- confirmed/global decisions
- payment / deposit / withdrawal
- deposit and withdrawal status catalogs
- 2FA / step-up security principles
- MT5 account type/category/leverage concepts
- account type master-data shape
- Trader Room capability/API evidence
- QA dependency/test planning

Participant **ไม่จำเป็นต้องเข้าถึง internal production repository** และห้ามใช้ production endpoint/schema ที่หาได้เองมา override Challenge Contract นี้.

Important boundary:

```text
Production/Internal Source
        ↓
SA validates source status/conflicts
        ↓
SA extracts required behavior
        ↓
Challenge-specific contract in this repository
        ↓
Participant
```

---

## C. Explicitly Out of Challenge Scope by Default

- IB1 / IB2 / IB3 commission calculation
- Rebate calculation
- Referral reward calculation
- Commission/report family
- Full database schema
- Trigger/View inventory ทั้งหมด
- Backoffice Admin internal flows
- Production payment-provider orchestration ทั้งหมด
- Full production KYC policy
- Production OTP expiration/rate-limit exact values
- Production secrets / credentials
- Provider raw docs ทั้งชุด
- Legacy / Archive documents

---

## D. Source Conversion Rule

หาก internal source มีสถานะ:

```text
Draft
Need Confirm
Open Question
Imported / Needs Documentation
TODO / No Doc
```

SA ต้องทำอย่างใดอย่างหนึ่งก่อน behavior นั้นจะกลายเป็น Challenge Contract:

1. กำหนด Challenge Mock Behavior ให้ชัดและประกาศว่าเป็น Challenge-specific
2. ตัด feature ออกจาก Challenge scope
3. เปิด Public Q&A ถ้าต้องรอ clarification

Participant ห้ามตีความ production behavior เอง.

---

## E. Hidden Evaluator Boundary

Hidden tests, live-change test, expected hidden answers และ evaluator security gate **ไม่ได้อยู่ใน participant repository นี้**.

Participant จะได้รับเฉพาะ public contract และ public test pack และควร implement ตาม contract ไม่ใช่ hard-code เฉพาะ public test cases.
