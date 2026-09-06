import express from "express";
import { SecurityController } from "../controllers/security.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validateBody } from "../validators/auth.validator.js";
import { otpVerifySchema } from "../validators/security.validator.js";

const router = express.Router();
const securityController = new SecurityController();

// POST /challenge/v1/security/otp/verify
router.post(
  "/otp/verify",
  authenticate,
  validateBody(otpVerifySchema),
  securityController.verifyOtp,
);

export default router;
