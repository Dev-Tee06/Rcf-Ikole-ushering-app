import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { todayInWAT } from '@/lib/time'

function parseDateStringToUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function formatDateToDateString(d: Date): string {
  const year = d.getUTCFullYear()
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const todayWAT = todayInWAT()
  const todayDate = parseDateStringToUTC(todayWAT)
  const yesterdayDate = new Date(todayDate.getTime() - 24 * 60 * 60 * 1000)
  const yesterdayWAT = formatDateToDateString(yesterdayDate)

  // 1. Get all completed prayer and bible_study records for the user
  const { data: records, error } = await supabase
    .from('accountability_completions')
    .select('accountability_date, task_type, status')
    .eq('member_id', user.id)
    .eq('status', 'completed')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 2. Find days where BOTH prayer and bible_study are completed
  let todayPrayerCompleted = false
  let todayBibleStudyCompleted = false

  const completedByDate = new Map<string, Set<string>>()

  for (const r of records || []) {
    if (r.accountability_date === todayWAT) {
      if (r.task_type === 'prayer') todayPrayerCompleted = true
      if (r.task_type === 'bible_study') todayBibleStudyCompleted = true
    }
    if (!completedByDate.has(r.accountability_date)) {
      completedByDate.set(r.accountability_date, new Set())
    }
    completedByDate.get(r.accountability_date)!.add(r.task_type)
  }

  const qualifyingDays: string[] = []
  for (const [dateStr, tasks] of completedByDate.entries()) {
    if (tasks.has('prayer') && tasks.has('bible_study')) {
      qualifyingDays.push(dateStr)
    }
  }

  qualifyingDays.sort()
  const qualifyingSet = new Set(qualifyingDays)

  // 4. Longest streak: maximum consecutive qualifying days in history
  let longestStreak = 0
  let runningStreak = 0
  let prevDate: Date | null = null

  for (const dateStr of qualifyingDays) {
    const currentDate = parseDateStringToUTC(dateStr)
    if (!prevDate) {
      runningStreak = 1
    } else {
      const diffDays = Math.round((currentDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000))
      if (diffDays === 1) {
        runningStreak += 1
      } else {
        runningStreak = 1
      }
    }
    if (runningStreak > longestStreak) {
      longestStreak = runningStreak
    }
    prevDate = currentDate
  }

  // 3. Current streak: count consecutive qualifying days ending today or yesterday (Africa/Lagos)
  let currentStreak = 0
  let checkDate: Date | null = null

  if (qualifyingSet.has(todayWAT)) {
    checkDate = todayDate
  } else if (qualifyingSet.has(yesterdayWAT)) {
    checkDate = yesterdayDate
  }

  if (checkDate) {
    let curr = checkDate
    while (true) {
      const dStr = formatDateToDateString(curr)
      if (qualifyingSet.has(dStr)) {
        currentStreak++
        curr = new Date(curr.getTime() - 24 * 60 * 60 * 1000)
      } else {
        break
      }
    }
  }

  longestStreak = Math.max(longestStreak, currentStreak)

  return NextResponse.json({
    currentStreak,
    longestStreak,
    totalQualifyingDays: qualifyingDays.length,
    todayPrayerCompleted,
    todayBibleStudyCompleted,
  })
}
