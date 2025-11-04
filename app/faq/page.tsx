"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Send, HelpCircle, Sparkles, MessageSquare, Search, X, BookOpen, Building2, User } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import OtaxLogo from "@/components/OtaxLogo"
import Footer from "@/components/footer"

// FAQ Knowledge Base
const faqData = {
  individuals: [
    {
      question: "What is the new tax reform about?",
      answer: "The new tax reform introduces fairer, simpler tax rules that ease the burden on low- and middle-income earners while closing loopholes for large corporations. It updates rates, adds new reliefs, and exempts small businesses and low-income individuals from several taxes.",
      category: "Tax Reform Overview",
      keywords: ["tax reform", "new tax", "reform", "changes", "updates"]
    },
    {
      question: "Do freelancers and content creators need to pay tax?",
      answer: "Yes. If you earn income from freelancing, brand deals, digital services, or content creation, it's taxable under the Personal Income Tax Act. The good news is that incomes below ₦1.2 million per year are exempt, and you can claim several deductions and reliefs to lower what you owe.",
      category: "Freelancers & Creators",
      keywords: ["freelancer", "creator", "content creator", "tax", "pay tax", "income"]
    },
    {
      question: "What tax reliefs are available for individuals?",
      answer: "You can claim deductions for pension contributions, National Housing Fund (NHF), National Health Insurance Scheme (NHIS), rent (up to 20% capped at ₦500,000), life insurance premiums, and interest on housing loans. Compensation for job loss up to ₦50 million is also exempt.",
      category: "Tax Reliefs",
      keywords: ["relief", "deduction", "pension", "NHF", "NHIS", "rent", "insurance"]
    },
    {
      question: "Who qualifies as a small business under the new law?",
      answer: "A small company is one with an annual turnover not exceeding ₦100 million and total fixed assets not above ₦250 million. Such businesses are exempt from Company Income Tax (CIT), development levies, and even withholding tax in many cases.",
      category: "Small Business",
      keywords: ["small business", "qualify", "turnover", "assets", "exempt"]
    },
    {
      question: "What happens if I earn through platforms like YouTube, Upwork, or TikTok?",
      answer: "You'll still file your income under personal tax since those platforms don't deduct Nigerian taxes automatically. You can use tools like **OTax** to track your yearly earnings and calculate your taxable income accurately.",
      category: "Platform Income",
      keywords: ["platform", "YouTube", "Upwork", "TikTok", "income", "earn", "file"]
    },
    {
      question: "How can I calculate my taxable income?",
      answer: "Add up all your income for the year, then subtract your allowable deductions — pension, NHF, NHIS, rent relief, and business expenses. The remainder is your taxable income. OTax can handle these calculations automatically for you.",
      category: "Tax Calculation",
      keywords: ["calculate", "taxable income", "deduction", "OTax", "calculation"]
    },
    {
      question: "Are transport or fuel allowances still tax-free?",
      answer: "Under the new reform, transport and fuel allowances are not separate exemptions unless provided as part of employment relief or wage support. However, businesses offering these supports to low-income workers can claim **50% deduction relief.**",
      category: "Allowances",
      keywords: ["transport", "fuel", "allowance", "tax-free", "exemption"]
    },
    {
      question: "What taxes do small businesses still pay?",
      answer: "Depending on your turnover, you may still charge or remit VAT (if over ₦100 million), pay employee PAYE if you have staff, and file annual returns. But several exemptions apply, especially for small companies, agriculture, and startups.",
      category: "Small Business",
      keywords: ["small business", "pay", "VAT", "PAYE", "taxes", "exemptions"]
    },
    {
      question: "How does OTax help me stay compliant?",
      answer: "OTax helps you organize your records, calculate your total income and deductions, and file accurately. It's designed to help freelancers, creators, and small businesses stay compliant without the headache of manual bookkeeping.",
      category: "OTax Platform",
      keywords: ["OTax", "compliant", "help", "organize", "calculate", "file"]
    },
    {
      question: "What happens if I don't pay tax?",
      answer: "Failure to register, file, or pay taxes may attract penalties or interest. However, the government is focusing on voluntary compliance, education, and digital filing tools like OTax to make it easier and fairer for everyone.",
      category: "Compliance",
      keywords: ["don't pay", "penalty", "consequences", "failure", "compliance"]
    }
  ],
  businesses: [
    {
      question: "What does the new tax reform mean for small businesses?",
      answer: "The reform simplifies compliance, removes multiple taxes, and grants full exemptions to small companies with turnover under ₦100 million and total assets under ₦250 million. It's designed to help businesses grow without excessive tax pressure.",
      category: "Tax Reform Overview",
      keywords: ["tax reform", "small business", "exemption", "compliance", "simplify"]
    },
    {
      question: "Are small businesses still required to pay Company Income Tax (CIT)?",
      answer: "No. Small companies (turnover ≤ ₦100 million) pay **0% CIT**. Medium-sized businesses (₦100–₦500 million) enjoy reduced rates, while large companies pay the standard rate.",
      category: "Company Income Tax",
      keywords: ["CIT", "company income tax", "small business", "pay", "0%", "exempt"]
    },
    {
      question: "Do small businesses have to register for VAT?",
      answer: "Only if your annual turnover exceeds ₦100 million. Below that threshold, you are **exempt** from charging, collecting, or remitting VAT.",
      category: "VAT",
      keywords: ["VAT", "register", "small business", "exempt", "turnover"]
    },
    {
      question: "What is the Development Levy, and do I need to pay it?",
      answer: "The Development Levy is a 4% charge meant to support national infrastructure. Small companies are **fully exempt** from it under the new law.",
      category: "Development Levy",
      keywords: ["development levy", "4%", "pay", "exempt", "infrastructure"]
    },
    {
      question: "What tax reliefs can my business claim?",
      answer: "Businesses can claim deductions for pension contributions, staff training, and salary increases for low-income employees. There's also a **50% employment relief** for hiring and retaining new workers for at least three years.",
      category: "Tax Reliefs",
      keywords: ["relief", "deduction", "pension", "training", "employment relief"]
    },
    {
      question: "What incentives are available for startups and tech businesses?",
      answer: "Recognized startups get **tax holidays and investor reliefs**, including CIT exemptions and tax-free capital gains on qualified startup investments. Investments by venture capitalists and accelerators are also tax-exempt.",
      category: "Startups & Tech",
      keywords: ["startup", "tech", "incentive", "tax holiday", "investor", "capital gains"]
    },
    {
      question: "What about agricultural or manufacturing businesses?",
      answer: "Agricultural businesses enjoy a **five-year tax holiday**, and both agriculture and manufacturing sectors get VAT exemptions on fertilizers, machinery, diesel, and power equipment.",
      category: "Agriculture & Manufacturing",
      keywords: ["agriculture", "manufacturing", "tax holiday", "five-year", "VAT exemption"]
    },
    {
      question: "Do I still need to file PAYE for my employees?",
      answer: "Yes. Employers must deduct and remit PAYE monthly for staff, but lower-income employees benefit from reduced rates and new personal tax reliefs.",
      category: "PAYE",
      keywords: ["PAYE", "employees", "file", "deduct", "remit"]
    },
    {
      question: "Are withholding taxes still deducted from small business payments?",
      answer: "Small companies are **exempt from withholding tax deductions** — both on their income and on payments they make to suppliers.",
      category: "Withholding Tax",
      keywords: ["withholding tax", "small business", "exempt", "deduction", "suppliers"]
    },
    {
      question: "How can OTax help my business stay compliant?",
      answer: "OTax helps you track income, manage expenses, and calculate VAT, PAYE, and deductions automatically. It keeps your books audit-ready, ensures timely filings, and helps you benefit from every available relief under the new law.",
      category: "OTax Platform",
      keywords: ["OTax", "compliant", "track", "calculate", "VAT", "PAYE", "relief"]
    }
  ]
}

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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Welcome message
    setMessages([{
      type: "assistant",
      content: `👋 Hello! I'm your OTax AI assistant. I can help answer questions about Nigeria's new tax reform (effective January 1, 2026), tax reliefs, compliance, and how OTax can help you. What would you like to know?`,
    }])
  }, [])

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
          content: "You're welcome! 😊\n\nIs there anything else you'd like to know? I can help with:\n\n• Tax reform overview\n• Tax reliefs and deductions\n• Freelancer/creator taxation\n• Small business exemptions\n• OTax platform features\n• Compliance requirements\n\nJust ask me anything!"
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
          content: "I'm not sure I understand that question. Could you rephrase it? Here are some topics I can help with:\n\n• Tax reform overview\n• Tax reliefs and deductions\n• Freelancer/creator taxation\n• Small business exemptions\n• OTax platform features\n• Compliance requirements",
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="px-[150px] mx-auto py-5 flex items-center justify-between">
          <Link href="/">
            <OtaxLogo />
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
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/#waitlist">
              <Button size="lg">
                <span className="relative z-10">Join the Waitlist</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
              <h1 className="text-4xl md:text-5xl font-bold">Ask OTax AI</h1>
              <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-full font-medium border border-orange-200 dark:border-orange-800">
                BETA
              </span>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-2">
              Get instant answers about Nigeria's new tax reform, tax reliefs, compliance, and how OTax can help you.
            </p>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                This is a beta version. We're continuously improving and will integrate advanced AI APIs soon.
              </span>
            </p>
          </div>

          {/* Category Toggle */}
          <div className="flex justify-center gap-4 mb-8">
            <Button
              variant={selectedCategory === "individuals" ? "default" : "outline"}
              onClick={() => {
                setSelectedCategory("individuals")
                setMessages([{
                  type: "assistant",
                  content: `👋 Switched to **Individual/Freelancer** mode. I can help with questions about personal tax, freelancer taxation, content creator income, tax reliefs, and compliance. What would you like to know?`,
                }])
              }}
              className="flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              Individuals & Creators
            </Button>
            <Button
              variant={selectedCategory === "businesses" ? "default" : "outline"}
              onClick={() => {
                setSelectedCategory("businesses")
                setMessages([{
                  type: "assistant",
                  content: `👋 Switched to **Small Business** mode. I can help with questions about business tax exemptions, VAT, CIT, PAYE, withholding tax, and business compliance. What would you like to know?`,
                }])
              }}
              className="flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              Small Businesses
            </Button>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Chat Interface */}
            <div className="lg:col-span-2">
              <Card className="h-[600px] flex flex-col">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                        className={`max-w-[80%] rounded-lg p-4 ${
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

                {/* Input */}
                <div className="border-t p-4">
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
              </Card>
            </div>

            {/* Quick Questions Sidebar */}
            <div className="lg:col-span-1">
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold">Quick Questions</h3>
                </div>
                <div className="space-y-2">
                  {currentFaqs.slice(0, 6).map((faq, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickQuestion(faq.question)}
                      className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted hover:border-primary transition-all text-sm"
                    >
                      <p className="font-medium line-clamp-2">{faq.question}</p>
                      <p className="text-xs text-muted-foreground mt-1">{faq.category}</p>
                    </button>
                  ))}
                </div>
                
                <div className="mt-6 pt-6 border-t">
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
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}

