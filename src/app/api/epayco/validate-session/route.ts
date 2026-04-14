import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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

    if (session.status === 'used') {
      return NextResponse.json(
        { isValid: false, error: 'Esta sesión de pago ya fue utilizada' },
        { status: 400 }
      );
    }

    if (session.status !== 'paid') {
      return NextResponse.json(
        { isValid: false, error: 'El pago no ha sido confirmado aún' },
        { status: 400 }
      );
    }

    // Determinar si el payer_email corresponde a un usuario existente
    let isExistingUser = false;
    let payerEmail: string | null = session.payer_email || null;

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
      payer_email: payerEmail,
      is_existing_user: isExistingUser,
      session: {
        amount: session.amount,
        created_at: session.created_at,
        external_reference: session.external_reference,
      },
    });

  } catch (error) {
    console.error('Error validando sesión:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}