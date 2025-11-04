import Link from "next/link"
import OtaxLogo from "@/components/OtaxLogo"

export default function Footer() {
  return (
    <footer className="border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/">
            <OtaxLogo />
          </Link>
          <p className="text-sm text-muted-foreground">© 2025 OTax. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

