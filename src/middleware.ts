import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
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

  // Manejar recuperación de contraseña
  if (request.nextUrl.pathname === '/' && request.nextUrl.searchParams.has('code')) {
    const code = request.nextUrl.searchParams.get('code')
    const redirectUrl = new URL('/restablecer-contrasena', request.url)
    redirectUrl.searchParams.set('code', code!)
    return NextResponse.redirect(redirectUrl)
  }

  // Permitir acceso directo a /banned
  const isBannedPage = request.nextUrl.pathname === '/banned'
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')

  if (isBannedPage) {
    return response
  }

  // Definir rutas
  const publicRoutes = ['/', '/login', '/olvidaste-contrasena', '/restablecer-contrasena']
  const postRoutes = ['/post']
  const authRoutes = ['/login']
  const registrationRoute = '/registro'
  const fullyProtectedRoutes = ['/perfil']
  const subscriptionVerificationRoutes = ['/crear-post', '/post', '/suscripcion', '/busqueda']

  const isPublicRoute = publicRoutes.some(route =>
    request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith(route)
  )

  const isPostRoute = postRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  const isActuallyPublic = isPublicRoute && !(user && isPostRoute)

  const isAuthRoute = authRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  const isRegistrationRoute = request.nextUrl.pathname.startsWith(registrationRoute)

  const isFullyProtected = fullyProtectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  const needsSubscriptionCheck = subscriptionVerificationRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  // Rutas que requieren login obligatorio
  if (isFullyProtected && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // VALIDACIÓN CONSOLIDADA — una sola query a profiles por request
  if (user) {
    try {
      const profile = await getUserProfileForMiddleware(user.id)

      // Si el usuario no existe en profiles, invalidar sesión
      if (!profile) {
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/login?session_expired=true', request.url))
      }

      // VALIDACIÓN DE BANEO — prioridad máxima (solo rutas de páginas)
      if (profile.is_banned === true && !isApiRoute) {
        return NextResponse.redirect(new URL('/banned', request.url))
      }

      // VALIDACIÓN DE SUSCRIPCIÓN — solo en rutas que la requieren
      if ((!isActuallyPublic || needsSubscriptionCheck) && (isFullyProtected || needsSubscriptionCheck)) {
        let priceChangedFlag = false

        if (profile.subscription_status === 'Active' &&
          isSubscriptionExpired(profile.subscription_expires_at)) {

          await updateExpiredSubscription(user.id)
          priceChangedFlag = await hasPriceChangedSinceLastPayment(user.id)

        } else if (profile.subscription_status === 'Grace_Period' &&
          profile.grace_period_ends &&
          !isInGracePeriod(profile.grace_period_ends)) {

          await updateExpiredSubscription(user.id)
          priceChangedFlag = await hasPriceChangedSinceLastPayment(user.id)

        } else if (profile.subscription_status === 'Cancelled' &&
          isSubscriptionExpired(profile.subscription_expires_at)) {

          await updateExpiredSubscription(user.id)
          priceChangedFlag = await hasPriceChangedSinceLastPayment(user.id)

        } else if (profile.subscription_status === 'Price_Change_Cancelled' &&
          isSubscriptionExpired(profile.subscription_expires_at)) {

          await updateExpiredSubscription(user.id)
          priceChangedFlag = await hasPriceChangedSinceLastPayment(user.id)

        } else if (profile.subscription_status === 'Suspended' &&
          isSubscriptionExpired(profile.subscription_expires_at)) {

          await updateExpiredSubscription(user.id)
        }

        if (priceChangedFlag) {
          response.headers.set('x-price-changed', 'true')
        }
      }

    } catch (error) {
      console.error('Error en middleware:', error)
      await supabase.auth.signOut()
      return NextResponse.redirect(new URL('/login?error=validation', request.url))
    }
  }

  // Si ya está autenticado y trata de acceder a login
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Para registro, permitir usuarios autenticados solo si vienen de un pago
  if (isRegistrationRoute && user) {
    const hasPaymentRef = request.nextUrl.searchParams.has('ref')
    if (!hasPaymentRef) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}