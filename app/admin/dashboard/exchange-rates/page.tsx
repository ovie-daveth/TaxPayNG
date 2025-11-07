"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/hooks/useAuth"
import { useAdmin } from "@/lib/hooks/useAdmin"
import { exchangeRateService, type ExchangeRate } from "@/lib/services/exchangeRateService"
import { toast } from "sonner"
import { Save, RefreshCw, Plus, Trash2, Edit, Loader2 } from "lucide-react"
import { AdminTableSkeleton } from "@/components/ui/skeletons"
import { SUPPORTED_CURRENCIES } from "@/lib/utils/currency"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function AdminExchangeRatesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { isAdmin, loading: adminLoading } = useAdmin()
  const [rates, setRates] = useState<ExchangeRate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null)
  const [newRate, setNewRate] = useState({ currency: "", rate: "" })
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    if (!authLoading && !adminLoading) {
      if (!user || !isAdmin) {
        router.push("/admin/login")
      }
    }
  }, [user, isAdmin, authLoading, adminLoading, router])

  useEffect(() => {
    const fetchRates = async () => {
      if (!user || !isAdmin) return

      try {
        setLoading(true)
        const fetchedRates = await exchangeRateService.getAllRates()
        setRates(fetchedRates)
      } catch (error) {
        console.error("Error fetching exchange rates:", error)
        toast.error("Failed to load exchange rates")
      } finally {
        setLoading(false)
      }
    }

    if (user && isAdmin) {
      fetchRates()
    }
  }, [user, isAdmin])

  const handleSave = async (rate: ExchangeRate) => {
    if (!user) return

    try {
      setSaving(rate.id!)
      const rateValue = Number.parseFloat(rate.rate.toString())
      
      if (isNaN(rateValue) || rateValue <= 0) {
        toast.error("Rate must be a positive number")
        return
      }

      await exchangeRateService.upsertRate(rate.currency, rateValue, user.uid)
      toast.success(`${rate.currency} exchange rate updated successfully`)
      
      // Refresh rates
      const updatedRates = await exchangeRateService.getAllRates()
      setRates(updatedRates)
    } catch (error) {
      console.error("Error saving exchange rate:", error)
      toast.error("Failed to save exchange rate")
    } finally {
      setSaving(null)
    }
  }

  const handleAddNew = async () => {
    if (!user) return

    try {
      const rateValue = Number.parseFloat(newRate.rate)
      
      if (!newRate.currency) {
        toast.error("Please select a currency")
        return
      }

      if (isNaN(rateValue) || rateValue <= 0) {
        toast.error("Rate must be a positive number")
        return
      }

      // Check if currency already exists
      const existing = rates.find(r => r.currency === newRate.currency.toUpperCase())
      if (existing) {
        toast.error("This currency already exists. Please edit the existing rate instead.")
        return
      }

      await exchangeRateService.upsertRate(newRate.currency.toUpperCase(), rateValue, user.uid)
      toast.success(`${newRate.currency} exchange rate added successfully`)
      
      // Reset form
      setNewRate({ currency: "", rate: "" })
      setDialogOpen(false)
      
      // Refresh rates
      const updatedRates = await exchangeRateService.getAllRates()
      setRates(updatedRates)
    } catch (error) {
      console.error("Error adding exchange rate:", error)
      toast.error("Failed to add exchange rate")
    }
  }

  const handleDelete = async (rateId: string, currency: string) => {
    if (!confirm(`Are you sure you want to delete the exchange rate for ${currency}?`)) {
      return
    }

    try {
      await exchangeRateService.delete(rateId)
      toast.success(`${currency} exchange rate deleted successfully`)
      
      // Refresh rates
      const updatedRates = await exchangeRateService.getAllRates()
      setRates(updatedRates)
    } catch (error) {
      console.error("Error deleting exchange rate:", error)
      toast.error("Failed to delete exchange rate")
    }
  }

  const handleInitializeDefaults = async () => {
    if (!user) return

    if (!confirm("This will initialize default exchange rates for all supported currencies. Continue?")) {
      return
    }

    try {
      setLoading(true)
      await exchangeRateService.initializeDefaults(user.uid)
      toast.success("Default exchange rates initialized successfully")
      
      // Refresh rates
      const updatedRates = await exchangeRateService.getAllRates()
      setRates(updatedRates)
    } catch (error) {
      console.error("Error initializing defaults:", error)
      toast.error("Failed to initialize default exchange rates")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleString("en-NG", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return "Invalid date"
    }
  }

  if (authLoading || adminLoading || loading) {
    return <AdminTableSkeleton />
  }

  if (!user || !isAdmin) {
    return null
  }

  // Get currencies that don't have rates yet
  const existingCurrencies = new Set(rates.map(r => r.currency))
  const availableCurrencies = SUPPORTED_CURRENCIES.filter(
    c => c.code !== "NGN" && !existingCurrencies.has(c.code)
  )

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Exchange Rates</h1>
            <p className="text-muted-foreground mt-1">
              Manage currency exchange rates for tax calculations
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleInitializeDefaults}
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Initialize Defaults
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Currency
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Exchange Rate</DialogTitle>
                  <DialogDescription>
                    Add a new currency exchange rate to NGN
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-currency">Currency</Label>
                    <select
                      id="new-currency"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={newRate.currency}
                      onChange={(e) => setNewRate({ ...newRate, currency: e.target.value })}
                    >
                      <option value="">Select currency</option>
                      {availableCurrencies.map((currency) => (
                        <option key={currency.code} value={currency.code}>
                          {currency.code} - {currency.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-rate">Rate to NGN</Label>
                    <Input
                      id="new-rate"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="1500.00"
                      value={newRate.rate}
                      onChange={(e) => setNewRate({ ...newRate, rate: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the exchange rate (e.g., 1500 means 1 USD = 1500 NGN)
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddNew}>
                    <Save className="w-4 h-4 mr-2" />
                    Add Rate
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Rates Table */}
        <Card>
          <CardHeader>
            <CardTitle>Current Exchange Rates</CardTitle>
            <CardDescription>
              All rates are relative to Nigerian Naira (NGN). Update rates as needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No exchange rates found.</p>
                <p className="text-sm mt-2">
                  Click "Initialize Defaults" to set up default rates for all supported currencies.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {rates.map((rate) => {
                  const currencyInfo = SUPPORTED_CURRENCIES.find(c => c.code === rate.currency)
                  const isEditing = editingRate?.id === rate.id
                  const editedRate = isEditing ? editingRate : rate

                  return (
                    <div
                      key={rate.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div>
                            <h3 className="font-semibold">{rate.currency}</h3>
                            <p className="text-sm text-muted-foreground">
                              {currencyInfo?.name || "Unknown Currency"}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Last updated: {formatDate(rate.lastUpdated)}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        {isEditing ? (
                          <>
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`rate-${rate.id}`} className="sr-only">
                                Rate
                              </Label>
                              <Input
                                id={`rate-${rate.id}`}
                                type="number"
                                step="0.01"
                                min="0.01"
                                className="w-32"
                                value={editedRate?.rate || 0}
                                onChange={(e) =>
                                  setEditingRate({
                                    ...editedRate!,
                                    rate: Number.parseFloat(e.target.value) || 0,
                                  })
                                }
                              />
                              <span className="text-sm text-muted-foreground">NGN</span>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                handleSave(editedRate!)
                                setEditingRate(null)
                              }}
                              disabled={saving === rate.id}
                            >
                              {saving === rate.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingRate(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="text-right">
                              <p className="font-semibold text-lg">
                                1 {rate.currency} = ₦{rate.rate.toLocaleString("en-NG", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingRate({ ...rate })}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(rate.id!, rate.currency)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-base">About Exchange Rates</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              • Exchange rates are used to convert foreign currency income to NGN for tax calculations.
            </p>
            <p>
              • Rates should be updated regularly to reflect current market rates.
            </p>
            <p>
              • The system will use these rates when calculating taxes for creators and freelancers with foreign income.
            </p>
            <p>
              • If a rate is not found in the database, the system will attempt to fetch from an external API.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

