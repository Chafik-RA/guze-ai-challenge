import type { Response, NextFunction } from "express";
import { OtpService } from "../services/otp.service.js";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";

const otpService = new OtpService();

export class SecurityController {
  public verifyOtp = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { action_id, otp } = req.body;
      const result = await otpService.verifyOtp(
        action_id,
        otp,
        req.member?.memberId,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}
