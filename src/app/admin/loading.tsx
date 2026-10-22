import React from 'react'
import { Skeleton } from '@/components/ui/Skeleton'

export default function AdminLoading() {
  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '16px 14px' }}>
      {/* Top Header Skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <Skeleton width="140px" height="14px" borderRadius="6px" style={{ marginBottom: 8 }} />
          <Skeleton width="260px" height="30px" borderRadius="8px" style={{ marginBottom: 8 }} />
          <Skeleton width="340px" height="16px" borderRadius="6px" />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Skeleton width="110px" height="38px" borderRadius="8px" />
          <Skeleton width="120px" height="38px" borderRadius="8px" />
        </div>
      </div>

      {/* 4 Stats Grid Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-card" style={{ padding: '20px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
              <Skeleton width="36px" height="36px" borderRadius="8px" />
              <Skeleton width="50px" height="18px" borderRadius="10px" />
            </div>
            <Skeleton width="80px" height="28px" borderRadius="6px" style={{ marginBottom: 8 }} />
            <Skeleton width="120px" height="14px" borderRadius="4px" />
          </div>
        ))}
      </div>

      {/* Action Tabs Bar Skeleton */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '20px' }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} width="110px" height="36px" borderRadius="20px" style={{ flexShrink: 0 }} />
        ))}
      </div>

      {/* Main Table / Form Skeleton Card */}
      <div className="skeleton-main-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <Skeleton width="200px" height="24px" borderRadius="6px" />
          <Skeleton width="140px" height="36px" borderRadius="8px" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
              <Skeleton width="36px" height="36px" borderRadius="50%" />
              <div style={{ flex: 1 }}>
                <Skeleton width="180px" height="16px" borderRadius="4px" style={{ marginBottom: 6 }} />
                <Skeleton width="120px" height="12px" borderRadius="4px" />
              </div>
              <Skeleton width="90px" height="22px" borderRadius="12px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
