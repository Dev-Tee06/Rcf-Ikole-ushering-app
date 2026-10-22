import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { todayInWAT, calculateCompletionWindow } from '@/lib/time'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const todayWAT = todayInWAT()

  // Fetch active schedules
  const { data: schedules, error: schedError } = await supabase
    .from('accountability_schedules')
    .select('*')
    .eq('member_id', user.id)
    .eq('is_active', true)

  if (schedError) {
    return NextResponse.json({ error: schedError.message }, { status: 500 })
  }

  // Fetch today's completion records
  const { data: completions, error: compError } = await supabase
    .from('accountability_completions')
    .select('*')
    .eq('member_id', user.id)
    .eq('accountability_date', todayWAT)

  if (compError) {
    return NextResponse.json({ error: compError.message }, { status: 500 })
  }

  const now = new Date()

  function processTask(taskType: 'prayer' | 'bible_study') {
    const schedule = schedules?.find((s: any) => s.task_type === taskType) || null
    const completion = completions?.find((c: any) => c.task_type === taskType) || null

    if (!schedule) {
      return {
        task_type: taskType,
        has_schedule: false,
        schedule: null,
        completion,
        status: completion?.completed_at ? 'completed' : 'no_schedule',
        window_start: null,
        window_end: null,
      }
    }

    const { windowStart, windowEnd } = calculateCompletionWindow(
      todayWAT,
      schedule.start_time,
      schedule.duration_minutes
    )

    let status: 'upcoming' | 'ready' | 'completed' | 'missed'

    if (completion?.completed_at) {
      status = 'completed'
    } else if (now < windowStart) {
      status = 'upcoming'
    } else if (now >= windowStart && now <= windowEnd) {
      status = 'ready'
    } else {
      status = 'missed'
    }

    return {
      task_type: taskType,
      has_schedule: true,
      schedule,
      completion,
      status,
      window_start: windowStart.toISOString(),
      window_end: windowEnd.toISOString(),
    }
  }

  const prayerTask = processTask('prayer')
  const bibleStudyTask = processTask('bible_study')

  return NextResponse.json({
    date: todayWAT,
    server_time: now.toISOString(),
    prayer: prayerTask,
    bible_study: bibleStudyTask,
    bibleStudy: bibleStudyTask,
  })
}
