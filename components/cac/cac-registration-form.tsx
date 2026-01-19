"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { uploadToImageKit } from "@/lib/utils/imagekit"
import { payWithPaystackInline } from "@/lib/utils/paystack-inline"
import { CAC_EXPLANATIONS, CAC_FEES_NAIRA, formatNaira } from "@/lib/constants/cac"
import type { CacRegistrationType, CacUploadedFile } from "@/lib/types"
import { FileUp, Loader2, Plus, Trash2 } from "lucide-react"

type UploadFieldKey =
  | "ninSlips"
  | "signatures"
  | "passportPhotos"

type LlcBand = keyof typeof CAC_FEES_NAIRA.LLC_SHARE_CAPITAL
type UploadBucket = Record<UploadFieldKey, File[]>

function emptyBucket(): UploadBucket {
  return { ninSlips: [], signatures: [], passportPhotos: [] }
}

function required(value: string, label: string): string | null {
  if (!String(value || "").trim()) return `${label} is required`
  return null
}

export function CacRegistrationForm({ type }: { type: CacRegistrationType }) {
  const router = useRouter()
  const info = CAC_EXPLANATIONS[type]

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [contact, setContact] = useState({
    name: "",
    email: "",
    phone: "",
  })

  // Business Name payload
  const [businessNamePayload, setBusinessNamePayload] = useState({
    proposedBusinessName: "",
    businessAddress: "",
    businessLga: "",
    businessObjectives: "",
    proprietorFullName: "",
    proprietorResidentialAddress: "",
    proprietorResidentialLga: "",
    dateOfBirth: "",
  })

  // LLC payload
  const [llcPayload, setLlcPayload] = useState({
    proposedNames: ["", ""],
    officialEmail: "",
    phone: "",
    companyAddress: "",
    companyLga: "",
    objectives: "",
    shareCapitalBand: "UP_TO_1M" as LlcBand,
    witness: { fullName: "", phone: "", email: "", occupation: "", address: "", lga: "" },
    directors: [{ fullName: "", phone: "", email: "", occupation: "", address: "", lga: "", dateOfBirth: "", shares: "" }],
    shareholders: [] as Array<{ fullName: string; phone: string; email: string; occupation: string; address: string; lga: string; dateOfBirth: string; shares: string }>,
  })

  // Incorporated Trustees payload
  const [trusteesPayload, setTrusteesPayload] = useState({
    proposedNames: ["", ""],
    officialEmail: "",
    phone: "",
    registeredAddress: "",
    registeredLga: "",
    aimsObjectives: "",
    trustees: [{ fullName: "", dateOfBirth: "", phone: "", email: "", occupation: "", address: "", lga: "" }],
    executiveMembers: [{ role: "Chairman", fullName: "" }, { role: "Secretary", fullName: "" }],
  })

  const [uploads, setUploads] = useState<Record<UploadFieldKey, File[]>>({
    ninSlips: [],
    signatures: [],
    passportPhotos: [],
  })

  // LLC per-person document uploads (explicit per director; shareholders optional)
  const [llcWitnessUploads, setLlcWitnessUploads] = useState<UploadBucket>(emptyBucket())
  const [llcDirectorUploads, setLlcDirectorUploads] = useState<UploadBucket[]>([emptyBucket()])
  const [llcShareholderUploads, setLlcShareholderUploads] = useState<UploadBucket[]>([])

  const amountNaira = useMemo(() => {
    if (type === "BUSINESS_NAME") return CAC_FEES_NAIRA.BUSINESS_NAME
    if (type === "INCORPORATED_TRUSTEES") return CAC_FEES_NAIRA.INCORPORATED_TRUSTEES
    // LLC
    return CAC_FEES_NAIRA.LLC_SHARE_CAPITAL[llcPayload.shareCapitalBand]
  }, [type, llcPayload.shareCapitalBand])

  const amountKobo = amountNaira * 100

  const expectedDocs = useMemo(() => {
    if (type === "BUSINESS_NAME") {
      return {
        ninSlips: { label: "NIN slip", required: true },
        signatures: { label: "Signature photo", required: true },
        passportPhotos: { label: "Passport photo", required: true },
      }
    }
    if (type === "LLC") {
      return {
        ninSlips: { label: "NIN slips (witness + directors + shareholders)", required: false },
        signatures: { label: "Signatures (directors + shareholders)", required: false },
        passportPhotos: { label: "Passport photos (optional)", required: false },
      }
    }
    return {
      ninSlips: { label: "Means of ID (NIN slips)", required: true },
      signatures: { label: "Signatures (trustees)", required: true },
      passportPhotos: { label: "Passport photos (optional)", required: false },
    }
  }, [type])

  const validate = (): string | null => {
    const email = String(contact.email || "").trim().toLowerCase()
    if (required(contact.name, "Contact name")) return required(contact.name, "Contact name")
    if (required(email, "Contact email")) return required(email, "Contact email")
    if (required(contact.phone, "Contact phone")) return required(contact.phone, "Contact phone")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address"

    // Required uploads (non-LLC types use the generic uploader)
    if (type !== "LLC") {
      for (const key of Object.keys(expectedDocs) as UploadFieldKey[]) {
        const cfg = expectedDocs[key]
        if (cfg.required && (!uploads[key] || uploads[key].length === 0)) {
          return `Please upload: ${cfg.label}`
        }
      }
    }

    if (type === "BUSINESS_NAME") {
      const p = businessNamePayload
      return (
        required(p.proposedBusinessName, "Proposed business name") ||
        required(p.businessAddress, "Business address") ||
        required(p.businessLga, "Business LGA") ||
        required(p.businessObjectives, "Nature of business / objectives") ||
        required(p.proprietorFullName, "Proprietor full name") ||
        required(p.proprietorResidentialAddress, "Proprietor residential address") ||
        required(p.proprietorResidentialLga, "Proprietor residential LGA") ||
        required(p.dateOfBirth, "Date of birth")
      )
    }

    if (type === "LLC") {
      const p = llcPayload
      const name1 = String(p.proposedNames[0] || "").trim()
      const name2 = String(p.proposedNames[1] || "").trim()
      if (!name1 && !name2) return "Please provide at least one proposed company name"
      if (required(p.companyAddress, "Company address")) return required(p.companyAddress, "Company address")
      if (required(p.companyLga, "Company LGA")) return required(p.companyLga, "Company LGA")
      if (required(p.objectives, "Business objectives")) return required(p.objectives, "Business objectives")
      if (required(p.witness.fullName, "Witness full name")) return required(p.witness.fullName, "Witness full name")
      if (required(p.witness.phone, "Witness phone")) return required(p.witness.phone, "Witness phone")
      if (p.directors.length === 0) return "Please add at least one director"

      // LLC documents: explicit per-person (witness + each director). Shareholders are optional.
      if (!llcWitnessUploads.ninSlips.length) return "Please upload witness NIN slip"
      if (!llcWitnessUploads.signatures.length) return "Please upload witness signature"
      for (let i = 0; i < p.directors.length; i++) {
        const b = llcDirectorUploads[i] || emptyBucket()
        if (!b.ninSlips.length) return `Please upload NIN slip for Director ${i + 1}`
        if (!b.signatures.length) return `Please upload signature for Director ${i + 1}`
      }

      // Shareholders optional, but if provided, their docs become required
      for (let i = 0; i < p.shareholders.length; i++) {
        const s = p.shareholders[i] || ({} as any)
        const hasAny =
          !!String(s.fullName || "").trim() ||
          !!String(s.phone || "").trim() ||
          !!String(s.email || "").trim() ||
          !!String(s.occupation || "").trim() ||
          !!String(s.address || "").trim() ||
          !!String(s.lga || "").trim() ||
          !!String(s.dateOfBirth || "").trim() ||
          !!String(s.shares || "").trim()
        if (!hasAny) continue
        const b = llcShareholderUploads[i] || emptyBucket()
        if (!b.ninSlips.length) return `Please upload NIN slip for Shareholder ${i + 1}`
        if (!b.signatures.length) return `Please upload signature for Shareholder ${i + 1}`
      }
      return null
    }

    // Trustees
    const p = trusteesPayload
    const hasProposed = p.proposedNames.some((x) => String(x || "").trim())
    if (!hasProposed) return "Please provide at least one proposed name"
    if (required(p.registeredAddress, "Registered address")) return required(p.registeredAddress, "Registered address")
    if (required(p.registeredLga, "Registered LGA")) return required(p.registeredLga, "Registered LGA")
    if (required(p.aimsObjectives, "Aims and objectives")) return required(p.aimsObjectives, "Aims and objectives")
    if (p.trustees.length < 2) return "Minimum of 2 trustees required"
    return null
  }

  const uploadFiles = async (): Promise<Record<string, CacUploadedFile[]>> => {
    const results: Record<string, CacUploadedFile[]> = {}

    const pushFiles = async (key: string, files: File[]) => {
      if (!files || files.length === 0) return
      results[key] = results[key] || []
      for (const file of files) {
        const res = await uploadToImageKit(file, "cac")
        results[key].push({
          url: res.url,
          fileId: res.fileId,
          name: res.name,
          size: res.size,
          originalName: file.name,
        })
      }
    }

    if (type === "LLC") {
      // Witness uploads
      await pushFiles("llc_witness_ninSlips", llcWitnessUploads.ninSlips)
      await pushFiles("llc_witness_signatures", llcWitnessUploads.signatures)
      await pushFiles("llc_witness_passportPhotos", llcWitnessUploads.passportPhotos)

      // Directors uploads (explicit per director)
      for (let i = 0; i < llcPayload.directors.length; i++) {
        const b = llcDirectorUploads[i] || emptyBucket()
        const n = i + 1
        await pushFiles(`llc_director_${n}_ninSlips`, b.ninSlips)
        await pushFiles(`llc_director_${n}_signatures`, b.signatures)
        await pushFiles(`llc_director_${n}_passportPhotos`, b.passportPhotos)
      }

      // Shareholders uploads (optional)
      for (let i = 0; i < llcPayload.shareholders.length; i++) {
        const b = llcShareholderUploads[i] || emptyBucket()
        const n = i + 1
        await pushFiles(`llc_shareholder_${n}_ninSlips`, b.ninSlips)
        await pushFiles(`llc_shareholder_${n}_signatures`, b.signatures)
        await pushFiles(`llc_shareholder_${n}_passportPhotos`, b.passportPhotos)
      }

      return results
    }

    // Non-LLC: generic upload blocks
    const entries = Object.entries(uploads) as Array<[UploadFieldKey, File[]]>
    for (const [key, files] of entries) {
      await pushFiles(key, files)
    }

    return results
  }

  const handleSubmitAndPay = async () => {
    const err = validate()
    if (err) {
      toast.error(err)
      return
    }

    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
    if (!publicKey) {
      toast.error("Paystack public key not configured")
      return
    }

    setIsSubmitting(true)
    try {
      const initToast = toast.loading("Initializing payment…")
      const initRes = await fetch("/api/cac/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          contact,
          shareCapitalBand: type === "LLC" ? llcPayload.shareCapitalBand : undefined,
        }),
      })

      const initData = await initRes.json()
      toast.dismiss(initToast)
      if (!initRes.ok || !initData?.success) {
        throw new Error(initData?.error || "Failed to initialize payment")
      }

      await payWithPaystackInline({
        publicKey,
        email: String(contact.email).trim(),
        amountKobo: initData.data.amountKobo,
        reference: initData.data.reference,
        metadata: { cacRequestId: initData.data.requestId, type },
        onSuccess: async (result) => {
          const ref = result?.reference || initData.data.reference
          const verifyToast = toast.loading("Verifying payment…")
          try {
            const verifyRes = await fetch("/api/cac/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reference: ref }),
            })
            const verifyData = await verifyRes.json()
            toast.dismiss(verifyToast)
            if (!verifyRes.ok || !verifyData?.success) {
              throw new Error(verifyData?.error || "Payment verification failed")
            }

            // Upload documents ONLY after payment is confirmed, to avoid duplicate uploads on payment retry.
            const uploadToast = toast.loading("Uploading documents…")
            try {
              const uploaded = await uploadFiles()
              toast.dismiss(uploadToast)

              const attachToast = toast.loading("Submitting your details…")
              const attachRes = await fetch("/api/cac/attach-uploads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  requestId: verifyData.data.requestId,
                  reference: ref,
                  payload: type === "BUSINESS_NAME" ? businessNamePayload : type === "LLC" ? llcPayload : trusteesPayload,
                  uploads: uploaded,
                  shareCapitalBand: type === "LLC" ? llcPayload.shareCapitalBand : undefined,
                }),
              })
              const attachData = await attachRes.json()
              toast.dismiss(attachToast)
              if (!attachRes.ok || !attachData?.success) {
                throw new Error(attachData?.error || "Failed to submit request details")
              }

              toast.success("Payment successful — request submitted")
              router.push(`/cac/success?requestId=${encodeURIComponent(verifyData.data.requestId)}`)
            } catch (e: any) {
              toast.dismiss(uploadToast)
              toast.error(e?.message || "Payment was successful, but document upload failed. Please contact support.")
            }
          } catch (e: any) {
            toast.dismiss(verifyToast)
            toast.error(e?.message || "Payment verified failed")
          }
        },
        onClose: () => {
          toast.message("Payment closed", { description: "You can try again when ready." })
        },
      })
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit request")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Contact details</CardTitle>
          <CardDescription>We’ll use this to confirm your submission and next steps.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Full name</Label>
            <Input value={contact.name} onChange={(e) => setContact((p) => ({ ...p, name: e.target.value }))} placeholder="Your name" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={contact.email} onChange={(e) => setContact((p) => ({ ...p, email: e.target.value }))} placeholder="you@example.com" />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={contact.phone} onChange={(e) => setContact((p) => ({ ...p, phone: e.target.value }))} placeholder="+234…" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-none">
        <CardHeader>
          <CardTitle>What you’re registering</CardTitle>
          <CardDescription>{info.whatItIs}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {type === "BUSINESS_NAME" ? (
            <div className="space-y-6">
              <div className="rounded-lg border p-4 bg-muted/10 space-y-3">
                <div className="text-base font-semibold">Business details</div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Proposed business name</Label>
                    <Input
                      value={businessNamePayload.proposedBusinessName}
                      onChange={(e) => setBusinessNamePayload((p) => ({ ...p, proposedBusinessName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Business address</Label>
                    <Input value={businessNamePayload.businessAddress} onChange={(e) => setBusinessNamePayload((p) => ({ ...p, businessAddress: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Business LGA</Label>
                    <Input value={businessNamePayload.businessLga} onChange={(e) => setBusinessNamePayload((p) => ({ ...p, businessLga: e.target.value }))} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Nature of business / objectives</Label>
                    <Textarea
                      value={businessNamePayload.businessObjectives}
                      onChange={(e) => setBusinessNamePayload((p) => ({ ...p, businessObjectives: e.target.value }))}
                      placeholder="Brief description of the business activities…"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-muted/10 space-y-3">
                <div className="text-base font-semibold">Proprietor details</div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Proprietor full name</Label>
                    <Input value={businessNamePayload.proprietorFullName} onChange={(e) => setBusinessNamePayload((p) => ({ ...p, proprietorFullName: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Date of birth</Label>
                    <Input
                      type="date"
                      value={businessNamePayload.dateOfBirth}
                      onChange={(e) => setBusinessNamePayload((p) => ({ ...p, dateOfBirth: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Proprietor residential address</Label>
                    <Input
                      value={businessNamePayload.proprietorResidentialAddress}
                      onChange={(e) => setBusinessNamePayload((p) => ({ ...p, proprietorResidentialAddress: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Proprietor residential LGA</Label>
                    <Input
                      value={businessNamePayload.proprietorResidentialLga}
                      onChange={(e) => setBusinessNamePayload((p) => ({ ...p, proprietorResidentialLga: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {type === "LLC" ? (
            <div className="space-y-5">
              <div className="rounded-lg border p-4 bg-muted/10 space-y-3">
                <div className="text-base font-semibold">Company information</div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Proposed company name (1)</Label>
                  <Input
                    value={llcPayload.proposedNames[0]}
                    onChange={(e) =>
                      setLlcPayload((p) => ({ ...p, proposedNames: [e.target.value, p.proposedNames[1]] }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Proposed company name (2)</Label>
                  <Input
                    value={llcPayload.proposedNames[1]}
                    onChange={(e) =>
                      setLlcPayload((p) => ({ ...p, proposedNames: [p.proposedNames[0], e.target.value] }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company address</Label>
                  <Input value={llcPayload.companyAddress} onChange={(e) => setLlcPayload((p) => ({ ...p, companyAddress: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Company LGA</Label>
                  <Input value={llcPayload.companyLga} onChange={(e) => setLlcPayload((p) => ({ ...p, companyLga: e.target.value }))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Business objectives / nature of business</Label>
                  <Textarea value={llcPayload.objectives} onChange={(e) => setLlcPayload((p) => ({ ...p, objectives: e.target.value }))} />
                </div>
              </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2 text-base font-semibold">Share capital</div>
                <div className="space-y-2">
                  <Label>Share capital band</Label>
                  <Select
                    value={llcPayload.shareCapitalBand}
                    onValueChange={(v) => setLlcPayload((p) => ({ ...p, shareCapitalBand: v as LlcBand }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select share capital" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UP_TO_1M">{`Up to ₦1,000,000 (${formatNaira(CAC_FEES_NAIRA.LLC_SHARE_CAPITAL.UP_TO_1M)})`}</SelectItem>
                      <SelectItem value="UP_TO_5M">{`Up to ₦5,000,000 (${formatNaira(CAC_FEES_NAIRA.LLC_SHARE_CAPITAL.UP_TO_5M)})`}</SelectItem>
                      <SelectItem value="UP_TO_10M">{`Up to ₦10,000,000 (${formatNaira(CAC_FEES_NAIRA.LLC_SHARE_CAPITAL.UP_TO_10M)})`}</SelectItem>
                      <SelectItem value="UP_TO_100M">{`Up to ₦100,000,000 (${formatNaira(CAC_FEES_NAIRA.LLC_SHARE_CAPITAL.UP_TO_100M)})`}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Official email (optional)</Label>
                  <Input value={llcPayload.officialEmail} onChange={(e) => setLlcPayload((p) => ({ ...p, officialEmail: e.target.value }))} />
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-muted/10 space-y-3">
                <div className="text-base font-semibold">Witness</div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Full name</Label>
                    <Input value={llcPayload.witness.fullName} onChange={(e) => setLlcPayload((p) => ({ ...p, witness: { ...p.witness, fullName: e.target.value } }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={llcPayload.witness.phone} onChange={(e) => setLlcPayload((p) => ({ ...p, witness: { ...p.witness, phone: e.target.value } }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={llcPayload.witness.email} onChange={(e) => setLlcPayload((p) => ({ ...p, witness: { ...p.witness, email: e.target.value } }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Occupation</Label>
                    <Input value={llcPayload.witness.occupation} onChange={(e) => setLlcPayload((p) => ({ ...p, witness: { ...p.witness, occupation: e.target.value } }))} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Address</Label>
                    <Input value={llcPayload.witness.address} onChange={(e) => setLlcPayload((p) => ({ ...p, witness: { ...p.witness, address: e.target.value } }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>LGA</Label>
                    <Input value={llcPayload.witness.lga} onChange={(e) => setLlcPayload((p) => ({ ...p, witness: { ...p.witness, lga: e.target.value } }))} />
                  </div>
                </div>

                <div className="rounded-lg border p-4 mt-4 space-y-3">
                  <div className="text-sm font-semibold">Witness documents</div>
                  <div className="text-xs text-muted-foreground">Upload the witness NIN slip and signature. Passport photo is optional.</div>

                  {(Object.keys(llcWitnessUploads) as UploadFieldKey[]).map((key) => {
                    const cfg = expectedDocs[key]
                    const label =
                      key === "ninSlips"
                        ? "NIN slip"
                        : key === "signatures"
                          ? "Signature photo"
                          : "Passport photo (optional)"
                    const required = key === "ninSlips" || key === "signatures"
                    const inputId = `cac-llc-witness-${key}`

                    return (
                      <div key={key} className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium">
                              {label} {required ? <span className="text-destructive">*</span> : null}
                            </div>
                            <div className="text-xs text-muted-foreground">PDF/JPG/PNG recommended</div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => {
                              const input = document.getElementById(inputId) as HTMLInputElement | null
                              input?.click()
                            }}
                          >
                            <FileUp className="w-4 h-4" />
                            Add files
                          </Button>
                        </div>
                        <input
                          id={inputId}
                          className="hidden"
                          type="file"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || [])
                            setLlcWitnessUploads((p) => ({ ...p, [key]: [...(p[key] || []), ...files] }))
                            e.currentTarget.value = ""
                          }}
                        />
                        {llcWitnessUploads[key]?.length ? (
                          <div className="rounded-lg border p-3 space-y-2">
                            {llcWitnessUploads[key].map((f, idx) => (
                              <div key={`${f.name}-${idx}`} className="flex items-center justify-between gap-3">
                                <div className="text-sm truncate">{f.name}</div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setLlcWitnessUploads((p) => ({ ...p, [key]: p[key].filter((_, i) => i !== idx) }))}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">No files added yet.</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-muted/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold">Directors</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      (setLlcPayload((p) => ({
                        ...p,
                        directors: [...p.directors, { fullName: "", phone: "", email: "", occupation: "", address: "", lga: "", dateOfBirth: "", shares: "" }],
                      })),
                      setLlcDirectorUploads((p) => [...p, emptyBucket()]))
                    }
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add director
                  </Button>
                </div>
                <div className="space-y-4">
                  {llcPayload.directors.map((d, idx) => (
                    <div key={idx} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-medium">Director {idx + 1}</div>
                        {llcPayload.directors.length > 1 ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setLlcPayload((p) => ({ ...p, directors: p.directors.filter((_, i) => i !== idx) }))
                              setLlcDirectorUploads((p) => p.filter((_, i) => i !== idx))
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        ) : null}
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Full name</Label>
                          <Input value={d.fullName} onChange={(e) => {
                            const v = e.target.value
                            setLlcPayload((p) => ({ ...p, directors: p.directors.map((x, i) => (i === idx ? { ...x, fullName: v } : x)) }))
                          }} />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <Input value={d.phone} onChange={(e) => {
                            const v = e.target.value
                            setLlcPayload((p) => ({ ...p, directors: p.directors.map((x, i) => (i === idx ? { ...x, phone: v } : x)) }))
                          }} />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input value={d.email} onChange={(e) => {
                            const v = e.target.value
                            setLlcPayload((p) => ({ ...p, directors: p.directors.map((x, i) => (i === idx ? { ...x, email: v } : x)) }))
                          }} />
                        </div>
                        <div className="space-y-2">
                          <Label>Occupation</Label>
                          <Input value={d.occupation} onChange={(e) => {
                            const v = e.target.value
                            setLlcPayload((p) => ({ ...p, directors: p.directors.map((x, i) => (i === idx ? { ...x, occupation: v } : x)) }))
                          }} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Residential address</Label>
                          <Input value={d.address} onChange={(e) => {
                            const v = e.target.value
                            setLlcPayload((p) => ({ ...p, directors: p.directors.map((x, i) => (i === idx ? { ...x, address: v } : x)) }))
                          }} />
                        </div>
                        <div className="space-y-2">
                          <Label>LGA</Label>
                          <Input value={d.lga} onChange={(e) => {
                            const v = e.target.value
                            setLlcPayload((p) => ({ ...p, directors: p.directors.map((x, i) => (i === idx ? { ...x, lga: v } : x)) }))
                          }} />
                        </div>
                        <div className="space-y-2">
                          <Label>Date of birth</Label>
                          <Input type="date" value={d.dateOfBirth} onChange={(e) => {
                            const v = e.target.value
                            setLlcPayload((p) => ({ ...p, directors: p.directors.map((x, i) => (i === idx ? { ...x, dateOfBirth: v } : x)) }))
                          }} />
                        </div>
                        <div className="space-y-2">
                          <Label>Shares (optional)</Label>
                          <Input value={(d as any).shares || ""} onChange={(e) => {
                            const v = e.target.value
                            setLlcPayload((p) => ({ ...p, directors: p.directors.map((x: any, i) => (i === idx ? { ...x, shares: v } : x)) }))
                          }} placeholder="e.g., 700" />
                        </div>
                      </div>

                      <div className="mt-4 rounded-lg border p-3 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold">Director documents</div>
                            <div className="text-xs text-muted-foreground">
                              Upload this director’s NIN slip and signature. Passport photo is optional.
                            </div>
                          </div>
                        </div>

                        {(Object.keys(llcDirectorUploads[idx] || emptyBucket()) as UploadFieldKey[]).map((key) => {
                          const required = key === "ninSlips" || key === "signatures"
                          const label =
                            key === "ninSlips"
                              ? "NIN slip"
                              : key === "signatures"
                                ? "Signature photo"
                                : "Passport photo (optional)"
                          const inputId = `cac-llc-director-${idx}-${key}`
                          const bucket = llcDirectorUploads[idx] || emptyBucket()

                          return (
                            <div key={key} className="space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-sm font-medium">
                                    {label} {required ? <span className="text-destructive">*</span> : null}
                                  </div>
                                  <div className="text-xs text-muted-foreground">PDF/JPG/PNG recommended</div>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                  onClick={() => {
                                    const input = document.getElementById(inputId) as HTMLInputElement | null
                                    input?.click()
                                  }}
                                >
                                  <FileUp className="w-4 h-4" />
                                  Add files
                                </Button>
                              </div>
                              <input
                                id={inputId}
                                className="hidden"
                                type="file"
                                multiple
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || [])
                                  setLlcDirectorUploads((p) => {
                                    const next = [...p]
                                    next[idx] = next[idx] || emptyBucket()
                                    next[idx] = { ...next[idx], [key]: [...(next[idx][key] || []), ...files] }
                                    return next
                                  })
                                  e.currentTarget.value = ""
                                }}
                              />
                              {bucket[key]?.length ? (
                                <div className="rounded-lg border p-3 space-y-2">
                                  {bucket[key].map((f, fIdx) => (
                                    <div key={`${f.name}-${fIdx}`} className="flex items-center justify-between gap-3">
                                      <div className="text-sm truncate">{f.name}</div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          setLlcDirectorUploads((p) => {
                                            const next = [...p]
                                            next[idx] = next[idx] || emptyBucket()
                                            next[idx] = { ...next[idx], [key]: next[idx][key].filter((_, i) => i !== fIdx) }
                                            return next
                                          })
                                        }
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground">No files added yet.</div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-muted/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold">Shareholders (optional)</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      (setLlcPayload((p) => ({
                        ...p,
                        shareholders: [...p.shareholders, { fullName: "", phone: "", email: "", occupation: "", address: "", lga: "", dateOfBirth: "", shares: "" }],
                      })),
                      setLlcShareholderUploads((p) => [...p, emptyBucket()]))
                    }
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add shareholder
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Shareholders are optional. If you add any shareholders, please include their shares and upload their documents below.
                </div>
                <div className="space-y-4">
                  {llcPayload.shareholders.map((s, idx) => (
                    <div key={idx} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-medium">Shareholder {idx + 1}</div>
                        {llcPayload.shareholders.length > 0 ? (
                          <Button type="button" variant="ghost" size="sm" onClick={() => {
                            setLlcPayload((p) => ({ ...p, shareholders: p.shareholders.filter((_, i) => i !== idx) }))
                            setLlcShareholderUploads((p) => p.filter((_, i) => i !== idx))
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        ) : null}
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Full name</Label>
                          <Input value={s.fullName} onChange={(e) => {
                            const v = e.target.value
                            setLlcPayload((p) => ({ ...p, shareholders: p.shareholders.map((x, i) => (i === idx ? { ...x, fullName: v } : x)) }))
                          }} />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <Input value={s.phone} onChange={(e) => {
                            const v = e.target.value
                            setLlcPayload((p) => ({ ...p, shareholders: p.shareholders.map((x, i) => (i === idx ? { ...x, phone: v } : x)) }))
                          }} />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input value={s.email} onChange={(e) => {
                            const v = e.target.value
                            setLlcPayload((p) => ({ ...p, shareholders: p.shareholders.map((x, i) => (i === idx ? { ...x, email: v } : x)) }))
                          }} />
                        </div>
                        <div className="space-y-2">
                          <Label>Occupation</Label>
                          <Input value={s.occupation} onChange={(e) => {
                            const v = e.target.value
                            setLlcPayload((p) => ({ ...p, shareholders: p.shareholders.map((x, i) => (i === idx ? { ...x, occupation: v } : x)) }))
                          }} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Residential address</Label>
                          <Input value={s.address} onChange={(e) => {
                            const v = e.target.value
                            setLlcPayload((p) => ({ ...p, shareholders: p.shareholders.map((x, i) => (i === idx ? { ...x, address: v } : x)) }))
                          }} />
                        </div>
                        <div className="space-y-2">
                          <Label>LGA</Label>
                          <Input value={s.lga} onChange={(e) => {
                            const v = e.target.value
                            setLlcPayload((p) => ({ ...p, shareholders: p.shareholders.map((x, i) => (i === idx ? { ...x, lga: v } : x)) }))
                          }} />
                        </div>
                        <div className="space-y-2">
                          <Label>Date of birth</Label>
                          <Input type="date" value={s.dateOfBirth} onChange={(e) => {
                            const v = e.target.value
                            setLlcPayload((p) => ({ ...p, shareholders: p.shareholders.map((x, i) => (i === idx ? { ...x, dateOfBirth: v } : x)) }))
                          }} />
                        </div>
                        <div className="space-y-2">
                          <Label>Shares allotted</Label>
                          <Input value={s.shares} onChange={(e) => {
                            const v = e.target.value
                            setLlcPayload((p) => ({ ...p, shareholders: p.shareholders.map((x, i) => (i === idx ? { ...x, shares: v } : x)) }))
                          }} placeholder="e.g., 700" />
                        </div>
                      </div>

                      <div className="mt-4 rounded-lg border p-3 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold">Shareholder documents</div>
                            <div className="text-xs text-muted-foreground">
                              Upload this shareholder’s NIN slip and signature. Passport photo is optional.
                            </div>
                          </div>
                        </div>

                        {(Object.keys(llcShareholderUploads[idx] || emptyBucket()) as UploadFieldKey[]).map((key) => {
                          const required = key === "ninSlips" || key === "signatures"
                          const label =
                            key === "ninSlips"
                              ? "NIN slip"
                              : key === "signatures"
                                ? "Signature photo"
                                : "Passport photo (optional)"
                          const inputId = `cac-llc-shareholder-${idx}-${key}`
                          const bucket = llcShareholderUploads[idx] || emptyBucket()

                          return (
                            <div key={key} className="space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <div className="text-sm font-medium">
                                    {label} {required ? <span className="text-destructive">*</span> : null}
                                  </div>
                                  <div className="text-xs text-muted-foreground">PDF/JPG/PNG recommended</div>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                  onClick={() => {
                                    const input = document.getElementById(inputId) as HTMLInputElement | null
                                    input?.click()
                                  }}
                                >
                                  <FileUp className="w-4 h-4" />
                                  Add files
                                </Button>
                              </div>
                              <input
                                id={inputId}
                                className="hidden"
                                type="file"
                                multiple
                                onChange={(e) => {
                                  const files = Array.from(e.target.files || [])
                                  setLlcShareholderUploads((p) => {
                                    const next = [...p]
                                    next[idx] = next[idx] || emptyBucket()
                                    next[idx] = { ...next[idx], [key]: [...(next[idx][key] || []), ...files] }
                                    return next
                                  })
                                  e.currentTarget.value = ""
                                }}
                              />
                              {bucket[key]?.length ? (
                                <div className="rounded-lg border p-3 space-y-2">
                                  {bucket[key].map((f, fIdx) => (
                                    <div key={`${f.name}-${fIdx}`} className="flex items-center justify-between gap-3">
                                      <div className="text-sm truncate">{f.name}</div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          setLlcShareholderUploads((p) => {
                                            const next = [...p]
                                            next[idx] = next[idx] || emptyBucket()
                                            next[idx] = { ...next[idx], [key]: next[idx][key].filter((_, i) => i !== fIdx) }
                                            return next
                                          })
                                        }
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground">No files added yet.</div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Shares allocation summary */}
                <div className="rounded-lg border p-4 bg-muted/20">
                  <div className="text-sm font-semibold mb-2">Shares allocation (summary)</div>
                  <div className="text-xs text-muted-foreground mb-3">
                    Shows shares entered for directors and shareholders (if any). Useful for quickly verifying distribution.
                  </div>

                  {(() => {
                    const toNum = (v: any) => {
                      const n = Number(String(v || "").trim())
                      return Number.isFinite(n) && n > 0 ? n : 0
                    }
                    const entries: Array<{ label: string; name: string; shares: number }> = []
                    llcPayload.directors.forEach((d: any, i: number) => {
                      const shares = toNum(d.shares)
                      if (shares) entries.push({ label: `Director ${i + 1}`, name: String(d.fullName || "").trim() || `Director ${i + 1}`, shares })
                    })
                    llcPayload.shareholders.forEach((s: any, i: number) => {
                      const shares = toNum(s.shares)
                      if (shares) entries.push({ label: `Shareholder ${i + 1}`, name: String(s.fullName || "").trim() || `Shareholder ${i + 1}`, shares })
                    })
                    const total = entries.reduce((sum, e) => sum + e.shares, 0)
                    if (!entries.length) {
                      return <div className="text-sm text-muted-foreground">No shares entered yet.</div>
                    }
                    return (
                      <div className="space-y-2">
                        <div className="text-sm">
                          Total shares: <span className="font-medium">{total.toLocaleString()}</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2">Party</th>
                                <th className="text-left py-2">Name</th>
                                <th className="text-right py-2">Shares</th>
                                <th className="text-right py-2">%</th>
                              </tr>
                            </thead>
                            <tbody>
                              {entries.map((e, i) => (
                                <tr key={`${e.label}-${i}`} className="border-b last:border-b-0">
                                  <td className="py-2">{e.label}</td>
                                  <td className="py-2">{e.name}</td>
                                  <td className="py-2 text-right">{e.shares.toLocaleString()}</td>
                                  <td className="py-2 text-right">{total ? `${Math.round((e.shares / total) * 1000) / 10}%` : "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          ) : null}

          {type === "INCORPORATED_TRUSTEES" ? (
            <div className="space-y-5">
              <div className="rounded-lg border p-4 bg-muted/10 space-y-3">
                <div className="text-base font-semibold">Organization details</div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Proposed name (1)</Label>
                  <Input value={trusteesPayload.proposedNames[0]} onChange={(e) => setTrusteesPayload((p) => ({ ...p, proposedNames: [e.target.value, p.proposedNames[1]] }))} />
                </div>
                <div className="space-y-2">
                  <Label>Proposed name (2)</Label>
                  <Input value={trusteesPayload.proposedNames[1]} onChange={(e) => setTrusteesPayload((p) => ({ ...p, proposedNames: [p.proposedNames[0], e.target.value] }))} />
                </div>
                <div className="space-y-2">
                  <Label>Registered address</Label>
                  <Input value={trusteesPayload.registeredAddress} onChange={(e) => setTrusteesPayload((p) => ({ ...p, registeredAddress: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Registered LGA</Label>
                  <Input value={trusteesPayload.registeredLga} onChange={(e) => setTrusteesPayload((p) => ({ ...p, registeredLga: e.target.value }))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Aims and objectives</Label>
                  <Textarea value={trusteesPayload.aimsObjectives} onChange={(e) => setTrusteesPayload((p) => ({ ...p, aimsObjectives: e.target.value }))} />
                </div>
              </div>
              </div>

              <div className="rounded-lg border p-4 bg-muted/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold">Trustees (minimum 2)</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setTrusteesPayload((p) => ({
                        ...p,
                        trustees: [...p.trustees, { fullName: "", dateOfBirth: "", phone: "", email: "", occupation: "", address: "", lga: "" }],
                      }))
                    }
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add trustee
                  </Button>
                </div>
                <div className="space-y-4">
                  {trusteesPayload.trustees.map((t, idx) => (
                    <div key={idx} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-medium">Trustee {idx + 1}</div>
                        {trusteesPayload.trustees.length > 2 ? (
                          <Button type="button" variant="ghost" size="sm" onClick={() => setTrusteesPayload((p) => ({ ...p, trustees: p.trustees.filter((_, i) => i !== idx) }))}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        ) : null}
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Full name</Label>
                          <Input value={t.fullName} onChange={(e) => {
                            const v = e.target.value
                            setTrusteesPayload((p) => ({ ...p, trustees: p.trustees.map((x, i) => (i === idx ? { ...x, fullName: v } : x)) }))
                          }} />
                        </div>
                        <div className="space-y-2">
                          <Label>Date of birth</Label>
                          <Input type="date" value={t.dateOfBirth} onChange={(e) => {
                            const v = e.target.value
                            setTrusteesPayload((p) => ({ ...p, trustees: p.trustees.map((x, i) => (i === idx ? { ...x, dateOfBirth: v } : x)) }))
                          }} />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <Input value={t.phone} onChange={(e) => {
                            const v = e.target.value
                            setTrusteesPayload((p) => ({ ...p, trustees: p.trustees.map((x, i) => (i === idx ? { ...x, phone: v } : x)) }))
                          }} />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input value={t.email} onChange={(e) => {
                            const v = e.target.value
                            setTrusteesPayload((p) => ({ ...p, trustees: p.trustees.map((x, i) => (i === idx ? { ...x, email: v } : x)) }))
                          }} />
                        </div>
                        <div className="space-y-2">
                          <Label>Occupation</Label>
                          <Input value={t.occupation} onChange={(e) => {
                            const v = e.target.value
                            setTrusteesPayload((p) => ({ ...p, trustees: p.trustees.map((x, i) => (i === idx ? { ...x, occupation: v } : x)) }))
                          }} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Residential address</Label>
                          <Input value={t.address} onChange={(e) => {
                            const v = e.target.value
                            setTrusteesPayload((p) => ({ ...p, trustees: p.trustees.map((x, i) => (i === idx ? { ...x, address: v } : x)) }))
                          }} />
                        </div>
                        <div className="space-y-2">
                          <Label>LGA</Label>
                          <Input value={t.lga} onChange={(e) => {
                            const v = e.target.value
                            setTrusteesPayload((p) => ({ ...p, trustees: p.trustees.map((x, i) => (i === idx ? { ...x, lga: v } : x)) }))
                          }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-muted/10 space-y-3">
                <div className="text-base font-semibold">Executive members</div>
                <div className="grid md:grid-cols-2 gap-4">
                  {trusteesPayload.executiveMembers.map((m, idx) => (
                    <div key={idx} className="space-y-2">
                      <Label>{m.role}</Label>
                      <Input value={m.fullName} onChange={(e) => {
                        const v = e.target.value
                        setTrusteesPayload((p) => ({ ...p, executiveMembers: p.executiveMembers.map((x, i) => (i === idx ? { ...x, fullName: v } : x)) }))
                      }} placeholder="Full name" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {type !== "LLC" ? (
        <Card>
          <CardHeader>
            <CardTitle>Documents upload</CardTitle>
            <CardDescription>Upload clear photos/scans. You can attach multiple files per field.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {(Object.keys(expectedDocs) as UploadFieldKey[]).map((key) => {
              const cfg = expectedDocs[key]
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">
                        {cfg.label} {cfg.required ? <span className="text-destructive">*</span> : null}
                      </div>
                      <div className="text-xs text-muted-foreground">PDF/JPG/PNG recommended</div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        const input = document.getElementById(`cac-upload-${key}`) as HTMLInputElement | null
                        input?.click()
                      }}
                    >
                      <FileUp className="w-4 h-4" />
                      Add files
                    </Button>
                  </div>
                  <input
                    id={`cac-upload-${key}`}
                    className="hidden"
                    type="file"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      setUploads((p) => ({ ...p, [key]: [...(p[key] || []), ...files] }))
                      e.currentTarget.value = ""
                    }}
                  />
                  {uploads[key]?.length ? (
                    <div className="rounded-lg border p-3 space-y-2">
                      {uploads[key].map((f, idx) => (
                        <div key={`${f.name}-${idx}`} className="flex items-center justify-between gap-3">
                          <div className="text-sm truncate">{f.name}</div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setUploads((p) => ({ ...p, [key]: p[key].filter((_, i) => i !== idx) }))}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">No files added yet.</div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
          <CardDescription>You’ll see a Paystack popup to complete payment securely.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Amount</div>
            <div className="text-2xl font-semibold">{formatNaira(amountNaira)}</div>
          </div>
          <Button onClick={handleSubmitAndPay} disabled={isSubmitting} className="min-w-[220px]">
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…
              </>
            ) : (
              "Submit & Pay"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}


