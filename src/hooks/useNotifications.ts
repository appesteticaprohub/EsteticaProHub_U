'use client'

import useSWR from 'swr';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
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

  const { user } = useAuth();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // ✅ Estado local para unread count (sin polling)
  const [unreadCount, setUnreadCount] = useState(0);
  
  // ✅ Fetch inicial del unread count
  useEffect(() => {
    if (!enabled || !user?.id) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async () => {
      try {
        const { data, error } = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
        if (!error && data) {
          setUnreadCount(data.count || 0);
        }
      } catch (error) {
        console.log('Error fetching initial unread count:', error);
      }
    };

    fetchUnreadCount();
  }, [enabled, user?.id]);

  // ✅ REALTIME: Escuchar cambios en notifications
  useEffect(() => {
    if (!enabled || !user?.id) return;

    console.log('🔔 Iniciando escucha Realtime para notificaciones de usuario:', user.id);

    const subscription = supabase
      .channel(`notifications_user_${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}` // ✅ Ahora funciona sin RLS
      }, (payload) => {
        
        // Verificar si la notificación es para este usuario
        const newRecord = payload.new as any;
        const oldRecord = payload.old as any;
        
        console.log('🔔 EVENTO REALTIME DETECTADO (sin filtro):', {
          eventType: payload.eventType,
          table: payload.table,
          newRecord: newRecord,
          oldRecord: oldRecord
        });
        console.log('🔔 USER IDs - Current user:', user.id, 'New user_id:', newRecord?.user_id, 'Old user_id:', oldRecord?.user_id);
        
        // ✅ Con filtro, todos los eventos son para este usuario
        console.log('🔔 Evento para nuestro usuario:', payload.eventType);
        
        if (payload.eventType === 'INSERT') {
          setUnreadCount(prev => prev + 1);
          mutateNotifications();
        }
        
        if (payload.eventType === 'UPDATE' && oldRecord?.is_read === false && newRecord?.is_read === true) {
          setUnreadCount(prev => Math.max(0, prev - 1));
          mutateNotifications();
        }
        
        if (payload.eventType === 'DELETE') {
          console.log('🗑️ Eliminando notificación - forzando actualización completa');
          // Para DELETE, siempre decrementar
          setUnreadCount(prev => Math.max(0, prev - 1));
          // ✅ FORZAR revalidación completa
          mutateNotifications(undefined, { revalidate: true });
          
          // ✅ También refetch manual del unread count para asegurar sincronización
          setTimeout(async () => {
            try {
              const { data } = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
              if (data) {
                setUnreadCount(data.count || 0);
                console.log('🔄 Unread count refrescado manualmente:', data.count);
              }
            } catch (error) {
              console.log('Error refrescando unread count:', error);
            }
          }, 500);
        }
      })
      .subscribe((status) => {
        console.log('🔔 Estado de suscripción Realtime:', status);
      });

    return () => {
      console.log('🔔 Desconectando Realtime notificaciones para usuario:', user.id);
      subscription.unsubscribe();
    };
  }, [enabled, user?.id]);

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

      // ✅ Solo revalidar notificaciones (unreadCount se actualiza via Realtime)
      await mutateNotifications();
      
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

      // ✅ Actualizar unreadCount a 0 y revalidar notificaciones
      setUnreadCount(0);
      await mutateNotifications();
      
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

      // ✅ Revalidar notificaciones (unreadCount se actualiza via Realtime)
      await mutateNotifications(undefined, { revalidate: true });
      
      return { success: true, error: null };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return { success: false, error: 'Error al eliminar la notificación' };
    }
  };


  return {
    notifications: notificationsData?.notifications || [],
    total: notificationsData?.total || 0,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: () => {
      mutateNotifications();
      // ✅ Refetch unread count manualmente
      if (user?.id) {
        apiClient.get<UnreadCountResponse>('/notifications/unread-count')
          .then(({ data }) => {
            if (data) setUnreadCount(data.count || 0);
          })
          .catch(error => console.log('Error refreshing unread count:', error));
      }
    },
  };
}