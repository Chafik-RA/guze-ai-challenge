import { pool } from "../db/db.js";
import type { AccountTypeRow } from "../types/db.types.js";

export class AccountTypeRepository {
  // Public list — ใช้ตอนแนะนำ user ว่าจะเปิด MT5 ประเภทไหนได้บ้าง
  async findAllActive(): Promise<AccountTypeRow[]> {
    // logger.debug("repo.accountType.findAllActive");
    const result = await pool.query<AccountTypeRow>(
      `SELECT * FROM account_types WHERE status = 'active' ORDER BY account_type_id`,
    );
    return result.rows;
  }

  async findById(accountTypeId: number): Promise<AccountTypeRow | null> {
    // logger.debug("repo.accountType.findById", { accountTypeId });
    const result = await pool.query<AccountTypeRow>(
      `SELECT * FROM account_types WHERE account_type_id = $1`,
      [accountTypeId],
    );
    return result.rows[0] ?? null;
  }
}