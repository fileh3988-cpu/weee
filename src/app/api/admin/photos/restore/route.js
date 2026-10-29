import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';
import { requireAdmin } from '@/lib/adminAuth';

export async function POST(request) {
  try {
    if (!requireAdmin(request)) {
      return NextResponse.json({ error: 'Tidak diizinkan. Login admin diperlukan.' }, { status: 401 });
    }
    const { photoId } = await request.json();

    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID diperlukan' }, { status: 400 });
    }

    // UNDO SOFT DELETE: set deleted_at = NULL
    const { data, error } = await supabaseServer
      .from('photos')
      .update({ deleted_at: null })
      .eq('id', photoId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Restore photo error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}