"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import type { BusinessEntity, UserProfile } from "@/lib/types"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { businessEntityService, userService, invoiceService, transactionService, brandDealService } from "@/lib/services"

type BusinessContextType = {
  entities: BusinessEntity[]
  activeEntity: BusinessEntity | null
  activeEntityId: string | null
  loading: boolean
  error: string | null
  setActiveEntityId: (entityId: string) => Promise<void>
  createEntity: (data: Pick<BusinessEntity, "name" | "description" | "currency" | "businessType">) => Promise<BusinessEntity | null>
  updateEntity: (entityId: string, updates: Partial<Pick<BusinessEntity, "name" | "description" | "currency" | "businessType">>) => Promise<BusinessEntity | null>
  deleteEntity: (entityId: string) => Promise<boolean>
  refetchEntities: () => Promise<void>
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined)

const ENTITY_MIGRATION_VERSION = 1

async function runConcurrency<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>) {
  let idx = 0
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (idx < items.length) {
      const current = items[idx++]
      await fn(current)
    }
  })
  await Promise.all(workers)
}

async function migrateLegacyRecordsToEntity(userId: string, entityId: string): Promise<void> {
  // Transactions
  const transactions = await transactionService.getAll([{ field: "userId", operator: "==", value: userId }])
  const legacyTransactions = transactions.filter((t: any) => !t.entityId)
  await runConcurrency(legacyTransactions, 10, async (t: any) => {
    await transactionService.update(t.id, { entityId, updatedAt: new Date().toISOString() })
  })

  // Brand deals
  const deals = await brandDealService.getAll([{ field: "userId", operator: "==", value: userId }])
  const legacyDeals = deals.filter((d: any) => !d.entityId)
  await runConcurrency(legacyDeals, 10, async (d: any) => {
    await brandDealService.update(d.id, { entityId, updatedAt: new Date().toISOString() })
  })

  // Invoices: migrate both sent and received invoices belonging to this user
  const [sentInvoices, receivedInvoices] = await Promise.all([
    invoiceService.getAll([{ field: "userId", operator: "==", value: userId }]),
    invoiceService.getAll([{ field: "recipientUserId", operator: "==", value: userId }]),
  ])
  const allInvoices = [...sentInvoices, ...receivedInvoices]
  const legacyInvoices = allInvoices.filter((inv: any) => !inv.entityId)
  await runConcurrency(legacyInvoices, 10, async (inv: any) => {
    await invoiceService.update(inv.id, { entityId, updatedAt: new Date().toISOString() })
  })
}

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { profile, loading: profileLoading, refetchProfile } = useUserProfile()

  const [entities, setEntities] = useState<BusinessEntity[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canUseMultiEntity = (p: UserProfile | null) => {
    const type = p?.subscriptionType
    // Business entities are available for PLATINUM, Small Business, and Big Business
    return type === "PLATINUM" || type === "Small Business" || type === "Big Business"
  }

  // Entity scoping should ONLY be enabled for:
  // - SME users (always)
  // - PLATINUM / Small Business / Big Business subscriptions
  // If a user downgrades (e.g. to PRO/GOLD), we hide entities but preserve them in the profile
  // so that if they re-upgrade we can restore the same entities.
  const isEntityEnabled = Boolean(profile?.businessType === "sme" || canUseMultiEntity(profile ?? null))

  const activeEntityId = isEntityEnabled ? (profile?.activeEntityId ?? null) : null
  const activeEntity = useMemo(
    () => (activeEntityId ? entities.find((e) => e.id === activeEntityId) ?? null : null),
    [entities, activeEntityId]
  )

  const refetchEntities = useCallback(async () => {
    if (!user?.uid) return
    setLoading(true)
    setError(null)
    try {
      const res = await businessEntityService.getUserBusinessEntities(user.uid, 1, 100)
      setEntities(res.data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load businesses")
    } finally {
      setLoading(false)
    }
  }, [user?.uid])

  const ensureDefaultEntity = useCallback(async () => {
    if (!user?.uid || !profile) return
    // If user is not eligible, do not show entities (even if they exist).
    // This provides the "single place" experience on downgrade, while preserving entity data.
    const canUseEntities = profile.businessType === "sme" || canUseMultiEntity(profile)
    if (!canUseEntities) {
      setEntities([])
      return
    }

    // Load entities first
    const res = await businessEntityService.getUserBusinessEntities(user.uid, 1, 100)
    const list = res.data || []
    setEntities(list)

    // Normalize legacy default name for creators (one-time, only if it's still the autogenerated name)
    if (profile.businessType === "creator" && list.length > 0) {
      const targetId =
        profile.defaultEntityId ||
        list.find((e) => (e as any).isDefault)?.id ||
        list[0]?.id

      const target = targetId ? list.find((e) => e.id === targetId) : null
      if (target?.name?.trim()?.toLowerCase() === "creator business") {
        try {
          const updated = await businessEntityService.updateBusinessEntity(target.id, user.uid, {
            name: "Default Business",
          })
          if (updated.success && updated.data) {
            const nextList = list.map((e) => (e.id === updated.data!.id ? updated.data! : e))
            setEntities(nextList)
          }
        } catch (e) {
          // Best-effort; don't block dashboard
          console.warn("Failed to normalize creator default business name:", e)
        }
      }
    }

    // Create default entity if none exist
    if (list.length === 0) {
      // Determine default entity name based on business type
      let defaultName = "Main Business"
      if (profile.businessType === "creator") {
        defaultName = "Default Business"
      } else if (profile.businessType === "sme") {
        defaultName = "Small Business"
      } else if (profile.businessType === "freelancer") {
        defaultName = "Freelance Business"
      }
      
      const created = await businessEntityService.createBusinessEntity(user.uid, {
        name: defaultName,
        description: "Default business",
        currency: profile.preferences?.currency || "NGN",
        businessType: 'both', // Default to both for new businesses
        isDefault: true,
      })
      if (created.success && created.data) {
        const entity = created.data
        setEntities([entity])
        // First set default/active entity, but do NOT mark migration complete yet.
        // Existing users may already have transactions/invoices/deals that need entityId assigned.
        await userService.upsertProfile(user.uid, {
          activeEntityId: entity.id,
          defaultEntityId: entity.id,
          entityMigrationVersion: profile.entityMigrationVersion ?? 0,
        })
        await refetchProfile()

        // One-time migration: assign legacy records to this default entity
        try {
          await migrateLegacyRecordsToEntity(user.uid, entity.id)
          await userService.upsertProfile(user.uid, {
            defaultEntityId: entity.id,
            entityMigrationVersion: ENTITY_MIGRATION_VERSION,
          })
          await refetchProfile()
        } catch (e) {
          console.error("Entity migration failed:", e)
        }
      }
      return
    }

    // If profile has no active entity, set it to the first entity
    if (!profile.activeEntityId) {
      const fallback = list.find((e) => (e as any).isDefault) || list[0]
      await userService.upsertProfile(user.uid, {
        activeEntityId: fallback.id,
        defaultEntityId: profile.defaultEntityId || fallback.id,
        entityMigrationVersion: profile.entityMigrationVersion ?? 0,
      })
      await refetchProfile()
    }

    // One-time migration: assign legacy records to default entity
    const defaultEntityId = profile.defaultEntityId || list.find((e) => (e as any).isDefault)?.id || list[0].id
    const needsMigration = (profile.entityMigrationVersion ?? 0) < ENTITY_MIGRATION_VERSION
    if (needsMigration && defaultEntityId) {
      try {
        await migrateLegacyRecordsToEntity(user.uid, defaultEntityId)
        await userService.upsertProfile(user.uid, { defaultEntityId, entityMigrationVersion: ENTITY_MIGRATION_VERSION })
        await refetchProfile()
      } catch (e) {
        console.error("Entity migration failed:", e)
      }
    }
  }, [user?.uid, profile, refetchProfile])

  useEffect(() => {
    if (!user?.uid) return
    if (profileLoading) return
    if (!profile) return
    // Ensure default entity when user has PLATINUM, Small Business, or Big Business subscription (or if they already have entity context).
    ensureDefaultEntity()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, profileLoading, profile?.id, profile?.subscriptionType, profile?.activeEntityId, profile?.defaultEntityId])

  const setActiveEntityId = useCallback(
    async (entityId: string) => {
      if (!user?.uid || !profile) return
      const entity = entities.find((e) => e.id === entityId)
      if (!entity) return

      setLoading(true)
      setError(null)
      try {
        await userService.upsertProfile(user.uid, { activeEntityId: entityId })
        await refetchProfile()
        window.dispatchEvent(new CustomEvent("businessChanged", { detail: { entityId } }))
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to switch business")
      } finally {
        setLoading(false)
      }
    },
    [user?.uid, profile, entities, refetchProfile]
  )

  const createEntity = useCallback(
    async (data: Pick<BusinessEntity, "name" | "description" | "currency" | "businessType">) => {
      if (!user?.uid || !profile) return null
      const canCreateEntities = profile.businessType === "sme" || canUseMultiEntity(profile)
      if (!canCreateEntities) {
        setError("Multi-business is available on PLATINUM, Small Business, or Big Business plans.")
        return null
      }

      setLoading(true)
      setError(null)
      try {
        const res = await businessEntityService.createBusinessEntity(user.uid, {
          name: data.name,
          description: data.description,
          currency: data.currency || profile.preferences?.currency || "NGN",
          businessType: data.businessType,
        })
        if (res.success && res.data) {
          setEntities((prev) => [res.data!, ...prev])
          return res.data
        }
        setError(res.error || "Failed to create business")
        return null
      } finally {
        setLoading(false)
      }
    },
    [user?.uid, profile]
  )

  const updateEntity = useCallback(
    async (entityId: string, updates: Partial<Pick<BusinessEntity, "name" | "description" | "currency" | "businessType">>) => {
      if (!user?.uid) return null
      setLoading(true)
      setError(null)
      try {
        const res = await businessEntityService.updateBusinessEntity(entityId, user.uid, updates)
        if (res.success && res.data) {
          setEntities((prev) => prev.map((e) => (e.id === entityId ? res.data! : e)))
          return res.data
        }
        setError(res.error || "Failed to update business")
        return null
      } finally {
        setLoading(false)
      }
    },
    [user?.uid]
  )

  const deleteEntity = useCallback(
    async (entityId: string) => {
      if (!user?.uid || !profile) return false
      if (profile.activeEntityId === entityId) {
        setError("Switch to another business before deleting this one.")
        return false
      }
      setLoading(true)
      setError(null)
      try {
        const res = await businessEntityService.deleteBusinessEntity(entityId, user.uid)
        if (res.success) {
          setEntities((prev) => prev.filter((e) => e.id !== entityId))
          return true
        }
        setError(res.error || "Failed to delete business")
        return false
      } finally {
        setLoading(false)
      }
    },
    [user?.uid, profile?.activeEntityId]
  )

  const value = useMemo<BusinessContextType>(
    () => ({
      entities,
      activeEntity,
      activeEntityId,
      loading,
      error,
      setActiveEntityId,
      createEntity,
      updateEntity,
      deleteEntity,
      refetchEntities,
    }),
    [entities, activeEntity, activeEntityId, loading, error, setActiveEntityId, createEntity, updateEntity, deleteEntity, refetchEntities]
  )

  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>
}

export function useBusiness() {
  const ctx = useContext(BusinessContext)
  if (!ctx) throw new Error("useBusiness must be used within BusinessProvider")
  return ctx
}


