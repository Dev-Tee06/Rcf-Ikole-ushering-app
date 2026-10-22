import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { todayInWAT } from '@/lib/time'
import { ServicesClient } from '@/components/member/ServicesClient'

export const dynamic = 'force-dynamic'

export default async function ServicesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const todayStr = todayInWAT()

  // Calculate 4 weeks ahead
  const [y, m, d] = todayStr.split('-').map(Number)
  const maxDateObj = new Date(Date.UTC(y, m - 1, d + 28))
  const maxDateStr = maxDateObj.toISOString().split('T')[0]

  // 1. Fetch upcoming service occurrences (next 4 weeks)
  const { data: upcomingOccurrences } = await supabase
    .from('service_occurrences')
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
    .gte('occurrence_date', todayStr)
    .lte('occurrence_date', maxDateStr)
    .order('occurrence_date', { ascending: true })
    .order('start_time', { ascending: true })

  const occurrenceIds = (upcomingOccurrences || []).map((o: any) => o.id)

  // 2. Fetch all duty_assignments for this user in those occurrences
  interface UserAssignment {
    id: string
    service_occurrence_id: string
    duty_post_id: string
    is_draft: boolean
    notes: string | null
    duty_post: {
      id: string
      name: string
      service_type: string
    } | null
    service_occurrence: {
      id: string
      occurrence_date: string
      start_time: string
      end_time: string
      service_type: string
      roster_published: boolean
      service: {
        name: string
      } | null
    } | null
  }

  let userAssignments: UserAssignment[] = []
  if (occurrenceIds.length > 0) {
    const { data: assignments } = await supabase
      .from('duty_assignments')
      .select(`
        id,
        service_occurrence_id,
        duty_post_id,
        is_draft,
        notes,
        duty_post:duty_posts (
          id,
          name,
          service_type
        ),
        service_occurrence:service_occurrences (
          id,
          occurrence_date,
          start_time,
          end_time,
          service_type,
          roster_published,
          service:services (
            name
          )
        )
      `)
      .eq('member_id', user.id)
      .in('service_occurrence_id', occurrenceIds)
      .eq('is_draft', false)

    userAssignments = ((assignments as unknown as UserAssignment[]) || []).sort(
      (a, b) => {
        const dateA = a.service_occurrence?.occurrence_date || ''
        const dateB = b.service_occurrence?.occurrence_date || ''
        return dateA.localeCompare(dateB)
      }
    )
  }

  // 3. Fetch latest published dress code
  const { data: latestDressCode } = await supabase
    .from('dress_codes')
    .select('*')
    .eq('status', 'published')
    .order('applicable_sunday', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <ServicesClient
      userAssignments={userAssignments}
      latestDressCode={latestDressCode}
      currentUserId={user.id}
    />
  )
}
