import { api } from "../../../services/api";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    username: string;
    email: string;
    fullName: string;
    profileImage: string;
    role: string;
  };
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

export interface VerifyOTPRequest {
  email: string;
  otp: string;
}

export interface VerifyOTPResponse {
  success: boolean;
  message: string;
  reset_token?: string;
}

export interface ResetPasswordRequest {
  email: string;
  reset_token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

const FORGOT_PASSWORD_PATH = (import.meta.env.VITE_FORGOT_PASSWORD_PATH as string) || "/auth/forgot-password";
const VERIFY_OTP_PATH = (import.meta.env.VITE_VERIFY_OTP_PATH as string) || "/auth/verify-otp";
const RESET_PASSWORD_PATH = (import.meta.env.VITE_RESET_PASSWORD_PATH as string) || "/auth/reset-password";
const CHECK_EMAIL_PATH = (import.meta.env.VITE_CHECK_EMAIL_PATH as string) || "/auth/check-email";


export const refreshAccessToken = async (refreshToken: string): Promise<{ accessToken: string }> => {
  try {
    const BASE_URL = (import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:8081") as string;
    const url = `${BASE_URL.replace(/\/$/, "")}/auth/refresh-token`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refreshToken }),
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error: unknown) {
    console.error("Refresh token API error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("401")) {
      throw new Error("Token đã hết hạn. Vui lòng đăng nhập lại.");
    }
    throw new Error("Không thể làm mới token. Vui lòng đăng nhập lại.");
  }
};

export const forgotPassword = async (email: string): Promise<ForgotPasswordResponse> => {
  try {
    const BASE_URL = (import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:8081") as string;
    const url = `${BASE_URL.replace(/\/$/, "")}${FORGOT_PASSWORD_PATH}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return data;
    } else {
      const text = await response.text();
      return { success: true, message: text };
    }
  } catch (error: unknown) {
    console.error("Forgot password API error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("404")) {
      throw new Error("Email không tồn tại trong hệ thống.");
    }
    throw new Error("Email không tồn tại trong hệ thống, vui lòng kiểm tra lại.");
  }
};

export const checkEmailExists = async (email: string): Promise<{ exists: boolean }> => {
  try {
    const BASE_URL = (import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:8081") as string;
    const url = `${BASE_URL.replace(/\/$/, "")}${CHECK_EMAIL_PATH}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error: unknown) {
    console.error("Check email API error:", error);
    return { exists: false };
  }
};

export const verifyOTP = async (email: string, otp: string): Promise<VerifyOTPResponse> => {
  try {
    const BASE_URL = (import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:8081") as string;
    const url = `${BASE_URL.replace(/\/$/, "")}${VERIFY_OTP_PATH}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, otp }),
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return data;
    } else {
      const text = await response.text();
      return { success: true, message: text };
    }
  } catch (error: unknown) {
    console.error("Verify OTP API error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("400")) {
      throw new Error("Mã OTP không đúng. Vui lòng kiểm tra lại.");
    } else if (errorMessage.includes("410")) {
      throw new Error("Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.");
    }
    throw new Error("OTP không đúng hoặc đã hết hạn. Vui lòng thử lại.");
  }
};

export const resetPassword = async (email: string, reset_token: string, newPassword: string): Promise<ResetPasswordResponse> => {
  try {
    const BASE_URL = (import.meta.env.VITE_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:8081") as string;
    const url = `${BASE_URL.replace(/\/$/, "")}${RESET_PASSWORD_PATH}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, reset_token, newPassword }),
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return data;
    } else {
      const text = await response.text();
      return { success: true, message: text };
    }
  } catch (error: unknown) {
    console.error("Reset password API error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("400")) {
      throw new Error("Token không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu lại.");
    } else if (errorMessage.includes("422")) {
      throw new Error("Mật khẩu mới không đáp ứng yêu cầu. Vui lòng thử lại.");
    }
    throw new Error("Có lỗi xảy ra khi đặt lại mật khẩu. Vui lòng thử lại.");
  }
};
