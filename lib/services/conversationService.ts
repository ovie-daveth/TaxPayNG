import { 
  collection, 
  doc, 
  getDoc, 
  addDoc, 
  updateDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/firebase/firebase'

export interface ConversationMessage {
  type: "user" | "assistant"
  content: string
  faq?: {
    question: string
    answer: string
    category: string
    keywords: string[]
  }
  suggestedQuestions?: Array<{
    question: string
    answer: string
    category: string
    keywords: string[]
  }>
}

export interface Conversation {
  id?: string
  category: "individuals" | "businesses"
  messages: ConversationMessage[]
  createdAt: string | Timestamp
  updatedAt: string | Timestamp
  shareId?: string
}

const CONVERSATIONS_COLLECTION = 'faqConversations'

// Validation function for messages
function validateMessage(msg: ConversationMessage): boolean {
  if (!msg.type || !msg.content) return false
  if (msg.type !== 'user' && msg.type !== 'assistant') return false
  if (typeof msg.content !== 'string' || msg.content.length === 0 || msg.content.length > 50000) return false
  
  if (msg.faq) {
    if (!msg.faq.question || !msg.faq.answer || !msg.faq.category || !Array.isArray(msg.faq.keywords)) {
      return false
    }
  }
  
  if (msg.suggestedQuestions && !Array.isArray(msg.suggestedQuestions)) {
    return false
  }
  
  return true
}

// Clean messages to remove undefined values (Firestore doesn't accept undefined)
function cleanMessages(messages: ConversationMessage[]): any[] {
  return messages.map(msg => {
    const cleaned: any = {
      type: msg.type,
      content: msg.content
    }
    
    // Only include faq if it exists and is not undefined
    if (msg.faq) {
      cleaned.faq = msg.faq
    }
    
    // Only include suggestedQuestions if it exists and is not undefined
    if (msg.suggestedQuestions && Array.isArray(msg.suggestedQuestions) && msg.suggestedQuestions.length > 0) {
      cleaned.suggestedQuestions = msg.suggestedQuestions
    }
    
    return cleaned
  })
}

export const conversationService = {
  // Save or update a conversation
  async saveConversation(conversation: Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      // Validate conversation structure
      if (!conversation.category || !conversation.messages) {
        throw new Error('Invalid conversation: missing required fields')
      }
      
      if (conversation.category !== 'individuals' && conversation.category !== 'businesses') {
        throw new Error('Invalid conversation: category must be "individuals" or "businesses"')
      }
      
      if (!Array.isArray(conversation.messages) || conversation.messages.length === 0) {
        throw new Error('Invalid conversation: messages must be a non-empty array')
      }
      
      if (conversation.messages.length > 100) {
        throw new Error('Invalid conversation: too many messages (max 100)')
      }
      
      // Validate each message
      for (const msg of conversation.messages) {
        if (!validateMessage(msg)) {
          throw new Error('Invalid conversation: invalid message structure')
        }
      }
      
      // Clean messages to remove undefined values
      const cleanedMessages = cleanMessages(conversation.messages)
      
      const conversationData = {
        category: conversation.category,
        messages: cleanedMessages,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }

      if (conversation.shareId) {
        // Update existing conversation
        const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversation.shareId)
        await updateDoc(conversationRef, {
          category: conversation.category,
          messages: cleanedMessages,
          updatedAt: serverTimestamp()
          // Don't update createdAt
        })
        return conversation.shareId
      } else {
        // Create new conversation
        const docRef = await addDoc(collection(db, CONVERSATIONS_COLLECTION), conversationData)
        return docRef.id
      }
    } catch (error) {
      console.error('Error saving conversation:', error)
      throw error
    }
  },

  // Load a conversation by shareId
  async getConversation(shareId: string): Promise<Conversation | null> {
    try {
      const conversationRef = doc(db, CONVERSATIONS_COLLECTION, shareId)
      const conversationSnap = await getDoc(conversationRef)
      
      if (!conversationSnap.exists()) {
        return null
      }

      const data = conversationSnap.data()
      return {
        id: conversationSnap.id,
        category: data.category,
        messages: data.messages || [],
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        shareId: conversationSnap.id
      } as Conversation
    } catch (error) {
      console.error('Error loading conversation:', error)
      throw error
    }
  }
}

