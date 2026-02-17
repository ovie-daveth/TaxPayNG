import Link from "next/link"
import OtaxLogo from "@/components/OtaxLogo"

export default function Footer() {
  const sections = [
    {
      title: "Product",
      links: [
        { name: "Features", href: "#features" },
        { name: "Pricing", href: "/pricing" },
        { name: "CAC Registration", href: "/cac" },
        { name: "FAQ", href: "/faq" },
      ],
    },
    {
      title: "Learn",
      links: [
        { name: "Blog", href: "/blog" },
        { name: "Documentation", href: "/faq" },
        { name: "Contact", href: "/#contact" },
      ],
    },
    {
      title: "Company",
      links: [
        { name: "About", href: "/#contact" },
        { name: "Inquiries", href: "mailto:otax.ng@gmail.com" },
        { name: "Terms & Conditions", href: "/terms" },
        { name: "Privacy Policy", href: "/privacy" },
      ],
    },
  ]

  return (
    <footer className="border-t border-border bg-muted/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block mb-4" aria-label="OTax home">
              <OtaxLogo />
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Tax & compliance software for Nigerian freelancers and SMEs.
            </p>
          </div>
          {sections.map((section) => (
            <div key={section.title} className="space-y-4">
              <span className="font-semibold text-foreground text-sm uppercase tracking-wider block">
                {section.title}
              </span>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} OTax. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
