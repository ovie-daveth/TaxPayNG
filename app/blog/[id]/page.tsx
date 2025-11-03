"use client"

import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, Clock, User, Share2, BookOpen, Tag, Loader2 } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import OtaxLogo from "@/components/OtaxLogo"
import { Badge } from "@/components/ui/badge"
import { BlogComments } from "@/components/blog/blog-comments"
import { db } from "@/firebase/firebase"
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore"
import { format } from "date-fns"

interface BlogPost {
  id: string
  title: string
  excerpt: string
  author: string
  publishedAt: string
  readTime: string
  category: string
  content: string
  featuredImage?: string
}

// Blog posts data with full content (fallback)
const blogPosts = [
  {
    id: 1,
    title: "Understanding Nigerian Tax Laws: A Complete Guide for 2026",
    excerpt: "Navigate the latest Nigerian tax regulations with confidence. Learn about LIRS and NRS compliance, deductions, and how to maximize your tax savings.",
    author: "OTax Team",
    date: "January 15, 2026",
    readTime: "8 min read",
    category: "Tax Guide",
    image: "/placeholder.svg",
    content: `
      <p>Navigating the Nigerian tax system can be complex, especially with the constant updates to tax laws and regulations. As we enter 2026, there have been significant changes to how taxes are calculated, filed, and paid in Nigeria. This comprehensive guide will help you understand the key aspects of Nigerian tax law and ensure you remain compliant while maximizing your deductions.</p>

      <h2>Overview of Nigerian Tax System</h2>
      <p>The Nigerian tax system is managed by two primary bodies: the Lagos Inland Revenue Service (LIRS) for Lagos State and the Nigeria Revenue Service (NRS) for federal taxes. Both agencies have their own regulations and requirements that taxpayers must adhere to.</p>

      <h3>Key Tax Types in Nigeria</h3>
      <ul>
        <li><strong>Personal Income Tax (PIT):</strong> Applied to individuals' income, including salaries, business profits, and investments.</li>
        <li><strong>Company Income Tax (CIT):</strong> Applied to companies' profits at a rate of 30% for large companies and lower rates for small businesses.</li>
        <li><strong>Value Added Tax (VAT):</strong> Currently set at 7.5% on most goods and services.</li>
        <li><strong>Withholding Tax:</strong> Deducted at source for various transactions including dividends, interest, and professional fees.</li>
      </ul>

      <h2>LIRS Compliance Requirements</h2>
      <p>For residents of Lagos State, the LIRS has specific requirements:</p>
      <ul>
        <li>Annual filing deadline: March 31st of the following year</li>
        <li>Monthly PAYE remittance for employees</li>
        <li>Quarterly returns for self-employed individuals</li>
        <li>Digital tax receipt system for all transactions</li>
      </ul>

      <h2>NRS Federal Tax Requirements</h2>
      <p>The Nigeria Revenue Service handles federal tax obligations:</p>
      <ul>
        <li>Company income tax returns</li>
        <li>VAT returns (monthly filing)</li>
        <li>Capital gains tax on asset disposals</li>
        <li>Stamp duties and other federal taxes</li>
      </ul>

      <h2>Maximizing Your Tax Deductions</h2>
      <p>Understanding allowable deductions can significantly reduce your tax liability:</p>
      <ul>
        <li><strong>Business Expenses:</strong> All legitimate business expenses are deductible, including office rent, utilities, and professional fees.</li>
        <li><strong>Capital Allowances:</strong> Depreciation on business assets can be claimed over their useful life.</li>
        <li><strong>Personal Reliefs:</strong> Including personal allowances, dependent allowances, and disability reliefs.</li>
        <li><strong>Pension Contributions:</strong> Contributions to approved pension schemes are tax-deductible up to certain limits.</li>
      </ul>

      <h2>Best Practices for Tax Compliance</h2>
      <p>To ensure smooth tax filing and compliance:</p>
      <ol>
        <li>Keep detailed records of all income and expenses throughout the year</li>
        <li>Use digital tools to track transactions and categorize expenses automatically</li>
        <li>File returns before deadlines to avoid penalties</li>
        <li>Consult with tax professionals for complex situations</li>
        <li>Stay updated on changes to tax laws and regulations</li>
      </ol>

      <h2>Conclusion</h2>
      <p>Staying compliant with Nigerian tax laws doesn't have to be overwhelming. With proper planning, record-keeping, and the right tools, you can navigate the tax system confidently while ensuring you're not overpaying on your taxes.</p>
    `
  },
  {
    id: 2,
    title: "10 Essential Tax Deductions Every Nigerian Freelancer Should Know",
    excerpt: "Discover the deductions and reliefs available to freelancers in Nigeria. From home office expenses to professional development costs, maximize your savings.",
    author: "OTax Team",
    date: "January 10, 2026",
    readTime: "6 min read",
    category: "For Freelancers",
    image: "/placeholder.svg",
    content: `
      <p>As a freelancer in Nigeria, maximizing your tax deductions is crucial for reducing your tax liability and keeping more of your hard-earned income. Many freelancers miss out on valuable deductions simply because they're unaware of what's allowable under Nigerian tax law. Here are the top 10 deductions you should be taking advantage of.</p>

      <h2>1. Home Office Expenses</h2>
      <p>If you work from home, you can claim a portion of your rent, utilities, and internet costs. Calculate this based on the percentage of your home used exclusively for business purposes.</p>

      <h2>2. Professional Development and Training</h2>
      <p>All costs related to improving your professional skills are deductible. This includes:</p>
      <ul>
        <li>Online courses and certifications</li>
        <li>Workshops and conferences</li>
        <li>Professional books and subscriptions</li>
        <li>Software licenses and tools</li>
      </ul>

      <h2>3. Equipment and Software</h2>
      <p>Computers, software, and other equipment necessary for your freelance work can be deducted. You can either claim the full cost in the year of purchase (if under certain limits) or depreciate them over their useful life.</p>

      <h2>4. Professional Services</h2>
      <p>Fees paid to accountants, lawyers, and other professionals for business-related services are fully deductible.</p>

      <h2>5. Marketing and Advertising</h2>
      <p>All expenses related to promoting your freelance services are deductible, including website costs, social media advertising, and business cards.</p>

      <h2>6. Travel Expenses</h2>
      <p>When traveling for business purposes, you can deduct transportation costs, accommodation, and meals (with proper documentation).</p>

      <h2>7. Communication Costs</h2>
      <p>If you have a dedicated business phone line or use your personal phone for business, you can claim a portion of your phone bills.</p>

      <h2>8. Professional Memberships</h2>
      <p>Membership fees for professional associations, guilds, and industry organizations are deductible.</p>

      <h2>9. Bank Charges</h2>
      <p>Transaction fees, account maintenance fees, and other banking charges related to your business accounts are deductible.</p>

      <h2>10. Insurance Premiums</h2>
      <p>Business insurance, professional indemnity insurance, and health insurance premiums are all deductible expenses.</p>

      <h2>Tips for Maximizing Deductions</h2>
      <ul>
        <li>Keep receipts for all business expenses</li>
        <li>Maintain separate bank accounts for business and personal transactions</li>
        <li>Use accounting software to track expenses automatically</li>
        <li>Consult with a tax professional to ensure you're claiming everything you're entitled to</li>
      </ul>

      <p>Remember, proper documentation is key. Always keep receipts and records of all your business expenses to support your deductions during tax filing season.</p>
    `
  },
  {
    id: 3,
    title: "SME Tax Compliance: Everything You Need to Know",
    excerpt: "Small and medium enterprises in Nigeria have unique tax obligations. Learn how to stay compliant while optimizing your business tax strategy.",
    author: "OTax Team",
    date: "January 5, 2026",
    readTime: "10 min read",
    category: "For SMEs",
    image: "/placeholder.svg",
    content: `
      <p>Running a small or medium enterprise (SME) in Nigeria comes with specific tax obligations that differ from both individual taxpayers and large corporations. Understanding these requirements is essential for maintaining compliance and optimizing your tax position.</p>

      <h2>Understanding SME Tax Classifications</h2>
      <p>SMEs in Nigeria are typically classified based on their annual turnover:</p>
      <ul>
        <li><strong>Micro Enterprises:</strong> Annual turnover of less than ₦25 million</li>
        <li><strong>Small Enterprises:</strong> Annual turnover between ₦25 million and ₦100 million</li>
        <li><strong>Medium Enterprises:</strong> Annual turnover between ₦100 million and ₦1 billion</li>
      </ul>
      <p>Each classification has different tax rates and compliance requirements.</p>

      <h2>Tax Obligations for SMEs</h2>
      <h3>Company Income Tax (CIT)</h3>
      <p>Small companies (turnover below ₦100 million) are taxed at 20%, while medium and large companies pay 30%. There are also various incentives and exemptions available for qualifying SMEs.</p>

      <h3>Value Added Tax (VAT)</h3>
      <p>All SMEs with annual turnover above ₦25 million must register for VAT and file monthly returns. The current VAT rate is 7.5%.</p>

      <h3>Withholding Tax</h3>
      <p>SMEs must deduct and remit withholding tax on various transactions including payments to contractors, rent payments, and professional fees.</p>

      <h3>Pay-As-You-Earn (PAYE)</h3>
      <p>If you have employees, you must register for PAYE and remit employee taxes monthly to the relevant tax authority.</p>

      <h2>Tax Incentives for SMEs</h2>
      <p>Nigerian tax law provides several incentives for SMEs:</p>
      <ul>
        <li><strong>Pioneer Status:</strong> Tax holidays for companies in designated industries</li>
        <li><strong>Investment Tax Credit:</strong> Credits for investments in certain sectors</li>
        <li><strong>Research and Development Allowances:</strong> Enhanced deductions for R&D expenses</li>
        <li><strong>Small Company Tax Rate:</strong> Reduced rate of 20% for qualifying small companies</li>
      </ul>

      <h2>Compliance Requirements</h2>
      <h3>Annual Returns</h3>
      <p>SMEs must file annual tax returns within six months of their financial year-end. This includes:</p>
      <ul>
        <li>Audited financial statements</li>
        <li>Tax computation schedules</li>
        <li>Supporting documents and schedules</li>
      </ul>

      <h3>Monthly/Quarterly Filings</h3>
      <ul>
        <li>VAT returns (monthly)</li>
        <li>PAYE returns (monthly)</li>
        <li>Withholding tax remittances (monthly)</li>
      </ul>

      <h2>Best Practices for SME Tax Management</h2>
      <ol>
        <li><strong>Keep Accurate Records:</strong> Maintain detailed books of account and supporting documents</li>
        <li><strong>Use Accounting Software:</strong> Automate record-keeping and generate reports easily</li>
        <li><strong>Engage Tax Professionals:</strong> Work with qualified accountants or tax advisors</li>
        <li><strong>Plan Ahead:</strong> Don't wait until filing season to organize your tax documents</li>
        <li><strong>Stay Updated:</strong> Monitor changes to tax laws and regulations</li>
      </ol>

      <h2>Common Mistakes to Avoid</h2>
      <ul>
        <li>Mixing personal and business expenses</li>
        <li>Failing to remit withholding taxes on time</li>
        <li>Not maintaining proper documentation</li>
        <li>Missing filing deadlines</li>
        <li>Understating or overstating income</li>
      </ul>

      <h2>Conclusion</h2>
      <p>Proper tax compliance is crucial for the long-term success of your SME. By understanding your obligations, taking advantage of available incentives, and maintaining good records, you can ensure compliance while optimizing your tax position.</p>
    `
  },
  {
    id: 4,
    title: "How to Prepare for Tax Season: A Step-by-Step Checklist",
    excerpt: "Tax season doesn't have to be stressful. Follow our comprehensive checklist to prepare your documents, organize receipts, and file on time.",
    author: "OTax Team",
    date: "December 28, 2025",
    readTime: "7 min read",
    category: "Tax Tips",
    image: "/placeholder.svg",
    content: `
      <p>Tax season can be overwhelming, but with proper preparation, you can make the process smooth and stress-free. This comprehensive checklist will guide you through everything you need to prepare for filing your taxes.</p>

      <h2>Pre-Tax Season Preparation (Year-Round)</h2>
      <h3>Keep Records Organized</h3>
      <ul>
        <li>Save all receipts and invoices digitally</li>
        <li>Categorize expenses as they occur</li>
        <li>Use accounting software to track transactions</li>
        <li>Maintain separate business and personal accounts</li>
      </ul>

      <h2>4-6 Months Before Filing</h2>
      <ul>
        <li>Review your financial records for the year</li>
        <li>Identify any missing receipts or documents</li>
        <li>Estimate your tax liability</li>
        <li>Make any necessary tax payments or adjustments</li>
      </ul>

      <h2>1-2 Months Before Filing</h2>
      <h3>Gather Required Documents</h3>
      <ul>
        <li>Income statements (salary slips, invoices, bank statements)</li>
        <li>Expense receipts and invoices</li>
        <li>Bank statements for all accounts</li>
        <li>Investment statements</li>
        <li>Loan statements (interest payments are deductible)</li>
        <li>Insurance premium receipts</li>
        <li>Previous year's tax return</li>
      </ul>

      <h3>Organize Your Expenses</h3>
      <ul>
        <li>Business expenses (office rent, utilities, supplies)</li>
        <li>Professional development costs</li>
        <li>Equipment and software purchases</li>
        <li>Travel and transportation expenses</li>
        <li>Charitable donations</li>
        <li>Medical expenses (if applicable)</li>
      </ul>

      <h2>2-4 Weeks Before Filing</h2>
      <ul>
        <li>Review all documents for accuracy</li>
        <li>Calculate total income and expenses</li>
        <li>Prepare a draft tax computation</li>
        <li>Consult with a tax professional if needed</li>
        <li>Set aside funds for tax payment if required</li>
      </ul>

      <h2>Filing Week</h2>
      <h3>Final Preparation</h3>
      <ul>
        <li>Double-check all figures</li>
        <li>Ensure all required forms are completed</li>
        <li>Review deductions and reliefs</li>
        <li>Prepare supporting documents</li>
        <li>File your return before the deadline</li>
      </ul>

      <h2>Post-Filing</h2>
      <ul>
        <li>Keep copies of your filed return</li>
        <li>Maintain all supporting documents for at least 6 years</li>
        <li>Note any improvements for next year</li>
        <li>Set up a system for the coming year</li>
      </ul>

      <h2>Tools to Help You Prepare</h2>
      <ul>
        <li><strong>Accounting Software:</strong> Automate expense tracking and categorization</li>
        <li><strong>Document Management:</strong> Store receipts digitally in the cloud</li>
        <li><strong>Tax Calculators:</strong> Estimate your tax liability throughout the year</li>
        <li><strong>Reminder Systems:</strong> Set alerts for important deadlines</li>
      </ul>

      <h2>Common Documents Needed</h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin: 1.5rem 0;">
        <div>
          <h4>Income Documents</h4>
          <ul>
            <li>Salary slips</li>
            <li>Invoices</li>
            <li>Bank statements</li>
            <li>Investment income</li>
          </ul>
        </div>
        <div>
          <h4>Expense Documents</h4>
          <ul>
            <li>Receipts</li>
            <li>Invoices</li>
            <li>Bank statements</li>
            <li>Loan statements</li>
          </ul>
        </div>
      </div>

      <h2>Tips for a Stress-Free Tax Season</h2>
      <ol>
        <li>Start early - don't wait until the deadline</li>
        <li>Use digital tools to automate as much as possible</li>
        <li>Keep records organized throughout the year</li>
        <li>Seek professional help when needed</li>
        <li>Review your return carefully before submitting</li>
      </ol>

      <p>Remember, preparation is key. By following this checklist and maintaining good habits throughout the year, tax season can be manageable and stress-free.</p>
    `
  },
  {
    id: 5,
    title: "Digital Tax Filing: The Future of Tax Management in Nigeria",
    excerpt: "Explore how digital solutions are transforming tax management in Nigeria. Learn about e-filing, digital receipts, and automated compliance.",
    author: "OTax Team",
    date: "December 20, 2025",
    readTime: "5 min read",
    category: "Technology",
    image: "/placeholder.svg",
    content: `
      <p>The digital transformation of tax management in Nigeria is revolutionizing how individuals and businesses handle their tax obligations. From e-filing systems to automated compliance tools, technology is making tax management more efficient, accurate, and accessible.</p>

      <h2>The Rise of E-Filing</h2>
      <p>Electronic filing (e-filing) has become the standard for tax submissions in Nigeria. Both LIRS and NRS have developed comprehensive e-filing platforms that allow taxpayers to submit returns, make payments, and track their tax status online.</p>

      <h3>Benefits of E-Filing</h3>
      <ul>
        <li><strong>Convenience:</strong> File from anywhere, anytime</li>
        <li><strong>Speed:</strong> Instant submission and acknowledgment</li>
        <li><strong>Accuracy:</strong> Built-in validation reduces errors</li>
        <li><strong>Cost-Effective:</strong> No need for physical visits to tax offices</li>
        <li><strong>Real-Time Tracking:</strong> Monitor your return status online</li>
      </ul>

      <h2>Digital Receipt Management</h2>
      <p>Gone are the days of losing physical receipts. Digital receipt management systems allow you to:</p>
      <ul>
        <li>Scan and store receipts instantly</li>
        <li>Automatically extract expense details</li>
        <li>Categorize expenses by type</li>
        <li>Generate expense reports automatically</li>
        <li>Store receipts securely in the cloud</li>
      </ul>

      <h2>Automated Tax Calculation</h2>
      <p>Modern tax software uses intelligent algorithms to:</p>
      <ul>
        <li>Calculate taxes based on current rates</li>
        <li>Identify allowable deductions</li>
        <li>Optimize tax positions legally</li>
        <li>Generate compliance reports</li>
        <li>Alert you to filing deadlines</li>
      </ul>

      <h2>AI-Powered Compliance</h2>
      <p>Artificial intelligence is being integrated into tax management tools to:</p>
      <ul>
        <li>Detect potential errors before filing</li>
        <li>Suggest deductions you might have missed</li>
        <li>Predict tax liability throughout the year</li>
        <li>Identify compliance risks</li>
        <li>Provide personalized tax advice</li>
      </ul>

      <h2>Cloud-Based Accounting</h2>
      <p>Cloud accounting solutions offer:</p>
      <ul>
        <li>Real-time financial tracking</li>
        <li>Multi-device access</li>
        <li>Automatic bank reconciliation</li>
        <li>Collaborative features for accountants</li>
        <li>Secure, encrypted data storage</li>
      </ul>

      <h2>Mobile Tax Management</h2>
      <p>Mobile apps are making tax management accessible on-the-go:</p>
      <ul>
        <li>Expense tracking via smartphone cameras</li>
        <li>Receipt scanning and storage</li>
        <li>Tax calculation tools</li>
        <li>Deadline reminders and notifications</li>
        <li>Quick access to tax information</li>
      </ul>

      <h2>Integration with Banking Systems</h2>
      <p>Tax software is increasingly integrating with banks and financial institutions to:</p>
      <ul>
        <li>Automatically import transactions</li>
        <li>Categorize income and expenses</li>
        <li>Reconcile accounts automatically</li>
        <li>Generate accurate financial reports</li>
      </ul>

      <h2>The Future of Tax Management</h2>
      <p>Looking ahead, we can expect:</p>
      <ul>
        <li>Further automation of tax processes</li>
        <li>Enhanced AI capabilities</li>
        <li>Better integration between systems</li>
        <li>Real-time tax calculations</li>
        <li>Predictive tax planning</li>
      </ul>

      <h2>Getting Started with Digital Tax Management</h2>
      <p>To embrace digital tax management:</p>
      <ol>
        <li>Choose a reputable tax software or platform</li>
        <li>Set up digital record-keeping systems</li>
        <li>Enable automatic transaction imports</li>
        <li>Use mobile apps for on-the-go tracking</li>
        <li>Take advantage of e-filing systems</li>
      </ol>

      <h2>Conclusion</h2>
      <p>The digital transformation of tax management is not just a trend—it's the future. By adopting these technologies, taxpayers can save time, reduce errors, and ensure compliance while focusing on their core business activities.</p>
    `
  },
  {
    id: 6,
    title: "Common Tax Mistakes to Avoid: Lessons from Real Cases",
    excerpt: "Learn from common tax filing mistakes and how to avoid them. Real examples from Nigerian taxpayers and practical solutions.",
    author: "OTax Team",
    date: "December 15, 2025",
    readTime: "9 min read",
    category: "Tax Tips",
    image: "/placeholder.svg",
    content: `
      <p>Tax filing mistakes can be costly, leading to penalties, interest charges, and even audits. Learning from common errors made by other taxpayers can help you avoid similar pitfalls. Here are the most common mistakes and how to prevent them.</p>

      <h2>1. Missing Filing Deadlines</h2>
      <p><strong>The Mistake:</strong> Many taxpayers miss filing deadlines, leading to penalties and interest charges.</p>
      <p><strong>Real Case:</strong> A Lagos-based consultant missed the March 31st deadline by two weeks and was charged a penalty of 10% of the tax due plus interest.</p>
      <p><strong>Solution:</strong> Set calendar reminders, use tax software with deadline alerts, and file early rather than waiting until the last minute.</p>

      <h2>2. Incorrect Income Reporting</h2>
      <p><strong>The Mistake:</strong> Underreporting or overreporting income, often due to poor record-keeping.</p>
      <p><strong>Real Case:</strong> A freelancer forgot to include income from a major client and was later assessed additional tax plus penalties.</p>
      <p><strong>Solution:</strong> Maintain accurate records throughout the year, reconcile bank statements regularly, and use accounting software to track all income sources.</p>

      <h2>3. Claiming Ineligible Deductions</h2>
      <p><strong>The Mistake:</strong> Claiming deductions for expenses that are not allowable under Nigerian tax law.</p>
      <p><strong>Real Case:</strong> A business owner tried to claim personal expenses as business deductions, leading to an audit and disallowance of the deductions.</p>
      <p><strong>Solution:</strong> Understand what expenses are allowable, keep personal and business expenses separate, and consult with a tax professional when in doubt.</p>

      <h2>4. Poor Documentation</h2>
      <p><strong>The Mistake:</strong> Not maintaining proper receipts and documentation to support deductions.</p>
      <p><strong>Real Case:</strong> During an audit, a taxpayer couldn't produce receipts for claimed business expenses, resulting in all deductions being disallowed.</p>
      <p><strong>Solution:</strong> Keep all receipts, preferably digitally, maintain organized records, and use receipt scanning apps for convenience.</p>

      <h2>5. Math Errors</h2>
      <p><strong>The Mistake:</strong> Calculation errors in tax computations, leading to incorrect tax liability.</p>
      <p><strong>Real Case:</strong> A taxpayer made calculation errors that resulted in underpayment of taxes, discovered during an audit.</p>
      <p><strong>Solution:</strong> Use tax calculation software, double-check all calculations, and consider having a professional review your return.</p>

      <h2>6. Not Understanding Tax Rules</h2>
      <p><strong>The Mistake:</strong> Misunderstanding tax laws and applying incorrect rules to your situation.</p>
      <p><strong>Real Case:</strong> A taxpayer incorrectly applied the wrong tax bracket, resulting in overpayment initially, then underpayment when corrected.</p>
      <p><strong>Solution:</strong> Stay updated on tax laws, attend tax seminars, use reliable resources, and consult with tax professionals for complex situations.</p>

      <h2>7. Forgetting to Report All Income Sources</h2>
      <p><strong>The Mistake:</strong> Omitting income from side gigs, investments, or other sources.</p>
      <p><strong>Real Case:</strong> A salaried employee forgot to report freelance income, leading to penalties when discovered.</p>
      <p><strong>Solution:</strong> Track all income sources throughout the year, review bank statements carefully, and maintain a comprehensive income log.</p>

      <h2>8. Incorrect Personal Information</h2>
      <p><strong>The Mistake:</strong> Entering wrong TIN, name, address, or other identifying information.</p>
      <p><strong>Real Case:</strong> A taxpayer's return was rejected due to incorrect TIN, causing delays and potential penalties.</p>
      <p><strong>Solution:</strong> Double-check all personal information, verify your TIN before filing, and ensure consistency across all documents.</p>

      <h2>9. Not Keeping Up with Changes</h2>
      <p><strong>The Mistake:</strong> Using outdated tax rates or rules from previous years.</p>
      <p><strong>Real Case:</strong> A business owner used old tax rates, resulting in incorrect calculations.</p>
      <p><strong>Solution:</strong> Always use current year's tax rates, stay informed about changes, and use updated tax software.</p>

      <h2>10. Rushing Through the Filing Process</h2>
      <p><strong>The Mistake:</strong> Waiting until the last minute and rushing through the filing process.</p>
      <p><strong>Real Case:</strong> Multiple errors were made in a rushed filing, requiring an amended return.</p>
      <p><strong>Solution:</strong> Start early, take your time, review everything carefully, and don't file in a hurry.</p>

      <h2>Prevention Checklist</h2>
      <ul>
        <li>✓ Start preparing early</li>
        <li>✓ Keep accurate records throughout the year</li>
        <li>✓ Use reliable tax software</li>
        <li>✓ Double-check all calculations</li>
        <li>✓ Verify all personal information</li>
        <li>✓ Understand current tax rules</li>
        <li>✓ Keep proper documentation</li>
        <li>✓ Review your return before submitting</li>
        <li>✓ Consult professionals when needed</li>
        <li>✓ File before the deadline</li>
      </ul>

      <h2>Conclusion</h2>
      <p>By learning from these common mistakes and taking preventive measures, you can avoid costly errors and ensure smooth tax filing. Remember, when in doubt, it's always better to consult with a tax professional than to guess.</p>
    `
  }
]

export default function BlogDetailPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params.id as string
  const [post, setPost] = useState<BlogPost | null>(null)
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch blog post from Firestore
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const postRef = doc(db, "blogPosts", postId)
        const postSnap = await getDoc(postRef)

        if (postSnap.exists() && postSnap.data().status === "published") {
          const postData = {
            id: postSnap.id,
            ...postSnap.data()
          } as BlogPost
          setPost(postData)

          // Fetch related posts
          if (postData.category) {
            const relatedQuery = query(
              collection(db, "blogPosts"),
              where("category", "==", postData.category),
              where("status", "==", "published"),
              orderBy("publishedAt", "desc"),
              limit(4)
            )
            const relatedSnapshot = await getDocs(relatedQuery)
            const related = relatedSnapshot.docs
              .map((doc) => ({
                id: doc.id,
                ...doc.data()
              })) as BlogPost[]
            // Filter out current post and limit to 3
            setRelatedPosts(related.filter(p => p.id !== postId).slice(0, 3))
          }
        } else {
          // Fallback to static data if not found in Firestore (for backward compatibility)
          const staticPost = blogPosts.find(p => p.id === Number(postId))
          if (staticPost) {
            setPost({
              id: postId,
              title: staticPost.title,
              excerpt: staticPost.excerpt,
              author: staticPost.author,
              publishedAt: staticPost.date,
              readTime: staticPost.readTime,
              category: staticPost.category,
              content: staticPost.content,
              featuredImage: staticPost.image
            })
            const related = blogPosts
              .filter(p => p.category === staticPost.category && p.id !== staticPost.id)
              .slice(0, 3)
              .map(p => ({
                id: p.id.toString(),
                title: p.title,
                excerpt: p.excerpt,
                author: p.author,
                publishedAt: p.date,
                readTime: p.readTime,
                category: p.category,
                content: p.content || "",
                featuredImage: p.image
              }))
            setRelatedPosts(related)
          }
        }
      } catch (error) {
        console.error("Error fetching blog post:", error)
        // Fallback to static data
        const staticPost = blogPosts.find(p => p.id === Number(postId))
        if (staticPost) {
          setPost({
            id: postId,
            title: staticPost.title,
            excerpt: staticPost.excerpt,
            author: staticPost.author,
            publishedAt: staticPost.date,
            readTime: staticPost.readTime,
            category: staticPost.category,
            content: staticPost.content,
            featuredImage: staticPost.image
          })
        }
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [postId])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Post Not Found</h1>
          <Link href="/blog">
            <Button>Back to Blog</Button>
          </Link>
        </div>
      </div>
    )
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
          url: window.location.href,
        })
      } catch (err) {
        console.log('Error sharing', err)
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
      alert('Link copied to clipboard!')
    }
  }

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
            <Link href="/blog" className="text-sm font-medium text-foreground">
              Blog
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

      {/* Article Content */}
      <article className="container mx-auto px-4 pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Link href="/blog">
            <Button variant="ghost" className="mb-8 -ml-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>

          {/* Article Header */}
          <header className="mb-8">
            <div className="mb-6">
              <Badge className="mb-4">{post.category}</Badge>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
                {post.title}
              </h1>
            </div>
            
            {/* Meta Information */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground mb-8 pb-8 border-b border-border">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{post.author}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(post.publishedAt), "MMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{post.readTime}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="ml-auto"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </header>

          {/* Featured Image */}
          <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl mb-12 overflow-hidden relative">
            {post.featuredImage ? (
              <img
                src={post.featuredImage}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 to-blue-600/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <BookOpen className="w-16 h-16 text-muted-foreground/30" />
                </div>
              </>
            )}
          </div>

          {/* Article Content */}
          <div 
            className="article-content mb-16"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Tags/Categories */}
          <div className="flex items-center gap-3 mb-12 pb-8 border-b border-border">
            <Tag className="w-5 h-5 text-muted-foreground" />
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{post.category}</Badge>
              <Badge variant="outline">Tax Guide</Badge>
              <Badge variant="outline">Nigeria</Badge>
            </div>
          </div>

          {/* Author Card */}
          <div className="bg-card border border-border rounded-2xl p-6 md:p-8 mb-16">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">{post.author}</h3>
                <p className="text-muted-foreground mb-4">
                  Our expert team provides comprehensive tax guidance and insights to help Nigerian taxpayers navigate the complex world of tax compliance.
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Tax Professionals</span>
                  <span>•</span>
                  <span>Based in Nigeria</span>
                </div>
              </div>
            </div>
          </div>

          {/* Related Posts */}
          {relatedPosts.length > 0 && (
            <section className="mb-16">
              <h2 className="text-3xl font-bold mb-8">Related Articles</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {relatedPosts.map((relatedPost) => (
                  <Link
                    key={relatedPost.id}
                    href={`/blog/${relatedPost.id}`}
                    className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group"
                  >
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/10 relative overflow-hidden">
                      {relatedPost.featuredImage ? (
                        <img
                          src={relatedPost.featuredImage}
                          alt={relatedPost.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 to-blue-600/20" />
                      )}
                      <Badge className="absolute top-4 left-4">{relatedPost.category}</Badge>
                    </div>
                    <div className="p-6">
                      <h3 className="font-bold text-lg mb-3 group-hover:text-primary transition-colors line-clamp-2">
                        {relatedPost.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {relatedPost.excerpt}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{format(new Date(relatedPost.publishedAt), "MMM d, yyyy")}</span>
                        <span>•</span>
                        <span>{relatedPost.readTime}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Comments Section */}
          <BlogComments blogId={post.id} />

          {/* Back to Blog CTA */}
          <div className="text-center">
            <Link href="/blog">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                <ArrowLeft className="w-4 h-4 mr-2" />
                View All Articles
              </Button>
            </Link>
          </div>
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/">
              <OtaxLogo />
            </Link>
            <p className="text-sm text-muted-foreground">© 2025 OTax. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
