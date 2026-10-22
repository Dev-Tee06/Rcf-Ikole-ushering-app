import React from 'react'
import { SkeletonPage } from '@/components/ui/Skeleton'

export default function MemberLoading() {
  return (
    <div className="member-loading-container" style={{ width: '100%', minHeight: '60vh' }}>
      <SkeletonPage />
    </div>
  )
}
