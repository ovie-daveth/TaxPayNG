"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Transaction } from "@/lib/types"
import { uploadToImageKit, type ImageUploadResult } from "@/lib/utils/imagekit"
import { toast } from "sonner"
import { CheckCircle2, Loader2, Printer, Upload, AlertTriangle, ShieldCheck, XCircle } from "lucide-react"

interface AuditSubscriptionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactions: Transaction[]
  isLoading?: boolean
  totalSpend: number
  periodLabel: string
  businessType: "freelancer" | "creator"
  onRequestNewExpense?: () => void
  grossIncome?: number
}

type ComplianceStatus = "compliant" | "needs-evidence" | "non-compliant"

interface ComplianceResult {
  status: ComplianceStatus
  issues: string[]
  rule?: string
  details?: string
}

interface ComplianceContext {
  grossIncome: number
}

interface ComplianceRule {
  id: string
  label: string
  keywords: string[]
  transactionType: Transaction["type"] | "any"
  limitPercentageOfIncome?: number
  absoluteCap?: number
  requiresProof?: boolean
  proofHint?: string
  notes?: string
  criteria: string[]
  reference?: string
}

const BUSINESS_EXPENSE_KEYWORDS = [
  "software",
  "subscription",
  "saas",
  "tool",
  "platform",
  "app",
  "license",
  "hosting",
  "internet",
  "workspace",
  "marketing",
  "utilities",
  "equipment",
]

const COMPLIANCE_RULES: ComplianceRule[] = [
  {
    id: "pension",
    label: "Pension Contribution",
    keywords: ["pension", "pfa"],
    transactionType: "relief",
    limitPercentageOfIncome: 0.2,
    requiresProof: true,
    proofHint: "Upload PFA statement or contribution receipt.",
    criteria: [
      "Contribution paid to a registered Pension Fund Administrator under PRA 2014.",
      "Amount not more than 8% of salary (employed) or documented voluntary contribution (self-employed).",
      "Reject if over 20% of declared gross income or no PFA is identified.",
    ],
    reference: "NTA Reform Act 2025 · Sec. 14(2)",
  },
  {
    id: "nhf",
    label: "National Housing Fund (NHF)",
    keywords: ["nhf", "housing fund", "fmbn"],
    transactionType: "relief",
    limitPercentageOfIncome: 0.025,
    requiresProof: true,
    proofHint: "Attach NHF remittance slip or employer deduction record.",
    criteria: [
      "Paid into the Federal Mortgage Bank NHF scheme or an accredited cooperative.",
      "Annual total does not exceed 2.5% of monthly income × 12.",
      "Fails if payment cannot be traced to FMBN or exceeds limit.",
    ],
    reference: "NTA 2025 · Housing Contributions",
  },
  {
    id: "nhis",
    label: "National Health Insurance Scheme (NHIS)",
    keywords: ["nhis", "health insurance", "hmo"],
    transactionType: "relief",
    requiresProof: true,
    proofHint: "Attach NHIS/HMO premium receipt showing plan validity.",
    criteria: [
      "Plan registered under NHIA/NHIS or approved HMO with active registration number.",
      "Covers only eligible health premiums (dependents within allowed limits).",
      "Reject if plan expired or payment unrelated to health coverage.",
    ],
    reference: "NHIA Guidelines 2025",
  },
  {
    id: "life-insurance",
    label: "Life Insurance / Annuity",
    keywords: ["life insurance", "annuity"],
    transactionType: "relief",
    requiresProof: true,
    proofHint: "Provide premium receipt or policy certificate from a NAICOM-licensed insurer.",
    criteria: [
      "Policy issued by a NAICOM-licensed life insurer.",
      "Policyholder is the taxpayer or spouse; covers life/annuity only.",
      "Reject if policy inactive or covers non-qualifying products.",
    ],
    reference: "NTA 2025 · Life Insurance Relief",
  },
  {
    id: "rent-relief",
    label: "Rent Relief",
    keywords: ["rent", "accommodation"],
    transactionType: "relief",
    absoluteCap: 500000,
    limitPercentageOfIncome: 0.2,
    requiresProof: true,
    proofHint: "Include rent receipt with landlord details for your primary residence.",
    criteria: [
      "Taxpayer does not own the property; rent is for primary residence.",
      "Deduction limited to 20% of annual rent up to ₦500,000.",
      "Reject if receipt indicates commercial/office property or exceeds cap.",
    ],
    reference: "NTA 2025 · Personal Reliefs",
  },
  {
    id: "housing-loan-interest",
    label: "Interest on Housing Loan",
    keywords: ["mortgage", "housing loan", "home loan"],
    transactionType: "relief",
    requiresProof: true,
    proofHint: "Attach bank loan statement showing interest portion for your home.",
    criteria: [
      "Loan used to acquire/build owner-occupied residence from a recognized lender.",
      "Deduction limited to interest portion only.",
      "Fails if property is not owner-occupied or loan used for business.",
    ],
    reference: "NTA 2025 · Housing Incentives",
  },
  {
    id: "disability-relief",
    label: "Disability or Dependents Relief",
    keywords: ["disability", "dependent relief"],
    transactionType: "relief",
    requiresProof: true,
    proofHint: "Provide disability certificate or dependent documentation.",
    criteria: [
      "Valid disability certificate issued by approved authority.",
      "Relief capped at ₦1,000,000 or 25% of taxable income (whichever is lower).",
      "Reject if documentation missing or amount exceeds cap.",
    ],
    reference: "NTA 2025 · Social Reliefs",
  },
  {
    id: "charitable-donation",
    label: "Donation to Approved Institution",
    keywords: ["donation", "charity", "ngo"],
    transactionType: "relief",
    limitPercentageOfIncome: 0.1,
    requiresProof: true,
    proofHint: "Attach receipt from FIRS-approved organization with RC number.",
    criteria: [
      "Recipient is on the FIRS-approved public benefit list (include RC number).",
      "Total donation does not exceed 10% of taxable income/profit.",
      "Reject if entity is unapproved or exceeds the cap.",
    ],
    reference: "FIRS PBO Schedule 2025",
  },
  {
    id: "business-expense",
    label: "Business Expense Deduction",
    keywords: BUSINESS_EXPENSE_KEYWORDS,
    transactionType: "any",
    requiresProof: true,
    proofHint: "Upload invoice or receipt showing business purpose of the expense.",
    criteria: [
      "Expense is wholly, exclusively, necessarily, and reasonably incurred to earn income.",
      "Falls under allowable categories (software, internet, workspace, marketing, utilities, etc.).",
      "Reject if personal in nature or no documentation shows business link.",
    ],
    reference: "NTA 2025 · Deductible Expenses",
  },
  {
    id: "education-relief",
    label: "Educational Relief",
    keywords: ["tuition", "training", "course", "education"],
    transactionType: "relief",
    absoluteCap: 250000,
    requiresProof: true,
    proofHint: "Attach tuition invoice or training certificate.",
    criteria: [
      "Training or tuition directly related to the taxpayer's professional work.",
      "Annual claim capped at ₦250,000.",
      "Reject if unrelated course or exceeds cap.",
    ],
    reference: "NTA 2025 · Skills Development Relief",
  },
]

const getComplianceBadge = (status: ComplianceStatus) => {
  switch (status) {
    case "compliant":
      return {
        label: "Compliant",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
        icon: <ShieldCheck className="h-3.5 w-3.5" />,
      }
    case "non-compliant":
      return {
        label: "Not compliant",
        className: "border-destructive/40 bg-destructive/10 text-destructive",
        icon: <XCircle className="h-3.5 w-3.5" />,
      }
    case "needs-evidence":
    default:
      return {
        label: "Needs evidence",
        className: "border-amber-200 bg-amber-50 text-amber-900",
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
      }
  }
}

interface AuditRecord {
  transaction: Transaction
  notes: string
  verified: boolean
  evidence: ImageUploadResult[]
  compliance: ComplianceResult
}

const formatCurrency = (value: number) =>
  `₦${value.toLocaleString("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`

const formatDate = (value: string | Date) => {
  const date = typeof value === "string" ? new Date(value) : value
  return date.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const buildExistingEvidence = (transaction: Transaction): ImageUploadResult[] => {
  if (!transaction.attachments || transaction.attachments.length === 0) return []
  return transaction.attachments.map((url, index) => ({
    url,
    fileId: `existing-${transaction.id}-${index}`,
    name: `Attachment ${index + 1}`,
    size: 0,
  }))
}

const normalizeString = (value?: string) => value?.toLowerCase() ?? ""

const findRuleForTransaction = (transaction: Transaction, supplementalNotes?: string): ComplianceRule | undefined => {
  const haystack = [
    transaction.category,
    transaction.description,
    transaction.notes,
    supplementalNotes,
    transaction.tags?.join(" "),
  ]
    .map(normalizeString)
    .join(" ")

  return COMPLIANCE_RULES.find((rule) => {
    if (rule.transactionType !== "any" && rule.transactionType !== transaction.type) {
      return false
    }
    return rule.keywords.some((keyword) => haystack.includes(keyword))
  })
}

const evaluateCompliance = (
  transaction: Transaction,
  evidence: ImageUploadResult[],
  context: ComplianceContext,
  reviewerNotes?: string
): ComplianceResult => {
  const rule = findRuleForTransaction(transaction, reviewerNotes)

  if (!rule) {
    return {
      status: "needs-evidence",
      issues: ["Unable to match this entry to a relief or expense rule. Add more detail in the description."],
    }
  }

  const issues: string[] = []
  let status: ComplianceStatus = "compliant"

  if (rule.requiresProof && evidence.length === 0) {
    issues.push(rule.proofHint || "Upload supporting evidence (receipt, statement, or certificate).")
    status = "needs-evidence"
  }

  if (rule.limitPercentageOfIncome && context.grossIncome > 0) {
    const limitValue = context.grossIncome * rule.limitPercentageOfIncome
    if (transaction.amount > limitValue) {
      issues.push(
        `Claim exceeds the permitted ${Math.round(rule.limitPercentageOfIncome * 100)}% of income (${formatCurrency(
          limitValue
        )}).`
      )
      status = "non-compliant"
    }
  }

  if (rule.absoluteCap && transaction.amount > rule.absoluteCap) {
    issues.push(`Claim exceeds the statutory cap of ${formatCurrency(rule.absoluteCap)}.`)
    status = "non-compliant"
  }

  if (rule.id === "business-expense") {
    // Ensure description is business oriented
    const description = normalizeString(`${transaction.description} ${reviewerNotes}`)
    if (!description || description.split(" ").length < 2) {
      issues.push("Add a short note describing the business purpose of this expense.")
      status = status === "non-compliant" ? "non-compliant" : "needs-evidence"
    }
  }

  if (issues.length === 0) {
    status = "compliant"
  }

  return {
    status,
    issues,
    rule: rule.label,
  }
}

export function AuditSubscriptionsDialog({
  open,
  onOpenChange,
  transactions,
  isLoading = false,
  totalSpend,
  periodLabel,
  businessType,
  onRequestNewExpense,
  grossIncome = 0,
}: AuditSubscriptionsDialogProps) {
  const [records, setRecords] = useState<AuditRecord[]>([])
  const [rowUploads, setRowUploads] = useState<Record<string, boolean>>({})
  const [generalDocuments, setGeneralDocuments] = useState<ImageUploadResult[]>([])
  const [generalUploading, setGeneralUploading] = useState(false)
  const [generalNotes, setGeneralNotes] = useState("")
  const [preparedBy, setPreparedBy] = useState("")
  const [reviewer, setReviewer] = useState("OTax Self Service")
  const [reviewDate, setReviewDate] = useState(() => new Date().toISOString().split("T")[0])
  const [showComplianceGuide, setShowComplianceGuide] = useState(false)

  const complianceContext = useMemo<ComplianceContext>(() => ({ grossIncome }), [grossIncome])

  const recomputeCompliance = useCallback(
    (record: AuditRecord): AuditRecord => {
      const compliance = evaluateCompliance(record.transaction, record.evidence, complianceContext, record.notes)
      const verified = compliance.status === "compliant" ? record.verified : false
      return { ...record, compliance, verified }
    },
    [complianceContext]
  )

  const createRecord = useCallback(
    (transaction: Transaction): AuditRecord => {
      const base: AuditRecord = {
        transaction,
        notes: "",
        verified: false,
        evidence: buildExistingEvidence(transaction),
        compliance: {
          status: "needs-evidence",
          issues: [],
        },
      }
      return recomputeCompliance(base)
    },
    [recomputeCompliance]
  )

  const updateRecord = useCallback(
    (transactionId: string, mutator: (record: AuditRecord) => AuditRecord) => {
      setRecords((prev) =>
        prev.map((record) => {
          if (record.transaction.id !== transactionId) return record
          const mutated = mutator(record)
          return recomputeCompliance(mutated)
        })
      )
    },
    [recomputeCompliance]
  )

  useEffect(() => {
    if (open && !isLoading) {
      setRecords(transactions.map((txn) => createRecord(txn)))
      setGeneralDocuments([])
      setGeneralNotes("")
      setPreparedBy("")
      setReviewer("OTax Self Service")
      setReviewDate(new Date().toISOString().split("T")[0])
    }

    if (!open) {
      setRecords([])
      setRowUploads({})
      setGeneralDocuments([])
      setGeneralNotes("")
      setPreparedBy("")
      setReviewer("OTax Self Service")
    }
  }, [open, transactions, isLoading, createRecord])

  const verifiedCount = useMemo(
    () => records.filter((record) => record.verified).length,
    [records]
  )

  const complianceSummary = useMemo(() => {
    return records.reduce(
      (acc, record) => {
        acc[record.compliance.status] += 1
        return acc
      },
      {
        compliant: 0,
        "needs-evidence": 0,
        "non-compliant": 0,
      } as Record<ComplianceStatus, number>
    )
  }, [records])

  const handleToggleVerified = (transactionId: string) => {
    const target = records.find((record) => record.transaction.id === transactionId)
    if (!target) return

    if (target.compliance.status !== "compliant") {
      toast.warning("Resolve the compliance issues first before marking this item as verified.")
      return
    }

    updateRecord(transactionId, (record) => ({
      ...record,
      verified: !record.verified,
    }))
  }

  const handleNotesChange = (transactionId: string, value: string) => {
    updateRecord(transactionId, (record) => ({
      ...record,
      notes: value,
    }))
  }

  const handleFileUpload = async (transactionId: string, files: FileList | null) => {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    setRowUploads((prev) => ({ ...prev, [transactionId]: true }))

    try {
      const results = await Promise.all(fileArray.map((file) => uploadToImageKit(file, "audits")))
      updateRecord(transactionId, (record) => ({
        ...record,
        evidence: [...record.evidence, ...results],
      }))
      toast.success(`${results.length} document${results.length > 1 ? "s" : ""} uploaded.`)
    } catch (error) {
      console.error("Audit upload error:", error)
      toast.error("Failed to upload some receipts.")
    } finally {
      setRowUploads((prev) => ({ ...prev, [transactionId]: false }))
    }
  }

  const handleRemoveEvidence = (transactionId: string, fileId: string) => {
    updateRecord(transactionId, (record) => ({
      ...record,
      evidence: record.evidence.filter((doc) => doc.fileId !== fileId),
    }))
  }

  const handleGeneralUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    setGeneralUploading(true)

    try {
      const results = await Promise.all(fileArray.map((file) => uploadToImageKit(file, "audits")))
      setGeneralDocuments((prev) => [...prev, ...results])
      toast.success(`${results.length} supporting file${results.length > 1 ? "s" : ""} added.`)
    } catch (error) {
      console.error("General audit upload error:", error)
      toast.error("Failed to upload supporting documents.")
    } finally {
      setGeneralUploading(false)
    }
  }

  const handleRemoveGeneralDocument = (fileId: string) => {
    setGeneralDocuments((prev) => prev.filter((doc) => doc.fileId !== fileId))
  }

  const markAllVerified = () => {
    let flagged = false
    setRecords((prev) =>
      prev.map((record) => {
        if (record.compliance.status === "compliant") {
          return { ...record, verified: true }
        }
        flagged = true
        return { ...record, verified: false }
      })
    )
    if (flagged) {
      toast.info("Items with outstanding issues stayed unverified.")
    }
  }

  const generatePrintableReport = () => {
    if (records.length === 0) {
      toast.info("Nothing to audit yet. Log your subscription expenses first.")
      return
    }

    if (!preparedBy.trim()) {
      toast.warning("Add the name of the reviewer in the \"Prepared by\" field before generating the report.")
      return
    }

    const reportWindow = window.open("", "_blank", "width=900,height=1200")
    if (!reportWindow || reportWindow.closed) {
      toast.error("Unable to open report window. Allow pop-ups to continue.")
      return
    }

    const verifiedItems = records.filter((record) => record.verified).length
    const formattedReviewDate = reviewDate
      ? formatDate(reviewDate)
      : formatDate(new Date().toISOString())

    const complianceCounts = records.reduce(
      (acc, record) => {
        acc[record.compliance.status] += 1
        return acc
      },
      {
        compliant: 0,
        "needs-evidence": 0,
        "non-compliant": 0,
      } as Record<ComplianceStatus, number>
    )

    const logoUrl = `${window.location.origin}/logootax.jpg`

    const rows = records
      .map((record, index) => {
        const evidenceList = record.evidence.length
          ? `<ul>${record.evidence
              .map(
                (doc) =>
                  `<li><a href="${doc.url}" target="_blank" rel="noopener noreferrer">${doc.name || "Receipt"}</a></li>`
              )
              .join("")}</ul>`
          : "<em>No receipts uploaded</em>"

        const escape = (value: string) =>
          value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

        const notes = record.notes ? escape(record.notes).replace(/\n/g, "<br />") : "-"

        const complianceStatus =
          record.compliance.status === "compliant"
            ? "Compliant"
            : record.compliance.status === "non-compliant"
            ? "Not compliant"
            : "Needs evidence"

        const complianceIssues = record.compliance.issues.length
          ? `<ul>${record.compliance.issues.map((issue) => `<li>${escape(issue)}</li>`).join("")}</ul>`
          : "—"

        const description =
          record.transaction.description && record.transaction.description.trim().length > 0
            ? escape(record.transaction.description)
            : "-"

        return `
          <tr>
            <td>${index + 1}</td>
            <td>${formatDate(record.transaction.date)}</td>
            <td><div class="description-box">${description}</div></td>
            <td>${record.transaction.category || "-"}</td>
            <td>${formatCurrency(record.transaction.amount)}</td>
            <td>${record.compliance.rule || "—"}</td>
            <td>${complianceStatus}</td>
            <td>${record.verified ? "Verified" : "Pending"}</td>
            <td>${notes}</td>
            <td>${evidenceList}</td>
            <td>${complianceIssues}</td>
          </tr>
        `
      })
      .join("")

    const generalEvidenceList = generalDocuments.length
      ? `<ul>${generalDocuments
          .map(
            (doc) =>
              `<li><a href="${doc.url}" target="_blank" rel="noopener noreferrer">${doc.name || "Supporting Document"}</a></li>`
          )
          .join("")}</ul>`
      : "<em>No additional documents</em>"

    const escapedGeneralNotes = generalNotes
      ? generalNotes.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br />")
      : "—"

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>Recurring Subscription Audit</title>
          <style>
            * { font-family: "Inter", "Segoe UI", sans-serif; color: #1f2933; }
            body { margin: 32px; background: #fff; }
            .header { display: flex; align-items: stretch; margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; }
            .header-left { width: 200px; background: #3f3d56; display: flex; flex-direction: column; gap: 12px; padding: 24px 20px; color: #fff; font-size: 12px; }
            .header-left-row { display: flex; align-items: center; gap: 10px; }
            .header-left-icon { width: 28px; height: 28px; border-radius: 999px; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; font-size: 12px; }
            .header-left-text { font-size: 12px; }
            .header-center { flex: 1; position: relative; background: linear-gradient(90deg, #f8f9fb 0%, #ffffff 100%); display: flex; align-items: center; padding: 32px 24px; }
            .header-center::before { content: ""; position: absolute; left: 56px; bottom: 24px; width: 280px; height: 8px; background: #3f3d56; border-radius: 999px; }
            .header-center::after { content: ""; position: absolute; left: 48px; bottom: 20px; width: 110px; height: 12px; background: rgba(63, 61, 86, 0.35); border-radius: 999px; transform: skewX(-18deg); }
            .header-right { width: 220px; display: flex; align-items: center; justify-content: center; background: #ffffff; }
            .header-right img { max-width: 160px; height: auto; }
            .meta { margin-bottom: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; }
            .summary { border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; background: #f9fafb; display: grid; gap: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            th, td { border: 1px solid #e5e7eb; padding: 10px 12px; font-size: 14px; vertical-align: top; }
            th { background: #f1f5f9; font-weight: 600; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em; }
            ul { margin: 0; padding-left: 20px; }
            a { color: #1d4ed8; text-decoration: none; }
            a:hover { text-decoration: underline; }
            .description-box { border: 1px solid #d1d5db; border-radius: 10px; padding: 8px 10px; min-height: 42px; background: #f9fafb; line-height: 1.45; }
            .notes { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
            footer { margin-top: 48px; font-size: 12px; color: #6b7280; text-align: center; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <div class="header-left">
              <div class="header-left-row">
                <div class="header-left-icon">☎</div>
                <span class="header-left-text">0814 948 5675</span>
              </div>
              <div class="header-left-row">
                <div class="header-left-icon">✉</div>
                <span class="header-left-text">otax.ng@gmail.com</span>
              </div>
              <div class="header-left-row">
                <div class="header-left-icon">🌐</div>
                <a class="header-left-text" href="https://otaxng.com" target="_blank" rel="noopener noreferrer">otaxng.com</a>
              </div>
            </div>
            <div class="header-center">
              <div>
                <strong style="font-size:20px; display:block; margin-bottom:4px;">Recurring Subscription Audit</strong>
                <span style="font-size:13px; color:#6b7280;">${periodLabel || "Current quarter"}</span>
              </div>
            </div>
            <div class="header-right">
              <img src="${logoUrl}" alt="OTax" />
            </div>
          </div>

          <div class="meta">
            <div><strong>Prepared by:</strong> ${preparedBy || "—"}</div>
            <div><strong>Reviewer:</strong> ${reviewer || "—"}</div>
            <div><strong>Review date:</strong> ${formattedReviewDate}</div>
            <div><strong>Business type:</strong> ${businessType === "creator" ? "Creator" : "Freelancer"}</div>
          </div>

          <div class="summary">
            <div><strong>Total spend reviewed:</strong> ${formatCurrency(totalSpend)}</div>
            <div><strong>Transactions reviewed:</strong> ${records.length}</div>
            <div><strong>Verified items:</strong> ${verifiedItems}</div>
            <div><strong>Compliant:</strong> ${complianceCounts["compliant"]}</div>
            <div><strong>Needs evidence:</strong> ${complianceCounts["needs-evidence"]}</div>
            <div><strong>Not compliant:</strong> ${complianceCounts["non-compliant"]}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Rule</th>
                <th>Compliance</th>
                <th>Status</th>
                <th>Reviewer notes</th>
                <th>Evidence</th>
                <th>Compliance notes</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <div class="notes">
            <h3>Additional notes</h3>
            <p>${escapedGeneralNotes}</p>
            <h4>Supporting documents</h4>
            ${generalEvidenceList}
          </div>

          <footer>
            Generated by OTax audit assistant · ${new Date().toLocaleString("en-NG")}
          </footer>
        </body>
      </html>
    `

    reportWindow.document.open()
    reportWindow.document.write(html)
    reportWindow.document.close()
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Audit recurring subscriptions</DialogTitle>
          <DialogDescription>
            Gather receipts and notes that justify your software and platform spend for{" "}
            {periodLabel || "the current quarter"}.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            Preparing your audit workspace…
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowComplianceGuide(true)}
                className="gap-1.5"
              >
                <ShieldCheck className="h-4 w-4" />
                Compliance criteria
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Audit period</p>
                <p className="font-semibold text-sm">{periodLabel || "Current quarter"}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Total subscription spend</p>
                <p className="font-semibold text-sm">{formatCurrency(totalSpend)}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Transactions reviewed</p>
                <p className="font-semibold text-sm">{records.length}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Verified items</p>
                <p className="font-semibold text-sm">{verifiedCount}</p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                <p className="text-xs text-emerald-700">Compliant</p>
                <p className="font-semibold text-sm text-emerald-800">{complianceSummary["compliant"]}</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-amber-800">Needs evidence</p>
                <p className="font-semibold text-sm text-amber-900">{complianceSummary["needs-evidence"]}</p>
              </div>
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3">
                <p className="text-xs text-destructive">Not compliant</p>
                <p className="font-semibold text-sm text-destructive">{complianceSummary["non-compliant"]}</p>
              </div>
            </div>

            <Separator />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Prepared by</label>
                <Input
                  value={preparedBy}
                  onChange={(event) => setPreparedBy(event.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Reviewer</label>
                <Input value={reviewer} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Review date</label>
                <Input
                  type="date"
                  value={reviewDate}
                  onChange={(event) => setReviewDate(event.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Subscription transactions</h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={markAllVerified}
                    disabled={records.length === 0}
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4 text-emerald-500" />
                    Mark all verified
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {records.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-muted-foreground/30 p-6 text-center text-sm text-muted-foreground space-y-3">
                    <p>
                      No software or platform expenses logged for this period yet. Add them as expense
                      transactions to build an audit trail.
                    </p>
                    {onRequestNewExpense && (
                      <Button size="sm" onClick={onRequestNewExpense} className="mt-1">
                        Log a subscription expense
                      </Button>
                    )}
                  </div>
                ) : (
                  records.map((record) => (
                    <div
                      key={record.transaction.id}
                      className="rounded-xl border border-border p-4 space-y-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={record.verified ? "secondary" : "outline"}
                              className="text-[11px] uppercase tracking-wide"
                            >
                              {record.verified ? "Verified" : "Pending review"}
                            </Badge>
                        {(() => {
                          const badge = getComplianceBadge(record.compliance.status)
                          return (
                            <Badge
                              variant="outline"
                              className={`flex items-center gap-1 text-[11px] uppercase tracking-wide ${badge.className}`}
                            >
                              {badge.icon}
                              {badge.label}
                            </Badge>
                          )
                        })()}
                            <span className="text-xs text-muted-foreground">
                              {formatDate(record.transaction.date)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-semibold">
                            {record.transaction.description || "Untitled subscription"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {record.transaction.category || "Software"}
                          </p>
                          {record.compliance.rule && (
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              Rule applied: {record.compliance.rule}
                            </p>
                          )}
                        </div>
                        <div className="text-right sm:text-left">
                          <p className="text-sm font-semibold">{formatCurrency(record.transaction.amount)}</p>
                          <Button
                            variant={record.verified ? "secondary" : "ghost"}
                            size="sm"
                            className="mt-2"
                            onClick={() => handleToggleVerified(record.transaction.id)}
                          >
                            <CheckCircle2 className="mr-1.5 h-4 w-4" />
                            {record.verified ? "Undo verify" : "Mark verified"}
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
                        <Textarea
                          className="min-h-[72px]"
                          placeholder="What does this tool do for the business? Any risk or duplicate subscription?"
                          value={record.notes}
                          onChange={(event) =>
                            handleNotesChange(record.transaction.id, event.target.value)
                          }
                        />
                        <div className="space-y-2">
                          <label
                            htmlFor={`upload-${record.transaction.id}`}
                            className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-primary/50 bg-primary/5 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10"
                          >
                            <Upload className="mr-1.5 h-4 w-4" />
                            {rowUploads[record.transaction.id] ? "Uploading…" : "Upload receipts"}
                          </label>
                          <input
                            id={`upload-${record.transaction.id}`}
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            multiple
                            onChange={(event) => {
                              handleFileUpload(record.transaction.id, event.target.files)
                              event.target.value = ""
                            }}
                          />
                          {rowUploads[record.transaction.id] && (
                            <p className="text-[11px] text-muted-foreground">
                              <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
                              Uploading receipts…
                            </p>
                          )}
                        </div>
                      </div>

                      {record.evidence.length > 0 && (
                        <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-3">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                            Attached receipts & evidence
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {record.evidence.map((doc) => (
                              <Badge
                                key={doc.fileId}
                                variant="outline"
                                className="flex items-center gap-1 text-xs"
                              >
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                >
                                  {doc.name || "Receipt"}
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEvidence(record.transaction.id, doc.fileId)}
                                  className="ml-1 text-[10px] text-muted-foreground hover:text-destructive"
                                >
                                  remove
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {record.compliance.issues.length > 0 && (
                        <div
                          className={`rounded-lg border p-3 text-xs space-y-1 ${
                            record.compliance.status === "non-compliant"
                              ? "border-destructive/40 bg-destructive/10 text-destructive"
                              : "border-amber-200 bg-amber-50 text-amber-900"
                          }`}
                        >
                          <p className="font-semibold">
                            {record.compliance.status === "non-compliant"
                              ? "Not compliant"
                              : "Needs supporting evidence"}
                          </p>
                          <ul className="list-disc pl-4 space-y-1">
                            {record.compliance.issues.map((issue, index) => (
                              <li key={index}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Supporting notes</h3>
              <Textarea
                placeholder="Summarize what you checked, outstanding issues, or follow-up actions."
                value={generalNotes}
                onChange={(event) => setGeneralNotes(event.target.value)}
                className="min-h-[96px]"
              />

              <div className="space-y-2">
                <label
                  htmlFor="general-audit-upload"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-primary/40 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/10"
                >
                  <Upload className="h-4 w-4" />
                  {generalUploading ? "Uploading…" : "Add supporting documents"}
                </label>
                <input
                  id="general-audit-upload"
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    handleGeneralUpload(event.target.files)
                    event.target.value = ""
                  }}
                />
                {generalDocuments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {generalDocuments.map((doc) => (
                      <Badge
                        key={doc.fileId}
                        variant="outline"
                        className="flex items-center gap-1 text-xs"
                      >
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {doc.name || "Attachment"}
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveGeneralDocument(doc.fileId)}
                          className="ml-1 text-[10px] text-muted-foreground hover:text-destructive"
                        >
                          remove
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                The printable report bundles your notes, receipts, and supporting files into an
                audit-ready summary with the OTax letterhead.
              </p>
              <Button
                onClick={generatePrintableReport}
                className="w-full sm:w-auto"
                disabled={records.length === 0}
              >
                <Printer className="mr-2 h-4 w-4" />
                Generate printable audit report
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    <Sheet open={showComplianceGuide} onOpenChange={setShowComplianceGuide}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="space-y-2">
          <SheetTitle>Compliance criteria</SheetTitle>
          <SheetDescription>
            Quick reference for 2025 Nigeria Tax &amp; Fiscal Policy reforms (NTA review). Each
            claim is checked against these rules during the automated audit.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          {COMPLIANCE_RULES.map((rule) => (
            <div key={rule.id} className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">{rule.label}</p>
                {rule.reference && (
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
                    {rule.reference}
                  </span>
                )}
              </div>
              <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-1">
                {rule.criteria.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
              {rule.proofHint && (
                <p className="text-xs text-primary font-medium">Evidence: {rule.proofHint}</p>
              )}
              {rule.limitPercentageOfIncome && (
                <p className="text-[11px] text-muted-foreground">
                  Limit: {Math.round(rule.limitPercentageOfIncome * 100)}% of declared income.
                </p>
              )}
              {rule.absoluteCap && (
                <p className="text-[11px] text-muted-foreground">
                  Statutory cap: {formatCurrency(rule.absoluteCap)}.
                </p>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
    </>
  )
}

