import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()
    await supabase.auth.signOut()

    return NextResponse.json({
      data: { success: true },
      error: null
    })
  } catch (error) {
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}