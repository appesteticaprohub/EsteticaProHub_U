'use client'

import React, { createContext, useContext } from 'react'
import useSWR, { mutate } from 'swr'
import { apiClient } from '@/lib/api-client'
import { getSupabaseClient } from '@/lib/supabase-client'

interface User {
  id: string
  email: string
  user_metadata?: {
    [key: string]: string | number | boolean | null;
  }
}

interface Session {
  access_token: string
  refresh_token: string
  expires_at: number
  user: User
}

interface AuthData {
  user: User | null
  session: Session | null
  userType: string
  subscriptionStatus: string | null
  isBanned: boolean
  avatarUrl: string | null
  fullName: string | null
  specialty: string | null
  country: string | null
}

interface AuthContextType {
  user: User | null
  session: Session | null
  userType: string | null
  subscriptionStatus: string | null
  isBanned: boolean
  avatarUrl: string | null
  fullName: string | null
  specialty: string | null
  country: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: { message: string; isBanned?: boolean } | null }>
  signUp: (email: string, password: string, fullName?: string, specialty?: string, country?: string, birthDate?: string, paymentReference?: string) => Promise<{ error: { message: string } | null }>
  signOut: () => Promise<void>
  updateAvatar: (avatarUrl: string | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Fetcher function para SWR
const fetcher = async (url: string): Promise<AuthData> => {
  const { data, error } = await apiClient.get<AuthData>(url)
  if (error) throw new Error(error)
  return data || { user: null, session: null, userType: 'anonymous', subscriptionStatus: null, isBanned: false, avatarUrl: null, fullName: null, specialty: null, country: null }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {

  const supabase = getSupabaseClient()
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data, error, isLoading, mutate: mutateAuth } = useSWR<AuthData>(
    '/auth/session',
    fetcher,
    {
      revalidateOnFocus: false,     // ❌ Eliminado
      revalidateOnReconnect: false, // ❌ Eliminado
      refreshInterval: 0,           // ❌ Eliminado polling
      refreshWhenHidden: false,     // ✅ No refrescar en pestañas ocultas
      refreshWhenOffline: false,    // ✅ No refrescar cuando está offline
      dedupingInterval: 1800000,    // ✅ Cache por 30 minutos (optimizado para 10k usuarios)
      onError: (err) => {
        console.error('Error en AuthContext:', err)
      }
    }
  )

  // Detector de usuario baneado
  React.useEffect(() => {
    if (typeof window === 'undefined') return
    
    const currentPath = window.location.pathname
    
    // Si está baneado y NO está en /banned, redirigir
    if (data?.isBanned === true && currentPath !== '/banned') {
      console.log('🚫 Usuario baneado detectado en AuthContext - redirigiendo a /banned')
      // Limpiar el usuario previo para evitar redirecciones
      sessionStorage.removeItem('prev_user_id')
      window.location.href = '/banned'
    }
  }, [data?.isBanned])

  // Detector de sesión invalidada (solo en el cliente)
  React.useEffect(() => {
    if (typeof window === 'undefined') return

    // No hacer nada si estamos en /banned
    if (window.location.pathname === '/banned') {
      return
    }

    // Guardar el estado anterior del usuario
    const previousUser = sessionStorage.getItem('prev_user_id')
    const currentUser = data?.user?.id || null

    if (previousUser && !currentUser && !isLoading) {
      // El usuario TENÍA sesión y ahora no la tiene = fue invalidado
      console.log('🔒 Sesión invalidada detectada, redirigiendo...')
      sessionStorage.removeItem('prev_user_id')
      
      const currentPath = window.location.pathname
      if (currentPath !== '/login' && currentPath !== '/registro' && currentPath !== '/') {
        window.location.href = '/login?session_expired=true'
      }
    } else if (currentUser && currentUser !== previousUser) {
      // Actualizar el usuario previo cuando hay login
      sessionStorage.setItem('prev_user_id', currentUser)
    } else if (!currentUser && !previousUser) {
      // Usuario anónimo legítimo, no hacer nada
    }
  }, [data?.user?.id, isLoading])

  // ✅ SUPABASE REALTIME - Escuchar cambios del perfil en tiempo real
  React.useEffect(() => {
    if (!data?.user?.id) return

    console.log('🔄 Iniciando escucha Realtime para usuario:', data.user?.id)

    const subscription = supabase
      .channel('user_profile_changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${data.user?.id}`
      }, (payload) => {
        const newProfile = payload.new
        const oldProfile = payload.old
        
        console.log('🔄 Cambio detectado en tiempo real:', {
          de: oldProfile.subscription_status,
          a: newProfile.subscription_status,
          campos: newProfile
        })
        
        // ⚡ Actualizar estado inmediatamente
        mutateAuth(currentData => currentData ? ({
          ...currentData,
          subscriptionStatus: newProfile.subscription_status,
          isBanned: newProfile.is_banned,
          avatarUrl: newProfile.avatar_url,
          fullName: newProfile.full_name,
          specialty: newProfile.specialty,
          country: newProfile.country
        }) : currentData, false)
        
        // 🚨 ACCIONES AUTOMÁTICAS
        if (newProfile.is_banned && !oldProfile.is_banned) {
          console.log('🚫 Usuario baneado - redirigiendo...')
          window.location.href = '/banned'
        }
      })
      .subscribe()

    return () => {
      console.log('🔄 Desconectando Realtime para usuario:', data.user?.id)
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.user?.id, mutateAuth])

  // ✅ LISTENER PARA EVENTOS PERSONALIZADOS DE ACTUALIZACIÓN
  React.useEffect(() => {
    if (!data?.user?.id) return

    console.log('🎯 Configurando listener para eventos de actualización de suscripción')

    const handleSubscriptionUpdate = () => {
      console.log('🎯 Evento subscription-updated recibido - refrescando datos del usuario')
      console.log('🎯 Llamando mutateAuth() para revalidar datos...')
      // Forzar revalidación completa de los datos del usuario
      mutateAuth()
    }

    // Escuchar el evento personalizado
    window.addEventListener('subscription-updated', handleSubscriptionUpdate)

    return () => {
      window.removeEventListener('subscription-updated', handleSubscriptionUpdate)
    }
  }, [data?.user?.id, mutateAuth])

  const user = data?.user || null
  const session = data?.session || null
  const userType = data?.userType || 'anonymous'
  const subscriptionStatus = data?.subscriptionStatus || null
  const loading = isLoading
  const isBanned = data?.isBanned || false
  const avatarUrl = data?.avatarUrl || null
  const fullName = data?.fullName || null
  const specialty = data?.specialty || null
  const country = data?.country || null

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const result = await response.json()

      if (result.error) {
        return { 
          error: { 
            message: result.error,
            isBanned: result.isBanned || false
          } 
        }
      }

      // ✅ OBTENER DATOS COMPLETOS después del login (como signup)
      if (result.data) {
        console.log('🔄 Login exitoso, obteniendo datos completos del usuario...')
        
        // Hacer fetch completo para obtener todos los datos
        try {
          const { data: completeData } = await apiClient.get<AuthData>('/auth/session')
          if (completeData) {
            console.log('🔄 Actualizando AuthContext con datos completos del login:', completeData)
            mutateAuth(completeData, false)
          } else {
            // Fallback si falla el fetch completo
            mutateAuth(result.data, false)
          }
        } catch (error) {
          console.error('Error obteniendo datos completos:', error)
          // Fallback
          mutateAuth(result.data, false)
        }
      }

      return { error: null }
    } catch {
      return { error: { message: 'Network error' } }
    }
  }

  const signUp = async (email: string, password: string, fullName?: string, specialty?: string, country?: string, birthDate?: string, paymentReference?: string) => {
    try {
      const { data: authData, error } = await apiClient.post<AuthData>('/auth/signup', {
        email,
        password,
        fullName,
        specialty,
        country,
        birthDate,
        paymentReference,
      })

      if (error) {
        return { error: { message: error } }
      }

      // ✅ ACTUALIZAR CACHE INMEDIATAMENTE con todos los datos del signup
      if (authData) {
        console.log('🔄 Actualizando AuthContext con datos completos del signup:', authData)
        mutateAuth(authData, false)
      }

      return { error: null }
    } catch {
      return { error: { message: 'Network error' } }
    }
  }

  const signOut = async () => {
    try {
      await apiClient.post('/auth/logout', {})
      
      // Limpiar cache de auth inmediatamente
      mutateAuth(
        { user: null, session: null, userType: 'anonymous', subscriptionStatus: null, isBanned: false, avatarUrl: null, fullName: null, specialty: null, country: null },
        false
      )

      // Revalidar específicamente los endpoints de posts para el estado anónimo
      mutate('/posts?limit=5&orderBy=created_at&ascending=false')
      mutate('/posts?limit=5&orderBy=views_count&ascending=false')
      mutate('/posts?limit=5&orderBy=comments_count&ascending=false')
      
      // También revalidar el tracker anónimo
      mutate('/anonymous/track')
      
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const updateAvatar = (newAvatarUrl: string | null) => {
    if (data) {
      mutateAuth({ ...data, avatarUrl: newAvatarUrl }, false)
      
      // Revalidar todos los comentarios para que muestren el nuevo avatar
      // Esto invalida cualquier endpoint que comience con /posts/ y contenga /comments
      mutate(
        (key) => typeof key === 'string' && key.includes('/posts/') && key.includes('/comments'),
        undefined,
        { revalidate: true }
      )
    }
  }

  const value = {
    user,
    session,
    userType,
    subscriptionStatus,
    isBanned,
    avatarUrl,
    fullName,
    specialty,
    country,
    loading,
    signIn,
    signUp,
    signOut,
    updateAvatar,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}