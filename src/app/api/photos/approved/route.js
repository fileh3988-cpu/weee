import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseClient';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventCode = searchParams.get('eventCode');

    if (!eventCode) {
      return NextResponse.json({ error: 'Event code required' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('photos')
      .select('*')
      .eq('event_code', eventCode)
      .eq('status', 'approved') // Hanya foto yang sudah di-approve
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}