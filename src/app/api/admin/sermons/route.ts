import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function checkAdminAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
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
  const { authorized, user } = await checkAdminAuth()
  if (!authorized || !user) {
    return NextResponse.json({ error: 'Unauthorized: Administrator access required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { title, preacher, description, spotify_url, cover_image_url, relevant_week, is_current } = body

    if (!title?.trim() || !preacher?.trim() || !spotify_url?.trim()) {
      return NextResponse.json(
        { error: 'Title, preacher, and Spotify URL are required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()
    const now = new Date().toISOString()
    const willBeCurrent = is_current !== false

    // If this sermon is marked as current, deactivate any existing current sermons
    if (willBeCurrent) {
      await adminClient
        .from('sermons')
        .update({ is_current: false })
        .eq('is_current', true)
    }

    let validDateStr = new Date().toISOString().split('T')[0]
    if (relevant_week && /^\d{4}-\d{2}-\d{2}$/.test(relevant_week.trim())) {
      validDateStr = relevant_week.trim()
    }

    let finalCoverUrl = cover_image_url?.trim() || null
    if (!finalCoverUrl && spotify_url) {
      try {
        const oembedRes = await fetch(
          `https://open.spotify.com/oembed?url=${encodeURIComponent(spotify_url.trim())}`
        )
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json()
          if (oembedData.thumbnail_url) {
            finalCoverUrl = oembedData.thumbnail_url
          }
        }
      } catch (e) {
        console.error('Error fetching Spotify oEmbed thumbnail:', e)
      }
    }

    const { data: sermon, error } = await adminClient
      .from('sermons')
      .insert({
        title: title.trim(),
        preacher: preacher.trim(),
        description: description?.trim() || null,
        spotify_url: spotify_url.trim(),
        cover_image_url: finalCoverUrl,
        relevant_week: validDateStr,
        is_current: willBeCurrent,
        status: 'published',
        published_at: now,
        published_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, sermon })
  } catch (err: any) {
    console.error('Error in sermon POST:', err)
    return NextResponse.json({ error: err.message || 'Failed to publish sermon link' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const { authorized } = await checkAdminAuth()
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized: Administrator access required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { id, is_current, status } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing sermon id' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    if (is_current === true) {
      // Unset previous current sermons
      await adminClient
        .from('sermons')
        .update({ is_current: false })
        .eq('is_current', true)
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (typeof is_current === 'boolean') updates.is_current = is_current
    if (status) updates.status = status

    const { data, error } = await adminClient
      .from('sermons')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, sermon: data })
  } catch (err: any) {
    console.error('Error in sermon PATCH:', err)
    return NextResponse.json({ error: err.message || 'Failed to update sermon' }, { status: 500 })
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
    if (!id) return NextResponse.json({ error: 'Missing sermon id' }, { status: 400 })

    const adminClient = createAdminClient()
    const { error } = await adminClient.from('sermons').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true, message: 'Sermon link removed' })
  } catch (err: any) {
    console.error('Error in sermon DELETE:', err)
    return NextResponse.json({ error: err.message || 'Failed to delete sermon' }, { status: 500 })
  }
}
