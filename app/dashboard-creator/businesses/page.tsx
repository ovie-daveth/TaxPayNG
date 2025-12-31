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
import { Building2, Plus, CheckCircle2, Trash2 } from "lucide-react"

export default function BusinessesPage() {
  const { profile } = useUserProfile()
  const { entities, activeEntityId, setActiveEntityId, createEntity, deleteEntity, loading } = useBusiness()

  const isPlatinum = profile?.subscriptionType === "PLATINUM"

  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const canCreateMore = useMemo(() => {
    if (isPlatinum) return true
    // Non-platinum: allow only the default entity (created automatically)
    return entities.length < 1
  }, [isPlatinum, entities.length])

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Business name is required")
      return
    }
    const created = await createEntity({ name: name.trim(), description: description.trim() || undefined, currency: "NGN" })
    if (created) {
      toast.success("Business created")
      setOpen(false)
      setName("")
      setDescription("")
      await setActiveEntityId(created.id)
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
              ) : (
                <Badge variant="outline" className="text-[10px]">Single business</Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Create multiple businesses and switch between them. Transactions, invoices, and brand deals are scoped to the active business.
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="h-9 w-full sm:w-auto"
                disabled={!canCreateMore || loading}
                onClick={() => {
                  if (!isPlatinum) {
                    toast.error("Multi-business is available on PLATINUM.")
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
                <Button onClick={handleCreate} disabled={loading} className="w-full">
                  Create
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
                  className="h-8 text-destructive hover:text-destructive"
                  onClick={async () => {
                    const ok = await deleteEntity(entity.id)
                    if (ok) toast.success("Business deleted")
                  }}
                  disabled={loading || isActive}
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


