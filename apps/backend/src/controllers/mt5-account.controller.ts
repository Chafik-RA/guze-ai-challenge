import type { Response, NextFunction } from "express";
import { Mt5AccountService } from "../services/mt5-account.service.js";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import type { MT5AccountRow } from "../types/db.types.js";

const mt5AccountService = new Mt5AccountService();

export class Mt5AccountController {
  public listMine = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const items = await mt5AccountService.listByMember(req.member!.memberId);
      res.status(200).json({ items });
    } catch (err) {
      next(err);
    }
  };

  public getById = (
    _req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const row = res.locals.resource as MT5AccountRow;
      const data = mt5AccountService.mapToResponse(row);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  };

  public create = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { account_type_id, leverage, action_id, verification_token } = req.body;
      const idempotencyKey = req.headers["idempotency-key"] as string | undefined;

      const result = await mt5AccountService.createMT5Account({
        memberId: req.member!.memberId,
        accountTypeId: account_type_id,
        leverage,
        actionId: action_id,
        verificationToken: verification_token,
        idempotencyKey,
      });

      const statusCode = result.replayed ? 200 : 201;
      res.status(statusCode).json(result);
    } catch (err) {
      next(err);
    }
  };
}
