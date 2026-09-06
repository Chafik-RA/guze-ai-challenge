// ฝั่งไหนก็ import ได้ทั้ง frontend/backend — ต้อง sync กันเสมอ

export interface MeResponse {
  member_id: number;
  display_name: string;
  kyc_status: "pending" | "approved";
  two_factor_enabled: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  display_name: string;
}

export interface RegisterResponse {
  member_id: number;
  email: string;
  display_name: string;
  kyc_status: string;
  created_at: string; // ⚠️ Date จะถูก serialize เป็น string ผ่าน JSON เสมอ ไม่ใช่ Date object จริง
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  expires_in: number;
  member: {
    member_id: number;
    email: string;
    display_name: string;
  };
}
