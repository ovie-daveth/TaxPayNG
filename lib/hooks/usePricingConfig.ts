"use client"

import { useCallback, useEffect, useState } from "react"

export interface PricingConfigPlanOverride {
  monthlyPrice: number // in kobo
}

export interface PricingConfig {
  freeTrialDays: number
  yearlyDiscountPercent: number
  plans: Record<string, PricingConfigPlanOverride>
  updatedAt?: string
  updatedBy?: string
}

export function usePricingConfig() {
  const [pricingConfig, setPricingConfig] = useState<PricingConfig | null>(null)
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/pricing-config", { cache: "no-store" })
      const data = await res.json()
      if (data?.success) {
        setPricingConfig(data.data)
      }
    } catch {
      // ignore; fall back to defaults in callers
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { pricingConfig, loading, refetch }
}


