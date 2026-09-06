// Source of truth: 05_API_CONTRACT.md §11

export interface OtpVerifyRequest {
  action_id: string;
  otp: string;
}

export interface OtpVerifySuccess {
  verified: true;
  verification_token: string;
  expires_in: number;
}

export interface OtpVerifyFailure {
  verified: false;
  code: "OTP_INVALID";
}

export type OtpVerifyResponse = OtpVerifySuccess | OtpVerifyFailure;
