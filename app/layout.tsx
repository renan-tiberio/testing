import { Geist } from 'next/font/google'
import { ThemeProvider } from 'next-themes'

import '@/app/globals.css'

import type { Metadata } from 'next'
import type { JSX, ReactNode } from 'react'

const {
  env: { VERCEL_URL: vercelUrl },
} = process

const defaultUrl =
  vercelUrl === undefined || vercelUrl === '' ? 'http://localhost:3000' : `https://${vercelUrl}`

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: 'App',
}

const geistSans = Geist({
  variable: '--font-geist-sans',
  display: 'swap',
  subsets: ['latin'],
})

const RootLayout = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <html lang="en" suppressHydrationWarning>
    <body className={`${geistSans.className} antialiased`}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </body>
  </html>
)

export default RootLayout
