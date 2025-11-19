"use client"

import { useState, useEffect } from "react"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { SettingsSkeleton } from "@/components/ui/skeletons"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { userService } from "@/lib/services"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

export default function SettingsPage() {
  const { user } = useAuth()
  const { profile, loading: profileLoading, refetchProfile } = useUserProfile()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [subscriptionData, setSubscriptionData] = useState({
    isSubscribe: false,
    subscriptionType: null as string | null,
  })

  useEffect(() => {
    if (!profileLoading && profile) {
      setSubscriptionData({
        isSubscribe: profile.isSubscribe ?? false,
        subscriptionType: profile.subscriptionType || null,
      })
      setIsLoading(false)
    } else if (!profileLoading) {
      setIsLoading(false)
    }
  }, [profile, profileLoading])
  if (isLoading) {
    return (
          <main className="container mx-auto px-4 py-6 max-w-4xl">
            <SettingsSkeleton />
          </main>
    )
  }

  return (
    <div className="">
        <main className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="space-y-6">
            {/* Profile Settings */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full-name">Full Name</Label>
                    <Input id="full-name" defaultValue="John Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue="john@example.com" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" defaultValue="+234 800 000 0000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tin">Tax Identification Number</Label>
                    <Input id="tin" defaultValue="12345678-0001" />
                  </div>
                </div>
                <Button>Save Changes</Button>
              </div>
            </Card>

            {/* Business Settings */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Business Information</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="business-name">Business Name</Label>
                  <Input id="business-name" defaultValue="JD Consulting Services" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business-type">Business Type</Label>
                  <Select defaultValue="freelancer">
                    <SelectTrigger id="business-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="freelancer">Freelancer / Self-Employed</SelectItem>
                  <SelectItem value="creator">Creator / Influencer</SelectItem>
                      <SelectItem value="sme">Small & Medium Enterprise</SelectItem>
                      <SelectItem value="individual">Individual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business-address">Business Address</Label>
                  <Input id="business-address" defaultValue="123 Business Street, Lagos" />
                </div>
                <Button>Save Changes</Button>
              </div>
            </Card>

            {/* Notification Settings */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive email alerts for reminders and deadlines</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Tax Deadline Reminders</Label>
                    <p className="text-sm text-muted-foreground">Get notified about upcoming tax deadlines</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Transaction Alerts</Label>
                    <p className="text-sm text-muted-foreground">Notifications for new transactions</p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly Summary</Label>
                    <p className="text-sm text-muted-foreground">Receive weekly financial summary reports</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </Card>

            {/* Subscription Settings */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Subscription & Limits</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Subscription Status</Label>
                    <p className="text-sm text-muted-foreground">Manage your subscription plan</p>
                  </div>
                  <Badge variant={subscriptionData.isSubscribe ? "default" : "secondary"}>
                    {subscriptionData.isSubscribe ? "Subscribed" : "Not Subscribed"}
                  </Badge>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="subscription-type">Subscription Type</Label>
                  <Select 
                    value={subscriptionData.subscriptionType || "none"} 
                    onValueChange={(value) => setSubscriptionData(prev => ({ ...prev, subscriptionType: value === "none" ? null : value }))}
                    disabled={isSaving}
                  >
                    <SelectTrigger id="subscription-type">
                      <SelectValue placeholder="Select subscription type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Subscription</SelectItem>
                      <SelectItem value="PRO">PRO - Freelancers</SelectItem>
                      <SelectItem value="GOLD">GOLD - Creators</SelectItem>
                      <SelectItem value="PLATINUM">PLATINUM - Advanced Creators</SelectItem>
                      <SelectItem value="Small Business">Small Business</SelectItem>
                      <SelectItem value="Big Business">Big Business</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Is Subscribed</Label>
                    <p className="text-sm text-muted-foreground">Toggle subscription status</p>
                  </div>
                  <Switch 
                    checked={subscriptionData.isSubscribe} 
                    onCheckedChange={(checked) => setSubscriptionData(prev => ({ ...prev, isSubscribe: checked }))}
                    disabled={isSaving}
                  />
                </div>
                <Separator />
                
                {/* Transaction Count */}
                {profile && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Monthly Transactions</Label>
                        <span className="text-sm font-medium">
                          {profile.transactionCount || 0} / {userService.getTransactionLimit(profile.subscriptionType || null) === Infinity ? '∞' : userService.getTransactionLimit(profile.subscriptionType || null)}
                        </span>
                      </div>
                      {userService.getTransactionLimit(profile.subscriptionType || null) !== Infinity && (
                        <Progress 
                          value={((profile.transactionCount || 0) / userService.getTransactionLimit(profile.subscriptionType || null)) * 100} 
                          className="h-2"
                        />
                      )}
                      <p className="text-xs text-muted-foreground">
                        Resets on the 1st of each month
                      </p>
                    </div>
                    <Separator />
                    
                    {/* Storage Usage */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Storage Usage</Label>
                        <span className="text-sm font-medium">
                          {((profile.storageUsed || 0) / (1024 * 1024)).toFixed(2)} MB / {((profile.storageLimit || 500 * 1024 * 1024) / (1024 * 1024)).toFixed(0)} MB
                        </span>
                      </div>
                      <Progress 
                        value={((profile.storageUsed || 0) / (profile.storageLimit || 500 * 1024 * 1024)) * 100} 
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground">
                        {((profile.storageLimit || 500 * 1024 * 1024) - (profile.storageUsed || 0)) / (1024 * 1024) > 0 
                          ? `${(((profile.storageLimit || 500 * 1024 * 1024) - (profile.storageUsed || 0)) / (1024 * 1024)).toFixed(2)} MB remaining`
                          : 'Storage limit reached'}
                      </p>
                    </div>
                  </>
                )}
                
                <Button 
                  onClick={async () => {
                    if (!user?.uid) {
                      toast.error("User not authenticated")
                      return
                    }
                    setIsSaving(true)
                    try {
                      const result = await userService.upsertProfile(user.uid, {
                        isSubscribe: subscriptionData.isSubscribe,
                        subscriptionType: subscriptionData.subscriptionType as any,
                      })
                      if (result.success) {
                        toast.success("Subscription updated successfully")
                        await refetchProfile()
                      } else {
                        toast.error(result.error || "Failed to update subscription")
                      }
                    } catch (error) {
                      toast.error("Failed to update subscription")
                      console.error(error)
                    } finally {
                      setIsSaving(false)
                    }
                  }}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Subscription Changes"}
                </Button>
              </div>
            </Card>

            {/* Security Settings */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Security</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input id="confirm-password" type="password" />
                </div>
                <Button>Update Password</Button>
              </div>
            </Card>
          </div>
        </main>
      </div>
  )
}
