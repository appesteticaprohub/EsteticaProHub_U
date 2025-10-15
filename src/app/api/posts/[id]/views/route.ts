import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { id } = await params

    // Primero obtener el valor actual
    const { data: currentPost, error: fetchError } = await supabase
      .from('posts')
      .select('views_count')
      .eq('id', id)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { data: null, error: fetchError.message },
        { status: 400 }
      )
    }

    // Incrementar en la base de datos
    const { data, error } = await supabase
      .from('posts')
      .update({ views_count: currentPost.views_count + 1 })
      .eq('id', id)
      .select(`
        *,
        author:profiles!posts_author_id_fkey (
          full_name,
          email,
          avatar_url,
          specialty,
          country
        )
      `)
      .single()

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}