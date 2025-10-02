import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // El método `setAll` fue llamado desde un componente Server.
            // Esto puede ser ignorado si tienes middleware refrescando
            // las cookies del usuario.
          }
        },
      },
    }
  )
}

// Función helper para verificar autenticación
export async function getServerSession() {
  const supabase = await createServerSupabaseClient()
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  } catch (error) {
    return { session: null, error }
  }
}

// Función helper para obtener el usuario actual
export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient()
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  } catch (error) {
    return { user: null, error }
  }
}

// Cliente admin que bypassa RLS - solo para operaciones del sistema
export function createServerSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}