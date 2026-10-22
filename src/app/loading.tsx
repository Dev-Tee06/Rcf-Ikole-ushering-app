import React from 'react'
import { SkeletonPage } from '@/components/ui/Skeleton'

export default function Loading() {
  return (
    <div style={{ padding: '24px 16px', maxWidth: '1140px', margin: '0 auto', width: '100%' }}>
      <SkeletonPage />
    </div>
  )
}
