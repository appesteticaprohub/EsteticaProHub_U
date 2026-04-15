// src/app/api/epayco/create-payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateExternalReference, getDynamicPrice, buildEpaycoCheckoutParams } from '@/lib/epayco';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Leer flow_type y user_id del body
    let flowType: string | null = null;
    let userId: string | null = null;

    try {
      const body = await request.json();
      flowType = body.flow_type || null;
      userId = body.user_id || null;
    } catch {
      // Body vacío — continuar sin flow_type
    }

    // Obtener precio dinámico
    const dynamicPrice = await getDynamicPrice();
    const priceNumber = parseFloat(dynamicPrice);

    // Generar referencia única
    const externalReference = generateExternalReference();

    // Expiración en 48 horas
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    // Crear payment session en BD
    const insertData: Record<string, unknown> = {
      external_reference: externalReference,
      amount: priceNumber,
      expires_at: expiresAt.toISOString(),
      status: 'pending',
      subscription_type: 'one_time',
    };

    if (flowType) insertData.flow_type = flowType;
    if (userId) insertData.user_id = userId;

    const { error: dbError } = await supabase
      .from('payment_sessions')
      .insert(insertData);

    if (dbError) {
      console.error('❌ Error creando payment session:', JSON.stringify(dbError, null, 2));
      return NextResponse.json(
        { error: 'Error creando sesión de pago', details: dbError },
        { status: 500 }
      );
    }

    // Construir parámetros del checkout de ePayco
    const checkoutParams = buildEpaycoCheckoutParams({
      externalReference,
      amount: dynamicPrice,
    });

    return NextResponse.json({
      success: true,
      checkout_params: checkoutParams,
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