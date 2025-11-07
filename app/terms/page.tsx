"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"

async function updateTermsConsent(agreed: boolean) {
  try {
    const response = await fetch("/api/user/terms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isAgreedTerms: agreed }),
    })

    if (!response.ok) {
      throw new Error("Failed to update consent")
    }

    return true
  } catch (error) {
    console.error(error)
    return false
  }
}

export default function TermsPage() {
  const [isChecked, setIsChecked] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    startTransition(async () => {
      const success = await updateTermsConsent(true)
      if (success) {
        toast.success("Thanks for agreeing to the updated terms.")
      } else {
        toast.error("We couldn’t save your consent. Please try again.")
      }
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto max-w-4xl px-4 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Terms and Conditions</h1>
              <p className="text-sm text-muted-foreground mt-2">Effective Date: Jan 1st, 2026</p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-10 space-y-8">
        <section className="space-y-4">
          <p>
            Welcome to <strong>OTax</strong> ("the Platform", "we", "our", or "us"). By accessing or using OTax, you ("the User", "you", or "your") agree to be bound by these Terms and Conditions. If you do not agree, please discontinue use of the Platform immediately.
          </p>
        </section>

        <section className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">1. About OTax</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              OTax is a digital platform designed to assist individuals, freelancers, creators, and small businesses in Nigeria with tax estimation, record keeping, and compliance management. OTax provides tools to organize financial data, calculate applicable taxes, and connect users to approved third-party or government portals for filing or payment.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">2. User Accounts</h2>
            <ul className="mt-2 text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>Users must create an account to access certain features. You agree to provide accurate, complete, and updated information.</li>
              <li>You are responsible for maintaining the confidentiality of your login details. Any activity conducted through your account shall be deemed authorized by you.</li>
              <li>OTax reserves the right to suspend or terminate accounts that violate these Terms or are found to contain false information.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">3. Use of the Platform</h2>
            <ul className="mt-2 text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>The Platform is provided for lawful use in accordance with Nigerian tax regulations.</li>
              <li>Users shall not misuse or attempt to compromise the Platform’s security, reverse-engineer its systems, or interfere with its operations.</li>
              <li>Users agree not to upload, share, or store unlawful, misleading, or harmful content.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">4. Disclaimer and Limitation of Liability</h2>
            <ul className="mt-2 text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>OTax provides <strong>tax calculation and compliance tools for informational purposes only</strong>. Calculations and estimates are based on publicly available tax laws and data but do not constitute professional financial or legal advice.</li>
              <li>Users are encouraged to consult qualified tax professionals for personalized advice.</li>
              <li>OTax shall not be liable for any loss, error, penalty, or liability arising from reliance on automated calculations or data inputs by the User.</li>
              <li>The Platform’s integration with third-party payment or filing systems is provided “as is.” OTax is not responsible for the accuracy, security, or operation of such external services.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">5. Third-Party Services</h2>
            <ul className="mt-2 text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>OTax may redirect users to authorized government portals or licensed financial intermediaries for tax payment or filing.</li>
              <li>These third parties operate under their own terms and privacy policies. OTax shall not be responsible for any losses or disputes arising from their use.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">6. Data Protection and Privacy</h2>
            <ul className="mt-2 text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>OTax collects and processes user information in compliance with the <strong>Nigeria Data Protection Act (NDPA)</strong> and relevant regulations.</li>
              <li>Personal and financial data stored on the Platform are encrypted and handled with strict confidentiality.</li>
              <li>By using the Platform, you consent to the collection and processing of your data as described in our <Link href="/privacy" className="text-primary underline">Privacy Policy</Link>.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">7. Intellectual Property</h2>
            <ul className="mt-2 text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>All content, design, software, and materials on OTax are the property of the Platform and protected by copyright and trademark laws.</li>
              <li>Users may not copy, modify, reproduce, or distribute any part of the Platform without prior written consent from OTax.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">8. Payments and Fees</h2>
            <ul className="mt-2 text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li>OTax may charge subscription or service fees for premium features. Any applicable fees will be clearly communicated prior to use.</li>
              <li>All payments made through third-party gateways are subject to their respective terms and transaction charges.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold">9. Service Availability</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              While OTax strives to maintain continuous access, we do not guarantee uninterrupted or error-free operation. Maintenance, updates, or unforeseen issues may temporarily affect availability.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">10. Indemnity</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You agree to indemnify and hold OTax, its officers, and affiliates harmless from any claims, damages, losses, or liabilities arising from your use of the Platform or violation of these Terms.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">11. Termination</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              OTax may suspend or terminate access to your account if you breach these Terms or engage in unlawful activity. Upon termination, your right to use the Platform shall immediately cease.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">12. Governing Law and Dispute Resolution</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              These Terms shall be governed by and construed under the laws of the <strong>Federal Republic of Nigeria</strong>. Any dispute arising under these Terms shall first be settled through mediation. If unresolved, the matter shall be referred to arbitration in Lagos, Nigeria, in accordance with the Arbitration and Mediation Act, 2023.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">13. Changes to These Terms</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              OTax reserves the right to update or amend these Terms at any time. Continued use of the Platform after any update constitutes acceptance of the revised Terms.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">14. Contact</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              For inquiries, complaints, or feedback, contact:<br />
              <strong>OTax Support Team</strong><br />
              Email: otax.ng@gmail.com<br />
              Address: Lagos, Nigeria
            </p>
          </div>
        </section>

        <section className="hidden border border-border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold">Consent to Terms</h3>
          <p className="text-sm text-muted-foreground">
            By checking the box below and clicking “I Agree”, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
          </p>

          <div className="flex items-center space-x-3">
            <Checkbox
              id="terms-consent"
              checked={isChecked}
              onCheckedChange={(checked) => setIsChecked(!!checked)}
            />
            <label htmlFor="terms-consent" className="text-sm select-none">
              I have read and agree to the Terms and Conditions.
            </label>
          </div>

          <Button onClick={handleSubmit} disabled={!isChecked || isPending} className="mt-2">
            {isPending ? "Saving..." : "I Agree"}
          </Button>
        </section>
      </main>
    </div>
  )
}
