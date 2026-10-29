import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

// Validasi konfigurasi environment saat startup
if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL tidak valid. Cek .env.local Anda!');
}
if (!supabaseAnonKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi. Cek .env.local Anda!');
}

// 1. Client untuk Browser (WAJIB untuk Realtime & halaman Guest/Display)
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);

// 2. Client untuk Server (WAJIB untuk API Routes /admin agar bypass RLS)
// Di production, service role key WAJIB ada — jangan fallback ke anon key
// karena akan diam-diam gagal menembus RLS dan menghasilkan error membingungkan.
if (!supabaseServiceKey && process.env.NODE_ENV === 'production') {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY wajib diisi di production!');
}

export const supabaseServer = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey, // Fallback hanya untuk development
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);