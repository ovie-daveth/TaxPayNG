"use client"

import { useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useBusiness } from "@/lib/contexts/business-context"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { toast } from "sonner"
import { Building2, Plus, CheckCircle2, Trash2, Edit } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function BusinessesPage() {
  const { profile } = useUserProfile()
  const { entities, activeEntityId, setActiveEntityId, createEntity, updateEntity, deleteEntity, loading } = useBusiness()

  const canUseEntities = profile?.subscriptionType === "PLATINUM" || profile?.subscriptionType === "Small Business" || profile?.subscriptionType === "Big Business"
  const isPlatinum = profile?.subscriptionType === "PLATINUM"
  const isSmallBusiness = profile?.subscriptionType === "Small Business"
  const isBigBusiness = profile?.subscriptionType === "Big Business"

  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingEntity, setEditingEntity] = useState<{ id: string; name: string; description?: string; businessType?: 'service' | 'sales' | 'both' } | null>(null)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [businessType, setBusinessType] = useState<'service' | 'sales' | 'both'>('both')

  const canCreateMore = useMemo(() => {
    // PLATINUM users can create unlimited entities
    if (isPlatinum) return true
    // Small Business and Big Business users can create multiple entities (up to reasonable limit)
    // For now, allow them to create entities (you can add a limit if needed)
    if (isSmallBusiness || isBigBusiness) return true
    // Non-entity plans: allow only the default entity (created automatically)
    return entities.length < 1
  }, [isPlatinum, isSmallBusiness, isBigBusiness, entities.length])

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Business name is required")
      return
    }
    const created = await createEntity({ 
      name: name.trim(), 
      description: description.trim() || undefined, 
      currency: "NGN",
      businessType: businessType
    })
    if (created) {
      toast.success("Business created")
      setOpen(false)
      setName("")
      setDescription("")
      setBusinessType('both')
      await setActiveEntityId(created.id)
    }
  }

  const handleEdit = (entity: { id: string; name: string; description?: string; businessType?: 'service' | 'sales' | 'both' }) => {
    setEditingEntity(entity)
    setName(entity.name)
    setDescription(entity.description || "")
    setBusinessType(entity.businessType || 'both')
    setEditOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingEntity || !name.trim()) {
      toast.error("Business name is required")
      return
    }
    const updated = await updateEntity(editingEntity.id, { 
      name: name.trim(), 
      description: description.trim() || undefined,
      businessType: businessType
    })
    if (updated) {
      toast.success("Business updated")
      setEditOpen(false)
      setEditingEntity(null)
      setName("")
      setDescription("")
      setBusinessType('both')
    }
  }

  return (
    <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-5 lg:py-6 overflow-x-hidden max-w-full">
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Businesses</h2>
              {isPlatinum ? (
                <Badge variant="secondary" className="text-[10px]">PLATINUM</Badge>
              ) : isSmallBusiness ? (
                <Badge variant="secondary" className="text-[10px]">SMALL BUSINESS</Badge>
              ) : isBigBusiness ? (
                <Badge variant="secondary" className="text-[10px]">BIG BUSINESS</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">Single business</Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Create multiple businesses and switch between them. Transactions and invoices are scoped to the active business.
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="h-9 w-full sm:w-auto"
                disabled={!canCreateMore || loading}
                onClick={() => {
                  if (!canUseEntities) {
                    toast.error("Multi-business is available on PLATINUM, Small Business, or Big Business plans.")
                    return
                  }
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Business
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Business</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Business Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="text-xs sm:text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Description (optional)</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} className="text-xs sm:text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Business Type</Label>
                  <Select value={businessType} onValueChange={(value: 'service' | 'sales' | 'both') => setBusinessType(value)}>
                    <SelectTrigger className="text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="service">Service-Based (Consulting, Professional Services)</SelectItem>
                      <SelectItem value="sales">Sales-Based (Selling Products/Items)</SelectItem>
                      <SelectItem value="both">Both (Services & Sales)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">This helps customize transaction categories and invoice structure</p>
                </div>
                <Button onClick={handleCreate} disabled={loading} className="w-full">
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={editOpen} onOpenChange={(open) => {
            setEditOpen(open)
            if (!open) {
              setEditingEntity(null)
              setName("")
              setDescription("")
            }
          }}>
            <DialogContent className="max-w-[95vw] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Business</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Business Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className="text-xs sm:text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Description (optional)</Label>
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} className="text-xs sm:text-sm" />
                </div>
                <Button onClick={handleUpdate} disabled={loading} className="w-full">
                  Update
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
        {entities.map((entity) => {
          const isActive = entity.id === activeEntityId
          return (
            <Card key={entity.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-sm truncate">{entity.name}</p>
                    {isActive && (
                      <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Active
                      </Badge>
                    )}
                  </div>
                  {entity.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{entity.description}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <Button
                  variant={isActive ? "secondary" : "outline"}
                  size="sm"
                  className="h-8 flex-1"
                  onClick={() => setActiveEntityId(entity.id)}
                  disabled={loading || isActive}
                >
                  {isActive ? "Active" : "Switch"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => handleEdit(entity)}
                  disabled={loading}
                  title="Edit Business"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-destructive hover:text-destructive"
                  onClick={async () => {
                    const ok = await deleteEntity(entity.id)
                    if (ok) toast.success("Business deleted")
                  }}
                  disabled={loading || isActive}
                  title="Delete Business"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

