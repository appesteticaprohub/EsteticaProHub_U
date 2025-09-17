import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cancelPayPalSubscription } from '@/lib/paypal';

export async function POST(request: NextRequest) {
  try {
    const { subscriptionId, userId } = await request.json();

    if (!subscriptionId || !userId) {
      return NextResponse.json(
        { error: 'Missing subscription ID or user ID' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verificar que la suscripción pertenece al usuario
    const { data: session, error: sessionError } = await supabase
      .from('payment_sessions')
      .select('*')
      .eq('paypal_subscription_id', subscriptionId)
      .eq('user_id', userId)
      .eq('status', 'active_subscription')
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Subscription not found or not active' },
        { status: 404 }
      );
    }

    // Cancelar en PayPal
    const cancelResponse = await cancelPayPalSubscription(subscriptionId, 'Usuario canceló desde la plataforma');

    if (!cancelResponse.ok) {
      console.error('PayPal cancellation failed:', await cancelResponse.text());
      return NextResponse.json(
        { error: 'Failed to cancel subscription with PayPal' },
        { status: 500 }
      );
    }

    // Actualizar estado en nuestra base de datos
    const { error: updateError } = await supabase
      .from('payment_sessions')
      .update({ status: 'cancelled_subscription' })
      .eq('paypal_subscription_id', subscriptionId);

    if (updateError) {
      console.error('Database error:', updateError);
      return NextResponse.json(
        { error: 'Database update failed' },
        { status: 500 }
      );
    }

    // Actualizar perfil del usuario
    await supabase
      .from('profiles')
      .update({ auto_renewal_enabled: false })
      .eq('id', userId);

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription cancelled successfully' 
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}