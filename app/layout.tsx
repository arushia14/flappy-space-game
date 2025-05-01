import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Flappy Space',
  description: 'Flappy bird, but in space with a rocket',
  generator: 'arushi agarwal',
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
