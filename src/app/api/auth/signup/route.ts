import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    // Usar service role para operaciones administrativas durante el signup
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { email, password, fullName, specialty, country, birthDate } = await request.json()
    
    if (!email || !password) {
      return NextResponse.json(
        { data: null, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: fullName,
    },
  },
})

if (error) {
  return NextResponse.json(
    { data: null, error: error.message },
    { status: 400 }
  )
}

// Si el registro fue exitoso y tenemos un usuario, actualizar el perfil
if (data.user) {
  const updateData: {
    full_name?: string;
    specialty?: string;
    country?: string;
    birth_date?: string;
  } = {}

  // Solo agregar campos si tienen valor
  if (fullName) updateData.full_name = fullName
  if (specialty) updateData.specialty = specialty
  if (country) updateData.country = country
  if (birthDate) updateData.birth_date = birthDate

  // Actualizar el perfil existente (creado por trigger)
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update(updateData)
    .eq('id', data.user.id)

  if (profileError) {
    console.error('Error updating profile:', profileError)
  }
}

return NextResponse.json({
  data: {
    user: data.user,
    session: data.session
  },
  error: null
})

  } catch (error) {
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}