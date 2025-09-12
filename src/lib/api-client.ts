// Cliente HTTP para hacer requests a nuestras API routes
export class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T | null; error: string | null }> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        return { data: null, error: errorData.error || `HTTP ${response.status}` }
      }

      const result = await response.json()
      // Si la respuesta ya tiene estructura { data, error }, extraemos solo data
      if (result && typeof result === 'object' && 'data' in result && 'error' in result) {
        return { data: result.data, error: result.error }
      }
      // Si no, devolvemos la respuesta tal como está
      return { data: result, error: null }
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Network error' 
      }
    }
  }

  // Métodos GET
  async get<T>(endpoint: string): Promise<{ data: T | null; error: string | null }> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  // Métodos POST
  async post<T>(
    endpoint: string, 
    body: Record<string, unknown>
  ): Promise<{ data: T | null; error: string | null }> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  // Métodos PUT
  async put<T>(
    endpoint: string, 
    body: Record<string, unknown>
  ): Promise<{ data: T | null; error: string | null }> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  // Métodos PATCH
  async patch<T>(
    endpoint: string, 
    body: Record<string, unknown>
  ): Promise<{ data: T | null; error: string | null }> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  }

  // Métodos DELETE
  async delete<T>(endpoint: string): Promise<{ data: T | null; error: string | null }> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

// Instancia global del cliente
export const apiClient = new ApiClient()