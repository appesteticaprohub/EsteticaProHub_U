import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
  data: { user },
} = await supabase.auth.getUser()

// Manejar recuperación de contraseña - Solo redirigir sin autenticar
if (request.nextUrl.pathname === '/' && request.nextUrl.searchParams.has('code')) {
  const code = request.nextUrl.searchParams.get('code')
  console.log('🔑 Detectado código de recuperación - redirigiendo sin autenticar')
  
  // Redirigir a restablecer-contrasena preservando el código
  const redirectUrl = new URL('/restablecer-contrasena', request.url)
  redirectUrl.searchParams.set('code', code!)
  
  return NextResponse.redirect(redirectUrl)
}

// Permitir acceso a /banned y rutas API sin validación de baneo
  const isBannedPage = request.nextUrl.pathname === '/banned'
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')
  
  if (isBannedPage) {
    console.log('✅ Permitiendo acceso directo a /banned')
    return response
  }

  // VALIDACIÓN CRÍTICA: Verificar que el usuario existe en profiles y no está baneado
  if (user) {
    try {
      const supabaseServer = await createServerSupabaseClient()
      const { data: profile, error: profileError } = await supabaseServer
        .from('profiles')
        .select('id, is_banned, role')
        .eq('id', user.id)
        .single()

      // Si el usuario no existe en profiles, invalidar sesión
      if (profileError || !profile) {
        console.log('⚠️ Usuario eliminado detectado - invalidando sesión')
        
        // Destruir la sesión
        await supabase.auth.signOut()
        
        // Redirigir a login
        return NextResponse.redirect(new URL('/login?session_expired=true', request.url))
      }

      // VALIDACIÓN DE BANEO - PRIORIDAD MÁXIMA (solo para rutas de páginas)
      if (profile.is_banned === true && !isApiRoute && !isBannedPage) {
        console.log('🚫 Usuario baneado detectado - redirigiendo a /banned')
        
        // Redirigir a /banned
        return NextResponse.redirect(new URL('/banned', request.url))
      }

      console.log('Usuario en middleware:', user.email || 'No autenticado')
      console.log('Perfil validado:', profile.role)
    } catch (error) {
      console.error('Error validando perfil:', error)
      // En caso de error, cerrar sesión por seguridad
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/login?error=validation', request.url))
    }
  } else {
    console.log('Usuario en middleware: No autenticado')
  }

  console.log('Ruta visitada:', request.nextUrl.pathname)

  // Definir rutas
  const authRoutes = ['/login']
  const registrationRoute = '/registro'
  const fullyProtectedRoutes = ['/perfil']  // Solo perfil requiere login obligatorio
  const subscriptionVerificationRoutes = ['/crear-post', '/post', '/suscripcion', '/busqueda']  // Verifican suscripción si hay usuario autenticado
  
  const isAuthRoute = authRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  const isRegistrationRoute = request.nextUrl.pathname.startsWith(registrationRoute)
  
  const isFullyProtected = fullyProtectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )
  
  // Rutas de búsqueda también verifican suscripción
  const needsSubscriptionCheck = subscriptionVerificationRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Rutas que requieren login obligatorio
  if (isFullyProtected && !user) {
    console.log('Redirigiendo a login - ruta que requiere autenticación')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Verificación de suscripciones para rutas específicas cuando hay usuario
  if ((isFullyProtected || needsSubscriptionCheck) && user) {
    console.log('Verificando suscripción para usuario:', user.email)
    
    try {
      // Importar las funciones de verificación
      const { getUserProfile, isSubscriptionExpired, updateExpiredSubscription } = await import('@/lib/subscription-utils')
      
      const profile = await getUserProfile(user.id)
      
      if (profile) {
        console.log('Perfil encontrado:', {
          status: profile.subscription_status,
          expiresAt: profile.subscription_expires_at
        })
        
        // Importar nuevas funciones para estados avanzados
        const { isInGracePeriod } = await import('@/lib/subscription-utils')
        
        // Manejar diferentes estados de suscripción
        if (profile.subscription_status === 'Active' && 
            isSubscriptionExpired(profile.subscription_expires_at)) {
          
          console.log('Suscripción Active expirada, actualizando a Expired...')
          await updateExpiredSubscription(user.id)
          
        } else if (profile.subscription_status === 'Grace_Period' && 
                   profile.grace_period_ends && 
                   !isInGracePeriod(profile.grace_period_ends)) {
          
          console.log('Período de gracia expirado, actualizando a Expired...')
          await updateExpiredSubscription(user.id)
          
        } else if (profile.subscription_status === 'Payment_Failed') {
          
          console.log('Usuario con pago fallido detectado - UI manejará recovery')
          
        } else if (profile.subscription_status === 'Suspended') {
          
          console.log('Usuario con suscripción suspendida detectado')
          
        } else if (profile.subscription_status === 'Cancelled' && 
           isSubscriptionExpired(profile.subscription_expires_at)) {
          
          console.log('Suscripción Cancelled expirada, actualizando a Expired...')
          await updateExpiredSubscription(user.id)
        }
        
        // Permitir acceso - las páginas manejarán el UI para usuarios expirados
      } else {
        console.log('No se pudo obtener el perfil del usuario')
      }
    } catch (error) {
      console.error('Error en verificación de suscripción:', error)
    }
  }

  // Si ya está autenticado y trata de acceder a login, redirigir a home
  if (isAuthRoute && user) {
    console.log('Redirigiendo a home - usuario autenticado en ruta de auth')
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Para registro, permitir usuarios autenticados si vienen de un pago (tienen parámetro ref)
  if (isRegistrationRoute && user) {
    const hasPaymentRef = request.nextUrl.searchParams.has('ref')
    if (!hasPaymentRef) {
      console.log('Redirigiendo a home - usuario autenticado en registro sin ref de pago')
      return NextResponse.redirect(new URL('/', request.url))
    }
    console.log('Permitiendo acceso a registro - usuario autenticado con ref de pago')
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}