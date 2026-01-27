// Shared OTP storage for phone verification
// In production, this should be replaced with Redis or a database solution

type OTPData = {
  otp: string
  expiresAt: number
  attempts: number
}

class OTPStore {
  private store: Map<string, OTPData>

  constructor() {
    this.store = new Map()
  }

  set(phoneNumber: string, data: OTPData): void {
    this.store.set(phoneNumber, data)
  }

  get(phoneNumber: string): OTPData | undefined {
    return this.store.get(phoneNumber)
  }

  delete(phoneNumber: string): boolean {
    return this.store.delete(phoneNumber)
  }

  cleanup(): void {
    const now = Date.now()
    for (const [phone, data] of this.store.entries()) {
      if (data.expiresAt < now) {
        this.store.delete(phone)
      }
    }
  }
}

// Export a singleton instance
export const otpStore = new OTPStore()
