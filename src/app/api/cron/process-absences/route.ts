import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { watToUTC } from '@/lib/time'

async function handleProcessAbsences(request: NextRequest) {
  // 1. Verify cron secret header
  const cronSecret = process.env.CRON_SECRET
  const headerSecret =
    request.headers.get('x-cron-secret') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')

  if (!cronSecret || headerSecret !== cronSecret) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or missing cron secret' },
      { status: 401 }
    )
  }

  // 2. Use admin client (service role) to bypass RLS
  const supabase = createAdminClient()

  // 3. Find all service_occurrences where absence_deadline has passed (< NOW()) and occurrence was in the last 7 days
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const sevenDaysAgoDateStr = sevenDaysAgo.toISOString().split('T')[0]

  const { data: occurrences, error: occError } = await supabase
    .from('service_occurrences')
    .select('*')
    .gte('occurrence_date', sevenDaysAgoDateStr)

  if (occError) {
    return NextResponse.json({ error: occError.message }, { status: 500 })
  }

  // Filter occurrences where absence_deadline has passed (< NOW())
  const pastOccurrences = (occurrences || []).filter((occ: any) => {
    let deadlineUTC: Date
    if (occ.absence_deadline.includes('T')) {
      deadlineUTC = new Date(occ.absence_deadline)
    } else {
      deadlineUTC = watToUTC(occ.occurrence_date, occ.absence_deadline)
    }
    return now.getTime() > deadlineUTC.getTime()
  })

  // 4. Find all active profiles
  const { data: profiles, error: profError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, status')
    .eq('status', 'active')

  if (profError) {
    return NextResponse.json({ error: profError.message }, { status: 500 })
  }

  const results: Array<{
    occurrenceId: string
    occurrenceDate: string
    absencesMarked: number
  }> = []

  let totalAbsencesInserted = 0
  let totalAbsencesUpdated = 0

  // 5. For each past occurrence, find active profiles without 'present' or 'excused'
  for (const occ of pastOccurrences) {
    const { data: existingAttendance, error: attError } = await supabase
      .from('attendance_records')
      .select('id, member_id, status')
      .eq('service_occurrence_id', occ.id)

    if (attError) {
      console.error(`Error fetching attendance for occurrence ${occ.id}:`, attError)
      continue
    }

    const attendanceMap = new Map<string, { id: string; status: string }>()
    for (const rec of existingAttendance || []) {
      attendanceMap.set(rec.member_id, { id: rec.id, status: rec.status })
    }

    const toInsert = []
    const toUpdate = []

    for (const member of profiles || []) {
      const existing = attendanceMap.get(member.id)
      if (!existing) {
        // No record exists at all -> mark absent
        toInsert.push({
          member_id: member.id,
          service_occurrence_id: occ.id,
          status: 'absent' as const,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
      } else if (existing.status === 'not_marked') {
        // Record exists with status 'not_marked' -> update to absent
        toUpdate.push(existing.id)
      }
      // If status is 'present', 'excused', or already 'absent', ignore (idempotent)
    }

    // 6. Idempotent database operations
    if (toInsert.length > 0) {
      const { error: insertErr } = await supabase
        .from('attendance_records')
        .insert(toInsert)

      if (insertErr) {
        console.error(`Error inserting absent records for occurrence ${occ.id}:`, insertErr)
      } else {
        totalAbsencesInserted += toInsert.length
      }
    }

    if (toUpdate.length > 0) {
      const { error: updateErr } = await supabase
        .from('attendance_records')
        .update({ status: 'absent', updated_at: now.toISOString() })
        .in('id', toUpdate)

      if (updateErr) {
        console.error(`Error updating absent records for occurrence ${occ.id}:`, updateErr)
      } else {
        totalAbsencesUpdated += toUpdate.length
      }
    }

    results.push({
      occurrenceId: occ.id,
      occurrenceDate: occ.occurrence_date,
      absencesMarked: toInsert.length + toUpdate.length,
    })
  }

  // 7. Log the operation results
  console.log(
    `[CRON process-absences] Completed at ${now.toISOString()}. Past occurrences processed: ${pastOccurrences.length}. Total absent marks: ${totalAbsencesInserted + totalAbsencesUpdated} (inserted: ${totalAbsencesInserted}, updated: ${totalAbsencesUpdated})`
  )

  // 8. Return summary
  return NextResponse.json({
    success: true,
    occurrencesChecked: pastOccurrences.length,
    totalAbsencesMarked: totalAbsencesInserted + totalAbsencesUpdated,
    totalInserted: totalAbsencesInserted,
    totalUpdated: totalAbsencesUpdated,
    summary: results,
    timestamp: now.toISOString(),
  })
}

export async function POST(request: NextRequest) {
  return handleProcessAbsences(request)
}

export async function GET(request: NextRequest) {
  return handleProcessAbsences(request)
}
