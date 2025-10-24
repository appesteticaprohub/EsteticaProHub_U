import { NextRequest, NextResponse } from 'next/server';
import { verifyPayPalPayment } from '@/lib/paypal';
import { createServerSupabaseAdminClient } from '@/lib/server-supabase';
import { NotificationService } from '@/lib/notification-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔔 PayPal Webhook received:', body.event_type);

    const supabase = createServerSupabaseAdminClient();

    // ==================== EVENTOS DE PAGO ÚNICO ====================
    if (body.event_type === 'PAYMENT.SALE.COMPLETED' || body.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const paymentId = body.resource?.parent_payment;
      const customField = body.resource?.custom;

      if (!paymentId || !customField) {
        console.error('Missing payment ID or custom field');
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

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
        .select('user_id')
        .eq('external_reference', customId)
        .single();

      if (session && session.user_id) {
        console.log('🧹 Limpiando notificaciones obsoletas tras activación...');
        await NotificationService.clearPaymentNotifications(session.user_id);
        await NotificationService.clearCancellationNotifications(session.user_id);
      }

      return NextResponse.json({ message: 'Subscription activated' });
    }

    // Pago de suscripción completado (renovación mensual)
    if (body.event_type === 'BILLING.SUBSCRIPTION.PAYMENT.COMPLETED') {
      const subscriptionId = body.resource?.id;
      
      if (!subscriptionId) {
        console.error('Missing subscription ID in payment completed event');
        return NextResponse.json({ error: 'Missing subscription ID' }, { status: 400 });
      }

      // Buscar el usuario asociado a esta suscripción
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, paypal_subscription_id')
        .eq('paypal_subscription_id', subscriptionId)
        .single();

      if (profile) {
        const userId = profile.id;

        // Extender la fecha de expiración por 1 mes
        const newExpirationDate = new Date();
        newExpirationDate.setMonth(newExpirationDate.getMonth() + 1);

        await supabase
          .from('profiles')
          .update({ 
            subscription_expires_at: newExpirationDate.toISOString(),
            subscription_status: 'Active',
            payment_retry_count: 0,
            last_payment_attempt: null,
            grace_period_ends: null
          })
          .eq('id', userId);

        console.log(`✅ Subscription ${subscriptionId} payment completed, extended expiration`);

        // 🧹 LIMPIAR NOTIFICACIONES OBSOLETAS DE PAGO
        console.log('🧹 Limpiando notificaciones obsoletas de pago...');
        await NotificationService.clearPaymentNotifications(userId);
        await NotificationService.clearPriceChangeNotifications(userId);
      } else {
        console.error('❌ Profile not found for subscription:', subscriptionId);
      }

      return NextResponse.json({ message: 'Subscription payment processed' });
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
          .eq('key', 'subscription_price')
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
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}