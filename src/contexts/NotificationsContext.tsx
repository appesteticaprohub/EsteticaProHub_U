'use client'

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
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
  markAsReadAndNavigate: (notificationId: string, ctaUrl: string | null) => Promise<void>
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
  const fetchNotifications = useCallback(async () => {
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
  }, [user?.id])

  // ✅ Fetch inicial cuando el usuario cambie
  useEffect(() => {
    fetchNotifications()
  }, [user?.id, fetchNotifications])

  // ✅ REALTIME: Escuchar cambios en notifications
  useEffect(() => {
    if (!user?.id) return

    const subscription = supabase
      .channel(`notifications_context_${user.id}`)
      .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${user.id}`
    }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newNotification = payload.new as Notification
          
          setNotifications(prev => {
            const newList = [newNotification, ...prev]
            notificationsRef.current = newList
            return newList
          })
          setUnreadCount(prev => prev + 1)
        }

        if (payload.eventType === 'UPDATE') {
          const updatedNotification = payload.new as Notification
          
          // Buscar la notificación en nuestro estado actual para comparar
          const currentNotification = notifications.find(n => n.id === updatedNotification.id)
          
          if (currentNotification) {
            const wasUnread = currentNotification.is_read === false
            const isNowRead = updatedNotification.is_read === true
            
            // Si cambió de no leída a leída, decrementar contador
            if (wasUnread && isNowRead) {
              setUnreadCount(prev => Math.max(0, prev - 1))
            }
          }
          
          // Actualizar en la lista
          setNotifications(prev => {
            const newList = prev.map(notif => 
              notif.id === updatedNotification.id ? updatedNotification : notif
            )
            notificationsRef.current = newList
            return newList
          })
        }

        if (payload.eventType === 'DELETE') {
          const deletedId = payload.old?.id
          
          // Verificar si la notificación existe en nuestra lista
          const notificationExists = notificationsRef.current.find(n => n.id === deletedId)
          
          if (notificationExists) {
            setNotifications(prev => {
              const newList = prev.filter(notif => notif.id !== deletedId)
              notificationsRef.current = newList
              return newList
            })
            
            const wasUnread = notificationExists.is_read === false
            if (wasUnread) {
              setUnreadCount(prev => Math.max(0, prev - 1))
            }
          }
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe()
    }
  }, [user?.id, supabase, notifications])

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

const markAsReadAndNavigate = async (notificationId: string, ctaUrl: string | null): Promise<void> => {
  await markAsRead(notificationId)
  if (ctaUrl) {
    window.location.href = ctaUrl
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
    
    if (!response.ok || result.error) {
      console.error('Error deleting notification:', result.error)
      return { success: false, error: result.error }
    }

    // ✅ Actualizar estado local inmediatamente (sin depender de Realtime)
    const deletedNotification = notificationsRef.current.find(n => n.id === notificationId)
    
    if (deletedNotification) {
      setNotifications(prev => {
        const newList = prev.filter(notif => notif.id !== notificationId)
        notificationsRef.current = newList
        return newList
      })
      
      // Si era no leída, decrementar contador
      if (!deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    }
    
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
  markAsReadAndNavigate,
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