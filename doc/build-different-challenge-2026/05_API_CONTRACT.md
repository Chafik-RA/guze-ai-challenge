# BUILD DIFFERENT — Challenge API Contract

Status: Active Draft / Challenge-Specific Contract  
Repository: `AiShin10/build-different-challenge-2026`

## Purpose

กำหนด API surface กลางสำหรับ Challenge เพื่อให้ทุก submission ใช้ behavior เดียวกัน

> SA ใช้ internal production capability evidence เป็นฐาน แต่ production API documentation บางส่วนยังไม่ใช่ final behavior ดังนั้น payload และ endpoint ด้านล่างเป็น **Challenge Mock Contract** ไม่ใช่ production API final.

Challenge API ใช้ prefix:

```text
/challenge/v1
```

---

# 1. Authentication

## POST `/challenge/v1/auth/login`

Request:

```json
{
  "email": "alice@example.test",
  "password": "Challenge123!"
}
```

Success `200`:

```json
{
  "access_token": "mock-token-member-1001",
  "expires_in": 3600,
  "member": {
    "member_id": 1001,
    "display_name": "Alice Demo"
  }
}
```

Failure:

```json
{
  "code": "AUTH_INVALID_CREDENTIALS",
  "message": "Invalid credentials"
}
```

Challenge Rule:

- protected endpoints require bearer token
- expired/invalid token → `401 AUTH_REQUIRED`
- member identity must come from authenticated session, not arbitrary `member_id` supplied by user

---

# 2. Current Session

## GET `/challenge/v1/auth/me`

Success:

```json
{
  "member_id": 1001,
  "display_name": "Alice Demo",
  "kyc_status": "approved",
  "two_factor_enabled": true
}
```

---

# 3. Account Types

## GET `/challenge/v1/trading/account-types`

Success:

```json
{
  "items": [
    {
      "account_type_id": 101,
      "account_name": "Core USD",
      "type": "live",
      "category": "DEFAULT",
      "currency": "USD",
      "leverages": [100, 200, 500],
      "account_limit": 3,
      "minimum_deposit": 0,
      "maximum_deposit": 9999999,
      "status": "active"
    }
  ]
}
```

Challenge mapping is derived from account-type concepts validated by SA and the published mock data in this repository.

---

# 4. My Trading Accounts

## GET `/challenge/v1/trading/accounts`

Auth required.

Success:

```json
{
  "items": [
    {
      "account_id": "MT5-70001",
      "account_type_id": 101,
      "account_name": "Core USD",
      "currency": "USD",
      "leverage": 500,
      "status": "active"
    }
  ]
}
```

Only accounts owned by authenticated member may be returned.

---

# 5. Create MT5 Account

## POST `/challenge/v1/trading/accounts`

Auth + confirmation + step-up verification required at Agent layer.

Headers:

```text
Authorization: Bearer <token>
Idempotency-Key: <unique-key>
```

Request:

```json
{
  "account_type_id": 101,
  "leverage": 500
}
```

Created `201`:

```json
{
  "request_id": "REQ-MT5-0001",
  "account": {
    "account_id": "MT5-70002",
    "account_type_id": 101,
    "account_name": "Core USD",
    "currency": "USD",
    "leverage": 500,
    "status": "active"
  }
}
```

Duplicate idempotency key:

```json
{
  "request_id": "REQ-MT5-0001",
  "replayed": true,
  "account": {
    "account_id": "MT5-70002"
  }
}
```

Possible errors:

```text
ACCOUNT_TYPE_NOT_FOUND
ACCOUNT_TYPE_INACTIVE
INVALID_LEVERAGE
ACCOUNT_LIMIT_REACHED
KYC_NOT_APPROVED
DUPLICATE_REQUEST
INTEGRATION_TIMEOUT
```

`ACCOUNT_LIMIT_REACHED`, KYC eligibility and exact duplicate definition are Challenge-specific behaviors defined by Mock Data/Acceptance Criteria, not claimed production rules.

---

# 6. Deposit List

## GET `/challenge/v1/transactions/deposits`

Auth required.

Response:

```json
{
  "items": [
    {
      "deposit_id": "DEP-0001",
      "amount": 500,
      "currency": "USD",
      "payment_method": "payment_gateway",
      "status_code": 3,
      "status": "processing",
      "created_at": "2026-08-14T09:00:00+07:00",
      "approved_at": null
    }
  ]
}
```

Challenge status labels follow `08_ERROR_STATUS_CATALOG.md`.

---

# 7. Deposit Detail

## GET `/challenge/v1/transactions/deposits/{deposit_id}`

Auth + ownership required.

If record exists but belongs to another member:

```http
404
```

Challenge uses `404` instead of disclosing whether another user's transaction exists.

---

# 8. Withdrawal List

## GET `/challenge/v1/transactions/withdrawals`

Auth required.

Response:

```json
{
  "items": [
    {
      "withdrawal_id": "WD-0001",
      "wallet_id": "MAIN-1001",
      "amount": 250,
      "currency": "USD",
      "payment_method": "bank_transfer",
      "destination_masked": "SCB ****5678",
      "status_code": 0,
      "status": "pending",
      "created_at": "2026-08-14T09:10:00+07:00",
      "approved_at": null
    }
  ]
}
```

Status labels follow `08_ERROR_STATUS_CATALOG.md`.

---

# 9. Withdrawal Detail

## GET `/challenge/v1/transactions/withdrawals/{withdrawal_id}`

Auth + ownership required.

Never return full bank account, request IP, provider credential, secret or internal token.

---

# 10. Create Withdrawal

## POST `/challenge/v1/transactions/withdrawals`

Headers:

```text
Authorization: Bearer <token>
Idempotency-Key: <unique-key>
```

Request:

```json
{
  "wallet_id": "MAIN-1001",
  "amount": 250,
  "currency": "USD",
  "destination_id": "BANK-1001-01"
}
```

Created `201`:

```json
{
  "request_id": "REQ-WD-0001",
  "withdrawal": {
    "withdrawal_id": "WD-0002",
    "amount": 250,
    "currency": "USD",
    "status_code": 0,
    "status": "pending"
  }
}
```

Errors:

```text
WALLET_NOT_FOUND
WALLET_NOT_OWNED
INVALID_AMOUNT
INSUFFICIENT_BALANCE
DESTINATION_NOT_FOUND
KYC_NOT_APPROVED
DUPLICATE_REQUEST
INTEGRATION_TIMEOUT
```

Fee/provider routing is out of Challenge scope unless later clarified.

---

# 11. Step-up Verification

## POST `/challenge/v1/security/otp/verify`

Request:

```json
{
  "action_id": "ACT-0001",
  "otp": "123456"
}
```

Success:

```json
{
  "verified": true,
  "verification_token": "stepup-ACT-0001",
  "expires_in": 300
}
```

Failure:

```json
{
  "verified": false,
  "code": "OTP_INVALID"
}
```

Mock Rule:

- valid Challenge OTP = `123456`
- verification token is scoped to one action draft
- changing material transaction fields invalidates the previous confirmation/step-up context

This is Challenge behavior only; production OTP lifetime/rate limits are not part of this contract.

---

# 12. Support Handoff

## POST `/challenge/v1/support/tickets`

Request:

```json
{
  "intent": "WITHDRAWAL_STATUS",
  "conversation_summary": "User cannot confirm status after repeated timeout.",
  "related_reference": "WD-0001",
  "error_code": "UNKNOWN_RESULT",
  "reason": "Transaction result cannot be safely determined"
}
```

Created:

```json
{
  "ticket_id": "SUP-0001",
  "status": "open"
}
```

---

# 13. Audit Event

## POST `/challenge/v1/audit/events`

Request:

```json
{
  "intent": "CREATE_MT5",
  "action": "CREATE_TRADING_ACCOUNT",
  "action_id": "ACT-0001",
  "confirmation": "confirmed",
  "step_up": "passed",
  "result": "success",
  "request_reference": "REQ-MT5-0001"
}
```

Challenge rule: never send raw OTP, password, access token, secret or full sensitive destination into audit payload.

---

# 14. Common Error Envelope

```json
{
  "error": {
    "code": "ACCOUNT_TYPE_INACTIVE",
    "message": "Selected account type is not available",
    "request_id": "REQ-ERR-0001"
  }
}
```

## HTTP Mapping

| HTTP | Meaning |
|---:|---|
| 400 | Validation / invalid request |
| 401 | Authentication required/expired |
| 403 | Authenticated but action not permitted |
| 404 | Resource unavailable in caller scope |
| 409 | Duplicate/conflict/state conflict |
| 422 | Business validation failed |
| 504 | Integration timeout / result unknown |

---

# 15. Timeout Rule

For create/transaction requests:

```text
504 / timeout != confirmed failure
```

Agent must treat result as `UNKNOWN_RESULT` until status/existing result is checked or safely handed off.

Blind retry with a new idempotency key is not allowed.
