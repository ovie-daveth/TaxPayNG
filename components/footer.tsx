import Link from "next/link"
import OtaxLogo from "@/components/OtaxLogo"

export default function Footer() {
  const navigation = [
    {
      title: "Product",
      links: [
        { name: "Features", href: "#features" },
        { name: "Pricing", href: "#pricing" },
        { name: "Waitlist", href: "#waitlist" },
      ],
    },
    {
      title: "Company",
      links: [
        { name: "About", href: "#about" },
        { name: "Blog", href: "/blog" },
        { name: "FAQ", href: "/faq" },
        { name: "Inquiries", href: "mailto:otax.ng@gmail.com" },
      ],
    },
    {
      title: "Legal",
      links: [
        { name: "Terms & Conditions", href: "/terms" },
        { name: "Privacy Policy", href: "/privacy" },
      ],
    },
  ]

  return (
    <footer className="border-t border-border py-6 md:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop Layout */}
        <div className="hidden md:flex justify-between items-start gap-8">
          <Link href="/" className="flex-shrink-0">
            <OtaxLogo />
          </Link>

          <nav className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
            {navigation.map((section) => (
              <div key={section.title} className="space-y-3 min-w-[140px]">
                <span className="font-medium text-foreground/80 uppercase tracking-wide block">
                  {section.title}
                </span>
                <div className="flex flex-col gap-2">
                  {section.links.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      className="hover:text-primary transition-colors"
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <p className="text-xs sm:text-sm text-muted-foreground">
            © 2025 OTax. All rights reserved.
          </p>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden space-y-6">
          {/* Logo */}
          <div className="flex justify-start">
            <Link href="/" className="flex-shrink-0">
              <OtaxLogo />
            </Link>
          </div>

          {/* Navigation Links - Grid Layout */}
          <nav className="grid grid-cols-2 gap-6 text-xs text-muted-foreground">
            {navigation.map((section) => (
              <div key={section.title} className="space-y-2">
                <span className="font-semibold text-foreground text-[11px] uppercase tracking-wide block">
                  {section.title}
                </span>
                <div className="flex flex-col gap-1.5">
                  {section.links.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      className="hover:text-primary transition-colors"
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Copyright */}
          <div className="text-center pt-2 border-t border-border">
            <p className="text-[11px] text-muted-foreground">
              © 2025 OTax. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

