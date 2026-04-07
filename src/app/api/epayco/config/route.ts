// src/app/api/epayco/config/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['ENABLE_AUTO_RENEWAL', 'SUBSCRIPTION_PRICE']);

    if (error) {
      console.error('Error obteniendo configuración:', error);
      return NextResponse.json(
        { error: 'Error obteniendo configuración' },
        { status: 500 }
      );
    }

    const settings = Object.fromEntries(
      (data || []).map((row) => [row.key, row.value])
    );

    const autoRenewal = settings['ENABLE_AUTO_RENEWAL'] === 'true';
    const price = parseFloat(settings['SUBSCRIPTION_PRICE'] || '10.00');

    return NextResponse.json({
      autoRenewal,
      price,
      gateway: 'epayco',
    });
  } catch (error) {
    console.error('Error inesperado:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}