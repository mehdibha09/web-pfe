export type {
  LoginPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  AuthUser,
  AuthTokens,
  LoginResponse,
  ChangePasswordPayload,
  UpdateEmailPayload,
  TwoFaSetupResponse,
  TwoFaEnablePayload,
  TwoFaEmailVerifyPayload,
  TwoFaActionResponse,
} from '../interfaces/auth';

import axiosInstance from '../axiosInstance';
import type { AuthUser, AuthTokens, LoginResponse, TwoFaSetupResponse, TwoFaActionResponse } from '../interfaces/auth';
import type { ForgotPasswordPayload, ResetPasswordPayload, LoginPayload, ChangePasswordPayload, UpdateEmailPayload, TwoFaEnablePayload, TwoFaEmailVerifyPayload } from '../interfaces/auth';

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

export const updateEmail = async (payload: UpdateEmailPayload) => {
  const response = await axiosInstance.post('/auth/update-email', payload);
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

export const resendEmailTwoFa = async (
  email: string,
): Promise<TwoFaActionResponse> => {
  const response = await axiosInstance.post('/auth/2fa/email/resend', { email });
  return response.data;
};

export const disableTwoFa = async (): Promise<TwoFaActionResponse> => {
  const response = await axiosInstance.delete('/auth/2fa');
  return response.data;
};

export const logout = async () => {
  const response = await axiosInstance.post('/auth/logout', {});
  return response.data;
};
