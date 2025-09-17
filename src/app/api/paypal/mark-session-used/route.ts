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

    const { error } = await supabase
      .from('payment_sessions')
      .update({ status: 'used' })
      .eq('external_reference', external_reference);

    if (error) {
      console.error('Error marking session as used:', error);
      return NextResponse.json(
        { error: 'Database update failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}