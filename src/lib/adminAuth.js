import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Autentikasi admin berbasis session token (httpOnly cookie).
 * Token = HMAC(secret, "role.exp") — ditandatangani di server,
 * tidak bisa dipalsukan tanpa ADMIN_SESSION_SECRET.
 */

const COOKIE_NAME = 'admin_session'
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 // 24 jam

function getSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim()
  if (!secret) {
    throw new Error(
      'ADMIN_SESSION_SECRET belum diisi. Tambahkan secret acak yang panjang ke .env.local'
    )
  }
  return secret
}

function sign(payload) {
  return createHmac('sha256', getSecret()).update(payload).digest('hex')
}

/** Buat token sesi untuk role 'superadmin' atau 'admin'. */
export function createSessionToken(role) {
  const exp = Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  const payload = `${role}.${exp}`
  const sig = sign(payload)
  return `${payload}.${sig}`
}

/** Verifikasi token; mengembalikan { role } jika valid, selain itu null. */
export function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [role, expStr, sig] = parts
  const expectedSig = sign(`${role}.${expStr}`)
  const sigBuf = Buffer.from(sig)
  const expBuf = Buffer.from(expectedSig)
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || Date.now() > exp) return null
  if (role !== 'superadmin' && role !== 'admin') return null
  return { role }
}

/** Cookie attributes untuk Set-Cookie sesi admin. */
export function sessionCookieOptions(maxAgeSeconds = SESSION_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  }
}

export { COOKIE_NAME as ADMIN_COOKIE_NAME, SESSION_MAX_AGE_SECONDS }

/**
 * Guard untuk Route Handler admin. Panggil di awal setiap handler sensitif.
 * Mengembalikan { role } jika terautentikasi, atau null.
 */
export function requireAdmin(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  const session = verifySessionToken(token)
  return session // null jika tidak valid
}

/** Mengembalikan { role } hanya jika superadmin; null selain itu. */
export function requireSuperAdmin(request) {
  const session = requireAdmin(request)
  if (!session) return null
  return session.role === 'superadmin' ? session : null
}

/** Helper untuk request dari cron job yang dilindungi CRON_SECRET. */
export function verifyCronSecret(request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const auth = request.headers.get('authorization') || ''
  return auth === `Bearer ${secret}`
}
