import { pool } from "../db/db.js";
import type { MemberRow, SessionRow } from "../types/db.types.js";

export class AuthRepository {
  // Find members by email
  async findByEmail(email: string): Promise<MemberRow | null> {
    const result = await pool.query<MemberRow>(
      "SELECT * FROM members WHERE email = $1",
      [email],
    );
    return result.rows[0] ?? null;
  }

  // Find members by member_id
  async findById(memberId: number): Promise<MemberRow | null> {
    const result = await pool.query<MemberRow>(
      "SELECT * FROM members WHERE member_id = $1",
      [memberId],
    );
    return result.rows[0] ?? null;
  }

  // Create member
  async createMember(
    email: string,
    passwordHash: string,
    displayName: string,
  ): Promise<MemberRow> {
    const result = await pool.query<MemberRow>(
      `INSERT INTO members (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [email, passwordHash, displayName],
    );
    const member = result.rows[0];
    if (!member) {
      throw new Error("Failed to create member: no row returned from INSERT");
    }
    return member;
  }

  // Create session
  async createSession(
    token: string,
    memberId: number,
    expiresAt: Date,
  ): Promise<void> {
    await pool.query(
      `INSERT INTO sessions (token, member_id, expires_at) VALUES ($1, $2, $3)`,
      [token, memberId, expiresAt],
    );
  }

  // Find valid session
  async findValidSession(token: string): Promise<SessionRow | null> {
    const result = await pool.query<SessionRow>(
      `SELECT * FROM sessions WHERE token = $1 AND expires_at > now()`,
      [token],
    );
    return result.rows[0] ?? null;
  }

  // Delete session
  async deleteSession(token: string): Promise<void> {
    await pool.query("DELETE FROM sessions WHERE token = $1", [token]);
  }
}
