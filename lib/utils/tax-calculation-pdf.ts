import jsPDF from "jspdf"

interface TaxCalculationResult {
  grossIncome: number
  businessExpenses?: number
  adjustedGrossIncome: number
  taxableIncome: number
  totalTax: number
  monthlySetAside: number
  totalReliefs: number
  reliefs: {
    rentRelief?: number
    pension?: number
    healthInsurance?: number
    housingFund?: number
    transportAllowance?: number
    lifeInsurance?: number
    charitable?: number
  }
  taxBrackets: Array<{
    rate: number
    amount: number
    tax: number
  }>
  quarterlyPayments?: Array<{
    quarter: string
    amount: number
  }>
  period?: string
  incomeBreakdown?: Array<{
    type: string
    amount: number
    originalAmount?: number
    originalCurrency?: string
  }>
  businessExpensesBreakdown?: Array<{
    type: string
    amount: number
  }>
  creatorExpensesBreakdown?: Array<{
    type: string
    amount: number
  }>
}

export function generateTaxCalculationPDF(result: TaxCalculationResult): jsPDF {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let yPosition = 20
  const margin = 20
  const lineHeight = 7
  const sectionSpacing = 10

  // Helper function to add a new page if needed
  const checkNewPage = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage()
      yPosition = 20
    }
  }

  // Header
  doc.setFontSize(20)
  doc.setTextColor(5, 150, 105) // Green color
  doc.text("Tax Calculation Report", margin, yPosition)
  yPosition += 10

  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Generated on: ${new Date().toLocaleDateString("en-NG")}`, margin, yPosition)
  yPosition += sectionSpacing

  // Monthly Set-Aside (Highlighted)
  checkNewPage(15)
  doc.setFillColor(5, 150, 105)
  doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 12, 2, 2, "FD")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("Monthly Set-Aside", margin + 5, yPosition + 8)
  doc.setFontSize(14)
  doc.text(
    `₦${result.monthlySetAside.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    pageWidth - margin - 5,
    yPosition + 8,
    { align: "right" }
  )
  yPosition += 15

  // Income Section
  checkNewPage(30)
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("Income Breakdown", margin, yPosition)
  yPosition += 5

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  
  if (result.incomeBreakdown && result.incomeBreakdown.length > 0) {
    result.incomeBreakdown.forEach((source) => {
      checkNewPage(7)
      const typeLabel = source.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
      doc.text(typeLabel, margin + 5, yPosition)
      doc.text(
        `₦${source.amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        pageWidth - margin - 5,
        yPosition,
        { align: "right" }
      )
      yPosition += lineHeight
    })
  }

  checkNewPage(10)
  doc.setFont("helvetica", "bold")
  doc.text("Gross Income (Annual)", margin, yPosition)
  doc.text(
    `₦${result.grossIncome.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    pageWidth - margin - 5,
    yPosition,
    { align: "right" }
  )
  yPosition += lineHeight

  if (result.businessExpenses && result.businessExpenses > 0) {
    checkNewPage(7)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(200, 0, 0)
    doc.text("Business Expenses (Annual)", margin + 5, yPosition)
    doc.text(
      `-₦${result.businessExpenses.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      pageWidth - margin - 5,
      yPosition,
      { align: "right" }
    )
    yPosition += lineHeight
    doc.setTextColor(0, 0, 0)
  }

  checkNewPage(10)
  doc.setFont("helvetica", "bold")
  doc.text("Adjusted Gross Income (Annual)", margin, yPosition)
  doc.text(
    `₦${result.adjustedGrossIncome.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    pageWidth - margin - 5,
    yPosition,
    { align: "right" }
  )
  yPosition += sectionSpacing

  // Business Expenses Breakdown
  if (result.businessExpensesBreakdown && result.businessExpensesBreakdown.length > 0) {
    checkNewPage(20)
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("Business Expenses Breakdown", margin, yPosition)
    yPosition += 5

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    result.businessExpensesBreakdown.forEach((expense) => {
      checkNewPage(7)
      const typeLabel = expense.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
      doc.text(typeLabel, margin + 5, yPosition)
      doc.text(
        `₦${expense.amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        pageWidth - margin - 5,
        yPosition,
        { align: "right" }
      )
      yPosition += lineHeight
    })
    yPosition += sectionSpacing
  }

  // Creator Expenses Breakdown
  if (result.creatorExpensesBreakdown && result.creatorExpensesBreakdown.length > 0) {
    checkNewPage(20)
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("Creator Expenses Breakdown", margin, yPosition)
    yPosition += 5

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    result.creatorExpensesBreakdown.forEach((expense) => {
      checkNewPage(7)
      const typeLabel = expense.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
      doc.text(typeLabel, margin + 5, yPosition)
      doc.text(
        `₦${expense.amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        pageWidth - margin - 5,
        yPosition,
        { align: "right" }
      )
      yPosition += lineHeight
    })
    yPosition += sectionSpacing
  }

  // Tax Reliefs
  checkNewPage(30)
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("Tax Reliefs & Deductions", margin, yPosition)
  yPosition += 5

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(0, 150, 0)

  if (result.reliefs.rentRelief && result.reliefs.rentRelief > 0) {
    checkNewPage(7)
    doc.text("Rent Relief (20%)", margin + 5, yPosition)
    doc.text(
      `-₦${result.reliefs.rentRelief.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      pageWidth - margin - 5,
      yPosition,
      { align: "right" }
    )
    yPosition += lineHeight
  }

  if (result.reliefs.pension && result.reliefs.pension > 0) {
    checkNewPage(7)
    doc.text("Pension Contribution", margin + 5, yPosition)
    doc.text(
      `-₦${result.reliefs.pension.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      pageWidth - margin - 5,
      yPosition,
      { align: "right" }
    )
    yPosition += lineHeight
  }

  if (result.reliefs.healthInsurance && result.reliefs.healthInsurance > 0) {
    checkNewPage(7)
    doc.text("Health Insurance", margin + 5, yPosition)
    doc.text(
      `-₦${result.reliefs.healthInsurance.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      pageWidth - margin - 5,
      yPosition,
      { align: "right" }
    )
    yPosition += lineHeight
  }

  if (result.reliefs.housingFund && result.reliefs.housingFund > 0) {
    checkNewPage(7)
    doc.text("National Housing Fund (NHF)", margin + 5, yPosition)
    doc.text(
      `-₦${result.reliefs.housingFund.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      pageWidth - margin - 5,
      yPosition,
      { align: "right" }
    )
    yPosition += lineHeight
  }

  if (result.reliefs.transportAllowance && result.reliefs.transportAllowance > 0) {
    checkNewPage(7)
    doc.text("Transport Allowance Exemption", margin + 5, yPosition)
    doc.text(
      `-₦${result.reliefs.transportAllowance.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      pageWidth - margin - 5,
      yPosition,
      { align: "right" }
    )
    yPosition += lineHeight
  }

  if (result.reliefs.lifeInsurance && result.reliefs.lifeInsurance > 0) {
    checkNewPage(7)
    doc.text("Life Insurance", margin + 5, yPosition)
    doc.text(
      `-₦${result.reliefs.lifeInsurance.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      pageWidth - margin - 5,
      yPosition,
      { align: "right" }
    )
    yPosition += lineHeight
  }

  if (result.reliefs.charitable && result.reliefs.charitable > 0) {
    checkNewPage(7)
    doc.text("Charitable Donations", margin + 5, yPosition)
    doc.text(
      `-₦${result.reliefs.charitable.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      pageWidth - margin - 5,
      yPosition,
      { align: "right" }
    )
    yPosition += lineHeight
  }

  checkNewPage(10)
  doc.setFont("helvetica", "bold")
  doc.text("Total Reliefs (Annual)", margin, yPosition)
  doc.text(
    `-₦${result.totalReliefs.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    pageWidth - margin - 5,
    yPosition,
    { align: "right" }
  )
  yPosition += sectionSpacing
  doc.setTextColor(0, 0, 0)

  // Tax Calculation
  checkNewPage(30)
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text("Tax Calculation", margin, yPosition)
  yPosition += 5

  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text("Taxable Income (Annual)", margin + 5, yPosition)
  doc.text(
    `₦${result.taxableIncome.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    pageWidth - margin - 5,
    yPosition,
    { align: "right" }
  )
  yPosition += lineHeight

  result.taxBrackets.forEach((bracket) => {
    checkNewPage(7)
    const bracketLabel =
      bracket.rate === 0
        ? "Tax-free"
        : `${bracket.rate}% on ₦${bracket.amount.toLocaleString("en-NG")}`
    doc.text(bracketLabel, margin + 5, yPosition)
    doc.text(
      bracket.rate === 0
        ? "₦0"
        : `₦${bracket.tax.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      pageWidth - margin - 5,
      yPosition,
      { align: "right" }
    )
    yPosition += lineHeight
  })

  checkNewPage(12)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(5, 150, 105)
  doc.text("Total Tax Payable (Annual)", margin, yPosition)
  doc.setFontSize(14)
  doc.text(
    `₦${result.totalTax.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    pageWidth - margin - 5,
    yPosition,
    { align: "right" }
  )
  yPosition += sectionSpacing
  doc.setTextColor(0, 0, 0)

  // Quarterly Payments
  if (result.quarterlyPayments && result.quarterlyPayments.length > 0) {
    checkNewPage(30)
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("Quarterly Payment Schedule", margin, yPosition)
    yPosition += 5

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    result.quarterlyPayments.forEach((payment) => {
      checkNewPage(7)
      doc.text(payment.quarter, margin + 5, yPosition)
      doc.text(
        `₦${payment.amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        pageWidth - margin - 5,
        yPosition,
        { align: "right" }
      )
      yPosition += lineHeight
    })
  }

  // Footer
  const footerY = pageHeight - 15
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text("Generated by TaxPayNG", pageWidth / 2, footerY, { align: "center" })

  return doc
}

