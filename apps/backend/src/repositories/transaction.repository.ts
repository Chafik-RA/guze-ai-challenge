import { pool } from "../db/db.js";
import type {
  DepositRow,
  WithdrawalRow,
  WalletRow,
  WithdrawalDestinationRow,
} from "../types/db.types.js";

export class TransactionRepository {
  // Find deposits by member_id
  async findDepositsByMember(memberId: number): Promise<DepositRow[]> {
    const result = await pool.query<DepositRow>(
      `SELECT * FROM deposits WHERE member_id = $1 ORDER BY created_at DESC`,
      [memberId],
    );
    return result.rows;
  }

  // Find deposits by deposit_id
  async findDepositById(depositId: string): Promise<DepositRow | null> {
    const result = await pool.query<DepositRow>(
      `SELECT * FROM deposits WHERE deposit_id = $1`,
      [depositId],
    );
    return result.rows[0] ?? null;
  }

  // Find Withdrawals by member_id
  async findWithdrawalsByMember(memberId: number): Promise<WithdrawalRow[]> {
    const result = await pool.query<WithdrawalRow>(
      `SELECT w.*, wd.display_masked AS destination_masked
       FROM withdrawals w
       LEFT JOIN withdrawal_destinations wd ON wd.destination_id = w.destination_id
       WHERE w.member_id = $1
       ORDER BY w.created_at DESC`,
      [memberId],
    );
    return result.rows;
  }

  // Find Withdrawals by withdrawal_id
  async findWithdrawalById(
    withdrawalId: string,
  ): Promise<WithdrawalRow | null> {
    const result = await pool.query<WithdrawalRow>(
      `SELECT w.*, wd.display_masked AS destination_masked
       FROM withdrawals w
       LEFT JOIN withdrawal_destinations wd ON wd.destination_id = w.destination_id
       WHERE w.withdrawal_id = $1`,
      [withdrawalId],
    );
    return result.rows[0] ?? null;
  }

  // Find Wallet by ID
  async findWalletById(walletId: string): Promise<WalletRow | null> {
    const result = await pool.query<WalletRow>(
      `SELECT * FROM wallets WHERE wallet_id = $1`,
      [walletId],
    );
    return result.rows[0] ?? null;
  }

  // Find Destination by ID
  async findDestinationById(
    destinationId: string,
  ): Promise<WithdrawalDestinationRow | null> {
    const result = await pool.query<WithdrawalDestinationRow>(
      `SELECT * FROM withdrawal_destinations WHERE destination_id = $1`,
      [destinationId],
    );
    return result.rows[0] ?? null;
  }

  // Create Withdrawal
  async createWithdrawal(
    withdrawalId: string,
    memberId: number,
    walletId: string,
    destinationId: string,
    amount: number,
    currency: string,
  ): Promise<WithdrawalRow> {
    await pool.query(
      `INSERT INTO withdrawals (withdrawal_id, member_id, wallet_id, destination_id, amount, currency, method, status_code)
       VALUES ($1, $2, $3, $4, $5, $6, 'bank_transfer', 0)`,
      [withdrawalId, memberId, walletId, destinationId, amount, currency],
    );

    const row = await this.findWithdrawalById(withdrawalId);
    if (!row) throw new Error("Failed to create withdrawal record");
    return row;
  }

  // Deduct Wallet Balance
  async deductWalletBalance(
    walletId: string,
    amount: number,
  ): Promise<void> {
    await pool.query(
      `UPDATE wallets
       SET balance = balance - $2
       WHERE wallet_id = $1 AND balance >= $2`,
      [walletId, amount],
    );
  }
}
