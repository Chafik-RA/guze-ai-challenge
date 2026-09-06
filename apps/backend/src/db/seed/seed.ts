/**
 * Seed script — populates mock data from 06_MOCK_DATA.md.
 * Run manually (NOT auto-run by postgres init) so you can re-seed anytime without
 * wiping the docker volume: `npm run db:seed` from apps/backend.
 *
 * Requires: pg, bcryptjs (add to apps/backend package.json)
 */
import "../../load-env.js";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";



async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Wipe in FK-safe order for idempotent re-seeding
    await client.query(`
      TRUNCATE audit_events, support_tickets, conversation_states,
        otp_verifications, idempotency_keys, action_drafts,
        withdrawals, deposits, mt5_accounts,
        withdrawal_destinations, wallets, sessions,
        account_types, members
      RESTART IDENTITY CASCADE
    `);

    const passwordHash = await bcrypt.hash("Challenge123!", 10);

    // 1. Members
    const members = [
      { id: 1001, email: "alice@example.test", name: "Alice Demo", kyc: "approved" },
      { id: 1002, email: "bob@example.test", name: "Bob Demo", kyc: "pending" },
      { id: 1003, email: "carol@example.test", name: "Carol Demo", kyc: "approved" },
    ];
    for (const m of members) {
      await client.query(
        `INSERT INTO members (member_id, email, password_hash, display_name, kyc_status, two_factor_enabled)
         VALUES ($1, $2, $3, $4, $5, true)`,
        [m.id, m.email, passwordHash, m.name, m.kyc]
      );
    }
    await client.query(`SELECT setval('members_member_id_seq', (SELECT MAX(member_id) FROM members))`);

    // 2. Wallets
    await client.query(`
      INSERT INTO wallets (wallet_id, member_id, type, currency, balance, status) VALUES
      ('MAIN-1001', 1001, 'main', 'USD', 5000.00, 'active'),
      ('MAIN-1002', 1002, 'main', 'USD', 2000.00, 'active'),
      ('MAIN-1003', 1003, 'main', 'USD', 8000.00, 'active')
    `);

    // 3. Withdrawal destinations
    await client.query(`
      INSERT INTO withdrawal_destinations (destination_id, member_id, type, display_masked) VALUES
      ('BANK-1001-01', 1001, 'bank', 'SCB ****5678'),
      ('BANK-1002-01', 1002, 'bank', 'KBANK ****1002'),
      ('BANK-1003-01', 1003, 'bank', 'BBL ****1003')
    `);

    // 4. Account types
    await client.query(`
      INSERT INTO account_types
        (account_type_id, account_name, type, category, currency, leverages, account_limit, minimum_deposit, maximum_deposit, status)
      VALUES
      (101, 'Core USD', 'live', 'DEFAULT', 'USD', ARRAY[100,200,500], 3, 0, 9999999, 'active'),
      (102, 'Core Cent', 'live', 'STD-CENT-20', 'USC', ARRAY[50,100,200,500,777,1000,2000], 2, 0, 9999999, 'active'),
      (103, 'Legacy Demo', 'demo', 'DEFAULT', 'USD', ARRAY[100], 1, 0, 0, 'inactive')
    `);

    // 5. Existing MT5 accounts (Carol already at AT-101 limit = 3, for AC-10/PT-12)
    await client.query(`
      INSERT INTO mt5_accounts (account_id, member_id, account_type_id, leverage, status) VALUES
      ('MT5-70001', 1001, 101, 500, 'active'),
      ('MT5-71001', 1003, 101, 200, 'active'),
      ('MT5-71002', 1003, 101, 500, 'active'),
      ('MT5-71003', 1003, 101, 100, 'active')
    `);

    // 6. Deposits
    await client.query(`
      INSERT INTO deposits (deposit_id, member_id, amount, currency, method, status_code, created_at, approved_at) VALUES
      ('DEP-0001', 1001, 500.00, 'USD', 'payment_gateway', 3, now(), NULL),
      ('DEP-0002', 1001, 1000.00, 'USD', 'payment_gateway', 1, now(), now()),
      ('DEP-0003', 1002, 250.00, 'USD', 'cryptocurrency_manual', 4, now(), NULL),
      ('DEP-0004', 1003, 750.00, 'USD', 'payment_gateway', 0, now(), NULL)
    `);

    // 7. Withdrawals
    await client.query(`
      INSERT INTO withdrawals (withdrawal_id, member_id, wallet_id, destination_id, amount, currency, method, status_code, created_at, approved_at) VALUES
      ('WD-0001', 1001, 'MAIN-1001', 'BANK-1001-01', 250.00, 'USD', 'bank_transfer', 0, now(), NULL),
      ('WD-0002', 1001, 'MAIN-1001', 'BANK-1001-01', 100.00, 'USD', 'payment_gateway', 1, now(), now()),
      ('WD-0003', 1002, 'MAIN-1002', 'BANK-1002-01', 300.00, 'USD', 'bank_transfer', 3, now(), NULL),
      ('WD-0004', 1003, 'MAIN-1003', 'BANK-1003-01', 900.00, 'USD', 'bank_transfer', 2, now(), NULL)
    `);

    await client.query("COMMIT");
    console.log("✅ Seed complete: alice@example.test / bob@example.test / carol@example.test, password: Challenge123!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seed failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
