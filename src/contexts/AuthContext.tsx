'use client'

import React, { createContext, useContext } from 'react'
import useSWR, { mutate } from 'swr'
import { apiClient } from '@/lib/api-client'

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
}

interface AuthContextType {
  user: User | null
  session: Session | null
  userType: string | null
  subscriptionStatus: string | null
  isBanned: boolean
  avatarUrl: string | null
  fullName: string | null
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
  return data || { user: null, session: null, userType: 'anonymous', subscriptionStatus: null, isBanned: false, avatarUrl: null, fullName: null }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data, error, isLoading, mutate: mutateAuth } = useSWR<AuthData>(
    '/auth/session',
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 30000,
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

  const user = data?.user || null
  const session = data?.session || null
  const userType = data?.userType || 'anonymous'
  const subscriptionStatus = data?.subscriptionStatus || null
  const loading = isLoading
  const isBanned = data?.isBanned || false
  const avatarUrl = data?.avatarUrl || null
  const fullName = data?.fullName || null

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

      // Actualizar cache inmediatamente
      if (result.data) {
        mutateAuth(result.data, false)
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

    // Actualizar cache inmediatamente
    if (authData) {
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
        { user: null, session: null, userType: 'anonymous', subscriptionStatus: null, isBanned: false, avatarUrl: null, fullName: null },
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