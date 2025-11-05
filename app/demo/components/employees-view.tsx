"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, Users, TrendingUp, Calculator, ChevronDown, ChevronUp } from "lucide-react"
import { calculateNigerianTax } from "@/lib/tax-calculator"
import { EmployeeItem } from "./employee-item"

interface Employee {
  id: string
  name: string
  position: string
  monthlySalary: number
  transportAllowance?: number
  housingAllowance?: number
  pensionContribution?: number
  healthInsurance?: number
  housingFund?: number
}

// Sample employee data for small business
const sampleEmployees: Employee[] = [
  {
    id: "1",
    name: "John Adebayo",
    position: "Software Developer",
    monthlySalary: 450000,
    transportAllowance: 25000,
    housingAllowance: 150000,
    pensionContribution: 36000, // 8% of salary
    healthInsurance: 12000,
    housingFund: 4500,
  },
  {
    id: "2",
    name: "Fatima Ibrahim",
    position: "Marketing Manager",
    monthlySalary: 350000,
    transportAllowance: 30000,
    housingAllowance: 120000,
    pensionContribution: 28000, // 8% of salary
    healthInsurance: 10500,
    housingFund: 3500,
  },
  {
    id: "3",
    name: "Chukwu Emeka",
    position: "Sales Executive",
    monthlySalary: 280000,
    transportAllowance: 30000,
    housingAllowance: 80000,
    pensionContribution: 22400, // 8% of salary
    healthInsurance: 8400,
    housingFund: 2800,
  },
  {
    id: "4",
    name: "Amina Lawal",
    position: "Accountant",
    monthlySalary: 320000,
    transportAllowance: 25000,
    housingAllowance: 100000,
    pensionContribution: 25600, // 8% of salary
    healthInsurance: 9600,
    housingFund: 3200,
  },
  {
    id: "5",
    name: "Daniel Okafor",
    position: "Operations Manager",
    monthlySalary: 420000,
    transportAllowance: 30000,
    housingAllowance: 140000,
    pensionContribution: 33600, // 8% of salary
    healthInsurance: 12600,
    housingFund: 4200,
  },
]

export function EmployeesView() {
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null)

  // Calculate tax for each employee
  const employeesWithTax = sampleEmployees.map(employee => {
    const annualSalary = employee.monthlySalary * 12
    const annualTransportAllowance = (employee.transportAllowance || 0) * 12
    const annualHousingAllowance = (employee.housingAllowance || 0) * 12
    const annualPension = (employee.pensionContribution || 0) * 12
    const annualHealthInsurance = (employee.healthInsurance || 0) * 12
    const annualHousingFund = (employee.housingFund || 0) * 12

    // For employees, housing allowance is taxable (benefit-in-kind)
    // But they can claim rent relief if they pay rent
    // For simplicity, we'll treat housing allowance as taxable income
    const grossIncome = annualSalary + annualHousingAllowance

    // Calculate tax using the tax calculator
    const taxResult = calculateNigerianTax({
      businessType: "freelancer", // Using freelancer type for individual tax calculation
      period: "yearly",
      income: grossIncome,
      transportAllowance: annualTransportAllowance,
      rentPaid: 0, // Assuming no rent paid (housing allowance provided)
      pensionContribution: annualPension,
      healthInsurance: annualHealthInsurance,
      housingFund: annualHousingFund,
      lifeInsurance: 0,
      charitableDonations: 0,
      businessExpenses: 0,
      dependents: 0,
    })

    return {
      ...employee,
      taxCalculation: taxResult,
      annualSalary,
      annualGrossIncome: grossIncome,
    }
  })

  // Filter employees based on search
  const filteredEmployees = employeesWithTax.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.position.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace('NGN', '₦')
  }

  // Calculate totals
  const totalMonthlySalaries = sampleEmployees.reduce((sum, emp) => sum + emp.monthlySalary, 0)
  const totalAnnualSalaries = totalMonthlySalaries * 12
  const totalAnnualTax = employeesWithTax.reduce((sum, emp) => sum + (emp.taxCalculation?.totalTax || 0), 0)
  const totalMonthlyTax = totalAnnualTax / 12

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Employees</p>
              <p className="text-2xl font-bold">{sampleEmployees.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Monthly Payroll</p>
              <p className="text-2xl font-bold">{formatCurrency(totalMonthlySalaries)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Annual Payroll</p>
              <p className="text-2xl font-bold">{formatCurrency(totalAnnualSalaries)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Monthly PAYE</p>
              <p className="text-2xl font-bold">{formatCurrency(totalMonthlyTax)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-accent" />
            </div>
          </div>
        </Card>
      </div>

      {/* Employees List */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Employee Salary Breakdown</h2>
              <p className="text-sm text-muted-foreground mt-1">
                View employee salaries, allowances, and tax calculations
              </p>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-4">
            {filteredEmployees.map((employee) => (
              <EmployeeItem
                key={employee.id}
                employee={employee}
                isExpanded={expandedEmployee === employee.id}
                onToggle={() => setExpandedEmployee(
                  expandedEmployee === employee.id ? null : employee.id
                )}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No employees found matching your search</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

