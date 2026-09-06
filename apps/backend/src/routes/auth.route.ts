import express from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { validateBody, registerSchema, loginSchema } from "../validators/auth.validator.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = express.Router();
const authController = new AuthController();

router.post("/register", validateBody(registerSchema), authController.register);
router.post("/login", validateBody(loginSchema), authController.login);
router.get("/me", authenticate, authController.getMemberProfile);
router.post("/logout", authenticate, authController.logout);

export default router;