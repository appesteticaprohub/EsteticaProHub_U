import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/notification-service'

// POST - Enviar email usando template (para uso interno del sistema)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, user_id, user_email, user_name, template_data } = body

    let result

    switch (type) {
      case 'welcome':
        if (!user_id || !user_email || !user_name) {
          return NextResponse.json(
            { data: null, error: 'Faltan datos requeridos para email de bienvenida' },
            { status: 400 }
          )
        }
        result = await NotificationService.sendWelcomeEmail(user_id, user_email, user_name)
        break

      case 'payment_failed':
        if (!user_id || !user_email || !user_name || !template_data?.amount) {
          return NextResponse.json(
            { data: null, error: 'Faltan datos requeridos para email de pago fallido' },
            { status: 400 }
          )
        }
        result = await NotificationService.sendPaymentFailedNotification(
          user_id, 
          user_email, 
          user_name, 
          template_data.amount
        )
        break

      case 'price_change':
        if (!template_data?.new_price) {
          return NextResponse.json(
            { data: null, error: 'Falta el nuevo precio' },
            { status: 400 }
          )
        }
        result = await NotificationService.sendPriceChangeNotification(template_data.new_price)
        break

      default:
        return NextResponse.json(
          { data: null, error: 'Tipo de email no válido' },
          { status: 400 }
        )
    }

    return NextResponse.json(result)

  } catch (error) {
    return NextResponse.json(
      { data: null, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}