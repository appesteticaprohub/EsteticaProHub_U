// src/app/api/epayco/validate-session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const externalReference = searchParams.get('ref');

    if (!externalReference) {
      return NextResponse.json(
        { isValid: false, error: 'Referencia de pago requerida' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: session, error } = await supabase
      .from('payment_sessions')
      .select('*')
      .eq('external_reference', externalReference)
      .single();

    if (error || !session) {
      return NextResponse.json(
        { isValid: false, error: 'Sesión de pago no encontrada' },
        { status: 404 }
      );
    }

    // Sesión expirada por tiempo
    if (new Date() > new Date(session.expires_at)) {
      if (session.status === 'pending') {
        await supabase
          .from('payment_sessions')
          .update({ status: 'expired' })
          .eq('external_reference', externalReference);
      }
      return NextResponse.json(
        { isValid: false, error: 'La sesión de pago ha expirado' },
        { status: 400 }
      );
    }

    // Sesión ya utilizada
    if (session.status === 'used') {
      // Si era renovación de usuario logueado, redirigir a perfil en lugar de error
      if (session.flow_type === 'renewal') {
        return NextResponse.json({
          isValid: false,
          isCompleted: true,
          redirectTo: '/perfil',
          error: 'Sesión ya procesada',
        });
      }
      return NextResponse.json(
        { isValid: false, error: 'Esta sesión de pago ya fue utilizada' },
        { status: 400 }
      );
    }

    // Pago pendiente — retornar estado especial sin redirigir a error
    if (session.status === 'pending') {
      const payerEmail = session.payer_email || null;

      // Determinar is_existing_user si ya tenemos el email
      let isExistingUser = false;
      if (payerEmail) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', payerEmail)
          .maybeSingle();
        isExistingUser = !!existingProfile;
      }

      return NextResponse.json({
        isValid: false,
        isPending: true,
        payer_email: payerEmail,
        is_existing_user: isExistingUser,
        flow_type: session.flow_type || null,
        error: 'Pago en proceso',
      });
    }

    // Pago confirmado (paid)
    if (session.status === 'paid') {
      const payerEmail = session.payer_email || null;

      let isExistingUser = false;
      if (payerEmail) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, subscription_status')
          .eq('email', payerEmail)
          .maybeSingle();
        isExistingUser = !!existingProfile;
      }

      return NextResponse.json({
        isValid: true,
        isPending: false,
        payer_email: payerEmail,
        is_existing_user: isExistingUser,
        flow_type: session.flow_type || null,
        session: {
          amount: session.amount,
          created_at: session.created_at,
          external_reference: session.external_reference,
        },
      });
    }

    // Cualquier otro estado (expired, etc.)
    return NextResponse.json(
      { isValid: false, error: 'El pago no pudo ser procesado' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error validando sesión:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}