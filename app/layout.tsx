import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ai-Interview-Pro',
  description: 'ai interview pro is a platform that helps you prepare for interviews with AI-generated questions and answers.',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
