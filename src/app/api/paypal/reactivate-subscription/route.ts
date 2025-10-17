import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server-supabase';
import { reactivateSubscription } from '@/lib/subscription-utils';
import { NotificationService } from '@/lib/notification-service';

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticación
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userId = sessionData.session.user.id;

    // Verificar que el usuario tiene una suscripción cancelada pero con acceso activo
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_status, subscription_expires_at')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 });
    }

    if (profile.subscription_status !== 'Cancelled') {
      return NextResponse.json({ error: 'Solo se pueden reactivar suscripciones canceladas' }, { status: 400 });
    }

    // Verificar que aún tiene acceso (no ha expirado)
    const now = new Date();
    const expirationDate = profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : null;
    
    if (!expirationDate || now > expirationDate) {
      return NextResponse.json({ error: 'La suscripción ya ha expirado. Debe renovar en lugar de reactivar.' }, { status: 400 });
    }

    // Reactivar suscripción
const success = await reactivateSubscription(userId);

if (!success) {
  return NextResponse.json({ error: 'Error reactivando suscripción' }, { status: 500 });
}

// 📧 ENVIAR NOTIFICACIONES DE REACTIVACIÓN
try {
  // Obtener datos del usuario para el email
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .single();

  if (userProfile) {
    const userName = userProfile.full_name || userProfile.email.split('@')[0];
    
    console.log('📧 Enviando notificación de reactivación...');
    await NotificationService.sendSubscriptionReactivatedNotification(
      userId,
      userProfile.email,
      userName
    );
    console.log('✅ Notificación de reactivación enviada');
  }
} catch (notificationError) {
  // No fallar la reactivación si el email falla
  console.error('❌ Error enviando notificación de reactivación:', notificationError);
}

return NextResponse.json({ 
  success: true, 
  message: 'Suscripción reactivada exitosamente. Se renovará automáticamente.' 
});

  } catch (error) {
    console.error('Error reactivando suscripción:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}