'use client';
import { useState } from 'react';
import { X, Clock, Maximize } from 'lucide-react';

// ============================================================
// JEMURAN DISPLAY — versi layar besar (TV/projector) dari tema
// Jemuran. Sengaja memakai visual yang SAMA dengan halaman
// upload (/e/...): tali horizontal + polaroid bergoyang, warna
// & font dari CSS variable tema [data-theme="jemuran"].
// Foto auto-scroll merayap pelan; tap/klik foto untuk zoom.
// ============================================================
export default function JemuranDisplay({ eventCode, photos }) {
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: 'var(--font-body)', overflowX: 'hidden' }}>
      {/* Header sederhana senada guest jemuran */}
      <header style={{ textAlign: 'center', padding: '32px 20px 8px 20px' }}>
        <h1 style={{ fontSize: 'clamp(32px, 4vw, 56px)', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
          {eventCode.replace(/-/g, ' ')}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
          {photos.length} kenangan tergantung · LIVE
        </p>
      </header>

      {/* Area jemuran: satu baris panjang yang merayap otomatis */}
      <div style={{ position: 'relative', padding: '70px 0 60px 0' }}>
        <div style={{ position: 'absolute', top: '40px', left: 0, right: 0, height: '2px', backgroundColor: 'var(--text-muted)', opacity: 0.5, zIndex: 0 }}></div>
        <div className="jemuran-marquee-track" style={{ display: 'flex', gap: '32px', width: 'max-content', zIndex: 1, position: 'relative' }}>
          {(photos.length > 0 ? photos : []).map((photo, index) => (
            <div key={photo.id + '-a'} onClick={() => setSelectedPhoto(photo)} style={cardStyle(index)}>
              <ClothesPin />
              <Polaroid photo={photo} />
            </div>
          ))}
          {/* Duplikat daftar agar animasi marquee mulus tanpa jeda */}
          {(photos.length > 0 ? photos : []).map((photo, index) => (
            <div key={photo.id + '-b'} aria-hidden="true" style={cardStyle(index)}>
              <ClothesPin />
              <Polaroid photo={photo} />
            </div>
          ))}
          {photos.length === 0 && (
            <div style={{ width: '100vw', textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '24px' }}>Belum ada foto yang tergantung 🪢</p>
              <p style={{ fontSize: '16px' }}>Tunggu tamu mulai menggantung kenangan...</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal zoom foto */}
      {selectedPhoto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px', backdropFilter: 'blur(8px)' }} onClick={() => setSelectedPhoto(null)}>
          <div style={{ maxWidth: '900px', width: '100%', backgroundColor: 'var(--bg-card)', padding: '16px 16px 48px 16px', boxShadow: '0 25px 60px rgba(0,0,0,0.6)', transform: 'rotate(-1deg)' }} onClick={(e) => e.stopPropagation()}>
            <img src={selectedPhoto.image_url} alt={`Foto dari ${selectedPhoto.guest_name || 'tamu'}`} style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', backgroundColor: '#000', display: 'block' }} />
            <p style={{ margin: '16px 0 0 0', textAlign: 'center', fontSize: '22px', color: 'var(--text-main)', fontFamily: 'cursive' }}>{selectedPhoto.guest_name}</p>
            {selectedPhoto.message && <p style={{ margin: '8px 0 0 0', textAlign: 'center', fontSize: '16px', color: 'var(--text-muted)', fontStyle: 'italic' }}>{'“'}{selectedPhoto.message}{'”'}</p>}
          </div>
          <button onClick={() => setSelectedPhoto(null)} style={{ position: 'absolute', top: '24px', right: '24px', width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={22} />
          </button>
        </div>
      )}

      <style>{`
        @keyframes jemuranMarquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .jemuran-marquee-track { animation: jemuranMarquee ${Math.max(40, photos.length * 6)}s linear infinite; }
        .jemuran-marquee-track:hover { animation-play-state: paused; }
        @keyframes swayBig { 0% { transform: rotate(-2.5deg); } 50% { transform: rotate(2.5deg); } 100% { transform: rotate(-2.5deg); } }
      `}</style>
    </div>
  );
}

const cardStyle = (index) => ({
  flex: '0 0 auto',
  width: '220px',
  backgroundColor: 'var(--bg-card)',
  padding: '12px 12px 36px 12px',
  boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
  position: 'relative',
  transformOrigin: 'top center',
  animation: `swayBig ${4 + (index % 3)}s ease-in-out infinite`,
  animationDelay: `${index * 0.4}s`,
  cursor: 'pointer',
});

const ClothesPin = () => (
  <div style={{ position: 'absolute', top: '-34px', left: '50%', transform: 'translateX(-50%)', width: '10px', height: '30px', backgroundColor: 'var(--accent)', borderRadius: '4px', opacity: 0.9 }}></div>
);

const Polaroid = ({ photo }) => (
  <>
    <div style={{ width: '100%', aspectRatio: '1/1', backgroundColor: '#000', overflow: 'hidden' }}>
      <img src={photo.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
    </div>
    <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'cursive', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{photo.guest_name}</p>
    {photo.status === 'pending' && (
      <div style={{ position: 'absolute', inset: '12px 12px 36px 12px', backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        <Clock size={20} color="var(--accent)" />
        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>MENUNGGU</span>
      </div>
    )}
  </>
);

void Maximize; // reserved for future fullscreen control
