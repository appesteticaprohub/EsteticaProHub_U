import { createServerSupabaseClient } from './server-supabase'
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
        throw new Error(error.message)
      }

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
      const supabase = await createServerSupabaseClient()

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