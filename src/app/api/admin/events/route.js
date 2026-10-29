import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { supabaseServer } from '@/lib/supabaseClient';
import { requireAdmin } from '@/lib/adminAuth';
import { VALID_THEMES, DEFAULT_THEME_ID } from '@/lib/themes';

export async function GET(request) {
  try {
    if (!requireAdmin(request)) {
      return NextResponse.json({ error: 'Tidak diizinkan. Login admin diperlukan.' }, { status: 401 });
    }

    const { data, error } = await supabaseServer
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Get events error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    if (!requireAdmin(request)) {
      return NextResponse.json({ error: 'Tidak diizinkan. Login admin diperlukan.' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      autoApproveDelay = '60', 
      magicLinkDuration = '7',
      theme = DEFAULT_THEME_ID,
      client_name = '',
      client_email = '',
      client_phone = '',
      event_date = null,
      venue = '',
      max_uploads = 1000
    } = body;
        
    if (!name) {
      return NextResponse.json({ error: 'Nama event wajib diisi' }, { status: 400 });
    }
    // Konversi delay ke integer. Jika kosong atau bukan angka, pakai 999999 (Manual Only)
    let delayValue = parseInt(autoApproveDelay);
    if (isNaN(delayValue) || autoApproveDelay === '') {
      delayValue = 999999; 
    }
    // Generate unique code (slug + suffix acak agar tidak bentrok untuk nama serupa)
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'event';
    const suffix = randomBytes(3).toString('hex'); // 6 karakter hex
    const eventCode = `${slug}-${suffix}`;
    // Token kriptografis aman (bukan Math.random)
    const magicLinkToken = randomBytes(24).toString('base64url');

    const { data, error } = await supabaseServer
      .from('events')
      .insert([{
        code: eventCode,
        name,
        magic_link_token: magicLinkToken,
        auto_approve_delay: delayValue,
        magic_link_duration: magicLinkDuration,
        theme,
        client_name,
        client_email,
        client_phone,
        event_date,
        venue,
        max_uploads,
        status: 'upcoming'
      }])
      .select()
      .single();

    if (error) {
      console.error('Create event DB error:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Event dengan kode yang sama sudah ada. Coba lagi.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Gagal membuat event. Coba lagi.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Create event error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

// Update event (misal: ganti tema). Diproteksi sesi admin.
const ALLOWED_UPDATE_FIELDS = ['theme', 'auto_approve_delay', 'magic_link_duration', 'status', 'client_name', 'client_email', 'client_phone', 'event_date', 'venue', 'max_uploads'];
// Validasi tema dari satu sumber kebenaran: src/lib/themes.js

export async function PATCH(request) {
  try {
    if (!requireAdmin(request)) {
      return NextResponse.json({ error: 'Tidak diizinkan. Login admin diperlukan.' }, { status: 401 });
    }

    const body = await request.json();
    const { code, ...updates } = body;

    if (!code) {
      return NextResponse.json({ error: 'Kode event wajib diisi' }, { status: 400 });
    }

    // Whitelist field yang boleh diubah — cegah injection kolom lain
    const payload = {};
    for (const key of Object.keys(updates)) {
      if (ALLOWED_UPDATE_FIELDS.includes(key)) payload[key] = updates[key];
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'Tidak ada perubahan yang valid' }, { status: 400 });
    }

    if (payload.theme !== undefined && !VALID_THEMES.includes(payload.theme)) {
      return NextResponse.json({ error: 'Tema tidak valid' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('events')
      .update(payload)
      .eq('code', code)
      .select()
      .single();

    if (error) {
      console.error('Update event DB error:', error);
      return NextResponse.json({ error: 'Gagal mengubah event' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Update event error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}