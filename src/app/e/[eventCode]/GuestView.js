'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Upload, User, MessageCircle, Trash2, X, Camera,
  CheckCircle2, Clock, AlertCircle, Sparkles, ArrowUp,
  Wifi, WifiOff, Users
} from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import JemuranLayout from '@/components/JemuranLayout';
import { DEFAULT_THEME_ID, getTheme } from '@/lib/themes';

// Helper murni (di luar komponen) agar effect dependency selalu stabil
const storageKeyFor = (code) => 'guest_uploads_' + code;

export default function GuestView({ eventCode }) {
  // === STATE ===
  const [themeLoaded, setThemeLoaded] = useState(false); // ANTI-FLASH: tunggu tema siap
  const [eventTheme, setEventTheme] = useState(DEFAULT_THEME_ID);
  const [showWelcome, setShowWelcome] = useState(true);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState('');
  const [myPhotos, setMyPhotos] = useState([]);
  const [communityPhotos, setCommunityPhotos] = useState([]);
  const [showMyGallery, setShowMyGallery] = useState(false);
  const [filePreview, setFilePreview] = useState('');
  const [fileName, setFileName] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [newPhotoId, setNewPhotoId] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState('environment');
  const [capturedImage, setCapturedImage] = useState('');
  const [isCameraReady, setIsCameraReady] = useState(false);

  const formRef = useRef(null);
  const myGalleryRef = useRef(null);
  const realtimeChannelRef = useRef(null);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);

  // === 1. LOAD TEMA ===
  // Sumber kebenaran = database (via /api/event-info), supaya jika admin
  // mengganti tema event, perubahan langsung terlihat — TIDAK lagi memakai
  // cache localStorage yang bisa basi. Anti-flash tetap ditangani script
  // ThemeScript di <head> (pakai cache) lalu dikoreksi di sini secara senyap.
  useEffect(() => {
    let cancelled = false;
    const loadTheme = async () => {
      try {
        const res = await fetch('/api/event-info?code=' + encodeURIComponent(eventCode));
        const result = await res.json();
        if (!cancelled && result.success && result.event.theme) {
          const theme = result.event.theme;
          document.documentElement.setAttribute('data-theme', theme);
          setEventTheme(theme);
          localStorage.setItem('theme_' + eventCode, theme); // untuk anti-flash kunjungan berikutnya
        }
      } catch (error) {
        console.error('Failed to load event theme:', error);
      } finally {
        if (!cancelled) setThemeLoaded(true);
      }
    };
    loadTheme();
    return () => { cancelled = true; };
  }, [eventCode]);

  // === 2. LOAD DATA AWAL ===
  useEffect(() => {
    const saved = localStorage.getItem(storageKeyFor(eventCode));
    if (saved) {
      try { setMyPhotos(JSON.parse(saved)); setShowMyGallery(true); } catch (e) {}
    }
  }, [eventCode]);

  useEffect(() => {
    if (myPhotos.length > 0) {
      localStorage.setItem(storageKeyFor(eventCode), JSON.stringify(myPhotos));
      setShowMyGallery(true);
    }
  }, [myPhotos]);

  // === 3. LOAD FOTO KOMUNITAS + REALTIME ===
  const loadInitialCommunityPhotos = async () => {
    try {
      const res = await fetch('/api/photos?eventCode=' + eventCode + '&status=all');
      const result = await res.json();
      if (result.data) {
        const visible = result.data.filter(p => p.status === 'approved' || p.status === 'pending');
        setCommunityPhotos(visible);
      }
    } catch (error) {
      console.error('Error loading community photos:', error);
    }
  };

  useEffect(() => {
    loadInitialCommunityPhotos();
    const channel = supabaseBrowser
      .channel('guest-photos-' + eventCode)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'photos', filter: 'event_code=eq.' + eventCode
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newPhoto = payload.new;
          if (newPhoto.status === 'approved' || newPhoto.status === 'pending') {
            setCommunityPhotos(prev => {
              if (prev.find(p => p.id === newPhoto.id)) return prev;
              return [newPhoto, ...prev];
            });
          }
        } else if (payload.eventType === 'UPDATE') {
          const updatedPhoto = payload.new;
          if (updatedPhoto.status === 'approved' || updatedPhoto.status === 'pending') {
            setCommunityPhotos(prev => {
              const exists = prev.find(p => p.id === updatedPhoto.id);
              if (exists) return prev.map(p => p.id === updatedPhoto.id ? updatedPhoto : p);
              return [updatedPhoto, ...prev];
            });
          } else {
            setCommunityPhotos(prev => prev.filter(p => p.id !== updatedPhoto.id));
          }
        } else if (payload.eventType === 'DELETE') {
          setCommunityPhotos(prev => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setIsRealtimeConnected(true);
        else if (status === 'CHANNEL_ERROR') setIsRealtimeConnected(false);
      });
    realtimeChannelRef.current = channel;
    return () => { supabaseBrowser.removeChannel(channel); };
  }, [eventCode]);

  // === 4. SUBMIT UPLOAD ===
  const handleSubmit = async (e) => {
    e.preventDefault();
    const fileInput = e.target.querySelector('input[name="file"]');
    let fileToUpload = window.__cameraFile || (fileInput?.files?.[0]);
    if (!fileToUpload && !filePreview) {
      setStatus('Pilih atau ambil foto terlebih dahulu.');
      setStatusType('error');
      return;
    }
    setLoading(true);
    setStatus('Sedang mengupload...');
    setStatusType('');
    const formData = new FormData();
    formData.append('eventCode', eventCode);
    formData.append('guestName', e.target.guestName.value);
    formData.append('message', e.target.message.value);
    formData.append('file', fileToUpload);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const result = await res.json();
      if (result.success && result.data) {
        const newPhoto = {
          id: result.data.id, image_url: result.data.image_url, guest_name: result.data.guest_name,
          message: result.data.message, status: result.data.status || 'pending', uploaded_at: new Date().toISOString(),
        };
        setMyPhotos(prev => [newPhoto, ...prev]);
        setStatus('Berhasil! Menunggu persetujuan.');
        setStatusType('success');
        e.target.reset();
        setFilePreview('');
        setFileName('');
        setTimeout(() => myGalleryRef.current?.scrollIntoView({ behavior: 'smooth' }), 1000);
      } else {
        setStatus('Gagal: ' + (result.error || 'Error'));
        setStatusType('error');
      }
    } catch (error) {
      setStatus('Terjadi kesalahan sistem.');
      setStatusType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePhoto = (photoId) => {
    if (!confirm('Hapus foto ini?')) return;
    setMyPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const getStatusConfig = (status) => {
    if (status === 'approved') return { label: 'Diterima', icon: CheckCircle2, bg: 'var(--accent-2)', color: '#fff' };
    if (status === 'rejected') return { label: 'Ditolak', icon: AlertCircle, bg: '#9ca3af', color: '#fff' };
    return { label: 'Menunggu', icon: Clock, bg: 'var(--accent)', color: '#fff' };
  };

  // === 5. KAMERA ===
  const startCamera = async () => {
    setCameraError(''); setIsCameraReady(false); setShowCamera(true); setCapturedImage('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode, width: { ideal: 1024 }, height: { ideal: 720 } }, audio: false
      });
      cameraStreamRef.current = stream;
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setIsCameraReady(true);
          };
        }
      }, 100);
    } catch (err) {
      setCameraError('Gagal mengakses kamera: ' + err.message);
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(track => track.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setShowCamera(false); setIsCameraReady(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (facingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageData);
    stopCamera();
    canvas.toBlob((blob) => {
      if (blob) {
        const fName = `camera-capture-${Date.now()}.jpg`;
        setFileName(fName); setFilePreview(imageData);
        window.__cameraFile = new File([blob], fName, { type: 'image/jpeg' });
      }
    }, 'image/jpeg', 0.9);
  };

  const switchCamera = () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    if (cameraStreamRef.current) cameraStreamRef.current.getTracks().forEach(track => track.stop());
    setTimeout(() => startCamera(), 200);
  };

  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) cameraStreamRef.current.getTracks().forEach(track => track.stop());
    };
  }, []);

  // === 6. LOADING SCREEN (Anti-Flash) ===
  // Warna dasar diambil dari CSS variable agar SENJANG dengan tema yang dipasang
  // script anti-flash di <head> — tidak ada lagi "flash" warna berbeda saat refresh.
  if (!themeLoaded) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', boxShadow: '0 12px 32px rgba(59, 130, 246, 0.5)' }}>
            <span style={{ color: '#fff', fontSize: '28px', fontWeight: '900' }}>HAQ</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>Memuat pengalaman...</p>
        </div>
      </div>
    );
  }

  // === 7. SMART ROUTER ===
  // Layout dipilih dari THEME_REGISTRY (field `style`) — menambah tema baru
  // bergaya jemuran cukup daftarkan di registry, tidak perlu edit file ini.
  if (getTheme(eventTheme).style === 'jemuran') {
    return (
      <>
        <JemuranLayout
          eventCode={eventCode}
          communityPhotos={communityPhotos} myPhotos={myPhotos}
          handleSubmit={handleSubmit} formRef={formRef} loading={loading} status={status} statusType={statusType}
          filePreview={filePreview} fileName={fileName} setFilePreview={setFilePreview} setFileName={setFileName}
          startCamera={startCamera} showCamera={showCamera} videoRef={videoRef} capturePhoto={capturePhoto}
          switchCamera={switchCamera} facingMode={facingMode} isCameraReady={isCameraReady} cameraError={cameraError} stopCamera={stopCamera}
          previewPhoto={previewPhoto} setPreviewPhoto={setPreviewPhoto} handleRemovePhoto={handleRemovePhoto} isRealtimeConnected={isRealtimeConnected}
        />
        {showCamera && <CameraModal />}
        {previewPhoto && <PreviewModal />}
      </>
    );
  }

  // === 8. TEMA MODERN (DEFAULT) ===
  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px', backgroundColor: 'var(--bg-main)', transition: 'background 0.5s', fontFamily: 'var(--font-body)' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, opacity: 0.4, pointerEvents: 'none', backgroundImage: 'radial-gradient(var(--accent) 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
      <div style={{ position: 'relative', zIndex: 10, maxWidth: '600px', margin: '0 auto', padding: '64px 24px' }}>
        <header style={{ textAlign: 'center', marginBottom: '48px' }} className="animate-fade-in">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ height: '1px', width: '40px', backgroundColor: 'var(--accent)' }}></div>
            <p style={{ color: 'var(--accent)', letterSpacing: '0.2em', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', margin: 0 }}>Live Photowall</p>
            <div style={{ height: '1px', width: '40px', backgroundColor: 'var(--accent)' }}></div>
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '16px', fontStyle: 'italic', fontFamily: 'var(--font-heading)', lineHeight: 1.1 }}>
            {eventCode.replace(/-/g, ' ')}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
            Abadikan momen terbaik Anda bersama kami. Upload foto dan lihat kenangan indah dari para tamu lainnya.
          </p>
        </header>

        <div ref={formRef} style={{ backgroundColor: 'var(--bg-card)', borderRadius: '20px', padding: '40px', marginBottom: '48px', border: '1px solid var(--border)', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.05)' }} className="animate-fade-in">
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-main)', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>Bagikan Momen Anda</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Isi detail di bawah untuk mengupload foto</p>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}><User size={14} /> Nama Anda</label>
              <input type="text" name="guestName" required placeholder="Masukkan nama lengkap..." style={{ width: '100%', padding: '16px', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '12px', outline: 'none', fontSize: '16px' }} />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}><Camera size={14} /> Foto Anda</label>
              {filePreview && (
                <div style={{ marginBottom: '12px', position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={filePreview} alt="Preview" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', backgroundColor: 'var(--bg-main)' }} />
                  <button onClick={() => { setFilePreview(''); setFileName(''); setCapturedImage(''); }} style={{ position: 'absolute', top: '8px', right: '8px', width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
                  <p style={{ padding: '8px', fontSize: '12px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-card)', margin: 0, textAlign: 'center' }}>{fileName}</p>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button type="button" onClick={startCamera} style={{ padding: '16px', backgroundColor: 'var(--bg-main)', border: '2px dashed var(--border)', borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Camera size={20} color="var(--bg-card)" /></div>
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>Ambil Foto</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Dari kamera</span>
                </button>
                <label style={{ padding: '16px', backgroundColor: 'var(--bg-main)', border: '2px dashed var(--border)', borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--text-main)', boxSizing: 'border-box' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}><Upload size={20} color="var(--accent)" /></div>
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>Pilih File</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Dari galeri</span>
                  <input type="file" name="file" accept="image/*" required={!filePreview} style={{ display: 'none' }} onChange={(e) => { if (e.target.files && e.target.files[0]) { const file = e.target.files[0]; setFileName(file.name); const reader = new FileReader(); reader.onloadend = () => setFilePreview(reader.result); reader.readAsDataURL(file); window.__cameraFile = null; } }} />
                </label>
              </div>
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}><MessageCircle size={14} /> Pesan (Opsional)</label>
              <textarea name="message" placeholder="Tulis ucapan hangat Anda..." rows="3" style={{ width: '100%', padding: '16px', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '12px', outline: 'none', fontSize: '16px', resize: 'none', fontFamily: 'inherit' }}></textarea>
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '18px', backgroundColor: 'var(--accent-2)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {loading ? 'Mengupload...' : <><Sparkles size={18} /> Kirim Foto</>}
            </button>
          </form>
          {status && (
            <div style={{ marginTop: '24px', padding: '16px', borderRadius: '12px', textAlign: 'center', fontSize: '14px', fontWeight: '600', backgroundColor: statusType === 'success' ? '#dcfce7' : '#fee2e2', color: statusType === 'success' ? '#166534' : '#991b1b', border: '1px solid ' + (statusType === 'success' ? '#bbf7d0' : '#fecaca'), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {statusType === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />} {status}
            </div>
          )}
        </div>

        {showMyGallery && myPhotos.length > 0 && (
          <div ref={myGalleryRef} style={{ marginBottom: '56px' }} className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)', margin: 0, fontFamily: 'var(--font-heading)' }}>Upload Saya <span style={{ color: 'var(--accent)', fontSize: '18px' }}>({myPhotos.length})</span></h2>
              <button onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth' })} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: 'var(--accent-2)', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px' }}><ArrowUp size={14} /> Upload Lagi</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {myPhotos.map((photo) => {
                const sc = getStatusConfig(photo.status); const StatusIcon = sc.icon;
                return (
                  <div key={photo.id} onClick={() => setPreviewPhoto(photo)} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <img src={photo.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', top: '12px', right: '12px', padding: '6px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', backgroundColor: sc.bg, color: sc.color, display: 'flex', alignItems: 'center', gap: '4px' }}><StatusIcon size={12} /> {sc.label}</div>
                    <button onClick={(e) => { e.stopPropagation(); handleRemovePhoto(photo.id); }} style={{ position: 'absolute', top: '12px', left: '12px', width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.9)', color: '#dc2626', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={14} /></button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {communityPhotos.length > 0 && (
          <div className="animate-fade-in">
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ height: '1px', width: '40px', backgroundColor: 'var(--accent)' }}></div>
                <p style={{ color: 'var(--accent)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.2em', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={12} /> Community</p>
                <div style={{ height: '1px', width: '40px', backgroundColor: 'var(--accent)' }}></div>
              </div>
              <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text-main)', margin: '0 0 8px 0', fontFamily: 'var(--font-heading)' }}>Momen Bersama</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 12px 0' }}>{communityPhotos.length} foto dari para tamu</p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', backgroundColor: isRealtimeConnected ? '#dcfce7' : '#fee2e2', borderRadius: '20px', fontSize: '11px', fontWeight: '700', color: isRealtimeConnected ? '#166534' : '#991b1b', fontFamily: 'var(--font-mono)' }}>
                {isRealtimeConnected ? <Wifi size={12} /> : <WifiOff size={12} />} {isRealtimeConnected ? 'LIVE UPDATES' : 'OFFLINE'}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {communityPhotos.map((photo) => {
                const isPending = photo.status === 'pending';
                return (
                  <div key={photo.id} onClick={() => setPreviewPhoto(photo)} style={{ position: 'relative', aspectRatio: '1/1', borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <img src={photo.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: isPending ? 'blur(12px) brightness(0.7)' : 'none' }} />
                    {isPending && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)' }}>
                        <span style={{ backgroundColor: '#eab308', color: '#000', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> MENUNGGU</span>
                      </div>
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '16px', pointerEvents: 'none' }}>
                      <p style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold', margin: 0, fontFamily: 'var(--font-heading)' }}>{photo.guest_name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <footer style={{ textAlign: 'center', marginTop: '64px', paddingTop: '32px', borderTop: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Terima kasih telah menjadi bagian dari kenangan ini</p>
        </footer>

        {previewPhoto && <PreviewModal />}
        {showCamera && <CameraModal />}
      </div>
    </div>
  );

  // === KOMPONEN MODAL KAMERA ===
  function CameraModal() {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)', zIndex: 10 }}>
          <button onClick={stopCamera} style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
          <p style={{ color: '#fff', fontSize: '14px', fontWeight: '600', margin: 0 }}>Ambil Foto</p>
          <button onClick={switchCamera} style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/><path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5"/><circle cx="12" cy="12" r="3"/><path d="m18 22-3-3 3-3"/><path d="m6 2 3 3-3 3"/></svg>
          </button>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />
          {cameraError && (
            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
              <div><AlertCircle size={48} color="#ef4444" style={{ marginBottom: '16px' }} /><p style={{ color: '#fff', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>Oops!</p><p style={{ color: '#d4d4d8', fontSize: '14px' }}>{cameraError}</p>
              <button onClick={stopCamera} style={{ marginTop: '20px', padding: '12px 24px', backgroundColor: '#fff', color: '#000', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Tutup</button></div>
            </div>
          )}
        </div>
        <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
          <button onClick={capturePhoto} disabled={!isCameraReady} style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#fff', border: '4px solid rgba(255,255,255,0.3)', cursor: isCameraReady ? 'pointer' : 'not-allowed', opacity: isCameraReady ? 1 : 0.5 }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#fff', border: '2px solid #000' }}></div>
          </button>
        </div>
      </div>
    );
  }

  // === KOMPONEN MODAL PREVIEW ===
  function PreviewModal() {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(8px)' }} onClick={() => setPreviewPhoto(null)}>
        <div style={{ position: 'relative', maxWidth: '800px', width: '100%', backgroundColor: 'var(--bg-card)', borderRadius: '20px', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()}>
          <img src={previewPhoto.image_url} alt={`Foto dari ${previewPhoto.guest_name || 'tamu'}`} style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain', backgroundColor: '#000', display: 'block' }} />
          <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '24px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-main)', margin: 0, fontFamily: 'var(--font-heading)' }}>{previewPhoto.guest_name}</p>
                {previewPhoto.message && <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', margin: '12px 0 0 0', fontSize: '16px', lineHeight: 1.6 }}>{"“"}{previewPhoto.message}{"”"}</p>}
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={12} /> {new Date(previewPhoto.uploaded_at || previewPhoto.created_at).toLocaleString('id-ID')}</p>
              </div>
              {myPhotos.some(p => p.id === previewPhoto.id) && (
                <button onClick={() => { if(confirm('Hapus foto ini?')) { handleRemovePhoto(previewPhoto.id); setPreviewPhoto(null); } }} style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}><Trash2 size={16} /> Hapus</button>
              )}
            </div>
          </div>
          <button onClick={() => setPreviewPhoto(null)} style={{ position: 'absolute', top: '20px', right: '20px', width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}><X size={20} /></button>
        </div>
      </div>
    );
  }
}