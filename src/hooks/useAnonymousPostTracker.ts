'use client'

import useSWR from 'swr'
import { apiClient } from '@/lib/api-client'

interface AnonymousData {
  viewedPostsCount: number
  hasReachedLimit: boolean
}

// Fetcher function para SWR
const fetcher = async (url: string): Promise<AnonymousData> => {
  const { data, error } = await apiClient.get<AnonymousData>(url)
  if (error) throw new Error(error)
  return data || { viewedPostsCount: 0, hasReachedLimit: false }
}

export function useAnonymousPostTracker() {
  const { data, mutate: mutateTracker } = useSWR<AnonymousData>(
    '/anonymous/track',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  const viewedPostsCount = data?.viewedPostsCount || 0
  const hasReachedLimit = data?.hasReachedLimit || false

  const incrementViewedPosts = async () => {
    try {
      const { data: newData, error } = await apiClient.post<AnonymousData>(
        '/anonymous/track',
        {}
      )

      if (!error && newData) {
        // Actualizar cache inmediatamente
        mutateTracker(newData, false)
      }
    } catch (error) {
      console.error('Error incrementing viewed posts:', error)
    }
  }

  const resetViewedPosts = async () => {
    // Esta funcionalidad se podría implementar si es necesaria
    console.log('Reset not implemented in server-side version')
  }

  return {
    viewedPostsCount,
    incrementViewedPosts,
    resetViewedPosts,
    hasReachedLimit
  }
}