import type { Request, Response, NextFunction } from "express";
import { AgentService } from "../services/agent.service.js";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";

const agentService = new AgentService();

export class AgentController {
  public chat = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      const memberId = authReq.member?.memberId ?? null;
      const message = (req.body.message ?? req.body.query ?? "") as string;

      const result = await agentService.processMessage(message, memberId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}
