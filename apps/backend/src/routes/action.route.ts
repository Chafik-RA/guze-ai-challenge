import express from "express";
import { ActionDraftController } from "../controllers/action-draft.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validateBody } from "../validators/auth.validator.js";
import { createDraftSchema } from "../validators/security.validator.js";

const router = express.Router();
const actionDraftController = new ActionDraftController();

// POST /challenge/v1/actions/draft
router.post(
  "/draft",
  authenticate,
  validateBody(createDraftSchema),
  actionDraftController.createDraft,
);

// POST /challenge/v1/actions/confirm (with body { action_id })
router.post("/confirm", authenticate, actionDraftController.confirmDraft);

// GET /challenge/v1/actions/:id
router.get("/:id", authenticate, actionDraftController.getDraft);

// POST /challenge/v1/actions/:id/confirm
router.post("/:id/confirm", authenticate, actionDraftController.confirmDraft);

export default router;
