"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, HelpCircle, Sparkles, MessageSquare, Search, X, BookOpen, Building2, User, RefreshCw, Menu, X as XIcon, Share2, Copy, Check } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import OtaxLogo from "@/components/OtaxLogo"
import { faqData } from "./components/data"
import { toast } from "sonner"
import { conversationService, ConversationMessage } from "@/lib/services/conversationService"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"


// Enhanced ML-like matching algorithm with capability question detection
function findBestMatch(query: string, faqs: typeof faqData.individuals) {
  const lowerQuery = query.toLowerCase().trim()
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 2)
  
  // Handle abbreviations and synonyms
  const abbreviations: Record<string, string[]> = {
    'wht': ['withholding tax', 'withholding'],
    'cit': ['company income tax', 'corporate tax'],
    'vat': ['value added tax'],
    'paye': ['pay as you earn'],
    'cgt': ['capital gains tax'],
    'nrs': ['nigeria revenue service'],
  }
  
  // Handle common typos
  const typoCorrections: Record<string, string> = {
    'witholding': 'withholding',
    'withold': 'withhold',
    'witholden': 'withholding',
    'developement': 'development',
    'identifcation': 'identification',
    'identifaction': 'identification',
  }
  
  // Replace abbreviations with full terms
  let normalizedQuery = lowerQuery
  
  // First, fix typos
  Object.entries(typoCorrections).forEach(([typo, correct]) => {
    const regex = new RegExp(typo, 'gi')
    normalizedQuery = normalizedQuery.replace(regex, correct)
  })
  
  // Then handle abbreviations
  Object.entries(abbreviations).forEach(([abbr, fullTerms]) => {
    if (normalizedQuery.includes(abbr)) {
      normalizedQuery = normalizedQuery.replace(abbr, fullTerms[0])
    }
  })
  
  // Handle synonyms
  const synonyms: Record<string, string[]> = {
    'development fee': ['development levy'],
    'development tax': ['development levy'],
  }
  
  Object.entries(synonyms).forEach(([synonym, terms]) => {
    if (normalizedQuery.includes(synonym)) {
      normalizedQuery = normalizedQuery.replace(synonym, terms[0])
    }
  })
  
  // Extract key tax terms that should be prioritized
  const keyTaxTerms = [
    'withholding tax',
    'development levy',
    'company income tax',
    'capital gains tax',
    'value added tax',
    'pay as you earn',
    'paye',
    'withholding',
  ]
  
  let matchedKeyTerm = ''
  // Check normalized query first (after synonym replacement)
  for (const term of keyTaxTerms) {
    if (normalizedQuery.includes(term)) {
      matchedKeyTerm = term
      break
    }
  }
  // Also check original query for abbreviations
  if (!matchedKeyTerm) {
    for (const term of keyTaxTerms) {
      if (lowerQuery.includes(term)) {
        matchedKeyTerm = term
        break
      }
    }
  }
  
  // Detect "what is X" questions
  const whatIsPatterns = [
    /what\s+is\s+(?:the\s+)?(.+?)(?:\s+and|\s+or|\?|$)/i,
    /what\s+does\s+(?:the\s+)?(.+?)\s+mean/i,
    /explain\s+(?:what\s+is\s+)?(.+?)(?:\s+and|\s+or|\?|$)/i,
    /tell\s+me\s+about\s+(?:the\s+)?(.+?)(?:\s+and|\s+or|\?|$)/i,
    /define\s+(?:the\s+)?(.+?)(?:\s+and|\s+or|\?|$)/i,
    /describe\s+(?:the\s+)?(.+?)(?:\s+and|\s+or|\?|$)/i,
  ]
  
  let isDefinitionQuestion = false
  let extractedSubject = ""
  
  for (const pattern of whatIsPatterns) {
    const match = normalizedQuery.match(pattern)
    if (match) {
      isDefinitionQuestion = true
      extractedSubject = match[1].trim()
      // Apply synonym replacement to extracted subject too
      Object.entries(synonyms).forEach(([synonym, terms]) => {
        if (extractedSubject.includes(synonym)) {
          extractedSubject = extractedSubject.replace(synonym, terms[0])
        }
      })
      break
    }
  }
  
  // If query is just a term (like "development fee" or "WHT"), treat as definition question
  if (!isDefinitionQuestion && queryWords.length <= 3 && !lowerQuery.includes('?')) {
    isDefinitionQuestion = true
    extractedSubject = normalizedQuery
  }
  
  // If we have a matched key term but no extracted subject, use the key term as subject
  if (matchedKeyTerm && !extractedSubject) {
    extractedSubject = matchedKeyTerm
  }
  
  // If we have extracted subject but no matched key term, check if subject matches a key term
  if (extractedSubject && !matchedKeyTerm) {
    for (const term of keyTaxTerms) {
      if (extractedSubject.includes(term) || term.includes(extractedSubject)) {
        matchedKeyTerm = term
        break
      }
    }
  }
  
  // Detect capability questions (e.g., "can otax help me file returns")
  const capabilityPatterns = [
    /can\s+(otax|you|it)\s+(help|do|assist|support|handle|provide|file|calculate|track|manage|organize)/i,
    /does\s+(otax|it)\s+(help|do|support|handle|provide|file|calculate|track|manage|organize|can)/i,
    /(otax|you|it)\s+(can|will|does|helps?|help|do|assist|support|handle|provide|file|calculate|track|manage|organize)/i,
    /(can|will|does)\s+(otax|you|it)\s+(help\s+me\s+)?(file|calculate|track|manage|organize|stay|get|register)/i,
  ]
  
  const isCapabilityQuestion = capabilityPatterns.some(pattern => pattern.test(query))
  
  // Extract action/service from capability questions
  let extractedAction = ""
  if (isCapabilityQuestion) {
    // Extract keywords after "can otax help me" or similar patterns
    const actionPatterns = [
      /(?:can|does|will)\s+(?:otax|you|it)\s+(?:help\s+me\s+)?(?:to\s+)?(file|calculate|track|manage|organize|stay|get|register|prepare|submit|complete|handle|assist|support|do|provide)/i,
      /(?:help|assist|support|do|provide|file|calculate|track|manage|organize|stay|get|register|prepare|submit|complete|handle)\s+(?:me\s+)?(?:to\s+)?(?:file|calculate|track|manage|organize|stay|get|register|prepare|submit|complete|handle|returns?|tax|vat|paye|certificate|records?|compliant|refund|appeal|objection)/i,
    ]
    
    for (const pattern of actionPatterns) {
      const match = query.match(pattern)
      if (match) {
        extractedAction = match[1] || match[0]
        break
      }
    }
    
    // If no specific action found, extract nouns after "help me"
    if (!extractedAction) {
      const helpMatch = query.match(/(?:help|assist|support)\s+(?:me\s+)?(?:to\s+)?(.+)/i)
      if (helpMatch) {
        extractedAction = helpMatch[1].trim()
      }
    }
  }
  
  let bestMatches: Array<{ faq: typeof faqData.individuals[0], score: number }> = []
  
  faqs.forEach(faq => {
    let score = 0
    const questionLower = faq.question.toLowerCase()
    const answerLower = faq.answer.toLowerCase()
    const keywordsLower = faq.keywords.map(k => k.toLowerCase())
    
    // Check if this is a list/compilation FAQ (like "50 exemptions")
    const isListFAQ = questionLower.includes('50') || 
                      (questionLower.includes('exemptions') && questionLower.includes('reliefs')) ||
                      questionLower.includes('all exemptions') ||
                      questionLower.includes('complete list')
    
    // Track exact matches for use in generic matching skip logic
    let hasExactSubject = false
    let hasExactTerm = false
    
    // FIRST PRIORITY: If it's a definition question, prioritize definition FAQs heavily
    if (isDefinitionQuestion && extractedSubject) {
      const subjectLower = extractedSubject.toLowerCase()
      const subjectWords = subjectLower.split(/\s+/).filter(w => w.length > 2)
      
      // Check if FAQ contains the EXACT subject (multi-word terms like "withholding tax")
      hasExactSubject = questionLower.includes(subjectLower) || keywordsLower.some(k => k.includes(subjectLower))
      
      // EXTREMELY high score for FAQs that start with "What is" and contain the EXACT subject
      if ((questionLower.startsWith('what is') || questionLower.startsWith('what are')) && hasExactSubject) {
        score += 1500
      }
      
      // Very high score for FAQs that start with "What is" and contain the subject (partial match)
      if ((questionLower.startsWith('what is') || questionLower.startsWith('what are')) && 
          (questionLower.includes(subjectLower) || subjectWords.some(word => questionLower.includes(word)))) {
        score += 1000
      }
      
      // High score if FAQ question contains the EXACT subject
      if (hasExactSubject) {
        score += 800
      }
      
      // High score if FAQ keywords contain the EXACT subject
      if (keywordsLower.some(k => k.includes(subjectLower))) {
        score += 600
      }
      
      // Medium score if FAQ question contains subject words (partial match)
      if (subjectWords.some(word => questionLower.includes(word))) {
        score += 200
      }
      
      // LOW score if answer contains the subject (this is less important than question/keywords)
      if (answerLower.includes(subjectLower) || subjectWords.some(word => answerLower.includes(word))) {
        score += 100
      }
      
      // HEAVILY penalize FAQs that only match on generic words when we have a specific term
      // If subject is multi-word (like "withholding tax") but FAQ only matches on generic word (like "tax")
      if (subjectLower.split(' ').length > 1) {
        const genericWords = ['tax', 'fee', 'levy', 'number', 'service']
        const hasGenericWordOnly = genericWords.some(gw => 
          subjectLower.includes(gw) && 
          questionLower.includes(gw) && 
          !hasExactSubject
        )
        if (hasGenericWordOnly) {
          score -= 400  // Heavy penalty for matching only on generic word
        }
      }
      
      // HEAVILY penalize list FAQs when asking for definitions
      if (isListFAQ) {
        score -= 600  // Heavy penalty for list FAQs
        // Even heavier penalty if the list FAQ mentions the subject but isn't specifically about it
        if (answerLower.includes(subjectLower) && !questionLower.includes(subjectLower)) {
          score -= 400  // Additional penalty for mentioning it in answer but not question
        }
      }
      
      // Boost score for FAQs in relevant category
      if (faq.category.toLowerCase().includes(subjectLower.split(' ')[0])) {
        score += 200
      }
    }
    
    // SECOND PRIORITY: If a key tax term is matched, prioritize FAQs about that specific term
    if (matchedKeyTerm) {
      const termLower = matchedKeyTerm.toLowerCase()
      hasExactTerm = questionLower.includes(termLower) || keywordsLower.some(k => k.includes(termLower))
      
      // Extremely high score if FAQ question contains the exact term AND starts with "What is"
      if (hasExactTerm && (questionLower.startsWith('what is') || questionLower.startsWith('what are'))) {
        score += 1200
      }
      
      // Very high score if FAQ question contains the exact term
      if (questionLower.includes(termLower)) {
        score += 800
      }
      
      // High score if FAQ keywords contain the exact term
      if (keywordsLower.some(k => k.includes(termLower))) {
        score += 600
      }
      
      // LOW score if answer contains the term (less important)
      if (answerLower.includes(termLower)) {
        score += 100
      }
      
      // HEAVILY penalize FAQs that only match on generic words when we have a specific term
      // If term is multi-word (like "withholding tax") but FAQ only matches on generic word (like "tax")
      if (termLower.split(' ').length > 1 && !hasExactTerm) {
        const genericWords = ['tax', 'fee', 'levy', 'number', 'service']
        const hasGenericWordOnly = genericWords.some(gw => 
          termLower.includes(gw) && 
          questionLower.includes(gw)
        )
        if (hasGenericWordOnly) {
          score -= 500  // Very heavy penalty for matching only on generic word
        }
      }
      
      // HEAVILY penalize list FAQs when asking about specific terms
      if (isListFAQ && !hasExactTerm) {
        score -= 600
        // Even if list FAQ mentions term in answer, heavily penalize it
        if (answerLower.includes(termLower)) {
          score -= 400
        }
      }
      
      // Penalize FAQs that don't match the specific term
      if (!hasExactTerm && !answerLower.includes(termLower)) {
        score -= 300
      }
    }
    
    // If it's a capability question, prioritize FAQs that mention capabilities
    if (isCapabilityQuestion) {
      // High score for FAQs that explicitly mention OTax capabilities
      if (answerLower.includes('otax') && (answerLower.includes('help') || answerLower.includes('can') || answerLower.includes('file') || answerLower.includes('calculate'))) {
        score += 150
      }
      
      // Boost score if FAQ question asks about OTax capabilities
      if (questionLower.includes('otax') && (questionLower.includes('help') || questionLower.includes('can'))) {
        score += 120
      }
      
      // Match extracted action against FAQ content
      if (extractedAction) {
        const actionLower = extractedAction.toLowerCase()
        // Check if action matches keywords
        keywordsLower.forEach(keyword => {
          if (keyword.includes(actionLower) || actionLower.includes(keyword)) {
            score += 80
          }
        })
        
        // Check if action appears in answer
        if (answerLower.includes(actionLower)) {
          score += 60
        }
        
        // Check if action appears in question
        if (questionLower.includes(actionLower)) {
          score += 50
        }
      }
      
      // Match common action keywords
      const actionKeywords = ['file', 'calculate', 'track', 'manage', 'organize', 'help', 'stay', 'get', 'register', 'prepare', 'submit', 'complete', 'returns', 'tax', 'vat', 'paye', 'certificate', 'records', 'compliant', 'refund', 'appeal', 'objection']
      actionKeywords.forEach(action => {
        if (lowerQuery.includes(action)) {
          if (answerLower.includes(action)) score += 40
          if (questionLower.includes(action)) score += 30
          if (keywordsLower.some(k => k.includes(action))) score += 25
        }
      })
    }
    
    // Original matching logic (only applies if NOT a definition question with specific term)
    // Skip generic matching when we have a definition question with a specific multi-word term
    const skipGenericMatching = isDefinitionQuestion && matchedKeyTerm && matchedKeyTerm.split(' ').length > 1
    
    if (!skipGenericMatching) {
      // Check exact question match
      if (questionLower.includes(normalizedQuery) || questionLower.includes(lowerQuery)) {
        score += 100
      }
      
      // Check keyword matches
      keywordsLower.forEach(keyword => {
        if (normalizedQuery.includes(keyword) || lowerQuery.includes(keyword)) {
          score += 20
        }
      })
      
      // Check word matches
      const normalizedWords = normalizedQuery.split(/\s+/).filter(w => w.length > 2)
      normalizedWords.forEach(word => {
        if (questionLower.includes(word)) {
          score += 15
        }
        if (answerLower.includes(word)) {
          score += 5
        }
      })
      
      // Also check original query words
      queryWords.forEach(word => {
        if (questionLower.includes(word)) {
          score += 15
        }
        if (answerLower.includes(word)) {
          score += 5
        }
      })
      
      // Check category match
      if (faq.category.toLowerCase().includes(normalizedQuery) || faq.category.toLowerCase().includes(lowerQuery)) {
        score += 10
      }
      
      // Semantic similarity: check for similar meaning words
      const semanticGroups = [
        ['file', 'filing', 'returns', 'submit', 'prepare'],
        ['calculate', 'compute', 'work out', 'figure'],
        ['help', 'assist', 'support', 'aid'],
        ['track', 'monitor', 'follow', 'keep'],
        ['manage', 'organize', 'handle', 'maintain'],
        ['stay', 'remain', 'keep', 'maintain'],
        ['tax', 'taxation', 'taxable', 'taxpayer'],
        ['compliant', 'compliance', 'conform', 'obey'],
      ]
      
      semanticGroups.forEach(group => {
        const queryHasWord = group.some(word => normalizedQuery.includes(word) || lowerQuery.includes(word))
        const faqHasWord = group.some(word => 
          questionLower.includes(word) || 
          answerLower.includes(word) || 
          keywordsLower.some(k => k.includes(word))
        )
        
        if (queryHasWord && faqHasWord) {
          score += 30
        }
      })
    } else {
      // When we have a definition question with specific term, ONLY allow exact matches
      // This prevents generic word matching from interfering
      const hasExactMatch = questionLower.includes(normalizedQuery) || questionLower.includes(lowerQuery)
      if (!hasExactMatch && !hasExactSubject && !hasExactTerm) {
        // Penalize FAQs that don't have exact match
        score -= 200
      }
    }
    
    if (score > 0) {
      bestMatches.push({ faq, score })
    }
  })
  
  // Sort by score and return top 3
  return bestMatches
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(m => m.faq)
}

function FAQPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedCategory, setSelectedCategory] = useState<"individuals" | "businesses">("individuals")
  const [messages, setMessages] = useState<Array<{ 
    type: "user" | "assistant", 
    content: string, 
    faq?: typeof faqData.individuals[0],
    suggestedQuestions?: typeof faqData.individuals[0][]
  }>>([])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [quickQuestions, setQuickQuestions] = useState<typeof faqData.individuals[0][]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [copied, setCopied] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const [hasLoadedWelcome, setHasLoadedWelcome] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const quickQuestionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Set sidebar state based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }
    
    handleResize() // Set initial state
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Function to generate random quick questions
  const generateQuickQuestions = useCallback(() => {
    const currentFaqs = selectedCategory === "individuals" ? faqData.individuals : faqData.businesses
    // Shuffle array and take 10 random questions
    const shuffled = [...currentFaqs].sort(() => Math.random() - 0.5)
    setQuickQuestions(shuffled.slice(0, 10))
  }, [selectedCategory])

  // Load conversation from URL on mount
  useEffect(() => {
    const loadConversationFromUrl = async () => {
      const shareId = searchParams.get('share')
      // Skip loading if:
      // 1. No shareId in URL
      // 2. Already loading
      // 3. Already have this conversation loaded (conversationId matches AND we have messages)
      //    This prevents reloading when we just saved and updated the URL
      if (!shareId || isLoadingConversation || (conversationId === shareId && messages.length > 0)) {
        return
      }
      
      setIsLoadingConversation(true)
      try {
        const conversation = await conversationService.getConversation(shareId)
        if (conversation) {
          setConversationId(conversation.shareId || shareId)
          setSelectedCategory(conversation.category)
          setHasLoadedWelcome(true) // Prevent welcome message from showing
          // Convert conversation messages to the format used in state
          const formattedMessages = conversation.messages.map(msg => ({
            type: msg.type as "user" | "assistant",
            content: msg.content,
            faq: msg.faq ? {
              question: msg.faq.question,
              answer: msg.faq.answer,
              category: msg.faq.category,
              keywords: msg.faq.keywords
            } : undefined,
            suggestedQuestions: msg.suggestedQuestions?.map(sq => ({
              question: sq.question,
              answer: sq.answer,
              category: sq.category,
              keywords: sq.keywords
            }))
          }))
          setMessages(formattedMessages)
          // toast.success("Conversation loaded!")
        } else {
          toast.error("Conversation not found")
        }
      } catch (error) {
        console.error("Error loading conversation:", error)
        toast.error("Failed to load conversation")
      } finally {
        setIsLoadingConversation(false)
      }
    }
    
    loadConversationFromUrl()
  }, [searchParams, conversationId, messages.length, isLoadingConversation])

  // Auto-save conversation when messages change (but not during initial load)
  useEffect(() => {
    // Skip auto-save if loading from URL or if it's just the welcome message
    if (isLoadingConversation || messages.length <= 1) {
      return
    }

    const saveConversation = async () => {
      try {
        const conversationMessages: ConversationMessage[] = messages.map(msg => ({
          type: msg.type,
          content: msg.content,
          faq: msg.faq ? {
            question: msg.faq.question,
            answer: msg.faq.answer,
            category: msg.faq.category,
            keywords: msg.faq.keywords
          } : undefined,
          suggestedQuestions: msg.suggestedQuestions?.map(sq => ({
            question: sq.question,
            answer: sq.answer,
            category: sq.category,
            keywords: sq.keywords
          }))
        }))

        const savedId = await conversationService.saveConversation({
          category: selectedCategory,
          messages: conversationMessages,
          shareId: conversationId || undefined
        })
        
        if (!conversationId && savedId) {
          setConversationId(savedId)
          // Update URL without reload
          router.replace(`/faq?share=${savedId}`, { scroll: false })
        }
      } catch (error) {
        console.error("Error saving conversation:", error)
        // Don't show error toast for auto-save failures
      }
    }

    // Debounce auto-save to avoid too many writes
    const timeoutId = setTimeout(saveConversation, 2000)
    return () => clearTimeout(timeoutId)
  }, [messages, selectedCategory, conversationId, isLoadingConversation, router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    // Welcome message (only on initial mount and if no conversation loaded from URL)
    const shareId = searchParams.get('share')
    if (!hasLoadedWelcome && messages.length === 0 && !shareId && !isLoadingConversation) {
      setMessages([{
        type: "assistant",
        content: `👋 Hello! I'm your OTax AI assistant. I can help answer questions about Nigeria's new tax reform (Nigeria Tax Act 2025, effective January 1, 2026), including:\n\n• Tax brackets and rates (0% on first ₦800k, then 15%, 18%, 21%, 23%, 25%)\n• Tax reliefs and deductions (rent relief up to ₦500k, pension up to 8%, etc.)\n• Capital gains tax and exemptions\n• Employment income and benefits-in-kind\n• Small business exemptions (0% CIT for companies ≤ ₦100M turnover)\n• VAT regulations (7.5% rate, ₦100M threshold)\n• Tax registration and TIN requirements\n• Filing deadlines and self-assessment\n• Tax clearance certificates\n• Advance rulings and clarifications\n• Penalties and compliance\n• Tax refunds\n• Objection and appeal processes\n• PAYE obligations\n• Record keeping requirements\n• Nigeria Revenue Service (NRS) and tax administration\n• Tax Appeal Tribunal and dispute resolution\n• Tax Ombud and taxpayer rights\n• Virtual assets and cryptocurrency taxation\n• How OTax can help you\n\nWhat would you like to know?`,
      }])
      setHasLoadedWelcome(true)
    }
    // Generate quick questions (when category changes or on mount)
    if (!isLoadingConversation) {
      generateQuickQuestions()
    }
  }, [generateQuickQuestions, searchParams, isLoadingConversation, hasLoadedWelcome])

  const handleSend = (messageOverride?: string) => {
    const inputToUse = messageOverride || input
    if (!inputToUse.trim() || isTyping) return

    const userMessage = inputToUse.trim().toLowerCase()
    const originalInput = inputToUse.trim()
    setInput("")
    
    // Check for gratitude/acknowledgment phrases
    const gratitudePatterns = /\b(thanks?|thank you|thx|appreciate it|appreciate|good to know|got it|understood|ok thanks|okay thanks|perfect|great|awesome|nice)\b/
    if (gratitudePatterns.test(userMessage)) {
      setMessages(prev => [...prev, { type: "user", content: originalInput }])
      setIsTyping(true)
      
      setTimeout(() => {
        const currentFaqs = selectedCategory === "individuals" ? faqData.individuals : faqData.businesses
        const categories = [...new Set(currentFaqs.map(f => f.category))]
        const randomCategories = categories.slice(0, 4).sort(() => Math.random() - 0.5)
        
        setMessages(prev => [...prev, {
          type: "assistant",
          content: "You're welcome! 😊\n\nIs there anything else you'd like to know? I can help with:\n\n• Tax brackets and rates (0% on first ₦800k, then 15%, 18%, 21%, 23%, 25%)\n• Tax reliefs and deductions (rent relief up to ₦500k, pension up to 8%, etc.)\n• Capital gains tax and exemptions\n• Employment income and benefits-in-kind\n• Freelancer/creator taxation\n• Small business exemptions (0% CIT, VAT exemptions)\n• VAT regulations (7.5% rate, ₦100M threshold)\n• Tax registration and TIN requirements\n• Filing deadlines and self-assessment\n• Tax clearance certificates\n• Advance rulings\n• Penalties and compliance\n• Tax refunds\n• Objection and appeal processes\n• PAYE obligations\n• Record keeping requirements\n• Virtual assets and cryptocurrency taxation\n• Nigeria Revenue Service (NRS) and tax administration\n• Tax Appeal Tribunal and dispute resolution\n• Tax Ombud and taxpayer rights\n• OTax platform features\n\nJust ask me anything!"
        }])
        setIsTyping(false)
      }, 800)
      return
    }
    
    // Check if user is selecting a suggested question by number
    const numberMatch = userMessage.match(/^(?:tell me about|i want to know about|select|choose|show me|answer|what about|explain)\s*(\d+)|^(\d+)$/)
    const selectedNumber = numberMatch ? (numberMatch[1] || numberMatch[2]) : null
    
    // Find the last message with suggested questions
    const lastMessageWithSuggestions = [...messages].reverse().find(m => m.suggestedQuestions && m.suggestedQuestions.length > 0)
    
    if (selectedNumber && lastMessageWithSuggestions?.suggestedQuestions) {
      const questionIndex = parseInt(selectedNumber) - 1
      if (questionIndex >= 0 && questionIndex < lastMessageWithSuggestions.suggestedQuestions.length) {
        const selectedQuestion = lastMessageWithSuggestions.suggestedQuestions[questionIndex]
        // Add user message showing their selection
        setMessages(prev => [...prev, { 
          type: "user", 
          content: `${selectedNumber}. ${selectedQuestion.question}` 
        }])
        setIsTyping(true)
        
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              type: "assistant",
              content: selectedQuestion.answer,
              faq: selectedQuestion
            }
          ])
          setIsTyping(false)
        }, 800)
        return
      }
    }
    
    // Check if user is typing a question that matches a suggested question
    if (lastMessageWithSuggestions?.suggestedQuestions) {
      const matchingQuestion = lastMessageWithSuggestions.suggestedQuestions.find(
        q => q.question.toLowerCase().includes(userMessage) || userMessage.includes(q.question.toLowerCase().substring(0, 20))
      )
      
      if (matchingQuestion) {
        setMessages(prev => [...prev, { type: "user", content: matchingQuestion.question }])
        setIsTyping(true)
        
        setTimeout(() => {
          setMessages(prev => [
            ...prev,
            {
              type: "assistant",
              content: matchingQuestion.answer,
              faq: matchingQuestion
            }
          ])
          setIsTyping(false)
        }, 800)
        return
      }
    }
    
    // Regular question handling
    setMessages(prev => [...prev, { type: "user", content: originalInput }])
    setIsTyping(true)

    // Simulate AI thinking
    setTimeout(() => {
      const currentFaqs = selectedCategory === "individuals" ? faqData.individuals : faqData.businesses
      const matches = findBestMatch(userMessage, currentFaqs)
      
      if (matches.length > 0) {
        const bestMatch = matches[0]
        setMessages(prev => [
          ...prev,
          {
            type: "assistant",
            content: bestMatch.answer,
            faq: bestMatch
          }
        ])
        
        // If there are other relevant matches, suggest them
        if (matches.length > 1) {
          setTimeout(() => {
            setMessages(prev => [...prev, {
              type: "assistant",
              content: `💡 You might also find these helpful:\n\n${matches.slice(1).map((m, i) => `${i + 1}. ${m.question}`).join('\n')}\n\nWould you like to know more about any of these?`,
              suggestedQuestions: matches.slice(1)
            }])
            setIsTyping(false)
          }, 1000)
          return
        }
      } else {
        setMessages(prev => [...prev, {
          type: "assistant",
          content: "I'm not sure I understand that question. Could you rephrase it? Here are some topics I can help with:\n\n• Tax brackets and rates (0% on first ₦800k, then 15%, 18%, 21%, 23%, 25%)\n• Tax reliefs and deductions (rent relief up to ₦500k, pension up to 8%, etc.)\n• Capital gains tax and exemptions\n• Employment income and benefits-in-kind\n• Freelancer/creator taxation\n• Small business exemptions (0% CIT, VAT exemptions)\n• VAT regulations (7.5% rate, ₦100M threshold)\n• Tax registration and TIN requirements\n• Filing deadlines and self-assessment\n• Tax clearance certificates\n• Advance rulings\n• Penalties and compliance\n• Tax refunds\n• Objection and appeal processes\n• PAYE obligations\n• Record keeping requirements\n• Virtual assets and cryptocurrency taxation\n• Nigeria Revenue Service (NRS) and tax administration\n• Tax Appeal Tribunal and dispute resolution\n• Tax Ombud and taxpayer rights\n• OTax platform features",
        }])
      }
      
      setIsTyping(false)
    }, 800)
  }

  const handleQuestionClick = (question: typeof faqData.individuals[0]) => {
    setInput(question.question)
    setTimeout(() => {
      inputRef.current?.focus()
      handleSend()
    }, 100)
  }

  const handleQuickQuestion = (question: string) => {
    // Clear any pending timeout from previous quick question click
    if (quickQuestionTimeoutRef.current) {
      clearTimeout(quickQuestionTimeoutRef.current)
      quickQuestionTimeoutRef.current = null
    }
    
    setInput(question)
    quickQuestionTimeoutRef.current = setTimeout(() => {
      inputRef.current?.focus()
      handleSend(question) // Pass the question directly to avoid state timing issues
      quickQuestionTimeoutRef.current = null
    }, 100)
  }

  // Share conversation functions
  const formatConversation = () => {
    if (messages.length === 0) return ""
    
    let formatted = `💬 OTax AI Conversation - ${selectedCategory === "individuals" ? "Individuals & Creators" : "Small Businesses"}\n\n`
    formatted += `Date: ${new Date().toLocaleDateString()}\n\n`
    formatted += "─".repeat(50) + "\n\n"
    
    messages.forEach((msg, idx) => {
      if (msg.type === "user") {
        formatted += `👤 You:\n${msg.content}\n\n`
      } else {
        // Remove markdown formatting for plain text
        let content = msg.content
        content = content.replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        content = content.replace(/\*(.*?)\*/g, '$1') // Remove italic
        content = content.replace(/•/g, '-') // Replace bullet points
        
        formatted += `🤖 OTax AI:\n${content}\n\n`
        if (msg.faq) {
          formatted += `📁 Category: ${msg.faq.category}\n\n`
        }
      }
      formatted += "─".repeat(50) + "\n\n"
    })
    
    if (typeof window !== 'undefined') {
      formatted += `\n💡 Learn more at: ${window.location.origin}/faq`
    }
    return formatted
  }

  const handleShareConversation = async () => {
    if (messages.length === 0) {
      toast.error("No conversation to share")
      return
    }

    // Ensure conversation is saved
    if (!conversationId) {
      try {
        const conversationMessages: ConversationMessage[] = messages.map(msg => ({
          type: msg.type,
          content: msg.content,
          faq: msg.faq ? {
            question: msg.faq.question,
            answer: msg.faq.answer,
            category: msg.faq.category,
            keywords: msg.faq.keywords
          } : undefined,
          suggestedQuestions: msg.suggestedQuestions?.map(sq => ({
            question: sq.question,
            answer: sq.answer,
            category: sq.category,
            keywords: sq.keywords
          }))
        }))

        const savedId = await conversationService.saveConversation({
          category: selectedCategory,
          messages: conversationMessages
        })
        
        if (savedId) {
          setConversationId(savedId)
          router.replace(`/faq?share=${savedId}`, { scroll: false })
        }
      } catch (error) {
        console.error("Error saving conversation:", error)
        toast.error("Failed to save conversation")
        return
      }
    }

    // Generate shareable link
    const shareUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}/faq?share=${conversationId}` 
      : ''
    
    const conversationText = formatConversation()
    const shareText = `${conversationText}\n\n🔗 View full conversation: ${shareUrl}`

    // Try Web Share API first (mobile devices)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: "OTax AI Conversation",
          text: shareText,
          url: shareUrl
        })
        toast.success("Conversation shared!")
        return
      } catch (error: any) {
        // User cancelled or error occurred, fall back to copy
        if (error.name !== 'AbortError') {
          console.error("Error sharing:", error)
        }
      }
    }

    // Fallback to copy to clipboard
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareText)
        setCopied(true)
        toast.success("Shareable link copied to clipboard!")
        setTimeout(() => setCopied(false), 2000)
      } catch (error) {
        console.error("Error copying to clipboard:", error)
        toast.error("Failed to copy conversation")
      }
    } else {
      toast.error("Copy functionality not available in this browser")
    }
  }

  const handleCopySingleMessage = async (content: string, type: "user" | "assistant") => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      toast.error("Copy functionality not available")
      return
    }
    
    try {
      // Clean markdown formatting
      let text = content
      text = text.replace(/\*\*(.*?)\*\*/g, '$1')
      text = text.replace(/\*(.*?)\*/g, '$1')
      text = text.replace(/•/g, '-')
      
      const prefix = type === "user" ? "👤 You:\n\n" : "🤖 OTax AI:\n\n"
      await navigator.clipboard.writeText(prefix + text)
      toast.success("Message copied to clipboard!")
    } catch (error) {
      console.error("Error copying message:", error)
      toast.error("Failed to copy message")
    }
  }

  const currentFaqs = selectedCategory === "individuals" ? faqData.individuals : faqData.businesses
  const categories = [...new Set(currentFaqs.map(f => f.category))]

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 flex-shrink-0">
        <div className="px-4 md:px-8 lg:px-[150px] mx-auto py-3 md:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <OtaxLogo />
            <div className="flex items-center gap-2 ml-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-2 py-1 rounded-full font-medium border border-orange-200 dark:border-orange-800">
                BETA
              </span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Blog
            </Link>
            <Link href="/faq" className="text-sm font-medium text-foreground">
              FAQ
            </Link>
          </nav>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden md:flex gap-2">
              <Button
                variant={selectedCategory === "individuals" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedCategory("individuals")
                  setMessages([{
                    type: "assistant",
                    content: `👋 Switched to **Individual/Freelancer** mode. I can help with questions about:\n\n• Tax brackets (0% on first ₦800k, then 15%, 18%, 21%, 23%, 25%)\n• Tax reliefs (rent relief up to ₦500k, pension up to 8%, NHF, NHIS, etc.)\n• Capital gains tax and exemptions\n• Employment income and benefits-in-kind\n• Freelancer/content creator taxation\n• Platform income (YouTube, Upwork, TikTok)\n• Tax calculation step-by-step\n• Tax registration and TIN requirements\n• Filing deadlines and self-assessment\n• Tax clearance certificates\n• Objection and appeal processes\n• Record keeping requirements\n• Penalties and compliance\n• Tax refunds\n• Nigeria Revenue Service (NRS) and tax administration\n• Tax Appeal Tribunal and appeals\n• Tax Ombud and your rights\n\nWhat would you like to know?`,
                  }])
                }}
                className="flex items-center gap-1 text-xs"
              >
                <User className="w-3 h-3" />
                Individuals
              </Button>
              <Button
                variant={selectedCategory === "businesses" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedCategory("businesses")
                  setMessages([{
                    type: "assistant",
                    content: `👋 Switched to **Small Business** mode. I can help with questions about:\n\n• Small company definition (turnover ≤ ₦100M, assets ≤ ₦250M)\n• Company Income Tax (0% for small companies, 30% for large)\n• VAT regulations (7.5% rate, ₦100M threshold)\n• Development Levy (4%, exempt for small companies)\n• Withholding tax exemptions\n• Business tax reliefs and deductions\n• Startups and tech business incentives\n• Agriculture and manufacturing exemptions\n• Specialized industries (insurance, mining, free zones)\n• Business registration and TIN requirements\n• Company filing deadlines (6 months for existing, 18 months for new)\n• PAYE obligations and deadlines\n• Tax clearance certificates\n• Advance rulings\n• Record keeping (6 years minimum)\n• Penalties and compliance\n• Tax refunds\n• Settlement of disputes\n• Virtual Assets Service Providers (VASP)\n• Nigeria Revenue Service (NRS) and tax administration\n• Tax Appeal Tribunal and appeals\n• Tax Ombud and your rights\n\nWhat would you like to know?`,
                  }])
                }}
                className="flex items-center gap-1 text-xs"
              >
                <Building2 className="w-3 h-3" />
                Businesses
              </Button>
            </div>
            <ThemeToggle />
            <Link href="/#waitlist">
              <Button size="sm" className="hidden md:flex">
                <span className="relative z-10">Join Waitlist</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content - Full Screen */}
      <div className="flex-1 flex gap-0 lg:gap-6 overflow-hidden relative">
        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-80 lg:w-80' : 'w-0'} transition-all duration-300 overflow-hidden flex-shrink-0 ${sidebarOpen ? 'block' : 'hidden lg:block'} ${sidebarOpen ? 'fixed lg:relative z-30 h-full left-0 top-0 lg:left-auto lg:top-auto' : ''}`}>
          {sidebarOpen && (
            <div className="h-full flex flex-col border-r bg-background shadow-lg lg:shadow-none">
                  <div className="p-4 pb-3 flex-shrink-0 border-b">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold">Quick Questions</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={generateQuickQuestions}
                          className="h-8 w-8 p-0"
                          title="Generate new questions"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSidebarOpen(false)}
                          className="h-8 w-8 p-0"
                          title="Close sidebar"
                        >
                          <XIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scroll-smooth" style={{ scrollbarWidth: 'thin' }}>
                    {quickQuestions.map((faq, idx) => (
                      <button
                        key={`${faq.question}-${idx}`}
                        onClick={() => handleQuickQuestion(faq.question)}
                        className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted hover:border-primary transition-all text-sm"
                      >
                        <p className="font-medium line-clamp-2">{faq.question}</p>
                        <p className="text-xs text-muted-foreground mt-1">{faq.category}</p>
                      </button>
                    ))}
                  </div>
                  
                  <div className="p-4 pt-3 border-t flex-shrink-0">
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm font-medium">Browse by Category</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {categories.slice(0, 4).map((cat, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            const categoryFaqs = currentFaqs.filter(f => f.category === cat)
                            if (categoryFaqs.length > 0) {
                              handleQuickQuestion(categoryFaqs[0].question)
                            }
                          }}
                          className="text-xs px-3 py-1 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

        {/* Chat Interface - Full Width */}
        <div className="flex-1 flex flex-col min-w-0 relative h-full">
          {!sidebarOpen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="absolute left-4 top-4 z-20 h-9 w-9 p-0 bg-background border shadow-sm"
              title="Open sidebar"
            >
              <Menu className="w-4 h-4" />
            </Button>
          )}
          <div className="h-full flex flex-col bg-background">
            {/* Mobile Sidebar Toggle */}
            <div className="lg:hidden p-3 border-b flex items-center justify-between flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="h-8 px-3"
              >
                <Menu className="w-4 h-4 mr-2" />
                Quick Questions
              </Button>
            </div>
            {/* Chat Header with Share Button */}
            {messages.length > 0 && (
              <div className="hidden lg:flex items-center justify-between px-4 md:px-8 py-3 border-b flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">OTax AI Conversation</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShareConversation}
                  className="h-8 gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span className="text-xs">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      <span className="text-xs">Share</span>
                    </>
                  )}
                </Button>
              </div>
            )}
            {/* Messages - Scrollable */}
            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 scroll-smooth">
              {isLoadingConversation ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex flex-col items-center gap-3">
                    <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                    <p className="text-sm text-muted-foreground">Loading conversation...</p>
                  </div>
                </div>
              ) : (
              <div className="max-w-4xl mx-auto space-y-6">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-3 ${
                        msg.type === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {msg.type === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Sparkles className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[85%] md:max-w-[75%] rounded-lg p-4 relative group ${
                          msg.type === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {/* Share/Copy button for each message */}
                        {msg.type === "assistant" && !msg.suggestedQuestions && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopySingleMessage(msg.content, msg.type)}
                            className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                            title="Copy message"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        )}
                        {msg.type === "user" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopySingleMessage(msg.content, msg.type)}
                            className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/20"
                            title="Copy message"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        )}
                        {msg.type === "assistant" && msg.suggestedQuestions ? (
                          <div className="space-y-2">
                            <p className="text-sm whitespace-pre-wrap mb-3">{msg.content.split('\n\n')[0]}</p>
                            <div className="space-y-2 pt-2 border-t border-border/50">
                              {msg.suggestedQuestions.map((suggestedQ, qIdx) => (
                                <button
                                  key={qIdx}
                                  onClick={() => handleQuestionClick(suggestedQ)}
                                  className="w-full text-left p-3 rounded-lg border border-border hover:bg-background hover:border-primary transition-all text-sm text-left block"
                                >
                                  <span className="font-medium text-primary">{qIdx + 1}.</span> {suggestedQ.question}
                                </button>
                              ))}
                            </div>
                            <p className="text-sm mt-3 text-muted-foreground">
                              Would you like to know more about any of these?
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        )}
                        {msg.faq && (
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <p className="text-xs opacity-70 font-medium">{msg.faq.category}</p>
                          </div>
                        )}
                      </div>
                      {msg.type === "user" && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isTyping && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 text-primary" />
                      </div>
                      <div className="bg-muted rounded-lg p-4">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                  </div>
              )}
            </div>

            {/* Input - Fixed at Bottom */}
            <div className="border-t bg-background flex-shrink-0 p-4">
              <div className="max-w-4xl mx-auto">
                {/* Mobile Share Button */}
                {messages.length > 0 && (
                  <div className="lg:hidden mb-3 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleShareConversation}
                      className="h-8 gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span className="text-xs">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3 h-3" />
                          <span className="text-xs">Share Conversation</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSend()
                  }}
                  className="flex gap-2"
                >
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question about taxes..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                />
                <Button type="submit" disabled={!input.trim() || isTyping}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FAQPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    }>
      <FAQPageContent />
    </Suspense>
  )
}

