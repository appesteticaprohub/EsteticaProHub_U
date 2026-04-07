// src/app/api/epayco/create-payment/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateExternalReference, getDynamicPrice, buildEpaycoCheckoutUrl } from '@/lib/epayco';

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Obtener precio dinámico
    const dynamicPrice = await getDynamicPrice();
    const priceNumber = parseFloat(dynamicPrice);

    // Generar referencia única
    const externalReference = generateExternalReference();

    // Expiración en 48 horas
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    // Crear payment session en BD
    const { error: dbError } = await supabase
      .from('payment_sessions')
      .insert({
        external_reference: externalReference,
        amount: priceNumber,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
        subscription_type: 'one_time',
      });

    if (dbError) {
    console.error('❌ Error creando payment session:', JSON.stringify(dbError, null, 2));
    return NextResponse.json(
        { error: 'Error creando sesión de pago', details: dbError },
        { status: 500 }
    );
    }

    // Construir URL del checkout de ePayco
    const checkoutUrl = buildEpaycoCheckoutUrl({
      externalReference,
      amount: dynamicPrice,
    });

    console.log('✅ Payment session creada:', externalReference);
    console.log('✅ Precio:', dynamicPrice);
    console.log('✅ Checkout URL generada');

    return NextResponse.json({
      success: true,
      approval_url: checkoutUrl,
      external_reference: externalReference,
    });

  } catch (error) {
    console.error('💥 Error inesperado:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}