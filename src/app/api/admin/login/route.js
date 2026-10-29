import { NextResponse } from 'next/server';
import { createSessionToken, sessionCookieOptions, ADMIN_COOKIE_NAME } from '@/lib/adminAuth';

// Pembatasan percobaan login sederhana (per proses server, in-memory)
const attempts = new Map(); // ip -> { count, lastAttempt }
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 menit

function tooManyAttempts(ip) {
  const rec = attempts.get(ip);
  if (!rec) return false;
  if (Date.now() - rec.lastAttempt > WINDOW_MS) {
    attempts.delete(ip);
    return false;
  }
  return rec.count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(ip) {
  const rec = attempts.get(ip);
  if (!rec || Date.now() - rec.lastAttempt > WINDOW_MS) {
    attempts.set(ip, { count: 1, lastAttempt: Date.now() });
  } else {
    rec.count += 1;
    rec.lastAttempt = Date.now();
  }
}

export async function POST(request) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    if (tooManyAttempts(ip)) {
      return NextResponse.json(
        { success: false, message: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' },
        { status: 429 }
      );
    }

    const { password } = await request.json();

    // Cek password dari environment variable
    if (password && password === process.env.ADMIN_PASSWORD) {
      attempts.delete(ip);
      const response = NextResponse.json({
        success: true,
        message: 'Login berhasil',
      });
      // Sesi admin disimpan di httpOnly cookie — tidak bisa dibaca/dipalsukan client
      response.cookies.set(ADMIN_COOKIE_NAME, createSessionToken('superadmin'), sessionCookieOptions());
      return response;
    }

    recordFailedAttempt(ip);
    return NextResponse.json(
      { success: false, message: 'Password salah' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan' },
      { status: 500 }
    );
  }
}
