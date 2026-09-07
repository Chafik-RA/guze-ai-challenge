import type { Request, Response, NextFunction } from "express";
import { SupportService } from "../services/support.service.js";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";

const supportService = new SupportService();

export class SupportController {
  public create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const memberId = authReq.member?.memberId ?? null;
      const result = await supportService.createTicket(req.body, memberId);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ticketId = req.params.ticketId as string;
      const ticket = await supportService.getTicket(ticketId);
      res.status(200).json(ticket);
    } catch (err) {
      next(err);
    }
  };
}
