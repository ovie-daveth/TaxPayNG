"use client"

import Link from "next/link"
import { BarChart3, Calculator, FileCheck, ArrowLeft } from "lucide-react"

export function AuthLayoutSide() {
  return (
    <div className="relative hidden lg:flex lg:flex-1 flex-col justify-center px-8 xl:px-12 2xl:px-16 py-12 bg-muted/30 border-r border-border">
      <Link
        href="/"
        className="absolute top-8 left-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors duration-300"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to home
      </Link>
      <div className="max-w-md mx-auto w-full space-y-10">
        <div>
          <h2 className="landing-hero-line text-2xl sm:text-3xl font-bold text-foreground mb-3">
            #1 Software for
            <br />
            <span className="text-primary">Tax & Compliance</span> in Nigeria
          </h2>
          <p className="landing-hero-line text-muted-foreground">
            Manage your taxes from tracking to filing—all in one platform.
          </p>
        </div>
        <ul className="space-y-4">
          {[
            { icon: BarChart3, text: "Track income & expenses in one place" },
            { icon: Calculator, text: "Calculate taxes & reliefs (NTA 2025)" },
            { icon: FileCheck, text: "File with FIRS & NRS, pay with RRR" },
          ].map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="landing-hero-line flex items-center gap-3 text-muted-foreground transition-transform duration-300 hover:translate-x-1"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm sm:text-base">{text}</span>
            </li>
          ))}
        </ul>
        <p className="landing-hero-line text-sm text-muted-foreground">
          Join thousands of Nigerian freelancers and SMEs who grow with OTax.
        </p>
      </div>
    </div>
  )
}
