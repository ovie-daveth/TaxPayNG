// Export all services
export { userService } from './userService'
export { transactionService } from './transactionService'
export { documentService } from './documentService'
export { reminderService } from './reminderService'
export { taxCalculationService } from './taxCalculationService'
export { taxPaymentService } from './taxPaymentService'
export { exchangeRateService } from './exchangeRateService'
export type { ExchangeRate } from './exchangeRateService'

// Export base service for extending
export { BaseService } from './base'
