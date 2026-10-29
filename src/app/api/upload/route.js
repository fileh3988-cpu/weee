import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import { supabaseServer } from '@/lib/supabaseClient';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const guestName = formData.get('guestName');
    const message = formData.get('message');
    const eventCode = formData.get('eventCode');

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file yang diupload' }, { status: 400 });
    }

    const minSize = 10 * 1024; // 10 KB (mencegah file kosong/rusak)
    const maxSize = 20 * 1024 * 1024; // 20 MB (sangat longgar untuk HP modern)

    if (!eventCode) {
      return NextResponse.json({ error: 'Event tidak valid.' }, { status: 400 });
    }

    // Validasi event ada & cek batas upload per event (mencegah spam)
    const { data: event, error: eventError } = await supabaseServer
      .from('events')
      .select('code, max_uploads')
      .eq('code', eventCode)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event tidak ditemukan.' }, { status: 404 });
    }

    if (event.max_uploads) {
      const { count } = await supabaseServer
        .from('photos')
        .select('*', { count: 'exact', head: true })
        .eq('event_code', eventCode);

      if (count >= event.max_uploads) {
        return NextResponse.json({
          error: `Batas upload untuk event ini sudah tercapai (maks ${event.max_uploads} foto).`,
        }, { status: 429 });
      }
    }

    // === SMART FILTER ===
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Format file tidak didukung. Gunakan JPG, PNG, atau WEBP.' 
      }, { status: 400 });
    }

    if (file.size < minSize) {
      return NextResponse.json({ 
        error: 'Ukuran file terlalu kecil. Kemungkinan file rusak.' 
      }, { status: 400 });
    }

    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'Ukuran file terlalu besar (Maks 20MB).' 
      }, { status: 400 });
    }
    // === END SMART FILTER ===

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: `photowall/${eventCode}` },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    const { data, error: dbError } = await supabaseServer
      .from('photos')
      .insert([
        {
          event_code: eventCode,
          guest_name: guestName,
          message: message,
          image_url: uploadResult.secure_url,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, data });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan saat mengupload. Coba lagi.' }, { status: 500 });
  }
}