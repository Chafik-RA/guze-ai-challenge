import { IdempotencyRepository } from "../repositories/idempotency.repository.js";

const idempotencyRepository = new IdempotencyRepository();

export class IdempotencyService {
  async getReplayedResult<T>(
    idempotencyKey: string | undefined,
    actionType: string,
    memberId: number,
  ): Promise<(T & { replayed?: boolean }) | null> {
    if (!idempotencyKey) return null;

    const record = await idempotencyRepository.find(idempotencyKey, actionType);
    if (!record) return null;

    // Return cached snapshot with replayed marker
    const snapshot = record.result_snapshot as T;
    return {
      ...snapshot,
      replayed: true,
    };
  }

  async saveResult(
    idempotencyKey: string | undefined,
    memberId: number,
    actionType: string,
    requestId: string,
    result: Record<string, unknown>,
  ): Promise<void> {
    if (!idempotencyKey) return;
    await idempotencyRepository.save(
      idempotencyKey,
      memberId,
      actionType,
      requestId,
      result,
    );
  }
}
