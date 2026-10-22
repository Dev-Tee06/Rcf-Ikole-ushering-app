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

export async function POST(request: NextRequest) {
  const { authorized, user } = await checkAdminAuth()
  if (!authorized || !user) {
    return NextResponse.json({ error: 'Unauthorized: Administrator access required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { member_id, service_occurrence_id, status, excused_reason } = body

    if (!member_id || !service_occurrence_id || !status) {
      return NextResponse.json(
        { error: 'Missing member_id, service_occurrence_id, or status' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()
    const now = new Date().toISOString()

    // Check if record already exists
    const { data: existing } = await adminClient
      .from('attendance_records')
      .select('id, status')
      .eq('member_id', member_id)
      .eq('service_occurrence_id', service_occurrence_id)
      .maybeSingle()

    let record
    if (existing) {
      const { data, error } = await adminClient
        .from('attendance_records')
        .update({
          status,
          marked_by: user.id,
          marked_present_at: status === 'present' ? now : null,
          excused_reason: status === 'excused' ? excused_reason || 'Excused by leadership' : null,
          original_status: existing.status,
          correction_reason: 'Updated by administrator',
          updated_at: now,
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      record = data
    } else {
      const { data, error } = await adminClient
        .from('attendance_records')
        .insert({
          member_id,
          service_occurrence_id,
          status,
          marked_by: user.id,
          marked_present_at: status === 'present' ? now : null,
          excused_reason: status === 'excused' ? excused_reason || 'Excused by leadership' : null,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single()

      if (error) throw error
      record = data
    }

    return NextResponse.json({ success: true, record })
  } catch (err: any) {
    console.error('Error in admin attendance POST:', err)
    return NextResponse.json({ error: err.message || 'Failed to record attendance' }, { status: 500 })
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
    const member_id = searchParams.get('member_id')
    const service_occurrence_id = searchParams.get('service_occurrence_id')

    const adminClient = createAdminClient()

    if (id) {
      const { error } = await adminClient.from('attendance_records').delete().eq('id', id)
      if (error) throw error
    } else if (member_id && service_occurrence_id) {
      const { error } = await adminClient
        .from('attendance_records')
        .delete()
        .eq('member_id', member_id)
        .eq('service_occurrence_id', service_occurrence_id)
      if (error) throw error
    } else {
      return NextResponse.json({ error: 'Missing id or member_id + service_occurrence_id' }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Attendance record deleted' })
  } catch (err: any) {
    console.error('Error deleting attendance record:', err)
    return NextResponse.json({ error: err.message || 'Failed to delete attendance record' }, { status: 500 })
  }
}
