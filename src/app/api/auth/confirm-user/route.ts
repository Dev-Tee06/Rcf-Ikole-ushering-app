import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()
    const supabaseAdmin = createAdminClient()

    // 1. Find user in auth.users
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    if (listError) {
      console.error('Admin listUsers error:', listError)
      return NextResponse.json({ error: listError.message }, { status: 500 })
    }

    const user = users.find((u) => u.email?.toLowerCase() === cleanEmail)

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email. Please check the email or create a new account.' },
        { status: 404 }
      )
    }

    // 2. Confirm user email immediately
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    })

    if (updateError) {
      console.error('Admin updateUserById error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 3. Ensure profile is active
    await supabaseAdmin
      .from('profiles')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', user.id)

    return NextResponse.json({
      success: true,
      message: 'Email confirmed successfully. You can now log in immediately.',
    })
  } catch (err: any) {
    console.error('Auto-confirm exception:', err)
    return NextResponse.json(
      { error: err.message || 'An error occurred while confirming email.' },
      { status: 500 }
    )
  }
}
