"use client"

/**
 * VAT Qualification Section for Settings
 * 
 * Allows freelancers and creators to provide:
 * - Annual turnover (₦100M threshold to charge VAT per Nigeria VAT Act)
 * - VAT registration status
 * - VAT registration number
 * 
 * Automatically determines and displays VAT eligibility status.
 * Only users with ₦100M+ turnover AND VAT registration can legally charge VAT.
 */

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Info, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"
import { UserProfile } from "@/lib/types"
import { getVATEligibility, formatVATThreshold } from "@/lib/utils/vatEligibility"
import { userService } from "@/lib/services"
import { toast } from "sonner"

interface VATQualificationSectionProps {
  profile: UserProfile | null | undefined
  onProfileUpdate?: () => void
  /** Show only for these business types - defaults to freelancer and creator */
  businessTypes?: ('freelancer' | 'creator' | 'sme')[]
}

export function VATQualificationSection({ 
  profile, 
  onProfileUpdate,
  businessTypes = ['freelancer', 'creator'] 
}: VATQualificationSectionProps) {
  const [annualTurnover, setAnnualTurnover] = useState<string>("")
  const [vatRegistered, setVATRegistered] = useState(false)
  const [vatRegistrationNumber, setVATRegistrationNumber] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Don't show for business types that don't need this section
  if (!profile || !businessTypes.includes(profile.businessType as 'freelancer' | 'creator' | 'sme')) {
    return null
  }

  // Initialize from profile
  useEffect(() => {
    if (profile) {
      // Format annual turnover with commas for display (match user input format)
      setAnnualTurnover(profile.annualTurnover != null 
        ? profile.annualTurnover.toLocaleString('en-US') 
        : "")
      setVATRegistered(profile.vatRegistered ?? false)
      setVATRegistrationNumber(profile.vatRegistrationNumber ?? "")
    }
  }, [profile?.id, profile?.annualTurnover, profile?.vatRegistered, profile?.vatRegistrationNumber])

  const eligibility = getVATEligibility(profile)

  const handleSave = async () => {
    if (!profile?.userId) {
      toast.error("User not authenticated")
      return
    }

    // Parse annual turnover
    const turnoverValue = annualTurnover.trim() === "" ? undefined : parseFloat(annualTurnover.replace(/,/g, ""))
    if (annualTurnover.trim() !== "" && (isNaN(turnoverValue as number) || (turnoverValue as number) < 0)) {
      toast.error("Please enter a valid annual turnover amount")
      return
    }

    // If claiming VAT registered, suggest providing registration number
    if (vatRegistered && !vatRegistrationNumber.trim()) {
      // Allow saving but could show a warning - for now we allow it
      // as user might not have it handy
    }

    setIsSaving(true)
    try {
      const result = await userService.upsertProfile(profile.userId, {
        annualTurnover: turnoverValue,
        vatRegistered: vatRegistered,
        vatRegistrationNumber: vatRegistered ? (vatRegistrationNumber.trim() || undefined) : undefined
      } as Partial<UserProfile>)

      if (result.success) {
        toast.success("VAT settings updated successfully")
        onProfileUpdate?.()
      } else {
        toast.error(result.error || "Failed to update VAT settings")
      }
    } catch (error) {
      console.error("Error updating VAT settings:", error)
      toast.error("Failed to update VAT settings")
    } finally {
      setIsSaving(false)
    }
  }

  // Compare values for change detection (normalize annual turnover for comparison)
  const currentTurnoverNum = annualTurnover.trim() === "" ? null : parseFloat(annualTurnover.replace(/,/g, ""))
  const hasChanges = 
    (profile?.annualTurnover ?? null) !== (isNaN(currentTurnoverNum as number) ? null : currentTurnoverNum) ||
    (profile?.vatRegistered ?? false) !== vatRegistered ||
    (profile?.vatRegistrationNumber ?? "") !== vatRegistrationNumber

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          VAT &amp; Turnover
          {eligibility.canChargeVAT ? (
            <Badge variant="default" className="bg-green-600 text-xs">Can Charge VAT</Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">VAT-Exempt</Badge>
          )}
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Under Nigeria&apos;s VAT Act, only businesses with ₦100M+ annual turnover that are VAT-registered can charge VAT on invoices. 
          {profile?.businessType === 'creator' && " As a creator, you can qualify if you meet these requirements."}
          {profile?.businessType === 'freelancer' && " As a freelancer, you can qualify if you meet these requirements."}
          {profile?.businessType === 'sme' && " As an SME, you can qualify if you meet these requirements."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Annual Turnover */}
        <div className="space-y-2">
          <Label htmlFor="annual-turnover" className="text-xs sm:text-sm">
            Annual Turnover (₦)
          </Label>
          <Input
            id="annual-turnover"
            type="text"
            inputMode="numeric"
            placeholder="e.g., 60000000 or 60,000,000"
            value={annualTurnover}
            onChange={(e) => {
              const value = e.target.value.replace(/,/g, "")
              // Allow numbers only (including empty for clearing)
              if (value === "" || /^\d+$/.test(value)) {
                setAnnualTurnover(value === "" ? "" : parseInt(value, 10).toLocaleString('en-US'))
              }
            }}
            className="h-9 sm:h-10 text-xs sm:text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Your total revenue/supplies in the past 12 months. Threshold: {formatVATThreshold()} to charge VAT.
          </p>
        </div>

        {/* VAT Registered Toggle */}
        <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
          <div className="flex-1 space-y-0.5">
            <Label htmlFor="vat-registered" className="text-xs sm:text-sm font-medium">
              Registered for VAT with FIRS
            </Label>
            <p className="text-xs text-muted-foreground">
              Have you registered for VAT with the Federal Inland Revenue Service?
            </p>
          </div>
          <Switch
            id="vat-registered"
            checked={vatRegistered}
            onCheckedChange={setVATRegistered}
          />
        </div>

        {/* VAT Registration Number - shown when VAT registered */}
        {vatRegistered && (
          <div className="space-y-2">
            <Label htmlFor="vat-reg-number" className="text-xs sm:text-sm">
              VAT Registration Number
            </Label>
            <Input
              id="vat-reg-number"
              type="text"
              placeholder="Your FIRS VAT registration number"
              value={vatRegistrationNumber}
              onChange={(e) => setVATRegistrationNumber(e.target.value)}
              className="h-9 sm:h-10 text-xs sm:text-sm"
            />
          </div>
        )}

        {/* Eligibility Status */}
        <Alert className={
          eligibility.canChargeVAT 
            ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
            : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
        }>
          {eligibility.canChargeVAT ? (
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          )}
          <AlertDescription className={`text-xs sm:text-sm ${
            eligibility.canChargeVAT 
              ? "text-green-900 dark:text-green-100" 
              : "text-amber-900 dark:text-amber-100"
          }`}>
            <strong>Status:</strong> {eligibility.reason}
          </AlertDescription>
        </Alert>

        {/* Important Notice */}
        <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-xs sm:text-sm text-blue-900 dark:text-blue-100">
            <strong>Important:</strong> VAT is collected on behalf of government, not earned as income. 
            If you charge VAT, you must remit it to FIRS. Charging VAT when you&apos;re exempt (below {formatVATThreshold()} or not registered) is illegal.
          </AlertDescription>
        </Alert>

        {/* Save Button */}
        {hasChanges && (
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full sm:w-auto"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save VAT Settings
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

