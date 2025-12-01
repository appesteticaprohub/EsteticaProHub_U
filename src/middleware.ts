import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { 
  getUserProfileForMiddleware, 
  isSubscriptionExpired, 
  updateExpiredSubscription,
  isInGracePeriod,
  hasPriceChangedSinceLastPayment
} from '@/lib/subscription-utils'

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

  // Definir rutas con lógica inteligente
  const publicRoutes = ['/', '/login', '/olvidaste-contrasena', '/restablecer-contrasena']
  const postRoutes = ['/post'] // Rutas de posts - no son públicas para usuarios autenticados
  const authRoutes = ['/login']
  const registrationRoute = '/registro'
  const fullyProtectedRoutes = ['/perfil']  // Solo perfil requiere login obligatorio
  const subscriptionVerificationRoutes = ['/crear-post', '/post', '/suscripcion', '/busqueda']  // Verifican suscripción si hay usuario autenticado
  
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route)
  )
  
// Los posts NO son públicos si hay usuario autenticado
const isPostRoute = postRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )
  
// Si es ruta de post y hay usuario, no es pública
const isActuallyPublic = isPublicRoute && !(user && isPostRoute)
  
  const isAuthRoute = authRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  const isRegistrationRoute = request.nextUrl.pathname.startsWith(registrationRoute)
  
  const isFullyProtected = fullyProtectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )
  
  // Rutas que verifican suscripción cuando hay usuario autenticado
  const needsSubscriptionCheck = subscriptionVerificationRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Rutas que requieren login obligatorio
  if (isFullyProtected && !user) {
    console.log('Redirigiendo a login - ruta que requiere autenticación')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ✅ OPTIMIZACIÓN: Solo hacer validaciones complejas donde se necesitan
  // Para páginas públicas con usuario autenticado: NO consultar BD (AuthContext maneja los datos)
  if (user && (!isActuallyPublic || needsSubscriptionCheck) && (isFullyProtected || needsSubscriptionCheck)) {
    console.log('Verificando suscripción para usuario en página protegida:', user.email)
    
    try {
      // ✅ UNA SOLA consulta consolidada con campos específicos
      const profile = await getUserProfileForMiddleware(user.id)
      let priceChangedFlag = false
      
      if (profile) {
        console.log('Perfil encontrado:', {
          status: profile.subscription_status,
          expiresAt: profile.subscription_expires_at
        })
        
        // Manejar diferentes estados de suscripción con validaciones mínimas
        if (profile.subscription_status === 'Active' && 
            isSubscriptionExpired(profile.subscription_expires_at)) {
          
          console.log('Suscripción Active expirada, actualizando a Expired...')
          await updateExpiredSubscription(user.id)
          
          // 🆕 DETECTAR SI HUBO CAMBIO DE PRECIO
          priceChangedFlag = await hasPriceChangedSinceLastPayment(user.id)
          
        } else if (profile.subscription_status === 'Grace_Period' && 
                   profile.grace_period_ends && 
                   !isInGracePeriod(profile.grace_period_ends)) {
          
          console.log('Período de gracia expirado, actualizando a Expired...')
          await updateExpiredSubscription(user.id)
          
          // 🆕 DETECTAR SI HUBO CAMBIO DE PRECIO
          priceChangedFlag = await hasPriceChangedSinceLastPayment(user.id)
          
        } else if (profile.subscription_status === 'Cancelled' && 
           isSubscriptionExpired(profile.subscription_expires_at)) {
          
          console.log('Suscripción Cancelled expirada, actualizando a Expired...')
          await updateExpiredSubscription(user.id)
          
          // 🆕 DETECTAR SI HUBO CAMBIO DE PRECIO
          priceChangedFlag = await hasPriceChangedSinceLastPayment(user.id)
          
        } else if (profile.subscription_status === 'Price_Change_Cancelled' && 
           isSubscriptionExpired(profile.subscription_expires_at)) {
          
          console.log('Suscripción Price_Change_Cancelled expirada, actualizando a Expired...')
          await updateExpiredSubscription(user.id)
          
          // 🆕 DETECTAR SI HUBO CAMBIO DE PRECIO
          priceChangedFlag = await hasPriceChangedSinceLastPayment(user.id)
        }
        
        // 🆕 AGREGAR FLAG EN HEADERS PARA QUE FRONTEND LO DETECTE
        if (priceChangedFlag) {
          console.log('🔄 Flag de cambio de precio detectado - agregando a headers')
          response.headers.set('x-price-changed', 'true')
        }
        
        // ✅ Estados como Payment_Failed y Suspended solo se registran, UI los maneja
        if (profile.subscription_status === 'Payment_Failed') {
          console.log('Usuario con pago fallido detectado - UI manejará recovery')
        } else if (profile.subscription_status === 'Suspended' && 
           isSubscriptionExpired(profile.subscription_expires_at)) {
  
          console.log('Suscripción Suspended expirada, actualizando a Expired...')
          await updateExpiredSubscription(user.id)
          
        } else if (profile.subscription_status === 'Suspended') {
          console.log('Usuario con suscripción suspendida - UI manejará recovery')  
        }
        
      } else {
        console.log('No se pudo obtener el perfil del usuario para middleware')
      }
    } catch (error) {
      console.error('Error en verificación de suscripción:', error)
    }
  } else if (user && isPublicRoute) {
    console.log('Debug middleware - isPublicRoute:', isPublicRoute, 'needsSubscriptionCheck:', needsSubscriptionCheck, 'ruta:', request.nextUrl.pathname)
    console.log('✅ Usuario en página pública - sin validaciones BD (AuthContext maneja datos)')
  } else if (!user) {
    console.log('✅ Usuario anónimo - sin consultas BD innecesarias')
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