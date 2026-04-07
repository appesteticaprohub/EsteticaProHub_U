// src/app/api/epayco/mark-session-used/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { external_reference } = await request.json();

    if (!external_reference) {
      return NextResponse.json(
        { error: 'Referencia externa requerida' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Obtener sesión para verificar estado actual
    const { data: session, error: sessionError } = await supabase
      .from('payment_sessions')
      .select('*')
      .eq('external_reference', external_reference)
      .single();

    if (sessionError || !session) {
      console.error('❌ Sesión no encontrada:', external_reference);
      return NextResponse.json(
        { error: 'Sesión de pago no encontrada' },
        { status: 404 }
      );
    }

    // Solo se puede marcar como usada si está en estado paid
    if (session.status !== 'paid') {
      return NextResponse.json(
        { error: 'La sesión no puede marcarse como usada en su estado actual' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from('payment_sessions')
      .update({ status: 'used' })
      .eq('external_reference', external_reference);

    if (updateError) {
      console.error('❌ Error marcando sesión como usada:', updateError);
      return NextResponse.json(
        { error: 'Error actualizando sesión' },
        { status: 500 }
      );
    }

    console.log(`✅ Sesión ${external_reference} marcada como usada`);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('💥 Error inesperado:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}