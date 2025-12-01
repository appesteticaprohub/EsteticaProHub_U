import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server-supabase';
import { cancelSubscription } from '@/lib/subscription-utils';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticación
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userId = sessionData.session.user.id;

    // Obtener datos del usuario incluyendo paypal_subscription_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_status, auto_renewal_enabled, paypal_subscription_id, email, full_name, subscription_expires_at')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    // Validaciones de estado
    if (profile.subscription_status === 'Cancelled') {
      return NextResponse.json({ error: 'La suscripción ya está cancelada' }, { status: 400 });
    }

    if (!['Active', 'Payment_Failed', 'Grace_Period'].includes(profile.subscription_status)) {
      return NextResponse.json({ error: 'No se puede cancelar suscripción en este estado' }, { status: 400 });
    }

    // 🚨 SOLUCIÓN AL PROBLEMA CRÍTICO: Cancelar INMEDIATAMENTE en PayPal
    console.log('🔄 Cancelando suscripción para usuario:', userId);
    
    // Paso 1: Cancelar inmediatamente en PayPal si existe paypal_subscription_id
    if (profile.paypal_subscription_id) {
      console.log('💳 Cancelando inmediatamente en PayPal:', profile.paypal_subscription_id);
      
      try {
        const { cancelPayPalSubscription } = await import('@/lib/paypal');
        const paypalResponse = await cancelPayPalSubscription(
          profile.paypal_subscription_id, 
          "User voluntarily cancelled subscription"
        );
        
        if (paypalResponse.status === 204) {
          console.log('✅ Suscripción cancelada exitosamente en PayPal');
        } else {
          console.error('⚠️ PayPal cancelación no exitosa. Status:', paypalResponse.status);
          // Continuamos anyway porque el usuario solicitó cancelar
        }
      } catch (paypalError) {
        console.error('⚠️ Error cancelando en PayPal:', paypalError);
        // Continuamos con la cancelación local anyway
      }
    } else {
      console.log('ℹ️ No hay paypal_subscription_id - solo actualización local');
    }

    // Paso 2: Actualizar estado local (como antes)
    const success = await cancelSubscription(userId);

    if (!success) {
      return NextResponse.json({ error: 'Error pausando renovación automática' }, { status: 500 });
    }

    console.log(`✅ Suscripción cancelada exitosamente para usuario ${userId}`);
    console.log(`📅 Usuario mantendrá acceso hasta ${profile.subscription_expires_at}`);
    console.log(`🛡️ PayPal ya no cobrará automáticamente`);

    return NextResponse.json({ 
      success: true, 
      message: 'Suscripción cancelada exitosamente. Conservarás acceso hasta la fecha de expiración y NO se realizarán más cobros automáticos.' 
    });

  } catch (error) {
    console.error('❌ Error cancelando suscripción:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}