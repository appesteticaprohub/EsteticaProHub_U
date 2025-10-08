'use client'
import { useState, useCallback } from 'react'
import { Post } from '@/types/api'

interface SearchFilters {
  title?: string
  content?: string
  author?: string
  category?: string
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

interface SearchResults {
  posts: (Post & { author?: { id: string; full_name: string | null; email: string } })[]
  total: number
  page: number
  totalPages: number
}

export function useSearch() {
  const [results, setResults] = useState<SearchResults>({
    posts: [],
    total: 0,
    page: 1,
    totalPages: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (filters: SearchFilters) => {
    setLoading(true)
    setError(null)

    try {
      // Construir query params
      const params = new URLSearchParams()
      
      if (filters.title) params.append('title', filters.title)
      if (filters.content) params.append('content', filters.content)
      if (filters.author) params.append('author', filters.author)
      if (filters.category) params.append('category', filters.category)
      if (filters.date_from) params.append('date_from', filters.date_from)
      if (filters.date_to) params.append('date_to', filters.date_to)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.sort_by) params.append('sort_by', filters.sort_by)
      if (filters.sort_order) params.append('sort_order', filters.sort_order)

      const response = await fetch(`/api/posts/search?${params.toString()}`)
      const result = await response.json()

      if (result.error) {
        setError(result.error)
        setResults({
          posts: [],
          total: 0,
          page: 1,
          totalPages: 0
        })
      } else if (result.data) {
        setResults(result.data)
      }
    } catch (err) {
      setError('Error al realizar la búsqueda')
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const clearFilters = useCallback(() => {
    setResults({
      posts: [],
      total: 0,
      page: 1,
      totalPages: 0
    })
    setError(null)
  }, [])

  return {
    results,
    loading,
    error,
    search,
    clearFilters
  }
}