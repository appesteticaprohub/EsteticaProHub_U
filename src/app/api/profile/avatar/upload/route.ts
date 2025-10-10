import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { uploadAvatar, validateAvatarFile, extractAvatarPathFromUrl, deleteAvatar } from '@/lib/avatar-storage'

export async function POST(request: NextRequest) {
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

    // Obtener el archivo del FormData
    const formData = await request.formData()
    const file = formData.get('avatar') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      )
    }

    // Validar el archivo
    const validation = validateAvatarFile(file, file.type, file.size)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Obtener el avatar actual del usuario para eliminarlo después
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single()

    // Convertir el archivo a Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Subir el nuevo avatar
    const { url, path } = await uploadAvatar(buffer, user.id, file.type)

    // Actualizar la URL del avatar en el perfil
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: url })
      .eq('id', user.id)

    if (updateError) {
      // Si falla la actualización, intentar eliminar el archivo subido
      await deleteAvatar(path).catch(() => {})
      throw new Error(`Error al actualizar perfil: ${updateError.message}`)
    }

    // Eliminar el avatar anterior si existía
    if (profile?.avatar_url) {
      const oldPath = extractAvatarPathFromUrl(profile.avatar_url)
      if (oldPath) {
        await deleteAvatar(oldPath).catch(() => {
          // Ignorar errores al eliminar avatar anterior
        })
      }
    }

    return NextResponse.json({
      data: { avatar_url: url },
      error: null
    })

  } catch (error) {
    console.error('Error en upload avatar:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al subir avatar' },
      { status: 500 }
    )
  }
}