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
    const { email, password, fullName, specialty, country, birthDate, paymentReference } = await request.json()
    
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

  // Asociar payment session con el nuevo usuario si existe paymentReference
  if (paymentReference) {
    const { error: sessionError } = await supabaseAdmin
      .from('payment_sessions')
      .update({ user_id: data.user.id })
      .eq('external_reference', paymentReference)

    if (sessionError) {
      console.error('Error associating payment session with user:', sessionError)
    } else {
      console.log('Payment session associated with user:', data.user.id)
      
      // Verificar si la sesión está pagada y actualizar perfil del usuario
      const { data: sessionData, error: sessionFetchError } = await supabaseAdmin
        .from('payment_sessions')
        .select('status, subscription_type')
        .eq('external_reference', paymentReference)
        .single()

      if (!sessionFetchError && sessionData && sessionData.status === 'paid') {
        // Calcular fecha de expiración (1 mes desde ahora)
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + 1);

        const { error: profileSubscriptionError } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_status: 'Active',
            subscription_expires_at: expirationDate.toISOString(),
            user_type: 'premium'
          })
          .eq('id', data.user.id)

        if (profileSubscriptionError) {
          console.error('Error updating profile subscription info:', profileSubscriptionError)
        } else {
          console.log('Profile updated with subscription info for user:', data.user.id)
        }
      }
    }
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