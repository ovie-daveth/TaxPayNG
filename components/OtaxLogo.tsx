"use client"

import React, { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import Image from 'next/image'

const OtaxLogo = () => {
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted) {
    // Return light logo during SSR to prevent hydration mismatch
    return (
      <div className="flex items-center gap-2">
        <Image
          src="/logootax_bg.png"
          alt="OTax Logo"
          width={52}
          height={52}
          className="h-6 w-auto"
          priority
        />
      </div>
    )
  }
  
  const isDark = resolvedTheme === 'dark' || theme === 'dark'
  
  return (
    <div className="flex items-center gap-2">
      <Image
        src={isDark ? '/darklogo-bg.png' : '/logootax_bg.png'}
        alt="OTax Logo"
        width={52}
        height={52}
        className="h-6 w-auto"
        priority
      />
    </div>
  )
}

export default OtaxLogo