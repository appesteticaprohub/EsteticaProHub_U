import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { external_reference } = await request.json();

    if (!external_reference) {
      return NextResponse.json(
        { error: 'External reference is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Obtener la sesión completa para verificar estado y obtener user_id
    const { data: session, error: sessionError } = await supabase
      .from('payment_sessions')
      .select('*')
      .eq('external_reference', external_reference)
      .single();

    if (sessionError || !session) {
      console.error('Session not found:', sessionError);
      return NextResponse.json(
        { error: 'Payment session not found' },
        { status: 400 }
      );
    }

    // Verificar que la sesión tenga user_id (fue asociada en signup)
    if (!session.user_id) {
      return NextResponse.json(
        { error: 'Session not associated with user' },
        { status: 400 }
      );
    }

    // Marcar sesión como usada
    const { error: updateError } = await supabase
      .from('payment_sessions')
      .update({ status: 'used' })
      .eq('external_reference', external_reference);

    if (updateError) {
      console.error('Error marking session as used:', updateError);
      return NextResponse.json(
        { error: 'Database update failed' },
        { status: 500 }
      );
    }

    console.log(`Session ${external_reference} marked as used for user ${session.user_id}`);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}