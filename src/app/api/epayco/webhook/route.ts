// src/app/api/epayco/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyEpaycoSignature, isEpaycoPaymentAccepted, isEpaycoPaymentPending } from '@/lib/epayco';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const data: Record<string, string> = {};
    formData.forEach((value, key) => {
      data[key] = value.toString();
    });

    console.log('🔔 ePayco Webhook recibido:', JSON.stringify(data, null, 2));

    console.log('📧 Campos de email disponibles:', {
      x_email: data.x_email,
      x_customer_email: data.x_customer_email,
      x_billing_email: data.x_billing_email,
      x_payer_email: data.x_payer_email,
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
    const amount = data.x_amount;

    if (!externalReference) {
      console.error('❌ No se encontró referencia externa en webhook');
      return NextResponse.json({ error: 'Missing external reference' }, { status: 400 });
    }

    console.log('📋 Referencia:', externalReference);
    console.log('💳 Transaction ID:', transactionId);
    console.log('📊 Response code:', responseCode);
    console.log('💰 Amount:', amount);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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

    // Pago aceptado
    if (isEpaycoPaymentAccepted(responseCode)) {
      console.log('✅ Pago aceptado por ePayco');

      const { error: updateError } = await supabase
        .from('payment_sessions')
        .update({
          status: 'paid',
          epayco_transaction_id: transactionId,
          payer_email: data.x_email || null,
        })
        .eq('external_reference', externalReference);

      if (updateError) {
        console.error('❌ Error actualizando sesión:', updateError);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      console.log('✅ Sesión actualizada a paid:', externalReference);
      return NextResponse.json({ message: 'Payment confirmed' });
    }

    // Pago pendiente
    if (isEpaycoPaymentPending(responseCode)) {
      console.log('⏳ Pago pendiente en ePayco');

      await supabase
        .from('payment_sessions')
        .update({
          epayco_transaction_id: transactionId,
        })
        .eq('external_reference', externalReference);

      return NextResponse.json({ message: 'Payment pending' });
    }

    // Pago rechazado o fallido
    console.log('❌ Pago rechazado/fallido, código:', responseCode);
    await supabase
      .from('payment_sessions')
      .update({ status: 'expired' })
      .eq('external_reference', externalReference);

    return NextResponse.json({ message: 'Payment rejected' });

  } catch (error) {
    console.error('💥 Error en webhook ePayco:', error);
    // Siempre responder 200 para que ePayco no reintente indefinidamente
    return NextResponse.json({ received: true }, { status: 200 });
  }
}