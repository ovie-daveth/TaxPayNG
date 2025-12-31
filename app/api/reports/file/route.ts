import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'

/**
 * File a tax return (without payment)
 * This saves the filing status to the database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reportId, userId } = body

    if (!reportId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const db = getAdminDb()

    // Get the report using Admin SDK
    const reportDoc = await db.collection('selfAssessments').doc(reportId).get()
    if (!reportDoc.exists) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      )
    }

    const report = { id: reportDoc.id, ...reportDoc.data() } as any
    const reportEntityId: string | undefined = report?.entityId || undefined

    // Calculate taxes already paid during the year
    // This should match Part D of the self-assessment (Tax Already Paid/Credits)
    const period = report.reportData.period
    const periodStart = new Date(period.startDate)
    const periodEnd = new Date(period.endDate)
    periodEnd.setHours(23, 59, 59, 999)

    // 1. Get WHT from invoices (where user is supplier and WHT was deducted)
    const invoicesSnapshot = await db.collection('invoices')
      .where('userId', '==', userId)
      .get()
    
    const allInvoices = invoicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    const scopedInvoices = reportEntityId
      ? allInvoices.filter((inv: any) => inv.entityId === reportEntityId)
      : allInvoices
    const whtFromInvoices = scopedInvoices
      .filter((inv: any) => 
        inv.invoiceType === 'outgoing' && 
        inv.whtDeducted && 
        inv.whtAmount && 
        inv.whtDeductedBy
      )
      .reduce((sum: number, inv: any) => sum + (inv.whtAmount || 0), 0)

    // 2. Get WHT from transactions (check for WHT-related notes/descriptions)
    const transactionsSnapshot = await db.collection('transactions')
      .where('userId', '==', userId)
      .get()
    
    const allTransactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    const scopedTransactions = reportEntityId
      ? allTransactions.filter((txn: any) => txn.entityId === reportEntityId)
      : allTransactions
    const whtFromTransactions = scopedTransactions
      .filter((txn: any) => {
        if (!txn.txnDate) return false
        const txnDate = txn.txnDate?.toDate ? txn.txnDate.toDate() : new Date(txn.txnDate)
        if (txnDate < periodStart || txnDate > periodEnd) return false
        
        const desc = (txn.description || '').toLowerCase()
        const notes = (txn.notes || '').toLowerCase()
        return desc.includes('wht') || desc.includes('withholding') || 
               notes.includes('wht') || notes.includes('withholding')
      })
      .reduce((sum: number, txn: any) => sum + (txn.amount || 0), 0)

    // 3. Get tax payments (PAYE, provisional) from taxPaymentService
    const paymentsSnapshot = await db.collection('taxPayments')
      .where('userId', '==', userId)
      .get()
    
    const allPayments = paymentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    const scopedPayments = reportEntityId
      ? allPayments.filter((p: any) => p.entityId === reportEntityId)
      : allPayments
    const periodPayments = scopedPayments.filter((payment: any) => {
      if (payment.status !== 'completed') return false
      const paymentDate = payment.createdAt?.toDate ? payment.createdAt.toDate() : new Date(payment.createdAt)
      return paymentDate >= periodStart && paymentDate <= periodEnd
    })
    const taxPaymentsAmount = periodPayments.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0)

    // 4. Get manual credits from report metadata
    const manualCredits = (report.reportData as any)?.metadata?.manualTaxCredits || []
    const manualCreditsAmount = manualCredits.reduce((sum: number, credit: any) => sum + (credit.amount || 0), 0)

    // Total taxes already paid (matching Part D calculation)
    const taxesAlreadyPaid = whtFromInvoices + whtFromTransactions + taxPaymentsAmount + manualCreditsAmount

    // Calculate balance due
    // finalLiability = Gross Tax Payable (from tax brackets, BEFORE credits)
    const grossTaxPayable = report.reportData?.tax?.taxPayable || 0
    // balanceDue = Gross Tax - Tax Credits (same as netTaxPayable calculation)
    const balanceDue = Math.max(0, grossTaxPayable - taxesAlreadyPaid)

    // Update report with filing status
    const reportRef = db.collection('selfAssessments').doc(reportId)
    await reportRef.update({
      filingStatus: 'filed',
      filingDate: new Date().toISOString(),
      taxesAlreadyPaid,
      balanceDue,
      status: 'submitted', // Change status to submitted when filed
      updatedAt: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      balanceDue,
      taxesAlreadyPaid,
      grossTaxPayable,
      message: 'Tax return filed successfully'
    })
  } catch (error) {
    console.error('Error filing return:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to file return' },
      { status: 500 }
    )
  }
}

