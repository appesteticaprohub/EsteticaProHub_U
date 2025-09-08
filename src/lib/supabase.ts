import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Para compatibilidad con el código existente
export const supabase = createClient()

// Función para crear un nuevo post
export async function createPost({
  title,
  content,
  category,
  authorId
}: {
  title: string
  content: string
  category: string
  authorId: string
}) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('posts')
    .insert({
      title,
      content,
      category,
      author_id: authorId
    })
    .select()
    .single()

  return { data, error }
}