import { BaseService } from './base'
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore'
import { db } from '@/firebase/firebase'

export interface ExchangeRate {
  id?: string
  currency: string // Currency code (USD, EUR, etc.)
  rate: number // Rate to NGN
  lastUpdated: string
  updatedBy?: string
  createdAt?: string
  updatedAt?: string
}

export class ExchangeRateService extends BaseService {
  constructor() {
    super('exchangeRates')
  }

  // Get exchange rate for a specific currency
  async getRate(currency: string): Promise<ExchangeRate | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('currency', '==', currency.toUpperCase())
      )
      const querySnapshot = await getDocs(q)
      
      if (querySnapshot.empty) {
        return null
      }

      return this.convertDocument(querySnapshot.docs[0])
    } catch (error) {
      console.error('Error getting exchange rate:', error)
      throw error
    }
  }

  // Get all exchange rates
  async getAllRates(): Promise<ExchangeRate[]> {
    try {
      const allRates = await this.getAll()
      return allRates.sort((a, b) => a.currency.localeCompare(b.currency))
    } catch (error) {
      console.error('Error getting all exchange rates:', error)
      throw error
    }
  }

  // Create or update exchange rate (upsert)
  async upsertRate(currency: string, rate: number, updatedBy: string): Promise<string> {
    try {
      // Check if rate exists
      const existingRate = await this.getRate(currency)
      
      const now = new Date().toISOString()
      const rateData: any = {
        currency: currency.toUpperCase(),
        rate,
        lastUpdated: now,
        updatedBy,
      }

      if (existingRate && existingRate.id) {
        // Update existing
        await this.update(existingRate.id, rateData)
        return existingRate.id
      } else {
        // Create new
        rateData.createdAt = now
        return await this.create(rateData)
      }
    } catch (error) {
      console.error('Error upserting exchange rate:', error)
      throw error
    }
  }

  // Initialize default exchange rates (for first-time setup)
  async initializeDefaults(updatedBy: string): Promise<void> {
    try {
      const defaultRates: Record<string, number> = {
        USD: 1500,
        EUR: 1650,
        GBP: 1900,
        CAD: 1100,
        AUD: 1000,
        KES: 10,
        GHS: 100,
        ZAR: 80,
      }

      const existingRates = await this.getAllRates()
      const existingCurrencies = new Set(existingRates.map(r => r.currency))

      const now = new Date().toISOString()
      for (const [currency, rate] of Object.entries(defaultRates)) {
        if (!existingCurrencies.has(currency)) {
          await this.create({
            currency,
            rate,
            lastUpdated: now,
            updatedBy,
            createdAt: now,
          })
        }
      }
    } catch (error) {
      console.error('Error initializing default exchange rates:', error)
      throw error
    }
  }

  // Get rates as a map for easy lookup
  async getRatesMap(): Promise<Record<string, number>> {
    try {
      const rates = await this.getAllRates()
      const ratesMap: Record<string, number> = {}
      
      rates.forEach(rate => {
        ratesMap[rate.currency] = rate.rate
      })

      // Always include NGN
      ratesMap['NGN'] = 1

      return ratesMap
    } catch (error) {
      console.error('Error getting rates map:', error)
      throw error
    }
  }
}

export const exchangeRateService = new ExchangeRateService()

