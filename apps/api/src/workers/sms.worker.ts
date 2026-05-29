import { Worker } from 'bullmq'
import type { SmsPayload } from '@/services/sms'

const redisUrl = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379')
const redisConnection = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port || '6379'),
}

const worker = new Worker<SmsPayload>(
  'sms',
  async (job) => {
    const { to, message, sender = process.env.AFRICASTALKING_SENDER_ID ?? 'AlloJoy' } = job.data

    // Normaliser le numéro guinéen → format international +224
    const normalizedPhone = normalizeGuineanPhone(to)

    const response = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        apiKey: process.env.AFRICASTALKING_API_KEY ?? '',
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        username: process.env.AFRICASTALKING_USERNAME ?? '',
        to: normalizedPhone,
        message,
        from: sender,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Africa's Talking error: ${error}`)
    }

    const result = await response.json()
    console.log(`SMS envoyé à ${normalizedPhone}:`, result)
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
)

worker.on('failed', (job, err) => {
  console.error(`SMS job ${job?.id} failed:`, err.message)
})

function normalizeGuineanPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('224')) return `+${digits}`
  if (digits.length === 9) return `+224${digits}`
  return phone
}

export default worker
