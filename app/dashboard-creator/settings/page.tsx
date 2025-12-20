"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { SettingsSkeleton } from "@/components/ui/skeletons"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function CreatorSettingsPage() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <main className="px-4 py-6">
        <SettingsSkeleton />
      </main>
    )
  }

  return (
    <main className="px-4 py-6 space-y-6">
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Profile</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="creator-name">Creator / Brand Name</Label>
            <Input id="creator-name" defaultValue="Jane Creator Studios" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="creator-email">Email</Label>
            <Input id="creator-email" type="email" defaultValue="jane@creatorhub.ng" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="primary-platform">Primary Platform</Label>
            <Select defaultValue="youtube">
              <SelectTrigger id="primary-platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">YouTube</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="podcast">Podcast</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tin">Tax Identification Number</Label>
            <Input id="tin" defaultValue="12345678-0001" />
          </div>
        </div>
        <Button className="mt-5">Save Changes</Button>
      </Card>

      <Card className="p-6 space-y-5">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Platform Connections</h2>
          <p className="text-sm text-muted-foreground">
            Connect your creator platforms to sync payouts and sponsorship income automatically.
          </p>
        </div>
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-dashed border-border rounded-lg p-4">
            <div>
              <p className="font-medium">YouTube Studio</p>
              <p className="text-sm text-muted-foreground">Sync AdSense payouts and channel metrics</p>
            </div>
            <Button variant="outline" size="sm">Connect</Button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-dashed border-border rounded-lg p-4">
            <div>
              <p className="font-medium">Instagram</p>
              <p className="text-sm text-muted-foreground">Track branded content deals and payouts</p>
            </div>
            <Button variant="outline" size="sm" disabled>Coming Soon</Button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-dashed border-border rounded-lg p-4">
            <div>
              <p className="font-medium">TikTok</p>
              <p className="text-sm text-muted-foreground">Import creator fund and sponsorship earnings</p>
            </div>
            <Button variant="outline" size="sm" disabled>Coming Soon</Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Brand Deal Reminders</Label>
              <p className="text-sm text-muted-foreground">Stay on top of contract deliverables and payment milestones</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Quarterly Tax Alerts</Label>
              <p className="text-sm text-muted-foreground">Receive reminders for quarterly estimated taxes</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Platform Payout Summaries</Label>
              <p className="text-sm text-muted-foreground">Weekly summary of payouts across your connected platforms</p>
            </div>
            <Switch />
          </div>
        </div>
      </Card>
    </main>
  )
}

