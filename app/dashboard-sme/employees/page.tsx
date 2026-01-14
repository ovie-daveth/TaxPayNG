"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Plus, Upload, Edit, Trash2, Download, FileSpreadsheet, UserPlus, X, Loader2, MoreVertical, Mail, Phone, Briefcase, Building2, DollarSign, User } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { Employee } from "@/lib/types"
import { AddEmployeeDialog } from "@/components/employees/add-employee-dialog"
import { auth } from "@/firebase/firebase"

export default function SMEEmployeesPage() {
  const { user } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Fetch employees
  const fetchEmployees = async () => {
    if (!user) return

    try {
      setLoading(true)
      const token = await user.getIdToken()
      const response = await fetch('/api/employees', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        setEmployees(data.data || [])
      } else {
        toast.error(data.error || 'Failed to fetch employees')
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Failed to fetch employees')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      fetchEmployees()
    }
  }, [user])

  // Handle delete employee - open confirmation modal
  const handleDeleteClick = (employee: Employee) => {
    setEmployeeToDelete(employee)
    setDeleteDialogOpen(true)
  }

  // Confirm and perform deletion
  const handleConfirmDelete = async () => {
    if (!user || !employeeToDelete) return

    setDeleting(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/employees/${employeeToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()
      if (data.success) {
        toast.success('Employee deleted successfully')
        setDeleteDialogOpen(false)
        setEmployeeToDelete(null)
        fetchEmployees()
      } else {
        toast.error(data.error || 'Failed to delete employee')
      }
    } catch (error) {
      console.error('Error deleting employee:', error)
      toast.error('Failed to delete employee')
    } finally {
      setDeleting(false)
    }
  }

  // Handle Excel upload
  const handleExcelUpload = async () => {
    if (!user || !uploadFile) return

    try {
      setUploading(true)
      const token = await user.getIdToken()
      const formData = new FormData()
      formData.append('file', uploadFile)

      const response = await fetch('/api/employees/bulk-upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      const data = await response.json()
      if (data.success) {
        toast.success(data.message || `Successfully imported ${data.data?.length || 0} employee(s)`)
        setIsUploadDialogOpen(false)
        setUploadFile(null)
        fetchEmployees()
      } else {
        toast.error(data.error || 'Failed to upload employees')
      }
    } catch (error) {
      console.error('Error uploading employees:', error)
      toast.error('Failed to upload employees')
    } finally {
      setUploading(false)
    }
  }

  // Filter employees by search term
  const filteredEmployees = employees.filter(emp => {
    const searchLower = searchTerm.toLowerCase()
    return (
      emp.firstName?.toLowerCase().includes(searchLower) ||
      emp.lastName?.toLowerCase().includes(searchLower) ||
      emp.email?.toLowerCase().includes(searchLower) ||
      emp.phone?.toLowerCase().includes(searchLower) ||
      emp.employeeNumber?.toLowerCase().includes(searchLower) ||
      emp.jobTitle?.toLowerCase().includes(searchLower) ||
      emp.department?.toLowerCase().includes(searchLower)
    )
  })

  // Download Excel template
  const downloadTemplate = () => {
    // Create a simple CSV template
    const headers = [
      'First Name',
      'Last Name',
      'Middle Name',
      'Email',
      'Phone',
      'Date of Birth',
      'Gender',
      'Employee Number',
      'Employment Type',
      'Department',
      'Job Title',
      'Position',
      'Employment Date',
      'Status',
      'Basic Salary',
      'TIN',
      'Tax State',
      'Bank Name',
      'Account Number',
      'Account Name',
      'Address',
      'City',
      'State',
      'Country',
      'Postal Code'
    ]
    
    const csvContent = headers.join(',') + '\n'
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'employee_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Template downloaded')
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Employees</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage your employees and their information
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadTemplate}
            className="text-xs sm:text-sm"
          >
            <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            Download Template
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsUploadDialogOpen(true)}
            className="text-xs sm:text-sm"
          >
            <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            Upload Excel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingEmployee(null)
              setIsAddDialogOpen(true)
            }}
            className="text-xs sm:text-sm"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search employees by name, email, phone, or employee number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 text-xs sm:text-sm"
        />
      </div>

      {/* Employees List */}
      {loading ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      ) : filteredEmployees.length === 0 ? (
        <Card>
          <CardContent className="p-6 sm:p-8 md:p-12">
            <div className="flex flex-col items-center justify-center text-center py-8">
              <UserPlus className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">No employees found</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first employee'}
              </p>
              {!searchTerm && (
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsUploadDialogOpen(true)}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Excel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingEmployee(null)
                      setIsAddDialogOpen(true)
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Employee
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredEmployees.map((employee) => (
              <Card 
                key={employee.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => {
                  setEditingEmployee(employee)
                  setIsAddDialogOpen(true)
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar/Icon */}
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base truncate">
                            {employee.firstName} {employee.middleName} {employee.lastName}
                          </h3>
                          {employee.employeeNumber && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              ID: {employee.employeeNumber}
                            </p>
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 -mr-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingEmployee(employee)
                                setIsAddDialogOpen(true)
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteClick(employee)
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      {/* Details Grid */}
                      <div className="space-y-2 mt-3">
                        {/* Contact Info */}
                        {(employee.email || employee.phone) && (
                          <div className="space-y-1">
                            {employee.email && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">{employee.email}</span>
                              </div>
                            )}
                            {employee.phone && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>{employee.phone}</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Position & Department */}
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          {(employee.jobTitle || employee.position) && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Briefcase className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>{employee.jobTitle || employee.position}</span>
                            </div>
                          )}
                          {employee.department && (
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>{employee.department}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Status & Salary */}
                        <div className="flex items-center justify-between pt-2 border-t">
                          <Badge
                            variant={
                              employee.status === 'active'
                                ? 'default'
                                : employee.status === 'inactive'
                                ? 'secondary'
                                : employee.status === 'terminated'
                                ? 'destructive'
                                : 'outline'
                            }
                            className="text-xs"
                          >
                            {employee.status}
                          </Badge>
                          {employee.basicSalary && (
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Monthly Salary</p>
                              <p className="text-sm font-semibold">
                                ₦{employee.basicSalary.toLocaleString('en-NG')}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop/Tablet Table View */}
          <Card className="hidden md:block">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">
                Employees ({filteredEmployees.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Employee</TableHead>
                      <TableHead className="text-xs sm:text-sm">Contact</TableHead>
                      <TableHead className="text-xs sm:text-sm">Position</TableHead>
                      <TableHead className="text-xs sm:text-sm">Department</TableHead>
                      <TableHead className="text-xs sm:text-sm">Status</TableHead>
                      <TableHead className="text-xs sm:text-sm">Monthly Salary</TableHead>
                      <TableHead className="text-xs sm:text-sm text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="text-xs sm:text-sm">
                          <div>
                            <div className="font-medium">
                              {employee.firstName} {employee.middleName} {employee.lastName}
                            </div>
                            {employee.employeeNumber && (
                              <div className="text-xs text-muted-foreground">
                                ID: {employee.employeeNumber}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          <div className="space-y-0.5">
                            {employee.email && (
                              <div className="text-xs">{employee.email}</div>
                            )}
                            {employee.phone && (
                              <div className="text-xs text-muted-foreground">{employee.phone}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {employee.jobTitle || employee.position || '-'}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {employee.department || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              employee.status === 'active'
                                ? 'default'
                                : employee.status === 'inactive'
                                ? 'secondary'
                                : employee.status === 'terminated'
                                ? 'destructive'
                                : 'outline'
                            }
                            className="text-xs"
                          >
                            {employee.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {employee.basicSalary
                            ? `₦${employee.basicSalary.toLocaleString('en-NG')}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingEmployee(employee)
                                setIsAddDialogOpen(true)
                              }}
                              className="h-7 w-7 p-0"
                            >
                              <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(employee)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Add/Edit Employee Dialog */}
      <AddEmployeeDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open)
          if (!open) {
            setEditingEmployee(null)
          }
        }}
        employee={editingEmployee}
        onSuccess={() => {
          fetchEmployees()
          setIsAddDialogOpen(false)
          setEditingEmployee(null)
        }}
      />

      {/* Excel Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Employees from Excel</DialogTitle>
            <DialogDescription>
              Upload an Excel (.xlsx, .xls) or CSV file with employee data. Download the template to see the required format.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Select File
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="text-xs sm:text-sm"
                />
                {uploadFile && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUploadFile(null)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {uploadFile && (
                <p className="text-xs text-muted-foreground mt-1">
                  Selected: {uploadFile.name}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsUploadDialogOpen(false)
                  setUploadFile(null)
                }}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleExcelUpload}
                disabled={!uploadFile || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{employeeToDelete?.firstName} {employeeToDelete?.lastName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} onClick={() => {
              setDeleteDialogOpen(false)
              setEmployeeToDelete(null)
            }}>
              Cancel
            </AlertDialogCancel>
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
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
