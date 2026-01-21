import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, ArrowRight } from "lucide-react"

export default async function CacSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ requestId?: string }>
}) {
  const sp = await searchParams
  const requestId = sp?.requestId

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              Payment successful
            </CardTitle>
            <CardDescription>
              Your CAC registration request has been submitted. An agent will contact you shortly to confirm details and share next steps.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {requestId ? (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                <span className="text-muted-foreground">Request ID:</span> <span className="font-medium">{requestId}</span>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Link href="/cac">
                <Button variant="outline">Back to CAC services</Button>
              </Link>
              <Link href="/signup">
                <Button>
                  Create an OTax account <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


