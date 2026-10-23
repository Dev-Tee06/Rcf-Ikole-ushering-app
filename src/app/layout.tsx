import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'RCF Ikole Ushering Unit',
    template: '%s | RCF Ikole Ushering Unit',
  },
  description: 'Management and accountability platform for the RCF Ikole Ushering Unit. Serving with excellence, order, and prayer.',
  keywords: ['RCF Ikole', 'ushering unit', 'church', 'service', 'accountability'],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
