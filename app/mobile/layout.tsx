import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "D'LEON Mobile",
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
}

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      maxWidth: '430px',
      margin: '0 auto',
      minHeight: '100dvh',
      background: '#0D0D0D',
      color: '#F0EEE9',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative',
    }}>
      {children}
    </div>
  )
}
