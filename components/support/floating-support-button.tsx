"use client"

import { useState } from "react"
import { HelpCircle } from "lucide-react"
import { SupportModal } from "./support-modal"

export function FloatingSupportButton() {
  const [showSupportModal, setShowSupportModal] = useState(false)

  return (
    <>
      <SupportModal 
        open={showSupportModal} 
        onOpenChange={setShowSupportModal} 
      />
      
      {/* Floating Support Button (Mobile & Tablet Only) */}
      <button
        onClick={() => setShowSupportModal(true)}
        className="fixed bottom-20 right-4 z-50 md:hidden w-10 h-10 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center hover:scale-110 active:scale-95"
        aria-label="Get Support"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
    </>
  )
}

