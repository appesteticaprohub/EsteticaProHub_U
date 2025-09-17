import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPayPalSubscription } from '@/lib/paypal';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing user ID' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Buscar suscripción activa del usuario
    const { data: session, error: sessionError } = await supabase
      .from('payment_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active_subscription')
      .single();

    if (sessionError || !session) {
      return NextResponse.json({
        hasActiveSubscription: false,
        subscriptionType: 'none'
      });
    }

    // Si tiene suscripción, verificar estado en PayPal
    if (session.paypal_subscription_id) {
      const paypalSubscription = await verifyPayPalSubscription(session.paypal_subscription_id);
      
      // Sincronizar estado si es diferente
      if (paypalSubscription.status === 'CANCELLED' && session.status !== 'cancelled_subscription') {
        await supabase
          .from('payment_sessions')
          .update({ status: 'cancelled_subscription' })
          .eq('paypal_subscription_id', session.paypal_subscription_id);
      }

      return NextResponse.json({
        hasActiveSubscription: paypalSubscription.status === 'ACTIVE',
        subscriptionType: 'recurring',
        subscriptionId: session.paypal_subscription_id,
        paypalStatus: paypalSubscription.status,
        nextBillingTime: paypalSubscription.billing_info?.next_billing_time,
        sessionStatus: session.status
      });
    }

    // Si no tiene subscription_id, verificar pago único
    return NextResponse.json({
      hasActiveSubscription: session.status === 'paid' || session.status === 'used',
      subscriptionType: 'one_time',
      sessionStatus: session.status
    });

  } catch (error) {
    console.error('Subscription status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}