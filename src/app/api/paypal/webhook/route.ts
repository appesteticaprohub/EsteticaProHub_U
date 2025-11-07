import { NextRequest, NextResponse } from 'next/server';
import { verifyPayPalPayment } from '@/lib/paypal';
import { createServerSupabaseAdminClient } from '@/lib/server-supabase';
import { NotificationService } from '@/lib/notification-service';

// Verificar firma del webhook de PayPal
async function verifyPayPalWebhookSignature(
  webhookId: string,
  headers: Headers,
  body: string
): Promise<boolean> {
  try {
    // En producción, deberías verificar la firma
    // Por ahora, validamos que tenga headers de PayPal
    const transmissionId = headers.get('paypal-transmission-id');
    const transmissionTime = headers.get('paypal-transmission-time');
    const transmissionSig = headers.get('paypal-transmission-sig');
    
    if (!transmissionId || !transmissionTime || !transmissionSig) {
      console.error('❌ Missing PayPal signature headers');
      return false;
    }

    // TODO: Implementar verificación completa de firma cuando tengas webhook_id
    // Por ahora, validamos que tenga los headers básicos
    console.log('✅ PayPal headers present, webhook accepted');
    return true;
  } catch (error) {
    console.error('❌ Error verifying webhook signature:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Leer el body como texto primero para verificar firma
    const rawBody = await request.text();
    
    // Verificar firma de PayPal (seguridad)
    const webhookId = process.env.PAYPAL_WEBHOOK_ID || '';
    const isValid = await verifyPayPalWebhookSignature(webhookId, request.headers, rawBody);
    
    if (!isValid) {
      console.error('❌ Invalid PayPal webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parsear el body
    const body = JSON.parse(rawBody);
    console.log('🔔 PayPal Webhook received:', body.event_type);

    const supabase = createServerSupabaseAdminClient();

    // ==================== EVENTOS DE PAGO ÚNICO ====================
    if (body.event_type === 'PAYMENT.SALE.COMPLETED' || body.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const paymentId = body.resource?.parent_payment;
      const customField = body.resource?.custom;
      const billingAgreementId = body.resource?.billing_agreement_id;

      // Si es pago de suscripción, dejarlo pasar al bloque de suscripciones
      if (billingAgreementId) {
        console.log('🔄 Subscription payment detected, processing below...');
      } else if (!paymentId || !customField) {
        console.error('Missing payment ID or custom field for one-time payment');
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      } else {

      // Verificar el pago en PayPal
      const paypalPayment = await verifyPayPalPayment(paymentId);
      
      if (paypalPayment.state !== 'approved') {
        console.error('Payment not approved:', paypalPayment.state);
        return NextResponse.json({ error: 'Payment not approved' }, { status: 400 });
      }

      // Actualizar payment session a 'paid'
      const { error } = await supabase
        .from('payment_sessions')
        .update({ 
          status: 'paid',
          paypal_payment_id: paymentId
        })
        .eq('external_reference', customField);

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      console.log(`Payment session ${customField} marked as paid`);
      return NextResponse.json({ message: 'Payment confirmed' });
      }
    }

    // ==================== EVENTOS DE SUSCRIPCIÓN ====================
    
    // Suscripción activada
    if (body.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      const subscriptionId = body.resource?.id;
      const customId = body.resource?.custom_id;

      if (!subscriptionId || !customId) {
        console.error('Missing subscription ID or custom ID');
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      // Actualizar payment session
      const { error } = await supabase
        .from('payment_sessions')
        .update({ 
          status: 'active_subscription',
          paypal_subscription_id: subscriptionId
        })
        .eq('external_reference', customId);

      if (error) {
        console.error('Database error activating subscription:', error);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      console.log(`✅ Subscription ${subscriptionId} activated for session ${customId}`);

      // 🧹 LIMPIAR NOTIFICACIONES OBSOLETAS
      // Buscar el usuario asociado para limpiar notificaciones previas
      const { data: session } = await supabase
        .from('payment_sessions')
        .select('user_id, amount')
        .eq('external_reference', customId)
        .single();

      if (session && session.user_id) {
        console.log('🧹 Limpiando notificaciones obsoletas tras activación...');
        await NotificationService.clearPaymentNotifications(session.user_id);
        await NotificationService.clearCancellationNotifications(session.user_id);

        // 💰 PROCESAR PAGO INICIAL - Actualizar campos de pago en el perfil
        console.log('💰 Processing initial payment for activated subscription...');
        const { error: paymentUpdateError } = await supabase
          .from('profiles')
          .update({
            last_payment_amount: session.amount ? parseFloat(session.amount.toString()) : null,
            last_payment_date: new Date().toISOString()
          })
          .eq('id', session.user_id);

        if (paymentUpdateError) {
          console.error('❌ Error updating payment info:', paymentUpdateError);
        } else {
          console.log('✅ Payment info updated successfully');
          console.log(`💰 Payment amount: $${session.amount}`);
        }
      }

      return NextResponse.json({ message: 'Subscription activated' });
    }

    // Suscripción cancelada
    if (body.event_type === 'BILLING.SUBSCRIPTION.CANCELLED') {
      const subscriptionId = body.resource?.id;

      if (!subscriptionId) {
        console.error('❌ Missing subscription ID in cancellation event');
        return NextResponse.json({ error: 'Missing subscription ID' }, { status: 400 });
      }

      // Buscar el usuario asociado a esta suscripción
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, subscription_expires_at')
        .eq('paypal_subscription_id', subscriptionId)
        .single();

      if (profile) {
        const userId = profile.id;

        // Actualizar estado a Cancelled (mantiene acceso hasta expiración)
        await supabase
          .from('profiles')
          .update({ 
            subscription_status: 'Cancelled',
            auto_renewal_enabled: false
          })
          .eq('id', userId);

        console.log(`✅ Subscription ${subscriptionId} cancelled for user ${userId}`);

        // ENVIAR NOTIFICACIONES
        const userName = profile.full_name || profile.email.split('@')[0];
        const expirationDate = profile.subscription_expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        console.log('📧 Enviando notificación de cancelación...');
        await NotificationService.sendSubscriptionCancelledNotification(
          userId,
          profile.email,
          userName,
          expirationDate
        );
      } else {
        console.error('❌ Profile not found for subscription:', subscriptionId);
        console.log('⏰ This might be a timing issue. PayPal webhook arrived before user registration completed.');
        console.log('💡 Suggestion: User should complete registration and this payment will be processed on next billing cycle.');
        // TODO: En producción, considerar implementar queue/retry para webhook con delay
      }

      return NextResponse.json({ message: 'Subscription cancelled' });
    }

    // Pago de suscripción fallido
    if (body.event_type === 'BILLING.SUBSCRIPTION.PAYMENT.FAILED') {
      const subscriptionId = body.resource?.id;
      
      if (!subscriptionId) {
        console.error('❌ Missing subscription ID in payment failed event');
        return NextResponse.json({ error: 'Missing subscription ID' }, { status: 400 });
      }

      // Buscar el usuario asociado a esta suscripción (directamente en profiles)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, payment_retry_count, subscription_expires_at')
        .eq('paypal_subscription_id', subscriptionId)
        .single();

      if (profile) {
        const userId = profile.id;
        const currentRetryCount = profile.payment_retry_count || 0;
        const newRetryCount = currentRetryCount + 1;

        // Actualizar estado a Payment_Failed con contador de intentos
        await supabase
          .from('profiles')
          .update({ 
            subscription_status: 'Payment_Failed',
            payment_retry_count: newRetryCount,
            last_payment_attempt: new Date().toISOString()
          })
          .eq('id', userId);

        console.log(`⚠️ Subscription ${subscriptionId} payment failed. Retry count: ${newRetryCount}`);

        // ENVIAR NOTIFICACIÓN SEGÚN EL INTENTO
        // Obtener el precio real de la base de datos
        const { data: settings } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'SUBSCRIPTION_PRICE')
          .single();
        
        const amount = settings?.value || body.resource?.amount?.total || '20.00';
        const userName = profile.full_name || profile.email.split('@')[0];

        if (newRetryCount === 1) {
          // Primer fallo: notificación inmediata
          console.log('📧 Enviando notificación de primer fallo de pago...');
          await NotificationService.sendPaymentFailedNotification(
            userId,
            profile.email,
            userName,
            amount
          );
        } else if (newRetryCount === 2) {
          // Segundo fallo: recordatorio (día 3 aproximadamente)
          console.log('📧 Enviando recordatorio de pago (intento 2)...');
          await NotificationService.sendPaymentRetryNotification(
            userId,
            profile.email,
            userName,
            amount,
            newRetryCount
          );
        } else if (newRetryCount >= 3) {
          // Tercer fallo: activar período de gracia y enviar última oportunidad
          console.log('⏰ Activando período de gracia (intento 3+)...');
          
          const gracePeriodEnd = new Date();
          gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7); // 7 días de gracia

          await supabase
            .from('profiles')
            .update({ 
              subscription_status: 'Grace_Period',
              grace_period_ends: gracePeriodEnd.toISOString()
            })
            .eq('id', userId);

          // Enviar última oportunidad
          console.log('📧 Enviando última oportunidad de pago...');
          await NotificationService.sendPaymentRetryNotification(
            userId,
            profile.email,
            userName,
            amount,
            newRetryCount
          );

          console.log(`⏰ Grace period activated until ${gracePeriodEnd.toISOString()}`);
        }
      } else {
        console.error('❌ Profile not found for subscription:', subscriptionId);
      }

      return NextResponse.json({ message: 'Subscription payment failure processed' });
    }

    // Suscripción suspendida por PayPal
    if (body.event_type === 'BILLING.SUBSCRIPTION.SUSPENDED') {
      const subscriptionId = body.resource?.id;
      
      if (!subscriptionId) {
        console.error('❌ Missing subscription ID in suspended event');
        return NextResponse.json({ error: 'Missing subscription ID' }, { status: 400 });
      }

      // Buscar el usuario asociado a esta suscripción (directamente en profiles)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, subscription_expires_at')
        .eq('paypal_subscription_id', subscriptionId)
        .single();

      if (profile) {
        const userId = profile.id;

        // Actualizar estado a Suspended
        await supabase
          .from('profiles')
          .update({ subscription_status: 'Suspended' })
          .eq('id', userId);

        console.log(`🚫 Subscription ${subscriptionId} suspended for user ${userId}`);

        // ENVIAR NOTIFICACIONES
        const userName = profile.full_name || profile.email.split('@')[0];
        const expirationDate = profile.subscription_expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        console.log('📧 Enviando notificación de suspensión...');
        await NotificationService.sendSubscriptionSuspendedNotification(
          userId,
          profile.email,
          userName,
          expirationDate
        );
      } else {
        console.error('❌ Profile not found for subscription:', subscriptionId);
      }

      return NextResponse.json({ message: 'Subscription suspended' });
    }

    // Evento no manejado
    console.log(`Unhandled webhook event type: ${body.event_type}`);
    return NextResponse.json({ message: 'Event type not handled' });

  } catch (error) {
    console.error('💥 Webhook error:', error);
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    // Siempre responder 200 para que PayPal no reintente
    // (ya logueamos el error para debug)
    return NextResponse.json({ 
      received: true,
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 200 });
  }
}