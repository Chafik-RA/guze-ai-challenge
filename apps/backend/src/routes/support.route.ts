import express from "express";
import { SupportController } from "../controllers/support.controller.js";
import { optionalAuthMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();
const supportController = new SupportController();

// POST /challenge/v1/support/tickets (allows both authenticated and unauthenticated/guest handoff)
router.post("/tickets", optionalAuthMiddleware, supportController.create);
router.get("/tickets/:ticketId", optionalAuthMiddleware, supportController.getById);

export default router;
