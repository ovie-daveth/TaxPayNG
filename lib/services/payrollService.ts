import { getAdminDb } from '@/lib/firebase-admin'
import { Employee, Payroll, PayrollItem, PayrollTemplate } from '@/lib/types'
import { calculateNigerianTax } from '@/lib/tax-calculator'

export class PayrollService {
  private db = getAdminDb()

  /**
   * Calculate pension contribution
   * Employee pension: 8% of (basic salary + transport allowance + housing allowance)
   * Employer pension: 10% of (basic salary + transport allowance + housing allowance)
   */
  calculatePension(basicSalary: number, transportAllowance: number = 0, housingAllowance: number = 0): {
    employee: number
    employer: number
    total: number
  } {
    const pensionableAmount = basicSalary + transportAllowance + housingAllowance
    const employeeRate = 0.08 // 8% - Employee contribution
    const employerRate = 0.10 // 10% - Employer contribution
    
    const employeePension = pensionableAmount * employeeRate
    const employerPension = pensionableAmount * employerRate
    const totalPension = employeePension + employerPension

    return {
      employee: Math.round(employeePension),
      employer: Math.round(employerPension),
      total: Math.round(totalPension)
    }
  }

  /**
   * Calculate NHF contribution
   * NHF is 2.5% of basic salary (if applicable)
   */
  calculateNHF(basicSalary: number): number {
    const nhfRate = 0.025 // 2.5%
    return Math.round(basicSalary * nhfRate)
  }

  /**
   * Calculate PAYE using the tax calculator with detailed breakdown
   */
  calculatePAYE(
    basicSalary: number,
    allowances: Array<{ name: string; amount: number; taxable: boolean }>,
    transportAllowance: number = 0,
    housingAllowance: number = 0,
    pensionContribution: number = 0,
    nhfContribution: number = 0,
    nhisContribution: number = 0,
    rentPaid: number = 0,
    dependents: number = 0
  ): { 
    amount: number
    monthly: number
    taxBreakdown?: any
  } {
    // Calculate total taxable income
    const taxableAllowances = allowances
      .filter(a => a.taxable)
      .reduce((sum, a) => sum + a.amount, 0)
    
    const totalIncome = basicSalary + taxableAllowances + housingAllowance

    // Calculate PAYE using the tax calculator with detailed breakdown
    const taxResult = calculateNigerianTax({
      businessType: 'freelancer', // PAYE uses individual tax calculation
      period: 'monthly',
      income: totalIncome,
      transportAllowance: transportAllowance,
      rentPaid: rentPaid,
      pensionContribution: pensionContribution,
      healthInsurance: nhisContribution,
      housingFund: nhfContribution,
      lifeInsurance: 0,
      charitableDonations: 0,
      businessExpenses: 0,
      dependents: dependents
    }, true) // Include inputs for detailed breakdown

    // Get monthly tax amount
    const monthlyTax = taxResult.monthlySetAside || 0

    return {
      amount: monthlyTax,
      monthly: monthlyTax,
      taxBreakdown: {
        grossIncome: taxResult.grossIncome,
        adjustedGrossIncome: taxResult.adjustedGrossIncome,
        reliefs: taxResult.reliefs,
        totalReliefs: taxResult.totalReliefs,
        taxableIncome: taxResult.taxableIncome,
        taxBrackets: taxResult.taxBrackets,
        totalTax: taxResult.totalTax,
        effectiveRate: taxResult.effectiveRate
      }
    }
  }

  /**
   * Calculate remittance information for an employee
   */
  calculateRemittanceInfo(
    payeAmount: number,
    pension: { employee: number; employer: number; total: number },
    nhf?: { amount: number },
    nhis?: { amount: number },
    taxState?: string,
    paymentDate: Date = new Date()
  ): PayrollItem['remittanceInfo'] {
    // Calculate deadlines
    const nextMonth = new Date(paymentDate)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    const payeDeadline = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 10) // 10th of next month
    
    const pensionDeadline = new Date(paymentDate)
    pensionDeadline.setDate(pensionDeadline.getDate() + 7) // 7 days after payment

    // Determine tax authority based on state
    // Most employees remit to State IRS, but certain categories go to NRS
    const authority = taxState ? 'state-irs' : 'nrs'
    const authorityName = taxState 
      ? `${taxState} State Internal Revenue Service`
      : 'Nigeria Revenue Service (NRS)'

    return {
      paye: {
        amount: payeAmount,
        deadline: payeDeadline.toISOString(),
        authority: authority as 'state-irs' | 'nrs',
        authorityName
      },
      pension: {
        employeeAmount: pension.employee,
        employerAmount: pension.employer,
        totalAmount: pension.total,
        deadline: pensionDeadline.toISOString(),
        authority: 'pfa'
      },
      ...(nhf && {
        nhf: {
          amount: nhf.amount,
          deadline: payeDeadline.toISOString(), // Same as PAYE deadline
          authority: 'fmb'
        }
      }),
      ...(nhis && {
        nhis: {
          amount: nhis.amount,
          deadline: payeDeadline.toISOString(), // Same as PAYE deadline
          authority: 'hmo'
        }
      })
    }
  }

  /**
   * Generate payroll for a single employee
   */
  generatePayrollItem(
    employee: Employee,
    template: PayrollTemplate,
    period: { start: string; end: string; type: 'monthly' | 'quarterly' | 'yearly' }
  ): PayrollItem {
    const basicSalary = employee.basicSalary || 0

    // Calculate allowances from template
    const calculatedAllowances = template.allowances.map(allowance => {
      let amount = 0
      if (allowance.type === 'fixed') {
        amount = allowance.amount || 0
      } else if (allowance.type === 'percentage') {
        amount = (basicSalary * (allowance.percentage || 0)) / 100
      }

      // Check if employee has custom allowance override
      const employeeAllowance = employee.allowances?.find(a => a.name === allowance.name)
      if (employeeAllowance) {
        if (employeeAllowance.type === 'fixed') {
          amount = employeeAllowance.amount
        } else {
          amount = (basicSalary * employeeAllowance.amount) / 100
        }
      }

      return {
        name: allowance.name,
        amount: Math.round(amount),
        taxable: allowance.taxable
      }
    })

    // Get transport and housing allowances
    const transportAllowance = calculatedAllowances
      .find(a => a.name.toLowerCase().includes('transport'))?.amount || 0
    const housingAllowance = calculatedAllowances
      .find(a => a.name.toLowerCase().includes('housing'))?.amount || 0

    // Calculate gross salary
    const grossSalary = basicSalary + calculatedAllowances.reduce((sum, a) => sum + a.amount, 0)

    // Calculate pension (8% of basic + transport + housing)
    const pension = this.calculatePension(basicSalary, transportAllowance, housingAllowance)

    // Calculate NHF (2.5% of basic salary, if applicable)
    const nhfEnabled = template.companySettings?.nhfEnabled ?? true
    const nhf = nhfEnabled ? { amount: this.calculateNHF(basicSalary) } : null

    // Calculate NHIS (if applicable)
    const nhisEnabled = template.companySettings?.nhisEnabled ?? false
    const nhisAmount = template.companySettings?.nhisAmount || 0
    // Only include nhis if enabled, otherwise omit it (don't set to undefined)
    const nhis = nhisEnabled ? { amount: Math.round(nhisAmount) } : null

    // Get rent paid from employee data (for rent relief calculation)
    const rentPaid = employee.rentPaid || 0

    // Calculate PAYE with detailed breakdown
    const payeResult = this.calculatePAYE(
      basicSalary,
      calculatedAllowances,
      transportAllowance,
      housingAllowance,
      pension.employee,
      nhf?.amount || 0,
      nhis?.amount || 0,
      rentPaid, // Use employee's rent paid for rent relief
      0 // dependents - could be added to employee data later
    )

    const paye = {
      amount: payeResult.amount,
      monthly: payeResult.monthly,
      taxBreakdown: payeResult.taxBreakdown
    }

    // Calculate remittance information
    const remittanceInfo = this.calculateRemittanceInfo(
      paye.amount,
      pension,
      nhf || undefined, // Convert null to undefined
      nhis || undefined, // Convert null to undefined
      employee.taxState,
      new Date() // Payment date (will be actual payment date in production)
    )

    // Calculate other deductions from template
    const otherDeductions = template.deductions
      .filter(d => d.category !== 'pension' && d.category !== 'nhf' && d.category !== 'nhis' && d.category !== 'tax')
      .map(deduction => {
        let amount = 0
        if (deduction.type === 'fixed') {
          amount = deduction.amount || 0
        } else if (deduction.type === 'percentage') {
          amount = (basicSalary * (deduction.percentage || 0)) / 100
        }

        // Check if employee has custom deduction override
        const employeeDeduction = employee.deductions?.find(d => d.name === deduction.name)
        if (employeeDeduction) {
          if (employeeDeduction.type === 'fixed') {
            amount = employeeDeduction.amount
          } else {
            amount = (basicSalary * employeeDeduction.amount) / 100
          }
        }

        return {
          name: deduction.name,
          amount: Math.round(amount),
          category: deduction.category || 'other'
        }
      })

    // Calculate total deductions
    const totalDeductions = 
      pension.employee +
      (nhf?.amount || 0) +
      (nhis?.amount || 0) +
      paye.amount +
      otherDeductions.reduce((sum, d) => sum + d.amount, 0)

    // Calculate net salary
    const netSalary = grossSalary - totalDeductions

    // Build payroll item, excluding null/undefined values for optional fields
    const payrollItem: any = {
      employeeId: employee.id,
      employeeNumber: employee.employeeNumber,
      employeeName: `${employee.firstName} ${employee.middleName || ''} ${employee.lastName}`.trim(),
      employeeEmail: employee.email,
      basicSalary: Math.round(basicSalary),
      allowances: calculatedAllowances,
      grossSalary: Math.round(grossSalary),
      pension,
      paye,
      otherDeductions,
      totalDeductions: Math.round(totalDeductions),
      netSalary: Math.round(netSalary),
      taxState: employee.taxState,
      taxId: employee.taxIdentificationNumber,
      remittanceInfo
    }

    // Only include nhf and nhis if they exist (not null/undefined)
    if (nhf) {
      payrollItem.nhf = nhf
    }
    if (nhis) {
      payrollItem.nhis = nhis
    }

    return payrollItem as PayrollItem
  }

  /**
   * Generate payroll for all active employees
   */
  async generatePayroll(
    userId: string,
    templateId: string,
    period: { start: string; end: string; type: 'monthly' | 'quarterly' | 'yearly' },
    periodLabel: string
  ): Promise<Payroll> {
    // Get template
    const templateDoc = await this.db.collection('payrollTemplates').doc(templateId).get()
    if (!templateDoc.exists) {
      throw new Error('Payroll template not found')
    }
    const template = { id: templateDoc.id, ...templateDoc.data() } as PayrollTemplate

    if (template.userId !== userId && !template.isDefault) {
      throw new Error('Unauthorized: Template does not belong to user')
    }

    // Get all active employees
    const employeesSnapshot = await this.db.collection('employees')
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .get()

    if (employeesSnapshot.empty) {
      throw new Error('No active employees found')
    }

    const employees = employeesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Employee))

    // Generate payroll items for each employee
    let items: PayrollItem[] = []
    
    if (period.type === 'yearly') {
      // For yearly payroll, generate 12 monthly items for each employee
      const year = new Date(period.start).getFullYear()
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      
      employees.forEach(employee => {
        for (let month = 0; month < 12; month++) {
          // Calculate period for this specific month
          const monthStart = new Date(year, month, 1)
          const monthEnd = new Date(year, month + 1, 0) // Last day of the month
          
          const monthlyPeriod = {
            start: monthStart.toISOString(),
            end: monthEnd.toISOString(),
            type: 'monthly' as const
          }
          
          // Generate payroll item for this month
          const monthlyItem = this.generatePayrollItem(employee, template, monthlyPeriod)
          
          // Add month-specific metadata to the item
          const itemWithMonth = {
            ...monthlyItem,
            month: month + 1,
            monthName: monthNames[month],
            monthlyPeriod: `${monthNames[month]} ${year}`,
            monthlyPeriodStart: monthStart.toISOString(),
            monthlyPeriodEnd: monthEnd.toISOString()
          }
          
          items.push(itemWithMonth)
        }
      })
    } else {
      // For monthly or quarterly, generate one item per employee
      items = employees.map(employee => 
        this.generatePayrollItem(employee, template, period)
      )
    }

    // Calculate totals
    const totalGrossSalary = items.reduce((sum, item) => sum + item.grossSalary, 0)
    const totalDeductions = items.reduce((sum, item) => sum + item.totalDeductions, 0)
    const totalNetSalary = items.reduce((sum, item) => sum + item.netSalary, 0)
    const totalPAYE = items.reduce((sum, item) => sum + item.paye.amount, 0)
    const totalPension = items.reduce((sum, item) => sum + item.pension.total, 0)
    const totalNHF = items.reduce((sum, item) => sum + (item.nhf?.amount || 0), 0)
    const totalNHIS = items.reduce((sum, item) => sum + (item.nhis?.amount || 0), 0)

    // Create payroll record
    const payroll: Omit<Payroll, 'id'> = {
      userId,
      templateId,
      templateName: template.name,
      period: periodLabel,
      periodType: period.type,
      periodStart: period.start,
      periodEnd: period.end,
      generatedAt: new Date().toISOString(),
      items,
      totalGrossSalary: Math.round(totalGrossSalary),
      totalDeductions: Math.round(totalDeductions),
      totalNetSalary: Math.round(totalNetSalary),
      totalPAYE: Math.round(totalPAYE),
      totalPension: Math.round(totalPension),
      totalNHF: Math.round(totalNHF),
      totalNHIS: Math.round(totalNHIS),
      status: 'generated',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // Remove undefined/null values from items before saving to Firestore
    const cleanedItems = items.map(item => {
      const cleaned: any = { ...item }
      // Remove nhf and nhis if they are null or undefined
      if (cleaned.nhf === null || cleaned.nhf === undefined) {
        delete cleaned.nhf
      }
      if (cleaned.nhis === null || cleaned.nhis === undefined) {
        delete cleaned.nhis
      }
      // Remove any other undefined values from the item
      Object.keys(cleaned).forEach(key => {
        if (cleaned[key] === undefined) {
          delete cleaned[key]
        }
      })
      return cleaned
    })

    // Create cleaned payroll object
    const cleanedPayroll: any = {
      ...payroll,
      items: cleanedItems
    }

    // Remove any undefined values from the top level
    Object.keys(cleanedPayroll).forEach(key => {
      if (cleanedPayroll[key] === undefined) {
        delete cleanedPayroll[key]
      }
    })

    // Save to Firestore
    const payrollRef = await this.db.collection('payrolls').add(cleanedPayroll)
    
    return {
      id: payrollRef.id,
      ...payroll
    }
  }

  /**
   * Get payroll by ID
   */
  async getPayroll(payrollId: string, userId: string): Promise<Payroll | null> {
    const payrollDoc = await this.db.collection('payrolls').doc(payrollId).get()
    
    if (!payrollDoc.exists) {
      return null
    }

    const payroll = { id: payrollDoc.id, ...payrollDoc.data() } as Payroll
    
    if (payroll.userId !== userId) {
      return null
    }

    return payroll
  }

  /**
   * Get all payrolls for a user
   */
  async getPayrolls(userId: string): Promise<Payroll[]> {
    let snapshot
    try {
      // Attempt to use indexed query first
      snapshot = await this.db.collection('payrolls')
        .where('userId', '==', userId)
        .orderBy('generatedAt', 'desc')
        .get()
    } catch (error: any) {
      // If index is missing or still building, fall back to unordered query and sort in memory
      if (error.code === 'failed-precondition' && 
          (error.message.includes('The query requires an index') || 
           error.message.includes('currently building'))) {
        const isBuilding = error.message.includes('currently building')
        console.warn(
          isBuilding 
            ? "Firestore index is still building for userId + generatedAt. Falling back to in-memory sort."
            : "Firestore index missing for userId + generatedAt. Falling back to in-memory sort."
        )
        snapshot = await this.db.collection('payrolls')
          .where('userId', '==', userId)
          .get()
        
        const payrolls = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Payroll))
        
        // Sort in memory by generatedAt descending
        payrolls.sort((a, b) => {
          const dateA = a.generatedAt ? new Date(a.generatedAt).getTime() : 0
          const dateB = b.generatedAt ? new Date(b.generatedAt).getTime() : 0
          return dateB - dateA
        })
        
        return payrolls
      }
      throw error // Re-throw other errors
    }

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Payroll))
  }

  /**
   * Delete a payroll
   */
  async deletePayroll(payrollId: string, userId: string): Promise<void> {
    // Verify payroll exists and belongs to user
    const payroll = await this.getPayroll(payrollId, userId)
    if (!payroll) {
      throw new Error('Payroll not found or unauthorized')
    }

    // Delete the payroll document
    await this.db.collection('payrolls').doc(payrollId).delete()
  }
}

export const payrollService = new PayrollService()

