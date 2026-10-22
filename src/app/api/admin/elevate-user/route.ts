import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { email, userId } = await request.json()

    if (!email && !userId) {
      return NextResponse.json({ error: 'Email or User ID is required' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    let targetUserId = userId

    if (!targetUserId && email) {
      const cleanEmail = email.trim().toLowerCase()
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      if (listError) {
        return NextResponse.json({ error: listError.message }, { status: 500 })
      }
      const user = users.find((u) => u.email?.toLowerCase() === cleanEmail)
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      targetUserId = user.id
    }

    // 1. Update user metadata in auth.users
    await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
      email_confirm: true,
      user_metadata: { role: 'admin' },
    })

    // 2. Update role in public.profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        role: 'admin',
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUserId)

    if (profileError) {
      console.error('Error updating profile role:', profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Account successfully elevated to Administrator.',
    })
  } catch (err: any) {
    console.error('Elevate user exception:', err)
    return NextResponse.json(
      { error: err.message || 'An error occurred elevating user to admin.' },
      { status: 500 }
    )
  }
}
