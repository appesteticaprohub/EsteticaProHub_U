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
      // ✅ VALIDACIÓN: Verificar que al menos un campo tenga contenido
      const hasValidFilter = 
        (filters.title && filters.title.trim().length > 0) ||
        (filters.content && filters.content.trim().length > 0) ||
        (filters.author && filters.author.trim().length > 0) ||
        (filters.category && filters.category.length > 0) ||
        (filters.date_from && filters.date_from.length > 0) ||
        (filters.date_to && filters.date_to.length > 0)

      if (!hasValidFilter) {
        setError('Debes completar al menos un campo de búsqueda')
        setResults({
          posts: [],
          total: 0,
          page: 1,
          totalPages: 0
        })
        setLoading(false)
        return
      }

      // ✅ VALIDACIÓN: Longitud mínima para campos de texto
      if (filters.title && filters.title.trim().length > 0 && filters.title.trim().length < 2) {
        setError('El título debe tener al menos 2 caracteres')
        setLoading(false)
        return
      }

      if (filters.content && filters.content.trim().length > 0 && filters.content.trim().length < 2) {
        setError('El contenido debe tener al menos 2 caracteres')
        setLoading(false)
        return
      }

      if (filters.author && filters.author.trim().length > 0 && filters.author.trim().length < 2) {
        setError('El nombre del autor debe tener al menos 2 caracteres')
        setLoading(false)
        return
      }

      // Construir query params solo con valores válidos
      const params = new URLSearchParams()
      
      if (filters.title && filters.title.trim()) {
        params.append('title', filters.title.trim())
      }
      if (filters.content && filters.content.trim()) {
        params.append('content', filters.content.trim())
      }
      if (filters.author && filters.author.trim()) {
        params.append('author', filters.author.trim())
      }
      if (filters.category) params.append('category', filters.category)
      if (filters.date_from) params.append('date_from', filters.date_from)
      if (filters.date_to) params.append('date_to', filters.date_to)
      if (filters.page) params.append('page', filters.page.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.sort_by) params.append('sort_by', filters.sort_by)
      if (filters.sort_order) params.append('sort_order', filters.sort_order)

      console.log('🔍 Realizando búsqueda con params:', params.toString())

      const response = await fetch(`/api/posts/search?${params.toString()}`)
      const result = await response.json()

      if (result.error) {
        setError(result.error)
        setResults({
          posts: [],
          total: 0,
          page: filters.page || 1,
          totalPages: 0
        })
      } else if (result.data) {
        setResults(result.data)
        console.log('✅ Búsqueda exitosa:', {
          total: result.data.total,
          posts: result.data.posts.length,
          page: result.data.page
        })
      }
    } catch (err) {
      setError('Error al realizar la búsqueda. Intenta nuevamente.')
      console.error('Search error:', err)
      setResults({
        posts: [],
        total: 0,
        page: 1,
        totalPages: 0
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const clearResults = useCallback(() => {
        
    setResults({
      posts: [],
      total: 0,
      page: 1,
      totalPages: 0
    })
    setError(null)
    setLoading(false)
  }, [])

  const clearFilters = useCallback(() => {
    clearResults()
  }, [clearResults])

  return {
    results,
    loading,
    error,
    search,
    clearResults,
    clearFilters
  }
}