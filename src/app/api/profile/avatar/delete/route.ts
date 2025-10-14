import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { deleteAvatar, extractAvatarPathFromUrl } from '@/lib/avatar-storage'

export async function DELETE() {
  try {
    // Verificar autenticación
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener el avatar actual del usuario
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single()

    if (fetchError) {
      throw new Error(`Error al obtener perfil: ${fetchError.message}`)
    }

    if (!profile?.avatar_url) {
      return NextResponse.json(
        { error: 'No hay avatar para eliminar' },
        { status: 400 }
      )
    }

    // Extraer el path del avatar
    const avatarPath = extractAvatarPathFromUrl(profile.avatar_url)
    
    if (!avatarPath) {
      return NextResponse.json(
        { error: 'URL de avatar inválida' },
        { status: 400 }
      )
    }

    // Eliminar el avatar del storage
    await deleteAvatar(avatarPath)

    // Actualizar el perfil para quitar la URL del avatar
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', user.id)

    if (updateError) {
      throw new Error(`Error al actualizar perfil: ${updateError.message}`)
    }

    return NextResponse.json({
      data: { success: true },
      error: null
    })

  } catch (error) {
    console.error('Error en delete avatar:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al eliminar avatar' },
      { status: 500 }
    )
  }
}