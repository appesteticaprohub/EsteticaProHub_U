import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPayPalPayment, createPayPalSubscription, createOrGetPayPalSubscriptionPlan, getDynamicPrice } from '@/lib/paypal';
import { isAutoRenewalEnabled } from '@/lib/settings';

// Generar referencia externa única
function generateExternalReference(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `${timestamp}-${random}`;
}

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const isAutoRenewal = await isAutoRenewalEnabled();

    // Crear payment session en base de datos
    const externalReference = generateExternalReference();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // Expira en 48 horas

    // Obtener precio dinámico desde la base de datos
    const dynamicPrice = await getDynamicPrice();
    const priceNumber = parseFloat(dynamicPrice);

    const sessionData = {
      external_reference: externalReference,
      amount: priceNumber,
      expires_at: expiresAt.toISOString(),
      status: 'pending',
      subscription_type: isAutoRenewal ? 'recurring' : 'one_time'
    };

    const { error: dbError } = await supabase
      .from('payment_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Error creating payment session' },
        { status: 500 }
      );
    }

    if (isAutoRenewal) {
      // ==================== FLUJO DE SUSCRIPCIÓN ====================
      
      console.log('🔄 INICIANDO FLUJO DE SUSCRIPCIÓN');
      console.log('📊 External Reference:', externalReference);
      console.log('🏦 PayPal Environment:', process.env.PAYPAL_ENVIRONMENT);
      console.log('🔑 PayPal Client ID exists:', !!process.env.PAYPAL_CLIENT_ID);
      console.log('🔐 PayPal Client Secret exists:', !!process.env.PAYPAL_CLIENT_SECRET);
      
      try {
        // Primero crear el plan con precio dinámico
        console.log('📋 Obteniendo plan de suscripción PayPal...');
        console.log('💰 Precio dinámico obtenido: $' + dynamicPrice);
        const plan = await createOrGetPayPalSubscriptionPlan(dynamicPrice);
        
        console.log('📋 Respuesta del plan:', JSON.stringify(plan, null, 2));
        
        if (plan.error) {
          console.error('❌ PayPal Plan error:', plan.error);
          console.error('❌ Plan error details:', JSON.stringify(plan, null, 2));
          return NextResponse.json(
            { 
              error: 'Error creating subscription plan',
              details: plan.error,
              step: 'plan_creation'
            },
            { status: 500 }
          );
        }

        if (!plan.id) {
          console.error('❌ Plan creado pero sin ID:', JSON.stringify(plan, null, 2));
          return NextResponse.json(
            { 
              error: 'Plan created but no ID returned',
              details: plan,
              step: 'plan_validation'
            },
            { status: 500 }
          );
        }

        console.log('✅ Plan creado exitosamente con ID:', plan.id);
        
        // Crear suscripción con el plan
        console.log('🔄 Creando suscripción PayPal con plan ID:', plan.id);
        const paypalSubscription = await createPayPalSubscription(externalReference, plan.id);

        console.log('🔄 Respuesta de suscripción:', JSON.stringify(paypalSubscription, null, 2));

        if (paypalSubscription.error) {
          console.error('❌ PayPal Subscription error:', paypalSubscription.error);
          console.error('❌ Subscription error details:', JSON.stringify(paypalSubscription, null, 2));
          return NextResponse.json(
            { 
              error: 'Error creating PayPal subscription',
              details: paypalSubscription.error,
              step: 'subscription_creation'
            },
            { status: 500 }
          );
        }

        if (!paypalSubscription.id) {
          console.error('❌ Suscripción creada pero sin ID:', JSON.stringify(paypalSubscription, null, 2));
          return NextResponse.json(
            { 
              error: 'Subscription created but no ID returned',
              details: paypalSubscription,
              step: 'subscription_validation'
            },
            { status: 500 }
          );
        }

        console.log('✅ Suscripción creada exitosamente con ID:', paypalSubscription.id);

        // Actualizar session con PayPal subscription ID
        console.log('💾 Actualizando payment session con subscription ID...');
        const { error: updateError } = await supabase
          .from('payment_sessions')
          .update({ paypal_subscription_id: paypalSubscription.id })
          .eq('external_reference', externalReference);

        if (updateError) {
          console.error('❌ Error actualizando payment session:', updateError);
        } else {
          console.log('✅ Payment session actualizada correctamente');
        }

        // Encontrar URL de aprobación de PayPal
        console.log('🔍 Buscando URL de aprobación...');
        console.log('🔗 Links disponibles:', JSON.stringify(paypalSubscription.links, null, 2));
        
        const approvalUrl = paypalSubscription.links?.find(
          (link: { rel: string; href: string }) => link.rel === 'approve'
        )?.href;

        if (!approvalUrl) {
          console.error('❌ No se encontró URL de aprobación');
          console.error('🔗 Links recibidos:', JSON.stringify(paypalSubscription.links, null, 2));
          return NextResponse.json(
            { 
              error: 'No approval URL found',
              details: paypalSubscription.links,
              step: 'approval_url_extraction'
            },
            { status: 500 }
          );
        }

        console.log('✅ URL de aprobación encontrada:', approvalUrl);
        console.log('🎉 FLUJO DE SUSCRIPCIÓN COMPLETADO EXITOSAMENTE');

        return NextResponse.json({
          success: true,
          payment_type: 'subscription',
          paypal_subscription_id: paypalSubscription.id,
          approval_url: approvalUrl,
          external_reference: externalReference
        });

      } catch (subscriptionError) {
        console.error('💥 Error inesperado en flujo de suscripción:', subscriptionError);
        console.error('💥 Stack trace:', (subscriptionError as Error).stack);
        return NextResponse.json(
          { 
            error: 'Unexpected error in subscription flow',
            details: (subscriptionError as Error).message,
            step: 'unexpected_error'
          },
          { status: 500 }
        );
      }

    } else {
      // ==================== FLUJO DE PAGO ÚNICO (EXISTENTE) ====================
      
      // Crear pago en PayPal con precio dinámico
      const paypalPayment = await createPayPalPayment(externalReference, dynamicPrice);

      if (paypalPayment.error) {
        console.error('PayPal error:', paypalPayment.error);
        return NextResponse.json(
          { error: 'Error creating PayPal payment' },
          { status: 500 }
        );
      }

      // Actualizar session con PayPal payment ID
      await supabase
        .from('payment_sessions')
        .update({ paypal_payment_id: paypalPayment.id })
        .eq('external_reference', externalReference);

      // Encontrar URL de aprobación de PayPal (API v2 usa 'approve')
      console.log('🔗 Links recibidos de PayPal:', JSON.stringify(paypalPayment.links, null, 2));
      const approvalUrl = paypalPayment.links?.find(
        (link: { rel: string; href: string }) => link.rel === 'approve'
      )?.href;

      return NextResponse.json({
        success: true,
        payment_type: 'one_time',
        paypal_payment_id: paypalPayment.id,
        approval_url: approvalUrl,
        external_reference: externalReference
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}