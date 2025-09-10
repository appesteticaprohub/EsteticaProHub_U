import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { Comment } from '@/types/api'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    
    const supabase = await createServerSupabaseClient()
    
    const { data: commentsData, error } = await supabase
      .from('comments')
      .select(`
        id,
        post_id,
        user_id,
        content,
        created_at,
        profiles!inner (
          full_name,
          email
        )
      `)
      .eq('post_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json(
        { data: null, error: 'Error al obtener comentarios' },
        { status: 500 }
      )
    }

    const comments: Comment[] = commentsData?.map((comment: any) => ({
      id: comment.id,
      post_id: comment.post_id,
      user_id: comment.user_id,
      content: comment.content,
      created_at: comment.created_at,
      profiles: Array.isArray(comment.profiles) 
        ? comment.profiles[0] 
        : comment.profiles
    })) || []

    return NextResponse.json({ data: comments, error: null })
    
  } catch (error) {
    console.error('Error in comments API:', error)
    return NextResponse.json(
      { data: null, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}