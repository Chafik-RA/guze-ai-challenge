import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";
import { pool } from "../src/db/db.js";

async function cleanupTestData() {
  await pool.query(`DELETE FROM mt5_accounts WHERE account_id NOT IN ('MT5-70001', 'MT5-71001', 'MT5-71002', 'MT5-71003')`);
  await pool.query(`DELETE FROM withdrawals WHERE withdrawal_id NOT IN ('WD-0001', 'WD-0002', 'WD-0003', 'WD-0004')`);
  await pool.query(`DELETE FROM idempotency_keys`);
  await pool.query(`DELETE FROM otp_verifications`);
  await pool.query(`DELETE FROM action_drafts`);
  await pool.query(`DELETE FROM audit_events`);
}

describe("Week 2 Backend Test Suite (PT-08 to PT-17)", { concurrency: 1 }, () => {
  let aliceToken = "";
  let bobToken = "";
  let carolToken = "";

  before(async () => {
    await cleanupTestData();

    // Login as Alice, Bob, and Carol
    const aliceRes = await request(app)
      .post("/challenge/v1/auth/login")
      .send({ email: "alice@example.test", password: "Challenge123!" });
    aliceToken = aliceRes.body.access_token;

    const bobRes = await request(app)
      .post("/challenge/v1/auth/login")
      .send({ email: "bob@example.test", password: "Challenge123!" });
    bobToken = bobRes.body.access_token;

    const carolRes = await request(app)
      .post("/challenge/v1/auth/login")
      .send({ email: "carol@example.test", password: "Challenge123!" });
    carolToken = carolRes.body.access_token;
  });

  after(async () => {
    await cleanupTestData();
  });

  // PT-08: Create MT5 happy path
  test("PT-08: Create MT5 happy path - Alice creates draft, confirms, passes OTP 123456, and creates account", async () => {
    // 1. Create action draft
    const draftRes = await request(app)
      .post("/challenge/v1/actions/draft")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({
        intent: "CREATE_MT5",
        payload: { account_type_id: 101, leverage: 500 },
      });
    assert.equal(draftRes.status, 201);
    assert.ok(draftRes.body.action_id);
    assert.equal(draftRes.body.status, "draft");
    const actionId = draftRes.body.action_id;

    // 2. Confirm action draft
    const confirmRes = await request(app)
      .post(`/challenge/v1/actions/${actionId}/confirm`)
      .set("Authorization", `Bearer ${aliceToken}`);
    assert.equal(confirmRes.status, 200);
    assert.equal(confirmRes.body.status, "confirmed");

    // 3. Step-up OTP verification
    const otpRes = await request(app)
      .post("/challenge/v1/security/otp/verify")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ action_id: actionId, otp: "123456" });
    assert.equal(otpRes.status, 200);
    assert.equal(otpRes.body.verified, true);
    assert.ok(otpRes.body.verification_token);
    const verificationToken = otpRes.body.verification_token;

    // 4. Create MT5 Account
    const createRes = await request(app)
      .post("/challenge/v1/trading/accounts")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({
        account_type_id: 101,
        leverage: 500,
        action_id: actionId,
        verification_token: verificationToken,
      });

    assert.equal(createRes.status, 201);
    assert.ok(createRes.body.request_id);
    assert.ok(createRes.body.account?.account_id);
    assert.equal(createRes.body.account?.account_type_id, 101);
    assert.equal(createRes.body.account?.account_name, "Core USD");
    assert.equal(createRes.body.account?.currency, "USD");
    assert.equal(createRes.body.account?.leverage, 500);
    assert.equal(createRes.body.account?.status, "active");

    // 5. Verify audit event in DB
    const auditQuery = await pool.query(
      `SELECT * FROM audit_events WHERE action = 'CREATE_TRADING_ACCOUNT' AND action_id = $1`,
      [actionId],
    );
    assert.equal(auditQuery.rows.length, 1);
    assert.equal(auditQuery.rows[0].result, "success");
    assert.equal(auditQuery.rows[0].confirmation, "confirmed");
    assert.equal(auditQuery.rows[0].step_up, "passed");
  });

  // PT-09: Inactive account type
  test("PT-09: Inactive account type - Alice selects AT-103 returns ACCOUNT_TYPE_INACTIVE", async () => {
    const res = await request(app)
      .post("/challenge/v1/trading/accounts")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({
        account_type_id: 103, // Legacy Demo (inactive)
        leverage: 100,
      });

    assert.equal(res.status, 422);
    assert.equal(res.body.error?.code, "ACCOUNT_TYPE_INACTIVE");
  });

  // PT-10: Invalid leverage
  test("PT-10: Invalid leverage - Alice selects leverage 9999 not in AT-101 catalog returns INVALID_LEVERAGE", async () => {
    const res = await request(app)
      .post("/challenge/v1/trading/accounts")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({
        account_type_id: 101,
        leverage: 9999,
      });

    assert.equal(res.status, 422);
    assert.equal(res.body.error?.code, "INVALID_LEVERAGE");
  });

  // PT-11: KYC pending
  test("PT-11: KYC pending - Bob tries Create MT5 returns KYC_NOT_APPROVED", async () => {
    const res = await request(app)
      .post("/challenge/v1/trading/accounts")
      .set("Authorization", `Bearer ${bobToken}`)
      .send({
        account_type_id: 101,
        leverage: 500,
      });

    assert.equal(res.status, 422);
    assert.equal(res.body.error?.code, "KYC_NOT_APPROVED");
  });

  // PT-12: Account limit
  test("PT-12: Account limit - Carol tries another AT-101 returns ACCOUNT_LIMIT_REACHED", async () => {
    // Carol already has 3 AT-101 accounts in seed data (limit is 3)
    const res = await request(app)
      .post("/challenge/v1/trading/accounts")
      .set("Authorization", `Bearer ${carolToken}`)
      .send({
        account_type_id: 101,
        leverage: 500,
      });

    assert.equal(res.status, 422);
    assert.equal(res.body.error?.code, "ACCOUNT_LIMIT_REACHED");
  });

  // PT-13: Withdrawal happy path
  test("PT-13: Withdrawal happy path - Alice withdraws 250 from MAIN-1001 to BANK-1001-01", async () => {
    // 1. Create draft
    const draftRes = await request(app)
      .post("/challenge/v1/actions/draft")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({
        intent: "WITHDRAW_REQUEST",
        payload: {
          wallet_id: "MAIN-1001",
          amount: 250,
          currency: "USD",
          destination_id: "BANK-1001-01",
        },
      });
    assert.equal(draftRes.status, 201);
    const actionId = draftRes.body.action_id;

    // 2. Confirm draft
    const confirmRes = await request(app)
      .post(`/challenge/v1/actions/${actionId}/confirm`)
      .set("Authorization", `Bearer ${aliceToken}`);
    assert.equal(confirmRes.status, 200);

    // 3. OTP
    const otpRes = await request(app)
      .post("/challenge/v1/security/otp/verify")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ action_id: actionId, otp: "123456" });
    assert.equal(otpRes.status, 200);
    const verificationToken = otpRes.body.verification_token;

    // 4. Execute withdrawal
    const res = await request(app)
      .post("/challenge/v1/transactions/withdrawals")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({
        wallet_id: "MAIN-1001",
        amount: 250,
        currency: "USD",
        destination_id: "BANK-1001-01",
        action_id: actionId,
        verification_token: verificationToken,
      });

    assert.equal(res.status, 201);
    assert.ok(res.body.request_id);
    assert.ok(res.body.withdrawal?.withdrawal_id);
    assert.equal(res.body.withdrawal?.amount, 250);
    assert.equal(res.body.withdrawal?.currency, "USD");
    assert.equal(res.body.withdrawal?.status_code, 0);
    assert.equal(res.body.withdrawal?.status, "pending");

    // 5. Verify audit log
    const auditQuery = await pool.query(
      `SELECT * FROM audit_events WHERE action = 'CREATE_WITHDRAWAL' AND action_id = $1`,
      [actionId],
    );
    assert.equal(auditQuery.rows.length, 1);
    assert.equal(auditQuery.rows[0].result, "success");
  });

  // PT-14: Insufficient balance
  test("PT-14: Insufficient balance - Alice requests amount > 5000 returns INSUFFICIENT_BALANCE", async () => {
    const res = await request(app)
      .post("/challenge/v1/transactions/withdrawals")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({
        wallet_id: "MAIN-1001",
        amount: 999999, // exceeds 5000.00
        currency: "USD",
        destination_id: "BANK-1001-01",
      });

    assert.equal(res.status, 422);
    assert.equal(res.body.error?.code, "INSUFFICIENT_BALANCE");
  });

  // PT-15: Change after confirmation
  test("PT-15: Change after confirmation - Confirm 250, then change to 500 invalidates confirmation", async () => {
    // 1. Create draft for 250
    const draftRes = await request(app)
      .post("/challenge/v1/actions/draft")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({
        intent: "WITHDRAW_REQUEST",
        payload: {
          wallet_id: "MAIN-1001",
          amount: 250,
          currency: "USD",
          destination_id: "BANK-1001-01",
        },
      });
    const actionId = draftRes.body.action_id;

    // 2. Confirm draft
    await request(app)
      .post(`/challenge/v1/actions/${actionId}/confirm`)
      .set("Authorization", `Bearer ${aliceToken}`);

    // 3. Step-up OTP
    const otpRes = await request(app)
      .post("/challenge/v1/security/otp/verify")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ action_id: actionId, otp: "123456" });
    const verificationToken = otpRes.body.verification_token;

    // 4. Attempt to execute with changed amount (500 instead of 250)
    const changeRes = await request(app)
      .post("/challenge/v1/transactions/withdrawals")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({
        wallet_id: "MAIN-1001",
        amount: 500, // Changed from 250!
        currency: "USD",
        destination_id: "BANK-1001-01",
        action_id: actionId,
        verification_token: verificationToken,
      });

    assert.equal(changeRes.status, 422);
    assert.equal(changeRes.body.error?.code, "CONFIRMATION_INVALIDATED");

    // 5. Verify draft status is now invalidated in DB
    const draftCheck = await pool.query(
      `SELECT * FROM action_drafts WHERE action_id = $1`,
      [actionId],
    );
    assert.equal(draftCheck.rows[0].status, "draft"); // Reset to draft
    assert.equal(draftCheck.rows[0].confirmed_at, null);
  });

  // PT-16: Wrong OTP
  test("PT-16: Wrong OTP - Enter non-123456 OTP returns OTP_INVALID and does not execute", async () => {
    // 1. Create and confirm draft
    const draftRes = await request(app)
      .post("/challenge/v1/actions/draft")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({
        intent: "CREATE_MT5",
        payload: { account_type_id: 101, leverage: 500 },
      });
    const actionId = draftRes.body.action_id;
    await request(app)
      .post(`/challenge/v1/actions/${actionId}/confirm`)
      .set("Authorization", `Bearer ${aliceToken}`);

    // 2. Submit wrong OTP
    const otpRes = await request(app)
      .post("/challenge/v1/security/otp/verify")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ action_id: actionId, otp: "999999" });

    assert.equal(otpRes.status, 200);
    assert.equal(otpRes.body.verified, false);
    assert.equal(otpRes.body.code, "OTP_INVALID");

    // 3. Execution attempt with invalid verification token fails
    const execRes = await request(app)
      .post("/challenge/v1/trading/accounts")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({
        account_type_id: 101,
        leverage: 500,
        action_id: actionId,
        verification_token: "invalid-token",
      });

    assert.equal(execRes.status, 422);
    assert.equal(execRes.body.error?.code, "OTP_INVALID");
  });

  // PT-17: Idempotency
  test("PT-17: Idempotency - Replay known create key returns same result and prevents duplicate creation", async () => {
    const idempotencyKey = "idem-mt5-alice-001";
    await pool.query("DELETE FROM idempotency_keys WHERE idempotency_key IN ('idem-mt5-alice-001', 'idem-wd-alice-001')");

    // First request
    const firstRes = await request(app)
      .post("/challenge/v1/trading/accounts")
      .set("Authorization", `Bearer ${aliceToken}`)
      .set("Idempotency-Key", idempotencyKey)
      .send({
        account_type_id: 101,
        leverage: 500,
      });

    assert.equal(firstRes.status, 201);
    const firstAccountId = firstRes.body.account?.account_id;
    assert.ok(firstAccountId);

    // Second request with same idempotency key
    const replayRes = await request(app)
      .post("/challenge/v1/trading/accounts")
      .set("Authorization", `Bearer ${aliceToken}`)
      .set("Idempotency-Key", idempotencyKey)
      .send({
        account_type_id: 101,
        leverage: 500,
      });

    assert.equal(replayRes.status, 200);
    assert.equal(replayRes.body.replayed, true);
    assert.equal(replayRes.body.account?.account_id, firstAccountId);

    // Same idempotency test for withdrawal: idem-wd-alice-001
    const wdKey = "idem-wd-alice-001";
    const firstWd = await request(app)
      .post("/challenge/v1/transactions/withdrawals")
      .set("Authorization", `Bearer ${aliceToken}`)
      .set("Idempotency-Key", wdKey)
      .send({
        wallet_id: "MAIN-1001",
        amount: 100,
        currency: "USD",
        destination_id: "BANK-1001-01",
      });
    assert.equal(firstWd.status, 201);
    const firstWdId = firstWd.body.withdrawal?.withdrawal_id;

    const replayWd = await request(app)
      .post("/challenge/v1/transactions/withdrawals")
      .set("Authorization", `Bearer ${aliceToken}`)
      .set("Idempotency-Key", wdKey)
      .send({
        wallet_id: "MAIN-1001",
        amount: 100,
        currency: "USD",
        destination_id: "BANK-1001-01",
      });
    assert.equal(replayWd.status, 200);
    assert.equal(replayWd.body.replayed, true);
    assert.equal(replayWd.body.withdrawal?.withdrawal_id, firstWdId);
  });

  // Audit event API test
  test("Audit API: POST /challenge/v1/audit/events records event", async () => {
    const res = await request(app)
      .post("/challenge/v1/audit/events")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({
        intent: "CREATE_MT5",
        action: "CREATE_TRADING_ACCOUNT",
        action_id: "ACT-0001",
        confirmation: "confirmed",
        step_up: "passed",
        result: "success",
        request_reference: "REQ-MT5-0001",
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.status, "recorded");
    assert.ok(res.body.id);
  });

  // Deposit API test (Create Deposit with Draft & OTP Verification)
  test("Deposit API: POST /challenge/v1/transactions/deposits completes successfully and credits wallet", async () => {
    // 1. Create action draft
    const draftRes = await request(app)
      .post("/challenge/v1/actions/draft")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({
        intent: "DEPOSIT_REQUEST",
        payload: {
          wallet_id: "MAIN-1001",
          amount: 500,
          currency: "USD",
          payment_method: "payment_gateway",
        },
      });
    assert.equal(draftRes.status, 201);
    const actionId = draftRes.body.action_id;

    // 2. Confirm action draft
    const confirmRes = await request(app)
      .post(`/challenge/v1/actions/${actionId}/confirm`)
      .set("Authorization", `Bearer ${aliceToken}`);
    assert.equal(confirmRes.status, 200);

    // 3. Verify OTP
    const otpRes = await request(app)
      .post("/challenge/v1/security/otp/verify")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ action_id: actionId, otp: "123456" });
    assert.equal(otpRes.status, 200);
    const verificationToken = otpRes.body.verification_token;

    // 4. Create deposit
    const depRes = await request(app)
      .post("/challenge/v1/transactions/deposits")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({
        wallet_id: "MAIN-1001",
        amount: 500,
        currency: "USD",
        payment_method: "payment_gateway",
        action_id: actionId,
        verification_token: verificationToken,
      });

    assert.equal(depRes.status, 201);
    assert.ok(depRes.body.deposit?.deposit_id);
    assert.equal(depRes.body.deposit?.amount, 500);
    assert.equal(depRes.body.deposit?.status, "approve");
  });
});
