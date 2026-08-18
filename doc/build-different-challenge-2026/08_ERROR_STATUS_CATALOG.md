# BUILD DIFFERENT — Error & Status Catalog

Status: Active Draft / Challenge Contract

## 1. Deposit Status

| Code | Challenge Label | Meaning |
|---:|---|---|
| 0 | `pending` | รอดำเนินการ |
| 1 | `approve` | สำเร็จ/อนุมัติ |
| 2 | `reject` | ปฏิเสธ |
| 3 | `processing` | กำลังประมวลผล |
| 4 | `mismatch` | ข้อมูล/ยอด mismatch ต้อง review |
| 5 | `pending_refund` | รอคืนเงิน |
| 6 | `refunded` | คืนเงินแล้ว |

## 2. Withdrawal Status

| Code | Challenge Label | Meaning |
|---:|---|---|
| 0 | `pending` | รอดำเนินการ |
| 1 | `approve` | สำเร็จ/อนุมัติ |
| 2 | `reject_refund` | ปฏิเสธ/คืนเงิน |
| 3 | `pending_approve` | รออนุมัติ |
| 4 | `pending_reject` | รอปฏิเสธ |
| 5 | `unused` | reserved/unused |
| 6 | `reject_no_refund` | ปฏิเสธโดยไม่คืนเงิน |
| 99 | `initial` | initial/default |

## 3. Agent Conversation States

```text
PUBLIC
AUTH_REQUIRED
AUTHENTICATED
COLLECTING_DATA
VALIDATING
CONFIRMATION_PENDING
STEP_UP_AUTH_PENDING
EXECUTING
SUCCESS
ERROR
UNKNOWN_RESULT
HANDOFF
```

## 4. Challenge Error Codes

| Code | Category | Expected Agent Behavior |
|---|---|---|
| `AUTH_REQUIRED` | auth | ขอ authentication; ห้ามเปิดข้อมูล protected |
| `AUTH_INVALID_CREDENTIALS` | auth | แจ้ง login fail แบบไม่เปิด internal detail |
| `SESSION_EXPIRED` | auth | หยุด protected flow และ auth ใหม่ |
| `FORBIDDEN` | permission | deny |
| `RESOURCE_NOT_FOUND` | scope/resource | ไม่เปิดเผย resource นอก caller scope |
| `KYC_NOT_APPROVED` | business validation | stop protected action |
| `ACCOUNT_TYPE_NOT_FOUND` | validation | ให้เลือก account type ใหม่ |
| `ACCOUNT_TYPE_INACTIVE` | validation | ห้ามสร้าง account |
| `INVALID_LEVERAGE` | validation | ให้เลือก leverage ที่อยู่ใน catalog |
| `ACCOUNT_LIMIT_REACHED` | challenge rule | ห้ามสร้าง account เพิ่ม |
| `WALLET_NOT_FOUND` | validation | stop/clarify |
| `WALLET_NOT_OWNED` | permission | deny without PII leak |
| `INVALID_AMOUNT` | validation | แก้ draft ก่อน confirm |
| `INSUFFICIENT_BALANCE` | challenge rule | stop action |
| `DESTINATION_NOT_FOUND` | validation | ให้เลือก destination ใหม่ |
| `CONFIRMATION_REQUIRED` | safety | ห้าม execute |
| `CONFIRMATION_INVALIDATED` | safety | สร้าง summary ใหม่และ confirm ใหม่ |
| `OTP_INVALID` | step-up | stop; no execute |
| `OTP_REQUIRED` | step-up | request verification |
| `DUPLICATE_REQUEST` | idempotency | return/reuse existing request if resolvable |
| `INTEGRATION_TIMEOUT` | integration | `UNKNOWN_RESULT`; no blind retry |
| `SERVICE_UNAVAILABLE` | integration | error/handoff; retry only if contract-safe |
| `UNKNOWN_RESULT` | integration state | check status or handoff |
| `KNOWLEDGE_NOT_FOUND` | AI/KB | do not guess; clarify/handoff |
| `SUPPORT_HANDOFF_REQUIRED` | support | create ticket with minimal context |

## 5. HTTP Guidance

| HTTP | Challenge Interpretation |
|---:|---|
| 200 | read/action successful |
| 201 | resource created |
| 400 | malformed/validation request |
| 401 | authentication required/expired |
| 403 | permission denied |
| 404 | resource unavailable in caller scope |
| 409 | duplicate/conflict/state conflict |
| 422 | business validation failed |
| 503 | dependency unavailable without confirmed create result |
| 504 | timeout; create result may be unknown |

## 6. User-facing Rule

Agent should translate technical errors into useful user language while preserving the machine-readable error code internally.

Do not display stack trace, SQL error, internal hostname, secret, token or provider credential.
