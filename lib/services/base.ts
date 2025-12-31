import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '@/firebase/firebase'

export class BaseService {
  protected collectionName: string

  constructor(collectionName: string) {
    this.collectionName = collectionName
  }

  // Helper method to convert Firestore timestamp to ISO string
  protected convertTimestamp(timestamp: Timestamp | string | undefined | any): string {
    if (!timestamp) return new Date().toISOString()
    if (typeof timestamp === 'string') return timestamp
    
    // Handle Firestore Timestamp object (with seconds and nanoseconds)
    if (timestamp && typeof timestamp === 'object') {
      // Check if it's a Firestore Timestamp with toDate method
      if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toISOString()
      }
      // Handle plain object with seconds property (from Firestore)
      if (timestamp.seconds !== undefined) {
        const date = new Date(timestamp.seconds * 1000)
        return date.toISOString()
      }
    }
    
    // If it's already a Date object
    if (timestamp instanceof Date) {
      return timestamp.toISOString()
    }
    
    // Fallback: try to parse as date string
    try {
      return new Date(timestamp).toISOString()
    } catch {
      return new Date().toISOString()
    }
  }

  // Helper method to convert ISO string to Firestore timestamp
  protected convertToTimestamp(dateString?: string): Timestamp | ReturnType<typeof serverTimestamp> {
    if (!dateString) return serverTimestamp()
    
    // Parse date string (format: YYYY-MM-DD) and create date at local midnight
    // This prevents timezone issues where UTC midnight gets converted to previous day in local time
    const dateParts = dateString.split('-')
    if (dateParts.length === 3) {
      const year = parseInt(dateParts[0], 10)
      const month = parseInt(dateParts[1], 10) - 1 // Month is 0-indexed
      const day = parseInt(dateParts[2], 10)
      const date = new Date(year, month, day) // Creates date at local midnight
      return Timestamp.fromDate(date)
    }
    
    // Fallback to original behavior for other date formats
    return Timestamp.fromDate(new Date(dateString))
  }

  // Helper method to convert Firestore document to typed object
  protected convertDocument<T>(doc: any): T {
    const data = doc.data() as any
    if (!data) throw new Error('Document data not found')
    
    const converted: any = {
      id: doc.id,
      ...data,
    }
    
    // Convert timestamp fields if present (only if they exist and are not already strings)
    if (data.createdAt !== undefined) {
      converted.createdAt = this.convertTimestamp(data.createdAt)
    }
    if (data.updatedAt !== undefined) {
      converted.updatedAt = this.convertTimestamp(data.updatedAt)
    }
    if (data.uploadedAt !== undefined) {
      converted.uploadedAt = this.convertTimestamp(data.uploadedAt)
    }
    if (data.date !== undefined) {
      converted.date = this.convertTimestamp(data.date)
    }
    if (data.dueDate !== undefined) {
      converted.dueDate = this.convertTimestamp(data.dueDate)
    }
    if (data.completedAt !== undefined) {
      converted.completedAt = this.convertTimestamp(data.completedAt)
    }
    
    return converted as T
  }

  // Helper method to remove undefined values from objects (Firestore doesn't accept undefined)
  protected removeUndefined(obj: any): any {
    if (obj === null || obj === undefined) return obj
    if (Array.isArray(obj)) return obj.map(item => this.removeUndefined(item))
    if (typeof obj !== 'object') return obj
    
    const cleaned: any = {}
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = this.removeUndefined(obj[key])
      }
    }
    return cleaned
  }

  // Helper method to prepare data for Firestore
  protected prepareData(data: any, includeTimestamps = true) {
    const prepared = { ...data }
    
    if (includeTimestamps) {
      // Only set updatedAt to serverTimestamp if it's not already provided as a string (preserve ISO strings)
      if (typeof prepared.updatedAt !== 'string') {
        prepared.updatedAt = serverTimestamp()
      }
      // Only set createdAt to serverTimestamp if it doesn't already exist as a string (preserve ISO strings)
      if (!prepared.id && typeof prepared.createdAt !== 'string') {
        prepared.createdAt = serverTimestamp()
      }
    }

    // Convert date strings to timestamps
    if (prepared.date) {
      prepared.date = this.convertToTimestamp(prepared.date)
    }
    if (prepared.dueDate) {
      prepared.dueDate = this.convertToTimestamp(prepared.dueDate)
    }
    if (prepared.completedAt) {
      prepared.completedAt = this.convertToTimestamp(prepared.completedAt)
    }
    if (prepared.uploadedAt) {
      prepared.uploadedAt = this.convertToTimestamp(prepared.uploadedAt)
    }

    // Remove undefined values (Firestore doesn't accept undefined)
    return this.removeUndefined(prepared)
  }

  // Get a single document by ID
  async getById(id: string): Promise<any> {
    try {
      const docRef = doc(db, this.collectionName, id)
      const docSnap = await getDoc(docRef)
      
      if (!docSnap.exists()) {
        throw new Error('Document not found')
      }

      return this.convertDocument(docSnap)
    } catch (error) {
      console.error(`Error getting ${this.collectionName} by ID:`, error)
      throw error
    }
  }

  // Get all documents with optional filtering
  async getAll(filters?: any[], orderByField?: string, orderDirection: 'asc' | 'desc' = 'desc'): Promise<any[]> {
    try {
      const collectionRef = collection(db, this.collectionName)
      let q: any = collectionRef
      if (filters && filters.length > 0) {
        filters.forEach(filter => {
          q = query(q, where(filter.field, filter.operator, filter.value))
        })
      }

      if (orderByField) {
        q = query(q, orderBy(orderByField, orderDirection))
      }

      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map(doc => this.convertDocument(doc))
    } catch (error) {
      console.error(`Error getting all ${this.collectionName}:`, error)
      throw error
    }
  }

  // Create a new document
  async create(data: any): Promise<string> {
    try {
      const preparedData = this.prepareData(data, true)
      const docRef = await addDoc(collection(db, this.collectionName), preparedData)
      return docRef.id
    } catch (error) {
      console.error(`Error creating ${this.collectionName}:`, error)
      throw error
    }
  }

  // Update an existing document
  async update(id: string, data: any): Promise<void> {
    try {
      const preparedData = this.prepareData(data, true)
      const docRef = doc(db, this.collectionName, id)
      await updateDoc(docRef, preparedData)
    } catch (error) {
      console.error(`Error updating ${this.collectionName}:`, error)
      throw error
    }
  }

  // Delete a document
  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id)
      await deleteDoc(docRef)
    } catch (error) {
      console.error(`Error deleting ${this.collectionName}:`, error)
      throw error
    }
  }

  // Get documents with pagination
  async getPaginated(
    page: number = 1, 
    pageSize: number = 10, 
    filters?: any[], 
    orderByField?: string, 
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<{ data: any[], total: number }> {
    try {
      const offset = (page - 1) * pageSize
      
      const collectionRef = collection(db, this.collectionName)
      let q: any = collectionRef
      
      if (filters && filters.length > 0) {
        filters.forEach(filter => {
          q = query(q, where(filter.field, filter.operator, filter.value))
        })
      }

      if (orderByField) {
        q = query(q, orderBy(orderByField, orderDirection))
      }

      // Get total count (this is a simplified version - in production you might want to optimize this)
      const totalSnapshot = await getDocs(q)
      const total = totalSnapshot.size

      // Get paginated results
      q = query(q, limit(pageSize))
      
      const querySnapshot = await getDocs(q)
      const data = querySnapshot.docs.map(doc => this.convertDocument(doc))

      return { data, total }
    } catch (error) {
      console.error(`Error getting paginated ${this.collectionName}:`, error)
      throw error
    }
  }
}
