import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function checkAdminAuth() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { authorized: false, user: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'team_leader')) {
    return { authorized: false, user }
  }

  return { authorized: true, user }
}

export async function GET() {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('dress_codes')
    .select('*')
    .order('applicable_sunday', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const { authorized, user } = await checkAdminAuth()
  if (!authorized || !user) {
    return NextResponse.json({ error: 'Unauthorized: Administrator access required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { applicable_sunday, instructions, image_url, status } = body

    if (!applicable_sunday || !instructions?.trim()) {
      return NextResponse.json(
        { error: 'Applicable Sunday date and attire instructions are required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()
    const now = new Date().toISOString()

    // Check if an entry already exists for this Sunday
    const { data: existing } = await adminClient
      .from('dress_codes')
      .select('id')
      .eq('applicable_sunday', applicable_sunday)
      .maybeSingle()

    let record
    if (existing) {
      const { data, error } = await adminClient
        .from('dress_codes')
        .update({
          instructions: instructions.trim(),
          image_url: image_url?.trim() || null,
          status: status || 'published',
          published_at: now,
          published_by: user.id,
          updated_at: now,
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      record = data
    } else {
      const { data, error } = await adminClient
        .from('dress_codes')
        .insert({
          applicable_sunday,
          instructions: instructions.trim(),
          image_url: image_url?.trim() || null,
          status: status || 'published',
          published_at: now,
          published_by: user.id,
        })
        .select()
        .single()

      if (error) throw error
      record = data
    }

    return NextResponse.json({ success: true, dressCode: record })
  } catch (err: any) {
    console.error('Error in dress-codes POST:', err)
    return NextResponse.json({ error: err.message || 'Failed to save dress code' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const { authorized } = await checkAdminAuth()
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized: Administrator access required' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const applicable_sunday = searchParams.get('applicable_sunday')

    const adminClient = createAdminClient()

    if (id) {
      const { error } = await adminClient.from('dress_codes').delete().eq('id', id)
      if (error) throw error
    } else if (applicable_sunday) {
      const { error } = await adminClient
        .from('dress_codes')
        .delete()
        .eq('applicable_sunday', applicable_sunday)
      if (error) throw error
    } else {
      return NextResponse.json({ error: 'Missing dress code id or applicable_sunday' }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Sunday attire deleted successfully' })
  } catch (err: any) {
    console.error('Error in dress-codes DELETE:', err)
    return NextResponse.json({ error: err.message || 'Failed to delete dress code' }, { status: 500 })
  }
}
