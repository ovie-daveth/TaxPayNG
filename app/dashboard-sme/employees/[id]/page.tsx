"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/hooks/useAuth"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { 
  ArrowLeft, 
  User, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Loader2,
  Eye,
  CreditCard,
  Building2,
  ChevronDown
} from "lucide-react"
import { toast } from "sonner"
import { Employee, PayrollItem, PayrollTemplate } from "@/lib/types"
import { format } from "date-fns"

export default function EmployeeDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const employeeId = params.id as string

  const [employee, setEmployee] = useState<Employee | null>(null)
  const [payrollHistory, setPayrollHistory] = useState<any[]>([])
  const [paymentRecords, setPaymentRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [showGeneratePayrollDialog, setShowGeneratePayrollDialog] = useState(false)
  const [templates, setTemplates] = useState<PayrollTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [generatingPayroll, setGeneratingPayroll] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [selectedPayrollItem, setSelectedPayrollItem] = useState<any | null>(null)
  const [processingPayment, setProcessingPayment] = useState(false)
  
  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer")
  const [paymentReference, setPaymentReference] = useState("")
  const [paymentNotes, setPaymentNotes] = useState("")

  useEffect(() => {
    if (user && employeeId) {
      fetchEmployeeData()
    }
  }, [user, employeeId])

  const fetchEmployeeData = async () => {
    if (!user || !employeeId) return

    try {
      setLoading(true)
      const token = await user.getIdToken()

      // Fetch employee details
      const employeeResponse = await fetch(`/api/employees/${employeeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const employeeData = await employeeResponse.json()
      if (employeeData.success) {
        setEmployee(employeeData.data)
      }

      // Fetch payroll history
      const payrollResponse = await fetch(`/api/employees/${employeeId}/payroll-history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const payrollData = await payrollResponse.json()
      if (payrollData.success) {
        setPayrollHistory(payrollData.data)
      }

      // Fetch payment records
      const paymentResponse = await fetch(`/api/employees/${employeeId}/payments`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const paymentData = await paymentResponse.json()
      if (paymentData.success) {
        setPaymentRecords(paymentData.data)
      }
    } catch (error) {
      console.error("Error fetching employee data:", error)
      toast.error("Failed to load employee data")
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    if (!user) return
    setTemplatesLoading(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/payroll/templates', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) {
        setTemplates(data.data || [])
        // Default template selection: employee assignment -> first template
        const preferred = employee?.payrollTemplateId || data.data?.[0]?.id || ""
        setSelectedTemplateId(preferred)
      }
    } catch (e) {
      console.error('Error fetching templates:', e)
    } finally {
      setTemplatesLoading(false)
    }
  }

  const handleGeneratePayrollForEmployee = async () => {
    if (!user || !employee) return
    if (!selectedTemplateId) {
      toast.error("Please select a payroll template")
      return
    }

    setGeneratingPayroll(true)
    try {
      const year = selectedYear
      const periodStart = new Date(year, 0, 1).toISOString()
      const periodEnd = new Date(year, 11, 31).toISOString()
      const periodLabel = String(year)

      const token = await user.getIdToken()
      const response = await fetch('/api/payroll/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          periodStart,
          periodEnd,
          periodType: 'yearly',
          periodLabel,
          employeeIds: [employee.id]
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success("Payroll generated for this employee")
        setShowGeneratePayrollDialog(false)
        await fetchEmployeeData()
      } else {
        toast.error(data.error || "Failed to generate payroll")
      }
    } catch (e: any) {
      console.error('Error generating payroll:', e)
      toast.error(e?.message || "Failed to generate payroll")
    } finally {
      setGeneratingPayroll(false)
    }
  }

  const handlePayClick = (payrollItem: any) => {
    setSelectedPayrollItem(payrollItem)
    setShowPaymentDialog(true)
    setPaymentReference("")
    setPaymentNotes("")
  }

  const handleMarkAsPaid = async () => {
    if (!user || !selectedPayrollItem || !employee) return

    try {
      setProcessingPayment(true)
      const token = await user.getIdToken()

      const response = await fetch(`/api/employees/${employeeId}/payments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          payrollId: selectedPayrollItem.payrollId,
          period: selectedPayrollItem.period,
          periodType: selectedPayrollItem.periodType,
          periodStart: selectedPayrollItem.periodStart,
          periodEnd: selectedPayrollItem.periodEnd,
          netSalary: selectedPayrollItem.item.netSalary,
          paymentMethod,
          paymentReference,
          notes: paymentNotes
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success("Payment recorded successfully")
        setShowPaymentDialog(false)
        setSelectedPayrollItem(null)
        setPaymentRecords((prev) => [...prev, data.data])
      } else {
        toast.error(data.error || "Failed to record payment")
      }
    } catch (error) {
      console.error("Error recording payment:", error)
      toast.error("Failed to record payment")
    } finally {
      setProcessingPayment(false)
    }
  }

  const toMonthKey = (dateString?: string) => {
    if (!dateString) return null
    const d = new Date(dateString)
    if (Number.isNaN(d.getTime())) return null
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    return `${y}-${m}`
  }

  const getPaymentForMonth = (monthKey: string) => {
    // Consider the month "paid" if any payment record exists for that month
    // (do not couple to payrollId so re-generated payrolls still reflect payments)
    const matches = paymentRecords.filter((p) => toMonthKey(p.periodStart) === monthKey)
    if (matches.length === 0) return null
    // Prefer the latest paidAt/createdAt
    const sorted = [...matches].sort((a, b) => {
      const da = new Date(a.paidAt || a.createdAt || 0).getTime()
      const db = new Date(b.paidAt || b.createdAt || 0).getTime()
      return db - da
    })
    return sorted[0]
  }

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const availableYears = useMemo(() => {
    const years = new Set<number>()
    payrollHistory.forEach((h) => {
      const mk = toMonthKey(h.periodStart)
      if (!mk) return
      const y = parseInt(mk.split("-")[0])
      if (!Number.isNaN(y)) years.add(y)
    })
    years.add(new Date().getFullYear())
    return Array.from(years).sort((a, b) => b - a)
  }, [payrollHistory])

  const monthsInYear = useMemo(() => {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]
    return monthNames.map((name, idx) => {
      const month = idx + 1
      const monthKey = `${selectedYear}-${String(month).padStart(2, "0")}`
      const periodStart = new Date(selectedYear, idx, 1).toISOString()
      const periodEnd = new Date(selectedYear, idx + 1, 0).toISOString()
      return { month, name, monthKey, periodStart, periodEnd }
    })
  }, [selectedYear])

  const payrollByMonthKey = useMemo(() => {
    // Pick the most recently generated payroll entry for each month in the selected year.
    const entries = [...payrollHistory].sort((a, b) => {
      const da = new Date(a.generatedAt || 0).getTime()
      const db = new Date(b.generatedAt || 0).getTime()
      return db - da
    })
    const map = new Map<string, any>()
    for (const entry of entries) {
      const mk = toMonthKey(entry.periodStart)
      if (!mk) continue
      if (!mk.startsWith(`${selectedYear}-`)) continue
      if (!map.has(mk)) map.set(mk, entry)
    }
    return map
  }, [payrollHistory, selectedYear])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Employee not found</p>
            <Button onClick={() => router.push('/dashboard-sme/employees')} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Employees
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center justify-between gap-4 w-full">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard-sme/employees')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {employee.firstName} {employee.middleName} {employee.lastName}
            </h1>
            <p className="text-muted-foreground">
              {employee.jobTitle || employee.position || 'Employee'} • {employee.department || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Employee Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Employee Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p>{employee.email || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Phone</Label>
              <p>{employee.phone || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Employee Number</Label>
              <p>{employee.employeeNumber || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Status</Label>
              <Badge variant={employee.status === 'active' ? 'default' : 'secondary'}>
                {employee.status}
              </Badge>
            </div>
            {employee.bankAccount && (
              <>
                <div>
                  <Label className="text-muted-foreground">Bank Name</Label>
                  <p>{employee.bankAccount.bankName || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Account Number</Label>
                  <p>{employee.bankAccount.accountNumber || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Account Name</Label>
                  <p>{employee.bankAccount.accountName || 'N/A'}</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payroll History & Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Salary Breakdown & Payment History
          </CardTitle>
          <CardDescription>
            View salary breakdowns from payrolls and track monthly payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">Year</div>
            </div>
            <div className="w-full sm:w-[180px]">
              <Select
                value={String(selectedYear)}
                onValueChange={(v) => setSelectedYear(parseInt(v))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {payrollHistory.length === 0 && (
            <div className="rounded-lg border bg-muted/20 p-4">
              <div className="text-sm text-muted-foreground">
                No payroll generated yet for this employee.
              </div>
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => {
                    setShowGeneratePayrollDialog(true)
                    fetchTemplates()
                  }}
                  className="sm:w-auto"
                >
                  Generate Payroll for this employee
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/dashboard-sme/payroll')}
                  className="sm:w-auto"
                >
                  Go to Payroll
                </Button>
              </div>
            </div>
          )}

          <Accordion type="single" collapsible className="w-full">
            {monthsInYear.map((m) => {
              const historyItem = payrollByMonthKey.get(m.monthKey) || null
              const payment = getPaymentForMonth(m.monthKey)
              const item = historyItem?.item as PayrollItem | undefined

              const badge = historyItem
                ? payment
                  ? { variant: "default" as const, icon: <CheckCircle2 className="w-3 h-3" />, label: "Paid" }
                  : { variant: "secondary" as const, icon: <Clock className="w-3 h-3" />, label: "Pending" }
                : { variant: "secondary" as const, icon: <Clock className="w-3 h-3" />, label: "No payroll" }

              return (
                <AccordionItem key={m.monthKey} value={m.monthKey} className="border rounded-lg mb-3 px-4">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-base sm:text-lg font-semibold">
                            {m.name} {selectedYear}
                          </h3>
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                            {historyItem ? (
                              <span>
                                Generated {historyItem.generatedAt ? format(new Date(historyItem.generatedAt), "MMM dd, yyyy") : "—"}
                              </span>
                            ) : (
                              <span>No payroll generated for this month</span>
                            )}
                            {item?.netSalary !== undefined && (
                              <span className="text-primary font-semibold">
                                • {formatCurrency(item.netSalary)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge variant={badge.variant} className="gap-1.5 shrink-0">
                        {badge.icon}
                        {badge.label}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pb-4">
                      {!historyItem || !item ? (
                        <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                          Generate payroll to see this employee’s monthly breakdown for {m.name} {selectedYear}.
                        </div>
                      ) : (
                        <Card className="border-l-4 border-l-primary">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <CardTitle className="text-base truncate">{historyItem.period || `${m.name} ${selectedYear}`}</CardTitle>
                                <CardDescription className="text-xs">
                                  {m.name} breakdown (monthly payroll)
                                </CardDescription>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {!payment && (
                                  <Button
                                    size="sm"
                                    onClick={() => handlePayClick(historyItem)}
                                    className="h-8"
                                  >
                                    <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                                    Mark as Paid
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Earnings */}
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                  <div className="w-1 h-4 bg-green-500 rounded"></div>
                                  Earnings
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between py-1">
                                    <span className="text-muted-foreground">Basic Salary</span>
                                    <span className="font-medium">{formatCurrency(item.basicSalary || 0)}</span>
                                  </div>
                                  {(item.allowances || []).map((allowance: any, idx: number) => (
                                    <div key={idx} className="flex justify-between py-1">
                                      <span className="text-muted-foreground">{allowance.name}</span>
                                      <span className="font-medium">{formatCurrency(allowance.amount)}</span>
                                    </div>
                                  ))}
                                  <div className="flex justify-between font-semibold pt-2 border-t mt-2">
                                    <span>Gross Salary</span>
                                    <span className="text-green-600">{formatCurrency(item.grossSalary || 0)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Deductions */}
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                  <div className="w-1 h-4 bg-red-500 rounded"></div>
                                  Deductions
                                </h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between py-1">
                                    <span className="text-muted-foreground">PAYE</span>
                                    <span className="font-medium text-red-600">{formatCurrency(item.paye?.amount || 0)}</span>
                                  </div>
                                  <div className="flex justify-between py-1">
                                    <span className="text-muted-foreground">Pension (Employee)</span>
                                    <span className="font-medium text-red-600">{formatCurrency(item.pension?.employee || 0)}</span>
                                  </div>
                                  {item.nhf && (
                                    <div className="flex justify-between py-1">
                                      <span className="text-muted-foreground">NHF</span>
                                      <span className="font-medium text-red-600">{formatCurrency(item.nhf.amount)}</span>
                                    </div>
                                  )}
                                  {item.nhis && (
                                    <div className="flex justify-between py-1">
                                      <span className="text-muted-foreground">NHIS</span>
                                      <span className="font-medium text-red-600">{formatCurrency(item.nhis.amount)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between font-semibold pt-2 border-t mt-2">
                                    <span>Total Deductions</span>
                                    <span className="text-red-600">
                                      {formatCurrency(
                                        (item.paye?.amount || 0) +
                                          (item.pension?.employee || 0) +
                                          (item.nhf?.amount || 0) +
                                          (item.nhis?.amount || 0)
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Net Salary */}
                            <div className="pt-4 mt-4 border-t">
                              <div className="flex justify-between items-center">
                                <span className="text-base font-semibold">Net Salary</span>
                                <span className="text-2xl font-bold text-primary">{formatCurrency(item.netSalary || 0)}</span>
                              </div>
                            </div>

                            {/* Payment Info */}
                            {payment && (
                              <div className="pt-4 mt-4 border-t bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
                                <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  Payment Details
                                </h4>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Paid On</span>
                                    <p className="font-medium">{payment.paidAt ? format(new Date(payment.paidAt), "MMM dd, yyyy") : "—"}</p>
                                  </div>
                                  {payment.paymentMethod && (
                                    <div>
                                      <span className="text-muted-foreground">Payment Method</span>
                                      <p className="font-medium capitalize">{String(payment.paymentMethod).replace("_", " ")}</p>
                                    </div>
                                  )}
                                  {payment.paymentReference && (
                                    <div className="col-span-2">
                                      <span className="text-muted-foreground">Reference</span>
                                      <p className="font-medium">{payment.paymentReference}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Enter payment details for {selectedPayrollItem?.period}
            </DialogDescription>
          </DialogHeader>
          {selectedPayrollItem && employee && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Employee</span>
                    <span className="font-medium">
                      {employee.firstName} {employee.lastName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Period</span>
                    <span className="font-medium">{selectedPayrollItem.period}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Net Salary</span>
                    <span className="font-bold text-lg">
                      {formatCurrency(selectedPayrollItem.item.netSalary)}
                    </span>
                  </div>
                </div>
              </div>

              {employee.bankAccount && (
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Bank Account Details
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bank</span>
                      <span>{employee.bankAccount.bankName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Number</span>
                      <span>{employee.bankAccount.accountNumber || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Name</span>
                      <span>{employee.bankAccount.accountName || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Label>Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Payment Reference</Label>
                  <Input
                    placeholder="Enter transaction reference or receipt number"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    placeholder="Additional notes about this payment"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
              disabled={processingPayment}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkAsPaid}
              disabled={processingPayment}
            >
              {processingPayment ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark as Paid
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Payroll Dialog */}
      <Dialog open={showGeneratePayrollDialog} onOpenChange={setShowGeneratePayrollDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Payroll</DialogTitle>
            <DialogDescription>
              Generate yearly payroll (Jan–Dec) for {employee?.firstName} {employee?.lastName} using a selected template.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Payroll Template</Label>
              <Select
                value={selectedTemplateId}
                onValueChange={setSelectedTemplateId}
                disabled={templatesLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={templatesLoading ? "Loading templates..." : "Select template"} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}{t.isDefault ? " (Default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGeneratePayrollDialog(false)} disabled={generatingPayroll}>
              Cancel
            </Button>
            <Button onClick={handleGeneratePayrollForEmployee} disabled={generatingPayroll || templatesLoading}>
              {generatingPayroll ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

