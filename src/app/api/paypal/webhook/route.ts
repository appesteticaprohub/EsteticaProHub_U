import { NextRequest, NextResponse } from 'next/server';
import { capturePayPalOrder } from '@/lib/paypal';
import { createServerSupabaseAdminClient } from '@/lib/server-supabase';
import { NotificationService } from '@/lib/notification-service';

// Verificar firma del webhook de PayPal
async function verifyPayPalWebhookSignature(
  webhookId: string,
  headers: Headers
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
    const isValid = await verifyPayPalWebhookSignature(webhookId, request.headers);
    
    if (!isValid) {
      console.error('❌ Invalid PayPal webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parsear el body
const webhookData = JSON.parse(rawBody);
    console.log('🔔 PayPal Webhook received:', webhookData.event_type);

    const supabase = createServerSupabaseAdminClient();

    // ==================== EVENTOS DE PAGO ÚNICO ====================
    if (webhookData.event_type === 'PAYMENT.SALE.COMPLETED' || webhookData.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const paymentId = webhookData.resource?.parent_payment;
      const customField = webhookData.resource?.custom;
      const billingAgreementId = webhookData.resource?.billing_agreement_id;

      // Si es pago de suscripción, dejarlo pasar al bloque de suscripciones
      if (billingAgreementId) {
        console.log('🔄 Subscription payment detected, processing below...');

       // PROCESAR PAGO DE SUSCRIPCIÓN - DETECCIÓN DE CAMBIOS DE PRECIO
        console.log('💰 Processing subscription payment for price change detection...');
        
        // Buscar el usuario asociado a esta suscripción
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, last_payment_amount')
          .eq('paypal_subscription_id', billingAgreementId)
          .single();

        if (profile) {
          const userId = profile.id;
          const newPaymentAmount = parseFloat(webhookData.resource?.amount?.total || '0');
          const lastPaymentAmount = profile.last_payment_amount || 0;

          console.log(`💰 Payment comparison for user ${userId}:`);
          console.log(`   Previous amount: $${lastPaymentAmount}`);
          console.log(`   New amount: $${newPaymentAmount}`);

          // Si el monto es diferente, el usuario pagó con nuevo precio
          if (newPaymentAmount !== lastPaymentAmount && newPaymentAmount > 0) {
            console.log('🔄 Price change detected! Updating payment info and clearing notifications...');
            
            // Actualizar el monto del último pago
            await supabase
              .from('profiles')
              .update({
                last_payment_amount: newPaymentAmount,
                last_payment_date: new Date().toISOString()
              })
              .eq('id', userId);

            // 🧹 LIMPIAR NOTIFICACIONES DE CAMBIO DE PRECIO
            console.log('🧹 Clearing price change notifications...');
            await NotificationService.clearPriceChangeNotifications(userId);

            console.log(`✅ Price change processed successfully for user ${userId}`);
            console.log(`💰 Payment amount updated: $${lastPaymentAmount} → $${newPaymentAmount}`);
          } else {
            console.log('ℹ️ No price change detected - amounts are the same');
          }

          return NextResponse.json({ message: 'Subscription payment processed' });
        } else {
          console.error('❌ Profile not found for subscription:', billingAgreementId);
          return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }   

      } else if (!paymentId || !customField) {
        console.error('Missing payment ID or custom field for one-time payment');
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      } else {

      // Con API v2 el pago ya fue capturado en execute-payment
      // El webhook PAYMENT.CAPTURE.COMPLETED es informativo
      console.log(`✅ Payment capture confirmed via webhook for session ${customField}`);
      return NextResponse.json({ message: 'Payment confirmed' });
      }
    }

    // ==================== EVENTOS DE SUSCRIPCIÓN ====================
    
    // Suscripción activada
    if (webhookData.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      const subscriptionId = webhookData.resource?.id;
      const customId = webhookData.resource?.custom_id;

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
    if (webhookData.event_type === 'BILLING.SUBSCRIPTION.CANCELLED') {
      const subscriptionId = webhookData.resource?.id;

      if (!subscriptionId) {
        console.error('❌ Missing subscription ID in cancellation event');
        return NextResponse.json({ error: 'Missing subscription ID' }, { status: 400 });
      }

      // Buscar el usuario asociado a esta suscripción
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, subscription_status, subscription_expires_at, grace_period_ends')
        .eq('paypal_subscription_id', subscriptionId)
        .single();

      if (profile) {
        const userId = profile.id;
        let finalStatus = 'Cancelled'; // Estado por defecto
        
        // 🧠 LÓGICA INTELIGENTE: Determinar el estado correcto según nuestras reglas de negocio
        console.log('🔥 NUEVO WEBHOOK LOGIC - BILLING.SUBSCRIPTION.CANCELLED DETECTADO');
        console.log(`🧠 Evaluating cancellation for user ${userId}:`);
        console.log(`   Current status: ${profile.subscription_status}`);
        console.log(`   Grace period ends: ${profile.grace_period_ends}`);
        
        // Regla 1: Si está en Grace_Period y ya venció → debe ser Expired
        if (profile.subscription_status === 'Grace_Period' && profile.grace_period_ends) {
          const now = new Date();
          const gracePeriodEnd = new Date(profile.grace_period_ends);
          
          if (now > gracePeriodEnd) {
            finalStatus = 'Expired';
            console.log(`✅ Grace period expired (${profile.grace_period_ends}) - Setting status to Expired`);
          } else {
            finalStatus = 'Cancelled';
            console.log(`⏰ Grace period still active until ${profile.grace_period_ends} - Setting status to Cancelled`);
          }
        }
        // Regla 2: Si está Expired y PayPal cancela → mantener Expired
        else if (profile.subscription_status === 'Expired') {
          finalStatus = 'Expired';
          console.log(`✅ User already Expired - Maintaining Expired status`);
        }
        // Regla 3: Cualquier otro caso → Cancelled normal
        else {
          finalStatus = 'Cancelled';
          console.log(`✅ Normal cancellation - Setting status to Cancelled`);
        }

        // Actualizar con el estado determinado por nuestra lógica
        await supabase
          .from('profiles')
          .update({ 
            subscription_status: finalStatus,
            auto_renewal_enabled: false
          })
          .eq('id', userId);

        console.log(`✅ Subscription ${subscriptionId} processed - Final status: ${finalStatus} for user ${userId}`);

        // 🆕 DETECTAR CANCELACIÓN POR CAMBIO DE PRECIO USANDO PAYPAL DATA
        const statusChangeNote = webhookData.resource?.status_change_note || '';
        const isPriceChangeCancellation = statusChangeNote.includes('price change');
        
        console.log(`🔍 Status change note: "${statusChangeNote}"`);
        console.log(`🏷️ Es cancelación por cambio de precio: ${isPriceChangeCancellation}`);

        // 🆕 AJUSTAR STATUS FINAL SEGÚN TIPO DE CANCELACIÓN
        if (isPriceChangeCancellation) {
          finalStatus = 'Price_Change_Cancelled';
          console.log(`🏷️ Cambiando status a Price_Change_Cancelled para user ${userId}`);
          
          // Actualizar con el nuevo estado
          await supabase
            .from('profiles')
            .update({ 
              subscription_status: 'Price_Change_Cancelled',
              auto_renewal_enabled: false
            })
            .eq('id', userId);
        }

        // ENVIAR NOTIFICACIONES (solo si no es Expired y NO es por cambio de precio)
        if (finalStatus === 'Cancelled' && !isPriceChangeCancellation) {
          const userName = profile.full_name || profile.email.split('@')[0];
          const expirationDate = profile.subscription_expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

          console.log('📧 Enviando notificación de cancelación voluntaria...');
          await NotificationService.sendSubscriptionCancelledNotification(
            userId,
            profile.email,
            userName,
            expirationDate
          );
        } else if (finalStatus === 'Price_Change_Cancelled') {
          console.log('🏷️ Cancelación por cambio de precio detectada - NO enviando email de cancelación');
          console.log('💡 El usuario ya recibió notificación de cambio de precio');
        } else {
          console.log('ℹ️ No cancellation notification needed for Expired status');
        }
      } else {
        console.error('❌ Profile not found for subscription:', subscriptionId);
        console.log('⏰ This might be a timing issue. PayPal webhook arrived before user registration completed.');
        console.log('💡 Suggestion: User should complete registration and this payment will be processed on next billing cycle.');
        // TODO: En producción, considerar implementar queue/retry para webhook con delay
      }

      return NextResponse.json({ message: 'Subscription cancellation processed intelligently' });
    }

    // Pago de suscripción fallido
    if (webhookData.event_type === 'BILLING.SUBSCRIPTION.PAYMENT.FAILED') {
      const subscriptionId = webhookData.resource?.id;
      
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
        
        const amount = settings?.value || webhookData.resource?.amount?.total || '20.00';
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

    // Suscripción actualizada (pagos exitosos después de fallos)
    if (webhookData.event_type === 'BILLING.SUBSCRIPTION.UPDATED') {
      const subscriptionId = webhookData.resource?.id;
      
      if (!subscriptionId) {
        console.error('❌ Missing subscription ID in subscription updated event');
        return NextResponse.json({ error: 'Missing subscription ID' }, { status: 400 });
      }

      // Buscar el usuario asociado a esta suscripción
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, subscription_status, payment_retry_count')
        .eq('paypal_subscription_id', subscriptionId)
        .single();

      if (profile) {
        const userId = profile.id;

        // Solo procesar si el usuario tenía problemas de pago
        if (profile.subscription_status === 'Payment_Failed' || 
            profile.subscription_status === 'Grace_Period' || 
            profile.subscription_status === 'Suspended') {
          
          console.log(`🔄 Processing subscription update for user ${userId} - Previous status: ${profile.subscription_status}`);

          // Actualizar a Active y resetear contadores
          await supabase
            .from('profiles')
            .update({ 
              subscription_status: 'Active',
              payment_retry_count: 0,
              grace_period_ends: null,
              last_payment_date: new Date().toISOString()
            })
            .eq('id', userId);

          console.log(`✅ Subscription ${subscriptionId} payment resolved for user ${userId}`);

          // 🧹 LIMPIAR NOTIFICACIONES OBSOLETAS
          console.log('🧹 Limpiando notificaciones obsoletas tras resolución de pago...');
          const paymentResult = await NotificationService.clearPaymentNotifications(userId);
          const cancellationResult = await NotificationService.clearCancellationNotifications(userId);

          console.log('🧹 Resultado limpieza de pagos:', paymentResult);
          console.log('🧹 Resultado limpieza de cancelaciones:', cancellationResult);

          // 🔄 DISPARAR ACTUALIZACIÓN DE SUSCRIPCIÓN EN FRONTEND
          console.log('🔄 Disparando actualización de estado de suscripción...');
          await NotificationService.triggerSubscriptionRefresh(userId);

          // 📧 ENVIAR NOTIFICACIÓN DE BIENVENIDA DE VUELTA (opcional)
          if (profile.subscription_status === 'Grace_Period' || profile.subscription_status === 'Suspended') {
            const userName = profile.full_name || profile.email.split('@')[0];
            console.log('📧 Enviando notificación de reactivación...');
            await NotificationService.sendSubscriptionReactivatedNotification(
              userId,
              profile.email,
              userName
            );
          }

        } else {
          console.log(`ℹ️ Subscription update received for user ${userId} with status ${profile.subscription_status} - No action needed`);
        }
      } else {
        console.error('❌ Profile not found for subscription:', subscriptionId);
      }

      return NextResponse.json({ message: 'Subscription update processed' });
    }

    // Suscripción suspendida por PayPal
    if (webhookData.event_type === 'BILLING.SUBSCRIPTION.SUSPENDED') {
      const subscriptionId = webhookData.resource?.id;
      
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
    console.log(`Unhandled webhook event type: ${webhookData.event_type}`);
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