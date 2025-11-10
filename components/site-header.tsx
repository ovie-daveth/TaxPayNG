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
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

interface SiteHeaderProps {
  navItems?: NavItem[]
  highlightHref?: string
  cta?: CallToAction
  secondaryCta?: CallToAction
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
  secondaryCta,
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
            <nav className="hidden md:flex flex-1 items-center justify-center gap-4 lg:gap-6">
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
                <Button
                  size={cta.size ?? "sm"}
                  variant={cta.variant ?? "default"}
                  className={cn(
                    "md:h-10 md:px-4 text-xs sm:text-sm md:text-base",
                    cta.className
                  )}
                >
                  <span className="relative z-10">{cta.label}</span>
                </Button>
              </Link>
            )}
            {secondaryCta && (
              <Link href={secondaryCta.href}>
                <Button
                  size={secondaryCta.size ?? "sm"}
                  variant={secondaryCta.variant ?? "default"}
                  className={cn(
                    "md:h-10 md:px-4 text-xs sm:text-sm md:text-base",
                    secondaryCta.className
                  )}
                >
                  <span className="relative z-10">{secondaryCta.label}</span>
                </Button>
              </Link>
            )}
          </div>

          <div className="flex md:hidden items-center gap-2 ml-auto">
            <ThemeToggle />
            {cta?.showOnMobile && (
              <Link href={cta.href}>
                <Button
                  size={cta.size ?? "sm"}
                  variant={cta.variant ?? "default"}
                  className={cn("px-3", cta.className)}
                >
                  <span className="relative z-10 text-xs">{cta.mobileLabel ?? cta.label}</span>
                </Button>
              </Link>
            )}
            {secondaryCta?.showOnMobile && (
              <Link href={secondaryCta.href}>
                <Button
                  size={secondaryCta.size ?? "sm"}
                  variant={secondaryCta.variant ?? "default"}
                  className={cn("px-3", secondaryCta.className)}
                >
                  <span className="relative z-10 text-xs">
                    {secondaryCta.mobileLabel ?? secondaryCta.label}
                  </span>
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
            {cta && !cta.showOnMobile && (
              <Link href={cta.href} className="block" onClick={handleNavClick}>
                <Button
                  size={cta.size ?? "default"}
                  variant={cta.variant ?? "default"}
                  className={cn("w-full", cta.className)}
                >
                  {cta.label}
                </Button>
              </Link>
            )}
            {secondaryCta && !secondaryCta.showOnMobile && (
              <Link href={secondaryCta.href} className="block" onClick={handleNavClick}>
                <Button
                  size={secondaryCta.size ?? "default"}
                  variant={secondaryCta.variant ?? "default"}
                  className={cn("w-full", secondaryCta.className)}
                >
                  {secondaryCta.label}
                </Button>
              </Link>
            )}
            {cta && cta.showOnMobile && (
              <Link href={cta.href} className="block" onClick={handleNavClick}>
                <Button
                  size={cta.size ?? "default"}
                  variant={cta.variant ?? "default"}
                  className={cn("w-full", cta.className)}
                >
                  {cta.label}
                </Button>
              </Link>
            )}
            {secondaryCta && secondaryCta.showOnMobile && (
              <Link href={secondaryCta.href} className="block" onClick={handleNavClick}>
                <Button
                  size={secondaryCta.size ?? "default"}
                  variant={secondaryCta.variant ?? "default"}
                  className={cn("w-full", secondaryCta.className)}
                >
                  {secondaryCta.label}
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

