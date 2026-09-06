import { pool } from "../db/db.js";
import type { MT5AccountRow } from "../types/db.types.js";

export class Mt5AccountRepository {
  async findByMember(memberId: number): Promise<MT5AccountRow[]> {
    // logger.debug("repo.mt5.findByMember", { memberId });
    const result = await pool.query<MT5AccountRow>(
      `SELECT m.account_id, m.member_id, m.account_type_id, m.leverage, m.status, m.created_at,
              at.account_name, at.currency
       FROM mt5_accounts m
       JOIN account_types at ON at.account_type_id = m.account_type_id
       WHERE m.member_id = $1
       ORDER BY m.created_at DESC`,
      [memberId],
    );
    return result.rows;
  }

  async findById(accountId: string): Promise<MT5AccountRow | null> {
    // logger.debug("repo.mt5.findById", { accountId });
    const result = await pool.query<MT5AccountRow>(
      `SELECT m.account_id, m.member_id, m.account_type_id, m.leverage, m.status, m.created_at,
              at.account_name, at.currency
       FROM mt5_accounts m
       JOIN account_types at ON at.account_type_id = m.account_type_id
       WHERE m.account_id = $1`,
      [accountId],
    );
    return result.rows[0] ?? null;
  }

  async countByMemberAndAccountType(
    memberId: number,
    accountTypeId: number,
  ): Promise<number> {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM mt5_accounts
       WHERE member_id = $1 AND account_type_id = $2`,
      [memberId, accountTypeId],
    );
    return parseInt(result.rows[0]?.count ?? "0", 10);
  }

  async createAccount(
    accountId: string,
    memberId: number,
    accountTypeId: number,
    leverage: number,
  ): Promise<MT5AccountRow> {
    await pool.query(
      `INSERT INTO mt5_accounts (account_id, member_id, account_type_id, leverage, status)
       VALUES ($1, $2, $3, $4, 'active')`,
      [accountId, memberId, accountTypeId, leverage],
    );

    const created = await this.findById(accountId);
    if (!created) throw new Error("Failed to create MT5 account");
    return created;
  }
}
