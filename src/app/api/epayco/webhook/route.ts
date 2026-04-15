// src/app/api/epayco/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyEpaycoSignature, isEpaycoPaymentAccepted, isEpaycoPaymentPending } from '@/lib/epayco';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Flujo 3: Usuario logueado renovando — activa suscripción directamente
async function processRenewal(supabase: ReturnType<typeof getSupabaseAdmin>, session: Record<string, unknown>) {
  const userId = session.user_id as string;

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('subscription_status, email, full_name')
    .eq('id', userId)
    .single();

  if (!currentProfile) {
    console.error('❌ Perfil no encontrado para user_id:', userId);
    return false;
  }

  const expirationDate = new Date();
  expirationDate.setMonth(expirationDate.getMonth() + 1);

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'Active',
      subscription_expires_at: expirationDate.toISOString(),
      payment_retry_count: 0,
      last_payment_attempt: null,
      grace_period_ends: null,
      last_payment_amount: session.amount ?? null,
      last_payment_date: new Date().toISOString(),
    })
    .eq('id', userId);

  if (updateError) {
    console.error('❌ Error actualizando perfil en renovación:', updateError);
    return false;
  }

  // Limpiar notificaciones obsoletas y enviar confirmación
  try {
    const { NotificationService } = await import('@/lib/notification-service');
    await NotificationService.clearPaymentNotifications(userId);
    await NotificationService.clearCancellationNotifications(userId);
    await NotificationService.clearPriceChangeNotifications(userId);

    const userName = currentProfile.full_name || currentProfile.email.split('@')[0];
    await NotificationService.sendSubscriptionReactivatedNotification(
      userId,
      currentProfile.email,
      userName
    );
  } catch (notifError) {
    console.error('⚠️ Error en notificaciones de renovación:', notifError);
    // No es crítico — continuar
  }

  // Enviar email de confirmación PSE
  try {
    const { sendEmailWithTemplate } = await import('@/lib/resend');
    const userName = currentProfile.full_name || currentProfile.email.split('@')[0];
    await sendEmailWithTemplate(
      'payment_confirmed_pse',
      currentProfile.email,
      userId,
      {
        nombre: userName,
        app_url: process.env.NEXT_PUBLIC_BASE_URL || 'https://esteticaprohub.com/',
      }
    );
  } catch (emailError) {
    console.error('⚠️ Error enviando email de confirmación PSE:', emailError);
  }

  console.log('✅ Renovación PSE procesada para user_id:', userId);
  return true;
}

// Flujo 1 y 2: Usuario nuevo o expirado sin sesión — envía email con link para completar
async function processAsyncRegistration(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  session: Record<string, unknown>,
  flowType: string
) {
  const payerEmail = session.payer_email as string | null;

  if (!payerEmail) {
    console.error('❌ No hay payer_email para procesar registro asíncrono');
    return false;
  }

  const externalReference = session.external_reference as string;
  const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://esteticaprohub.com/';
  const registroUrl = `${appUrl}registro?ref=${externalReference}`;

  // Verificar si el email ya existe en BD independientemente del flow_type guardado
  let isExistingUser = flowType === 'existing_user';
  let userName = payerEmail.split('@')[0];

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, id')
    .eq('email', payerEmail)
    .maybeSingle();

  if (profile) {
    isExistingUser = true;
    if (profile.full_name) userName = profile.full_name;
  }

  // Actualizar flow_type en la sesión si era incorrecto
  if (isExistingUser && flowType === 'new_user') {
    await supabase
      .from('payment_sessions')
      .update({ flow_type: 'existing_user' })
      .eq('external_reference', externalReference);
    console.log('🔄 flow_type corregido a existing_user para:', payerEmail);
  }

  // Seleccionar template según si es usuario nuevo o existente
  const templateKey = isExistingUser
    ? 'payment_confirmed_pse_existing'
    : 'payment_confirmed_pse';

  try {
    const { sendEmailWithTemplate } = await import('@/lib/resend');

    await sendEmailWithTemplate(
      templateKey,
      payerEmail,
      profile?.id || payerEmail,
      {
        nombre: userName,
        app_url: appUrl,
        registro_url: registroUrl,
      }
    );
  } catch (emailError) {
    console.error('⚠️ Error enviando email de confirmación PSE:', emailError);
  }

  console.log(`✅ Email PSE enviado a: ${payerEmail} — tipo: ${isExistingUser ? 'existing_user' : 'new_user'}`);
  return true;
}

// Procesar pago rechazado — notificar al usuario
async function processRejection(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  session: Record<string, unknown>
) {
  const payerEmail = session.payer_email as string | null;
  const userId = session.user_id as string | null;

  // Obtener email desde perfil si no está en la sesión
  let emailToNotify = payerEmail;
  let userName = payerEmail?.split('@')[0] || 'Usuario';

  if (!emailToNotify && userId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .maybeSingle();

    if (profile) {
      emailToNotify = profile.email;
      userName = profile.full_name || profile.email.split('@')[0];
    }
  }

  if (!emailToNotify) {
    console.error('❌ No hay email para notificar rechazo');
    return false;
  }

  try {
    const { sendEmailWithTemplate } = await import('@/lib/resend');
    const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://esteticaprohub.com/';

    await sendEmailWithTemplate(
      'payment_rejected_pse',
      emailToNotify,
      userId || emailToNotify,
      {
        nombre: userName,
        app_url: appUrl,
      }
    );
  } catch (emailError) {
    console.error('⚠️ Error enviando email de rechazo PSE:', emailError);
  }

  console.log('✅ Notificación de rechazo PSE enviada a:', emailToNotify);
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      data[key] = value.toString();
    });

    // Verificar firma
    const isValid = verifyEpaycoSignature(data);
    if (!isValid) {
      console.error('❌ Firma ePayco inválida');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const externalReference = data.x_extra1 || data.x_id_invoice;
    const transactionId = data.x_transaction_id;
    const responseCode = data.x_response_reason_code || data.x_cod_response;
    const payerEmail = data.x_customer_email || null;

    if (!externalReference) {
      console.error('❌ No se encontró referencia externa en webhook');
      return NextResponse.json({ error: 'Missing external reference' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Buscar la sesión de pago
    const { data: session, error: sessionError } = await supabase
      .from('payment_sessions')
      .select('*')
      .eq('external_reference', externalReference)
      .single();

    if (sessionError || !session) {
      console.error('❌ Sesión no encontrada:', externalReference);
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const flowType = session.flow_type as string | null;

    // --- PAGO ACEPTADO ---
    if (isEpaycoPaymentAccepted(responseCode)) {
      console.log('✅ Pago aceptado — flow_type:', flowType);

      // Marcar sesión como paid
      const { error: updateError } = await supabase
        .from('payment_sessions')
        .update({
          status: 'paid',
          epayco_transaction_id: transactionId,
          payer_email: payerEmail,
        })
        .eq('external_reference', externalReference);

      if (updateError) {
        console.error('❌ Error actualizando sesión:', updateError);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      // Sesión actualizada — obtener versión fresca con payer_email
      const updatedSession = { ...session, payer_email: payerEmail, status: 'paid' };

      // Ejecutar flujo según tipo
      if (flowType === 'renewal' && session.user_id) {
        // Flujo 3: usuario logueado — activar directamente
        await processRenewal(supabase, updatedSession);
        await supabase
          .from('payment_sessions')
          .update({ status: 'used' })
          .eq('external_reference', externalReference);
      } else if (flowType === 'existing_user' || flowType === 'new_user') {
        // Flujos 1 y 2: usuario sin sesión — enviar email con link
        await processAsyncRegistration(supabase, updatedSession, flowType);
        // La sesión queda en 'paid' hasta que el usuario complete el registro
      } else {
        // Fallback: comportamiento anterior — solo marcar como paid
        console.log('⚠️ flow_type desconocido o null — sesión marcada como paid solamente');
      }

      return NextResponse.json({ message: 'Payment confirmed' });
    }

    // --- PAGO PENDIENTE ---
    if (isEpaycoPaymentPending(responseCode)) {
      console.log('⏳ Pago pendiente');

      await supabase
        .from('payment_sessions')
        .update({
          epayco_transaction_id: transactionId,
          payer_email: payerEmail,
        })
        .eq('external_reference', externalReference);

      return NextResponse.json({ message: 'Payment pending' });
    }

    // --- PAGO RECHAZADO ---
    console.log('❌ Pago rechazado — código:', responseCode);

    await supabase
      .from('payment_sessions')
      .update({
        status: 'expired',
        payer_email: payerEmail,
      })
      .eq('external_reference', externalReference);

    // Notificar rechazo
    const sessionWithEmail = { ...session, payer_email: payerEmail };
    await processRejection(supabase, sessionWithEmail);

    return NextResponse.json({ message: 'Payment rejected' });

  } catch (error) {
    console.error('💥 Error en webhook ePayco:', error);
    // Siempre responder 200 para que ePayco no reintente indefinidamente
    return NextResponse.json({ received: true }, { status: 200 });
  }
}