import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";
import { pool } from "../src/db/db.js";

describe("Week 1 Backend Test Suite (PT-01 to PT-07)", () => {
  let aliceToken = "";
  let bobToken = "";
  let carolToken = "";

  // Health checks
  test("Health Check: /health returns 200 and shared import check", async () => {
    const res = await request(app).get("/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "ok");
    assert.equal(res.body.shared_import_check, "AUTH_REQUIRED");
  });

  test("Health Check: /health/db returns 200 and connects to Postgres", async () => {
    const res = await request(app).get("/health/db");
    assert.equal(res.status, 200);
    assert.equal(res.body.status, "ok");
    assert.ok(res.body.db_time);
  });

  // PT-01: Public FAQ / Account Types (No auth required)
  test("PT-01: Public FAQ - GET /challenge/v1/trading/account-types without login", async () => {
    const res = await request(app).get("/challenge/v1/trading/account-types");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.items), "Response should have items array");

    const accountTypes = res.body.items;
    assert.equal(accountTypes.length, 2, "Should return 2 active account types (AT-101 and AT-102)");

    const at101 = accountTypes.find((a: { account_type_id: number }) => a.account_type_id === 101);
    assert.ok(at101, "AT-101 (Core USD) must be present");
    assert.equal(at101.account_name, "Core USD");
    assert.equal(at101.currency, "USD");
    assert.equal(at101.status, "active");
    assert.deepEqual(at101.leverages, [100, 200, 500]);
    assert.equal(at101.account_limit, 3);

    // Inactive account type (AT-103) should not be returned in listActive
    const at103 = accountTypes.find((a: { account_type_id: number }) => a.account_type_id === 103);
    assert.equal(at103, undefined, "Inactive AT-103 should not be in active list");
  });

  // PT-02: Protected read without auth returns 401 AUTH_REQUIRED
  test("PT-02: Protected read without auth returns 401 AUTH_REQUIRED", async () => {
    const endpoints = [
      "/challenge/v1/trading/accounts",
      "/challenge/v1/transactions/deposits",
      "/challenge/v1/transactions/withdrawals",
      "/challenge/v1/auth/me",
    ];

    for (const ep of endpoints) {
      const res = await request(app).get(ep);
      assert.equal(res.status, 401, `Endpoint ${ep} must return 401`);
      assert.equal(res.body.error?.code, "AUTH_REQUIRED");
    }

    // Invalid bearer token
    const invalidTokenRes = await request(app)
      .get("/challenge/v1/trading/accounts")
      .set("Authorization", "Bearer invalid-or-fake-token-12345");
    assert.equal(invalidTokenRes.status, 401);
    assert.equal(invalidTokenRes.body.error?.code, "AUTH_REQUIRED");
  });

  // PT-03: Login happy path
  test("PT-03: Login happy path - Alice login creates session for member 1001", async () => {
    const res = await request(app)
      .post("/challenge/v1/auth/login")
      .send({
        email: "alice@example.test",
        password: "Challenge123!",
      });

    assert.equal(res.status, 200);
    assert.ok(res.body.access_token, "Must return access_token");
    assert.ok(typeof res.body.expires_in === "number", "Must return expires_in seconds");
    assert.equal(res.body.member?.member_id, 1001);
    assert.equal(res.body.member?.display_name, "Alice Demo");

    aliceToken = res.body.access_token;

    // Verify /challenge/v1/auth/me for Alice
    const meRes = await request(app)
      .get("/challenge/v1/auth/me")
      .set("Authorization", `Bearer ${aliceToken}`);

    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.member_id, 1001);
    assert.equal(meRes.body.display_name, "Alice Demo");
    assert.equal(meRes.body.kyc_status, "approved");
    assert.equal(meRes.body.two_factor_enabled, true);
  });

  test("PT-03 (negative): Login with invalid credentials returns 401 AUTH_INVALID_CREDENTIALS", async () => {
    const res = await request(app)
      .post("/challenge/v1/auth/login")
      .send({
        email: "alice@example.test",
        password: "WrongPassword999!",
      });

    assert.equal(res.status, 401);
    assert.equal(res.body.error?.code, "AUTH_INVALID_CREDENTIALS");
  });

  // Prepare Bob and Carol tokens for multi-user tests
  test("Setup: Login as Bob and Carol", async () => {
    const bobRes = await request(app)
      .post("/challenge/v1/auth/login")
      .send({ email: "bob@example.test", password: "Challenge123!" });
    assert.equal(bobRes.status, 200);
    assert.equal(bobRes.body.member?.member_id, 1002);
    bobToken = bobRes.body.access_token;

    const carolRes = await request(app)
      .post("/challenge/v1/auth/login")
      .send({ email: "carol@example.test", password: "Challenge123!" });
    assert.equal(carolRes.status, 200);
    assert.equal(carolRes.body.member?.member_id, 1003);
    carolToken = carolRes.body.access_token;
  });

  // PT-04: Deposit status - Alice asks deposit list
  test("PT-04: Deposit status - Alice asks deposit list, returns only Alice records", async () => {
    const res = await request(app)
      .get("/challenge/v1/transactions/deposits")
      .set("Authorization", `Bearer ${aliceToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.items), "Items array must exist");
    assert.ok(res.body.items.length >= 2, "Alice should have at least 2 deposits");

    const dep1 = res.body.items.find((d: { deposit_id: string }) => d.deposit_id === "DEP-0001");
    assert.ok(dep1, "DEP-0001 must exist");
    assert.equal(dep1.amount, 500);
    assert.equal(dep1.currency, "USD");
    assert.equal(dep1.status_code, 3);
    assert.equal(dep1.status, "processing");
    assert.equal(dep1.payment_method, "payment_gateway");

    const dep2 = res.body.items.find((d: { deposit_id: string }) => d.deposit_id === "DEP-0002");
    assert.ok(dep2, "DEP-0002 must exist");
    assert.equal(dep2.amount, 1000);
    assert.equal(dep2.currency, "USD");
    assert.equal(dep2.status_code, 1);
    assert.equal(dep2.status, "approve");

    // Alice must NOT see Carol's DEP-0004 or Bob's DEP-0003
    const dep3 = res.body.items.find((d: { deposit_id: string }) => d.deposit_id === "DEP-0003");
    const dep4 = res.body.items.find((d: { deposit_id: string }) => d.deposit_id === "DEP-0004");
    assert.equal(dep3, undefined, "Bob's deposit DEP-0003 must not appear in Alice's list");
    assert.equal(dep4, undefined, "Carol's deposit DEP-0004 must not appear in Alice's list");
  });

  // PT-05: Cross-user deposit - Alice asks DEP-0004 (Carol's)
  test("PT-05: Cross-user deposit - Alice asks DEP-0004 returns 404 RESOURCE_NOT_FOUND", async () => {
    const res = await request(app)
      .get("/challenge/v1/transactions/deposits/DEP-0004")
      .set("Authorization", `Bearer ${aliceToken}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.error?.code, "RESOURCE_NOT_FOUND");
    assert.equal(res.body.error?.message, "Resource not found");

    // Conversely, Carol can access DEP-0004
    const carolRes = await request(app)
      .get("/challenge/v1/transactions/deposits/DEP-0004")
      .set("Authorization", `Bearer ${carolToken}`);

    assert.equal(carolRes.status, 200);
    assert.equal(carolRes.body.deposit_id, "DEP-0004");
    assert.equal(carolRes.body.amount, 750);
    assert.equal(carolRes.body.status_code, 0);
    assert.equal(carolRes.body.status, "pending");
  });

  // PT-06: Withdrawal status - Alice asks WD-0001
  test("PT-06: Withdrawal status - Alice asks WD-0001 returns pending + masked destination", async () => {
    const res = await request(app)
      .get("/challenge/v1/transactions/withdrawals/WD-0001")
      .set("Authorization", `Bearer ${aliceToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.withdrawal_id, "WD-0001");
    assert.equal(res.body.wallet_id, "MAIN-1001");
    assert.equal(res.body.amount, 250);
    assert.equal(res.body.currency, "USD");
    assert.equal(res.body.payment_method, "bank_transfer");
    assert.equal(res.body.destination_masked, "SCB ****5678");
    assert.equal(res.body.status_code, 0);
    assert.equal(res.body.status, "pending");

    // Cross-user withdrawal check: Alice asks WD-0004 (Carol's) -> 404 RESOURCE_NOT_FOUND
    const crossRes = await request(app)
      .get("/challenge/v1/transactions/withdrawals/WD-0004")
      .set("Authorization", `Bearer ${aliceToken}`);
    assert.equal(crossRes.status, 404);
    assert.equal(crossRes.body.error?.code, "RESOURCE_NOT_FOUND");
  });

  // PT-07: MT5 Account List - Alice asks my MT5 accounts
  test("PT-07: MT5 List - Alice asks my MT5 accounts, returns only Alice accounts", async () => {
    const res = await request(app)
      .get("/challenge/v1/trading/accounts")
      .set("Authorization", `Bearer ${aliceToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.items), "Items array must exist");
    assert.ok(res.body.items.length >= 1, "Alice has at least 1 MT5 account");

    const acc = res.body.items.find((a: { account_id: string }) => a.account_id === "MT5-70001");
    assert.ok(acc, "MT5-70001 must exist");
    assert.equal(acc.account_type_id, 101);
    assert.equal(acc.account_name, "Core USD");
    assert.equal(acc.currency, "USD");
    assert.equal(acc.leverage, 500);
    assert.equal(acc.status, "active");

    // Carol has 3 MT5 accounts
    const carolRes = await request(app)
      .get("/challenge/v1/trading/accounts")
      .set("Authorization", `Bearer ${carolToken}`);

    assert.equal(carolRes.status, 200);
    assert.ok(carolRes.body.items.length >= 3);
  });
});
