import { pool } from "../db/db.js";
import type { ActionDraftRow } from "../types/db.types.js";

export class ActionDraftRepository {
  async createDraft(
    actionId: string,
    memberId: number,
    intent: string,
    payloadSnapshot: Record<string, unknown>,
  ): Promise<ActionDraftRow> {
    const result = await pool.query<ActionDraftRow>(
      `INSERT INTO action_drafts (action_id, member_id, intent, payload_snapshot, status)
       VALUES ($1, $2, $3, $4, 'draft')
       RETURNING *`,
      [actionId, memberId, intent, JSON.stringify(payloadSnapshot)],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Failed to create action draft");
    return row;
  }

  async findById(actionId: string): Promise<ActionDraftRow | null> {
    const result = await pool.query<ActionDraftRow>(
      `SELECT * FROM action_drafts WHERE action_id = $1`,
      [actionId],
    );
    return result.rows[0] ?? null;
  }

  async confirmDraft(actionId: string): Promise<ActionDraftRow | null> {
    const result = await pool.query<ActionDraftRow>(
      `UPDATE action_drafts
       SET status = 'confirmed', confirmed_at = now()
       WHERE action_id = $1
       RETURNING *`,
      [actionId],
    );
    return result.rows[0] ?? null;
  }

  async invalidateDraft(actionId: string): Promise<void> {
    await pool.query(
      `UPDATE action_drafts
       SET status = 'invalidated'
       WHERE action_id = $1`,
      [actionId],
    );
  }

  async markExecuted(actionId: string): Promise<void> {
    await pool.query(
      `UPDATE action_drafts
       SET status = 'executed'
       WHERE action_id = $1`,
      [actionId],
    );
  }

  async updatePayload(
    actionId: string,
    payloadSnapshot: Record<string, unknown>,
  ): Promise<ActionDraftRow | null> {
    const result = await pool.query<ActionDraftRow>(
      `UPDATE action_drafts
       SET payload_snapshot = $2, status = 'draft', confirmed_at = NULL
       WHERE action_id = $1
       RETURNING *`,
      [actionId, JSON.stringify(payloadSnapshot)],
    );
    return result.rows[0] ?? null;
  }
}
