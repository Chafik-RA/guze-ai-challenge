import type { Response, NextFunction } from "express";
import { AuditService } from "../services/audit.service.js";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";

const auditService = new AuditService();

export class AuditController {
  public recordEvent = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const row = await auditService.recordApiEvent(
        req.member?.memberId ?? null,
        req.body,
      );
      res.status(200).json({
        id: row?.id,
        status: "recorded",
      });
    } catch (err) {
      next(err);
    }
  };
}
