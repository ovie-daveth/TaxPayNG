"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { 
  Calendar, 
  DollarSign, 
  FileText, 
  Tag, 
  Paperclip, 
  Building2, 
  User, 
  ArrowUpRight, 
  ArrowDownRight,
  Receipt,
  CreditCard,
  Globe
} from "lucide-react"
import { Transaction } from "@/lib/types"
import { formatDate } from "@/lib/utils/date"
import { ImageViewerModal } from "@/components/ui/image-viewer-modal"
import { useState } from "react"
import { useSubscription } from "@/lib/hooks/useSubscription"
import { getCurrencySymbol } from "@/lib/utils/currency"

interface ViewTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: Transaction | null
  onEdit?: () => void
}

export function ViewTransactionDialog({
  open,
  onOpenChange,
  transaction,
  onEdit
}: ViewTransactionDialogProps) {
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false)
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const { hasAccess } = useSubscription()
  const hasTaxClassificationAccess = hasAccess('GOLD')

  if (!transaction) return null

  const handleViewImages = () => {
    if (transaction.attachments && transaction.attachments.length > 0) {
      setSelectedImages(transaction.attachments)
      setIsImageViewerOpen(true)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getCategoryBadgeVariant = (category: string, type: Transaction['type']) => {
    if (type === 'income') {
      const incomeCategories = [
        'Brand Sponsorship', 'Brand Deal', 'Ad Revenue', 'Affiliate Income',
        'Content Licensing', 'Merchandise Sales', 'Subscription Revenue',
        'Online Courses', 'Events & Speaking', 'Platform Payout'
      ]
      if (incomeCategories.some(cat => category.includes(cat) || cat.includes(category))) {
        return 'default'
      }
    } else {
      const expenseCategories = [
        'Equipment', 'Software & Subscriptions', 'Studio Rent', 'Co-working Space',
        'Editing Services', 'Marketing & Promotion', 'Travel for Content'
      ]
      if (expenseCategories.some(cat => category.includes(cat) || cat.includes(category))) {
        return 'secondary'
      }
    }
    return 'outline'
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
                  {transaction.type === 'income' ? (
                    <ArrowUpRight className="w-5 h-5 text-primary" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5 text-destructive" />
                  )}
                  Transaction Details
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm mt-1">
                  View complete transaction information
                </DialogDescription>
              </div>
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  Edit
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Description</p>
                    <p className="text-sm font-medium">{transaction.description}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Type</p>
                    <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'} className="text-xs">
                      {transaction.type === 'income' ? 'Income' : transaction.type === 'expense' ? 'Expense' : 'Tax Relief'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Category</p>
                    <Badge 
                      variant={getCategoryBadgeVariant(transaction.category, transaction.type)} 
                      className="text-xs font-medium"
                    >
                      {transaction.category}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Payment Method</p>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <CreditCard className="w-3 h-3" />
                      {transaction.paymentMethod}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Amount & Currency */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Amount & Currency
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Amount</p>
                  {(() => {
                    // Calculate original amount in original currency
                    const originalCurrency = transaction.currency || 'NGN'
                    const isForeignCurrency = originalCurrency !== 'NGN'
                    const exchangeRate = transaction.exchangeRate || 1
                    
                    let originalAmount: number
                    let originalGrossAmount: number | undefined
                    let originalPlatformFees: number | undefined
                    let originalNetAmount: number | undefined
                    
                    if (isForeignCurrency) {
                      // For foreign currency, calculate original amounts from NGN equivalents
                      if (transaction.ngnEquivalent && exchangeRate) {
                        originalAmount = transaction.ngnEquivalent / exchangeRate
                      } else {
                        // Fallback: reverse calculate from stored NGN amount
                        const ngnAmount = transaction.netAmount !== undefined ? transaction.netAmount : transaction.amount
                        originalAmount = ngnAmount / exchangeRate
                      }
                      
                      // Calculate original platform fees amounts if they exist
                      if (transaction.grossAmount && transaction.platformFees) {
                        originalGrossAmount = transaction.grossAmount / exchangeRate
                        originalPlatformFees = transaction.platformFees / exchangeRate
                        if (transaction.netAmount !== undefined) {
                          originalNetAmount = transaction.netAmount / exchangeRate
                        } else {
                          originalNetAmount = originalGrossAmount - originalPlatformFees
                        }
                      }
                    } else {
                      // For NGN transactions, use the stored amounts directly
                      originalAmount = transaction.netAmount !== undefined ? transaction.netAmount : transaction.amount
                      if (transaction.grossAmount && transaction.platformFees) {
                        originalGrossAmount = transaction.grossAmount
                        originalPlatformFees = transaction.platformFees
                        originalNetAmount = transaction.netAmount || (transaction.grossAmount - transaction.platformFees)
                      }
                    }
                    
                    const currencySymbol = getCurrencySymbol(originalCurrency as any)
                    const formattedOriginalAmount = originalAmount.toLocaleString('en-NG', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })
                    
                    return (
                      <>
                        <p className={`text-lg font-bold ${transaction.type === 'income' ? 'text-primary' : 'text-destructive'}`}>
                          {transaction.type === 'income' ? '+' : '-'}
                          {currencySymbol}{formattedOriginalAmount}
                        </p>
                        {/* Show NGN equivalent below if currency is not NGN */}
                        {isForeignCurrency && transaction.ngnEquivalent && (
                          <p className="text-sm text-muted-foreground mt-1">
                            ≈ {formatCurrency(transaction.ngnEquivalent)}
                          </p>
                        )}
                        {/* Phase 2: Show platform fees breakdown if available */}
                        {originalGrossAmount !== undefined && originalPlatformFees !== undefined && originalNetAmount !== undefined && (
                          <div className="mt-2 p-2 bg-muted rounded text-xs space-y-1">
                            <p className="text-muted-foreground">
                              <span className="font-medium">Gross:</span> {currencySymbol}{originalGrossAmount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-muted-foreground">
                              <span className="font-medium">Platform Fees:</span> -{currencySymbol}{originalPlatformFees.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-muted-foreground border-t pt-1">
                              <span className="font-medium">Net:</span> {currencySymbol}{originalNetAmount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
                {transaction.currency && transaction.currency !== 'NGN' && (
                  <>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Original Currency</p>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {transaction.currency}
                      </p>
                    </div>
                    {transaction.exchangeRate && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Exchange Rate (Locked)</p>
                        <p className="text-sm font-medium">
                          1 {transaction.currency} = ₦{transaction.exchangeRate.toLocaleString('en-NG', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </p>
                        {transaction.exchangeRateDate && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Locked on {formatDate(transaction.exchangeRateDate)}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Phase 2: Platform Information - Only for income transactions */}
            {transaction.type === 'income' && transaction.platform && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Platform Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Platform Name</p>
                      <p className="text-sm font-medium">{transaction.platform.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Platform Type</p>
                      <p className="text-sm font-medium capitalize">{transaction.platform.platformType}</p>
                    </div>
                    {transaction.platform.accountId && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Account ID/Username</p>
                        <p className="text-sm font-medium">{transaction.platform.accountId}</p>
                      </div>
                    )}
                    {transaction.platform.accountUrl && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Account URL</p>
                        <a 
                          href={transaction.platform.accountUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                        >
                          {transaction.platform.accountUrl}
                          <Globe className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Dates */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Dates
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {transaction.transactionDate && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Transaction Date</p>
                    <p className="text-sm font-medium">{formatDate(transaction.transactionDate)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">When transaction occurred</p>
                  </div>
                )}
                {transaction.valueDate && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Payment Date</p>
                    <p className="text-sm font-medium">{formatDate(transaction.valueDate)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">When money moved</p>
                  </div>
                )}
                {transaction.taxPeriod && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Tax Period</p>
                    <p className="text-sm font-medium">
                      {transaction.taxPeriod.year}
                      {transaction.taxPeriod.quarter && ` - Q${transaction.taxPeriod.quarter}`}
                      {transaction.taxPeriod.month && ` - Month ${transaction.taxPeriod.month}`}
                    </p>
                  </div>
                )}
                {!transaction.transactionDate && !transaction.valueDate && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Date</p>
                    <p className="text-sm font-medium">{formatDate(transaction.date)}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Business/Personal Status */}
            {transaction.transactionNature && (
              <>
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    {transaction.transactionNature === 'business' ? (
                      <Building2 className="w-4 h-4" />
                    ) : transaction.transactionNature === 'personal' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Building2 className="w-4 h-4" />
                    )}
                    Transaction Nature
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={transaction.transactionNature === 'business' ? 'default' : transaction.transactionNature === 'personal' ? 'secondary' : 'outline'} 
                      className="text-xs"
                    >
                      {transaction.transactionNature === 'business' ? 'Business' : transaction.transactionNature === 'personal' ? 'Personal' : 'Mixed'}
                    </Badge>
                    {transaction.transactionNature === 'mixed' && transaction.businessPercentage !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        ({transaction.businessPercentage}% business-related)
                      </span>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Tax Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Tax Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tax Deductible</p>
                  <Badge variant={transaction.taxDeductible ? 'default' : 'outline'} className="text-xs">
                    {transaction.taxDeductible ? 'Deductible' : 'Non-deductible'}
                  </Badge>
                </div>
                {hasTaxClassificationAccess && transaction.taxClassification && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Tax Classification</p>
                    <div className="flex flex-wrap gap-1">
                      {transaction.taxClassification.incomeType && (
                        <Badge variant="outline" className="text-xs">
                          Income: {transaction.taxClassification.incomeType}
                        </Badge>
                      )}
                      {transaction.taxClassification.expenseType && (
                        <Badge variant="outline" className="text-xs">
                          Expense: {transaction.taxClassification.expenseType}
                        </Badge>
                      )}
                      {transaction.taxClassification.isCapitalAsset && (
                        <Badge variant="outline" className="text-xs">
                          Capital Asset ({transaction.taxClassification.capitalAllowanceRate}% allowance)
                        </Badge>
                      )}
                      {transaction.taxClassification.whtCreditable && (
                        <Badge variant="outline" className="text-xs">
                          WHT Creditable {transaction.taxClassification.whtRate && `(${transaction.taxClassification.whtRate}%)`}
                        </Badge>
                      )}
                      {/* VAT Applicable - only show for income transactions, not expenses */}
                      {transaction.type === 'income' && transaction.taxClassification.vatApplicable && (
                        <Badge variant="outline" className="text-xs">
                          VAT Applicable {transaction.taxClassification.vatRate && `(${transaction.taxClassification.vatRate}%)`}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Additional Information */}
            {(transaction.notes || transaction.tags?.length || transaction.linkedInvoiceId) && (
              <>
                <div>
                  <h3 className="text-sm font-semibold mb-3">Additional Information</h3>
                  <div className="space-y-3">
                    {transaction.notes && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Notes</p>
                        <p className="text-sm whitespace-pre-wrap">{transaction.notes}</p>
                      </div>
                    )}
                    {transaction.tags && transaction.tags.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          Tags
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {transaction.tags.map((tag, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {transaction.linkedInvoiceId && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          Linked Invoice
                        </p>
                        <Badge variant="outline" className="text-xs">
                          Invoice ID: {transaction.linkedInvoiceId.substring(0, 8)}...
                        </Badge>
                        {transaction.isFromInvoice && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            This transaction was created from an invoice
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Attachments */}
            {transaction.attachments && transaction.attachments.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  Attachments
                </h3>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewImages}
                    className="gap-2"
                  >
                    <Paperclip className="w-4 h-4" />
                    View {transaction.attachments.length} {transaction.attachments.length === 1 ? 'Receipt' : 'Receipts'}
                  </Button>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="pt-2 border-t">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <p>Created: {formatDate(transaction.createdAt)}</p>
                </div>
                {transaction.updatedAt !== transaction.createdAt && (
                  <div>
                    <p>Last Updated: {formatDate(transaction.updatedAt)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ImageViewerModal
        open={isImageViewerOpen}
        onOpenChange={setIsImageViewerOpen}
        images={selectedImages}
        title={`${transaction.description} - Receipts`}
      />
    </>
  )
}

