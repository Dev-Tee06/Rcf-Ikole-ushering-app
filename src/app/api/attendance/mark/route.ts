import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { watToUTC } from '@/lib/time'

export async function POST(request: NextRequest) {
  // 1. Verify user authentication
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Get service_occurrence_id from request body
  const body = await request.json()
  const serviceOccurrenceId = body.service_occurrence_id || body.serviceOccurrenceId

  if (!serviceOccurrenceId) {
    return NextResponse.json(
      { error: 'Missing service_occurrence_id in request body' },
      { status: 400 }
    )
  }

  // 3. Fetch the service_occurrence (must exist)
  const { data: occurrence, error: occError } = await supabase
    .from('service_occurrences')
    .select('*')
    .eq('id', serviceOccurrenceId)
    .single()

  if (occError || !occurrence) {
    return NextResponse.json(
      { error: 'Service occurrence not found' },
      { status: 404 }
    )
  }

  // 4. Verify current time (server) is between service start time and absence_deadline (Africa/Lagos)
  const now = new Date()
  const serviceStartUTC = watToUTC(occurrence.occurrence_date, occurrence.start_time)

  let deadlineUTC: Date
  if (occurrence.absence_deadline.includes('T')) {
    deadlineUTC = new Date(occurrence.absence_deadline)
  } else {
    deadlineUTC = watToUTC(occurrence.occurrence_date, occurrence.absence_deadline)
  }

  // 5. If outside window: return appropriate error
  if (now < serviceStartUTC) {
    return NextResponse.json(
      { error: 'Service has not started yet. Attendance cannot be marked.' },
      { status: 400 }
    )
  }

  if (now > deadlineUTC) {
    return NextResponse.json(
      { error: 'Attendance window has closed. The absence deadline has passed.' },
      { status: 400 }
    )
  }

  // 6 & 7. Check if already marked present or attendance finalized
  const { data: existingRecord, error: checkError } = await supabase
    .from('attendance_records')
    .select('*')
    .eq('member_id', user.id)
    .eq('service_occurrence_id', serviceOccurrenceId)
    .maybeSingle()

  if (checkError) {
    return NextResponse.json({ error: checkError.message }, { status: 500 })
  }

  if (existingRecord) {
    if (existingRecord.status === 'present') {
      return NextResponse.json({
        success: true,
        message: 'Attendance already marked as present',
        data: existingRecord,
      })
    }

    if (existingRecord.status === 'absent' || existingRecord.status === 'excused') {
      return NextResponse.json(
        { error: 'Attendance already finalized' },
        { status: 400 }
      )
    }

    const { data: updated, error: updateError } = await supabase
      .from('attendance_records')
      .update({
        status: 'present',
        marked_present_at: now.toISOString(),
        marked_by: user.id,
        updated_at: now.toISOString(),
      })
      .eq('id', existingRecord.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 8. Return success with the record
    return NextResponse.json({
      success: true,
      message: 'Attendance marked as present',
      data: updated,
    })
  }

  // Insert new attendance record
  const { data: inserted, error: insertError } = await supabase
    .from('attendance_records')
    .insert({
      member_id: user.id,
      service_occurrence_id: serviceOccurrenceId,
      status: 'present',
      marked_present_at: now.toISOString(),
      marked_by: user.id,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // 8. Return success with the record
  return NextResponse.json({
    success: true,
    message: 'Attendance marked as present',
    data: inserted,
  })
}
