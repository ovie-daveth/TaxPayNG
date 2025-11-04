"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, HelpCircle, Sparkles, MessageSquare, Search, X, BookOpen, Building2, User, RefreshCw, Menu, X as XIcon } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import OtaxLogo from "@/components/OtaxLogo"
import { faqData } from "./components/data"


// Simple fuzzy search function
function findBestMatch(query: string, faqs: typeof faqData.individuals) {
  const lowerQuery = query.toLowerCase()
  const queryWords = lowerQuery.split(/\s+/).filter(w => w.length > 2)
  
  let bestMatches: Array<{ faq: typeof faqData.individuals[0], score: number }> = []
  
  faqs.forEach(faq => {
    let score = 0
    
    // Check question match
    const questionLower = faq.question.toLowerCase()
    if (questionLower.includes(lowerQuery)) {
      score += 100
    }
    
    // Check keyword matches
    faq.keywords.forEach(keyword => {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        score += 20
      }
    })
    
    // Check word matches
    queryWords.forEach(word => {
      if (questionLower.includes(word)) {
        score += 15
      }
      if (faq.answer.toLowerCase().includes(word)) {
        score += 5
      }
    })
    
    // Check category match
    if (faq.category.toLowerCase().includes(lowerQuery)) {
      score += 10
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

export default function FAQPage() {
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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    // Welcome message (only on initial mount)
    if (messages.length === 0) {
      setMessages([{
        type: "assistant",
        content: `👋 Hello! I'm your OTax AI assistant. I can help answer questions about Nigeria's new tax reform (Nigeria Tax Act 2025, effective January 1, 2026), including:\n\n• Tax brackets and rates (0% on first ₦800k, then 15%, 18%, 21%, 23%, 25%)\n• Tax reliefs and deductions (rent relief up to ₦500k, pension up to 8%, etc.)\n• Capital gains tax and exemptions\n• Employment income and benefits-in-kind\n• Small business exemptions (0% CIT for companies ≤ ₦100M turnover)\n• VAT regulations (7.5% rate, ₦100M threshold)\n• Tax registration and TIN requirements\n• Filing deadlines and self-assessment\n• Tax clearance certificates\n• Advance rulings and clarifications\n• Penalties and compliance\n• Tax refunds\n• Objection and appeal processes\n• PAYE obligations\n• Record keeping requirements\n• Nigeria Revenue Service (NRS) and tax administration\n• Tax Appeal Tribunal and dispute resolution\n• Tax Ombud and taxpayer rights\n• Virtual assets and cryptocurrency taxation\n• How OTax can help you\n\nWhat would you like to know?`,
      }])
    }
    // Generate quick questions (when category changes or on mount)
    generateQuickQuestions()
  }, [generateQuickQuestions, messages.length])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || isTyping) return

    const userMessage = input.trim().toLowerCase()
    const originalInput = input.trim()
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
    setInput(question)
    setTimeout(() => {
      inputRef.current?.focus()
      handleSend()
    }, 100)
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
            {/* Messages - Scrollable */}
            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 scroll-smooth">
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
                        className={`max-w-[85%] md:max-w-[75%] rounded-lg p-4 ${
                          msg.type === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
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
                </div>

            {/* Input - Fixed at Bottom */}
            <div className="border-t bg-background flex-shrink-0 p-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  handleSend()
                }}
                className="flex gap-2 max-w-4xl mx-auto"
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
  )
}

