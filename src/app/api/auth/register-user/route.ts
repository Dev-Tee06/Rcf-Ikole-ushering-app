import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { fullName, email, password, role } = await request.json()

    if (!fullName || !email || !password) {
      return NextResponse.json({ error: 'Full name, email, and password are required.' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanName = fullName.trim()
    const assignedRole = role === 'admin' || role === 'team_leader' ? role : 'member'

    const supabaseAdmin = createAdminClient()

    // 1. Check if user already exists
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    if (listError) {
      console.error('List users error:', listError)
    }

    const existingUser = users?.find((u) => u.email?.toLowerCase() === cleanEmail)
    let userId: string

    if (existingUser) {
      userId = existingUser.id

      // Update password and ensure email is confirmed
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        email_confirm: true,
        user_metadata: {
          full_name: cleanName,
          role: assignedRole,
        },
      })

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    } else {
      // Create user with pre-confirmed email
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: cleanName,
          role: assignedRole,
        },
      })

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      userId = created.user.id
    }

    // 2. Ensure profile exists in public.profiles
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
      {
        id: userId,
        full_name: cleanName,
        email: cleanEmail,
        role: assignedRole,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

    if (profileError) {
      console.error('Error upserting profile:', profileError)
    }

    return NextResponse.json({
      success: true,
      userId,
      message: 'Account created and email confirmed successfully.',
    })
  } catch (err: any) {
    console.error('Register-user exception:', err)
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred while creating account.' },
      { status: 500 }
    )
  }
}
