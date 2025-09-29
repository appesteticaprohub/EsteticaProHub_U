'use client'

import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import { Notification, UnreadCountResponse, NotificationsResponse } from '@/types/notifications';

interface UseNotificationsOptions {
  limit?: number;
  onlyUnread?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { limit = 5, onlyUnread = false } = options;

  // Obtener contador de no leídas
  const { data: unreadData, mutate: mutateUnread } = useSWR<UnreadCountResponse>(
    '/notifications/unread-count',
    async (url) => {
      const { data, error } = await apiClient.get<UnreadCountResponse>(url);
      if (error) throw new Error(error);
      return data || { count: 0 };
    },
    {
      refreshInterval: 30000, // Actualizar cada 30 segundos
      revalidateOnFocus: true,
    }
  );

  // Obtener notificaciones
  const queryParams = new URLSearchParams({
    limit: limit.toString(),
    ...(onlyUnread && { onlyUnread: 'true' }),
  });

  const { data: notificationsData, mutate: mutateNotifications, isLoading } = useSWR<NotificationsResponse>(
    `/notifications?${queryParams}`,
    async (url) => {
      const { data, error } = await apiClient.get<NotificationsResponse>(url);
      if (error) throw new Error(error);
      return data || { notifications: [], total: 0 };
    },
    {
      revalidateOnFocus: false,
    }
  );

  // Marcar como leída
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await apiClient.patch(`/notifications`, {
        notification_id: notificationId,
      });

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      // Actualizar ambas cachés
      await mutateNotifications();
      await mutateUnread();
      
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  };

  return {
    notifications: notificationsData?.notifications || [],
    total: notificationsData?.total || 0,
    unreadCount: unreadData?.count || 0,
    isLoading,
    markAsRead,
    refresh: () => {
      mutateNotifications();
      mutateUnread();
    },
  };
}