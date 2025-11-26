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

    // NUEVO ENFOQUE: Solo pausar renovación automática (NO cancelar en PayPal aún)
    console.log('🔄 Pausando renovación automática para usuario:', userId);
    console.log('💡 PayPal se mantendrá activo hasta la fecha de expiración');

    // Solo actualizar estado local (pausar renovación)
    const success = await cancelSubscription(userId);

    if (!success) {
      return NextResponse.json({ error: 'Error pausando renovación automática' }, { status: 500 });
    }

    console.log(`✅ Renovación automática pausada para usuario ${userId}`);
    console.log(`📅 Usuario mantendrá acceso hasta ${profile.subscription_expires_at}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Renovación automática pausada exitosamente. Conservarás acceso hasta la fecha de expiración y puedes reactivar cuando quieras.' 
    });

  } catch (error) {
    console.error('❌ Error cancelando suscripción:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}