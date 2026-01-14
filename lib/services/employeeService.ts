import { getAdminDb } from '@/lib/firebase-admin'
import type { Employee } from '@/lib/types'

export const employeeService = {
  /**
   * Create a new employee
   */
  async createEmployee(userId: string, employeeData: Omit<Employee, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Employee> {
    const db = getAdminDb()
    const now = new Date().toISOString()
    
    // Remove undefined values before saving to Firestore
    const cleanedData = this.removeUndefined(employeeData)
    
    const employeeDoc = {
      userId,
      ...cleanedData,
      createdAt: now,
      updatedAt: now
    }
    
    const docRef = await db.collection('employees').add(employeeDoc)
    
    return {
      id: docRef.id,
      userId,
      ...cleanedData,
      createdAt: now,
      updatedAt: now
    } as Employee
  },

  /**
   * Get all employees for a user
   */
  async getEmployees(userId: string): Promise<Employee[]> {
    const db = getAdminDb()
    try {
      // Try with orderBy first (requires index)
      const snapshot = await db.collection('employees')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get()
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Employee))
    } catch (error: any) {
      // If orderBy fails (likely missing index), fetch without orderBy and sort in memory
      if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
        const snapshot = await db.collection('employees')
          .where('userId', '==', userId)
          .get()
        
        const employees = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Employee))
        
        // Sort by createdAt in memory
        return employees.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return bTime - aTime // Descending order
        })
      }
      throw error
    }
  },

  /**
   * Get a single employee by ID
   */
  async getEmployee(employeeId: string, userId: string): Promise<Employee | null> {
    if (!employeeId || employeeId.trim() === '') {
      throw new Error('Employee ID is required')
    }
    
    const db = getAdminDb()
    const doc = await db.collection('employees').doc(employeeId).get()
    
    if (!doc.exists) {
      return null
    }
    
    const data = doc.data()
    if (data?.userId !== userId) {
      return null // User doesn't own this employee
    }
    
    return {
      id: doc.id,
      ...data
    } as Employee
  },

  /**
   * Update an employee
   */
  async updateEmployee(employeeId: string, userId: string, updates: Partial<Omit<Employee, 'id' | 'userId' | 'createdAt'>>): Promise<Employee> {
    const db = getAdminDb()
    
    // Verify ownership
    const employee = await this.getEmployee(employeeId, userId)
    if (!employee) {
      throw new Error('Employee not found or access denied')
    }
    
    await db.collection('employees').doc(employeeId).update({
      ...updates,
      updatedAt: new Date().toISOString()
    })
    
    const updatedDoc = await db.collection('employees').doc(employeeId).get()
    return {
      id: updatedDoc.id,
      ...updatedDoc.data()
    } as Employee
  },

  /**
   * Delete an employee
   */
  async deleteEmployee(employeeId: string, userId: string): Promise<void> {
    const db = getAdminDb()
    
    // Verify ownership
    const employee = await this.getEmployee(employeeId, userId)
    if (!employee) {
      throw new Error('Employee not found or access denied')
    }
    
    await db.collection('employees').doc(employeeId).delete()
  },

  /**
   * Helper function to remove undefined values from an object
   */
  removeUndefined(obj: any): any {
    if (obj === undefined) return undefined
    if (obj === null || typeof obj !== 'object') return obj
    if (Array.isArray(obj)) return obj.map(v => this.removeUndefined(v)).filter(v => v !== undefined)
    
    const cleaned: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        const cleanedValue = this.removeUndefined(value)
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue
        }
      }
    }
    return Object.keys(cleaned).length > 0 ? cleaned : undefined
  },

  /**
   * Bulk create employees
   */
  async bulkCreateEmployees(userId: string, employees: Array<Omit<Employee, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<Employee[]> {
    const db = getAdminDb()
    const now = new Date().toISOString()
    const batch = db.batch()
    
    const createdEmployees: Employee[] = []
    
    employees.forEach(employeeData => {
      // Remove undefined values before saving to Firestore
      const cleanedData = this.removeUndefined(employeeData)
      
      const docRef = db.collection('employees').doc()
      const employeeDoc = {
        userId,
        ...cleanedData,
        createdAt: now,
        updatedAt: now
      }
      
      batch.set(docRef, employeeDoc)
      
      createdEmployees.push({
        id: docRef.id,
        userId,
        ...cleanedData,
        createdAt: now,
        updatedAt: now
      } as Employee)
    })
    
    await batch.commit()
    return createdEmployees
  }
}

