# BUILD DIFFERENT — Shared Mock Data

Status: Active Draft / Challenge-Specific Data  
Repository: `AiShin10/build-different-challenge-2026`

## Rule

ข้อมูลทั้งหมดในไฟล์นี้เป็นข้อมูลจำลองสำหรับกิจกรรมเท่านั้น ห้ามใช้ production customer data.

Mock shape อิง concept ที่ SA สกัดจาก internal source เช่น member ownership, KYC/2FA, account type master data, deposit/withdrawal status catalog และ transaction references แต่ค่าด้านล่างถูกสร้างขึ้นสำหรับ Challenge.

---

# 1. Login Users

| User | Email | Password | Member ID | KYC | 2FA | Purpose |
|---|---|---|---:|---|---|---|
| Alice | `alice@example.test` | `Challenge123!` | 1001 | approved | enabled | happy path |
| Bob | `bob@example.test` | `Challenge123!` | 1002 | pending | enabled | KYC negative path |
| Carol | `carol@example.test` | `Challenge123!` | 1003 | approved | enabled | ownership/security test |

Mock OTP for all users:

```text
123456
```

Any other OTP is invalid.

---

# 2. Wallets

| Wallet ID | Owner | Type | Currency | Balance | Status |
|---|---:|---|---|---:|---|
| `MAIN-1001` | 1001 | main | USD | 5000.00 | active |
| `MAIN-1002` | 1002 | main | USD | 2000.00 | active |
| `MAIN-1003` | 1003 | main | USD | 8000.00 | active |

Challenge Withdrawal Rule:

```text
amount > 0
amount <= current mock wallet balance
wallet must belong to authenticated user
```

Fee calculation is out of scope.

---

# 3. Withdrawal Destinations

| Destination ID | Owner | Type | Display |
|---|---:|---|---|
| `BANK-1001-01` | 1001 | bank | `SCB ****5678` |
| `BANK-1002-01` | 1002 | bank | `KBANK ****1002` |
| `BANK-1003-01` | 1003 | bank | `BBL ****1003` |

Full account numbers are intentionally not part of Challenge data.

---

# 4. Trading Account Types

## AT-101 — Core USD

```json
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
```

## AT-102 — Core Cent

```json
{
  "account_type_id": 102,
  "account_name": "Core Cent",
  "type": "live",
  "category": "STD-CENT-20",
  "currency": "USC",
  "leverages": [50, 100, 200, 500, 777, 1000, 2000],
  "account_limit": 2,
  "minimum_deposit": 0,
  "maximum_deposit": 9999999,
  "status": "active"
}
```

## AT-103 — Legacy Demo

```json
{
  "account_type_id": 103,
  "account_name": "Legacy Demo",
  "type": "demo",
  "category": "DEFAULT",
  "currency": "USD",
  "leverages": [100],
  "account_limit": 1,
  "minimum_deposit": 0,
  "maximum_deposit": 0,
  "status": "inactive"
}
```

Challenge Rule:

- Create account is allowed only for `status = active`
- leverage must be one of the configured options
- account count for the selected `account_type_id` must be below `account_limit`
- KYC must be `approved` for Challenge create action

These eligibility rules are Challenge-specific and do not claim exact production create rules.

---

# 5. Existing MT5 Accounts

| Account ID | Owner | Account Type | Currency | Leverage | Status |
|---|---:|---:|---|---:|---|
| `MT5-70001` | 1001 | 101 | USD | 500 | active |
| `MT5-71001` | 1003 | 101 | USD | 200 | active |
| `MT5-71002` | 1003 | 101 | USD | 500 | active |
| `MT5-71003` | 1003 | 101 | USD | 100 | active |

Test implications:

- Alice can create another AT-101 account
- Carol already has 3 AT-101 accounts → `ACCOUNT_LIMIT_REACHED`
- Bob KYC pending → `KYC_NOT_APPROVED`

---

# 6. Deposit Records

Challenge deposit status codes:

```text
0 pending
1 approve
2 reject
3 processing
4 mismatch
5 pending refund
6 refunded
```

| Deposit ID | Owner | Amount | Currency | Method | Status Code | Status |
|---|---:|---:|---|---|---:|---|
| `DEP-0001` | 1001 | 500.00 | USD | payment_gateway | 3 | processing |
| `DEP-0002` | 1001 | 1000.00 | USD | payment_gateway | 1 | approve |
| `DEP-0003` | 1002 | 250.00 | USD | cryptocurrency_manual | 4 | mismatch |
| `DEP-0004` | 1003 | 750.00 | USD | payment_gateway | 0 | pending |

Ownership test:

Alice asking for `DEP-0004` must not receive Carol's transaction data.

---

# 7. Withdrawal Records

Challenge withdrawal status codes:

```text
0 pending
1 approve
2 reject / refund
3 pending approve
4 pending reject
5 none / unused
6 reject / no refund
99 default / initial
```

| Withdrawal ID | Owner | Wallet | Amount | Currency | Method | Destination | Status Code | Status |
|---|---:|---|---:|---|---|---|---:|---|
| `WD-0001` | 1001 | MAIN-1001 | 250.00 | USD | bank_transfer | SCB ****5678 | 0 | pending |
| `WD-0002` | 1001 | MAIN-1001 | 100.00 | USD | payment_gateway | SCB ****5678 | 1 | approve |
| `WD-0003` | 1002 | MAIN-1002 | 300.00 | USD | bank_transfer | KBANK ****1002 | 3 | pending approve |
| `WD-0004` | 1003 | MAIN-1003 | 900.00 | USD | bank_transfer | BBL ****1003 | 2 | reject / refund |

---

# 8. Failure Simulation Keys

For deterministic testing, Challenge mock service may support these test headers only in sandbox:

```text
X-Challenge-Simulate: timeout
X-Challenge-Simulate: service_error
```

Behavior:

| Header | Result |
|---|---|
| `timeout` | return `504 INTEGRATION_TIMEOUT` and mark result as unknown until checked |
| `service_error` | return `503 SERVICE_UNAVAILABLE` without creating a resource |

Do not support this header in production code outside Challenge sandbox.

---

# 9. Idempotency Fixtures

Known key:

```text
idem-mt5-alice-001
```

First use creates one MT5 account for Alice. Reusing the same key must return the same result and must not create another account.

Known withdrawal key:

```text
idem-wd-alice-001
```

First successful request creates one withdrawal. Reuse returns the original request/result.

---

# 10. Public FAQ Fixtures

Challenge KB may safely answer:

- active Challenge account types
- supported Challenge currencies shown in account catalog
- leverage options from Challenge catalog
- meaning of Challenge deposit/withdrawal statuses
- high-level process for checking status, creating MT5 and requesting support

Anything beyond the published Challenge KB must not be guessed.
