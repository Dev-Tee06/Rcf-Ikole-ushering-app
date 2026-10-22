'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'

interface LoadingScreenProps {
  onComplete: () => void
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0)
  const [fadeOut, setFadeOut] = useState(false)
  const completedRef = useRef(false)

  useEffect(() => {
    // Skip loading screen if already seen this session
    const alreadyLoaded = sessionStorage.getItem('rcf_loaded')
    if (alreadyLoaded) {
      onComplete()
      return
    }

    // Start progress bar
    const progressTimer = setTimeout(() => {
      setProgress(100)
    }, 100)

    // Fade out at 4.5s, complete at 5s
    const fadeTimer = setTimeout(() => {
      setFadeOut(true)
    }, 4500)

    const completeTimer = setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true
        sessionStorage.setItem('rcf_loaded', 'true')
        onComplete()
      }
    }, 5000)

    return () => {
      clearTimeout(progressTimer)
      clearTimeout(fadeTimer)
      clearTimeout(completeTimer)
    }
  }, [onComplete])

  return (
    <div className={`loading-screen${fadeOut ? ' fade-out' : ''}`}>
      <div className="loading-content">
        <div className="loading-logo-wrapper">
          <Image
            src="/logo.jpg"
            alt="RCF Ikole Ushering Unit Logo"
            width={120}
            height={120}
            className="loading-logo"
            priority
          />
        </div>
        <h1 className="loading-title">RCF Ikole Ushering Unit</h1>
        <p className="loading-tagline">Serving with Excellence, Order &amp; Prayer</p>
        <div className="loading-progress-bar-track">
          <div
            className="loading-progress-bar-fill"
            style={{ width: `${progress}%`, transition: progress === 100 ? 'width 4.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none' }}
          />
        </div>
      </div>
    </div>
  )
}
