import { Queue } from 'bullmq'
import redis from '@/lib/redis'

// BullMQ a son propre ioredis bundlé → lui passer les options de connexion, pas une instance externe
const redisUrl = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379')
const redisConnection = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port || '6379'),
}

const smsQueue = new Queue('sms', { connection: redisConnection })

export interface SmsPayload {
  to: string
  message: string
  sender?: string
}

export async function sendSms(payload: SmsPayload): Promise<void> {
  await smsQueue.add('send', payload, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  })
}

export async function sendOtp(phone: string): Promise<string> {
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = Date.now() + 5 * 60 * 1000

  // Stocker l'OTP dans Redis avec TTL 5 minutes
  await redis.setex(`otp:${phone}`, 300, JSON.stringify({ otp, expiresAt }))

  await sendSms({
    to: phone,
    message: `AlloJoy: Votre code de connexion est ${otp}. Valable 5 minutes.`,
  })

  return otp
}

export async function verifyOtp(phone: string, otp: string): Promise<boolean> {
  const stored = await redis.get(`otp:${phone}`)
  if (!stored) return false

  const { otp: storedOtp, expiresAt } = JSON.parse(stored) as {
    otp: string
    expiresAt: number
  }

  if (Date.now() > expiresAt) {
    await redis.del(`otp:${phone}`)
    return false
  }

  if (storedOtp !== otp) return false

  await redis.del(`otp:${phone}`)
  return true
}
