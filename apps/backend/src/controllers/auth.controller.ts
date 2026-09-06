import type { NextFunction, Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";

const authService = new AuthService();

export class AuthController {
  // Create member user
  public register = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { email, password, display_name } = req.body;
      const member = await authService.register({
        email,
        password,
        display_name,
      });
      res.status(201).json(member);
    } catch (err) {
      next(err);
    }
  };

  // Login
  public login = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { email, password } = req.body;
      const result = await authService.login({
        email,
        password,
      });

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };

  // Logout
  public logout = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length).trim()
        : null;

      if (token) {
        await authService.logout(token);
      }
      res.status(200).json({
        message: "Logout successful!",
      });
    } catch (err) {
      next(err);
    }
  };

  // Read member user
  public getMemberProfile = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const memberId = req.member?.memberId;

      if (!memberId) {
        throw new Error("Unauthorized");
      }

      const result = await authService.getMemberProfile(memberId);

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}
