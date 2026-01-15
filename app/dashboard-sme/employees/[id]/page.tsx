"use client"

import { useState, useEffect } from "react"
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
import { Employee, PayrollItem } from "@/lib/types"
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
        fetchEmployeeData() // Refresh data
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

  const getPaymentStatus = (payrollItem: any) => {
    const payment = paymentRecords.find(
      p => p.payrollId === payrollItem.payrollId && 
      p.periodStart === payrollItem.periodStart
    )
    return payment || null
  }

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Group payroll history by month/year for accordion
  const groupedPayrolls = payrollHistory.reduce((acc: any, item: any) => {
    let monthKey = ''
    
    // Priority 1: Use periodStart date (most reliable)
    if (item.periodStart) {
      try {
        const date = new Date(item.periodStart)
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear()
          const month = date.getMonth() + 1
          monthKey = `${year}-${String(month).padStart(2, '0')}`
        }
      } catch (e) {
        console.error('Error parsing periodStart:', e)
      }
    }
    
    // Priority 2: Parse period string (e.g., "January 2026", "Q1 2024", etc.)
    if (!monthKey && item.period) {
      // Try to match month name pattern
      const periodMatch = item.period.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i)
      if (periodMatch) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        const monthIndex = monthNames.findIndex(m => m.toLowerCase() === periodMatch[1].toLowerCase())
        if (monthIndex !== -1) {
          monthKey = `${periodMatch[2]}-${String(monthIndex + 1).padStart(2, '0')}`
        }
      } else {
        // Try to parse quarter format (Q1 2024, Q2 2024, etc.)
        const quarterMatch = item.period.match(/Q([1-4])\s+(\d{4})/i)
        if (quarterMatch) {
          const quarter = parseInt(quarterMatch[1])
          const year = quarterMatch[2]
          // Q1 = Jan-Mar (month 1), Q2 = Apr-Jun (month 4), Q3 = Jul-Sep (month 7), Q4 = Oct-Dec (month 10)
          const month = (quarter - 1) * 3 + 1
          monthKey = `${year}-${String(month).padStart(2, '0')}`
        }
      }
    }
    
    // Priority 3: Use generatedAt as fallback
    if (!monthKey && item.generatedAt) {
      try {
        const date = new Date(item.generatedAt)
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear()
          const month = date.getMonth() + 1
          monthKey = `${year}-${String(month).padStart(2, '0')}`
        }
      } catch (e) {
        console.error('Error parsing generatedAt:', e)
      }
    }
    
    // Fallback: use current date if nothing works
    if (!monthKey) {
      const now = new Date()
      monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    }
    
    if (!acc[monthKey]) {
      acc[monthKey] = []
    }
    acc[monthKey].push(item)
    return acc
  }, {})

  // Sort months in descending order (most recent first)
  const sortedMonths = Object.keys(groupedPayrolls).sort((a, b) => b.localeCompare(a))

  const formatMonthYear = (monthKey: string) => {
    const [year, month] = monthKey.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return format(date, 'MMMM yyyy')
  }

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
          {payrollHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No payroll history found for this employee</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {sortedMonths.map((monthKey) => {
                const monthPayrolls = groupedPayrolls[monthKey]
                const monthTotal = monthPayrolls.reduce((sum: number, item: any) => sum + (item.item.netSalary || 0), 0)
                const paidCount = monthPayrolls.filter((item: any) => getPaymentStatus(item)).length
                const pendingCount = monthPayrolls.length - paidCount

                return (
                  <AccordionItem key={monthKey} value={monthKey} className="border rounded-lg mb-3 px-4">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Calendar className="w-5 h-5 text-primary" />
                          </div>
                          <div className="text-left">
                            <h3 className="text-lg font-semibold">{formatMonthYear(monthKey)}</h3>
                            <p className="text-sm text-muted-foreground">
                              {monthPayrolls.length} payroll{monthPayrolls.length !== 1 ? 's' : ''} • 
                              {paidCount > 0 && (
                                <span className="text-green-600 ml-1">
                                  {paidCount} paid
                                </span>
                              )}
                              {pendingCount > 0 && (
                                <span className="text-orange-600 ml-1">
                                  {pendingCount} pending
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="text-lg font-bold text-primary">{formatCurrency(monthTotal)}</p>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pb-4">
                        {monthPayrolls.map((historyItem: any) => {
                          const payment = getPaymentStatus(historyItem)
                          const item = historyItem.item

                          return (
                            <Card key={historyItem.payrollId} className="border-l-4 border-l-primary">
                              <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <CardTitle className="text-base">{historyItem.period}</CardTitle>
                                    <CardDescription className="text-xs">
                                      Generated on {format(new Date(historyItem.generatedAt), 'MMM dd, yyyy')}
                                    </CardDescription>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {payment ? (
                                      <Badge variant="default" className="gap-1.5">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Paid
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="gap-1.5">
                                        <Clock className="w-3 h-3" />
                                        Pending
                                      </Badge>
                                    )}
                                    {!payment && (
                                      <Button
                                        size="sm"
                                        onClick={() => handlePayClick(historyItem)}
                                        className="h-8"
                                      >
                                        <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                                        Pay
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
                                        <span className="font-medium">{formatCurrency(item.basicSalary)}</span>
                                      </div>
                                      {item.allowances.map((allowance: any, idx: number) => (
                                        <div key={idx} className="flex justify-between py-1">
                                          <span className="text-muted-foreground">{allowance.name}</span>
                                          <span className="font-medium">{formatCurrency(allowance.amount)}</span>
                                        </div>
                                      ))}
                                      <div className="flex justify-between font-semibold pt-2 border-t mt-2">
                                        <span>Gross Salary</span>
                                        <span className="text-green-600">{formatCurrency(item.grossSalary)}</span>
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
                                        <span className="font-medium text-red-600">{formatCurrency(item.paye.amount)}</span>
                                      </div>
                                      <div className="flex justify-between py-1">
                                        <span className="text-muted-foreground">Pension (Employee)</span>
                                        <span className="font-medium text-red-600">{formatCurrency(item.pension.employee)}</span>
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
                                        <span className="text-red-600">{formatCurrency(
                                          item.paye.amount + 
                                          item.pension.employee + 
                                          (item.nhf?.amount || 0) + 
                                          (item.nhis?.amount || 0)
                                        )}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Net Salary */}
                                <div className="pt-4 mt-4 border-t">
                                  <div className="flex justify-between items-center">
                                    <span className="text-base font-semibold">Net Salary</span>
                                    <span className="text-2xl font-bold text-primary">{formatCurrency(item.netSalary)}</span>
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
                                        <p className="font-medium">{format(new Date(payment.paidAt!), 'MMM dd, yyyy')}</p>
                                      </div>
                                      {payment.paymentMethod && (
                                        <div>
                                          <span className="text-muted-foreground">Payment Method</span>
                                          <p className="font-medium capitalize">{payment.paymentMethod.replace('_', ' ')}</p>
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
                          )
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )}
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
    </div>
  )
}

