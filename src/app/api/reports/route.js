import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';

export async function POST(request) {
  try {
    const { photoId, eventCode, reason } = await request.json();

    if (!photoId || !eventCode) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    // 1. Simpan laporan ke tabel reports
    const { error: reportError } = await supabaseServer
      .from('reports')
      .insert([{ photo_id: photoId, reason: reason || 'Tidak pantas' }]);

    if (reportError) throw reportError;

    // 2. Hitung total laporan untuk foto ini
    const { count, error: countError } = await supabaseServer
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('photo_id', photoId);

    if (countError) throw countError;

    // 3. Ambil threshold (batas laporan) dari pengaturan event
    const { data: eventData } = await supabaseServer
      .from('events')
      .select('report_threshold')
      .eq('code', eventCode)
      .single();

    const threshold = eventData?.report_threshold || 5; // Default 5 jika tidak ada setting

    // 4. Jika laporan >= threshold, reject foto tersebut
    if (count >= threshold) {
      await supabaseServer
        .from('photos')
        .update({ status: 'rejected' })
        .eq('id', photoId);
      
      console.log(` Foto ${photoId} auto-rejected karena mencapai ${count} laporan.`);
      return NextResponse.json({ 
        success: true, 
        message: 'Foto telah dilaporkan dan disembunyikan.' 
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Laporan diterima. (${count}/${threshold} laporan)` 
    });

  } catch (error) {
    console.error('Report error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}