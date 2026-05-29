import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/redis', () => ({
  default: {
    setex: vi.fn().mockResolvedValue('OK'),
    get: vi.fn(),
    del: vi.fn().mockResolvedValue(1),
  },
}))

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
  })),
}))

import redis from '@/lib/redis'
import { sendOtp, verifyOtp } from '@/services/sms'

describe('OTP', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('stocke un OTP dans Redis avec TTL 300 secondes', async () => {
    await sendOtp('+224620000001')

    expect(redis.setex).toHaveBeenCalledWith(
      'otp:+224620000001',
      300,
      expect.stringContaining('"otp"')
    )
  })

  it('génère un OTP à 6 chiffres', async () => {
    await sendOtp('+224620000001')

    const call = vi.mocked(redis.setex).mock.calls[0]!
    const stored = JSON.parse(call[2] as string) as { otp: string }
    expect(stored.otp).toMatch(/^\d{6}$/)
  })

  it('retourne true pour un OTP valide non expiré', async () => {
    vi.mocked(redis.get).mockResolvedValue(
      JSON.stringify({ otp: '123456', expiresAt: Date.now() + 60000 })
    )

    const result = await verifyOtp('+224620000001', '123456')
    expect(result).toBe(true)
  })

  it('retourne false pour un OTP incorrect', async () => {
    vi.mocked(redis.get).mockResolvedValue(
      JSON.stringify({ otp: '123456', expiresAt: Date.now() + 60000 })
    )

    const result = await verifyOtp('+224620000001', '999999')
    expect(result).toBe(false)
  })

  it('retourne false pour un OTP expiré', async () => {
    vi.mocked(redis.get).mockResolvedValue(
      JSON.stringify({ otp: '123456', expiresAt: Date.now() - 1000 })
    )

    const result = await verifyOtp('+224620000001', '123456')
    expect(result).toBe(false)
  })

  it('retourne false si aucun OTP en attente', async () => {
    vi.mocked(redis.get).mockResolvedValue(null)

    const result = await verifyOtp('+224620000001', '123456')
    expect(result).toBe(false)
  })

  it('supprime l\'OTP de Redis après vérification réussie', async () => {
    vi.mocked(redis.get).mockResolvedValue(
      JSON.stringify({ otp: '123456', expiresAt: Date.now() + 60000 })
    )

    await verifyOtp('+224620000001', '123456')
    expect(redis.del).toHaveBeenCalledWith('otp:+224620000001')
  })
})
