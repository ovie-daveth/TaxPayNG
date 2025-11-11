"use client"

import { StatsCards as DashboardStatsCards } from "@/components/dashboard/stats-cards"

interface StatsCardsProps {
  businessType: "freelancer" | "creator" | "small-business"
  sidebarCollapsed?: boolean
}

export function StatsCards(props: StatsCardsProps) {
  return <DashboardStatsCards {...props} />
}

