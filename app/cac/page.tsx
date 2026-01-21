"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useMemo, useState } from "react"
import { CAC_EXPLANATIONS, CAC_REGISTRATION_TYPES, formatNaira } from "@/lib/constants/cac"
import type { CacRegistrationType } from "@/lib/types"
import { ArrowRight, Building2, ShieldCheck } from "lucide-react"

export default function CacServicesPage() {
  const [openType, setOpenType] = useState<CacRegistrationType | null>(null)

  const openInfo = useMemo(() => {
    if (!openType) return null
    const entry = CAC_REGISTRATION_TYPES.find((x) => x.type === openType)
    const info = CAC_EXPLANATIONS[openType]
    return { entry, info }
  }, [openType])

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 max-w-6xl">
        <div className="mb-8">
          <div className="flex items-center gap-2 text-primary mb-2">
            <Building2 className="w-5 h-5" />
            <span className="text-sm font-medium">CAC Registration</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Register your business with CAC</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Select a registration type, review what it entails, then submit your details and pay securely via Paystack. An agent will
            contact you for confirmation and next steps.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Secure Paystack payment
            </Badge>
            <Badge variant="secondary">Document upload supported</Badge>
            <Badge variant="secondary">Admin gets notified instantly</Badge>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CAC_REGISTRATION_TYPES.map((t) => (
            <Card key={t.type} className="h-full flex flex-col hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl">{t.title}</CardTitle>
                <CardDescription>{t.shortDescription}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="text-sm text-muted-foreground">Starting from</div>
                <div className="text-2xl font-semibold">{formatNaira(t.priceFromNaira)}</div>
              </CardContent>
              <CardFooter className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="w-full" onClick={() => setOpenType(t.type)}>
                  What it entails
                </Button>
                <Button asChild className="w-full">
                  <Link href={`/cac/register/${t.slug}`}>
                    Start <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!openType} onOpenChange={(o) => (!o ? setOpenType(null) : null)}>
        <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{openInfo?.entry?.title || "Details"}</DialogTitle>
            <DialogDescription>
              Review the summary below. When you’re ready, proceed to the form and submit your details.
            </DialogDescription>
          </DialogHeader>

          {openInfo ? (
            <div className="space-y-5">
              <div>
                <div className="text-sm font-semibold mb-1">What it is</div>
                <div className="text-sm text-muted-foreground">{openInfo.info.whatItIs}</div>
              </div>
              <div>
                <div className="text-sm font-semibold mb-2">Requirements</div>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  {openInfo.info.requirements.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-sm font-semibold mb-2">Required documents</div>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  {openInfo.info.documents.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
              {openInfo.info.pricingNote ? (
                <div className="rounded-lg border p-3 text-sm bg-muted/30">
                  <span className="font-medium">Pricing note:</span> {openInfo.info.pricingNote}
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenType(null)}>
              Close
            </Button>
            {openInfo?.entry?.slug ? (
              <Button asChild>
                <Link href={`/cac/register/${openInfo.entry.slug}`}>Proceed to form</Link>
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


