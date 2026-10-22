'use client'

import React from 'react'

export function Skeleton({
  className = '',
  style = {},
  width,
  height,
  borderRadius,
}: {
  className?: string
  style?: React.CSSProperties
  width?: string | number
  height?: string | number
  borderRadius?: string | number
}) {
  return (
    <div
      className={`skeleton-box ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  )
}

export function SkeletonPage() {
  return (
    <div className="skeleton-page-layout">
      {/* Top Header Skeleton */}
      <div className="skeleton-header">
        <Skeleton width="120px" height="14px" borderRadius="6px" style={{ marginBottom: 10 }} />
        <Skeleton width="280px" height="32px" borderRadius="8px" style={{ marginBottom: 12 }} />
        <Skeleton width="420px" height="16px" borderRadius="6px" />
      </div>

      {/* Metric / Cards Grid Skeleton */}
      <div className="skeleton-cards-grid">
        <div className="skeleton-card">
          <div className="skeleton-card-top">
            <Skeleton width="40px" height="40px" borderRadius="10px" />
            <Skeleton width="60px" height="20px" borderRadius="20px" />
          </div>
          <Skeleton width="140px" height="24px" borderRadius="6px" style={{ margin: '14px 0 8px 0' }} />
          <Skeleton width="90px" height="14px" borderRadius="4px" />
        </div>
        <div className="skeleton-card">
          <div className="skeleton-card-top">
            <Skeleton width="40px" height="40px" borderRadius="10px" />
            <Skeleton width="60px" height="20px" borderRadius="20px" />
          </div>
          <Skeleton width="140px" height="24px" borderRadius="6px" style={{ margin: '14px 0 8px 0' }} />
          <Skeleton width="90px" height="14px" borderRadius="4px" />
        </div>
        <div className="skeleton-card">
          <div className="skeleton-card-top">
            <Skeleton width="40px" height="40px" borderRadius="10px" />
            <Skeleton width="60px" height="20px" borderRadius="20px" />
          </div>
          <Skeleton width="140px" height="24px" borderRadius="6px" style={{ margin: '14px 0 8px 0' }} />
          <Skeleton width="90px" height="14px" borderRadius="4px" />
        </div>
      </div>

      {/* Main Section Content Skeleton */}
      <div className="skeleton-main-card">
        <div className="skeleton-main-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Skeleton width="36px" height="36px" borderRadius="10px" />
            <div>
              <Skeleton width="180px" height="20px" borderRadius="6px" style={{ marginBottom: 6 }} />
              <Skeleton width="240px" height="13px" borderRadius="4px" />
            </div>
          </div>
          <Skeleton width="100px" height="32px" borderRadius="8px" />
        </div>

        <div className="skeleton-list-rows">
          <div className="skeleton-list-item">
            <Skeleton width="44px" height="44px" borderRadius="50%" />
            <div style={{ flex: 1 }}>
              <Skeleton width="160px" height="16px" borderRadius="4px" style={{ marginBottom: 6 }} />
              <Skeleton width="220px" height="13px" borderRadius="4px" />
            </div>
            <Skeleton width="70px" height="24px" borderRadius="20px" />
          </div>
          <div className="skeleton-list-item">
            <Skeleton width="44px" height="44px" borderRadius="50%" />
            <div style={{ flex: 1 }}>
              <Skeleton width="160px" height="16px" borderRadius="4px" style={{ marginBottom: 6 }} />
              <Skeleton width="220px" height="13px" borderRadius="4px" />
            </div>
            <Skeleton width="70px" height="24px" borderRadius="20px" />
          </div>
          <div className="skeleton-list-item">
            <Skeleton width="44px" height="44px" borderRadius="50%" />
            <div style={{ flex: 1 }}>
              <Skeleton width="160px" height="16px" borderRadius="4px" style={{ marginBottom: 6 }} />
              <Skeleton width="220px" height="13px" borderRadius="4px" />
            </div>
            <Skeleton width="70px" height="24px" borderRadius="20px" />
          </div>
        </div>
      </div>
    </div>
  )
}
