import { pool } from "../db/db.js";
import type { OtpVerificationRow } from "../types/db.types.js";

export class OtpRepository {
  async saveVerification(
    actionId: string,
    verified: boolean,
    verificationToken: string | null,
    expiresAt: Date | null,
  ): Promise<OtpVerificationRow> {
    const result = await pool.query<OtpVerificationRow>(
      `INSERT INTO otp_verifications (action_id, verified, verification_token, expires_at, attempted_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (action_id) DO UPDATE
       SET verified = EXCLUDED.verified,
           verification_token = EXCLUDED.verification_token,
           expires_at = EXCLUDED.expires_at,
           attempted_at = EXCLUDED.attempted_at
       RETURNING *`,
      [actionId, verified, verificationToken, expiresAt],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Failed to save OTP verification");
    return row;
  }

  async findByActionId(actionId: string): Promise<OtpVerificationRow | null> {
    const result = await pool.query<OtpVerificationRow>(
      `SELECT * FROM otp_verifications WHERE action_id = $1`,
      [actionId],
    );
    return result.rows[0] ?? null;
  }

  async invalidate(actionId: string): Promise<void> {
    await pool.query(
      `DELETE FROM otp_verifications WHERE action_id = $1`,
      [actionId],
    );
  }
}
