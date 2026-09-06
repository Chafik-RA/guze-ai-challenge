import { AccountTypeRepository } from "../repositories/account-type.repository.js";
import type { AccountTypeRow } from "../types/db.types.js";
import type { AccountType } from "@ai-challenge/shared/account-type.types";

const accountTypeRepository = new AccountTypeRepository();

export class AccountTypeService {
  async listActive(): Promise<AccountType[]> {
    const rows = await accountTypeRepository.findAllActive();
    return rows.map(this.mapToResponse);
  }

  mapToResponse(row: AccountTypeRow): AccountType {
    return {
      account_type_id: row.account_type_id,
      account_name: row.account_name,
      type: row.type as "live" | "demo",
      category: row.category,
      currency: row.currency,
      leverages: row.leverages,
      account_limit: row.account_limit,
      minimum_deposit: parseFloat(row.minimum_deposit),
      maximum_deposit: parseFloat(row.maximum_deposit),
      status: row.status as "active" | "inactive",
    };
  }
}