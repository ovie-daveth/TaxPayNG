"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import OtaxLogo from "@/components/OtaxLogo"
import { cn } from "@/lib/utils"

interface NavItem {
  label: string
  href: string
}

interface CallToAction {
  href: string
  label: string
  mobileLabel?: string
  showOnMobile?: boolean
}

interface SiteHeaderProps {
  navItems?: NavItem[]
  highlightHref?: string
  cta?: CallToAction
  wrapperClassName?: string
  containerClassName?: string
  logoHref?: string
}

const defaultNavItems: NavItem[] = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "FAQ", href: "/faq" },
]

const defaultCta: CallToAction = {
  href: "#waitlist",
  label: "Join the Waitlist",
  mobileLabel: "Join",
  showOnMobile: false,
}

export function SiteHeader({
  navItems = defaultNavItems,
  highlightHref,
  cta = defaultCta,
  wrapperClassName,
  containerClassName,
  logoHref,
}: SiteHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleNavClick = () => {
    setMobileMenuOpen(false)
  }

  return (
    <header className={cn("border-b border-border", wrapperClassName)}>
      <div className={cn("px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-[150px] mx-auto py-3 sm:py-4", containerClassName)}>
        <div className="flex items-center gap-4">
          {logoHref ? (
            <Link href={logoHref} aria-label="OTax home">
              <OtaxLogo />
            </Link>
          ) : (
            <OtaxLogo />
          )}

          {navItems.length > 0 && (
            <nav className="hidden md:flex flex-1 md:-mr-32 items-center justify-center gap-4 lg:gap-6">
              {navItems.map((item) => {
                const isActive = highlightHref && item.href === highlightHref
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "text-xs lg:text-sm text-muted-foreground hover:text-foreground transition-colors",
                      isActive && "font-medium text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          )}

          <div className="hidden md:flex items-center gap-3 ml-auto">
            <ThemeToggle />
            {cta && (
              <Link href={cta.href}>
                <Button size="sm" className="md:h-10 md:px-4 text-xs sm:text-sm md:text-base">
                  <span className="relative z-10">{cta.label}</span>
                </Button>
              </Link>
            )}
          </div>

          <div className="flex md:hidden items-center gap-2 ml-auto">
            <ThemeToggle />
           
            {cta?.showOnMobile && (
              <Link href={cta.href}>
                <Button size="sm" className="px-3">
                  <span className="relative z-10 text-xs">{cta.mobileLabel ?? cta.label}</span>
                </Button>
              </Link>
            )}
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-border p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="mt-3 space-y-3 md:hidden border-t border-border pt-3">
            {navItems.length > 0 && (
              <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
                {navItems.map((item) => {
                  const isActive = highlightHref && item.href === highlightHref
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "px-1 py-2 rounded-md hover:text-foreground hover:bg-muted/60 transition-colors",
                        isActive && "text-foreground font-medium"
                      )}
                      onClick={handleNavClick}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </nav>
            )}
            <Link href="/tax-calculator" className="block" onClick={handleNavClick}>
              <Button variant="outline" className="w-full">
                Tax Calculator
              </Button>
            </Link>
            {cta && (
              <Link href={cta.href} className="block" onClick={handleNavClick}>
                <Button className="w-full">
                  {cta.label}
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

