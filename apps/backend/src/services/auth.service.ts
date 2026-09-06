import bcrypt from "bcryptjs";
import { AuthRepository } from "../repositories/auth.repository.js";
import { generateSessionToken, getSessionExpiry } from "../utils/token.util.js";
import { ErrorCode } from "@ai-challenge/shared/error-codes";
import type {
  LoginRequest,
  LoginResponse,
  MeResponse,
  RegisterRequest,
  RegisterResponse,
} from "@ai-challenge/shared/auth.types";
import { createHttpError } from "../utils/http-error.util.js";
import { logger } from "../utils/logger.util.js";

const authRepository = new AuthRepository();
const SALT_ROUNDS = 10;

export class AuthService {
  // Create member user
  async register({
    email,
    password,
    display_name,
  }: RegisterRequest): Promise<RegisterResponse> {
    const existing = await authRepository.findByEmail(email);
    if (existing) {
      logger.warn("Register failed: email already exists", { email });
      throw createHttpError(
        409,
        "Email is already registered",
        ErrorCode.EMAIL_ALREADY_EXISTS,
      );
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const member = await authRepository.createMember(
      email,
      passwordHash,
      display_name,
    );

    logger.info("Member registered", { member_id: member.member_id, email });

    return {
      member_id: member.member_id,
      email: member.email,
      display_name: member.display_name,
      kyc_status: member.kyc_status,
      created_at: member.created_at.toISOString(),
    };
  }

  // Login
  async login({ email, password }: LoginRequest): Promise<LoginResponse> {
    const member = await authRepository.findByEmail(email);
    if (!member) {
      logger.warn("Login failed: member not found", { email });
      throw createHttpError(
        401,
        "Invalid email or password",
        ErrorCode.AUTH_INVALID_CREDENTIALS,
      );
    }

    const isMatch = await bcrypt.compare(password, member.password_hash);
    if (!isMatch) {
      logger.warn("Login failed: password mismatch", { email });
      throw createHttpError(
        401,
        "Invalid email or password",
        ErrorCode.AUTH_INVALID_CREDENTIALS,
      );
    }

    const token = generateSessionToken();
    const expiresAt = getSessionExpiry();
    await authRepository.createSession(token, member.member_id, expiresAt);

    const now = Date.now();
    const expiresInSeconds = Math.floor((expiresAt.getTime() - now) / 1000);

    logger.info("Login successful", { member_id: member.member_id });

    return {
      access_token: token,
      expires_in: expiresInSeconds,
      member: {
        member_id: member.member_id,
        email: member.email,
        display_name: member.display_name,
      },
    };
  }

  // Logout
  async logout(token: string) {
    await authRepository.deleteSession(token);

    logger.info("Logout: session deleted");
  }

  // Read member user
  async getMemberProfile(memberId: number): Promise<MeResponse> {
    const member = await authRepository.findById(memberId);

    if (!member) {
      logger.warn("Get profile failed: member not found", { memberId });

      throw createHttpError(
        404,
        "Member not found",
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return {
      member_id: member.member_id,
      display_name: member.display_name,
      kyc_status: member.kyc_status as "pending" | "approved",
      two_factor_enabled: member.two_factor_enabled,
    };
  }
}
