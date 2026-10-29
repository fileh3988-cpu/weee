import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';
import { requireAdmin } from '@/lib/adminAuth';
import JSZip from 'jszip';

export async function GET(request) {
  try {
    if (!requireAdmin(request)) {
      return NextResponse.json({ error: 'Tidak diizinkan. Login admin diperlukan.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventCode = searchParams.get('eventCode');

    if (!eventCode) {
      return NextResponse.json({ error: 'Event code diperlukan' }, { status: 400 });
    }

    // 1. Ambil semua foto yang TIDAK di-soft-delete (deleted_at IS NULL)
    const { data: photos, error } = await supabaseServer
      .from('photos')
      .select('*')
      .eq('event_code', eventCode)
      .is('deleted_at', null) // <-- FILTER: Hanya foto aktif
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!photos || photos.length === 0) {
      return NextResponse.json({ error: 'Tidak ada foto untuk diekspor' }, { status: 404 });
    }

    // 2. Inisialisasi JSZip
    const zip = new JSZip();
    const photoFolder = zip.folder("Foto_Tamu");
    
    // 3. Siapkan data untuk CSV
    let csvContent = "Nama Tamu,Pesan/Ucapan,Status,Tanggal Upload\n";

    // 4. Looping foto: download gambar & buat CSV
    // Kita gunakan Promise.all agar proses download gambar paralel (lebih cepat)
    const downloadPromises = photos.map(async (photo, index) => {
      try {
        // Fetch gambar dari URL (Cloudinary/Supabase Storage)
        const response = await fetch(photo.image_url);
        const arrayBuffer = await response.arrayBuffer();
        
        // Tentukan ekstensi file (default jpg)
        const ext = photo.image_url.split('.').pop().split('?')[0] || 'jpg';
        const fileName = `foto_${index + 1}_${photo.guest_name.replace(/[^a-zA-Z0-9]/g, '_')}.${ext}`;
        
        // Tambahkan ke folder ZIP
        photoFolder.file(fileName, arrayBuffer);

        // Tambahkan baris ke CSV
        const date = new Date(photo.created_at).toLocaleString('id-ID');
        const message = photo.message ? `"${photo.message.replace(/"/g, '""')}"` : ''; // Escape quotes untuk CSV
        csvContent += `"${photo.guest_name}",${message},"${photo.status}","${date}"\n`;
      } catch (err) {
        console.warn(`Gagal download foto ${photo.id}:`, err);
      }
    });

    await Promise.all(downloadPromises);

    // 5. Tambahkan file CSV ke root ZIP
    zip.file("Daftar_Ucapan_Tamu.csv", csvContent);

    // 6. Generate file ZIP
    const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

    // 7. Kirim ke browser
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="HAQ-Photowall-${eventCode}.zip"`,
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}