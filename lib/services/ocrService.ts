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
      console.log('OCR completed')
      
      // Normalize common OCR mistakes
      let normalizedText = text
        .replace(/[#＃]/g, '₦') // Replace # with ₦
        .replace(/\bN\s+(\d)/g, '₦$1') // N 200.00 → ₦200.00
        .replace(/(\d)\s+00\b/g, '$1.00') // Fix "200 00" → "200.00"
        .replace(/[oO](?=\d)/g, '0') // Fix O/o misread as 0
        .replace(/[Il|](?=\d{2}\.)/g, '1') // Fix I/l/| misread as 1
      
      console.log('Normalized text (first 500 chars):', normalizedText.substring(0, 500))
      
      // Parse the extracted text (use normalized text)
      const receiptData = this.parseReceiptText(normalizedText, confidence)
      // Store original raw text
      receiptData.rawText = text
      
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
    
    // Log raw text for debugging
    console.log('=== RAW OCR TEXT ===')
    console.log(text)
    console.log('=== END RAW TEXT ===')
    console.log('Lines extracted:', lines)
    
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

    // FIXED: Enhanced amount extraction with better patterns for Nigerian receipts (especially OPay)
    const amountPatterns = [
      // Pattern 0: Look for lines that start with currency symbol (common in OPay receipts)
      /^[₦#N]\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gm,
      // Pattern 1: Naira symbol with amount (₦200.00) - most common in OPay
      /[₦#]\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
      // Pattern 2: Amount with Naira symbol after (200.00₦)
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*[₦#]/g,
      // Pattern 3: NGN/N prefix (NGN 200.00 or N 200.00)
      /\b(?:NGN|N)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
      // Pattern 4: Standalone amount with 2 decimals on its own line or after whitespace
      // FIXED: More specific for prominent amounts like "200.00" displayed large
      /(?:^|\n|\s)(\d{1,3}(?:,\d{3})*\.\d{2})(?:\s|\n|$)/gm,
      // Pattern 5: Amount near keywords (especially "Successful" in OPay receipts)
      /(?:amount|total|sum|paid|transaction|successful)\s*[:=]?\s*[₦#N]?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
      // Pattern 6: Large prominent numbers (like 200.00 or 50,000.00) - common in receipts
      /\b(\d{1,3}(?:,\d{3})*\.\d{2})\b/g,
      // Pattern 7: Simple decimal numbers with exactly 2 decimals
      /\b(\d+\.\d{2})\b/g,
      // Pattern 8: Amount after "₦" or "#" without space (OCR might read as one token)
      /[₦#](\d+(?:,\d{3})*(?:\.\d{2})?)/g,
    ]

    let bestMatch: { amount: string; value: number; score: number; context: string; pattern: number } | null = null
    const allMatches: Array<{ amount: string; value: number; score: number; context: string; pattern: number }> = []

    for (let patternIndex = 0; patternIndex < amountPatterns.length; patternIndex++) {
      const pattern = amountPatterns[patternIndex]
      const matches = [...text.matchAll(pattern)]
      
      for (const match of matches) {
        if (match[1]) {
          const amountStr = match[1].replace(/,/g, '')
          const amountValue = parseFloat(amountStr)
          
          // Get context around the match
          const matchIndex = match.index || 0
          const contextStart = Math.max(0, matchIndex - 80)
          const contextEnd = Math.min(text.length, matchIndex + match[0].length + 80)
          const context = text.substring(contextStart, contextEnd)
          const contextLower = context.toLowerCase()
          
          console.log(`Pattern ${patternIndex}: Found "${amountStr}" (${amountValue}) | Full match: "${match[0]}" | Context: "${context.substring(0, 120).replace(/\n/g, ' ')}"`)
          
          // Check if this looks like an account number or reference
          const isAccountNumber = 
            /account\s*(?:number|no\.?|#)?\s*[:=]?\s*\d{10,}/.test(contextLower) ||
            /\d{10,}/.test(match[1]) || // Numbers with 10+ digits
            /\*{4,}/.test(match[0]) || // Masked numbers like 814****675
            /session\s*id/i.test(contextLower) ||
            /transaction\s*no/i.test(contextLower) ||
            /reference/i.test(contextLower)
          
          // Check if it's a partial account number (3-4 digits near account context)
          // FIXED: Don't reject amounts that are legitimate transaction amounts
          const isPartialAccount = 
            (amountValue >= 100 && amountValue < 1000) && 
            (/814|310|675|616/g.test(match[1])) &&
            /account|sender|recipient|opay|bank/i.test(contextLower) &&
            !/transaction|amount|successful|receipt/i.test(contextLower) // Don't reject if near transaction keywords
          
          // Valid transaction amounts
          const isValidAmount = amountValue >= 0.01 && amountValue <= 100000000
          
          if (!isAccountNumber && !isPartialAccount && isValidAmount) {
            let score = 0
            
            // HIGHEST PRIORITY: Has exactly 2 decimal places
            if (amountStr.match(/^\d+\.\d{2}$/)) score += 200
            
            // Reasonable transaction amount
            if (amountValue >= 1 && amountValue <= 1000000) score += 70
            if (amountValue >= 100 && amountValue <= 100000) score += 20 // Sweet spot
            
            // FIXED: Don't penalize small amounts if they have currency symbol or are in prominent position
            if (amountValue < 10) {
              // Only penalize if it's NOT near currency symbol or transaction keywords
              if (!/[₦#]/.test(match[0]) && !/transaction|amount|successful|receipt/i.test(contextLower)) {
                score -= 30
              }
            }
            
            // Near transaction keywords (especially "Successful" in OPay receipts)
            if (/successful/i.test(contextLower)) score += 80 // High priority for OPay receipts
            if (/transaction|receipt|amount|total|paid|transfer/i.test(contextLower)) score += 60
            
            // Has currency symbol (₦ or #)
            if (/[₦#]/.test(match[0])) score += 50
            
            // NOT near account/reference keywords
            if (!/account|session|reference|transaction\s*no|sender|recipient|id/i.test(contextLower)) score += 40
            
            // Position-based scoring (earlier = more likely to be transaction amount)
            const relativePosition = matchIndex / text.length
            if (relativePosition < 0.15) score += 40 // First 15%
            else if (relativePosition < 0.30) score += 25 // First 30%
            else if (relativePosition < 0.50) score += 10 // First 50%
            
            // On its own line (common for prominent amounts)
            const lineBreakBefore = text.substring(Math.max(0, matchIndex - 5), matchIndex).includes('\n')
            const lineBreakAfter = text.substring(matchIndex + match[0].length, Math.min(text.length, matchIndex + match[0].length + 5)).includes('\n')
            if (lineBreakBefore || lineBreakAfter) score += 30
            
            // Bonus for early patterns (more specific)
            if (patternIndex === 0) score += 30 // Line starting with currency
            if (patternIndex === 1) score += 20 // Currency symbol before
            
            const matchData = {
              amount: amountStr,
              value: amountValue,
              score,
              context: context.substring(0, 100).replace(/\n/g, ' '),
              pattern: patternIndex
            }
            
            allMatches.push(matchData)
            
            if (!bestMatch || score > bestMatch.score) {
              bestMatch = matchData
            }
          } else {
            if (isAccountNumber) console.log(`  ↳ REJECTED: Looks like account number`)
            if (isPartialAccount) console.log(`  ↳ REJECTED: Partial account number`)
            if (!isValidAmount) console.log(`  ↳ REJECTED: Invalid amount range`)
          }
        }
      }
    }

    // Log all matches for debugging
    console.log('\n=== ALL AMOUNT MATCHES ===')
    console.table(allMatches.sort((a, b) => b.score - a.score))
    console.log('=== END MATCHES ===\n')
    
    if (bestMatch) {
      receiptData.amount = bestMatch.amount
      console.log(`✓ SELECTED AMOUNT: ${bestMatch.amount} (Score: ${bestMatch.score}, Pattern: ${bestMatch.pattern})`)
    } else {
      console.log('✗ NO VALID AMOUNT FOUND')
      console.log('Tip: Check if OCR is correctly reading the currency symbol and decimal points')
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

    // FIXED: Enhanced remark/description extraction for OPay and other Nigerian receipts
    const remarkPatterns = [
      // Pattern 0: "Remark:" or "Remark :" followed by text
      /(?:remark|narration|description|memo|purpose)\s*:?\s*([^\n]+?)(?:\n|transaction|session|$)/i,
      // Pattern 1: Look for "Remark" on its own line, then capture next line
      /remark\s*:?\s*\n\s*([^\n]+?)(?:\n|transaction|session|$)/i,
      // Pattern 2: Common OPay format - "Remark" followed by text on same or next line
      /remark\s*:?\s*([a-z][^\n]{2,100}?)(?:\n|transaction|session|id|no|$)/i,
    ]

    for (const pattern of remarkPatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        let remark = match[1].trim()
        // Clean up remark - remove transaction numbers, session IDs, etc.
        remark = remark.replace(/\d{10,}/g, '').replace(/\s+/g, ' ').trim()
        remark = remark.replace(/transaction\s*no\.?.*$/i, '').trim()
        remark = remark.replace(/session\s*id.*$/i, '').trim()
        // Remove common trailing patterns
        remark = remark.replace(/\s*[:\-]\s*$/, '').trim()
        
        if (remark.length > 2 && remark.length < 200 && !/^\d+$/.test(remark)) {
          receiptData.notes = remark
          receiptData.description = remark // FIXED: Also set as description
          console.log('✓ Extracted remark/description:', remark)
          break
        }
      }
    }
    
    // Fallback: Look for common remark patterns without explicit "Remark:" label
    // This helps with receipts where OCR might miss the label
    if (!receiptData.notes) {
      // Look for short text phrases (2-5 words) that appear between transaction details
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase()
        // Check if this line looks like a remark (short, no numbers, common words)
        if (
          line.length > 5 && 
          line.length < 50 &&
          !/\d{4,}/.test(line) && // No long numbers
          !/transaction|session|account|bank|opay|successful|date|time/i.test(line) && // Not a label
          /^[a-z\s]+$/.test(line.replace(/[^a-z\s]/g, '')) && // Mostly letters
          line.split(/\s+/).length >= 2 && // At least 2 words
          line.split(/\s+/).length <= 8 // At most 8 words
        ) {
          // Check if previous line mentions "remark" or similar
          const prevLine = i > 0 ? lines[i - 1].toLowerCase() : ''
          if (/remark|narration|description|memo|purpose/i.test(prevLine) || 
              (prevLine.length < 10 && /remark|narration/i.test(prevLine))) {
            receiptData.notes = lines[i]
            receiptData.description = lines[i]
            console.log('✓ Extracted remark/description (fallback):', lines[i])
            break
          }
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