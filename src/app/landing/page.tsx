import type { Metadata } from 'next'
import { LandingPageClient } from '@/components/public/LandingPageClient'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Welcome | RCF Ikole Ushering Unit',
  description: 'RCF Ikole Ushering Unit — Serving with Excellence, Order and Prayer. Join our community of dedicated ushers.',
}

async function getLandingData() {
  const supabase = await createClient()
  
  const [dressCodeResult, sermonResult, contentResult] = await Promise.all([
    supabase
      .from('dress_codes')
      .select('*')
      .eq('status', 'published')
      .order('applicable_sunday', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('sermons')
      .select('*')
      .eq('is_current', true)
      .eq('status', 'published')
      .maybeSingle(),
    supabase
      .from('content_settings')
      .select('key, value')
  ])
  
  const contentMap: Record<string, string> = {}
  contentResult.data?.forEach((item: any) => {
    contentMap[item.key] = item.value || ''
  })
  
  return {
    dressCode: dressCodeResult.data,
    sermon: sermonResult.data,
    content: contentMap,
  }
}

export default async function LandingPage() {
  const data = await getLandingData()
  return <LandingPageClient {...data} />
}
