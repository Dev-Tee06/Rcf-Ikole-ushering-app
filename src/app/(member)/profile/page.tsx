'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/database'
import { todayInWAT } from '@/lib/time'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [standingRoleName, setStandingRoleName] = useState<string | null>(null)

  // Streaks
  const [currentStreak, setCurrentStreak] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)

  // Avatar State
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [showDeleteAvatarModal, setShowDeleteAvatarModal] = useState(false)
  const [avatarFeedback, setAvatarFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const supabase = useMemo(() => createClient(), [])

  // Helper to compress image to a lightweight JPEG Data URL (fallback for storage buckets)
  const compressImageToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX_DIM = 240
          let width = img.width
          let height = img.height
          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width)
              width = MAX_DIM
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height)
              height = MAX_DIM
            }
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            resolve(e.target?.result as string)
            return
          }
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', 0.85))
        }
        img.onerror = () => reject(new Error('Failed to load image for processing.'))
        img.src = e.target?.result as string
      }
      reader.onerror = () => reject(new Error('Failed to read image file.'))
      reader.readAsDataURL(file)
    })
  }

  // Load Profile & Streaks Data
  const loadProfileData = useCallback(async () => {
    try {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      // 1. Fetch Profile
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileErr) {
        console.error('Error loading profile:', profileErr)
      } else if (profileData) {
        setProfile(profileData as Profile)
        setAvatarPreview(profileData.avatar_url || null)
      }

      // 2. Fetch Standing Role
      const { data: roleAssignment } = await supabase
        .from('standing_role_assignments')
        .select(`
          id,
          is_active,
          standing_role:standing_roles (
            name
          )
        `)
        .eq('member_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (roleAssignment && (roleAssignment as any).standing_role) {
        setStandingRoleName((roleAssignment as any).standing_role.name)
      }

      // 3. Fetch accountability completions for streak calculation
      const { data: completions } = await supabase
        .from('accountability_completions')
        .select('accountability_date, task_type, status')
        .eq('member_id', user.id)
        .eq('status', 'completed')
        .order('accountability_date', { ascending: true })

      if (completions && completions.length > 0) {
        const datesMap = new Map<string, { prayer: boolean; bible: boolean }>()
        completions.forEach((item: any) => {
          const rec = datesMap.get(item.accountability_date) || {
            prayer: false,
            bible: false,
          }
          if (item.task_type === 'prayer') rec.prayer = true
          if (item.task_type === 'bible_study') rec.bible = true
          datesMap.set(item.accountability_date, rec)
        })

        const fullyCompletedDates = new Set<string>()
        datesMap.forEach((val, dateKey) => {
          if (val.prayer && val.bible) {
            fullyCompletedDates.add(dateKey)
          }
        })

        // Calculate Longest Streak
        const sortedDates = Array.from(fullyCompletedDates).sort()
        let maxStreak = 0
        let runStreak = 0
        let prevDate: Date | null = null

        for (const dStr of sortedDates) {
          const [y, m, d] = dStr.split('-').map(Number)
          const cur = new Date(Date.UTC(y, m - 1, d))

          if (prevDate) {
            const diffDays = Math.round(
              (cur.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000)
            )
            if (diffDays === 1) {
              runStreak++
            } else {
              runStreak = 1
            }
          } else {
            runStreak = 1
          }

          if (runStreak > maxStreak) {
            maxStreak = runStreak
          }
          prevDate = cur
        }
        setLongestStreak(maxStreak)

        // Calculate Current Streak
        const todayStr = todayInWAT()
        const [ty, tm, td] = todayStr.split('-').map(Number)
        const dateCursor = new Date(Date.UTC(ty, tm - 1, td))
        const toKey = (dt: Date) => dt.toISOString().split('T')[0]

        let curr = 0
        if (fullyCompletedDates.has(toKey(dateCursor))) {
          while (fullyCompletedDates.has(toKey(dateCursor))) {
            curr++
            dateCursor.setUTCDate(dateCursor.getUTCDate() - 1)
          }
        } else {
          dateCursor.setUTCDate(dateCursor.getUTCDate() - 1)
          while (fullyCompletedDates.has(toKey(dateCursor))) {
            curr++
            dateCursor.setUTCDate(dateCursor.getUTCDate() - 1)
          }
        }
        setCurrentStreak(curr)
      }
    } catch (err) {
      console.error('Failed to load profile data:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadProfileData()
  }, [loadProfileData])

  // Avatar Upload Handler with Storage & Base64 Fallback (Eliminates "Bucket not found")
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    if (!file.type.startsWith('image/')) {
      setAvatarFeedback({
        type: 'error',
        message: 'Please choose an image file (PNG, JPG, JPEG, WEBP).',
      })
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      setAvatarFeedback({
        type: 'error',
        message: 'File size must be under 8MB.',
      })
      return
    }

    setUploadingAvatar(true)
    setAvatarFeedback(null)

    try {
      // 1. Create compressed data URL representation first
      const compressedDataUrl = await compressImageToDataUrl(file)
      setAvatarPreview(compressedDataUrl)

      let finalAvatarUrl = compressedDataUrl

      // 2. Attempt Supabase Storage upload
      try {
        const fileExt = file.name.split('.').pop() || 'jpg'
        const filePath = `${profile.id}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, {
            upsert: true,
            contentType: file.type,
          })

        if (!uploadError) {
          const {
            data: { publicUrl },
          } = supabase.storage.from('avatars').getPublicUrl(filePath)
          if (publicUrl) {
            finalAvatarUrl = publicUrl
          }
        }
      } catch {
        // If storage bucket doesn't exist, safely fall back to compressedDataUrl
      }

      // 3. Persist avatar_url in profiles table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: finalAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (updateError) {
        throw updateError
      }

      setProfile((prev) => (prev ? { ...prev, avatar_url: finalAvatarUrl } : null))
      setAvatarFeedback({
        type: 'success',
        message: 'Profile photo updated successfully!',
      })
    } catch (err: any) {
      console.error('Avatar update failed:', err)
      setAvatarFeedback({
        type: 'error',
        message: err.message || 'Failed to update photo. Please try again.',
      })
      setAvatarPreview(profile.avatar_url || null)
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Remove Avatar Handler
  const handleRemoveAvatar = async () => {
    if (!profile) return

    setUploadingAvatar(true)
    setAvatarFeedback(null)

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)

      if (updateError) {
        throw updateError
      }

      setProfile((prev) => (prev ? { ...prev, avatar_url: null } : null))
      setAvatarPreview(null)
      setShowDeleteAvatarModal(false)
      setAvatarFeedback({
        type: 'success',
        message: 'Profile photo removed successfully.',
      })
    } catch (err: any) {
      console.error('Failed to remove avatar:', err)
      setAvatarFeedback({
        type: 'error',
        message: err.message || 'Failed to remove photo.',
      })
    } finally {
      setUploadingAvatar(false)
    }
  }

  const getInitials = (name: string) => {
    if (!name) return 'U'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const formatMemberSince = (isoStr?: string) => {
    if (!isoStr) return 'Active Member'
    try {
      const dt = new Date(isoStr)
      return dt.toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return isoStr
    }
  }

  if (loading) {
    return (
      <div className="profile-loading-wrap">
        <div className="spinner" />
        <p>Loading your profile details...</p>
        <style jsx>{`
          .profile-loading-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 80px 20px;
            color: #6b7280;
            gap: 14px;
          }
          .spinner {
            width: 32px;
            height: 32px;
            border: 3px solid #e5e7eb;
            border-top-color: #1d4ed8;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="profile-not-found">
        <h2>Unable to load profile</h2>
        <p>Please check your internet connection or sign in again.</p>
      </div>
    )
  }

  return (
    <div className="profile-page">
      {/* Header */}
      <header className="page-header">
        <div>
          <span className="page-category">ACCOUNT CREDENTIALS</span>
          <h1 className="page-title">Member Profile</h1>
          <p className="page-subtitle">
            Your verified usher credentials, standing role assignment, and spiritual momentum in RCF Ikole.
          </p>
        </div>
      </header>

      {/* ================= 1. IDENTITY & AVATAR CARD ================= */}
      <section className="profile-hero-card">
        <div className="hero-left-col">
          {/* Avatar Section */}
          <div className="avatar-section">
            <div className="avatar-container">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPreview}
                  alt={profile.full_name}
                  className="avatar-image"
                />
              ) : (
                <div className="avatar-fallback">
                  {getInitials(profile.full_name)}
                </div>
              )}

              <label
                htmlFor="avatar-file-input"
                className="avatar-upload-badge"
                title="Change profile photo"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </label>

              <input
                ref={fileInputRef}
                id="avatar-file-input"
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                disabled={uploadingAvatar}
                style={{ display: 'none' }}
              />
            </div>

            <div className="avatar-actions">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="upload-photo-btn"
              >
                {uploadingAvatar
                  ? 'Updating...'
                  : avatarPreview
                  ? 'Change Photo'
                  : 'Upload Photo'}
              </button>

              {avatarPreview && (
                <button
                  type="button"
                  onClick={() => setShowDeleteAvatarModal(true)}
                  disabled={uploadingAvatar}
                  className="remove-photo-btn"
                >
                  Remove Photo
                </button>
              )}
            </div>

            {avatarFeedback && (
              <div className={`avatar-feedback-text ${avatarFeedback.type}`}>
                {avatarFeedback.message}
              </div>
            )}
          </div>

          {/* User Details */}
          <div className="user-details-summary">
            <div className="name-status-row">
              <h2 className="user-display-name">{profile.full_name}</h2>
              <span className={`status-pill ${profile.status}`}>
                {profile.status === 'active' ? 'Active Member' : profile.status}
              </span>
            </div>

            <div className="user-email-row">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span>{profile.email}</span>
            </div>

            <div className="user-badges-row">
              <span className="badge-pill member-since">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Joined {formatMemberSince(profile.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Streaks Widget on Right Side */}
        <div className="hero-streaks-col">
          <div className="streak-stat-box current">
            <div className="streak-icon-box orange">🔥</div>
            <div className="streak-stat-meta">
              <span className="streak-number-big">{currentStreak}</span>
              <span className="streak-label-strong">Current Streak</span>
              <span className="streak-sub-text">consecutive devotion days</span>
            </div>
          </div>

          <div className="streak-stat-box longest">
            <div className="streak-icon-box gold">🏆</div>
            <div className="streak-stat-meta">
              <span className="streak-number-big">{longestStreak}</span>
              <span className="streak-label-strong">Longest Streak</span>
              <span className="streak-sub-text">personal best devotion record</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 2. VERIFIED USHER CREDENTIALS ================= */}
      <div className="profile-info-grid">
        {/* Card: Official Credentials */}
        <section className="info-card">
          <div className="card-header-line">
            <div className="card-icon-wrap royal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <h3 className="card-heading">Official Member Information</h3>
              <span className="card-subheading">Verified unit registration and profile status</span>
            </div>
          </div>

          <div className="credentials-list">
            <div className="credential-row">
              <span className="credential-label">Full Name</span>
              <span className="credential-value highlight">{profile.full_name}</span>
            </div>

            <div className="credential-row">
              <span className="credential-label">Registered Email</span>
              <span className="credential-value">{profile.email}</span>
            </div>

            <div className="credential-row">
              <span className="credential-label">Member Since</span>
              <span className="credential-value">{formatMemberSince(profile.created_at)}</span>
            </div>

            <div className="credential-row">
              <span className="credential-label">Account Status</span>
              <span className="credential-badge active">Active &amp; In Good Standing</span>
            </div>
          </div>
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteAvatarModal}
        title="Remove Profile Photo"
        message="Are you sure you want to remove your profile photo? Your account will display your name initials instead."
        confirmText="Yes, Remove Photo"
        isLoading={uploadingAvatar}
        onConfirm={handleRemoveAvatar}
        onCancel={() => setShowDeleteAvatarModal(false)}
      />

      {/* ================= STYLES ================= */}
      <style jsx>{`
        .profile-page {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .page-header {
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 20px;
        }

        .page-category {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          color: #1d4ed8;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .page-title {
          font-size: 28px;
          font-weight: 800;
          color: #111827;
          margin: 0 0 6px 0;
          letter-spacing: -0.5px;
        }

        .page-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        /* Hero card */
        .profile-hero-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
        }

        @media (min-width: 900px) {
          .profile-hero-card {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }

        .hero-left-col {
          display: flex;
          align-items: flex-start;
          gap: 24px;
          flex-wrap: wrap;
        }

        @media (min-width: 600px) {
          .hero-left-col {
            flex-wrap: nowrap;
          }
        }

        /* Avatar Section */
        .avatar-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .avatar-container {
          position: relative;
          width: 96px;
          height: 96px;
        }

        .avatar-image {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid #1d4ed8;
          box-shadow: 0 4px 10px rgba(29, 78, 216, 0.15);
        }

        .avatar-fallback {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1d4ed8, #2563eb);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: 800;
          border: 3px solid #bfdbfe;
          box-shadow: 0 4px 10px rgba(29, 78, 216, 0.15);
        }

        .avatar-upload-badge {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: #1d4ed8;
          border: 2.5px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.15s, transform 0.15s;
        }

        .avatar-upload-badge:hover {
          background-color: #1e40af;
          transform: scale(1.08);
        }

        .avatar-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .upload-photo-btn {
          background: transparent;
          border: none;
          color: #1d4ed8;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .upload-photo-btn:hover {
          text-decoration: underline;
        }

        .remove-photo-btn {
          background: transparent;
          border: none;
          color: #ef4444;
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 4px;
          transition: color 0.15s;
        }

        .remove-photo-btn:hover {
          color: #b91c1c;
          text-decoration: underline;
        }

        .avatar-feedback-text {
          font-size: 12px;
          font-weight: 600;
          text-align: center;
          max-width: 140px;
        }

        .avatar-feedback-text.success {
          color: #16a34a;
        }

        .avatar-feedback-text.error {
          color: #dc2626;
        }

        /* User Details Summary */
        .user-details-summary {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .name-status-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .user-display-name {
          font-size: 22px;
          font-weight: 800;
          color: #111827;
          margin: 0;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.3px;
          text-transform: capitalize;
        }

        .status-pill.active {
          background-color: #dcfce7;
          color: #15803d;
          border: 1px solid #bbf7d0;
        }

        .user-email-row {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #6b7280;
          font-size: 14px;
        }

        .user-badges-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 4px;
        }

        .badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 8px;
        }

        .badge-pill.standing-role {
          background-color: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
        }

        .badge-pill.member-role {
          background-color: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }

        .badge-pill.member-since {
          background-color: #f3f4f6;
          color: #4b5563;
          border: 1px solid #e5e7eb;
        }

        /* Hero Streaks Col */
        .hero-streaks-col {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .streak-stat-box {
          display: flex;
          align-items: center;
          gap: 12px;
          background-color: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 14px 18px;
          flex: 1;
          min-width: 170px;
        }

        .streak-icon-box {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          flex-shrink: 0;
        }

        .streak-icon-box.orange {
          background-color: #fff7ed;
          border: 1px solid #ffedd5;
        }

        .streak-icon-box.gold {
          background-color: #fefce8;
          border: 1px solid #fef08a;
        }

        .streak-stat-meta {
          display: flex;
          flex-direction: column;
        }

        .streak-number-big {
          font-size: 24px;
          font-weight: 800;
          color: #111827;
          line-height: 1.1;
        }

        .streak-label-strong {
          font-size: 12px;
          font-weight: 700;
          color: #374151;
        }

        .streak-sub-text {
          font-size: 10.5px;
          color: #9ca3af;
        }

        /* Profile Info Grid */
        .profile-info-grid {
          display: flex;
          flex-direction: column;
          width: 100%;
          max-width: 100%;
        }

        .info-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .card-header-line {
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid #f3f4f6;
          padding-bottom: 14px;
        }

        .card-icon-wrap {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .card-icon-wrap.royal {
          background-color: #eff6ff;
        }

        .card-heading {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .card-subheading {
          font-size: 12px;
          color: #6b7280;
        }

        /* Credentials list */
        .credentials-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .credential-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px dashed #f1f5f9;
          font-size: 13.5px;
        }

        .credential-row:last-child {
          border-bottom: none;
        }

        .credential-label {
          color: #64748b;
          font-weight: 500;
        }

        .credential-value {
          color: #0f172a;
          font-weight: 600;
          text-align: right;
        }

        .credential-value.highlight {
          color: #1d4ed8;
          font-weight: 700;
        }

        .credential-badge.active {
          background-color: #dcfce7;
          color: #15803d;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
        }

        @media (max-width: 600px) {
          .page-header {
            text-align: center;
          }

          .profile-hero-card {
            padding: 18px 14px;
          }

          .hero-left-col {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .user-details {
            align-items: center;
          }

          .user-meta-row {
            justify-content: center;
          }

          .user-badges-row {
            justify-content: center;
          }

          .hero-streaks-col {
            width: 100%;
          }

          .info-card {
            padding: 18px 14px;
          }

          .credential-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }

          .credential-value {
            text-align: left;
          }
        }
      `}</style>
    </div>
  )
}
