'use client'

import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import { UnreadCountResponse, NotificationsResponse } from '@/types/notifications';

interface UseNotificationsOptions {
  limit?: number;
  onlyUnread?: boolean;
  type?: 'email' | 'in_app';
  category?: 'critical' | 'important' | 'normal' | 'promotional';
  enabled?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { limit = 5, onlyUnread = false, type, category, enabled = true } = options;

  // Obtener contador de no leídas
  const { data: unreadData, mutate: mutateUnread } = useSWR<UnreadCountResponse>(
    enabled ? '/notifications/unread-count' : null,
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
    ...(type && { type }),
    ...(category && { category }),
  });

  // Si onlyUnread es true, agregar is_read=false
  if (onlyUnread) {
    queryParams.append('is_read', 'false');
  }

  const { data: notificationsData, mutate: mutateNotifications, isLoading } = useSWR<NotificationsResponse>(
    enabled ? `/notifications?${queryParams}` : null,
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

  // Marcar todas como leídas
  const markAllAsRead = async () => {
    try {
      const { error } = await apiClient.patch(`/notifications`, {
        mark_all_as_read: true,
      });

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return false;
      }

      // Actualizar ambas cachés
      await mutateNotifications();
      await mutateUnread();
      
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  };

  // Eliminar notificación
  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notification_id: notificationId,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        console.error('Error deleting notification:', result.error);
        return { success: false, error: result.error };
      }

      // Actualizar ambas cachés forzando revalidación
      await mutateNotifications(undefined, { revalidate: true });
      await mutateUnread(undefined, { revalidate: true });
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return { success: false, error: 'Error al eliminar la notificación' };
    }
  };


  return {
    notifications: notificationsData?.notifications || [],
    total: notificationsData?.total || 0,
    unreadCount: unreadData?.count || 0,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: () => {
      mutateNotifications();
      mutateUnread();
    },
  };
}