'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Grid3x3, MonitorPlay, Maximize, Pause, Play, Flag, X, 
  Clock, MessageSquare, Eye, AlertTriangle, CheckCircle2,
  Wifi, WifiOff
} from 'lucide-react';

// Import Supabase Client (browser-side)
import { supabaseBrowser } from '@/lib/supabaseClient';
import { DEFAULT_THEME_ID, getTheme } from '@/lib/themes';
import JemuranDisplay from '@/components/JemuranDisplay';

export default function DisplayView({ eventCode }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [newPhotoId, setNewPhotoId] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [reportStatus, setReportStatus] = useState('');
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(50);
  const [isPaused, setIsPaused] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [eventTheme, setEventTheme] = useState(DEFAULT_THEME_ID);
  const [themeLoaded, setThemeLoaded] = useState(false);
  
  const containerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const slideshowIntervalRef = useRef(null);
  const scrollAnimationRef = useRef(null);
  const lastTimeRef = useRef(0);
  const realtimeChannelRef = useRef(null);

  // Load tema dari database (sumber kebenaran; localStorage hanya untuk anti-flash)
  useEffect(() => {
    let cancelled = false;
    const loadEventTheme = async () => {
      try {
        const res = await fetch('/api/event-info?code=' + encodeURIComponent(eventCode));
        const result = await res.json();
        if (!cancelled && result.success && result.event.theme) {
          document.documentElement.setAttribute('data-theme', result.event.theme);
          setEventTheme(result.event.theme);
          localStorage.setItem('theme_' + eventCode, result.event.theme);
        }
      } catch (error) {
        console.error('Failed to load event theme:', error);
      } finally {
        if (!cancelled) setThemeLoaded(true);
      }
    };
    loadEventTheme();
    return () => { cancelled = true; };
  }, [eventCode]);

  // Load foto awal (sekali saja saat mount)
  const loadInitialPhotos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/photos?eventCode=' + eventCode + '&status=all');
      const result = await res.json();
      if (result.data) {
        const visible = result.data.filter(p => p.status === 'approved' || p.status === 'pending');
        setPhotos(visible);
      }
    } catch (error) {
      console.error('Error loading initial photos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Setup Realtime Subscription (Pengganti Polling)
  useEffect(() => {
    loadInitialPhotos();

    // Subscribe ke perubahan tabel photos
    const channel = supabaseBrowser
      .channel('photos-realtime-' + eventCode)
      .on(
        'postgres_changes',
        {
          event: '*', // Dengarkan INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'photos',
          filter: 'event_code=eq.' + eventCode
        },
        (payload) => {
          console.log('Realtime event:', payload.eventType, payload.new);

          if (payload.eventType === 'INSERT') {
            // Foto baru masuk
            const newPhoto = payload.new;
            if (newPhoto.status === 'approved' || newPhoto.status === 'pending') {
              setPhotos(prev => [newPhoto, ...prev]);
              setNewPhotoId(newPhoto.id);
              setTimeout(() => setNewPhotoId(null), 5000);
            }
          } 
          else if (payload.eventType === 'UPDATE') {
            // Foto di-update (approve/reject)
            const updatedPhoto = payload.new;
            setPhotos(prev => {
              // Jika status berubah jadi rejected, hapus dari list
              if (updatedPhoto.status === 'rejected') {
                return prev.filter(p => p.id !== updatedPhoto.id);
              }
              // Jika status berubah jadi approved/pending, update datanya
              return prev.map(p => p.id === updatedPhoto.id ? updatedPhoto : p);
            });
          } 
          else if (payload.eventType === 'DELETE') {
            // Foto dihapus
            const deletedPhoto = payload.old;
            setPhotos(prev => prev.filter(p => p.id !== deletedPhoto.id));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeConnected(true);
          console.log('✅ Realtime connected!');
        } else if (status === 'CHANNEL_ERROR') {
          setIsRealtimeConnected(false);
          console.error('❌ Realtime connection error');
        }
      });

    realtimeChannelRef.current = channel;

    // Cleanup saat component unmount
    return () => {
      supabaseBrowser.removeChannel(channel);
    };
  }, [eventCode]);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) { 
      try { await containerRef.current.requestFullscreen(); } 
      catch(e){} 
    } else { 
      await document.exitFullscreen(); 
    }
  };

  const handleReport = async () => {
    if (!selectedPhoto) return;
    setReportStatus('loading');
    try {
      const res = await fetch('/api/reports', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ photoId: selectedPhoto.id, eventCode, reason: 'Tidak pantas' }) 
      });
      const result = await res.json();
      if (result.success) { 
        setReportStatus('success'); 
        setTimeout(() => { setSelectedPhoto(null); setReportStatus(''); }, 2000); 
      } else { 
        setReportStatus('error'); 
      }
    } catch (error) { 
      setReportStatus('error'); 
    }
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      if (e.key === 'g' || e.key === 'G') setViewMode('grid');
      if (e.key === 's' || e.key === 'S') setViewMode('slideshow');
      if (e.key === 'Escape' && selectedPhoto) { setSelectedPhoto(null); setReportStatus(''); }
      if (e.key === ' ') { e.preventDefault(); if (autoScroll) setIsPaused(!isPaused); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedPhoto, autoScroll, isPaused]);

  useEffect(() => {
    if (viewMode === 'slideshow' && photos.length > 0) {
      slideshowIntervalRef.current = setInterval(() => setCurrentSlide(p => (p + 1) % photos.length), 4000);
    }
    return () => clearInterval(slideshowIntervalRef.current);
  }, [viewMode, photos.length]);

  useEffect(() => {
    if (autoScroll && !isPaused && scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      const step = (ts) => {
        if (!lastTimeRef.current) lastTimeRef.current = ts;
        const dt = ts - lastTimeRef.current; 
        lastTimeRef.current = ts;
        el.scrollBy(0, (scrollSpeed / 1000) * dt);
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) el.scrollTo(0, 0);
        scrollAnimationRef.current = requestAnimationFrame(step);
      };
      scrollAnimationRef.current = requestAnimationFrame(step);
      return () => cancelAnimationFrame(scrollAnimationRef.current);
    } else { 
      if (scrollAnimationRef.current) cancelAnimationFrame(scrollAnimationRef.current); 
      lastTimeRef.current = 0; 
    }
  }, [autoScroll, isPaused, scrollSpeed]);

  // Tunggu tema event selesai dimuat agar display tidak pernah merender
  // layout yang salah (konsisten dengan halaman guest — upload & display sama)
  if (loading || !themeLoaded) return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
        <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '14px', letterSpacing: '2px' }}>MEMUAT FEED...</p>
      </div>
    </div>
  );

  // === SMART ROUTER DISPLAY (sinkron dengan halaman upload) ===
  // Layout dipilih dari THEME_REGISTRY field `style` — tema bergaya jemuran
  // otomatis memakai JemuranDisplay (tali + polaroid), sama seperti /e/...
  if (getTheme(eventTheme).style === 'jemuran') {
    return <JemuranDisplay eventCode={eventCode} photos={photos} />;
  }

  return (
    <div ref={containerRef} style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: 'var(--font-body)', transition: 'background 0.5s, color 0.5s' }}>
      
      {/* Header Glassmorphism */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40, padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(var(--bg-card-rgb, 255,255,255), 0.8)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px', fontFamily: 'var(--font-heading)' }}>{eventCode.replace(/-/g, ' ').toUpperCase()}</h1>
            <p style={{ fontSize: '11px', color: 'var(--accent)', fontFamily: 'var(--font-mono)', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }}></span> LIVE FEED ACTIVE
            </p>
          </div>
          
          {/* Indikator Realtime Connection */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: isRealtimeConnected ? '#dcfce7' : '#fee2e2', borderRadius: '20px', fontSize: '11px', fontWeight: '700', color: isRealtimeConnected ? '#166534' : '#991b1b', fontFamily: 'var(--font-mono)' }}>
            {isRealtimeConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {isRealtimeConnected ? 'REALTIME' : 'POLLING'}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={() => setViewMode('grid')} style={{ padding: '10px 16px', backgroundColor: viewMode === 'grid' ? 'var(--accent)' : 'var(--bg-main)', color: viewMode === 'grid' ? 'var(--bg-card)' : 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}>
            <Grid3x3 size={14} /> GRID
          </button>
          <button onClick={() => setViewMode('slideshow')} style={{ padding: '10px 16px', backgroundColor: viewMode === 'slideshow' ? 'var(--accent)' : 'var(--bg-main)', color: viewMode === 'slideshow' ? 'var(--bg-card)' : 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}>
            <MonitorPlay size={14} /> SLIDE
          </button>
          <button onClick={toggleFullscreen} style={{ padding: '10px', backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
            <Maximize size={16} />
          </button>
        </div>
      </header>

      <main style={{ paddingTop: '88px', minHeight: '100vh' }}>
        {viewMode === 'grid' ? (
          <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Play size={14} /> AUTO SCROLL
                </span>
                <button onClick={() => setAutoScroll(!autoScroll)} style={{ width: '48px', height: '24px', backgroundColor: autoScroll ? 'var(--accent)' : 'var(--border)', borderRadius: '12px', position: 'relative', border: 'none', cursor: 'pointer', transition: 'background 0.3s' }}>
                  <div style={{ width: '18px', height: '18px', backgroundColor: '#fff', borderRadius: '50%', position: 'absolute', top: '3px', left: autoScroll ? '26px' : '3px', transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></div>
                </button>
                {autoScroll && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input type="range" min="10" max="200" value={scrollSpeed} onChange={(e) => setScrollSpeed(parseInt(e.target.value))} style={{ width: '120px', accentColor: 'var(--accent)' }} />
                    <button onClick={() => setIsPaused(!isPaused)} style={{ padding: '6px 12px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                      {isPaused ? <Play size={12} /> : <Pause size={12} />}
                    </button>
                  </div>
                )}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Grid3x3 size={14} /> {photos.length} ITEMS
              </span>
            </div>
            
            <div ref={scrollContainerRef} style={{ height: 'calc(100vh - 180px)', overflowY: 'auto', paddingRight: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {photos.map((photo) => {
                  const isPending = photo.status === 'pending';
                  return (
                    <div key={photo.id} onClick={() => setSelectedPhoto(photo)} style={{ position: 'relative', backgroundColor: 'var(--bg-card)', borderRadius: '16px', overflow: 'hidden', border: photo.id === newPhotoId ? '2px solid var(--accent)' : '1px solid var(--border)', cursor: 'pointer', aspectRatio: '1/1', transition: 'transform 0.3s, box-shadow 0.3s', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} 
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.1)'; }} 
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
                    >
                      <img src={photo.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: isPending ? 'blur(12px) brightness(0.7)' : 'none', transition: 'filter 0.5s' }} loading="lazy" />
                      
                      {isPending && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                          <span style={{ backgroundColor: '#eab308', color: '#000', padding: '8px 16px', borderRadius: '24px', fontSize: '12px', fontWeight: '800', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={14} /> PENDING
                          </span>
                        </div>
                      )}

                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px', background: 'linear-gradient(to top, rgba(0,0,0,0.95), transparent)' }}>
                        <p style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#fff', fontFamily: 'var(--font-heading)' }}>{photo.guest_name}</p>
                        {photo.message && <p style={{ fontSize: '13px', color: '#d4d4d8', margin: '6px 0 0 0', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}><MessageSquare size={12} /> {"“"}{photo.message}{"”"}</p>}
                      </div>

                      {photo.id === newPhotoId && !isPending && (
                        <div style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: 'var(--accent)', color: 'var(--bg-card)', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'currentColor', animation: 'pulse 1.5s infinite' }}></span> NEW
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 88px)', padding: '32px' }}>
            {photos.length > 0 && (
              <div style={{ position: 'relative', maxWidth: '1100px', width: '100%', maxHeight: '80vh' }}>
                <img src={photos[currentSlide]?.image_url} alt={photos[currentSlide]?.guest_name ? `Foto dari ${photos[currentSlide].guest_name}` : "Foto"} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '20px', filter: photos[currentSlide]?.status === 'pending' ? 'blur(16px) brightness(0.6)' : 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', transition: 'filter 0.5s' }} />
                
                {photos[currentSlide]?.status === 'pending' && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ backgroundColor: '#eab308', color: '#000', padding: '16px 32px', borderRadius: '32px', fontSize: '16px', fontWeight: '800', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }}>
                      <Clock size={20} /> MENUNGGU REVIEW
                    </span>
                  </div>
                )}
                
                <div style={{ position: 'absolute', bottom: '32px', left: '32px', right: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.6)', padding: '20px 24px', borderRadius: '16px', backdropFilter: 'blur(8px)' }}>
                    <p style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,0.8)', fontFamily: 'var(--font-heading)' }}>{photos[currentSlide]?.guest_name}</p>
                    {photos[currentSlide]?.message && <p style={{ fontSize: '18px', color: '#e4e4e7', margin: '8px 0 0 0', fontStyle: 'italic', textShadow: '0 2px 4px rgba(0,0,0,0.8)', maxWidth: '700px', lineHeight: 1.5 }}>{"“"}{photos[currentSlide]?.message}{"”"}</p>}
                  </div>
                  <p style={{ fontSize: '14px', color: '#a1a1aa', fontFamily: 'var(--font-mono)', fontWeight: '600', backgroundColor: 'rgba(0,0,0,0.6)', padding: '8px 16px', borderRadius: '20px', backdropFilter: 'blur(8px)' }}>{currentSlide + 1} / {photos.length}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {selectedPhoto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px', backdropFilter: 'blur(12px)' }} onClick={() => { setSelectedPhoto(null); setReportStatus(''); }}>
          <div style={{ position: 'relative', maxWidth: '900px', width: '100%', backgroundColor: 'var(--bg-card)', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }} onClick={(e) => e.stopPropagation()}>
            <img src={selectedPhoto.image_url} alt={`Foto dari ${selectedPhoto.guest_name || 'tamu'}`} style={{ width: '100%', maxHeight: '65vh', objectFit: 'contain', backgroundColor: '#000', display: 'block', filter: selectedPhoto.status === 'pending' ? 'blur(12px)' : 'none' }} />
            
            {selectedPhoto.status === 'pending' && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                <span style={{ backgroundColor: '#eab308', color: '#000', padding: '16px 32px', borderRadius: '32px', fontSize: '16px', fontWeight: '800', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={20} /> MENUNGGU REVIEW
                </span>
              </div>
            )}

            <div style={{ padding: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '32px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: 'var(--text-main)', fontFamily: 'var(--font-heading)' }}>{selectedPhoto.guest_name}</p>
                {selectedPhoto.message && <p style={{ fontSize: '18px', color: 'var(--text-muted)', margin: '12px 0 0 0', fontStyle: 'italic', lineHeight: 1.6, display: 'flex', gap: '8px' }}><MessageSquare size={18} style={{ marginTop: '4px', flexShrink: 0 }} /> {"“"}{selectedPhoto.message}{"”"}</p>}
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={14} /> {new Date(selectedPhoto.created_at).toLocaleString('id-ID')}
                </p>
              </div>
              
              {selectedPhoto.status !== 'pending' && (
                <button onClick={handleReport} disabled={reportStatus === 'loading' || reportStatus === 'success'} style={{ backgroundColor: reportStatus === 'success' ? '#22c55e' : '#dc2626', color: '#fff', padding: '14px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: '800', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
                  onMouseEnter={(e) => !reportStatus && (e.currentTarget.style.transform = 'translateY(-2px)')}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {reportStatus === 'loading' ? 'MENGIRIM...' : reportStatus === 'success' ? <><CheckCircle2 size={16} /> TERLAPOR</> : <><Flag size={16} /> LAPOR</>}
                </button>
              )}
            </div>

            <button onClick={() => { setSelectedPhoto(null); setReportStatus(''); }} style={{ position: 'absolute', top: '20px', right: '20px', width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', transition: 'all 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.8)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.6)'}
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        *::-webkit-scrollbar { width: 8px; }
        *::-webkit-scrollbar-track { background: var(--bg-main); }
        *::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
        *::-webkit-scrollbar-thumb:hover { background: var(--accent); }
      `}</style>
    </div>
  );
}