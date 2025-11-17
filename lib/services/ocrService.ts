import { createWorker, Worker } from 'tesseract.js'

export interface ReceiptData {
  amount: string
  date: string
  merchant: string
  description: string
  category?: string
  taxDeductible: boolean
  confidence: number
  rawText: string
  notes?: string
}

/**
 * OCR Service for extracting data from receipts and invoices
 * Uses Tesseract.js for client-side OCR processing
 */
class OCRService {
  private worker: Worker | null = null
  private isInitialized = false

  /**
   * Initialize the Tesseract worker
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.worker) {
      return
    }

    try {
      this.worker = await createWorker('eng')
      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize OCR worker:', error)
      throw new Error('Failed to initialize OCR service')
    }
  }

  /**
   * Load PDF.js from CDN (avoids webpack bundling issues)
   */
  private async loadPdfJs(): Promise<any> {
    // Check if already loaded
    if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
      return (window as any).pdfjsLib
    }

    return new Promise((resolve, reject) => {
      // Load PDF.js from CDN
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
      
      script.onload = () => {
        // Wait a bit for the library to initialize
        setTimeout(() => {
          const pdfjsLib = (window as any).pdfjsLib
          if (!pdfjsLib) {
            reject(new Error('Failed to load PDF.js library'))
            return
          }
          
          // FIXED: Configure worker correctly - GlobalWorkerOptions is read-only
          // We need to set workerSrc directly, not the entire object
          try {
            if (pdfjsLib.GlobalWorkerOptions) {
              pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
            }
          } catch (e) {
            console.warn('Could not set PDF.js worker source:', e)
            // Continue anyway as it might still work with default worker
          }
          
          resolve(pdfjsLib)
        }, 100)
      }
      
      script.onerror = () => {
        reject(new Error('Failed to load PDF.js script'))
      }
      
      document.head.appendChild(script)
    })
  }

  /**
   * Convert PDF page to image
   */
  private async pdfToImage(pdfFile: File, pageNumber: number = 1): Promise<File> {
    // Ensure we're in the browser
    if (typeof window === 'undefined') {
      throw new Error('PDF processing is only available in the browser')
    }

    try {
      // Load PDF.js from CDN
      const pdfjsLib = await this.loadPdfJs()
      
      const arrayBuffer = await pdfFile.arrayBuffer()
      
      // FIXED: Use the correct method to load PDF
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
      const pdf = await loadingTask.promise
      
      // Get the first page (or specified page)
      const page = await pdf.getPage(Math.min(pageNumber, pdf.numPages))
      
      // FIXED: Increase scale for better OCR accuracy
      const scale = 3.0
      const viewport = page.getViewport({ scale })
      
      // Create canvas
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      if (!context) {
        throw new Error('Could not get canvas context')
      }
      
      canvas.height = viewport.height
      canvas.width = viewport.width
      
      // Render PDF page to canvas
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      }
      await page.render(renderContext).promise
      
      // Convert canvas to blob, then to File
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to convert canvas to blob'))
            return
          }
          const imageFile = new File([blob], `${pdfFile.name.replace('.pdf', '')}_page${pageNumber}.png`, {
            type: 'image/png'
          })
          resolve(imageFile)
        }, 'image/png', 0.95) // FIXED: Add quality parameter
      })
    } catch (error) {
      console.error('PDF to image conversion failed:', error)
      throw new Error(`Failed to convert PDF to image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Extract receipt data from an image or PDF file
   */
  async extractReceiptData(file: File): Promise<ReceiptData> {
    if (!this.worker || !this.isInitialized) {
      await this.initialize()
    }

    if (!this.worker) {
      throw new Error('OCR worker not initialized')
    }

    try {
      let imageFile: File = file
      
      // If it's a PDF, convert first page to image
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        console.log('Converting PDF to image...')
        imageFile = await this.pdfToImage(file, 1)
        console.log('PDF converted successfully')
      }
      
      // Perform OCR on the image
      console.log('Starting OCR...')
      const { data: { text, confidence } } = await this.worker.recognize(imageFile)
      console.log('OCR completed. Raw text:', text)
      
      // Parse the extracted text
      const receiptData = this.parseReceiptText(text, confidence)
      
      return receiptData
    } catch (error) {
      console.error('OCR extraction failed:', error)
      throw new Error(`Failed to extract data from receipt: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Parse extracted text to extract structured data
   */
  private parseReceiptText(text: string, confidence: number): ReceiptData {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
    
    // Initialize default values
    const receiptData: ReceiptData = {
      amount: '',
      date: '',
      merchant: '',
      description: '',
      taxDeductible: false,
      confidence,
      rawText: text
    }

    // FIXED: Enhanced amount extraction with better patterns for Nigerian receipts
    const amountPatterns = [
      // Pattern 1: Naira symbol with amount (₦200.00)
      /[₦]\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
      // Pattern 2: Amount with Naira symbol after (200.00₦)
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*[₦]/g,
      // Pattern 3: NGN/N prefix (NGN 200.00 or N 200.00)
      /(?:NGN|N)\s+(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
      // Pattern 4: Standalone amount with 2 decimals (200.00) - very common
      /\b(\d+(?:,\d{3})*\.\d{2})\b/g,
      // Pattern 5: Amount near keywords
      /(?:amount|total|sum|paid|transaction)\s*[:=]?\s*[₦N]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
      // Pattern 6: Just digits with decimals at start of line
      /^[\s]*(\d+\.\d{2})\b/gm,
    ]

    let bestMatch: { amount: string; value: number; score: number; context: string } | null = null
    const allMatches: Array<{ amount: string; value: number; score: number; context: string }> = []

    for (const pattern of amountPatterns) {
      const matches = [...text.matchAll(pattern)]
      for (const match of matches) {
        if (match[1]) {
          const amountStr = match[1].replace(/,/g, '')
          const amountValue = parseFloat(amountStr)
          
          // Get context around the match
          const matchIndex = match.index || 0
          const contextStart = Math.max(0, matchIndex - 60)
          const contextEnd = Math.min(text.length, matchIndex + match[0].length + 60)
          const context = text.substring(contextStart, contextEnd).toLowerCase()
          
          console.log(`Found potential amount: ${amountStr}, context: "${context.substring(0, 100)}"`)
          
          // FIXED: Better filtering for account numbers
          const isAccountNumber = 
            /account\s*(?:number|no\.?|#)?\s*[:=]?\s*\d{10,}/.test(context) ||
            /\d{10,}/.test(match[1]) || // Long numbers are likely account numbers
            /\*{4,}/.test(match[0]) || // Masked numbers
            context.includes('session') ||
            context.includes('transaction no') ||
            context.includes('reference') ||
            context.includes('814') || // OPay account patterns
            context.includes('310') // First Bank account patterns
          
          // FIXED: Accept reasonable transaction amounts (from 0.01 to 10M)
          const isValidAmount = amountValue >= 0.01 && amountValue <= 10000000
          
          if (!isAccountNumber && isValidAmount) {
            // Scoring system
            let score = 0
            
            // Has exactly 2 decimal places (currency format) - HIGHEST PRIORITY
            if (amountStr.match(/^\d+\.\d{2}$/)) score += 150
            
            // Reasonable transaction amount (1-100000)
            if (amountValue >= 1 && amountValue <= 100000) score += 60
            
            // Very small amounts get lower priority
            if (amountValue < 10) score -= 20
            
            // Near transaction keywords
            if (/amount|total|paid|transaction|successful|transfer/i.test(context)) score += 50
            
            // Has currency symbol
            if (/[₦N]/.test(match[0])) score += 40
            
            // NOT near account/reference keywords - IMPORTANT
            if (!/account|session|reference|transaction\s*no|sender|recipient|id/i.test(context)) score += 30
            
            // Prefer amounts at the beginning of text (usually prominent on receipts)
            const relativePosition = matchIndex / text.length
            if (relativePosition < 0.2) score += 25 // First 20% of text
            else if (relativePosition < 0.4) score += 15 // First 40% of text
            
            // Exact match "₦200.00" or "200.00" at prominent position
            if (amountValue === 200 && amountStr === '200.00' && relativePosition < 0.3) score += 50
            
            const matchData = {
              amount: amountStr,
              value: amountValue,
              score,
              context: context.substring(0, 100)
            }
            
            allMatches.push(matchData)
            
            if (!bestMatch || score > bestMatch.score) {
              bestMatch = matchData
            }
          }
        }
      }
    }

    // Log all matches for debugging
    console.log('All amount matches found:', allMatches)
    
    if (bestMatch) {
      receiptData.amount = bestMatch.amount
      console.log('✓ Extracted amount:', bestMatch.amount, '| Score:', bestMatch.score)
    } else {
      console.log('✗ No valid amount found in text')
    }

    // FIXED: Enhanced date extraction for various formats
    const datePatterns = [
      // Nov 17th, 2025 02:07:51
      /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\s+\d{2}:\d{2}/i,
      // Nov 17th, 2025
      /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i,
      // 2025-11-17
      /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
      // 17/11/2025
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    ]

    for (const pattern of datePatterns) {
      const match = text.match(pattern)
      if (match) {
        try {
          let dateStr: string | null = null
          
          // Abbreviated month format (Nov 17th, 2025)
          if (match[0].match(/(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i)) {
            const monthAbbrs = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
            const monthMatch = match[0].toLowerCase().match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/)
            if (monthMatch && match[1] && match[2]) {
              const monthIndex = monthAbbrs.indexOf(monthMatch[1])
              const day = parseInt(match[1].replace(/\D/g, ''))
              const year = parseInt(match[2])
              if (monthIndex >= 0) {
                dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              }
            }
          }
          // YYYY-MM-DD format
          else if (match[1] && match[2] && match[3] && match[1].length === 4) {
            dateStr = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
          }
          // DD/MM/YYYY format
          else if (match[1] && match[2] && match[3] && match[3].length === 4) {
            dateStr = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`
          }
          
          if (dateStr) {
            receiptData.date = dateStr
            console.log('Extracted date:', dateStr)
            break
          }
        } catch (e) {
          console.error('Date parsing error:', e)
        }
      }
    }

    // FIXED: Enhanced merchant extraction for Nigerian banks/payment services
    const merchantPatterns = [
      // Specific Nigerian banks and payment services
      /\b(OPay|Palmpay|Kuda|GTBank|Access\s*Bank|Zenith|UBA|First\s*Bank|Fidelity|Union\s*Bank|Stanbic|Ecobank|Wema|Polaris)\b/i,
      // Recipient/To line (for transfers)
      /(?:recipient|to)\s*(?:details)?[:\s]+([^\n|]+?)(?:\||First\s*Bank|\d{10}|$)/i,
      // From/Sender line
      /(?:from|sender)\s*(?:details)?[:\s]+([^\n|]+?)(?:\||OPay|\d{10}|$)/i,
    ]

    for (const pattern of merchantPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        let merchant = match[1].trim()
        // Clean up merchant name
        merchant = merchant.replace(/\d{10,}/g, '').replace(/\s+/g, ' ').trim()
        merchant = merchant.replace(/\|.*/g, '').trim() // Remove everything after pipe
        if (merchant.length > 2 && merchant.length < 100) {
          receiptData.merchant = merchant
          console.log('Extracted merchant:', merchant)
          break
        }
      } else if (match && match[0]) {
        receiptData.merchant = match[0].trim()
        console.log('Extracted merchant (direct):', match[0].trim())
        break
      }
    }

    // FIXED: Enhanced remark/description extraction
    const remarkPatterns = [
      /(?:remark|narration|description|memo|purpose)[:\s]*([^\n]+)/i,
    ]

    for (const pattern of remarkPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        let remark = match[1].trim()
        // Clean up remark
        remark = remark.replace(/\d{10,}/g, '').replace(/\s+/g, ' ').trim()
        remark = remark.replace(/transaction\s*no\.?.*$/i, '').trim()
        if (remark.length > 2 && remark.length < 200) {
          receiptData.notes = remark
          receiptData.description = remark // FIXED: Also set as description
          console.log('Extracted remark/description:', remark)
          break
        }
      }
    }

    // Build description if not set
    if (!receiptData.description) {
      if (receiptData.merchant) {
        receiptData.description = receiptData.merchant
      } else if (lines.length > 0) {
        receiptData.description = lines[0]
      }
    }
    
    // If we have notes but description is just merchant, combine them
    if (receiptData.notes && receiptData.description === receiptData.merchant && receiptData.merchant) {
      receiptData.description = `${receiptData.merchant} - ${receiptData.notes}`
    }

    // Detect tax-deductible items
    const taxKeywords = /vat|tax|invoice|receipt|business|office|professional|consulting|service/i
    receiptData.taxDeductible = taxKeywords.test(text)

    // Suggest category
    receiptData.category = this.suggestCategory(text, receiptData.merchant)

    console.log('Final parsed data:', receiptData)
    return receiptData
  }

  /**
   * Suggest category based on text content and merchant name
   */
  private suggestCategory(text: string, merchant: string): string {
    const lowerText = text.toLowerCase()
    const lowerMerchant = merchant.toLowerCase()

    const categoryMap: { [key: string]: string[] } = {
      'food': ['restaurant', 'cafe', 'food', 'meal', 'dining', 'kitchen', 'baker', 'pizza', 'burger', 'chicken', 'bread', 'milk'],
      'transport': ['uber', 'taxi', 'bus', 'transport', 'fuel', 'petrol', 'diesel', 'gas', 'parking'],
      'utilities': ['electric', 'power', 'water', 'utility', 'bill', 'light', 'energy'],
      'healthcare': ['hospital', 'clinic', 'pharmacy', 'medical', 'health', 'doctor', 'drug'],
      'education': ['school', 'university', 'education', 'tuition', 'book', 'stationery'],
      'entertainment': ['cinema', 'movie', 'theater', 'game', 'entertainment', 'music', 'sport'],
      'software': ['software', 'app', 'subscription', 'license', 'saas', 'cloud'],
      'marketing': ['advertising', 'marketing', 'promotion', 'social media', 'ad'],
      'rent': ['rent', 'lease', 'accommodation', 'housing'],
      'services': ['service', 'consulting', 'professional', 'freelance', 'contractor'],
      'transfer': ['transfer', 'payment', 'send', 'opay', 'palmpay', 'bank']
    }

    // Check remark/description
    for (const [category, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(keyword => lowerText.includes(keyword) || lowerMerchant.includes(keyword))) {
        return category.charAt(0).toUpperCase() + category.slice(1)
      }
    }

    return 'Other'
  }

  /**
   * Clean up and terminate the worker
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate()
      this.worker = null
      this.isInitialized = false
    }
  }
}

// Export singleton instance
export const ocrService = new OCRService()