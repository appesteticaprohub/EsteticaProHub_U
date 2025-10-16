export interface Notification {
  id: string;
  user_id: string;
  type: 'email' | 'in_app';
  category: 'critical' | 'important' | 'normal' | 'promotional';
  title: string;
  message: string;
  cta_text: string | null;
  cta_url: string | null;
  is_read: boolean;
  expires_at: string | null;
  created_at: string;
  created_by_admin_id: string | null;
}

export interface NotificationPreferences {
  user_id: string;
  email_promotional: boolean;
  email_content: boolean;
  email_administrative: boolean;
  in_app_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferencesResponse {
  preferences: NotificationPreferences;
}

export interface UnreadCountResponse {
  count: number;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
}

// Tipos específicos para notificaciones sociales
export type SocialNotificationType = 'comment' | 'like' | 'reply' | 'mention';