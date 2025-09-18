import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const externalReference = searchParams.get('ref');

    if (!externalReference) {
      return NextResponse.json(
        { error: 'External reference is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Obtener session por referencia externa
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

    // Validar expiración PRIMERO (verificación lazy)
    if (new Date() > new Date(session.expires_at)) {
      // Marcar como expired si aún está como pending
      if (session.status === 'pending') {
        const { error: updateError } = await supabase
          .from('payment_sessions')
          .update({ status: 'expired' })
          .eq('external_reference', externalReference);

        if (updateError) {
          console.error('Error updating expired session:', updateError);
        } else {
          console.log('Session marked as expired:', externalReference);
        }
      }

      return NextResponse.json(
        { isValid: false, error: 'La sesión de pago ha expirado' },
        { status: 400 }
      );
    }

    // Validar estado (después de verificar expiración)
    if (session.status !== 'paid') {
      return NextResponse.json(
        { isValid: false, error: 'El pago no ha sido confirmado' },
        { status: 400 }
      );
    }

    // Validar si ya fue usada
    if (session.user_id) {
      return NextResponse.json(
        { isValid: false, error: 'Esta sesión de pago ya ha sido utilizada' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      isValid: true,
      session: {
        amount: session.amount,
        created_at: session.created_at,
        external_reference: session.external_reference
      }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}