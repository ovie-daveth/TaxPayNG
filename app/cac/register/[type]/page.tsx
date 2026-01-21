"use client"

import { useMemo } from "react"
import Link from "next/link"
import { notFound, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CAC_EXPLANATIONS, CAC_REGISTRATION_TYPES, getCacTypeBySlug } from "@/lib/constants/cac"
import type { CacRegistrationType } from "@/lib/types"
import { CacRegistrationForm } from "@/components/cac/cac-registration-form"
import { ArrowLeft } from "lucide-react"

export default function CacRegisterPage() {
  const params = useParams<{ type: string }>()
  const type = useMemo<CacRegistrationType | null>(() => getCacTypeBySlug(String(params?.type || "")), [params])

  const title = useMemo(() => {
    if (!type) return ""
    return CAC_REGISTRATION_TYPES.find((x) => x.type === type)?.title || "CAC Registration"
  }, [type])

  if (!type) return notFound()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <div className="flex items-center justify-between gap-3 mb-6">
          <Link href="/cac">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div className="text-sm text-muted-foreground">CAC Registration</div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">{title}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {CAC_EXPLANATIONS[type].pricingNote ? (
              <div className="mb-2">
                <span className="font-medium text-foreground">Pricing note:</span> {CAC_EXPLANATIONS[type].pricingNote}
              </div>
            ) : null}
            Please provide accurate details and clear documents. Once submitted, an agent will contact you for confirmation and next steps.
          </CardContent>
        </Card>

        <CacRegistrationForm type={type} />
      </div>
    </div>
  )
}


