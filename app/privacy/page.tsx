"use client"

import Link from "next/link"

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto max-w-4xl px-4 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Privacy Policy</h1>
              <p className="text-sm text-muted-foreground mt-2">Effective Date: [Insert Date]</p>
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
        <section className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <p>
            This Privacy Policy explains how <strong>OTax Digital Services Limited.</strong> (“OTax”, “we”, “our”, or “us”) collects, uses, discloses, and protects personal information obtained from users (“you” or “your”) through our digital tax platform, mobile application, and related services.
          </p>
          <p>
            By using our Platform, you consent to the collection and processing of your personal data in accordance with this Policy and the <strong>Nigeria Data Protection Act, 2023 (NDPA)</strong>.
          </p>
        </section>

        <Section
          title="1. Information We Collect"
          bulletGroups={[
            {
              heading: "a. Personal Identification Data:",
              items: [
                "Full name, date of birth, phone number, email address, BVN, TIN, and other identifiers required for tax compliance.",
              ],
            },
            {
              heading: "b. Financial and Employment Data:",
              items: [
                "Income records, invoices, tax history, pension contributions, business registration details, and other relevant financial data.",
              ],
            },
            {
              heading: "c. Device and Technical Data:",
              items: [
                "Browser type, IP address, device model, operating system, and usage analytics for performance improvement.",
              ],
            },
            {
              heading: "d. Voluntary Data:",
              items: [
                "Any information you provide through support inquiries, feedback forms, or during verification.",
              ],
            },
          ]}
        />

        <Section
          title="2. How We Use Your Information"
          numberedList={[
            "Enable tax estimation, record-keeping, and compliance tracking.",
            "Connect you securely to approved third-party tax payment or filing portals.",
            "Communicate updates, notifications, and compliance reminders.",
            "Improve Platform performance, security, and user experience.",
            "Comply with legal, regulatory, and audit obligations.",
          ]}
        />

        <Section
          title="3. Lawful Basis for Processing"
          bulletList={[
            "Consent: You have given clear consent for processing your data for specific purposes.",
            "Legal Obligation: Processing is required to comply with tax or regulatory laws.",
            "Contractual Necessity: Data is required to provide the services you request.",
            "Legitimate Interest: For platform improvement and fraud prevention.",
          ]}
        />

        <Section
          title="4. Data Sharing and Disclosure"
          bulletList={[
            "Authorized government agencies such as the Federal Inland Revenue Service (FIRS) or state tax authorities.",
            "Licensed third-party service providers that facilitate payments or integrations.",
            "Professional advisors (legal, accounting, or auditing firms) bound by confidentiality agreements.",
            "Law enforcement authorities, when required by law or court order.",
          ]}
          footnote="We do not sell or rent user data."
        />

        <Section
          title="5. Data Storage and Security"
          bulletList={[
            "All user data is stored on encrypted, access-controlled servers.",
            "We employ firewalls, multi-factor authentication, and regular security audits.",
            "Sensitive financial data is encrypted both in transit (using SSL/TLS) and at rest.",
            "In the event of a data breach, we will notify affected users and the Nigeria Data Protection Commission (NDPC) within the legally required timeframe.",
          ]}
        />

        <Section
          title="6. Data Retention"
          paragraphs={[
            "We retain personal information only for as long as necessary to fulfill the purposes stated above, or as required by tax and accounting regulations.",
            "Upon account deletion, data will be securely deleted or anonymized after [insert period, e.g., 90 days].",
          ]}
        />

        <Section
          title="7. Your Rights"
          paragraphs={["Under the NDPA, you have the right to:"]}
          bulletList={[
            "Request access to your personal data.",
            "Request correction or deletion of inaccurate or outdated information.",
            "Withdraw consent at any time (without affecting prior lawful processing).",
            "Request data portability in a commonly used digital format.",
            "Lodge a complaint with the Nigeria Data Protection Commission (NDPC).",
          ]}
          footnote="To exercise these rights, contact us at [Insert Support Email]."
        />

        <Section
          title="8. Use of Cookies"
          paragraphs={[
            "We use cookies and similar technologies to enhance user experience, remember preferences, and analyze traffic.",
            "You may disable cookies through your browser settings, but this may affect functionality.",
          ]}
        />

        <Section
          title="9. Third-Party Links"
          paragraphs={[
            "The Platform may contain links to external portals (e.g., FIRS e-Tax, Remita). OTax is not responsible for the privacy practices or content of these third-party sites.",
          ]}
        />

        <Section
          title="10. Children’s Privacy"
          paragraphs={[
            "Our services are intended for users aged 18 years and above. We do not knowingly collect personal data from minors. If you believe a minor has submitted data, contact us for immediate removal.",
          ]}
        />

        <Section
          title="11. International Data Transfers"
          paragraphs={[
            "If your data is transferred or processed outside Nigeria, we ensure it is done under lawful mechanisms consistent with NDPA requirements and international data protection standards.",
          ]}
        />

        <Section
          title="12. Changes to This Policy"
          paragraphs={[
            "We may update this Privacy Policy periodically. Updates will be posted on this page with a revised “Effective Date.” Continued use of the Platform after any changes indicates your acceptance.",
          ]}
        />

        <Section
          title="13. Contact Us"
          paragraphs={[
            "For questions, concerns, or data-related requests, contact:",
            "OTax Data Protection Officer",
            "Email: otax.ng@gmail.com",
            "Address: Lagos, Nigeria",
          ]}
        />

        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            For more details on how we handle your information alongside our terms of service, please read our <Link href="/terms" className="text-primary underline">Terms and Conditions</Link>.
          </p>
        </div>
      </main>
    </div>
  )
}

function Section({
  title,
  paragraphs = [],
  bulletList,
  numberedList,
  bulletGroups,
  footnote,
}: {
  title: string
  paragraphs?: string[]
  bulletList?: string[]
  numberedList?: string[]
  bulletGroups?: { heading: string; items: string[] }[]
  footnote?: string
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {paragraphs.map((paragraph, idx) => (
        <p key={idx} className="text-sm text-muted-foreground leading-relaxed">
          {paragraph}
        </p>
      ))}
      {numberedList && (
        <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
          {numberedList.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ol>
      )}
      {bulletList && (
        <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
          {bulletList.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      )}
      {bulletGroups && (
        <div className="space-y-4 text-sm text-muted-foreground">
          {bulletGroups.map((group, idx) => (
            <div key={idx} className="space-y-2">
              <p className="font-medium text-foreground">{group.heading}</p>
              <ul className="list-disc pl-5 space-y-1">
                {group.items.map((item, itemIdx) => (
                  <li key={itemIdx}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {footnote && <p className="text-xs text-muted-foreground italic">{footnote}</p>}
    </section>
  )
}
