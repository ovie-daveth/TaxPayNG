"use client"

import { useInView } from "@/lib/hooks/useInView"
import { cn } from "@/lib/utils"

interface LandingRevealProps {
  children: React.ReactNode
  className?: string
  /** Add stagger animation to direct children */
  stagger?: boolean
}

export function LandingReveal({ children, className, stagger }: LandingRevealProps) {
  const { ref, inView } = useInView({ rootMargin: "0px 0px -40px 0px", threshold: 0.08 })

  return (
    <div
      ref={ref}
      className={cn(
        "landing-reveal",
        inView && "in-view",
        stagger && "landing-reveal-stagger",
        className
      )}
    >
      {children}
    </div>
  )
}
