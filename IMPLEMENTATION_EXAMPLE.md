# Quick Implementation Example

## Telegram Bot Integration Example

### 1. Install Dependencies

```bash
npm install telegraf
npm install --save-dev @types/node
```

### 2. Create Telegram Bot Service

```typescript
// lib/services/telegramBotService.ts
import { Telegraf, Context } from 'telegraf'
import { transactionService } from './transactionService'
import { userService } from './userService'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!

export class TelegramBotService {
  private bot: Telegraf

  constructor() {
    this.bot = new Telegraf(BOT_TOKEN)
    this.setupCommands()
  }

  private setupCommands() {
    // Start command
    this.bot.command('start', async (ctx: Context) => {
      const userId = await this.authenticateUser(ctx)
      if (!userId) {
        await ctx.reply('Please authenticate first. Visit: [your-web-url]/auth/telegram')
        return
      }
      
      await ctx.reply(
        `👋 Welcome to OTax!\n\n` +
        `Available commands:\n` +
        `/add - Add a transaction\n` +
        `/list - View recent transactions\n` +
        `/calculate - Calculate tax\n` +
        `/help - Show all commands`
      )
    })

    // Add transaction
    this.bot.command('add', async (ctx: Context) => {
      const userId = await this.authenticateUser(ctx)
      if (!userId) return

      await ctx.reply(
        '📝 Add Transaction\n\n' +
        'Type: income or expense\n' +
        'Example: income 50000 Brand Sponsorship'
      )

      // Set up conversation handler
      this.bot.on('text', async (ctx: Context) => {
        const text = ctx.message.text
        if (text.startsWith('/')) return // Ignore commands

        const parts = text.split(' ')
        const type = parts[0].toLowerCase()
        const amount = parseFloat(parts[1])
        const category = parts.slice(2).join(' ')

        if (type !== 'income' && type !== 'expense') {
          await ctx.reply('❌ Invalid type. Use "income" or "expense"')
          return
        }

        try {
          const transaction = await transactionService.createTransaction({
            userId,
            type: type as 'income' | 'expense',
            amount,
            category,
            currency: 'NGN',
            date: new Date().toISOString(),
          })

          await ctx.reply(
            `✅ Transaction added!\n\n` +
            `Type: ${type}\n` +
            `Amount: ₦${amount.toLocaleString()}\n` +
            `Category: ${category}\n\n` +
            `View all: /list`
          )
        } catch (error) {
          await ctx.reply('❌ Error adding transaction. Please try again.')
        }
      })
    })

    // List transactions
    this.bot.command('list', async (ctx: Context) => {
      const userId = await this.authenticateUser(ctx)
      if (!userId) return

      const transactions = await transactionService.getUserTransactions(userId, undefined, 1, 10)
      
      if (transactions.data.length === 0) {
        await ctx.reply('📭 No transactions found. Add one with /add')
        return
      }

      let message = '📋 Recent Transactions\n\n'
      transactions.data.forEach((tx, index) => {
        message += `${index + 1}. ${tx.type === 'income' ? '💰' : '💸'} ${tx.amount.toLocaleString()} - ${tx.category}\n`
      })

      await ctx.reply(message)
    })

    // Help command
    this.bot.command('help', async (ctx: Context) => {
      await ctx.reply(
        '📚 OTax Commands\n\n' +
        '/start - Start the bot\n' +
        '/add - Add a transaction\n' +
        '/list - View transactions\n' +
        '/calculate - Calculate tax\n' +
        '/settings - View settings\n' +
        '/help - Show this help'
      )
    })
  }

  private async authenticateUser(ctx: Context): Promise<string | null> {
    // Get user's phone number or Telegram ID
    const telegramId = ctx.from?.id.toString()
    const phoneNumber = ctx.from?.phone_number

    // Find user in Firebase by phone number or Telegram ID
    // This would require storing telegramId in user profile
    const user = await userService.getUserByTelegramId(telegramId || phoneNumber)
    
    return user?.userId || null
  }

  public async start() {
    // Set webhook (for production)
    if (process.env.TELEGRAM_WEBHOOK_URL) {
      await this.bot.telegram.setWebhook(process.env.TELEGRAM_WEBHOOK_URL)
    }

    // Start polling (for development)
    this.bot.launch()
    console.log('Telegram bot started!')
  }

  public async handleUpdate(update: any) {
    await this.bot.handleUpdate(update)
  }
}

export const telegramBotService = new TelegramBotService()
```

### 3. Create API Route for Webhook

```typescript
// app/api/telegram/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { telegramBotService } from '@/lib/services/telegramBotService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    await telegramBotService.handleUpdate(body)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// For webhook verification (GET request)
export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Telegram webhook endpoint' })
}
```

### 4. Environment Variables

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/api/telegram/webhook
```

### 5. Update User Service

```typescript
// Add to lib/services/userService.ts
async getUserByTelegramId(telegramId: string): Promise<UserProfile | null> {
  const snapshot = await db.collection('users')
    .where('telegramId', '==', telegramId)
    .limit(1)
    .get()
  
  if (snapshot.empty) return null
  
  const doc = snapshot.docs[0]
  return { id: doc.id, ...doc.data() } as UserProfile
}
```

### 6. Start Bot (Development)

```typescript
// app/api/telegram/start/route.ts (for development only)
import { telegramBotService } from '@/lib/services/telegramBotService'

export async function POST() {
  await telegramBotService.start()
  return NextResponse.json({ message: 'Bot started' })
}
```

---

## WhatsApp Integration Example (Using WhatsApp Business API)

### 1. Install Dependencies

```bash
npm install @wppconnect-team/wppconnect
# OR use official Meta Business API SDK
npm install whatsapp-business-api
```

### 2. Create WhatsApp Service

```typescript
// lib/services/whatsappService.ts
import axios from 'axios'

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0'
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!

export class WhatsAppService {
  async sendMessage(to: string, message: string) {
    try {
      const response = await axios.post(
        `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message }
        },
        {
          headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      )
      return response.data
    } catch (error) {
      console.error('WhatsApp send error:', error)
      throw error
    }
  }

  async handleIncomingMessage(from: string, body: string) {
    // Process command similar to Telegram
    const command = body.trim().toLowerCase()
    
    if (command === '/start' || command === 'start') {
      await this.sendMessage(from, '👋 Welcome to OTax! Use /help for commands.')
    } else if (command.startsWith('/add')) {
      // Handle add transaction
    } else if (command === '/list') {
      // Handle list transactions
    }
  }
}

export const whatsappService = new WhatsAppService()
```

### 3. Create Webhook Endpoint

```typescript
// app/api/whatsapp/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { whatsappService } from '@/lib/services/whatsappService'

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return NextResponse.json(parseInt(challenge || '0'))
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (value?.messages) {
      const message = value.messages[0]
      const from = message.from
      const text = message.text?.body

      await whatsappService.handleIncomingMessage(from, text)
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

---

## Testing Locally

### Telegram (Development)
1. Use `bot.launch()` for polling (no webhook needed)
2. Test with @BotFather or your own Telegram account

### WhatsApp (Development)
1. Use Meta's test phone numbers
2. Set up ngrok for webhook: `ngrok http 3000`
3. Configure webhook URL in Meta Business Dashboard

---

## Production Deployment

1. **Set up webhooks** for both platforms
2. **Configure environment variables** on Vercel/hosting
3. **Monitor logs** for errors
4. **Set up rate limiting** to prevent abuse
5. **Add error handling** and user-friendly messages

