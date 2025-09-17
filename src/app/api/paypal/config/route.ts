import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    autoRenewal: process.env.ENABLE_AUTO_RENEWAL === 'true'
  });
}