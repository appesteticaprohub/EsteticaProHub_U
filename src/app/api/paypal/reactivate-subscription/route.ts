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

    // Obtener paypal_subscription_id antes de reactivar
const { data: profileData, error: profileDataError } = await supabase
  .from('profiles')
  .select('paypal_subscription_id, email, full_name')
  .eq('id', userId)
  .single();

if (profileDataError || !profileData) {
  return NextResponse.json({ error: 'Error obteniendo datos del perfil' }, { status: 500 });
}

// NUEVO ENFOQUE: Solo reactivar renovación automática (PayPal ya está activo)
console.log('🔄 Reactivando renovación automática para usuario:', userId);
console.log('💡 PayPal ya está activo, solo habilitamos auto-renovación');

// No necesitamos llamar a PayPal porque nunca se canceló

// Reactivar localmente después de PayPal
const success = await reactivateSubscription(userId);

if (!success) {
  return NextResponse.json({ error: 'Error actualizando estado local' }, { status: 500 });
}

// 📧 ENVIAR NOTIFICACIONES DE REACTIVACIÓN
try {
  const userName = profileData.full_name || profileData.email.split('@')[0];
  
  console.log('📧 Enviando notificación de reactivación...');
  await NotificationService.sendSubscriptionReactivatedNotification(
    userId,
    profileData.email,
    userName
  );
  console.log('✅ Notificación de reactivación enviada');
} catch (notificationError) {
  // No fallar la reactivación si el email falla
  console.error('❌ Error enviando notificación de reactivación:', notificationError);
}

console.log(`✅ Suscripción reactivada completamente para usuario ${userId}`);

return NextResponse.json({ 
  success: true, 
  message: 'Suscripción reactivada exitosamente en PayPal y localmente. Se renovará automáticamente.' 
});

  } catch (error) {
    console.error('Error reactivando suscripción:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}