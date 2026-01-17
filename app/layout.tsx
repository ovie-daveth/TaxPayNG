import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { UserProfileProvider } from '@/lib/contexts/user-profile-context'
import { BusinessProvider } from '@/lib/contexts/business-context'
import './globals.css'

export const metadata: Metadata = {
  title: 'OTax App',
  metadataBase: new URL('https://otaxng.com'),
  keywords: ['Nigeria tax filing', 'SME tax management', 'Freelancer tax management', 'Tax filing', 'Tax management', 'Tax preparation', 'Tax calculation', 'Tax return', 'Tax return preparation', 'Tax return calculation', 'Tax return filing', 'Tax return filing preparation', 'Tax return filing calculation', 'Tax filing software', 'Tax management software', 'Tax preparation software', 'Tax calculation software', 'Tax return software', 'Tax return preparation software', 'Tax return calculation software', 'Tax return filing software', 'Tax return filing preparation software', 'Tax return filing calculation software, Tax, Tax filing, Tax management, Tax preparation, Tax calculation, Tax return, Tax return preparation, Tax return calculation, Tax return filing, Tax return filing preparation, Tax return filing calculation', 'NTA 2025', 'OTax'],
  alternates: { canonical: 'https://otaxng.com' },
  description: 'Simplifying tax processes with OTax App.',
  openGraph: {
    title: 'OTax App',
    description: 'Simplifying tax processes with OTax App.',
    url: 'https://otaxng.com',
    siteName: 'OTax',
    images: [ 
      {
        url: '/logootax.jpg',
        width: 800,
        height: 600,
        alt: 'OTax Logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OTax App',
    description: 'Simplifying tax processes with OTax App.',
    images: ['/logootax.jpg'],
  },
  icons: {
    icon: 'logootax.jpg',
    shortcut: '/logootax.jpg',
    apple: '/logootax.jpg',
  },
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <UserProfileProvider>
            <BusinessProvider>
              {children}
              <Toaster />
            </BusinessProvider>
          </UserProfileProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
