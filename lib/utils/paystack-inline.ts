export type PaystackInlineSuccess = {
  reference: string
  trxref?: string
  trans?: string
  status?: string
  message?: string
  transaction?: string
}

declare global {
  interface Window {
    PaystackPop?: {
      setup: (opts: any) => { openIframe: () => void }
    }
  }
}

let paystackScriptPromise: Promise<void> | null = null

export function loadPaystackInlineScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Paystack script can only load in the browser"))
  if (window.PaystackPop) return Promise.resolve()
  if (paystackScriptPromise) return paystackScriptPromise

  paystackScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://js.paystack.co/v1/inline.js"]')
    if (existing) {
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", () => reject(new Error("Failed to load Paystack")))
      return
    }

    const script = document.createElement("script")
    script.src = "https://js.paystack.co/v1/inline.js"
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Paystack"))
    document.body.appendChild(script)
  })

  return paystackScriptPromise
}

export async function payWithPaystackInline(opts: {
  publicKey: string
  email: string
  amountKobo: number
  reference: string
  metadata?: Record<string, any>
  onSuccess: (result: PaystackInlineSuccess) => void
  onClose: () => void
}) {
  await loadPaystackInlineScript()

  if (!window.PaystackPop?.setup) {
    throw new Error("Paystack is not available")
  }

  const handler = window.PaystackPop.setup({
    key: opts.publicKey,
    email: opts.email,
    amount: opts.amountKobo,
    currency: "NGN",
    ref: opts.reference,
    metadata: opts.metadata || {},
    callback: (response: any) => {
      opts.onSuccess(response as PaystackInlineSuccess)
    },
    onClose: () => {
      opts.onClose()
    },
  })

  handler.openIframe()
}


