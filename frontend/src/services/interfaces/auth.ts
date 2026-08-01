export interface LoginPayload {
  email: string;
  password: string;
  tenantId?: string;
  tenantName?: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface AuthUser {
  userId: string;
  email: string;
  tenantId: string;
  tenantName: string;
  status: string;
  roles: string[];
  permissions: string[];
  twoFaEnabled: boolean;
  platformTenantId?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface LoginResponse {
  tokens?: AuthTokens | null;
  me: AuthUser;
  twoFaRequired?: boolean;
  message?: string | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateEmailPayload {
  newEmail: string;
  password: string;
}

export interface TwoFaSetupResponse {
  codeLength: number;
  message: string;
  secret: string;
  qrCodeUri: string;
  qrCodePngBase64: string;
}

export interface TwoFaEnablePayload {
  code: string;
}

export interface TwoFaEmailVerifyPayload {
  email: string;
  code: string;
}

export interface TwoFaActionResponse {
  message: string;
}

export interface BackupCodesResponse {
  codes: string[];
  message: string;
}
