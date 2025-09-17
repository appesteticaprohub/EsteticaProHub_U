import { NextResponse } from 'next/server';
import { isAutoRenewalEnabled } from '@/lib/settings';

export async function GET() {
  const autoRenewal = await isAutoRenewalEnabled();
  
  return NextResponse.json({
    autoRenewal
  });
}