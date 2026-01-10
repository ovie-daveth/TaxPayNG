"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useBusiness } from "@/lib/contexts/business-context"
import { cn } from "@/lib/utils"

export function BusinessSwitcher({
  className,
  triggerClassName,
  showManageLink = true,
}: {
  className?: string
  triggerClassName?: string
  showManageLink?: boolean
}) {
  const pathname = usePathname()
  const { entities, activeEntityId, setActiveEntityId, loading } = useBusiness()

  const basePath = pathname?.startsWith("/dashboard-creator")
    ? "/dashboard-creator"
    : pathname?.startsWith("/dashboard-sme")
      ? "/dashboard-sme"
      : "/dashboard"

  if (!entities.length) return null

  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      <Select
        value={activeEntityId ?? undefined}
        onValueChange={(value) => {
          // fire and forget – UI will update once profile refetch completes
          void setActiveEntityId(value)
        }}
        disabled={loading}
      >
        <SelectTrigger className={cn("h-9 w-[210px] text-xs sm:text-sm flex-1 min-w-0", triggerClassName)}>
          <SelectValue placeholder="Select business" />
        </SelectTrigger>
        <SelectContent>
          {entities.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              <span className="flex items-center gap-2">
                <span className="truncate">{e.name}</span>
                {e.id === activeEntityId && <Badge variant="secondary" className="text-[10px]">Active</Badge>}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showManageLink && (
        <Link
          href={`${basePath}/businesses`}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
        >
          Manage
        </Link>
      )}
    </div>
  )
}


