import { NextRequest, NextResponse } from 'next/server';
import { getDynamicPrice } from '@/lib/paypal';

export async function GET(request: NextRequest) {
  try {
    const price = await getDynamicPrice();
    
    return NextResponse.json({
      success: true,
      price: parseFloat(price)
    });
  } catch (error) {
    console.error('Error getting subscription price:', error);
    return NextResponse.json({
      success: false,
      price: 10.00 // Fallback
    });
  }
}