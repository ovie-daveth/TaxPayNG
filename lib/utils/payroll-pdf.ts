import jsPDF from 'jspdf'
import { Payroll, PayrollItem } from '@/lib/types'
import { format } from 'date-fns'

/**
 * Generate a PDF payroll slip for a single employee
 */
export function generatePayrollSlipPDF(payroll: Payroll, item: PayrollItem): jsPDF {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const margin = 20
  const pageWidth = 210 // A4 width in mm
  const pageHeight = 297 // A4 height in mm
  const contentWidth = pageWidth - 2 * margin
  let yPos = margin

  // Helper function to add text
  const addText = (
    text: string,
    x: number,
    y: number,
    options: {
      fontSize?: number
      fontStyle?: 'normal' | 'bold' | 'italic'
      align?: 'left' | 'center' | 'right'
      color?: [number, number, number]
    } = {}
  ) => {
    pdf.setFontSize(options.fontSize || 12)
    pdf.setFont('helvetica', options.fontStyle || 'normal')
    if (options.color) {
      pdf.setTextColor(options.color[0], options.color[1], options.color[2])
    } else {
      pdf.setTextColor(0, 0, 0)
    }
    pdf.text(text, x, y, { align: options.align || 'left' })
  }

  // Helper to format currency
  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Header - OTax Logo/Title
  pdf.setFontSize(20)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(37, 99, 235) // Blue color
  addText('OTax Payroll Slip', pageWidth / 2, yPos, { align: 'center', fontSize: 20 })
  yPos += 10

  // Period
  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'normal')
  addText(`Period: ${payroll.period}`, pageWidth / 2, yPos, { align: 'center', fontSize: 12 })
  yPos += 8

  // Employee Information
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  addText('Employee Information', margin, yPos, { fontSize: 14 })
  yPos += 8

  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'normal')
  addText(`Name: ${item.employeeName}`, margin, yPos, { fontSize: 11 })
  yPos += 6
  if (item.employeeNumber) {
    addText(`Employee ID: ${item.employeeNumber}`, margin, yPos, { fontSize: 11 })
    yPos += 6
  }
  if (item.employeeEmail) {
    addText(`Email: ${item.employeeEmail}`, margin, yPos, { fontSize: 11 })
    yPos += 6
  }
  if (item.taxId) {
    addText(`Tax ID: ${item.taxId}`, margin, yPos, { fontSize: 11 })
    yPos += 6
  }
  yPos += 5

  // Earnings Section
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  addText('Earnings', margin, yPos, { fontSize: 14 })
  yPos += 8

  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'normal')
  addText('Basic Salary', margin, yPos, { fontSize: 11 })
  addText(formatCurrency(item.basicSalary), pageWidth - margin, yPos, { align: 'right', fontSize: 11 })
  yPos += 6

  // Allowances
  if (item.allowances.length > 0) {
    item.allowances.forEach(allowance => {
      addText(allowance.name, margin + 5, yPos, { fontSize: 10 })
      addText(formatCurrency(allowance.amount), pageWidth - margin, yPos, { align: 'right', fontSize: 10 })
      yPos += 5
    })
  }

  yPos += 3
  pdf.setFont('helvetica', 'bold')
  addText('Gross Salary', margin, yPos, { fontSize: 11 })
  addText(formatCurrency(item.grossSalary), pageWidth - margin, yPos, { align: 'right', fontSize: 11 })
  yPos += 8

  // Deductions Section
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  addText('Deductions', margin, yPos, { fontSize: 14 })
  yPos += 8

  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'normal')

  // Pension
  addText('Pension (Employee)', margin + 5, yPos, { fontSize: 10 })
  addText(formatCurrency(item.pension.employee), pageWidth - margin, yPos, { align: 'right', fontSize: 10 })
  yPos += 5

  // NHF
  if (item.nhf) {
    addText('NHF (2.5%)', margin + 5, yPos, { fontSize: 10 })
    addText(formatCurrency(item.nhf.amount), pageWidth - margin, yPos, { align: 'right', fontSize: 10 })
    yPos += 5
  }

  // NHIS
  if (item.nhis) {
    addText('NHIS', margin + 5, yPos, { fontSize: 10 })
    addText(formatCurrency(item.nhis.amount), pageWidth - margin, yPos, { align: 'right', fontSize: 10 })
    yPos += 5
  }

  // PAYE
  addText('PAYE Tax', margin + 5, yPos, { fontSize: 10 })
  addText(formatCurrency(item.paye.amount), pageWidth - margin, yPos, { align: 'right', fontSize: 10 })
  yPos += 5

  // Tax Breakdown (if available)
  if (item.paye.taxBreakdown) {
    const breakdown = item.paye.taxBreakdown
    yPos += 3
    
    // Check if we need a new page
    if (yPos > pageHeight - 100) {
      pdf.addPage()
      yPos = margin
    }

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    addText('Tax Calculation Breakdown (2026 Tax Reform)', margin, yPos, { fontSize: 12 })
    yPos += 8

    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'normal')

    // Gross Income
    addText('Annual Gross Income', margin + 5, yPos, { fontSize: 9 })
    addText(formatCurrency(breakdown.grossIncome), pageWidth - margin, yPos, { align: 'right', fontSize: 9 })
    yPos += 5

    // Reliefs
    pdf.setFont('helvetica', 'bold')
    addText('Reliefs Applied:', margin + 5, yPos, { fontSize: 9 })
    yPos += 5
    pdf.setFont('helvetica', 'normal')

    if (breakdown.reliefs.rentRelief > 0) {
      addText(`  Rent Relief (20% capped at ₦500K)`, margin + 10, yPos, { fontSize: 9 })
      addText(formatCurrency(breakdown.reliefs.rentRelief), pageWidth - margin, yPos, { align: 'right', fontSize: 9 })
      yPos += 4
    }
    if (breakdown.reliefs.pension > 0) {
      addText(`  Pension Contribution`, margin + 10, yPos, { fontSize: 9 })
      addText(formatCurrency(breakdown.reliefs.pension), pageWidth - margin, yPos, { align: 'right', fontSize: 9 })
      yPos += 4
    }
    if (breakdown.reliefs.housingFund > 0) {
      addText(`  NHF (National Housing Fund)`, margin + 10, yPos, { fontSize: 9 })
      addText(formatCurrency(breakdown.reliefs.housingFund), pageWidth - margin, yPos, { align: 'right', fontSize: 9 })
      yPos += 4
    }
    if (breakdown.reliefs.healthInsurance > 0) {
      addText(`  NHIS (National Health Insurance)`, margin + 10, yPos, { fontSize: 9 })
      addText(formatCurrency(breakdown.reliefs.healthInsurance), pageWidth - margin, yPos, { align: 'right', fontSize: 9 })
      yPos += 4
    }
    if (breakdown.reliefs.transportAllowance > 0) {
      addText(`  Transport Allowance (up to ₦360K exempt)`, margin + 10, yPos, { fontSize: 9 })
      addText(formatCurrency(breakdown.reliefs.transportAllowance), pageWidth - margin, yPos, { align: 'right', fontSize: 9 })
      yPos += 4
    }

    // Total Reliefs
    pdf.setFont('helvetica', 'bold')
    addText('Total Reliefs', margin + 5, yPos, { fontSize: 9 })
    addText(formatCurrency(breakdown.totalReliefs), pageWidth - margin, yPos, { align: 'right', fontSize: 9 })
    yPos += 5

    // Taxable Income
    pdf.setFont('helvetica', 'bold')
    addText('Annual Taxable Income', margin + 5, yPos, { fontSize: 9 })
    addText(formatCurrency(breakdown.taxableIncome), pageWidth - margin, yPos, { align: 'right', fontSize: 9 })
    yPos += 6

    // Tax Brackets
    pdf.setFont('helvetica', 'bold')
    addText('Tax Calculation by Bracket:', margin + 5, yPos, { fontSize: 9 })
    yPos += 5
    pdf.setFont('helvetica', 'normal')

    if (breakdown.taxBrackets && breakdown.taxBrackets.length > 0) {
      breakdown.taxBrackets.forEach((bracket: any, index: number) => {
        if (yPos > pageHeight - 50) {
          pdf.addPage()
          yPos = margin
        }
        const bracketLabel = bracket.rate === 0 
          ? `First ₦800,000 (0%)`
          : bracket.rate === 15
          ? `₦800K - ₦3M (15%)`
          : bracket.rate === 18
          ? `₦3M - ₦12M (18%)`
          : bracket.rate === 21
          ? `₦12M - ₦25M (21%)`
          : bracket.rate === 23
          ? `₦25M - ₦50M (23%)`
          : `Above ₦50M (25%)`
        
        addText(`  ${bracketLabel}`, margin + 10, yPos, { fontSize: 8 })
        addText(`₦${bracket.amount.toLocaleString('en-NG')} × ${bracket.rate}% = ${formatCurrency(bracket.tax)}`, pageWidth - margin - 60, yPos, { align: 'right', fontSize: 8 })
        yPos += 4
      })
    }

    yPos += 3
    pdf.setFont('helvetica', 'bold')
    addText('Annual Tax Payable', margin + 5, yPos, { fontSize: 9 })
    addText(formatCurrency(breakdown.totalTax), pageWidth - margin, yPos, { align: 'right', fontSize: 9 })
    yPos += 5

    addText('Monthly PAYE (Annual ÷ 12)', margin + 5, yPos, { fontSize: 9 })
    addText(formatCurrency(item.paye.amount), pageWidth - margin, yPos, { align: 'right', fontSize: 9 })
    yPos += 5

    if (breakdown.effectiveRate) {
      addText(`Effective Tax Rate: ${breakdown.effectiveRate}%`, margin + 5, yPos, { fontSize: 8, color: [128, 128, 128] })
      yPos += 5
    }
    yPos += 3
  }

  // Remittance Information (if available)
  if (item.remittanceInfo) {
    // Check if we need a new page
    if (yPos > pageHeight - 80) {
      pdf.addPage()
      yPos = margin
    }

    pdf.setFontSize(12)
    pdf.setFont('helvetica', 'bold')
    addText('Remittance Information', margin, yPos, { fontSize: 12 })
    yPos += 8

    pdf.setFontSize(9)
    pdf.setFont('helvetica', 'normal')

    // PAYE Remittance
    const payeDeadline = new Date(item.remittanceInfo.paye.deadline)
    addText(`PAYE: ${formatCurrency(item.remittanceInfo.paye.amount)}`, margin + 5, yPos, { fontSize: 9 })
    yPos += 4
    addText(`  Remit to: ${item.remittanceInfo.paye.authorityName || (item.remittanceInfo.paye.authority === 'state-irs' ? 'State IRS' : 'NRS')}`, margin + 10, yPos, { fontSize: 8, color: [128, 128, 128] })
    yPos += 4
    addText(`  Deadline: ${format(payeDeadline, 'MMM dd, yyyy')} (10th of next month)`, margin + 10, yPos, { fontSize: 8, color: [128, 128, 128] })
    yPos += 5

    // Pension Remittance
    const pensionDeadline = new Date(item.remittanceInfo.pension.deadline)
    addText(`Pension: ${formatCurrency(item.remittanceInfo.pension.totalAmount)} (Employee: ${formatCurrency(item.remittanceInfo.pension.employeeAmount)}, Employer: ${formatCurrency(item.remittanceInfo.pension.employerAmount)})`, margin + 5, yPos, { fontSize: 9 })
    yPos += 4
    addText(`  Remit to: PFA (Pension Fund Administrator)`, margin + 10, yPos, { fontSize: 8, color: [128, 128, 128] })
    yPos += 4
    addText(`  Deadline: ${format(pensionDeadline, 'MMM dd, yyyy')} (7 days after payment)`, margin + 10, yPos, { fontSize: 8, color: [128, 128, 128] })
    yPos += 5

    // NHF Remittance
    if (item.remittanceInfo.nhf) {
      const nhfDeadline = new Date(item.remittanceInfo.nhf.deadline)
      addText(`NHF: ${formatCurrency(item.remittanceInfo.nhf.amount)}`, margin + 5, yPos, { fontSize: 9 })
      yPos += 4
      addText(`  Remit to: Federal Mortgage Bank`, margin + 10, yPos, { fontSize: 8, color: [128, 128, 128] })
      yPos += 4
      addText(`  Deadline: ${format(nhfDeadline, 'MMM dd, yyyy')}`, margin + 10, yPos, { fontSize: 8, color: [128, 128, 128] })
      yPos += 5
    }

    // NHIS Remittance
    if (item.remittanceInfo.nhis) {
      const nhisDeadline = new Date(item.remittanceInfo.nhis.deadline)
      addText(`NHIS: ${formatCurrency(item.remittanceInfo.nhis.amount)}`, margin + 5, yPos, { fontSize: 9 })
      yPos += 4
      addText(`  Remit to: HMO (Health Maintenance Organization)`, margin + 10, yPos, { fontSize: 8, color: [128, 128, 128] })
      yPos += 4
      addText(`  Deadline: ${format(nhisDeadline, 'MMM dd, yyyy')}`, margin + 10, yPos, { fontSize: 8, color: [128, 128, 128] })
      yPos += 5
    }

    yPos += 3
    pdf.setFont('helvetica', 'italic')
    pdf.setTextColor(200, 0, 0) // Red color for warning
    addText('⚠️ Late remittance attracts penalties (10% per annum + CBN rate interest)', margin + 5, yPos, { fontSize: 8 })
    yPos += 5
  }

  // Other Deductions
  if (item.otherDeductions.length > 0) {
    item.otherDeductions.forEach(deduction => {
      addText(deduction.name, margin + 5, yPos, { fontSize: 10 })
      addText(formatCurrency(deduction.amount), pageWidth - margin, yPos, { align: 'right', fontSize: 10 })
      yPos += 5
    })
  }

  yPos += 3
  pdf.setFont('helvetica', 'bold')
  addText('Total Deductions', margin, yPos, { fontSize: 11 })
  addText(formatCurrency(item.totalDeductions), pageWidth - margin, yPos, { align: 'right', fontSize: 11 })
  yPos += 8

  // Net Salary
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(37, 99, 235) // Blue color
  addText('Net Salary', margin, yPos, { fontSize: 16 })
  addText(formatCurrency(item.netSalary), pageWidth - margin, yPos, { align: 'right', fontSize: 16 })
  yPos += 10

  // Footer
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'italic')
  pdf.setTextColor(128, 128, 128) // Gray color
  const footerText = `Generated on ${format(new Date(), "MMM dd, yyyy 'at' h:mm a")} by OTax`
  addText(footerText, pageWidth / 2, pageHeight - margin, { align: 'center', fontSize: 9 })

  return pdf
}

/**
 * Generate a PDF summary for the entire payroll
 */
export function generatePayrollSummaryPDF(payroll: Payroll): jsPDF {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const margin = 20
  const pageWidth = 210
  const pageHeight = 297
  let yPos = margin

  const addText = (
    text: string,
    x: number,
    y: number,
    options: {
      fontSize?: number
      fontStyle?: 'normal' | 'bold' | 'italic'
      align?: 'left' | 'center' | 'right'
      color?: [number, number, number]
    } = {}
  ) => {
    pdf.setFontSize(options.fontSize || 12)
    pdf.setFont('helvetica', options.fontStyle || 'normal')
    if (options.color) {
      pdf.setTextColor(options.color[0], options.color[1], options.color[2])
    } else {
      pdf.setTextColor(0, 0, 0)
    }
    pdf.text(text, x, y, { align: options.align || 'left' })
  }

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Header
  pdf.setFontSize(20)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(37, 99, 235)
  addText('Payroll Summary', pageWidth / 2, yPos, { align: 'center', fontSize: 20 })
  yPos += 10

  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(0, 0, 0)
  addText(`Period: ${payroll.period}`, pageWidth / 2, yPos, { align: 'center', fontSize: 12 })
  yPos += 8
  addText(`Template: ${payroll.templateName}`, pageWidth / 2, yPos, { align: 'center', fontSize: 12 })
  yPos += 8
  addText(`Employees: ${payroll.items.length}`, pageWidth / 2, yPos, { align: 'center', fontSize: 12 })
  yPos += 12

  // Totals
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  addText('Payroll Totals', margin, yPos, { fontSize: 14 })
  yPos += 8

  pdf.setFontSize(11)
  pdf.setFont('helvetica', 'normal')
  addText('Total Gross Salary', margin, yPos, { fontSize: 11 })
  addText(formatCurrency(payroll.totalGrossSalary), pageWidth - margin, yPos, { align: 'right', fontSize: 11 })
  yPos += 6

  addText('Total PAYE', margin, yPos, { fontSize: 11 })
  addText(formatCurrency(payroll.totalPAYE), pageWidth - margin, yPos, { align: 'right', fontSize: 11 })
  yPos += 6

  addText('Total Pension', margin, yPos, { fontSize: 11 })
  addText(formatCurrency(payroll.totalPension), pageWidth - margin, yPos, { align: 'right', fontSize: 11 })
  yPos += 6

  if (payroll.totalNHF) {
    addText('Total NHF', margin, yPos, { fontSize: 11 })
    addText(formatCurrency(payroll.totalNHF), pageWidth - margin, yPos, { align: 'right', fontSize: 11 })
    yPos += 6
  }

  if (payroll.totalNHIS) {
    addText('Total NHIS', margin, yPos, { fontSize: 11 })
    addText(formatCurrency(payroll.totalNHIS), pageWidth - margin, yPos, { align: 'right', fontSize: 11 })
    yPos += 6
  }

  yPos += 3
  pdf.setFont('helvetica', 'bold')
  addText('Total Deductions', margin, yPos, { fontSize: 11 })
  addText(formatCurrency(payroll.totalDeductions), pageWidth - margin, yPos, { align: 'right', fontSize: 11 })
  yPos += 8

  pdf.setFontSize(16)
  pdf.setTextColor(37, 99, 235)
  addText('Total Net Salary', margin, yPos, { fontSize: 16 })
  addText(formatCurrency(payroll.totalNetSalary), pageWidth - margin, yPos, { align: 'right', fontSize: 16 })
  yPos += 15

  // Employee List
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(0, 0, 0)
  addText('Employee Breakdown', margin, yPos, { fontSize: 14 })
  yPos += 8

  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  
  // Table header
  addText('Employee', margin, yPos, { fontSize: 9, fontStyle: 'bold' })
  addText('Gross', margin + 60, yPos, { align: 'right', fontSize: 9, fontStyle: 'bold' })
  addText('Deductions', margin + 100, yPos, { align: 'right', fontSize: 9, fontStyle: 'bold' })
  addText('Net', margin + 150, yPos, { align: 'right', fontSize: 9, fontStyle: 'bold' })
  yPos += 5

  // Table rows
  payroll.items.forEach((item, index) => {
    if (yPos > pageHeight - 30) {
      pdf.addPage()
      yPos = margin
    }

    const name = item.employeeName.length > 25 ? item.employeeName.substring(0, 22) + '...' : item.employeeName
    addText(name, margin, yPos, { fontSize: 9 })
    addText(formatCurrency(item.grossSalary), margin + 60, yPos, { align: 'right', fontSize: 9 })
    addText(formatCurrency(item.totalDeductions), margin + 100, yPos, { align: 'right', fontSize: 9 })
    addText(formatCurrency(item.netSalary), margin + 150, yPos, { align: 'right', fontSize: 9 })
    yPos += 5
  })

  // Footer
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'italic')
  pdf.setTextColor(128, 128, 128)
  const footerText = `Generated on ${format(new Date(), "MMM dd, yyyy 'at' h:mm a")} by OTax`
  addText(footerText, pageWidth / 2, pageHeight - margin, { align: 'center', fontSize: 9 })

  return pdf
}

