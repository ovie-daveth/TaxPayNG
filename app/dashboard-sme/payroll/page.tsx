"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { 
  Plus, 
  Mail, 
  FileText, 
  Calendar, 
  Users, 
  DollarSign,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  Edit,
  X,
  Printer,
  ChevronDown,
  ChevronUp,
  User
} from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Payroll, PayrollTemplate, PayrollItem } from "@/lib/types"
import { format } from "date-fns"

export default function SMEPayrollPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [templates, setTemplates] = useState<PayrollTemplate[]>([])
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [sendingEmails, setSendingEmails] = useState<string | null>(null) // payrollId

  // Template selection
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState("")

  // Period selection (always yearly)
  const [selectedYear, setSelectedYear] = useState("")

  // View payroll
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null)
  const [showPayrollDialog, setShowPayrollDialog] = useState(false)

  // View template
  const [selectedTemplate, setSelectedTemplate] = useState<PayrollTemplate | null>(null)
  const [showTemplateViewDialog, setShowTemplateViewDialog] = useState(false)

  // Edit template
  const [editingTemplate, setEditingTemplate] = useState<PayrollTemplate | null>(null)
  const [showEditTemplateDialog, setShowEditTemplateDialog] = useState(false)
  const [updatingTemplate, setUpdatingTemplate] = useState(false)

  // Delete template
  const [deleteTemplateDialogOpen, setDeleteTemplateDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<PayrollTemplate | null>(null)
  const [deletingTemplate, setDeletingTemplate] = useState(false)

  // Delete payroll
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [payrollToDelete, setPayrollToDelete] = useState<Payroll | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (user) {
      fetchTemplates()
      fetchPayrolls()
    }
  }, [user])

  // Initialize current year
  useEffect(() => {
    const now = new Date()
    setSelectedYear(String(now.getFullYear()))
  }, [])

  const fetchTemplates = async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/payroll/templates', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        // Deduplicate templates by ID to prevent duplicate key warnings
        const uniqueTemplates = data.data.reduce((acc: PayrollTemplate[], template: PayrollTemplate) => {
          if (!acc.find(t => t.id === template.id)) {
            acc.push(template)
          }
          return acc
        }, [] as PayrollTemplate[])
        setTemplates(uniqueTemplates)
        // Select first template or default
        if (uniqueTemplates.length > 0 && !selectedTemplateId) {
          const defaultTemplate = uniqueTemplates.find((t: PayrollTemplate) => t.isDefault) || uniqueTemplates[0]
          setSelectedTemplateId(defaultTemplate.id)
        }
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const fetchPayrolls = async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/payroll', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        // Deduplicate payrolls by ID to prevent duplicate key warnings
        const uniquePayrolls = data.data.reduce((acc: Payroll[], payroll: Payroll) => {
          if (!acc.find(p => p.id === payroll.id)) {
            acc.push(payroll)
          }
          return acc
        }, [] as Payroll[])
        setPayrolls(uniquePayrolls)
      }
    } catch (error) {
      console.error('Error fetching payrolls:', error)
    }
  }

  const createDefaultTemplate = async () => {
    if (!user) return

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/payroll/templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ createDefault: true })
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Default template created')
        await fetchTemplates()
        setSelectedTemplateId(data.data.id)
        setShowTemplateDialog(false)
      } else {
        toast.error(data.error || 'Failed to create template')
      }
    } catch (error) {
      console.error('Error creating template:', error)
      toast.error('Failed to create template')
    }
  }

  const generatePayroll = async () => {
    if (!user || !selectedTemplateId || !selectedYear) {
      toast.error('Please select a template and year')
      return
    }

    setGenerating(true)
    try {
      // Always generate yearly payroll
      const year = parseInt(selectedYear)
      const periodStart = new Date(year, 0, 1).toISOString()
      const periodEnd = new Date(year, 11, 31).toISOString()
      const periodLabel = String(year)

      const token = await user.getIdToken()
      const response = await fetch('/api/payroll/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          periodStart,
          periodEnd,
          periodType: 'yearly',
          periodLabel
        })
      })

      const data = await response.json()
      if (data.success) {
        // Count unique employees (each employee has 12 monthly items)
        const uniqueEmployees = new Set(data.data.items.map((item: any) => item.employeeId))
        toast.success(`Payroll generated successfully for ${uniqueEmployees.size} employees (12 months each)`)
        fetchPayrolls()
        setSelectedPayroll(data.data)
        setShowPayrollDialog(true)
      } else {
        toast.error(data.error || 'Failed to generate payroll')
      }
    } catch (error: any) {
      console.error('Error generating payroll:', error)
      toast.error(error.message || 'Failed to generate payroll')
    } finally {
      setGenerating(false)
    }
  }

  const printPayrollSlip = (payroll: Payroll, item: PayrollItem) => {
    try {
      const printWindow = window.open('', '_blank', 'width=800,height=600')
      if (!printWindow) {
        toast.error('Please allow popups to print')
        return
      }

      const logoUrl = `${window.location.origin}/logootax_bg.png`
      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Payroll Slip - ${item.employeeName}</title>
            <style>
              @media print {
                @page {
                  margin: 15mm;
                  size: A4;
                }
                body {
                  margin: 0;
                  padding: 0;
                }
                .no-print {
                  display: none;
                }
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                font-size: 12px;
                line-height: 1.6;
                color: #000;
                background: #fff;
                padding: 20px;
              }
              .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border-bottom: 2px solid #000;
                padding-bottom: 15px;
                margin-bottom: 20px;
                position: relative;
              }
              .header-content {
                flex: 1;
              }
              .header h1 {
                font-size: 24px;
                font-weight: bold;
                color: #111827;
                margin-bottom: 5px;
              }
              .header p {
                font-size: 14px;
                color: #666;
              }
              .header-logo {
                width: 80px;
                height: auto;
                object-fit: contain;
              }
              .employee-info {
                background: #f9fafb;
                padding: 15px;
                border-radius: 4px;
                margin-bottom: 20px;
                border: 1px solid #e5e7eb;
              }
              .employee-info h2 {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 10px;
                color: #111827;
              }
              .employee-info p {
                font-size: 11px;
                color: #4b5563;
                margin: 3px 0;
              }
              .section {
                margin-bottom: 25px;
                page-break-inside: avoid;
              }
              .section-title {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 12px;
                padding-bottom: 5px;
                border-bottom: 1px solid #d1d5db;
                color: #111827;
              }
              .row {
                display: flex;
                justify-content: space-between;
                padding: 6px 0;
                border-bottom: 1px solid #f3f4f6;
                font-size: 11px;
              }
              .row.total {
                font-weight: bold;
                border-top: 2px solid #000;
                border-bottom: 2px solid #000;
                padding: 8px 0;
                margin-top: 5px;
                font-size: 12px;
              }
              .row.sub-item {
                padding-left: 20px;
                font-size: 10px;
                color: #6b7280;
              }
              .label {
                color: #6b7280;
              }
              .amount {
                font-weight: 600;
                color: #111827;
                text-align: right;
              }
              .badge {
                display: inline-block;
                padding: 2px 6px;
                background: #e5e7eb;
                border-radius: 3px;
                font-size: 9px;
                margin-left: 8px;
              }
              .tax-breakdown {
                background: #f9fafb;
                padding: 12px;
                border-radius: 4px;
                border: 1px solid #e5e7eb;
                margin-top: 10px;
              }
              .tax-breakdown .row {
                border-bottom: 1px solid #e5e7eb;
              }
              .reliefs {
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid #d1d5db;
              }
              .reliefs-title {
                font-size: 10px;
                font-weight: bold;
                color: #6b7280;
                margin-bottom: 5px;
              }
              .remittance-info {
                background: #fef3c7;
                padding: 12px;
                border-radius: 4px;
                border: 1px solid #fbbf24;
                margin-top: 10px;
              }
              .remittance-item {
                margin-bottom: 10px;
                padding-bottom: 8px;
                border-bottom: 1px solid #fde68a;
              }
              .remittance-item:last-child {
                border-bottom: none;
              }
              .remittance-item strong {
                font-size: 11px;
                color: #92400e;
              }
              .remittance-item p {
                font-size: 10px;
                color: #78350f;
                margin: 2px 0;
                padding-left: 10px;
              }
              .warning {
                font-size: 10px;
                color: #92400e;
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid #fde68a;
                font-weight: 500;
              }
              .summary-box {
                background: #f0f9ff;
                border: 2px solid #0ea5e9;
                padding: 15px;
                border-radius: 4px;
                margin: 20px 0;
              }
              .summary-box .row {
                border-bottom: 1px solid #bae6fd;
                font-size: 12px;
              }
              .summary-box .row.total {
                border-top: 2px solid #0ea5e9;
                border-bottom: 2px solid #0ea5e9;
                font-size: 14px;
              }
              .footer {
                margin-top: 30px;
                padding-top: 15px;
                border-top: 1px solid #d1d5db;
                text-align: center;
                font-size: 10px;
                color: #6b7280;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="header-content">
                <h1>Salary Breakdown</h1>
                <p>Period: ${payroll.period} | Generated: ${format(new Date(payroll.generatedAt), 'MMM dd, yyyy')}</p>
              </div>
              <img src="${logoUrl}" alt="OTax Logo" class="header-logo" onerror="this.style.display='none'" />
            </div>

            <div class="employee-info">
              <h2>${item.employeeName}</h2>
              ${item.employeeNumber ? `<p><strong>Employee ID:</strong> ${item.employeeNumber}</p>` : ''}
              ${item.employeeEmail ? `<p><strong>Email:</strong> ${item.employeeEmail}</p>` : ''}
              ${item.taxId ? `<p><strong>Tax ID:</strong> ${item.taxId}</p>` : ''}
            </div>

            <div class="summary-box">
              <div class="row">
                <span class="label">Gross Salary</span>
                <span class="amount">${formatCurrency(item.grossSalary)}</span>
              </div>
              <div class="row">
                <span class="label">Total Deductions</span>
                <span class="amount" style="color: #dc2626;">${formatCurrency(item.totalDeductions)}</span>
              </div>
              <div class="row total">
                <span class="label">Net Salary</span>
                <span class="amount" style="color: #2563eb; font-size: 16px;">${formatCurrency(item.netSalary)}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Earnings</div>
              <div class="row">
                <span class="label">Basic Salary</span>
                <span class="amount">${formatCurrency(item.basicSalary)}</span>
              </div>
              ${item.allowances && item.allowances.length > 0 ? item.allowances.map((allowance: { name: string; amount: number; taxable: boolean }) => `
                <div class="row sub-item">
                  <span class="label">
                    ${allowance.name}
                    ${!allowance.taxable ? '<span class="badge">Non-taxable</span>' : ''}
                  </span>
                  <span class="amount">${formatCurrency(allowance.amount)}</span>
                </div>
              `).join('') : ''}
              <div class="row total">
                <span class="label">Gross Salary</span>
                <span class="amount">${formatCurrency(item.grossSalary)}</span>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Deductions</div>
              <div class="row">
                <span class="label">Pension (Employee) - 8%</span>
                <span class="amount">${formatCurrency(item.pension.employee)}</span>
              </div>
              ${item.pension.employer > 0 ? `
                <div class="row sub-item">
                  <span class="label">Pension (Employer) - 10%</span>
                  <span class="amount">${formatCurrency(item.pension.employer)}</span>
                </div>
              ` : ''}
              ${item.nhf ? `
                <div class="row">
                  <span class="label">NHF (2.5%)</span>
                  <span class="amount">${formatCurrency(item.nhf.amount)}</span>
                </div>
              ` : ''}
              ${item.nhis ? `
                <div class="row">
                  <span class="label">NHIS</span>
                  <span class="amount">${formatCurrency(item.nhis.amount)}</span>
                </div>
              ` : ''}
              <div class="row">
                <span class="label">PAYE Tax</span>
                <span class="amount" style="color: #dc2626;">${formatCurrency(item.paye.amount)}</span>
              </div>
              ${item.otherDeductions && item.otherDeductions.length > 0 ? item.otherDeductions.map((deduction: { name: string; amount: number }) => `
                <div class="row sub-item">
                  <span class="label">${deduction.name}</span>
                  <span class="amount">${formatCurrency(deduction.amount)}</span>
                </div>
              `).join('') : ''}
              <div class="row total">
                <span class="label">Total Deductions</span>
                <span class="amount" style="color: #dc2626;">${formatCurrency(item.totalDeductions)}</span>
              </div>
            </div>

            ${item.paye.taxBreakdown ? `
              <div class="section">
                <div class="section-title">Tax Calculation Breakdown (2026 Tax Reform)</div>
                <div class="tax-breakdown">
                  <div class="row">
                    <span class="label">Annual Gross Income</span>
                    <span class="amount">${formatCurrency(item.paye.taxBreakdown.grossIncome)}</span>
                  </div>
                  ${item.paye.taxBreakdown.reliefs ? `
                    <div class="reliefs">
                      <div class="reliefs-title">Reliefs Applied:</div>
                      ${item.paye.taxBreakdown.reliefs.rentRelief > 0 ? `
                        <div class="row sub-item">
                          <span class="label">Rent Relief (20% capped at ₦500K)</span>
                          <span class="amount">${formatCurrency(item.paye.taxBreakdown.reliefs.rentRelief)}</span>
                        </div>
                      ` : ''}
                      ${item.paye.taxBreakdown.reliefs.pension > 0 ? `
                        <div class="row sub-item">
                          <span class="label">Pension Contribution</span>
                          <span class="amount">${formatCurrency(item.paye.taxBreakdown.reliefs.pension)}</span>
                        </div>
                      ` : ''}
                      ${item.paye.taxBreakdown.reliefs.housingFund > 0 ? `
                        <div class="row sub-item">
                          <span class="label">NHF</span>
                          <span class="amount">${formatCurrency(item.paye.taxBreakdown.reliefs.housingFund)}</span>
                        </div>
                      ` : ''}
                      ${item.paye.taxBreakdown.reliefs.healthInsurance > 0 ? `
                        <div class="row sub-item">
                          <span class="label">NHIS</span>
                          <span class="amount">${formatCurrency(item.paye.taxBreakdown.reliefs.healthInsurance)}</span>
                        </div>
                      ` : ''}
                      ${item.paye.taxBreakdown.reliefs.transportAllowance > 0 ? `
                        <div class="row sub-item">
                          <span class="label">Transport Allowance (exempt)</span>
                          <span class="amount">${formatCurrency(item.paye.taxBreakdown.reliefs.transportAllowance)}</span>
                        </div>
                      ` : ''}
                      <div class="row total">
                        <span class="label">Total Reliefs</span>
                        <span class="amount">${formatCurrency(item.paye.taxBreakdown.totalReliefs)}</span>
                      </div>
                    </div>
                  ` : ''}
                  <div class="row">
                    <span class="label">Annual Taxable Income</span>
                    <span class="amount">${formatCurrency(item.paye.taxBreakdown.taxableIncome)}</span>
                  </div>
                  ${item.paye.taxBreakdown.taxBrackets && item.paye.taxBreakdown.taxBrackets.length > 0 ? `
                    <div class="reliefs">
                      <div class="reliefs-title">Tax by Bracket:</div>
                      ${item.paye.taxBreakdown.taxBrackets.map((bracket: any) => {
                        let bracketLabel = ''
                        if (bracket.rate === 0) bracketLabel = 'First ₦800,000 (0%)'
                        else if (bracket.rate === 15) bracketLabel = '₦800K - ₦3M (15%)'
                        else if (bracket.rate === 18) bracketLabel = '₦3M - ₦12M (18%)'
                        else if (bracket.rate === 21) bracketLabel = '₦12M - ₦25M (21%)'
                        else if (bracket.rate === 23) bracketLabel = '₦25M - ₦50M (23%)'
                        else bracketLabel = `Above ₦50M (25%)`
                        return `
                          <div class="row sub-item">
                            <span class="label">${bracketLabel}</span>
                            <span class="amount">${formatCurrency(bracket.tax)}</span>
                          </div>
                        `
                      }).join('')}
                    </div>
                  ` : ''}
                  <div class="row total">
                    <span class="label">Annual Tax Payable</span>
                    <span class="amount">${formatCurrency(item.paye.taxBreakdown.totalTax)}</span>
                  </div>
                  <div class="row sub-item">
                    <span class="label">Monthly PAYE (Annual ÷ 12)</span>
                    <span class="amount">${formatCurrency(item.paye.amount)}</span>
                  </div>
                  ${item.paye.taxBreakdown.effectiveRate ? `
                    <div class="row sub-item">
                      <span class="label">Effective Tax Rate</span>
                      <span class="amount">${item.paye.taxBreakdown.effectiveRate}%</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            ` : ''}


            <div class="footer">
              <p>This is a computer-generated document. For queries, contact your HR department.</p>
              <p>OTax - Tax Management System | ${format(new Date(), 'MMMM dd, yyyy')}</p>
            </div>
          </body>
        </html>
      `

      printWindow.document.write(printContent)
      printWindow.document.close()
      
      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.focus()
        printWindow.print()
        toast.success('Print dialog opened')
      }, 250)
    } catch (error) {
      console.error('Error printing payroll slip:', error)
      toast.error('Failed to print payroll slip')
    }
  }

  const printPayrollSummary = (payroll: Payroll) => {
    try {
      const printWindow = window.open('', '_blank', 'width=800,height=600')
      if (!printWindow) {
        toast.error('Please allow popups to print')
        return
      }

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Payroll Summary - ${payroll.period}</title>
            <style>
              @media print {
                @page {
                  margin: 15mm;
                  size: A4;
                }
                body {
                  margin: 0;
                  padding: 0;
                }
                .no-print {
                  display: none;
                }
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                font-size: 11px;
                line-height: 1.5;
                color: #000;
                background: #fff;
                padding: 20px;
              }
              .header {
                text-align: center;
                border-bottom: 2px solid #000;
                padding-bottom: 15px;
                margin-bottom: 20px;
              }
              .header h1 {
                font-size: 22px;
                font-weight: bold;
                color: #2563eb;
                margin-bottom: 5px;
              }
              .header p {
                font-size: 12px;
                color: #666;
              }
              .summary-box {
                background: #f0f9ff;
                border: 2px solid #0ea5e9;
                padding: 15px;
                border-radius: 4px;
                margin: 20px 0;
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 15px;
              }
              .summary-item {
                text-align: center;
              }
              .summary-item label {
                display: block;
                font-size: 10px;
                color: #6b7280;
                margin-bottom: 5px;
              }
              .summary-item .value {
                font-size: 16px;
                font-weight: bold;
                color: #111827;
              }
              .summary-item .value.net {
                color: #2563eb;
                font-size: 18px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
                font-size: 10px;
              }
              thead {
                background: #f3f4f6;
                border-bottom: 2px solid #000;
              }
              th {
                padding: 8px;
                text-align: left;
                font-weight: bold;
                font-size: 11px;
              }
              td {
                padding: 6px 8px;
                border-bottom: 1px solid #e5e7eb;
              }
              tbody tr:hover {
                background: #f9fafb;
              }
              .footer {
                margin-top: 30px;
                padding-top: 15px;
                border-top: 1px solid #d1d5db;
                text-align: center;
                font-size: 10px;
                color: #6b7280;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>OTax Payroll Summary</h1>
              <p>Period: ${payroll.period} | Generated: ${format(new Date(payroll.generatedAt), 'MMM dd, yyyy')}</p>
              <p>Template: ${payroll.templateName} | Employees: ${payroll.items.length}</p>
            </div>

            <div class="summary-box">
              <div class="summary-item">
                <label>Total Gross</label>
                <div class="value">${formatCurrency(payroll.totalGrossSalary)}</div>
              </div>
              <div class="summary-item">
                <label>Total Deductions</label>
                <div class="value" style="color: #dc2626;">${formatCurrency(payroll.totalDeductions)}</div>
              </div>
              <div class="summary-item">
                <label>Total Net</label>
                <div class="value net">${formatCurrency(payroll.totalNetSalary)}</div>
              </div>
              <div class="summary-item">
                <label>Total PAYE</label>
                <div class="value">${formatCurrency(payroll.totalPAYE)}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Employee ID</th>
                  <th style="text-align: right;">Gross</th>
                  <th style="text-align: right;">Deductions</th>
                  <th style="text-align: right;">PAYE</th>
                  <th style="text-align: right;">Net</th>
                </tr>
              </thead>
              <tbody>
                ${payroll.items.map(item => `
                  <tr>
                    <td>${item.employeeName}</td>
                    <td>${item.employeeNumber || '-'}</td>
                    <td style="text-align: right;">${formatCurrency(item.grossSalary)}</td>
                    <td style="text-align: right;">${formatCurrency(item.totalDeductions)}</td>
                    <td style="text-align: right;">${formatCurrency(item.paye.amount)}</td>
                    <td style="text-align: right; font-weight: bold;">${formatCurrency(item.netSalary)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="footer">
              <p>This is a computer-generated document. For queries, contact your HR department.</p>
              <p>OTax - Tax Management System | ${format(new Date(), 'MMMM dd, yyyy')}</p>
            </div>
          </body>
        </html>
      `

      printWindow.document.write(printContent)
      printWindow.document.close()
      
      // Wait for content to load, then print
      setTimeout(() => {
        printWindow.focus()
        printWindow.print()
        toast.success('Print dialog opened')
      }, 250)
    } catch (error) {
      console.error('Error printing payroll summary:', error)
      toast.error('Failed to print payroll summary')
    }
  }

  // State for expanded employee breakdowns
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set())
  
  const toggleEmployeeExpansion = (employeeId: string) => {
    setExpandedEmployees(prev => {
      const newSet = new Set(prev)
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId)
      } else {
        newSet.add(employeeId)
      }
      return newSet
    })
  }

  const sendPayrollEmails = async (payroll: Payroll, employeeIds?: string[]) => {
    if (!user) return

    setSendingEmails(payroll.id)
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/payroll/send-email', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          payrollId: payroll.id,
          employeeIds
        })
      })

      const data = await response.json()
      if (data.success) {
        toast.success(`Emails sent: ${data.data.emailsSent}, Failed: ${data.data.emailsFailed}`)
        fetchPayrolls()
      } else {
        toast.error(data.error || 'Failed to send emails')
      }
    } catch (error: any) {
      console.error('Error sending emails:', error)
      toast.error(error.message || 'Failed to send emails')
    } finally {
      setSendingEmails(null)
    }
  }

  const handleDeleteTemplate = async () => {
    if (!user || !templateToDelete) return

    setDeletingTemplate(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/payroll/templates/${templateToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Template deleted successfully')
        fetchTemplates()
        setDeleteTemplateDialogOpen(false)
        setTemplateToDelete(null)
        // If deleted template was selected, clear selection
        if (selectedTemplateId === templateToDelete.id) {
          setSelectedTemplateId('')
        }
      } else {
        toast.error(data.error || 'Failed to delete template')
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('Failed to delete template')
    } finally {
      setDeletingTemplate(false)
    }
  }

  const handleUpdateTemplate = async (templateData: {
    name: string
    description?: string
    allowances: any[]
    deductions: any[]
    companySettings?: any
  }) => {
    if (!user || !editingTemplate) return

    setUpdatingTemplate(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/payroll/templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(templateData)
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Template updated successfully')
        fetchTemplates()
        setShowEditTemplateDialog(false)
        setEditingTemplate(null)
        // Update selected template if it was the one being edited
        if (selectedTemplateId === editingTemplate.id) {
          setSelectedTemplateId(editingTemplate.id) // Keep same ID, data will refresh
        }
      } else {
        toast.error(data.error || 'Failed to update template')
      }
    } catch (error) {
      console.error('Error updating template:', error)
      toast.error('Failed to update template')
    } finally {
      setUpdatingTemplate(false)
    }
  }

  const handleDeleteClick = (payroll: Payroll) => {
    setPayrollToDelete(payroll)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!user || !payrollToDelete) return

    setDeleting(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/payroll/${payrollToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Payroll deleted successfully')
        fetchPayrolls()
        setDeleteDialogOpen(false)
        setPayrollToDelete(null)
        // Close payroll dialog if it's open for the deleted payroll
        if (selectedPayroll?.id === payrollToDelete.id) {
          setShowPayrollDialog(false)
          setSelectedPayroll(null)
        }
      } else {
        toast.error(data.error || 'Failed to delete payroll')
      }
    } catch (error) {
      console.error('Error deleting payroll:', error)
      toast.error('Failed to delete payroll')
    } finally {
      setDeleting(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ]

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  if (loading) {
  return (
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Payroll</h1>
          <p className="text-sm text-muted-foreground mt-1">Generate and manage employee payroll</p>
      </div>
        <Button onClick={() => setShowTemplateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      <Tabs defaultValue="generate" className="space-y-4">
        <TabsList>
          <TabsTrigger value="generate">Generate Payroll</TabsTrigger>
          <TabsTrigger value="history">Payroll History</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
      <Card>
        <CardHeader>
              <CardTitle>Generate Payroll</CardTitle>
              <CardDescription>Select a template and period to generate payroll for all active employees</CardDescription>
        </CardHeader>
            <CardContent className="space-y-4">
              {/* Template Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Payroll Template</Label>
                  {selectedTemplateId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const template = templates.find(t => t.id === selectedTemplateId)
                        if (template) {
                          setSelectedTemplate(template)
                          setShowTemplateViewDialog(true)
                        }
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Template
                    </Button>
                  )}
                </div>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates
                      .filter((template, index, self) => 
                        index === self.findIndex(t => t.id === template.id)
                      )
                      .map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} {template.isDefault && '(Default)'}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {templates.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No templates found. Create a default template to get started.
                  </p>
                )}
              </div>

              {/* Year */}
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(year => (
                      <SelectItem key={String(year)} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Payroll will be generated for all 12 months of the selected year
                </p>
              </div>

              <Button 
                onClick={generatePayroll} 
                disabled={!selectedTemplateId || !selectedYear || generating}
                className="w-full"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Payroll
                  </>
                )}
              </Button>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payroll History</CardTitle>
              <CardDescription>View and manage generated payrolls</CardDescription>
            </CardHeader>
            <CardContent>
              {payrolls.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No payrolls generated yet</p>
    </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Template</TableHead>
                        <TableHead>Employees</TableHead>
                        <TableHead>Total Net</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrolls.map(payroll => (
                        <TableRow key={payroll.id}>
                          <TableCell className="font-medium">{payroll.period}</TableCell>
                          <TableCell>{payroll.templateName}</TableCell>
                          <TableCell>{payroll.items.length}</TableCell>
                          <TableCell>{formatCurrency(payroll.totalNetSalary)}</TableCell>
                          <TableCell>
                            <Badge variant={
                              payroll.status === 'sent' ? 'default' :
                              payroll.status === 'generated' ? 'secondary' :
                              'outline'
                            }>
                              {payroll.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedPayroll(payroll)
                                  setShowPayrollDialog(true)
                                }}
                                title="View Payroll Details"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => sendPayrollEmails(payroll)}
                                disabled={sendingEmails === payroll.id}
                                title="Send Payroll Emails"
                              >
                                {sendingEmails === payroll.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Mail className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(payroll)}
                                className="text-destructive hover:text-destructive"
                                title="Delete Payroll"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payroll Templates</CardTitle>
                  <CardDescription>Manage your payroll templates</CardDescription>
                </div>
                <Button onClick={() => setShowTemplateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Templates Found</h3>
                  <p className="text-sm mb-6">
                    You don't have any payroll templates yet. Create a default template to get started with standard allowances and deductions, or create a custom template.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <Button onClick={() => setShowTemplateDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Template
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Allowances</TableHead>
                        <TableHead>Deductions</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {templates.map(template => (
                        <TableRow key={template.id}>
                          <TableCell className="font-medium">
                            {template.name}
                            {template.isDefault && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                Default
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {template.description || '-'}
                          </TableCell>
                          <TableCell>{template.allowances.length}</TableCell>
                          <TableCell>{template.deductions.length}</TableCell>
                          <TableCell>
                            <Badge variant={template.isDefault ? 'default' : 'outline'}>
                              {template.isDefault ? 'System' : 'Custom'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedTemplate(template)
                                  setShowTemplateViewDialog(true)
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {!template.isDefault && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingTemplate(template)
                                      setShowEditTemplateDialog(true)
                                    }}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setTemplateToDelete(template)
                                      setDeleteTemplateDialogOpen(true)
                                    }}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Payroll Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the payroll for <strong>{payrollToDelete?.period}</strong>? 
              This action cannot be undone. All payroll data, including employee payslips, will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete} 
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Template Confirmation Dialog */}
      <AlertDialog open={deleteTemplateDialogOpen} onOpenChange={setDeleteTemplateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Template Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the template <strong>"{templateToDelete?.name}"</strong>? 
              This action cannot be undone. Any payrolls generated using this template will remain, but you won't be able to use this template for future payrolls.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingTemplate}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTemplate} 
              disabled={deletingTemplate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingTemplate ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Template'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Payroll Template</DialogTitle>
            <DialogDescription>
              Create a new payroll template. You can create a default template or a custom template.
            </DialogDescription>
          </DialogHeader>
          <CreateTemplateForm
            onSave={async (isDefault: boolean) => {
              if (isDefault) {
                await createDefaultTemplate()
              } else {
                // Custom template creation will be handled by the form
                await fetchTemplates()
                setShowTemplateDialog(false)
              }
            }}
            onCancel={() => setShowTemplateDialog(false)}
            templates={templates}
          />
        </DialogContent>
      </Dialog>

      {/* Payroll View Dialog */}
      <Dialog open={showPayrollDialog} onOpenChange={(open) => {
        setShowPayrollDialog(open)
        if (!open) {
          setExpandedEmployees(new Set())
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payroll Details - {selectedPayroll?.period}</DialogTitle>
            <DialogDescription>
              {selectedPayroll?.items.length} employees • Generated on {selectedPayroll && format(new Date(selectedPayroll.generatedAt), 'MMM dd, yyyy')}
            </DialogDescription>
          </DialogHeader>
          {selectedPayroll && (
            <div className="space-y-4">
              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Gross</p>
                      <p className="text-lg font-semibold">{formatCurrency(selectedPayroll.totalGrossSalary)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Deductions</p>
                      <p className="text-lg font-semibold">{formatCurrency(selectedPayroll.totalDeductions)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Net</p>
                      <p className="text-lg font-semibold text-primary">{formatCurrency(selectedPayroll.totalNetSalary)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total PAYE</p>
                      <p className="text-lg font-semibold">{formatCurrency(selectedPayroll.totalPAYE)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Employee List with Detailed Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Employee Payroll</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedPayroll.items.map((item, index) => {
                      const isExpanded = expandedEmployees.has(item.employeeId)
                      return (
                        <Card key={item.employeeId || index} className="overflow-hidden">
                          <div 
                            className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => toggleEmployeeExpansion(item.employeeId)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <h3 className="font-semibold text-base">{item.employeeName}</h3>
                                  {item.employeeNumber && (
                                    <Badge variant="outline" className="text-xs">
                                      {item.employeeNumber}
                                    </Badge>
                                  )}
                                </div>
                                {item.employeeEmail && (
                                  <p className="text-sm text-muted-foreground mt-1">{item.employeeEmail}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-6 mr-4">
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">Gross</p>
                                  <p className="font-semibold">{formatCurrency(item.grossSalary)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">Deductions</p>
                                  <p className="font-semibold text-destructive">{formatCurrency(item.totalDeductions)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">Net</p>
                                  <p className="font-semibold text-primary text-lg">{formatCurrency(item.netSalary)}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    router.push(`/dashboard-sme/employees/${item.employeeId}`)
                                  }}
                                  title="View Employee Details & Payment History"
                                >
                                  <User className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleEmployeeExpansion(item.employeeId)
                                  }}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="border-t bg-muted/30 p-4 space-y-4">
                              {/* Earnings Breakdown */}
                              <div>
                                <h4 className="text-sm font-semibold mb-3">Earnings</h4>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Basic Salary</span>
                                    <span className="font-medium">{formatCurrency(item.basicSalary)}</span>
                                  </div>
                                  {item.allowances && item.allowances.length > 0 && (
                                    <>
                                      {item.allowances.map((allowance, idx) => (
                                        <div key={idx} className="flex justify-between text-sm pl-4">
                                          <span className="text-muted-foreground">
                                            {allowance.name}
                                            {!allowance.taxable && (
                                              <Badge variant="secondary" className="ml-2 text-xs">Non-taxable</Badge>
                                            )}
                                          </span>
                                          <span className="font-medium">{formatCurrency(allowance.amount)}</span>
                                        </div>
                                      ))}
                                    </>
                                  )}
                                  <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                                    <span>Gross Salary</span>
                                    <span>{formatCurrency(item.grossSalary)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Deductions Breakdown */}
                              <div>
                                <h4 className="text-sm font-semibold mb-3">Deductions</h4>
                                <div className="space-y-2">
                                  {/* Pension */}
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">
                                      Pension (Employee) - 8%
                                    </span>
                                    <span className="font-medium">{formatCurrency(item.pension.employee)}</span>
                                  </div>
                                  {item.pension.employer > 0 && (
                                    <div className="flex justify-between text-sm pl-4">
                                      <span className="text-muted-foreground text-xs">Pension (Employer) - 10%</span>
                                      <span className="font-medium text-xs">{formatCurrency(item.pension.employer)}</span>
                                    </div>
                                  )}

                                  {/* NHF */}
                                  {item.nhf && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">NHF (2.5%)</span>
                                      <span className="font-medium">{formatCurrency(item.nhf.amount)}</span>
                                    </div>
                                  )}

                                  {/* NHIS */}
                                  {item.nhis && (
                                    <div className="flex justify-between text-sm">
                                      <span className="text-muted-foreground">NHIS</span>
                                      <span className="font-medium">{formatCurrency(item.nhis.amount)}</span>
                                    </div>
                                  )}

                                  {/* PAYE */}
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">PAYE Tax</span>
                                    <span className="font-medium text-destructive">{formatCurrency(item.paye.amount)}</span>
                                  </div>

                                  {/* Other Deductions */}
                                  {item.otherDeductions && item.otherDeductions.length > 0 && (
                                    <>
                                      {item.otherDeductions.map((deduction, idx) => (
                                        <div key={idx} className="flex justify-between text-sm pl-4">
                                          <span className="text-muted-foreground">{deduction.name}</span>
                                          <span className="font-medium">{formatCurrency(deduction.amount)}</span>
                                        </div>
                                      ))}
                                    </>
                                  )}

                                  <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                                    <span>Total Deductions</span>
                                    <span className="text-destructive">{formatCurrency(item.totalDeductions)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Tax Breakdown */}
                              {item.paye.taxBreakdown && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-3">Tax Calculation Breakdown (2026 Tax Reform)</h4>
                                  <div className="space-y-2 text-sm bg-background p-3 rounded-lg border">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Annual Gross Income</span>
                                      <span className="font-medium">{formatCurrency(item.paye.taxBreakdown.grossIncome)}</span>
                                    </div>
                                    
                                    {item.paye.taxBreakdown.reliefs && (
                                      <div className="mt-2 pt-2 border-t">
                                        <p className="text-xs font-semibold text-muted-foreground mb-2">Reliefs Applied:</p>
                                        {item.paye.taxBreakdown.reliefs.rentRelief > 0 && (
                                          <div className="flex justify-between text-xs pl-2">
                                            <span className="text-muted-foreground">Rent Relief (20% capped at ₦500K)</span>
                                            <span>{formatCurrency(item.paye.taxBreakdown.reliefs.rentRelief)}</span>
                                          </div>
                                        )}
                                        {item.paye.taxBreakdown.reliefs.pension > 0 && (
                                          <div className="flex justify-between text-xs pl-2">
                                            <span className="text-muted-foreground">Pension Contribution</span>
                                            <span>{formatCurrency(item.paye.taxBreakdown.reliefs.pension)}</span>
                                          </div>
                                        )}
                                        {item.paye.taxBreakdown.reliefs.housingFund > 0 && (
                                          <div className="flex justify-between text-xs pl-2">
                                            <span className="text-muted-foreground">NHF</span>
                                            <span>{formatCurrency(item.paye.taxBreakdown.reliefs.housingFund)}</span>
                                          </div>
                                        )}
                                        {item.paye.taxBreakdown.reliefs.healthInsurance > 0 && (
                                          <div className="flex justify-between text-xs pl-2">
                                            <span className="text-muted-foreground">NHIS</span>
                                            <span>{formatCurrency(item.paye.taxBreakdown.reliefs.healthInsurance)}</span>
                                          </div>
                                        )}
                                        {item.paye.taxBreakdown.reliefs.transportAllowance > 0 && (
                                          <div className="flex justify-between text-xs pl-2">
                                            <span className="text-muted-foreground">Transport Allowance (exempt)</span>
                                            <span>{formatCurrency(item.paye.taxBreakdown.reliefs.transportAllowance)}</span>
                                          </div>
                                        )}
                                        <div className="flex justify-between text-xs font-medium pt-1 border-t mt-1">
                                          <span>Total Reliefs</span>
                                          <span>{formatCurrency(item.paye.taxBreakdown.totalReliefs)}</span>
                                        </div>
                                      </div>
                                    )}

                                    <div className="flex justify-between pt-2 border-t mt-2">
                                      <span className="text-muted-foreground">Annual Taxable Income</span>
                                      <span className="font-medium">{formatCurrency(item.paye.taxBreakdown.taxableIncome)}</span>
                                    </div>

                                    {item.paye.taxBreakdown.taxBrackets && item.paye.taxBreakdown.taxBrackets.length > 0 && (
                                      <div className="mt-2 pt-2 border-t">
                                        <p className="text-xs font-semibold text-muted-foreground mb-2">Tax by Bracket:</p>
                                        {item.paye.taxBreakdown.taxBrackets.map((bracket: any, idx: number) => (
                                          <div key={idx} className="flex justify-between text-xs pl-2 mb-1">
                                            <span className="text-muted-foreground">
                                              {bracket.rate === 0 
                                                ? 'First ₦800,000 (0%)'
                                                : bracket.rate === 15
                                                ? '₦800K - ₦3M (15%)'
                                                : bracket.rate === 18
                                                ? '₦3M - ₦12M (18%)'
                                                : bracket.rate === 21
                                                ? '₦12M - ₦25M (21%)'
                                                : bracket.rate === 23
                                                ? '₦25M - ₦50M (23%)'
                                                : `Above ₦50M (25%)`}
                                            </span>
                                            <span>{formatCurrency(bracket.tax)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}

                                    <div className="flex justify-between pt-2 border-t mt-2 font-semibold">
                                      <span>Annual Tax Payable</span>
                                      <span>{formatCurrency(item.paye.taxBreakdown.totalTax)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                      <span>Monthly PAYE (Annual ÷ 12)</span>
                                      <span>{formatCurrency(item.paye.amount)}</span>
                                    </div>
                                    {item.paye.taxBreakdown.effectiveRate && (
                                      <div className="flex justify-between text-xs text-muted-foreground pt-1">
                                        <span>Effective Tax Rate</span>
                                        <span>{item.paye.taxBreakdown.effectiveRate}%</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Remittance Information */}
                              {item.remittanceInfo && (
                                <div>
                                  <h4 className="text-sm font-semibold mb-3">Remittance Information</h4>
                                  <div className="space-y-2 text-sm bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                                    <div>
                                      <p className="font-medium text-xs mb-1">PAYE: {formatCurrency(item.remittanceInfo.paye.amount)}</p>
                                      <p className="text-xs text-muted-foreground pl-2">
                                        Remit to: {item.remittanceInfo.paye.authorityName || (item.remittanceInfo.paye.authority === 'state-irs' ? 'State IRS' : 'NRS')}
                                      </p>
                                      <p className="text-xs text-muted-foreground pl-2">
                                        Deadline: {format(new Date(item.remittanceInfo.paye.deadline), 'MMM dd, yyyy')} (10th of next month)
                                      </p>
                                    </div>
                                    <div>
                                      <p className="font-medium text-xs mb-1">
                                        Pension: {formatCurrency(item.remittanceInfo.pension.totalAmount)} 
                                        {' '}(Employee: {formatCurrency(item.remittanceInfo.pension.employeeAmount)}, 
                                        {' '}Employer: {formatCurrency(item.remittanceInfo.pension.employerAmount)})
                                      </p>
                                      <p className="text-xs text-muted-foreground pl-2">
                                        Remit to: PFA (Pension Fund Administrator)
                                      </p>
                                      <p className="text-xs text-muted-foreground pl-2">
                                        Deadline: {format(new Date(item.remittanceInfo.pension.deadline), 'MMM dd, yyyy')} (7 days after payment)
                                      </p>
                                    </div>
                                    {item.remittanceInfo.nhf && (
                                      <div>
                                        <p className="font-medium text-xs mb-1">NHF: {formatCurrency(item.remittanceInfo.nhf.amount)}</p>
                                        <p className="text-xs text-muted-foreground pl-2">
                                          Remit to: Federal Mortgage Bank
                                        </p>
                                        <p className="text-xs text-muted-foreground pl-2">
                                          Deadline: {format(new Date(item.remittanceInfo.nhf.deadline), 'MMM dd, yyyy')}
                                        </p>
                                      </div>
                                    )}
                                    {item.remittanceInfo.nhis && (
                                      <div>
                                        <p className="font-medium text-xs mb-1">NHIS: {formatCurrency(item.remittanceInfo.nhis.amount)}</p>
                                        <p className="text-xs text-muted-foreground pl-2">
                                          Remit to: HMO (Health Maintenance Organization)
                                        </p>
                                        <p className="text-xs text-muted-foreground pl-2">
                                          Deadline: {format(new Date(item.remittanceInfo.nhis.deadline), 'MMM dd, yyyy')}
                                        </p>
                                      </div>
                                    )}
                                    <p className="text-xs text-amber-800 dark:text-amber-200 mt-2 pt-2 border-t border-amber-300 dark:border-amber-700">
                                      ⚠️ Late remittance attracts penalties (10% per annum + CBN rate interest)
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex items-center gap-2 pt-2 border-t">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    printPayrollSlip(selectedPayroll, item)
                                  }}
                                  className="flex-1"
                                >
                                  <Printer className="w-4 h-4 mr-2" />
                                  Print Slip
                                </Button>
                                {item.employeeEmail && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      sendPayrollEmails(selectedPayroll, [item.employeeId])
                                    }}
                                    disabled={sendingEmails === selectedPayroll.id}
                                    className="flex-1"
                                  >
                                    {sendingEmails === selectedPayroll.id ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Sending...
                                      </>
                                    ) : (
                                      <>
                                        <Mail className="w-4 h-4 mr-2" />
                                        Send Email
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => printPayrollSummary(selectedPayroll)}
                  className="flex-1"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Summary
                </Button>
                <Button
                  onClick={() => sendPayrollEmails(selectedPayroll)}
                  disabled={sendingEmails === selectedPayroll.id}
                  className="flex-1"
                >
                  {sendingEmails === selectedPayroll.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send to All Employees
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Template View Dialog */}
      <Dialog open={showTemplateViewDialog} onOpenChange={setShowTemplateViewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.description || 'Payroll template configuration'}
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-6">
              {/* Tax Calculation Method - 2026 Compliance */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    2026 Tax Reform Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold">PAYE Tax Calculation:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                      <li>First ₦800,000 annual income: <strong className="text-foreground">0%</strong> (tax-free)</li>
                      <li>₦800,000 - ₦3,000,000: <strong className="text-foreground">15%</strong></li>
                      <li>₦3,000,000 - ₦12,000,000: <strong className="text-foreground">18%</strong></li>
                      <li>₦12,000,000 - ₦25,000,000: <strong className="text-foreground">21%</strong></li>
                      <li>₦25,000,000 - ₦50,000,000: <strong className="text-foreground">23%</strong></li>
                      <li>Above ₦50,000,000: <strong className="text-foreground">25%</strong></li>
                    </ul>
                  </div>
                  <div className="space-y-2 text-sm pt-2 border-t">
                    <p className="font-semibold">Reliefs & Deductions:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                      <li><strong className="text-foreground">Rent Relief:</strong> 20% of annual rent paid, capped at ₦500,000/year</li>
                      <li><strong className="text-foreground">Pension:</strong> Employee 8%, Employer 10% of (basic + transport + housing allowance)</li>
                      <li><strong className="text-foreground">NHF:</strong> 2.5% of basic salary (if applicable)</li>
                      <li><strong className="text-foreground">NHIS:</strong> As configured (if applicable)</li>
                      <li><strong className="text-foreground">Transport Allowance:</strong> Up to ₦360,000/year exempt</li>
                    </ul>
                  </div>
                  <div className="space-y-2 text-sm pt-2 border-t">
                    <p className="font-semibold">Remittance Requirements:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                      <li><strong className="text-foreground">PAYE:</strong> Remit by 10th of next month to State IRS or NRS</li>
                      <li><strong className="text-foreground">Pension:</strong> Remit to PFA within 7 days of salary payment</li>
                      <li><strong className="text-foreground">NHF:</strong> Remit to Federal Mortgage Bank</li>
                      <li><strong className="text-foreground">NHIS:</strong> Remit to HMO as per agreement</li>
                    </ul>
                  </div>
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      <strong>⚠️ Compliance Note:</strong> Late remittance of PAYE attracts penalties (10% per annum + CBN rate interest). 
                      Directors can be personally liable for non-compliance.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Company Settings */}
              {selectedTemplate.companySettings && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Company Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Pension Enabled</span>
                      <Badge variant={selectedTemplate.companySettings.pensionEnabled ? 'default' : 'secondary'}>
                        {selectedTemplate.companySettings.pensionEnabled ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    {selectedTemplate.companySettings.pensionEnabled && (
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Pension Rates</span>
                        <span>Employee: 8%, Employer: 10%</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm">NHF Enabled</span>
                      <Badge variant={selectedTemplate.companySettings.nhfEnabled ? 'default' : 'secondary'}>
                        {selectedTemplate.companySettings.nhfEnabled ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    {selectedTemplate.companySettings.nhfEnabled && (
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>NHF Rate</span>
                        <span>{selectedTemplate.companySettings.nhfRate || 2.5}%</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm">NHIS Enabled</span>
                      <Badge variant={selectedTemplate.companySettings.nhisEnabled ? 'default' : 'secondary'}>
                        {selectedTemplate.companySettings.nhisEnabled ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    {selectedTemplate.companySettings.nhisEnabled && (
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>NHIS Amount</span>
                        <span>₦{selectedTemplate.companySettings.nhisAmount?.toLocaleString('en-NG') || '0'}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Allowances */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Allowances</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedTemplate.allowances.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No allowances configured</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedTemplate.allowances.map((allowance, index) => (
                        <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{allowance.name}</span>
                              <Badge variant={allowance.taxable ? 'default' : 'secondary'} className="text-xs">
                                {allowance.taxable ? 'Taxable' : 'Non-taxable'}
                              </Badge>
                              {allowance.category && (
                                <Badge variant="outline" className="text-xs">
                                  {allowance.category}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {allowance.type === 'fixed' 
                                ? `Fixed: ₦${(allowance.amount || 0).toLocaleString('en-NG')}`
                                : `Percentage: ${allowance.percentage || 0}% of basic salary`
                              }
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Deductions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Deductions</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedTemplate.deductions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No deductions configured</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedTemplate.deductions.map((deduction, index) => (
                        <div key={index} className="flex items-start justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{deduction.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {deduction.category}
                              </Badge>
                              {deduction.applicable !== undefined && (
                                <Badge variant={deduction.applicable ? 'default' : 'secondary'} className="text-xs">
                                  {deduction.applicable ? 'Applicable' : 'Not Applicable'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {deduction.type === 'fixed' 
                                ? `Fixed: ₦${(deduction.amount || 0).toLocaleString('en-NG')}`
                                : `Percentage: ${deduction.percentage || 0}% of basic salary`
                              }
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={showEditTemplateDialog} onOpenChange={setShowEditTemplateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update template details. Note: Allowances and deductions editing will be available in a future update.
            </DialogDescription>
          </DialogHeader>
          {editingTemplate && (
            <EditTemplateForm
              template={editingTemplate}
              onSave={handleUpdateTemplate}
              onCancel={() => {
                setShowEditTemplateDialog(false)
                setEditingTemplate(null)
              }}
              saving={updatingTemplate}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Create Template Form Component
function CreateTemplateForm({
  onSave,
  onCancel,
  templates
}: {
  onSave: (isDefault: boolean) => Promise<void>
  onCancel: () => void
  templates: PayrollTemplate[]
}) {
  const { user } = useAuth()
  const [isDefault, setIsDefault] = useState(templates.length === 0)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  
  // Allowances state - start empty for custom templates
  const [allowances, setAllowances] = useState<Array<{
    name: string
    type: 'fixed' | 'percentage'
    amount?: number
    percentage?: number
    taxable: boolean
    category?: 'transport' | 'housing' | 'meal' | 'medical' | 'other'
  }>>([])

  // Deductions state (Pension and NHF are automatic based on company settings, not included here)
  const [deductions, setDeductions] = useState<Array<{
    name: string
    type: 'fixed' | 'percentage'
    amount?: number
    percentage?: number
    category: 'nhis' | 'tax' | 'loan' | 'other'
    applicable?: boolean
  }>>([])

  // Company settings state
  const [companySettings, setCompanySettings] = useState({
    pensionEnabled: true,
    nhfEnabled: true,
    nhisEnabled: false,
    nhisAmount: 5000
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isDefault) {
      setCreating(true)
      try {
        await onSave(true)
      } finally {
        setCreating(false)
      }
    } else {
      if (!name.trim()) {
        toast.error('Template name is required')
        return
      }

      if (!user) return

      // Validate allowances
      for (const allowance of allowances) {
        if (!allowance.name.trim()) {
          toast.error('All allowances must have a name')
          return
        }
        if (allowance.type === 'fixed' && (!allowance.amount || allowance.amount <= 0)) {
          toast.error(`Allowance "${allowance.name}" must have a valid amount`)
          return
        }
        if (allowance.type === 'percentage' && (!allowance.percentage || allowance.percentage <= 0)) {
          toast.error(`Allowance "${allowance.name}" must have a valid percentage`)
          return
        }
      }

      // Validate deductions
      for (const deduction of deductions) {
        if (!deduction.name.trim()) {
          toast.error('All deductions must have a name')
          return
        }
        // Prevent adding Pension or NHF as they are automatic
        const nameLower = deduction.name.toLowerCase().trim()
        if (nameLower === 'pension' || nameLower === 'nhf') {
          toast.error('Pension and NHF are automatically handled by Company Settings and cannot be added as custom deductions')
          return
        }
        if (deduction.type === 'fixed' && (!deduction.amount || deduction.amount <= 0)) {
          toast.error(`Deduction "${deduction.name}" must have a valid amount`)
          return
        }
        if (deduction.type === 'percentage' && (!deduction.percentage || deduction.percentage <= 0)) {
          toast.error(`Deduction "${deduction.name}" must have a valid percentage`)
          return
        }
      }

      setCreating(true)
      try {
        const token = await user.getIdToken()
        const response = await fetch('/api/payroll/templates', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: name.trim(),
            ...(description.trim() && { description: description.trim() }),
            allowances: allowances
              .filter(a => a.name.trim() && ((a.type === 'fixed' && a.amount && a.amount > 0) || (a.type === 'percentage' && a.percentage && a.percentage > 0))) // Only include valid allowances
              .map(a => ({
                name: a.name.trim(),
                type: a.type,
                ...(a.type === 'fixed' ? { amount: Number(a.amount) } : { percentage: Number(a.percentage) }),
                taxable: Boolean(a.taxable),
                category: a.category || 'other'
              })),
            deductions: deductions
              .filter(d => d.name.trim()) // Only include deductions with names
              .map(d => ({
                name: d.name.trim(),
                type: d.type,
                ...(d.type === 'fixed' ? { amount: Number(d.amount) || 0 } : { percentage: Number(d.percentage) || 0 }),
                category: d.category || 'other',
                applicable: d.applicable !== undefined ? Boolean(d.applicable) : true
              })),
            companySettings: {
              pensionEnabled: Boolean(companySettings.pensionEnabled),
              nhfEnabled: Boolean(companySettings.nhfEnabled),
              nhisEnabled: Boolean(companySettings.nhisEnabled),
              nhisAmount: Number(companySettings.nhisAmount) || 0
            }
          })
        })

        const data = await response.json()
        if (data.success) {
          toast.success('Template created successfully')
          await onSave(false)
        } else {
          toast.error(data.error || 'Failed to create template')
        }
      } catch (error) {
        console.error('Error creating template:', error)
        toast.error('Failed to create template')
      } finally {
        setCreating(false)
      }
    }
  }

  const addAllowance = () => {
    setAllowances([...allowances, { name: '', type: 'fixed', amount: 0, taxable: true, category: 'other' }])
  }

  const removeAllowance = (index: number) => {
    setAllowances(allowances.filter((_, i) => i !== index))
  }

  const updateAllowance = (index: number, field: string, value: any) => {
    const updated = [...allowances]
    updated[index] = { ...updated[index], [field]: value }
    setAllowances(updated)
  }

  const addDeduction = () => {
    setDeductions([...deductions, { name: '', type: 'fixed', amount: 0, category: 'other', applicable: true }])
  }

  const removeDeduction = (index: number) => {
    setDeductions(deductions.filter((_, i) => i !== index))
  }

  const updateDeduction = (index: number, field: string, value: any) => {
    const updated = [...deductions]
    updated[index] = { ...updated[index], [field]: value }
    setDeductions(updated)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
      <div className="space-y-2">
        <Label htmlFor="template-type">Template Type</Label>
        <Select value={isDefault ? 'default' : 'custom'} onValueChange={(value) => setIsDefault(value === 'default')}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default Template</SelectItem>
            <SelectItem value="custom">Custom Template</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {isDefault 
            ? 'Default template includes standard allowances (Transport, Housing, Meal). Pension (8% employee, 10% employer) and NHF (2.5%) are automatically applied when enabled in Company Settings.'
            : 'Create a custom template with your own configuration. Pension and NHF are automatically handled based on Company Settings.'}
        </p>
      </div>

      {!isDefault && (
        <>
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={creating}
                placeholder="e.g., Monthly Payroll Template"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <textarea
                id="template-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={creating}
                rows={3}
                placeholder="Optional description for this template"
              />
            </div>
          </div>

          {/* Allowances Section */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Allowances</h3>
                <p className="text-xs text-muted-foreground">Define allowances for employees</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addAllowance} disabled={creating}>
                <Plus className="w-4 h-4 mr-1" />
                Add Allowance
              </Button>
            </div>

            <div className="space-y-3">
              {allowances.map((allowance, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-sm font-medium">Allowance {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAllowance(index)}
                      disabled={creating}
                      className="h-6 w-6 p-0 text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input
                        value={allowance.name}
                        onChange={(e) => updateAllowance(index, 'name', e.target.value)}
                        placeholder="e.g., Transport Allowance"
                        disabled={creating}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type *</Label>
                      <Select
                        value={allowance.type}
                        onValueChange={(value: 'fixed' | 'percentage') => updateAllowance(index, 'type', value)}
                        disabled={creating}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                          <SelectItem value="percentage">Percentage of Basic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {allowance.type === 'fixed' ? (
                      <div className="space-y-2">
                        <Label>Amount (₦) *</Label>
                        <Input
                          type="number"
                          value={allowance.amount || ''}
                          onChange={(e) => updateAllowance(index, 'amount', parseFloat(e.target.value) || 0)}
                          placeholder="e.g., 30000"
                          disabled={creating}
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Percentage (%) *</Label>
                        <Input
                          type="number"
                          value={allowance.percentage || ''}
                          onChange={(e) => updateAllowance(index, 'percentage', parseFloat(e.target.value) || 0)}
                          placeholder="e.g., 10"
                          disabled={creating}
                          min="0"
                          max="100"
                          step="0.01"
                          required
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={allowance.category || 'other'}
                        onValueChange={(value: any) => updateAllowance(index, 'category', value)}
                        disabled={creating}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="transport">Transport</SelectItem>
                          <SelectItem value="housing">Housing</SelectItem>
                          <SelectItem value="meal">Meal</SelectItem>
                          <SelectItem value="medical">Medical</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                      <Switch
                        id={`allowance-taxable-${index}`}
                        checked={allowance.taxable}
                        onCheckedChange={(checked) => updateAllowance(index, 'taxable', checked)}
                        disabled={creating}
                      />
                      <Label htmlFor={`allowance-taxable-${index}`} className="cursor-pointer">
                        Taxable
                      </Label>
                    </div>
                  </div>
                </Card>
              ))}
              {allowances.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No allowances added. Click "Add Allowance" to add one.
                </p>
              )}
            </div>
          </div>

          {/* Deductions Section */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-end flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold">Additional Deductions</h3>
                <p className="text-xs text-muted-foreground">
                  Add custom deductions. Pension (8% employee, 10% employer) and NHF (2.5%) are automatically applied when enabled in Company Settings.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addDeduction} disabled={creating}>
                <Plus className="w-4 h-4 mr-1" />
                Add Deduction
              </Button>
            </div>
            <div className="space-y-3">
              {deductions.map((deduction, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-sm font-medium">Deduction {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDeduction(index)}
                      disabled={creating}
                      className="h-6 w-6 p-0 text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input
                        value={deduction.name}
                        onChange={(e) => {
                          const value = e.target.value
                          // Prevent adding Pension or NHF as they are automatic
                          if (value.toLowerCase() === 'pension' || value.toLowerCase() === 'nhf') {
                            toast.error('Pension and NHF are automatically handled by Company Settings and cannot be added manually')
                            return
                          }
                          updateDeduction(index, 'name', value)
                        }}
                        placeholder="e.g., Loan, Insurance"
                        disabled={creating}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Type *</Label>
                      <Select
                        value={deduction.type}
                        onValueChange={(value: 'fixed' | 'percentage') => updateDeduction(index, 'type', value)}
                        disabled={creating}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                          <SelectItem value="percentage">Percentage of Basic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {deduction.type === 'fixed' ? (
                      <div className="space-y-2">
                        <Label>Amount (₦) *</Label>
                        <Input
                          type="number"
                          value={deduction.amount || ''}
                          onChange={(e) => updateDeduction(index, 'amount', parseFloat(e.target.value) || 0)}
                          placeholder="e.g., 5000"
                          disabled={creating}
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Percentage (%) *</Label>
                        <Input
                          type="number"
                          value={deduction.percentage || ''}
                          onChange={(e) => updateDeduction(index, 'percentage', parseFloat(e.target.value) || 0)}
                          placeholder="e.g., 8"
                          disabled={creating}
                          min="0"
                          max="100"
                          step="0.01"
                          required
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Category *</Label>
                      <Select
                        value={deduction.category}
                        onValueChange={(value: any) => updateDeduction(index, 'category', value)}
                        disabled={creating}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nhis">NHIS</SelectItem>
                          <SelectItem value="tax">Tax</SelectItem>
                          <SelectItem value="loan">Loan</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                      <Switch
                        id={`deduction-applicable-${index}`}
                        checked={deduction.applicable ?? true}
                        onCheckedChange={(checked) => updateDeduction(index, 'applicable', checked)}
                        disabled={creating}
                      />
                      <Label htmlFor={`deduction-applicable-${index}`} className="cursor-pointer">
                        Applicable
                      </Label>
                    </div>
                  </div>
                </Card>
              ))}
              {deductions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No deductions added. Click "Add Deduction" to add one.
                </p>
              )}
            </div>
          </div>

          {/* Company Settings Section */}
          <div className="space-y-4 border-t pt-4">
            <div>
              <h3 className="text-sm font-semibold mb-1">Company Settings</h3>
              <p className="text-xs text-muted-foreground">Configure statutory deductions</p>
            </div>

            <div className="space-y-4">
              {/* Pension */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <Label className="text-sm font-medium">Pension</Label>
                    <p className="text-xs text-muted-foreground">Employee: 8%, Employer: 10% of (basic + transport + housing)</p>
                    <p className="text-xs text-muted-foreground mt-1">Rates are fixed and cannot be changed</p>
                  </div>
                  <Switch
                    checked={companySettings.pensionEnabled}
                    onCheckedChange={(checked) => setCompanySettings({ ...companySettings, pensionEnabled: checked })}
                    disabled={creating}
                  />
                </div>
              </Card>

              {/* NHF */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <Label className="text-sm font-medium">NHF (National Housing Fund)</Label>
                    <p className="text-xs text-muted-foreground">2.5% of basic salary</p>
                    <p className="text-xs text-muted-foreground mt-1">Rate is fixed by federal government and cannot be changed</p>
                  </div>
                  <Switch
                    checked={companySettings.nhfEnabled}
                    onCheckedChange={(checked) => setCompanySettings({ ...companySettings, nhfEnabled: checked })}
                    disabled={creating}
                  />
                </div>
              </Card>

              {/* NHIS */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <Label className="text-sm font-medium">NHIS (National Health Insurance Scheme)</Label>
                    <p className="text-xs text-muted-foreground">Fixed monthly amount</p>
                  </div>
                  <Switch
                    checked={companySettings.nhisEnabled}
                    onCheckedChange={(checked) => setCompanySettings({ ...companySettings, nhisEnabled: checked })}
                    disabled={creating}
                  />
                </div>
                {companySettings.nhisEnabled && (
                  <div className="space-y-2 mt-3">
                    <Label>NHIS Amount (₦)</Label>
                    <Input
                      type="number"
                      value={companySettings.nhisAmount}
                      onChange={(e) => setCompanySettings({ ...companySettings, nhisAmount: parseFloat(e.target.value) || 5000 })}
                      disabled={creating}
                      min="0"
                      step="0.01"
                    />
                  </div>
                )}
              </Card>
            </div>
          </div>
        </>
      )}

      <DialogFooter className="sticky bottom-0 bg-background pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={creating}>
          Cancel
        </Button>
        <Button type="submit" disabled={creating || (!isDefault && !name.trim())}>
          {creating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            isDefault ? 'Create Default Template' : 'Create Custom Template'
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

// Edit Template Form Component
function EditTemplateForm({
  template,
  onSave,
  onCancel,
  saving
}: {
  template: PayrollTemplate
  onSave: (data: { name: string; description?: string; allowances: any[]; deductions: any[]; companySettings?: any }) => void
  onCancel: () => void
  saving: boolean
}) {
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      name,
      description: description || undefined,
      allowances: template.allowances,
      deductions: template.deductions,
      companySettings: template.companySettings
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="template-name">Template Name *</Label>
        <Input
          id="template-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={saving}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="template-description">Description</Label>
        <textarea
          id="template-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={saving}
          rows={3}
        />
      </div>

      <div className="p-4 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> This template has {template.allowances.length} allowance(s) and {template.deductions.length} deduction(s). 
          Editing allowances and deductions will be available in a future update.
        </p>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || !name.trim()}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}
