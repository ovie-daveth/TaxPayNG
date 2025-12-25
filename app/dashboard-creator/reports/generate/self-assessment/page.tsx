"use client"

import { Suspense } from "react"
import GenerateSelfAssessmentPageContent from "./content"

export default function GenerateSelfAssessmentPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GenerateSelfAssessmentPageContent />
    </Suspense>
  )
}

