import type { Response, NextFunction } from "express";
import { ActionDraftService } from "../services/action-draft.service.js";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";

const actionDraftService = new ActionDraftService();

export class ActionDraftController {
  public createDraft = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { intent, payload } = req.body;
      const draft = await actionDraftService.createDraft(
        req.member!.memberId,
        intent,
        payload,
      );
      res.status(201).json({
        action_id: draft.action_id,
        status: draft.status,
        payload_snapshot: draft.payload_snapshot,
      });
    } catch (err) {
      next(err);
    }
  };

  public getDraft = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const draft = await actionDraftService.getDraft(
        String(req.params.id),
        req.member!.memberId,
      );
      res.status(200).json({
        action_id: draft.action_id,
        status: draft.status,
        payload_snapshot: draft.payload_snapshot,
        confirmed_at: draft.confirmed_at ? draft.confirmed_at.toISOString() : null,
      });
    } catch (err) {
      next(err);
    }
  };

  public confirmDraft = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const draft = await actionDraftService.confirmDraft(
        String(req.params.id),
        req.member!.memberId,
      );
      res.status(200).json({
        action_id: draft.action_id,
        status: draft.status,
        payload_snapshot: draft.payload_snapshot,
        confirmed_at: draft.confirmed_at?.toISOString(),
      });
    } catch (err) {
      next(err);
    }
  };
}
