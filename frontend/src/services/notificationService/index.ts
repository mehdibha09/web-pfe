export type {
  NotificationResponse,
  NotificationCreateRequest,
} from '../interfaces/notification';

import axiosInstance from '../axiosInstance';

export const listNotifications = async (userId: string): Promise<import('../interfaces/notification').NotificationResponse[]> => {
  const { data } = await axiosInstance.get(`/notifications?userId=${userId}`);
  return data;
};

export const listNotificationsPaginated = async (userId: string, page: number, size: number): Promise<{ items: import('../interfaces/notification').NotificationResponse[]; total: number }> => {
  const { data, pagination } = await axiosInstance.get(`/notifications?userId=${userId}&page=${page}&size=${size}`);
  return { items: data || [], total: pagination?.totalElements ?? 0 };
};

export const listUnreadNotifications = async (userId: string): Promise<import('../interfaces/notification').NotificationResponse[]> => {
  const { data } = await axiosInstance.get(`/notifications/unread?userId=${userId}`);
  return data;
};

export const countUnreadNotifications = async (userId: string): Promise<number> => {
  const { data } = await axiosInstance.get<{ count: number }>(`/notifications/unread/count?userId=${userId}`);
  return data.count;
};

export const createNotification = async (payload: import('../interfaces/notification').NotificationCreateRequest): Promise<import('../interfaces/notification').NotificationResponse> => {
  const { data } = await axiosInstance.post('/notifications', payload);
  return data;
};

export const markAsRead = async (id: string): Promise<import('../interfaces/notification').NotificationResponse> => {
  const { data } = await axiosInstance.patch(`/notifications/${id}/read`);
  return data;
};

export const markAllAsRead = async (userId: string): Promise<void> => {
  await axiosInstance.patch(`/notifications/read-all?userId=${userId}`);
};

export const deleteNotification = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/notifications/${id}`);
};

export const deleteNotificationsByUser = async (userId: string): Promise<void> => {
  await axiosInstance.delete(`/notifications/user/${userId}`);
};
