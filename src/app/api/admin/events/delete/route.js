import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';
import { requireSuperAdmin } from '@/lib/adminAuth';

export async function DELETE(request) {
  try {
    if (!requireSuperAdmin(request)) {
      return NextResponse.json({ error: 'Hanya super admin yang boleh menghapus event.' }, { status: 403 });
    }
    const { eventCode } = await request.json();

    if (!eventCode) {
      return NextResponse.json({ error: 'Event code diperlukan' }, { status: 400 });
    }

    // 1. Hapus semua foto yang terkait dengan event ini terlebih dahulu
    const { error: photoError } = await supabaseServer
      .from('photos')
      .delete()
      .eq('event_code', eventCode);

    if (photoError) throw photoError;

    // 2. Hapus event dari database
    const { error: eventError } = await supabaseServer
      .from('events')
      .delete()
      .eq('code', eventCode);

    if (eventError) throw eventError;

    return NextResponse.json({ success: true, message: 'Event berhasil dihapus' });

  } catch (error) {
    console.error('Delete event error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}