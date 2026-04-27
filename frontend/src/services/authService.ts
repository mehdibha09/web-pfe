import axiosInstance from './axiosInstance';

export type LoginPayload = {
  email: string;
  password: string;
  tenantId?: string;
  tenantName?: string;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  token: string;
  newPassword: string;
};

export type AuthUser = {
  userId: string;
  email: string;
  tenantId: string;
  tenantName: string;
  status: string;
  roles: string[];
  permissions: string[];
  twoFaEnabled: boolean;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
};

export type LoginResponse = {
  tokens?: AuthTokens | null;
  me: AuthUser;
  twoFaRequired?: boolean;
  message?: string | null;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

export type TwoFaSetupResponse = {
  codeLength: number;
  message: string;
};

export type TwoFaEnablePayload = {
  code: string;
};

export type TwoFaEmailVerifyPayload = {
  email: string;
  code: string;
};

export type TwoFaActionResponse = {
  message: string;
};

export const login = async (payload: LoginPayload): Promise<LoginResponse> => {
  const response = await axiosInstance.post('/auth/login', payload);
  return response.data;
};

export const forgotPassword = async (payload: ForgotPasswordPayload) => {
  const response = await axiosInstance.post('/auth/forgot-password', payload);
  return response.data;
};

export const resetPassword = async (payload: ResetPasswordPayload) => {
  const response = await axiosInstance.post('/auth/reset-password', payload);
  return response.data;
};

export const getMe = async (): Promise<AuthUser> => {
  const response = await axiosInstance.get('/auth/me');
  return response.data;
};

export const changePassword = async (payload: ChangePasswordPayload) => {
  const response = await axiosInstance.post('/auth/change-password', payload);
  return response.data;
};

export const setupTwoFa = async (): Promise<TwoFaSetupResponse> => {
  const response = await axiosInstance.post('/auth/2fa/setup');
  return response.data;
};

export const verifyTwoFa = async (payload: TwoFaEnablePayload): Promise<TwoFaActionResponse> => {
  const response = await axiosInstance.post('/auth/2fa/verify', payload);
  return response.data;
};

export const verifyEmailTwoFa = async (
  payload: TwoFaEmailVerifyPayload,
): Promise<LoginResponse> => {
  const response = await axiosInstance.post('/auth/2fa/email/verify', payload);
  return response.data;
};

export const disableTwoFa = async (): Promise<TwoFaActionResponse> => {
  const response = await axiosInstance.delete('/auth/2fa');
  return response.data;
};

export const logout = async (refreshToken?: string) => {
  const response = await axiosInstance.post('/auth/logout', {
    refreshToken,
  });
  return response.data;
};
