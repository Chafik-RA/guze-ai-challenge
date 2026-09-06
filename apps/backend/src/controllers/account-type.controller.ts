import type { Request, Response, NextFunction } from "express";
import { AccountTypeService } from "../services/account-type.service.js";
import type { AccountTypeRow } from "../types/db.types.js";

const accountTypeService = new AccountTypeService();

export class AccountTypeController {
  public listActive = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const items = await accountTypeService.listActive();
      res.status(200).json({ items });
    } catch (err) {
      next(err);
    }
  };

  public getById = (
    _req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const row = res.locals.resource as AccountTypeRow;
      const data = accountTypeService.mapToResponse(row);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  };
}
