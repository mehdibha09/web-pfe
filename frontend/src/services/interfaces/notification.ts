export interface NotificationResponse {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  tenantId: string;
  link: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationCreateRequest {
  userId: string;
  title: string;
  message: string;
  type: string;
  tenantId: string;
  link?: string;
}
