import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateBibleReference } from '@/lib/bible'
import { watToUTC, calculateCompletionWindow, todayInWAT } from '@/lib/time'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const scheduleId = body.schedule_id || body.scheduleId
  const taskType = body.task_type || body.taskType
  const accountabilityDate = body.accountability_date || body.accountabilityDate

  if (!scheduleId || !taskType || !accountabilityDate) {
    return NextResponse.json(
      { error: 'Missing required fields: schedule_id, task_type, accountability_date' },
      { status: 400 }
    )
  }

  if (!['prayer', 'bible_study'].includes(taskType)) {
    return NextResponse.json({ error: 'Invalid task type' }, { status: 400 })
  }

  // 3. Get the schedule (must belong to user)
  const { data: schedule, error: schedError } = await supabase
    .from('accountability_schedules')
    .select('*')
    .eq('id', scheduleId)
    .eq('member_id', user.id)
    .single()

  if (schedError || !schedule) {
    return NextResponse.json(
      { error: 'Schedule not found or does not belong to user' },
      { status: 404 }
    )
  }

  // 4 & 5. Verify accountability_date matches today in Africa/Lagos
  const todayWAT = todayInWAT()
  if (accountabilityDate !== todayWAT) {
    return NextResponse.json(
      { error: `Accountability date must match today in Africa/Lagos (${todayWAT})` },
      { status: 400 }
    )
  }

  // 6. Calculate completion window: start = schedule.start_time + schedule.duration_minutes, end = start + 60 minutes
  const { windowStart, windowEnd } = calculateCompletionWindow(
    todayWAT,
    schedule.start_time,
    schedule.duration_minutes
  )

  // 7. Compare server current time (UTC) against window
  const now = new Date()

  // 8. If before window_start: error
  if (now < windowStart) {
    return NextResponse.json(
      { error: 'Completion window not yet open' },
      { status: 400 }
    )
  }

  // 9. If after window_end: error
  if (now > windowEnd) {
    return NextResponse.json(
      { error: 'Completion window has expired' },
      { status: 400 }
    )
  }

  // 10. Check for existing completion record (prevent duplicates)
  const { data: existingRecord } = await supabase
    .from('accountability_completions')
    .select('*')
    .eq('member_id', user.id)
    .eq('accountability_date', todayWAT)
    .eq('task_type', taskType)
    .maybeSingle()

  if (existingRecord && existingRecord.status === 'completed') {
    return NextResponse.json(
      { error: 'Task already completed for today', data: existingRecord },
      { status: 400 }
    )
  }

  // 11. For bible_study: validate Bible reference fields
  let bibleBook: string | null = null
  let startChapter: number | null = null
  let startVerse: number | null = null
  let endChapter: number | null = null
  let endVerse: number | null = null
  let referenceText: string | null = null

  if (taskType === 'bible_study') {
    bibleBook = body.bible_book || body.bibleBook || body.book
    startChapter = Number(body.bible_start_chapter ?? body.bibleStartChapter ?? body.start_chapter ?? body.startChapter)
    startVerse = Number(body.bible_start_verse ?? body.bibleStartVerse ?? body.start_verse ?? body.startVerse)
    endChapter = Number(body.bible_end_chapter ?? body.bibleEndChapter ?? body.end_chapter ?? body.endChapter)
    endVerse = Number(body.bible_end_verse ?? body.bibleEndVerse ?? body.end_verse ?? body.endVerse)

    if (!bibleBook || isNaN(startChapter) || isNaN(startVerse) || isNaN(endChapter) || isNaN(endVerse)) {
      return NextResponse.json(
        { error: 'Bible study completion requires bible_book, start_chapter, start_verse, end_chapter, end_verse' },
        { status: 400 }
      )
    }

    const validation = validateBibleReference({
      book: bibleBook,
      startChapter,
      startVerse,
      endChapter,
      endVerse,
    })

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid Bible reference' },
        { status: 400 }
      )
    }

    referenceText = validation.formatted || `${bibleBook} ${startChapter}:${startVerse}–${endChapter}:${endVerse}`
  }

  // 12. Upsert the completion record with completed_at = NOW()
  const payload = {
    member_id: user.id,
    schedule_id: schedule.id,
    task_type: taskType as 'prayer' | 'bible_study',
    accountability_date: todayWAT,
    scheduled_start: schedule.start_time,
    duration_minutes: schedule.duration_minutes,
    completion_window_start: windowStart.toISOString(),
    completion_window_end: windowEnd.toISOString(),
    completed_at: now.toISOString(),
    status: 'completed' as const,
    bible_book: bibleBook,
    bible_start_chapter: startChapter,
    bible_start_verse: startVerse,
    bible_end_chapter: endChapter,
    bible_end_verse: endVerse,
    bible_reference_text: referenceText,
    updated_at: now.toISOString(),
  }

  let resultData
  if (existingRecord?.id) {
    const { data, error } = await supabase
      .from('accountability_completions')
      .update(payload)
      .eq('id', existingRecord.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    resultData = data
  } else {
    const { data, error } = await supabase
      .from('accountability_completions')
      .insert(payload)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    resultData = data
  }

  // 13. Return success
  return NextResponse.json({
    success: true,
    message: `${taskType === 'prayer' ? 'Prayer' : 'Bible study'} marked complete successfully.`,
    data: resultData,
  })
}
