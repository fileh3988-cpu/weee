'use client';
import { useState, useEffect } from 'react';
import { Upload, Camera, X, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function JemuranLayout(props) {
  // 1. JemuranLayout mengatur welcome screen-nya sendiri (Mandiri & Aman)
  const [showWelcome, setShowWelcome] = useState(true);

  const {
    eventCode, communityPhotos, myPhotos, handleSubmit, formRef, loading, status, statusType,
    filePreview, fileName, setFilePreview, setFileName, startCamera, showCamera, videoRef,
    capturePhoto, switchCamera, facingMode, isCameraReady, cameraError, stopCamera,
    previewPhoto, setPreviewPhoto, handleRemovePhoto, isRealtimeConnected
  } = props;

  // Auto-skip setelah 2.5 detik
  useEffect(() => {
    if (showWelcome) {
      const timer = setTimeout(() => setShowWelcome(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [showWelcome]);

  const getStatusConfig = (status) => {
    if (status === 'approved') return { label: 'Diterima', icon: CheckCircle2, bg: 'var(--accent-2)', color: '#fff' };
    if (status === 'rejected') return { label: 'Ditolak', icon: AlertCircle, bg: '#9ca3af', color: '#fff' };
    return { label: 'Menunggu', icon: Clock, bg: 'var(--accent)', color: '#fff' };
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: 'var(--font-body)', overflowX: 'hidden' }}>
      
      {/* === AUTO-GATE PREMIUM (Mandiri) === */}
      {showWelcome && (
        <div onClick={() => setShowWelcome(false)} style={{ 
          position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
          padding: '24px', textAlign: 'center', background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #FCD34D 100%)', cursor: 'pointer', animation: 'fadeInGate 0.6s ease-out'
        }}>
          <div style={{ position: 'absolute', top: '10%', left: '10%', width: '80px', height: '100px', backgroundColor: '#fff', borderRadius: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', transform: 'rotate(-12deg)', opacity: 0.6, animation: 'floatPolaroid 6s ease-in-out infinite' }}></div>
          <div style={{ position: 'absolute', top: '20%', right: '15%', width: '100px', height: '120px', backgroundColor: '#fff', borderRadius: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', transform: 'rotate(8deg)', opacity: 0.5, animation: 'floatPolaroid 7s ease-in-out infinite 1s' }}></div>
          
          <div style={{ position: 'relative', zIndex: 10, maxWidth: '400px', width: '100%' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '24px', background: 'linear-gradient(135deg, #3B82F6 0%, #10B981 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', boxShadow: '0 20px 40px rgba(59, 130, 246, 0.4), 0 0 0 8px rgba(255,255,255,0.3)', animation: 'scaleIn 0.8s ease-out 0.2s both' }}>
              <span style={{ color: '#fff', fontSize: '40px', fontWeight: '900', letterSpacing: '2px' }}>HAQ</span>
            </div>
            <h1 style={{ fontSize: '36px', fontWeight: '900', margin: '0 0 8px 0', color: '#451a03', letterSpacing: '-1px', fontFamily: 'Georgia, serif', animation: 'slideUp 0.8s ease-out 0.4s both' }}>Jemuran Kenangan</h1>
            <p style={{ fontSize: '14px', color: '#92400e', margin: '0 0 32px 0', lineHeight: 1.6, fontStyle: 'italic', animation: 'slideUp 0.8s ease-out 0.5s both' }}>Foto polaroid digantung, bergoyang ditiup angin</p>
            <div style={{ display: 'inline-block', padding: '12px 24px', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '20px', marginBottom: '32px', backdropFilter: 'blur(10px)', animation: 'slideUp 0.8s ease-out 0.6s both' }}>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#d97706' }}>🎉 {eventCode.replace(/-/g, ' ')}</p>
            </div>
            <div style={{ width: '100%', maxWidth: '200px', margin: '0 auto', animation: 'slideUp 0.8s ease-out 0.7s both' }}>
              <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(217, 119, 6, 0.2)', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px' }}>
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #d97706, #b45309)', borderRadius: '10px', animation: 'loadBar 2.5s ease-in-out forwards' }}></div>
              </div>
              <p style={{ fontSize: '12px', color: '#92400e', margin: 0, fontWeight: '600' }}>Memuat pengalaman... (Tap untuk skip)</p>
            </div>
          </div>
          <style>{`
            @keyframes fadeInGate { from { opacity: 0; } to { opacity: 1; } }
            @keyframes scaleIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            @keyframes loadBar { from { width: '0%'; } to { width: '100%'; } }
            @keyframes floatPolaroid { 0%, 100% { transform: translateY(0) rotate(-12deg); } 50% { transform: translateY(-20px) rotate(-8deg); } }
          `}</style>
        </div>
      )}

      {/* === HEADER === */}
      <header style={{ textAlign: 'center', padding: '40px 20px 20px 20px' }}>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>{eventCode.replace(/-/g, ' ')}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Tap foto untuk melihat besar</p>
      </header>

      {/* === JEMURAN AREA === */}
      <div style={{ position: 'relative', padding: '60px 0', marginBottom: '40px' }}>
        <div style={{ position: 'absolute', top: '30px', left: '0', right: '0', height: '2px', backgroundColor: 'var(--text-muted)', opacity: 0.5, zIndex: 0 }}></div>
        <div style={{ display: 'flex', overflowX: 'auto', padding: '0 20px', gap: '24px', scrollSnapType: 'x mandatory', zIndex: 1, position: 'relative' }}>
          {communityPhotos.length === 0 ? (
            <div style={{ width: '100%', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <p>Belum ada foto yang tergantung 🪢</p>
              <p style={{ fontSize: '14px' }}>Jadilah yang pertama!</p>
            </div>
          ) : (
            communityPhotos.map((photo, index) => {
              const sc = getStatusConfig(photo.status);
              const StatusIcon = sc.icon;
              return (
                <div key={photo.id} onClick={() => setPreviewPhoto(photo)} style={{ 
                  flex: '0 0 auto', width: '140px', backgroundColor: 'var(--bg-card)', padding: '8px 8px 24px 8px', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)', position: 'relative', transformOrigin: 'top center',
                  animation: `sway ${3 + (index % 3)}s ease-in-out infinite`, animationDelay: `${index * 0.5}s`,
                  cursor: 'pointer', scrollSnapAlign: 'center'
                }}>
                  <div style={{ position: 'absolute', top: '-32px', left: '50%', width: '2px', height: '32px', backgroundColor: 'var(--text-muted)', opacity: 0.7 }}></div>
                  <div style={{ width: '100%', aspectRatio: '1/1', backgroundColor: '#000', overflow: 'hidden', marginBottom: '8px' }}>
                    <img src={photo.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', fontFamily: 'cursive', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{photo.guest_name}</p>
                  {photo.status === 'pending' && (
                    <div style={{ position: 'absolute', inset: '8px 8px 24px 8px', backgroundColor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clock size={20} color="var(--accent)" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* === FORM UPLOAD === */}
      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '0 20px 60px 20px' }}>
        <div ref={formRef} style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 16px 0', textAlign: 'center', fontFamily: 'var(--font-heading)' }}>📸 Upload Foto</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <input type="text" name="guestName" required placeholder="Nama Anda..." style={{ width: '100%', padding: '12px', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '8px', outline: 'none' }} />
            {filePreview && (
              <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', marginBottom: '8px' }}>
                <img src={filePreview} alt="Pratinjau foto" style={{ width: '100%', maxHeight: '150px', objectFit: 'cover' }} />
                <button type="button" onClick={() => { setFilePreview(''); setFileName(''); }} style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={14} />
                </button>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button type="button" onClick={startCamera} style={{ padding: '12px', backgroundColor: 'var(--bg-main)', border: '1px dashed var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <Camera size={20} /> <span style={{ fontSize: '12px' }}>Kamera</span>
              </button>
              <label style={{ padding: '12px', backgroundColor: 'var(--bg-main)', border: '1px dashed var(--border)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <Upload size={20} /> <span style={{ fontSize: '12px' }}>Galeri</span>
                <input type="file" name="file" accept="image/*" required={!filePreview} style={{ display: 'none' }} onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    setFileName(file.name);
                    const reader = new FileReader();
                    reader.onloadend = () => setFilePreview(reader.result);
                    reader.readAsDataURL(file);
                    window.__cameraFile = null;
                  }
                }} />
              </label>
            </div>
            <textarea name="message" placeholder="Pesan (opsional)..." rows="2" style={{ width: '100%', padding: '12px', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '8px', outline: 'none', resize: 'none' }}></textarea>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '700', cursor: 'pointer' }}>
              {loading ? 'Mengupload...' : 'Gantung Foto 🪢'}
            </button>
          </form>
          {status && (
            <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', textAlign: 'center', fontSize: '14px', backgroundColor: statusType === 'success' ? '#dcfce7' : '#fee2e2', color: statusType === 'success' ? '#166534' : '#991b1b' }}>
              {status}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes sway { 0% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } 100% { transform: rotate(-3deg); } }
        div::-webkit-scrollbar { display: none; }
        div { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}