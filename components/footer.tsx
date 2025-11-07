import Link from "next/link"
import OtaxLogo from "@/components/OtaxLogo"

export default function Footer() {
  return (
    <footer className="border-t border-border py-8 sm:py-10 md:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
          <Link href="/" className="flex-shrink-0">
            <OtaxLogo />
          </Link>
          <p className="text-xs sm:text-sm text-muted-foreground text-center md:text-left">© 2025 OTax. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

