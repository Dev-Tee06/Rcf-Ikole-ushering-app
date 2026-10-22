import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MemberShell } from '@/components/member/MemberShell'

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  let { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, role, status, phone, bio, created_at, updated_at, last_login_at')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    // Self-heal: create profile from auth user metadata if trigger didn't run
    const { data: createdProfile } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        full_name: (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'Member',
        email: user.email || '',
        role: 'member',
        status: 'active',
      })
      .select('id, full_name, email, avatar_url, role, status, phone, bio, created_at, updated_at, last_login_at')
      .single()

    profile = createdProfile
  }

  if (!profile || profile.status !== 'active') {
    redirect('/login?error=account_inactive')
  }

  if (profile.role === 'admin') {
    redirect('/admin/dashboard')
  }

  return (
    <MemberShell profile={profile}>
      {children}
    </MemberShell>
  )
}
