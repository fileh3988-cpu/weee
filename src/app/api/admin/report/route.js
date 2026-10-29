import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(request) {
  try {
    if (!requireAdmin(request)) {
      return NextResponse.json({ error: 'Tidak diizinkan. Login admin diperlukan.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventCode = searchParams.get('eventCode');

    let totalEvents = 0;
    let totalPhotos = 0;
    let approved = 0;
    let pending = 0;
    let rejected = 0;
    let deleted = 0;
    let uniqueGuests = 0;
    let topContributors = [];

    if (eventCode) {
      // === STATS PER-EVENT ===
      const { data: photos, error } = await supabaseServer
        .from('photos')
        .select('status, deleted_at, guest_name')
        .eq('event_code', eventCode);

      if (error) throw error;

      totalPhotos = photos.length;
      // Hitung hanya yang deleted_at-nya NULL (aktif)
      approved = photos.filter(p => p.status === 'approved' && !p.deleted_at).length;
      pending = photos.filter(p => p.status === 'pending' && !p.deleted_at).length;
      rejected = photos.filter(p => p.status === 'rejected' && !p.deleted_at).length;
      deleted = photos.filter(p => p.deleted_at !== null).length;
      
      const guestNames = photos.filter(p => !p.deleted_at).map(p => p.guest_name).filter(n => n);
      uniqueGuests = new Set(guestNames).size;

      const guestCounts = {};
      guestNames.forEach(name => { guestCounts[name] = (guestCounts[name] || 0) + 1; });
      
      topContributors = Object.entries(guestCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    } else {
      // === STATS GLOBAL (SUPER ADMIN) ===
      const { count: eventsCount } = await supabaseServer
        .from('events')
        .select('*', { count: 'exact', head: true });
      totalEvents = eventsCount || 0;

      const { data: allPhotos, error } = await supabaseServer
        .from('photos')
        .select('status, deleted_at');

      if (error) throw error;

      totalPhotos = allPhotos.length;
      approved = allPhotos.filter(p => p.status === 'approved' && !p.deleted_at).length;
      pending = allPhotos.filter(p => p.status === 'pending' && !p.deleted_at).length;
      rejected = allPhotos.filter(p => p.status === 'rejected' && !p.deleted_at).length;
      deleted = allPhotos.filter(p => p.deleted_at !== null).length;
    }

    return NextResponse.json({
      success: true,
      data: {
        totalEvents,
        totalPhotos,
        approved,
        pending,
        rejected,
        deleted,
        uniqueGuests,
        topContributors
      }
    });

  } catch (error) {
    console.error('Report API Error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}