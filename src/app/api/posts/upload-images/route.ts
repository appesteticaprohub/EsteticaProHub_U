import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/server-supabase'
import { uploadImage } from '@/lib/storage-client'
import { validateImage, fileToBuffer } from '@/lib/image-utils'
import { createServerSupabaseClient } from '@/lib/server-supabase'

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const { user, error: authError } = await getCurrentUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener configuración de imágenes
    const supabase = await createServerSupabaseClient()
    const { data: settings, error: settingsError } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'image_settings')
      .single()

    if (settingsError || !settings) {
      return NextResponse.json(
        { error: 'Error al obtener configuración' },
        { status: 500 }
      )
    }

    // Parsear el valor si es string JSON
    const imageSettings = typeof settings.value === 'string' 
      ? JSON.parse(settings.value) 
      : settings.value

    const {
      max_images_per_post,
      max_image_size_mb,
      allowed_formats
    } = imageSettings

    // Validar que la configuración existe
    if (!allowed_formats || !Array.isArray(allowed_formats)) {
      return NextResponse.json(
        { error: 'Configuración de imágenes inválida' },
        { status: 500 }
      )
    }

    // Obtener archivos del FormData
    const formData = await request.formData()
    const files = formData.getAll('images') as File[]

    // Validar cantidad de imágenes
    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No se enviaron imágenes' },
        { status: 400 }
      )
    }

    if (files.length > max_images_per_post) {
      return NextResponse.json(
        { error: `Máximo ${max_images_per_post} imágenes por post` },
        { status: 400 }
      )
    }

    // Validar cada imagen
    for (const file of files) {
      const validation = validateImage(file, max_image_size_mb, allowed_formats)
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        )
      }
    }

    // Subir imágenes
    const uploadPromises = files.map(async (file) => {
      const buffer = await fileToBuffer(file)
      return uploadImage(buffer, user.id, file.name)
    })

    const results = await Promise.all(uploadPromises)
    const urls = results.map(result => result.url)

    return NextResponse.json({
      urls,
      message: 'Imágenes subidas exitosamente'
    })

  } catch (error) {
    console.error('Error en upload-images:', error)
    return NextResponse.json(
      { error: 'Error al subir imágenes' },
      { status: 500 }
    )
  }
}