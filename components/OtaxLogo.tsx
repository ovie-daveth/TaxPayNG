import Image from 'next/image'
import React from 'react'

const OtaxLogo = () => {
  return (
    <div className="flex items-center gap-2 relative">
      <div className="relative">
        <Image className="dark:hidden" src="/logootax_bg.png" alt="OTax Logo" width={50} height={100} />
        <Image className="hidden dark:block" src="/darklogo-bg.png" alt="OTax Logo" width={50} height={100} />
        <sup className="absolute -top-1 -right-1 text-[12px] font-bold leading-none opacity-70">™</sup>
      </div>
  </div>
  )
}

export default OtaxLogo