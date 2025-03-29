import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI-DVSum - YouTube Video Summarizer',
  description: 'Get AI-generated summaries with timestamps for YouTube videos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}