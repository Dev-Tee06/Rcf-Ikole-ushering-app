import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('accountability_schedules')
    .select('*')
    .eq('member_id', user.id)
    .eq('is_active', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { task_type, start_time, duration_minutes } = body

  if (!['prayer', 'bible_study'].includes(task_type)) {
    return NextResponse.json({ error: 'Invalid task type' }, { status: 400 })
  }

  const validDurations = [15, 30, 45, 60, 90, 120]
  if (!validDurations.includes(duration_minutes)) {
    return NextResponse.json({ error: 'Invalid duration' }, { status: 400 })
  }

  // Deactivate existing schedule for this task type
  await supabase
    .from('accountability_schedules')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('member_id', user.id)
    .eq('task_type', task_type)
    .eq('is_active', true)

  // Create new schedule
  const { data, error } = await supabase
    .from('accountability_schedules')
    .insert({
      member_id: user.id,
      task_type,
      start_time,
      duration_minutes,
      is_active: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
