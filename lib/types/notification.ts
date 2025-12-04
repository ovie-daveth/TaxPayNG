export type NotificationType = 
  | 'message' 
  | 'invoice' 
  | 'filing_status_update' 
  | 'payment' 
  | 'reminder'
  | 'document'
  | 'system'

export type NotificationStatus = 'unread' | 'read'

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  status: NotificationStatus
  link?: string // URL to navigate to when clicked
  metadata?: {
    [key: string]: any // Additional data like requestId, invoiceId, etc.
  }
  createdAt: string
  readAt?: string
}

