import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';
import { requireAdmin } from '@/lib/adminAuth';

function unauthorized() {
  return NextResponse.json({ error: 'Tidak diizinkan. Login admin diperlukan.' }, { status: 401 });
}

export async function GET(request) {
  try {
    if (!requireAdmin(request)) return unauthorized();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const eventCode = searchParams.get('eventCode');

    let query = supabaseServer
      .from('photos')
      .select('*')
      .eq('event_code', eventCode)
      .is('deleted_at', null) // Hanya foto yang tidak di-soft-delete
      .order('created_at', { ascending: false });

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Get photos error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    if (!requireAdmin(request)) return unauthorized();
    const { photoId, newStatus } = await request.json();

    const { data, error } = await supabaseServer
      .from('photos')
      .update({ status: newStatus })
      .eq('id', photoId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Update photo error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    if (!requireAdmin(request)) return unauthorized();
    const { photoId } = await request.json();

    // SOFT DELETE: set deleted_at = NOW()
    const { data, error } = await supabaseServer
      .from('photos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', photoId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Delete photo error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}