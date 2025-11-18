import { Resend } from 'resend'
import { createServerSupabaseClient } from './server-supabase'

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY no está configurado')
}

export const resend = new Resend(process.env.RESEND_API_KEY)

// Configuración base para emails
export const EMAIL_CONFIG = {
  from: process.env.RESEND_FROM_EMAIL || 'EsteticaProHub <onboarding@resend.dev>',
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
}

// Función para reemplazar variables en templates
export function replaceTemplateVariables(
  html: string, 
  variables: Record<string, string>
): string {
  let result = html
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g')
    result = result.replace(regex, value || '')
  })
  
  return result
}

// Tipos para el envío de emails
export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  templateKey?: string
  userId?: string
}

// Función principal para enviar emails
export async function sendEmail(options: SendEmailOptions) {
  try {
    console.log('📧 Intentando enviar email a:', options.to)
    console.log('📧 Subject:', options.subject)
    console.log('📧 From:', EMAIL_CONFIG.from)
    console.log('📧 API Key existe:', !!process.env.RESEND_API_KEY)
    
    const response = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    })

    console.log('📧 Respuesta de Resend:', response)

    // Log del envío en la base de datos si se proporciona templateKey y userId
    if (options.templateKey && options.userId) {
      await logEmailSend({
        user_id: options.userId,
        template_key: options.templateKey,
        email: options.to,
        status: 'sent',
        resend_id: response.data?.id || null
      })
    }

    return {
      success: true,
      data: response,
      error: null
    }

  } catch (error) {
    console.error('❌ Error enviando email:', error)
    
    // Log del error si se proporciona la información
    if (options.templateKey && options.userId) {
      await logEmailSend({
        user_id: options.userId,
        template_key: options.templateKey,
        email: options.to,
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Error desconocido'
      })
    }

    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

// Función para registrar el envío de email en la base de datos
// Función para registrar el envío de email en la base de datos
async function logEmailSend(logData: {
  user_id: string
  template_key: string
  email: string
  status: 'sent' | 'failed' | 'delivered'
  resend_id?: string | null
  error_message?: string | null
}) {
  try {
    const supabase = await createServerSupabaseClient()
    
    console.log('🔍 Intentando guardar log de email:', logData)
    
    const { data, error } = await supabase.from('email_logs').insert(logData).select()
    
    if (error) {
      console.error('❌ Error guardando log de email:', error)
    } else {
      console.log('✅ Log de email guardado correctamente:', data)
    }
  } catch (error) {
    console.error('❌ Error en logEmailSend:', error)
  }
}

// Función para enviar email usando template de la base de datos
export async function sendEmailWithTemplate(
  templateKey: string,
  to: string,
  userId: string,
  variables: Record<string, string> = {}
) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Obtener el template de la base de datos
    const { data: template, error } = await supabase
      .from('email_templates')
      .select('subject, html_content')
      .eq('template_key', templateKey)
      .eq('is_active', true)
      .single()

    if (error || !template) {
      throw new Error(`Template '${templateKey}' no encontrado o inactivo`)
    }

    // Reemplazar variables en el subject y content
    const subject = replaceTemplateVariables(template.subject, variables)
    const html = replaceTemplateVariables(template.html_content, variables)

    // Enviar el email
    return await sendEmail({
      to,
      subject,
      html,
      templateKey,
      userId
    })

  } catch (error) {
    console.error('Error sending email with template:', error)
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}