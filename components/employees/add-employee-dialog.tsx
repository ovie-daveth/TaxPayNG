"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Plus, X } from "lucide-react"
import { toast } from "sonner"
import type { Employee, PayrollTemplate } from "@/lib/types"

interface AddEmployeeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee?: Employee | null
  onSuccess: () => void
}

export function AddEmployeeDialog({ open, onOpenChange, employee, onSuccess }: AddEmployeeDialogProps) {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [templates, setTemplates] = useState<PayrollTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [formData, setFormData] = useState({
    employeeNumber: '',
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '' as 'male' | 'female' | 'other' | '',
    address: {
      street: '',
      city: '',
      state: '',
      country: 'Nigeria',
      postalCode: ''
    },
    employmentType: 'full-time' as 'full-time' | 'part-time' | 'contract' | 'intern',
    department: '',
    position: '',
    jobTitle: '',
    employmentDate: '',
    status: 'active' as 'active' | 'inactive' | 'terminated' | 'on-leave',
    basicSalary: '',
    payrollTemplateId: '',
    payrollTemplateName: '',
    taxIdentificationNumber: '',
    taxState: '',
    taxExempt: false,
    bankAccount: {
      bankName: '',
      accountNumber: '',
      accountName: ''
    },
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
      email: ''
    },
    notes: ''
  })

  // Populate form when editing
  useEffect(() => {
    if (employee) {
      setFormData({
        employeeNumber: employee.employeeNumber || '',
        firstName: employee.firstName || '',
        lastName: employee.lastName || '',
        middleName: employee.middleName || '',
        email: employee.email || '',
        phone: employee.phone || '',
        dateOfBirth: employee.dateOfBirth || '',
        gender: employee.gender || '',
        address: {
          street: employee.address?.street || '',
          city: employee.address?.city || '',
          state: employee.address?.state || '',
          country: employee.address?.country || 'Nigeria',
          postalCode: employee.address?.postalCode || ''
        },
        employmentType: employee.employmentType || 'full-time',
        department: employee.department || '',
        position: employee.position || '',
        jobTitle: employee.jobTitle || '',
        employmentDate: employee.employmentDate || '',
        status: employee.status || 'active',
        basicSalary: employee.basicSalary?.toString() || '',
        payrollTemplateId: employee.payrollTemplateId || '',
        payrollTemplateName: employee.payrollTemplateName || '',
        taxIdentificationNumber: employee.taxIdentificationNumber || '',
        taxState: employee.taxState || '',
        taxExempt: employee.taxExempt || false,
        bankAccount: {
          bankName: employee.bankAccount?.bankName || '',
          accountNumber: employee.bankAccount?.accountNumber || '',
          accountName: employee.bankAccount?.accountName || ''
        },
        emergencyContact: {
          name: employee.emergencyContact?.name || '',
          relationship: employee.emergencyContact?.relationship || '',
          phone: employee.emergencyContact?.phone || '',
          email: employee.emergencyContact?.email || ''
        },
        notes: employee.notes || ''
      })
    } else {
      // Reset form for new employee
      setFormData({
        employeeNumber: '',
        firstName: '',
        lastName: '',
        middleName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        address: {
          street: '',
          city: '',
          state: '',
          country: 'Nigeria',
          postalCode: ''
        },
        employmentType: 'full-time',
        department: '',
        position: '',
        jobTitle: '',
        employmentDate: '',
        status: 'active',
        basicSalary: '',
        payrollTemplateId: '',
        payrollTemplateName: '',
        taxIdentificationNumber: '',
        taxState: '',
        taxExempt: false,
        bankAccount: {
          bankName: '',
          accountNumber: '',
          accountName: ''
        },
        emergencyContact: {
          name: '',
          relationship: '',
          phone: '',
          email: ''
        },
        notes: ''
      })
    }
  }, [employee, open])

  // Fetch payroll templates for assignment
  useEffect(() => {
    const fetchTemplates = async () => {
      if (!user || !open) return
      setTemplatesLoading(true)
      try {
        const token = await user.getIdToken()
        const res = await fetch('/api/payroll/templates', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (data.success) {
          setTemplates(data.data || [])
        } else {
          setTemplates([])
        }
      } catch (e) {
        console.error('Error fetching payroll templates:', e)
        setTemplates([])
      } finally {
        setTemplatesLoading(false)
      }
    }
    fetchTemplates()
  }, [user, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    // Validate required fields
    if (!formData.firstName || !formData.lastName) {
      toast.error('First name and last name are required')
      return
    }

    try {
      setIsSubmitting(true)
      const token = await user.getIdToken()

      const payload = {
        ...formData,
        basicSalary: formData.basicSalary ? parseFloat(formData.basicSalary) : undefined,
        payrollTemplateId: formData.payrollTemplateId || undefined,
        payrollTemplateName: formData.payrollTemplateName || undefined,
        address: Object.values(formData.address).some(v => v) ? formData.address : undefined,
        bankAccount: Object.values(formData.bankAccount).some(v => v) ? formData.bankAccount : undefined,
        emergencyContact: formData.emergencyContact.name ? formData.emergencyContact : undefined
      }

      const url = employee ? `/api/employees/${employee.id}` : '/api/employees'
      const method = employee ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      if (data.success) {
        toast.success(employee ? 'Employee updated successfully' : 'Employee added successfully')
        onSuccess()
      } else {
        toast.error(data.error || 'Failed to save employee')
      }
    } catch (error) {
      console.error('Error saving employee:', error)
      toast.error('Failed to save employee')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{employee ? 'Edit Employee' : 'Add New Employee'}</DialogTitle>
          <DialogDescription>
            {employee ? 'Update employee information' : 'Fill in the employee details below'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="personal" className="text-xs sm:text-sm">Personal</TabsTrigger>
              <TabsTrigger value="employment" className="text-xs sm:text-sm">Employment</TabsTrigger>
              <TabsTrigger value="payroll" className="text-xs sm:text-sm">Payroll</TabsTrigger>
              <TabsTrigger value="additional" className="text-xs sm:text-sm">Additional</TabsTrigger>
            </TabsList>

            {/* Personal Information Tab */}
            <TabsContent value="personal" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="middleName">Middle Name</Label>
                  <Input
                    id="middleName"
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="employeeNumber">Employee Number</Label>
                  <Input
                    id="employeeNumber"
                    value={formData.employeeNumber}
                    onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => setFormData({ ...formData, gender: value as any })}
                  >
                    <SelectTrigger className="text-xs sm:text-sm">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold mb-2 block">Address</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label htmlFor="street">Street</Label>
                    <Input
                      id="street"
                      value={formData.address.street}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...formData.address, street: e.target.value }
                      })}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.address.city}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...formData.address, city: e.target.value }
                      })}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.address.state}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...formData.address, state: e.target.value }
                      })}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.address.country}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...formData.address, country: e.target.value }
                      })}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={formData.address.postalCode}
                      onChange={(e) => setFormData({
                        ...formData,
                        address: { ...formData.address, postalCode: e.target.value }
                      })}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Employment Information Tab */}
            <TabsContent value="employment" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employmentType">Employment Type *</Label>
                  <Select
                    value={formData.employmentType}
                    onValueChange={(value) => setFormData({ ...formData, employmentType: value as any })}
                  >
                    <SelectTrigger className="text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="intern">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                  >
                    <SelectTrigger className="text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                      <SelectItem value="on-leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="employmentDate">Employment Date</Label>
                  <Input
                    id="employmentDate"
                    type="date"
                    value={formData.employmentDate}
                    onChange={(e) => setFormData({ ...formData, employmentDate: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Payroll Information Tab */}
            <TabsContent value="payroll" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label>Payroll Template</Label>
                  <Select
                    value={formData.payrollTemplateId || "unassigned"}
                    onValueChange={(value) => {
                      if (value === "unassigned") {
                        setFormData({ ...formData, payrollTemplateId: "", payrollTemplateName: "" })
                        return
                      }
                      const t = templates.find((x) => x.id === value)
                      setFormData({
                        ...formData,
                        payrollTemplateId: value,
                        payrollTemplateName: t?.name || ""
                      })
                    }}
                    disabled={templatesLoading}
                  >
                    <SelectTrigger className="text-xs sm:text-sm">
                      <SelectValue placeholder={templatesLoading ? "Loading templates..." : "Select payroll template"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned (use selected template when generating)</SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}{t.isDefault ? " (Default)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Assigning a template helps payroll generation pick the right employees for each payroll run.
                  </p>
                </div>
                <div>
                  <Label htmlFor="basicSalary">Basic Salary (₦) - Monthly</Label>
                  <Input
                    id="basicSalary"
                    type="number"
                    step="0.01"
                    value={formData.basicSalary}
                    onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                    className="text-xs sm:text-sm"
                    placeholder="e.g., 500000"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Enter the monthly basic salary in NGN</p>
                </div>
                <div>
                  <Label htmlFor="taxIdentificationNumber">Tax Identification Number (TIN)</Label>
                  <Input
                    id="taxIdentificationNumber"
                    value={formData.taxIdentificationNumber}
                    onChange={(e) => setFormData({ ...formData, taxIdentificationNumber: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="taxState">Tax State</Label>
                  <Input
                    id="taxState"
                    value={formData.taxState}
                    onChange={(e) => setFormData({ ...formData, taxState: e.target.value })}
                    className="text-xs sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold mb-2 block">Bank Account Details</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      value={formData.bankAccount.bankName}
                      onChange={(e) => setFormData({
                        ...formData,
                        bankAccount: { ...formData.bankAccount, bankName: e.target.value }
                      })}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      value={formData.bankAccount.accountNumber}
                      onChange={(e) => setFormData({
                        ...formData,
                        bankAccount: { ...formData.bankAccount, accountNumber: e.target.value }
                      })}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="accountName">Account Name</Label>
                    <Input
                      id="accountName"
                      value={formData.bankAccount.accountName}
                      onChange={(e) => setFormData({
                        ...formData,
                        bankAccount: { ...formData.bankAccount, accountName: e.target.value }
                      })}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Additional Information Tab */}
            <TabsContent value="additional" className="space-y-4 mt-4">
              <div>
                <Label className="text-sm font-semibold mb-2 block">Emergency Contact</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emergencyName">Name</Label>
                    <Input
                      id="emergencyName"
                      value={formData.emergencyContact.name}
                      onChange={(e) => setFormData({
                        ...formData,
                        emergencyContact: { ...formData.emergencyContact, name: e.target.value }
                      })}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergencyRelationship">Relationship</Label>
                    <Input
                      id="emergencyRelationship"
                      value={formData.emergencyContact.relationship}
                      onChange={(e) => setFormData({
                        ...formData,
                        emergencyContact: { ...formData.emergencyContact, relationship: e.target.value }
                      })}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergencyPhone">Phone</Label>
                    <Input
                      id="emergencyPhone"
                      type="tel"
                      value={formData.emergencyContact.phone}
                      onChange={(e) => setFormData({
                        ...formData,
                        emergencyContact: { ...formData.emergencyContact, phone: e.target.value }
                      })}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergencyEmail">Email</Label>
                    <Input
                      id="emergencyEmail"
                      type="email"
                      value={formData.emergencyContact.email}
                      onChange={(e) => setFormData({
                        ...formData,
                        emergencyContact: { ...formData.emergencyContact, email: e.target.value }
                      })}
                      className="text-xs sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  className="text-xs sm:text-sm"
                  placeholder="Additional notes about the employee..."
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                employee ? 'Update Employee' : 'Add Employee'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

