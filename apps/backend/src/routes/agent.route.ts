import express from "express";
import { AgentController } from "../controllers/agent.controller.js";
import { optionalAuthMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();
const agentController = new AgentController();

// POST /challenge/v1/agent/chat (supports both unauthenticated Level 1 FAQ and authenticated Level 2)
router.post("/chat", optionalAuthMiddleware, agentController.chat);
router.post("/query", optionalAuthMiddleware, agentController.chat);

export default router;
