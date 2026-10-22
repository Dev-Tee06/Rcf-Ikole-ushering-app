import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { watToUTC } from '@/lib/time'

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
  const { authorized } = await checkAdminAuth()
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized: Administrator access required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { occurrence_date, service_type, start_time, end_time, notes } = body

    if (!occurrence_date || !service_type || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Missing occurrence_date, service_type, start_time, or end_time' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // 1. Find matching parent service
    let { data: service } = await adminClient
      .from('services')
      .select('id, absence_deadline_hours')
      .eq('service_type', service_type)
      .maybeSingle()

    if (!service) {
      const { data: anyService } = await adminClient
        .from('services')
        .select('id, absence_deadline_hours')
        .limit(1)
        .single()
      service = anyService
    }

    if (!service) {
      return NextResponse.json({ error: 'No parent service found in database' }, { status: 500 })
    }

    // 2. Compute absence_deadline (start_time + absence_deadline_hours)
    const deadlineHours = service.absence_deadline_hours || 2
    const startUTC = watToUTC(occurrence_date, start_time)
    const deadlineUTC = new Date(startUTC.getTime() + deadlineHours * 60 * 60 * 1000)

    // 3. Insert service occurrence
    const { data: occurrence, error } = await adminClient
      .from('service_occurrences')
      .insert({
        service_id: service.id,
        service_type,
        occurrence_date,
        start_time,
        end_time,
        absence_deadline: deadlineUTC.toISOString(),
        notes: notes?.trim() || null,
        roster_published: false,
      })
      .select(`
        id,
        service_id,
        service_type,
        occurrence_date,
        start_time,
        end_time,
        absence_deadline,
        notes,
        roster_published,
        roster_published_at,
        service:services (
          name,
          description
        )
      `)
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A service occurrence already exists for this date and service type' },
          { status: 400 }
        )
      }
      throw error
    }

    return NextResponse.json({ success: true, occurrence })
  } catch (err: any) {
    console.error('Error creating service occurrence:', err)
    return NextResponse.json({ error: err.message || 'Failed to create service occurrence' }, { status: 500 })
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

    if (!id) {
      return NextResponse.json({ error: 'Missing service occurrence id' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 1. Delete associated duty assignments
    await adminClient
      .from('duty_assignments')
      .delete()
      .eq('service_occurrence_id', id)

    // 2. Delete associated attendance records
    await adminClient
      .from('attendance_records')
      .delete()
      .eq('service_occurrence_id', id)

    // 3. Delete associated absence notifications if any
    await (adminClient as any)
      .from('absence_notifications')
      .delete()
      .eq('service_occurrence_id', id)

    // 4. Delete the service occurrence itself
    const { error } = await adminClient
      .from('service_occurrences')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Service and associated records deleted' })
  } catch (err: any) {
    console.error('Error deleting service occurrence:', err)
    return NextResponse.json({ error: err.message || 'Failed to delete service' }, { status: 500 })
  }
}
