'use client'

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from './AuthContext'
import { apiClient } from '@/lib/api-client'
import { UnreadCountResponse, NotificationsResponse } from '@/types/notifications'

interface Notification {
  id: string
  title: string
  message: string
  category: string
  type: string
  is_read: boolean
  created_at: string
  cta_text?: string | null
  cta_url?: string | null
  user_id: string
}

interface NotificationsContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  markAsRead: (notificationId: string) => Promise<boolean>
  markAllAsRead: () => Promise<boolean>
  deleteNotification: (notificationId: string) => Promise<{ success: boolean; error: string | null }>
  refresh: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const notificationsRef = useRef<Notification[]>([])

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // ✅ Fetch inicial de notificaciones y unread count
  const fetchNotifications = async () => {
    if (!user?.id) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    setLoading(true)
    try {
      // Fetch notificaciones (últimas 20 para el contexto global)
      const { data: notificationsData } = await apiClient.get<NotificationsResponse>('/notifications?limit=20')
      if (notificationsData) {
        setNotifications(notificationsData.notifications || [])
      }

      if (notificationsData) {
        const newNotifications = notificationsData.notifications || []
        setNotifications(newNotifications)
        notificationsRef.current = newNotifications
      }

      // Fetch unread count
      const { data: unreadData } = await apiClient.get<UnreadCountResponse>('/notifications/unread-count')
      if (unreadData) {
        setUnreadCount(unreadData.count || 0)
      }
    } catch (error) {
      console.log('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // ✅ Fetch inicial cuando el usuario cambie
  useEffect(() => {
    fetchNotifications()
  }, [user?.id])

  // ✅ REALTIME: Escuchar cambios en notifications
  useEffect(() => {
    if (!user?.id) return

    console.log('🔔 [CONTEXTO] Iniciando escucha Realtime para notificaciones:', user.id)

    const subscription = supabase
      .channel(`notifications_context_${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        // filter: `user_id=eq.${user.id}` // Temporal: sin filtro para probar DELETE
      }, (payload) => {
        console.log('🔔 [CONTEXTO] Evento Realtime detectado:', payload.eventType)

        if (payload.eventType === 'INSERT') {
          const newNotification = payload.new as Notification
          console.log('🔔 [CONTEXTO] Nueva notificación:', newNotification.title)
          
          // Agregar al inicio de la lista
          setNotifications(prev => {
            const newList = [newNotification, ...prev]
            notificationsRef.current = newList // ✅ Actualizar ref
            return newList
          })
          setUnreadCount(prev => prev + 1)
        }

        if (payload.eventType === 'UPDATE') {
          const updatedNotification = payload.new as Notification
          const oldNotification = payload.old as any
          
          console.log('🔔 [CONTEXTO] Notificación actualizada')
          
          // Actualizar en la lista
          setNotifications(prev => {
            const newList = prev.map(notif => 
              notif.id === updatedNotification.id ? updatedNotification : notif
            )
            notificationsRef.current = newList // ✅ Actualizar ref
            return newList
          })
          
          // Si se marcó como leída, decrementar unread count
          if (oldNotification?.is_read === false && updatedNotification.is_read === true) {
            setUnreadCount(prev => Math.max(0, prev - 1))
          }
        }

        if (payload.eventType === 'DELETE') {
          const deletedId = payload.old?.id
          const deletedUserId = payload.old?.user_id
          
          console.log('🔔 [CONTEXTO] DELETE detectado sin filtro:', { deletedId, deletedUserId, currentUser: user.id })
          
          // ✅ Verificar si la notificación existe en nuestra lista (más confiable que user_id)
          const notificationExists = notificationsRef.current.find(n => n.id === deletedId)
          console.log('🔔 [CONTEXTO] Buscando en lista actual:', notificationsRef.current.map(n => n.id))
          
          if (notificationExists) {
            console.log('🔔 [CONTEXTO] DELETE confirmado - notificación existe en nuestra lista')
            console.log('🔔 [CONTEXTO] Lista antes del DELETE:', notifications.map(n => n.id))
            
            setNotifications(prev => {
              const newList = prev.filter(notif => notif.id !== deletedId)
              notificationsRef.current = newList // ✅ Actualizar ref también en DELETE
              console.log('🔔 [CONTEXTO] Lista después del DELETE:', newList.map(n => n.id))
              console.log('🔔 [CONTEXTO] Ref actualizado a:', notificationsRef.current.map(n => n.id))
              return newList
            })
            
            const wasUnread = notificationExists.is_read === false
            if (wasUnread) {
              setUnreadCount(prev => {
                const newCount = Math.max(0, prev - 1)
                console.log('🔔 [CONTEXTO] Unread count actualizado:', prev, '->', newCount)
                return newCount
              })
            }
          } else {
            console.log('🔔 [CONTEXTO] DELETE ignorado - notificación no está en nuestra lista')
          }
        }
      })
      .subscribe((status) => {
        console.log('🔔 [CONTEXTO] Estado Realtime:', status)
        if (status === 'SUBSCRIBED') {
          console.log('🔔 [CONTEXTO] ✅ Canal Realtime conectado correctamente')
        }
        if (status === 'CHANNEL_ERROR') {
          console.log('🔔 [CONTEXTO] ❌ Error en canal Realtime - reintentando...')
        }
      });

    return () => {
      console.log('🔔 [CONTEXTO] Desconectando Realtime notificaciones')
      subscription.unsubscribe()
    }
  }, [user?.id])

  // ✅ Funciones de manejo
  const markAsRead = async (notificationId: string): Promise<boolean> => {
    try {
      const { error } = await apiClient.patch('/notifications', {
        notification_id: notificationId,
      })

      if (error) {
        console.error('Error marking notification as read:', error)
        return false
      }

      // El estado se actualiza via Realtime
      return true
    } catch (error) {
      console.error('Error marking notification as read:', error)
      return false
    }
  }

  const markAllAsRead = async (): Promise<boolean> => {
    try {
      const { error } = await apiClient.patch('/notifications', {
        mark_all_as_read: true,
      })

      if (error) {
        console.error('Error marking all notifications as read:', error)
        return false
      }

      // Actualizar estado local inmediatamente
      setUnreadCount(0)
      setNotifications(prev => {
        const newList = prev.map(notif => ({ ...notif, is_read: true }))
        notificationsRef.current = newList // ✅ Actualizar ref
        return newList
      })
      
      return true
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      return false
    }
  }
  

  const deleteNotification = async (notificationId: string) => {
    console.log('🗑️ [CONTEXTO] Intentando eliminar notificación:', notificationId)
    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notification_id: notificationId,
        }),
      })

      const result = await response.json()

      console.log('🗑️ [CONTEXTO] Respuesta del servidor:', response.status, result)
      
      if (!response.ok || result.error) {
        console.error('🗑️ [CONTEXTO] Error deleting notification:', result.error)
        return { success: false, error: result.error }
      }
      
      console.log('🗑️ [CONTEXTO] Eliminación exitosa, esperando evento Realtime...')

      // El estado se actualiza via Realtime
      return { success: true, error: null }
    } catch (error) {
      console.error('Error deleting notification:', error)
      return { success: false, error: 'Error al eliminar la notificación' }
    }
  }

  const refresh = async () => {
    await fetchNotifications()
  }

  const value = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  }

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotificationsContext() {
  const context = useContext(NotificationsContext)
  if (context === undefined) {
    throw new Error('useNotificationsContext must be used within a NotificationsProvider')
  }
  return context
}