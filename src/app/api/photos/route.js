import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';
import { requireAdmin } from '@/lib/adminAuth';

// Helper: respons 401 jika tidak ada sesi admin valid
function unauthorized() {
  return NextResponse.json({ error: 'Tidak diizinkan. Login admin diperlukan.' }, { status: 401 });
}

// GET: Ambil semua foto (dengan filter status DAN eventCode)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const eventCode = searchParams.get('eventCode');

    let query = supabaseServer
      .from('photos')
      .select('*')
      .order('created_at', { ascending: false });

    if (eventCode) {
      query = query.eq('event_code', eventCode);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update status foto (Approve/Reject) — khusus admin
export async function PATCH(request) {
  try {
    if (!requireAdmin(request)) return unauthorized();

    const body = await request.json();
    const { photoId, newStatus } = body;

    if (!photoId || !newStatus) {
      return NextResponse.json({ error: 'photoId dan newStatus wajib diisi' }, { status: 400 });
    }

    const allowedStatus = ['pending', 'approved', 'rejected'];
    if (!allowedStatus.includes(newStatus)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('photos')
      .update({ status: newStatus })
      .eq('id', photoId)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Hapus foto — khusus admin
export async function DELETE(request) {
  try {
    if (!requireAdmin(request)) return unauthorized();

    const body = await request.json();
    const { photoId } = body;

    if (!photoId) {
      return NextResponse.json({ error: 'photoId wajib diisi' }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from('photos')
      .delete()
      .eq('id', photoId);

    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}