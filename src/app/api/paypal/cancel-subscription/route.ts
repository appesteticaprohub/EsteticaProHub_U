import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server-supabase';
import { cancelSubscription } from '@/lib/subscription-utils';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticación
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userId = sessionData.session.user.id;

    // Verificar que el usuario tiene una suscripción activa o cancelable
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_status, auto_renewal_enabled')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    if (profile.subscription_status === 'Cancelled') {
      return NextResponse.json({ error: 'La suscripción ya está cancelada' }, { status: 400 });
    }

    if (!['Active', 'Payment_Failed', 'Grace_Period'].includes(profile.subscription_status)) {
      return NextResponse.json({ error: 'No se puede cancelar suscripción en este estado' }, { status: 400 });
    }

    // Cancelar suscripción (actualizar estado en BD)
    const success = await cancelSubscription(userId);

    if (!success) {
      return NextResponse.json({ error: 'Error cancelando suscripción' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Suscripción cancelada exitosamente. Conservarás acceso hasta la fecha de expiración.' 
    });

  } catch (error) {
    console.error('Error cancelando suscripción:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}