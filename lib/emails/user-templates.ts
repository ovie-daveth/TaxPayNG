export type UserTemplateKey = "welcome" | "importantUpdate" | "accountReminder"

export const USER_SITE_LINK = "https://www.otaxng.com"

export interface UserRecipient {
  name?: string
  firstName?: string
  lastName?: string
  email: string
}

interface TemplateDefinition {
  label: string
  subject: string
  body: string
}

export const USER_EMAIL_TEMPLATES: Record<UserTemplateKey, TemplateDefinition> = {
  welcome: {
    label: "Welcome Email",
    subject: "Welcome to OTax - Your Tax Management Partner",
    body: `Hi {{name}},

Welcome to OTax! We're thrilled to have you on board. OTax is your all-in-one hub for stress-free tax compliance in Nigeria.

Here's what you can do with OTax:
• Smart tax calculations with automatic reliefs
• Income & expense tracking tailored for Nigerian freelancers, creators, and SMEs
• Filing-ready reports, reminders, and secure document storage

Get started by visiting {{siteLink}} and exploring the platform.

If you have any questions, our support team is here to help. Just reply to this email.

Warm regards,
The OTax Team`
  },
  importantUpdate: {
    label: "Important Update",
    subject: "📢 Important Update from OTax",
    body: `Hi {{name}},

We have an important update to share with you about the OTax platform. Our team has been working to enhance your experience and add new features.

Here's what's new:
• Enhanced tax calculation features
• Improved expense tracking capabilities
• New filing reminders and notifications
• Updated support resources

You can explore these updates at {{siteLink}}. If you have any questions, just reply to this email—we're happy to help.

Thanks for being part of the OTax community,
The OTax Team`
  },
  accountReminder: {
    label: "Account Reminder",
    subject: "Reminder: Complete Your OTax Profile",
    body: `Hi {{name}},

We noticed you haven't completed your OTax profile yet. Completing your profile helps us provide you with more accurate tax calculations and personalized recommendations.

Here's what you can do:
• Update your business information
• Set up your tax preferences
• Connect your accounts for automatic tracking

Visit {{siteLink}} to complete your profile and get the most out of OTax.

If you need any assistance, our support team is ready to help.

Best regards,
The OTax Team`
  }
}

export function buildUserEmail(templateKey: UserTemplateKey, recipient: UserRecipient) {
  const template = USER_EMAIL_TEMPLATES[templateKey]
  if (!template) {
    return { subject: "", body: "" }
  }

  const displayName = recipient.name?.trim() || 
    `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim() || 
    "there"
  const replacements: Record<string, string> = {
    "{{name}}": displayName,
    "{{siteLink}}": USER_SITE_LINK
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

