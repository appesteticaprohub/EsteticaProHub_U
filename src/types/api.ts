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
  images: string[] // NUEVO: Array de URLs de imágenes
}

export interface CreatePostRequest {
  title: string
  content: string
  category: string
  authorId: string
  images?: string[] // NUEVO: URLs de imágenes (opcional)
}

// Tipos para Likes
export interface Like {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  parent_id: string | null
  is_deleted: boolean
  deleted_at: string | null
  profiles?: {
    full_name: string | null
    email: string
  }
  replies?: Comment[]
}

// Tipos para respuesta paginada de comentarios
export interface PaginatedCommentsResponse {
  data: Comment[]
  error: string | null
  nextCursor: string | null
}

// Tipos para Profiles
export interface Profile {
  id: string
  email: string
  full_name: string | null
  created_at: string
  user_type: string
  subscription_status: string
  avatar_url: string | null
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

// Tipos para Notificaciones
export interface Notification {
  id: string
  user_id: string
  type: 'email' | 'in_app'
  category: 'critical' | 'important' | 'normal' | 'promotional'
  title: string
  message: string
  cta_text: string | null
  cta_url: string | null
  is_read: boolean
  expires_at: string | null
  created_at: string
  created_by_admin_id: string | null
}

export interface EmailTemplate {
  id: string
  template_key: string
  subject: string
  html_content: string
  is_active: boolean
  is_system: boolean
  created_at: string
  updated_at: string
}

export interface EmailLog {
  id: string
  user_id: string
  template_key: string
  email: string
  status: 'sent' | 'failed' | 'delivered'
  resend_id: string | null
  error_message: string | null
  sent_at: string
}

export interface NotificationPreferences {
  user_id: string
  email_promotional: boolean
  email_content: boolean
  email_administrative: boolean
  in_app_notifications: boolean
  created_at: string
  updated_at: string
}

export interface NewsletterSettings {
  id: string
  is_enabled: boolean
  last_sent_at: string | null
  posts_to_include: number
  created_at: string
  updated_at: string
}

// Tipos para requests de notificaciones
export interface CreateNotificationRequest {
  user_id?: string
  type: 'email' | 'in_app'
  category: 'critical' | 'important' | 'normal' | 'promotional'
  title: string
  message: string
  cta_text?: string
  cta_url?: string
  expires_at?: string
}

export interface UpdateNotificationPreferencesRequest {
  email_promotional?: boolean
  email_content?: boolean
  in_app_notifications?: boolean
}

export interface NotificationFilters {
  type?: 'email' | 'in_app'
  category?: 'critical' | 'important' | 'normal' | 'promotional'
  is_read?: boolean
  limit?: number
  offset?: number
}

export interface AuthResponse {
  session: Session | null
  user: Profile | null
}

// Tipos para gestión de imágenes
export interface ImageSettings {
  max_images_per_post: number
  max_image_size_mb: number
  allowed_formats: string[]
  compression_quality: number
  max_width: number
  max_height: number
}

export interface ImageUploadResponse {
  urls: string[]
  error?: string
}

export interface StorageStats {
  total_images: number
  storage_used_mb: number
  images_this_month: number
  average_images_per_post: number
}

// Tipos para configuración de la aplicación
export interface AppSettings {
  max_images_per_post?: number
  max_image_size_mb?: number
  allowed_formats?: string[]
  compression_quality?: number
  max_width?: number
  max_height?: number
  [key: string]: number | string | string[] | boolean | undefined
}

// Tipos para gestión de avatares
export interface AvatarUploadResponse {
  avatar_url: string
}

export interface AvatarSettings {
  max_avatar_size_mb: number
  allowed_formats: string[]
  max_width: number
  max_height: number
}