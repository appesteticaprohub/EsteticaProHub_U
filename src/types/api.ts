// Tipos para la API
export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

// Tipos para Posts
export interface Post {
  id: string
  title: string
  content: string
  author_id: string
  created_at: string
  views_count: number
  likes_count: number
  comments_count: number
  category: string | null
}

export interface CreatePostRequest {
  title: string
  content: string
  category: string
  authorId: string
}

// Tipos para Likes
export interface Like {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

// Tipos para Profiles
export interface Profile {
  id: string
  email: string
  full_name: string | null
  created_at: string
  user_type: string
  subscription_status: string
}

// Tipos para Auth
export interface Session {
  access_token: string
  refresh_token: string
  expires_at: number
  user: {
    id: string
    email: string
  }
}

export interface AuthResponse {
  session: Session | null
  user: Profile | null
}