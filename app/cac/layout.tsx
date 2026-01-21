import Footer from '@/components/footer'
import { SiteHeader } from '@/components/site-header'
import React from 'react'

const CACLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className='min-h-screen bg-background overflow-x-hidden'>
           <SiteHeader
        logoHref="/"
        navItems={[
          { label: "Features", href: "#features" },
          { label: "Pricing", href: "/pricing" },
          { label: "Blog", href: "/blog" },
          { label: "FAQ", href: "/faq" },
        ]}
        cta={{
          href: "/signup",
          label: "Start Free Trial",
          mobileLabel: "Start",
          showOnMobile: false,
        }}
        secondaryCta={{
          href: "/login",
          label: "Log In",
          mobileLabel: "Log In",
          showOnMobile: false,
          variant: "outline",
        }}
      />
            {children}
            <Footer />
        </div>
    )
}

export default CACLayout