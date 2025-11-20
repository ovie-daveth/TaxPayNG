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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/hooks/useAuth"
import { useUserProfile } from "@/lib/hooks/useUserProfile"
import { userService } from "@/lib/services"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { User, Building2, CreditCard, Bell, Shield } from "lucide-react"

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
      <main className="h-screen flex items-center justify-center">
        <SettingsSkeleton />
      </main>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <main className="flex-1 overflow-hidden">
        <div className="container mx-auto px-6 py-8 max-w-7xl h-full overflow-y-auto hide-scrollbar">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-2">
              Manage your account settings and preferences
            </p>
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className={`grid w-full mb-6 ${profile?.businessType === 'freelancer' ? 'grid-cols-4' : 'grid-cols-5'}`}>
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              {profile?.businessType !== 'freelancer' && (
                <TabsTrigger value="business" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Business</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="subscription" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">Subscription</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
            </TabsList>

            <div className="space-y-6">
              {/* Profile Tab */}
              <TabsContent value="profile" className="mt-0">
                <Card className="p-8">
                  <div className="mb-6">
                    <h2 className="text-2xl font-semibold">Profile Information</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Update your personal information and contact details
                    </p>
                  </div>
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="full-name">Full Name</Label>
                        <Input id="full-name" defaultValue={profile ? `${profile.firstName} ${profile.lastName}` : ""} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" defaultValue={profile?.email || ""} disabled />
                        <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" defaultValue={profile?.phone || ""} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tin">Tax Identification Number</Label>
                        <Input id="tin" defaultValue={profile?.taxId || ""} />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button size="lg">Save Changes</Button>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* Business Tab - Only show if not freelancer */}
              {profile?.businessType !== 'freelancer' && (
                <TabsContent value="business" className="mt-0">
                  <Card className="p-8">
                    <div className="mb-6">
                      <h2 className="text-2xl font-semibold">Business Information</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Manage your business details and type
                      </p>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="business-name">Business Name</Label>
                        <Input id="business-name" placeholder="Enter your business name" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="business-type">Business Type</Label>
                        <Select defaultValue={profile?.businessType || "freelancer"}>
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
                        <Input id="business-address" placeholder="Enter your business address" />
                      </div>
                      <div className="flex justify-end">
                        <Button size="lg">Save Changes</Button>
                      </div>
                    </div>
                  </Card>
                </TabsContent>
              )}

              {/* Subscription Tab */}
              <TabsContent value="subscription" className="mt-0">
                <Card className="p-8">
                  <div className="mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-semibold">Subscription & Limits</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          Manage your subscription plan and view usage limits
                        </p>
                      </div>
                      <Badge variant={subscriptionData.isSubscribe ? "default" : "secondary"} className="text-sm px-4 py-2">
                        {subscriptionData.isSubscribe ? "Subscribed" : "Not Subscribed"}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
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
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                          <Label>Subscription Status</Label>
                          <p className="text-sm text-muted-foreground">Toggle subscription status</p>
                        </div>
                        <Switch 
                          checked={subscriptionData.isSubscribe} 
                          onCheckedChange={(checked) => setSubscriptionData(prev => ({ ...prev, isSubscribe: checked }))}
                          disabled={isSaving}
                        />
                      </div>
                    </div>

                    {profile && (
                      <>
                        <Separator />
                        
                        {/* Transaction Count */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-base">Monthly Transactions</Label>
                            <span className="text-sm font-semibold">
                              {profile.transactionCount || 0} / {userService.getTransactionLimit(profile.subscriptionType || null) === Infinity ? '∞' : userService.getTransactionLimit(profile.subscriptionType || null)}
                            </span>
                          </div>
                          {userService.getTransactionLimit(profile.subscriptionType || null) !== Infinity && (
                            <Progress 
                              value={((profile.transactionCount || 0) / userService.getTransactionLimit(profile.subscriptionType || null)) * 100} 
                              className="h-3"
                            />
                          )}
                          <p className="text-xs text-muted-foreground">
                            Resets on the 1st of each month
                          </p>
                        </div>
                        
                        <Separator />
                        
                        {/* Storage Usage */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-base">Storage Usage</Label>
                            <span className="text-sm font-semibold">
                              {((profile.storageUsed || 0) / (1024 * 1024)).toFixed(2)} MB / {((profile.storageLimit || 500 * 1024 * 1024) / (1024 * 1024)).toFixed(0)} MB
                            </span>
                          </div>
                          <Progress 
                            value={((profile.storageUsed || 0) / (profile.storageLimit || 500 * 1024 * 1024)) * 100} 
                            className="h-3"
                          />
                          <p className="text-xs text-muted-foreground">
                            {((profile.storageLimit || 500 * 1024 * 1024) - (profile.storageUsed || 0)) / (1024 * 1024) > 0 
                              ? `${(((profile.storageLimit || 500 * 1024 * 1024) - (profile.storageUsed || 0)) / (1024 * 1024)).toFixed(2)} MB remaining`
                              : 'Storage limit reached'}
                          </p>
                        </div>
                      </>
                    )}
                    
                    <div className="flex justify-end pt-4">
                      <Button 
                        size="lg"
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
                  </div>
                </Card>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="mt-0">
                <Card className="p-8">
                  <div className="mb-6">
                    <h2 className="text-2xl font-semibold">Notification Preferences</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configure how and when you receive notifications
                    </p>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="text-base">Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">Receive email alerts for reminders and deadlines</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="text-base">Tax Deadline Reminders</Label>
                        <p className="text-sm text-muted-foreground">Get notified about upcoming tax deadlines</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="text-base">Transaction Alerts</Label>
                        <p className="text-sm text-muted-foreground">Notifications for new transactions</p>
                      </div>
                      <Switch />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <Label className="text-base">Weekly Summary</Label>
                        <p className="text-sm text-muted-foreground">Receive weekly financial summary reports</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button size="lg">Save Preferences</Button>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="mt-0">
                <Card className="p-8">
                  <div className="mb-6">
                    <h2 className="text-2xl font-semibold">Security</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Update your password and manage security settings
                    </p>
                  </div>
                  <div className="space-y-6 max-w-2xl">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input id="current-password" type="password" placeholder="Enter your current password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input id="new-password" type="password" placeholder="Enter your new password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input id="confirm-password" type="password" placeholder="Confirm your new password" />
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button size="lg">Update Password</Button>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
