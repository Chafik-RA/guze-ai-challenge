import { pool } from "../db/db.js";
import type { IdempotencyKeyRow } from "../types/db.types.js";

export class IdempotencyRepository {
  async find(
    idempotencyKey: string,
    actionType: string,
  ): Promise<IdempotencyKeyRow | null> {
    const result = await pool.query<IdempotencyKeyRow>(
      `SELECT * FROM idempotency_keys WHERE idempotency_key = $1 AND action_type = $2`,
      [idempotencyKey, actionType],
    );
    return result.rows[0] ?? null;
  }

  async save(
    idempotencyKey: string,
    memberId: number,
    actionType: string,
    requestId: string,
    resultSnapshot: Record<string, unknown>,
  ): Promise<void> {
    await pool.query(
      `INSERT INTO idempotency_keys (idempotency_key, member_id, action_type, request_id, result_snapshot)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (idempotency_key, action_type) DO NOTHING`,
      [idempotencyKey, memberId, actionType, requestId, JSON.stringify(resultSnapshot)],
    );
  }
}
