export type WaitlistTemplateKey = "launchPreview" | "importantUpdate" | "weAreLive"

export const WAITLIST_SITE_LINK = "https://www.otaxng.com"

export interface WaitlistRecipient {
  name?: string
  email: string
}

interface TemplateDefinition {
  label: string
  subject: string
  body: string
}

export const WAITLIST_EMAIL_TEMPLATES: Record<WaitlistTemplateKey, TemplateDefinition> = {
  launchPreview: {
    label: "Launch Preview",
    subject: "🚀 Sneak Peek: The OTax Launch Preview",
    body: `Hi {{name}},

We're putting the final touches on OTax, your all-in-one hub for stress-free tax compliance in Nigeria. As one of our early supporters, we wanted to give you a quick preview of what's coming.

Here's what you can expect:
• Smart tax calculations with automatic reliefs
• Income & expense tracking tailored for Nigerian freelancers, creators, and SMEs
• Filing-ready reports, reminders, and secure document storage

Stay tuned—more details are on the way. You can always learn more at {{siteLink}}.

Warm regards,
The OTax Team`
  },
  importantUpdate: {
    label: "Important Update",
    subject: "📢 Important Update from OTax",
    body: `Hi {{name}},

We have an important update to share with you about the OTax platform. Our team has been working around the clock to make sure you get the best possible experience when we launch.

Here's the latest:
• Updated launch timeline with exciting new features
• Enhanced support for SMEs and creators
• Early-access onboarding resources to help you hit the ground running

You can read more and follow along at {{siteLink}}. If you have any questions, just reply to this email—we’re happy to help.

Thanks for being part of our journey,
The OTax Team`
  },
  weAreLive: {
    label: "We Are Live!",
    subject: "🎉 We’re Live! Start Using OTax Today",
    body: `Hi {{name}},

The wait is over—OTax is officially live! You can now sign in, explore the platform, and experience how effortless tax management can be.

Jump in here: {{siteLink}}

What you get from day one:
• Automated tax calculations with localized reliefs
• Expense tracking and receipt uploads
• Filing-ready reports and real-time reminders

We’re excited to have you on board. Welcome to the future of tax management in Nigeria.

Let’s get compliant together,
The OTax Team`
  }
}

export function buildWaitlistEmail(templateKey: WaitlistTemplateKey, recipient: WaitlistRecipient) {
  const template = WAITLIST_EMAIL_TEMPLATES[templateKey]
  if (!template) {
    return { subject: "", body: "" }
  }

  const displayName = recipient.name?.trim() || "there"
  const replacements: Record<string, string> = {
    "{{name}}": displayName,
    "{{siteLink}}": WAITLIST_SITE_LINK
  }

  const replacePlaceholders = (text: string) =>
    Object.entries(replacements).reduce(
      (acc, [placeholder, value]) => acc.replace(new RegExp(placeholder, "g"), value),
      text
    )

  return {
    subject: replacePlaceholders(template.subject),
    body: replacePlaceholders(template.body)
  }
}

