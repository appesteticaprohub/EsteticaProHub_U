'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import useSWR, { mutate } from 'swr'
import { apiClient } from '@/lib/api-client'

interface User {
  id: string
  email: string
  user_metadata?: any
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
}

interface AuthContextType {
  user: User | null
  session: Session | null
  userType: string | null
  subscriptionStatus: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, fullName?: string, specialty?: string, country?: string, birthDate?: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Fetcher function para SWR
const fetcher = async (url: string): Promise<AuthData> => {
  const { data, error } = await apiClient.get<AuthData>(url)
  if (error) throw new Error(error)
  return data || { user: null, session: null, userType: 'anonymous', subscriptionStatus: null }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data, error, isLoading, mutate: mutateAuth } = useSWR<AuthData>(
    '/auth/session',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 0,
    }
  )

  const user = data?.user || null
  const session = data?.session || null
  const userType = data?.userType || 'anonymous'
  const subscriptionStatus = data?.subscriptionStatus || null
  const loading = isLoading

  const signIn = async (email: string, password: string) => {
    try {
      const { data: authData, error } = await apiClient.post<AuthData>('/auth/login', {
        email,
        password,
      })

      if (error) {
        return { error: { message: error } }
      }

      // Actualizar cache inmediatamente
      if (authData) {
        mutateAuth(authData, false)
      }

      return { error: null }
    } catch (error) {
      return { error: { message: 'Network error' } }
    }
  }

  const signUp = async (email: string, password: string, fullName?: string, specialty?: string, country?: string, birthDate?: string) => {
  try {
    const { data: authData, error } = await apiClient.post<AuthData>('/auth/signup', {
      email,
      password,
      fullName,
      specialty,
      country,
      birthDate,
    })

    if (error) {
      return { error: { message: error } }
    }

    // Actualizar cache inmediatamente
    if (authData) {
      mutateAuth(authData, false)
    }

    return { error: null }
  } catch (error) {
    return { error: { message: 'Network error' } }
  }
}

  const signOut = async () => {
    try {
      await apiClient.post('/auth/logout', {})
      
      // Limpiar cache de auth inmediatamente
      mutateAuth(
        { user: null, session: null, userType: 'anonymous', subscriptionStatus: null },
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

  const value = {
    user,
    session,
    userType,
    subscriptionStatus,
    loading,
    signIn,
    signUp,
    signOut,
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