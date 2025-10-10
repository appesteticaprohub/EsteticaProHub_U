import { createServerSupabaseClient, createServerSupabaseAdminClient } from './server-supabase'
import { sendEmailWithTemplate } from './resend'
import type { CreateNotificationRequest } from '@/types/api'

export class NotificationService {
  
  // Crear notificación in-app
  static async createInAppNotification(data: CreateNotificationRequest) {
    try {
      const supabase = await createServerSupabaseClient()
      
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert({
          user_id: data.user_id,
          type: 'in_app',
          category: data.category,
          title: data.title,
          message: data.message,
          cta_text: data.cta_text,
          cta_url: data.cta_url,
          expires_at: data.expires_at
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Error al crear notificación:', error);
        throw new Error(error.message)
      }

      if (!notification) {
        console.error('❌ Notificación no retornada pero sin error');
        throw new Error('Notification not returned')
      }

      console.log('✅ Notificación creada exitosamente:', notification.id);

      return { success: true, data: notification, error: null }

    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

  // Enviar email de bienvenida
  static async sendWelcomeEmail(userId: string, userEmail: string, userName: string) {
    const variables = {
      nombre: userName,
      email: userEmail,
      app_url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    }

    return await sendEmailWithTemplate('welcome', userEmail, userId, variables)
  }

  // Enviar notificación de cambio de precio
  static async sendPriceChangeNotification(newPrice: string) {
    try {
      const supabase = createServerSupabaseAdminClient()

      // Obtener todos los usuarios activos
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('subscription_status', 'Active')

      if (error || !users) {
        throw new Error('Error obteniendo usuarios activos')
      }

      const results = {
        emails_sent: 0,
        notifications_created: 0,
        errors: 0
      }

      // Enviar a cada usuario
      for (const user of users) {
        try {
          // Crear notificación in-app persistente
          await this.createInAppNotification({
            user_id: user.id,
            type: 'in_app',
            category: 'critical',
            title: 'Actualización de Precios',
            message: `El precio de suscripción ha sido actualizado a $${newPrice}. Este cambio será efectivo para nuevas suscripciones y renovaciones.`,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 días
          })
          results.notifications_created++

          // Enviar email
          const emailResult = await sendEmailWithTemplate(
            'price_change',
            user.email,
            user.id,
            {
              nombre: user.full_name || user.email,
              precio: newPrice
            }
          )

          if (emailResult.success) {
            results.emails_sent++
          } else {
            results.errors++
          }

        } catch (error) {
          console.error(`Error enviando notificación a usuario ${user.id}:`, error)
          results.errors++
        }
      }

      return { success: true, data: results, error: null }

    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

  // Enviar recordatorio de pago (día 3)
  static async sendPaymentRetryNotification(
    userId: string, 
    userEmail: string, 
    userName: string, 
    amount: string,
    retryCount: number
  ) {
    try {
      const variables = {
        nombre: userName,
        precio: amount,
        intento: retryCount.toString(),
        payment_url: `${process.env.NEXT_PUBLIC_APP_URL}/suscripcion`
      }

      // Crear notificación in-app crítica
      await this.createInAppNotification({
        user_id: userId,
        type: 'in_app',
        category: 'critical',
        title: 'Recordatorio: Problema con tu Pago',
        message: `Este es el intento ${retryCount} de procesar tu pago de $${amount}. Por favor actualiza tu método de pago pronto.`,
        cta_text: 'Actualizar Pago',
        cta_url: '/suscripcion',
        expires_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString() // 4 días
      })

      // Enviar email
      const emailResult = await sendEmailWithTemplate(
        'payment_retry',
        userEmail,
        userId,
        variables
      )

      return emailResult

    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

  // Enviar notificación de fallo de pago
  static async sendPaymentFailedNotification(
    userId: string, 
    userEmail: string, 
    userName: string, 
    amount: string
  ) {
    try {
      const variables = {
        nombre: userName,
        precio: amount,
        payment_url: `${process.env.NEXT_PUBLIC_APP_URL}/pago`
      }

      // Crear notificación in-app crítica
      await this.createInAppNotification({
        user_id: userId,
        type: 'in_app',
        category: 'critical',
        title: 'Problema con tu Pago',
        message: `No pudimos procesar tu pago de $${amount}. Por favor verifica tu método de pago para mantener tu cuenta activa.`,
        cta_text: 'Actualizar Pago',
        cta_url: '/pago',
        expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 días
      })
      

      // Enviar email
      const emailResult = await sendEmailWithTemplate(
        'payment_failed',
        userEmail,
        userId,
        variables
      )

      return emailResult

    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

  // Enviar notificación de cancelación de suscripción
  static async sendSubscriptionCancelledNotification(
    userId: string, 
    userEmail: string, 
    userName: string,
    expirationDate: string
  ) {
    try {
      const variables = {
        nombre: userName,
        fecha_expiracion: new Date(expirationDate).toLocaleDateString('es-CO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        reactivate_url: `${process.env.NEXT_PUBLIC_APP_URL}/suscripcion`
      }

      // Crear notificación in-app importante
      await this.createInAppNotification({
        user_id: userId,
        type: 'in_app',
        category: 'important',
        title: 'Suscripción Cancelada',
        message: `Tu suscripción ha sido cancelada. Tendrás acceso hasta el ${variables.fecha_expiracion}. Puedes reactivarla en cualquier momento.`,
        cta_text: 'Reactivar Suscripción',
        cta_url: '/suscripcion',
        expires_at: expirationDate
      })

      // Enviar email
      const emailResult = await sendEmailWithTemplate(
        'subscription_cancelled',
        userEmail,
        userId,
        variables
      )

      return emailResult

    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

  // Enviar notificación de reactivación de suscripción
  static async sendSubscriptionReactivatedNotification(
    userId: string, 
    userEmail: string, 
    userName: string
  ) {
    try {
      const variables = {
        nombre: userName,
        profile_url: `${process.env.NEXT_PUBLIC_APP_URL}/perfil`
      }

      // Crear notificación in-app normal
      await this.createInAppNotification({
        user_id: userId,
        type: 'in_app',
        category: 'normal',
        title: '¡Bienvenido de Vuelta!',
        message: 'Tu suscripción ha sido reactivada exitosamente. Disfruta de todo el contenido de EsteticaProHub.',
        cta_text: 'Ir a mi Perfil',
        cta_url: '/perfil',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 días
      })

      // Enviar email
      const emailResult = await sendEmailWithTemplate(
        'subscription_reactivated',
        userEmail,
        userId,
        variables
      )

      return emailResult

    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

  // Enviar notificación de suscripción suspendida
  static async sendSubscriptionSuspendedNotification(
    userId: string, 
    userEmail: string, 
    userName: string,
    expirationDate: string
  ) {
    try {
      const variables = {
        nombre: userName,
        fecha_expiracion: new Date(expirationDate).toLocaleDateString('es-CO', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        payment_url: `${process.env.NEXT_PUBLIC_APP_URL}/suscripcion`
      }

      // Crear notificación in-app crítica
      await this.createInAppNotification({
        user_id: userId,
        type: 'in_app',
        category: 'critical',
        title: 'Suscripción Suspendida',
        message: `Tu suscripción ha sido suspendida por PayPal debido a problemas de pago. Por favor actualiza tu método de pago inmediatamente para mantener tu acceso.`,
        cta_text: 'Actualizar Método de Pago',
        cta_url: '/suscripcion',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 días
      })

      // Enviar email
      const emailResult = await sendEmailWithTemplate(
        'subscription_suspended',
        userEmail,
        userId,
        variables
      )

      return emailResult

    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }

  // Obtener usuarios para newsletter
  static async getNewsletterRecipients() {
    try {
      const supabase = await createServerSupabaseClient()

      const { data: recipients, error } = await supabase.rpc('get_content_email_recipients')

      if (error) {
        throw new Error(error.message)
      }

      return { success: true, data: recipients, error: null }

    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }
    }
  }
}