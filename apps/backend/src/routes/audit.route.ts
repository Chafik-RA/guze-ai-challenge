import express from "express";
import { AuditController } from "../controllers/audit.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validateBody } from "../validators/auth.validator.js";
import { auditEventSchema } from "../validators/security.validator.js";

const router = express.Router();
const auditController = new AuditController();

// POST /challenge/v1/audit/events
router.post(
  "/events",
  authenticate,
  validateBody(auditEventSchema),
  auditController.recordEvent,
);

export default router;
