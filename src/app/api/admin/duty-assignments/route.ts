import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function checkAdminAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
    const { service_occurrence_id, duty_post_id, member_id, notes, is_draft } = body

    if (!service_occurrence_id || !duty_post_id || !member_id) {
      return NextResponse.json(
        { error: 'Missing required assignment fields: service_occurrence_id, duty_post_id, or member_id' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // 1. If this member is already assigned to a DIFFERENT post on this service occurrence,
    // remove their previous assignment first so they are cleanly moved to the new station
    const { data: memberExistingAssignment } = await adminClient
      .from('duty_assignments')
      .select('id, duty_post_id')
      .eq('service_occurrence_id', service_occurrence_id)
      .eq('member_id', member_id)
      .maybeSingle()

    if (
      memberExistingAssignment &&
      memberExistingAssignment.duty_post_id !== duty_post_id
    ) {
      await adminClient
        .from('duty_assignments')
        .delete()
        .eq('id', memberExistingAssignment.id)
    }

    // 2. Check if an assignment already exists for this post on this service occurrence
    const { data: existingPostAssignment } = await adminClient
      .from('duty_assignments')
      .select('id')
      .eq('service_occurrence_id', service_occurrence_id)
      .eq('duty_post_id', duty_post_id)
      .maybeSingle()

    let result
    if (existingPostAssignment) {
      const { data, error } = await adminClient
        .from('duty_assignments')
        .update({
          member_id,
          assigned_by: user.id,
          is_draft: is_draft ?? false,
          notes: notes ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPostAssignment.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      const { data, error } = await adminClient
        .from('duty_assignments')
        .insert({
          service_occurrence_id,
          duty_post_id,
          member_id,
          assigned_by: user.id,
          is_draft: is_draft ?? false,
          notes: notes ?? null,
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    return NextResponse.json({
      success: true,
      assignment: result,
      reassignedFromPostId:
        memberExistingAssignment &&
        memberExistingAssignment.duty_post_id !== duty_post_id
          ? memberExistingAssignment.duty_post_id
          : null,
    })
  } catch (err: any) {
    console.error('Error in duty assignment POST:', err)
    return NextResponse.json({ error: err.message || 'Failed to update assignment' }, { status: 500 })
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
    const service_occurrence_id = searchParams.get('service_occurrence_id')
    const duty_post_id = searchParams.get('duty_post_id')

    const adminClient = createAdminClient()

    if (id) {
      const { error } = await adminClient
        .from('duty_assignments')
        .delete()
        .eq('id', id)

      if (error) throw error
    } else if (service_occurrence_id && duty_post_id) {
      const { error } = await adminClient
        .from('duty_assignments')
        .delete()
        .eq('service_occurrence_id', service_occurrence_id)
        .eq('duty_post_id', duty_post_id)

      if (error) throw error
    } else {
      return NextResponse.json({ error: 'Missing assignment id or post reference' }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: 'Assignment removed' })
  } catch (err: any) {
    console.error('Error in duty assignment DELETE:', err)
    return NextResponse.json({ error: err.message || 'Failed to delete assignment' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const { authorized } = await checkAdminAuth()
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized: Administrator access required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { service_occurrence_id, roster_published } = body

    if (!service_occurrence_id || typeof roster_published !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing service_occurrence_id or roster_published boolean' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()
    const now = new Date().toISOString()

    const { data, error } = await adminClient
      .from('service_occurrences')
      .update({
        roster_published,
        roster_published_at: roster_published ? now : null,
        updated_at: now,
      })
      .eq('id', service_occurrence_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, occurrence: data })
  } catch (err: any) {
    console.error('Error in roster publish PATCH:', err)
    return NextResponse.json({ error: err.message || 'Failed to update roster status' }, { status: 500 })
  }
}
