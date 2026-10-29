'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, Clock, XCircle, Shield } from 'lucide-react';

// useSearchParams butuh Suspense boundary saat prerender (build Next.js)
export default function AccessPage(props) {
  return (
    <Suspense fallback={null}>
      <AccessContent {...props} />
    </Suspense>
  );
}

function AccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [eventData, setEventData] = useState(null);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setStatus('error');
        setErrorMessage('Token tidak ditemukan di URL');
        return;
      }

      try {
        const res = await fetch('/api/admin/access?token=' + token);
        const result = await res.json();

        if (result.success) {
          localStorage.setItem('adminLoggedIn', 'true');
          localStorage.setItem('adminIsSuperAdmin', 'false');
          localStorage.setItem('adminEventCode', result.event.code);
          localStorage.setItem('adminEventName', result.event.name);
          
          setEventData(result.event);
          setStatus('success');
          
          setTimeout(() => {
            router.push('/admin');
          }, 2000);
        } else if (result.expired) {
          setStatus('expired');
          setErrorMessage(result.error);
        } else {
          setStatus('error');
          setErrorMessage(result.error);
        }
      } catch (error) {
        setStatus('error');
        setErrorMessage('Terjadi kesalahan sistem');
      }
    };

    validateToken();
  }, [token, router]);

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <>
            <Loader2 size={48} color="var(--accent)" style={{ animation: 'spin 1s linear infinite', marginBottom: '24px' }} />
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px', fontFamily: 'var(--font-heading)' }}>Memvalidasi Link...</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>Mohon tunggu sebentar, kami sedang memeriksa akses Anda.</p>
          </>
        );
      case 'success':
        return (
          <>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              <CheckCircle2 size={40} color="#166534" />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px', fontFamily: 'var(--font-heading)' }}>Akses Diterima!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Selamat datang di dashboard <strong style={{ color: 'var(--accent)' }}>{eventData?.name}</strong>
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Mengalihkan ke dashboard...
            </p>
          </>
        );
      case 'expired':
        return (
          <>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              <Clock size={40} color="#92400e" />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px', fontFamily: 'var(--font-heading)' }}>Link Kadaluarsa</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 16px 0', lineHeight: 1.5 }}>{errorMessage}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0 }}>Hubungi penyelenggara event untuk mendapatkan link baru.</p>
          </>
        );
      case 'error':
      default:
        return (
          <>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
              <XCircle size={40} color="#991b1b" />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '12px', fontFamily: 'var(--font-heading)' }}>Akses Ditolak</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '0 0 16px 0', lineHeight: 1.5 }}>{errorMessage}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0 }}>Link mungkin tidak valid atau sudah tidak aktif.</p>
          </>
        );
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'var(--font-body)' }}>
      {/* Background Pattern */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, opacity: 0.3, pointerEvents: 'none', backgroundImage: 'radial-gradient(var(--accent) 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

      <div style={{ position: 'relative', zIndex: 10, backgroundColor: 'var(--bg-card)', borderRadius: '24px', padding: '48px', maxWidth: '440px', width: '100%', border: '1px solid var(--border)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        
        {/* Icon Header */}
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px', border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <Shield size={32} color="var(--accent)" />
        </div>

        {renderContent()}
      </div>

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}