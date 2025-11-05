// Export all services
export { userService } from './userService'
export { transactionService } from './transactionService'
export { documentService } from './documentService'
export { reminderService } from './reminderService'
export { taxCalculationService } from './taxCalculationService'
export { taxPaymentService } from './taxPaymentService'
export { exchangeRateService } from './exchangeRateService'
export { conversationService } from './conversationService'
export type { ExchangeRate } from './exchangeRateService'
export type { Conversation, ConversationMessage } from './conversationService'

// Export base service for extending
export { BaseService } from './base'
