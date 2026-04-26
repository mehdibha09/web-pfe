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
  tokens: AuthTokens;
  me: AuthUser;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
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

export const logout = async (refreshToken?: string) => {
  const response = await axiosInstance.post('/auth/logout', {
    refreshToken,
  });
  return response.data;
};
