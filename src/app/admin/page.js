'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
//import ThemeToggle from '@/components/ThemeToggle';
import { supabaseBrowser } from '@/lib/supabaseClient';
import { THEME_LIST, resolveTheme } from '@/lib/themes';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  PlusCircle, Clock, Link2, Palette, QrCode, Copy, 
  CheckCircle2, XCircle, Trash2, RefreshCw, LogOut, 
  Shield, User, Image as ImageIcon, Loader2, 
  Check, X, LayoutGrid, Wifi, WifiOff, CheckSquare, 
  Square, ChevronLeft, ChevronRight, LayoutDashboard, 
  BarChart3, Trophy, Eye, Info, Download, Search
} from 'lucide-react';

function AdminDashboard() {
  const router = useRouter();
  const { theme } = useTheme();
  
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'foto' | 'laporan'
  const [newEventName, setNewEventName] = useState('');
  const [newEventDelay, setNewEventDelay] = useState('60');
  const [newLinkDuration, setNewLinkDuration] = useState('7');
  const [newEventTheme, setNewEventTheme] = useState('elegant');
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newVenue, setNewVenue] = useState('');
  const [createdMagicLink, setCreatedMagicLink] = useState('');
  const [createdEventToken, setCreatedEventToken] = useState('');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [showMagicLinkModal, setShowMagicLinkModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentEventLink, setCurrentEventLink] = useState('');
  const [photos, setPhotos] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, deleted: 0, total: 0 });
  const [globalStats, setGlobalStats] = useState(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [previewPhoto, setPreviewPhoto] = useState(null);
     // Logo HAQ dalam format SVG Data URI (Gradient Biru-Hijau)
  const haqLogoDataUri = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj48c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjM0I4MkY2Ii8+PHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMTBCOTgxIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHJ4PSIyMiIgZmlsbD0idXJsKCNnKSIvPjx0ZXh0IHg9IjUwIiB5PSI2MiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjgiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgbGV0dGVyLXNwYWNpbmc9IjEiPkhBUTwvdGV4dD48L3N2Zz4=";
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [eventSearchQuery, setEventSearchQuery] = useState('');
  const [qrEvent, setQrEvent] = useState(null); // Untuk modal QR per event
  const [rowActionLoading, setRowActionLoading] = useState(null); // Loading state per baris
    // === UNDO ACTION SYSTEM ===
  const [undoAction, setUndoAction] = useState(null);
  const undoTimeoutRef = useRef(null);
  // === TOAST NOTIFICATION SYSTEM ===
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
  const id = Date.now();
  setToasts(prev => [...prev, { id, message, type }]);
  setTimeout(() => {
    setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000); // Hilang otomatis setelah 3 detik
  };
  
  // State untuk Laporan
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const qrRef = useRef(null);
  const realtimeChannelRef = useRef(null);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('adminLoggedIn');
    const isSuper = localStorage.getItem('adminIsSuperAdmin');
    const savedEventCode = localStorage.getItem('adminEventCode');

    if (isLoggedIn !== 'true') { router.push('/admin/login'); return; }
    setIsSuperAdmin(isSuper === 'true');
  }, [router]);

  const loadEvents = async () => {
    try {
      const res = await fetch('/api/admin/events');
      const result = await res.json();
      if (result.data) {
        const isSuper = localStorage.getItem('adminIsSuperAdmin') === 'true';
        const savedCode = localStorage.getItem('adminEventCode');
        if (!isSuper && savedCode) {
          const allowedEvent = result.data.find(e => e.code === savedCode);
          if (allowedEvent) { setEvents([allowedEvent]); setSelectedEvent(allowedEvent); }
        } else {
          setEvents(result.data);
          if (!selectedEvent && result.data.length > 0) setSelectedEvent(result.data[0]);
        }
      }
    } catch (error) { console.error('Error loading events:', error); }
  };

  useEffect(() => { if (localStorage.getItem('adminLoggedIn') === 'true') loadEvents(); }, []);

  const loadInitialPhotos = async () => {
    if (!selectedEvent) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/photos?status=' + filter + '&eventCode=' + selectedEvent.code);
      const result = await res.json();
      if (result.data) setPhotos(result.data);
    } catch (error) { console.error('Error loading photos:', error); }
    finally { setLoading(false); }
  };

    const loadStats = async () => {
    if (!selectedEvent) return;
    try {
      const res = await fetch('/api/admin/report?eventCode=' + selectedEvent.code);
      const result = await res.json();
      if (result.success) {
        setStats({
          pending: result.data.pending,
          approved: result.data.approved,
          rejected: result.data.rejected,
          deleted: result.data.deleted,
          total: result.data.totalPhotos
        });
      }
    } catch (error) { 
      console.error('Error loading stats:', error); 
    }
  };
      // Fungsi khusus untuk load Global Stats (bisa dipanggil kapan saja)
  const loadGlobalStats = async () => {
    if (!isSuperAdmin) return;
    try {
      const res = await fetch('/api/admin/report');
      const result = await res.json();
      if (result.success) {
        setGlobalStats(result.data);
      }
    } catch (error) {
      console.error('Error loading global stats:', error);
    }
  };

  // Panggil saat Super Admin login atau pindah tab
  useEffect(() => {
    if (isSuperAdmin) {
      loadGlobalStats();
    }
  }, [isSuperAdmin, activeTab]);

  // Load Data Laporan
  useEffect(() => {
    if (activeTab === 'laporan' && selectedEvent) {
      setReportLoading(true);
      fetch(`/api/admin/report?eventCode=${selectedEvent.code}`)
        .then(res => res.json())
        .then(result => { if (result.success) setReportData(result.data); })
        .finally(() => setReportLoading(false));
    }
  }, [activeTab, selectedEvent]);

  useEffect(() => {
    if (!selectedEvent) return;
    loadInitialPhotos(); loadStats();

    const channel = supabaseBrowser.channel('admin-photos-' + selectedEvent.code)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'photos', filter: 'event_code=eq.' + selectedEvent.code }, (payload) => {
        loadStats();
        // Refresh laporan juga jika ada perubahan
        if (activeTab === 'laporan') {
           fetch(`/api/admin/report?eventCode=${selectedEvent.code}`)
            .then(res => res.json())
            .then(result => { if (result.success) setReportData(result.data); });
        }
        if (payload.eventType === 'INSERT') {
          const newPhoto = payload.new;
          if (filter === 'all' || newPhoto.status === filter) setPhotos(prev => [newPhoto, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          const updatedPhoto = payload.new;
          setPhotos(prev => {
            if (filter !== 'all' && updatedPhoto.status !== filter) return prev.filter(p => p.id !== updatedPhoto.id);
            return prev.map(p => p.id === updatedPhoto.id ? updatedPhoto : p);
          });
        } else if (payload.eventType === 'DELETE') {
          setPhotos(prev => prev.filter(p => p.id !== payload.old.id));
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setIsRealtimeConnected(true);
        else if (status === 'CHANNEL_ERROR') setIsRealtimeConnected(false);
      });

    realtimeChannelRef.current = channel;
    return () => { supabaseBrowser.removeChannel(channel); };
  }, [selectedEvent, filter, activeTab]);

  useEffect(() => { if (selectedEvent && isRealtimeConnected && activeTab === 'foto') loadInitialPhotos(); }, [filter, activeTab]);

  const toggleSelectPhoto = (id) => setSelectedPhotos(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  const selectAllPhotos = () => setSelectedPhotos(selectedPhotos.length === photos.length ? [] : photos.map(p => p.id));

    const handleBulkAction = async (newStatus) => {
    if (selectedPhotos.length === 0) return;
    try {
      await Promise.all(selectedPhotos.map(id => fetch('/api/admin/photos', { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ photoId: id, newStatus }) 
      })));
      
      const actionText = newStatus === 'approved' ? 'disetujui' : 'ditolak';
      showToast(`${selectedPhotos.length} foto berhasil ${actionText}!`, 'success'); // ✅ Toast Sukses
      setSelectedPhotos([]);
    } catch (error) {
      showToast('Gagal melakukan aksi massal', 'error'); // ✅ Toast Error (Pengganti alert)
    }
  };

        const handleStatusChange = async (photoId, newStatus) => {
    const photo = photos.find(p => p.id === photoId);
    const previousStatus = photo?.status || 'pending';

    try { 
      await fetch('/api/admin/photos', { 
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ photoId, newStatus }) 
      });
      
      const actionText = newStatus === 'approved' ? 'disetujui' : 'ditolak';
      showToast(`Foto berhasil ${actionText}`, 'success');
      
      // Setup Undo
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      setUndoAction({ type: 'status', photoId, previousStatus });
      undoTimeoutRef.current = setTimeout(() => setUndoAction(null), 4000);
      
      // Reload data setelah 500ms (biar realtime sempat update)
      setTimeout(() => {
        loadInitialPhotos();
        loadStats();
      }, 500);
    } catch (error) { 
      showToast('Terjadi kesalahan sistem', 'error');
    }
  };

  const handleDelete = async (photoId) => {
    if (!confirm('Yakin mau hapus foto ini secara permanen?')) return; 
    
    const photo = photos.find(p => p.id === photoId);
    
    try { 
      await fetch('/api/admin/photos', { 
        method: 'DELETE', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ photoId }) 
      });
      showToast('Foto berhasil dihapus', 'success');
      
      // Setup Undo untuk delete
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      setUndoAction({ type: 'delete', photoId, previousStatus: photo?.status || 'pending', deletedPhoto: photo });
      undoTimeoutRef.current = setTimeout(() => setUndoAction(null), 4000);
      
      // Reload data
      setTimeout(() => {
        loadInitialPhotos();
        loadStats();
      }, 500);
    } catch (error) { 
      showToast('Terjadi kesalahan sistem', 'error');
    }
  };
      const performUndo = () => {
    if (!undoAction) return;
    
    // Hapus timeout yang berjalan
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
      undoTimeoutRef.current = null;
    }

    const { type, photoId, previousStatus, deletedPhoto } = undoAction;

    if (type === 'delete' && deletedPhoto) {
      // Untuk undo delete, kita insert ulang foto ke database
      // Kita pakai endpoint /api/upload dengan data yang sudah ada
      const formData = new FormData();
      formData.append('eventCode', selectedEvent.code);
      formData.append('guestName', deletedPhoto.guest_name);
      formData.append('message', deletedPhoto.message || '');
      formData.append('imageUrl', deletedPhoto.image_url); // Kirim URL, bukan file
      formData.append('status', previousStatus);

      fetch('/api/admin/photos/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventCode: selectedEvent.code,
          guestName: deletedPhoto.guest_name,
          message: deletedPhoto.message,
          imageUrl: deletedPhoto.image_url,
          status: previousStatus
        })
      })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          showToast('Foto berhasil dikembalikan', 'success');
          loadInitialPhotos();
          loadStats();
        } else {
          showToast('Gagal mengembalikan foto', 'error');
        }
      })
      .catch(() => showToast('Gagal mengembalikan foto', 'error'));
    } else {
      // Untuk undo status change (approve/reject)
      fetch('/api/admin/photos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId, newStatus: previousStatus })
      })
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          showToast('Aksi berhasil dibatalkan', 'success');
          loadInitialPhotos(); // Reload photos
          loadStats(); // Reload stats
        } else {
          showToast('Gagal membatalkan aksi', 'error');
        }
      })
      .catch(() => showToast('Gagal membatalkan aksi', 'error'));
    }

    setUndoAction(null);
  };

  const handleLogout = async () => {
    localStorage.removeItem('adminLoggedIn'); localStorage.removeItem('adminIsSuperAdmin');
    localStorage.removeItem('adminEventCode'); localStorage.removeItem('adminEventName');
    // Hapus sesi httpOnly cookie di server
    try { await fetch('/api/admin/logout', { method: 'POST' }); } catch (e) { /* abaikan */ }
    router.push('/admin/login');
  };

  const getBaseUrl = () => typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const downloadQR = () => {
    if (!selectedEvent || !qrRef.current) return;
    const canvas = qrRef.current.querySelector('canvas');
    const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
    let downloadLink = document.createElement('a'); downloadLink.href = pngUrl; downloadLink.download = 'qr-' + selectedEvent.code + '.png';
    document.body.appendChild(downloadLink); downloadLink.click(); document.body.removeChild(downloadLink);
  };

  const handleCopyMagicLink = (eventCode, token) => {
    const link = getBaseUrl() + '/admin/access?token=' + token;
    setCurrentEventLink(link); setShowMagicLinkModal(true); navigator.clipboard.writeText(link);
  };

       const handleExport = async (eventCode) => {
    if (!eventCode) return;
    setRowActionLoading(eventCode);
    showToast('Sedang menyiapkan file ZIP...', 'info');
    
    try {
      const res = await fetch(`/api/admin/export?eventCode=${eventCode}`);
      if (!res.ok) throw new Error('Gagal export');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HAQ-Photowall-${eventCode}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showToast('File ZIP berhasil diunduh!', 'success');
    } catch (error) {
      showToast('Gagal mengunduh file ZIP', 'error');
    } finally {
      setRowActionLoading(null);
    }
  };

      const handleDeleteEvent = async (eventToDelete) => {
    if (!eventToDelete) return;
    try {
      const res = await fetch('/api/admin/events/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventCode: eventToDelete.code })
      });
      
      if (res.ok) {
        showToast(`Event "${eventToDelete.name}" berhasil dihapus`, 'success');
        setShowDeleteModal(false);
        setSelectedEvent(null);
        await loadEvents();
        setGlobalStats(null);
        setTimeout(() => loadGlobalStats(), 300);
      } else {
        const result = await res.json();
        showToast('Gagal menghapus event: ' + (result.error || ''), 'error');
      }
    } catch (error) {
      showToast('Terjadi kesalahan sistem', 'error');
    }
  };

  const handleThemeChange = async (eventCode, newTheme) => {
    setRowActionLoading(eventCode);
    try {
      const res = await fetch('/api/admin/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: eventCode, theme: newTheme })
      });
      const result = await res.json();
      if (result.success) {
        // Sinkronkan state lokal agar UI langsung update
        setEvents((prev) => prev.map((ev) => (ev.code === eventCode ? { ...ev, theme: newTheme } : ev)));
        setSelectedEvent((prev) => (prev && prev.code === eventCode ? { ...prev, theme: newTheme } : prev));
        localStorage.removeItem('theme_' + eventCode); // Visitor akan ambil tema baru saat reload
        showToast(`Tema event diubah menjadi ${newTheme}`, 'success');
      } else {
        showToast('Gagal mengubah tema: ' + (result.error || ''), 'error');
      }
    } catch (error) {
      showToast('Terjadi kesalahan sistem', 'error');
    } finally {
      setRowActionLoading(null);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
  if (!newEventName.trim()) {
    showToast('Nama event tidak boleh kosong!', 'error');
    return;
  }
  
  setIsCreatingEvent(true); 
  setCreatedMagicLink('');
  setCreatedEventToken('');
  
  try {
    const res = await fetch('/api/admin/events', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ 
        name: newEventName, 
        autoApproveDelay: newEventDelay, 
        magicLinkDuration: newLinkDuration, 
        theme: newEventTheme,
        client_name: newClientName,
        client_email: newClientEmail,
        client_phone: newClientPhone,
        event_date: newEventDate || null,
        venue: newVenue,
        max_uploads: 1000
      }) 
    });
    const result = await res.json();
    
    if (result.success) {
      setCreatedEventToken(result.data.magic_link_token);
      setCreatedMagicLink(getBaseUrl() + '/admin/access?token=' + result.data.magic_link_token);
      showToast('Event berhasil dibuat!', 'success');
      // Reset form
      setNewEventName('');
      setNewClientName('');
      setNewClientEmail('');
      setNewClientPhone('');
      setNewEventDate('');
      setNewVenue('');
      await loadEvents();
      setGlobalStats(null);
      setTimeout(() => loadGlobalStats(), 300); 
      setSelectedEvent(result.data);
    } else { 
      showToast('Gagal membuat event: ' + result.error, 'error'); 
    }
  } catch (error) { 
    showToast('Terjadi kesalahan sistem', 'error'); 
  } finally { 
    setIsCreatingEvent(false); 
  }
};

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (previewPhoto) {
        if (e.key === 'a' || e.key === 'A') { handleStatusChange(previewPhoto.id, 'approved'); setPreviewPhoto({ ...previewPhoto, status: 'approved' }); } 
        else if (e.key === 'r' || e.key === 'R') { handleStatusChange(previewPhoto.id, 'rejected'); setPreviewPhoto({ ...previewPhoto, status: 'rejected' }); } 
        else if (e.key === 'ArrowRight') { const idx = photos.findIndex(p => p.id === previewPhoto.id); if (idx < photos.length - 1) setPreviewPhoto(photos[idx + 1]); } 
        else if (e.key === 'ArrowLeft') { const idx = photos.findIndex(p => p.id === previewPhoto.id); if (idx > 0) setPreviewPhoto(photos[idx - 1]); } 
        else if (e.key === 'Escape') setPreviewPhoto(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewPhoto, photos]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'foto', label: 'Moderasi Foto', icon: ImageIcon },
    { id: 'laporan', label: 'Laporan Event', icon: BarChart3 },
  ];

  const COLORS = ['#22c55e', '#eab308', '#dc2626'];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', fontFamily: 'var(--font-body)' }}>
      
      {/* === SIDEBAR === */}
      <aside style={{ width: '260px', backgroundColor: 'var(--bg-card)', borderRight: '1px solid var(--border)', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', display: 'flex', flexDirection: 'column', position: 'fixed', height: '100vh', zIndex: 20 }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #3B82F6 0%, #10B981 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>
        <span style={{ color: '#fff', fontSize: '14px', fontWeight: '900', letterSpacing: '-0,5px' }}>HAQ</span>
        </div>
        <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '18px', fontWeight: '800', background: 'linear-gradient(135deg, #3B82F6 0%, #10B981 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '1px' }}>HAQ</span>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
        {isSuperAdmin ? 'Super Admin' : 'Event Admin'}
                </p>
            </div>
        </div>

        <nav style={{ flex: 1, padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
          <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 12px', marginBottom: '8px' }}>Menu Utama</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)} style={{
                width: '100%', padding: '12px 16px', backgroundColor: isActive ? 'var(--bg-main)' : 'transparent',
                color: isActive ? 'var(--text-main)' : 'var(--text-muted)', border: 'none', borderRadius: '10px',
                cursor: 'pointer', fontWeight: isActive ? '700' : '500', fontSize: '14px',
                display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s', textAlign: 'left'
              }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-main)'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <Icon size={18} /> {item.label}
                {item.id === 'foto' && stats.pending > 0 && (
                  <span style={{ marginLeft: 'auto', backgroundColor: '#eab308', color: '#000', fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '12px' }}>{stats.pending}</span>
                )}
              </button>
            );
          })}
        </nav>

                {/* Footer Sidebar yang Rapi */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'var(--bg-card)' }}>
          
          {/* Status Indicator (Glowing Dot) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: '700', color: isRealtimeConnected ? '#10b981' : '#ef4444', fontFamily: 'var(--font-mono)', paddingLeft: '4px' }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: isRealtimeConnected ? '#10b981' : '#ef4444',
              boxShadow: isRealtimeConnected ? '0 0 8px #10b981' : 'none'
            }}></div>
            {isRealtimeConnected ? 'SYSTEM ONLINE' : 'OFFLINE'}
          </div>

          {/* Tombol Logout */}
          <button 
            onClick={handleLogout} 
            style={{ 
              width: '100%',
              backgroundColor: 'transparent', 
              color: '#dc2626', 
              padding: '10px', 
              borderRadius: '10px', 
              border: '1px solid var(--border)',
              cursor: 'pointer', 
              fontWeight: '600', 
              fontSize: '13px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>

      {/* === MAIN CONTENT === */}
      <main style={{ flex: 1, marginLeft: '260px', padding: '32px 40px', maxWidth: '1400px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
  <div>
    <h2 style={{ fontSize: '24px', fontWeight: '800', margin: 0, fontFamily: 'var(--font-heading)' }}>
      {activeTab === 'dashboard' ? 'Dashboard & Pengaturan' : activeTab === 'foto' ? 'Moderasi Foto' : 'Laporan & Analitik'}
    </h2>
    {/* Tampilkan subtitle nama event HANYA jika bukan di dashboard */}
    {activeTab !== 'dashboard' && selectedEvent && (
      <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '14px' }}>
        {selectedEvent.name}
      </p>
    )}
  </div>

  {/* Tampilkan Dropdown & Hapus HANYA jika bukan di dashboard */}
  {selectedEvent && activeTab !== 'dashboard' && (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <select value={selectedEvent.code} onChange={(e) => { const ev = events.find(ev => ev.code === e.target.value); setSelectedEvent(ev); }} 
        style={{ padding: '10px 16px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-main)', fontSize: '14px', outline: 'none', minWidth: '200px' }}>
        {events.map(ev => (<option key={ev.code} value={ev.code}>{ev.name}</option>))}
      </select>
      
      {isSuperAdmin && (
        <button 
          onClick={() => setShowDeleteModal(true)}
          style={{ padding: '10px 16px', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Trash2 size={16} /> Hapus Event
        </button>
      )}
    </div>
  )}
</div>

        {selectedEvent ? (
          <>
            {/* === TAB: DASHBOARD (REDESIGN) === */}
            {activeTab === 'dashboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* 1. Stats Cards (Global untuk Super Admin) */}
                {isSuperAdmin && globalStats ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px' }}>
                    <StatCard icon={<LayoutDashboard size={24} />} label="Total Event" value={globalStats.totalEvents} color="#3b82f6" />
                    <StatCard icon={<ImageIcon size={24} />} label="Total Upload" value={globalStats.totalPhotos} color="#8b5cf6" />
                    <StatCard icon={<Clock size={24} />} label="Menunggu Review" value={globalStats.pending} color="#eab308" />
                    <StatCard icon={<CheckCircle2 size={24} />} label="Tayang di Layar" value={globalStats.approved} color="#22c55e" />
                    <StatCard icon={<XCircle size={24} />} label="Ditolak" value={globalStats.rejected} color="#dc2626" />
                    <StatCard icon={<Trash2 size={24} />} label="Dihapus" value={globalStats.deleted} color="#64748b" />
                  </div>
                ) : !isSuperAdmin && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                    <StatCard icon={<Clock size={24} />} label="Menunggu Review" value={stats.pending} color="#eab308" />
                    <StatCard icon={<CheckCircle2 size={24} />} label="Tayang di Layar" value={stats.approved} color="#22c55e" />
                    <StatCard icon={<XCircle size={24} />} label="Ditolak" value={stats.rejected} color="#dc2626" />
                    <StatCard icon={<Trash2 size={24} />} label="Dihapus" value={stats.deleted} color="#64748b" />
                  </div>
                )}

                {/* 2. Tabel Portofolio Event (Full Width + Search) */}
                {isSuperAdmin && (
                  <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                    
                    {/* Header Tabel */}
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <LayoutGrid size={20} color="var(--accent)" /> Portofolio Event
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Kelola semua event Anda dalam satu tampilan</p>
                      </div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {/* Search Bar */}
                        <div style={{ position: 'relative' }}>
                          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                          <input 
                            type="text" 
                            value={eventSearchQuery}
                            onChange={(e) => setEventSearchQuery(e.target.value)}
                            placeholder="Cari event atau klien..."
                            style={{ padding: '10px 12px 10px 36px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-main)', fontSize: '14px', outline: 'none', width: '240px' }}
                          />
                        </div>
                        {/* Tombol Buat Event */}
                        <button 
                          onClick={() => setShowCreateModal(true)}
                          style={{ padding: '10px 20px', backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
                        >
                          <PlusCircle size={16} /> Buat Event
                        </button>
                      </div>
                    </div>

                    {/* Body Tabel */}
                    {(() => {
                      const filteredEvents = events.filter(ev => 
                        ev.name.toLowerCase().includes(eventSearchQuery.toLowerCase()) || 
                        ev.client_name?.toLowerCase().includes(eventSearchQuery.toLowerCase())
                      );

                      if (filteredEvents.length === 0) {
                        return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}><p>Tidak ada event yang cocok dengan pencarian.</p></div>;
                      }

                      return (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                              <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '14px 24px', textAlign: 'left', fontWeight: '700', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>Nama Event</th>
                                <th style={{ padding: '14px 24px', textAlign: 'left', fontWeight: '700', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>Klien</th>
                                <th style={{ padding: '14px 24px', textAlign: 'left', fontWeight: '700', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>Tanggal</th>
                                <th style={{ padding: '14px 24px', textAlign: 'left', fontWeight: '700', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>Status</th>
                                <th style={{ padding: '14px 24px', textAlign: 'left', fontWeight: '700', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>Tema</th>
                                <th style={{ padding: '14px 24px', textAlign: 'right', fontWeight: '700', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase' }}>Aksi Cepat</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredEvents.map((ev) => (
                                <tr key={ev.code} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-main)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                  <td style={{ padding: '16px 24px', fontWeight: '700', color: 'var(--text-main)' }}>
                                    {ev.name}
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: '4px' }}>{ev.code}</div>
                                  </td>
                                  <td style={{ padding: '16px 24px', color: 'var(--text-muted)' }}>
                                    {ev.client_name || <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Belum diisi</span>}
                                  </td>
                                  <td style={{ padding: '16px 24px', color: 'var(--text-muted)' }}>
                                    {ev.event_date ? new Date(ev.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                  </td>
                                  <td style={{ padding: '16px 24px' }}>
                                    <span style={{
                                      padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', textTransform: 'capitalize',
                                      backgroundColor: ev.status === 'active' ? '#dcfce7' : ev.status === 'completed' ? '#dbeafe' : '#f3f4f6',
                                      color: ev.status === 'active' ? '#166534' : ev.status === 'completed' ? '#1e40af' : '#4b5563'
                                    }}>
                                      {ev.status || 'upcoming'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '16px 24px' }}>
                                    <select
                                      value={resolveTheme(ev.theme)}
                                      onChange={(e) => handleThemeChange(ev.code, e.target.value)}
                                      disabled={rowActionLoading === ev.code}
                                      title="Ganti tema halaman event"
                                      style={{ padding: '8px 10px', backgroundColor: '#f3f4f6', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', outline: 'none', opacity: rowActionLoading === ev.code ? 0.6 : 1 }}
                                    >
                                      {THEME_LIST.map((t) => (
                                        <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                      <button 
                                        onClick={() => setQrEvent(ev)}
                                        style={{ padding: '8px 12px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        title="Lihat QR Code"
                                      >
                                        <QrCode size={14} /> QR
                                      </button>
                                      <button 
                                        onClick={() => handleExport(ev.code)}
                                        disabled={rowActionLoading === ev.code}
                                        style={{ padding: '8px 12px', backgroundColor: '#dbeafe', color: '#1e40af', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', opacity: rowActionLoading === ev.code ? 0.6 : 1 }}
                                        title="Export ZIP"
                                      >
                                        {rowActionLoading === ev.code ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} />} 
                                        {rowActionLoading === ev.code ? 'Proses' : 'Export'}
                                      </button>
                                      <button 
                                        onClick={() => { setSelectedEvent(ev); setShowDeleteModal(true); }}
                                        style={{ padding: '8px 12px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        title="Hapus Event"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* === TAB: MODERASI FOTO === */}
            {activeTab === 'foto' && (
  <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)' }}>
    {/* Header dengan Search & Filter */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
        
        {/* Search Bar */}
        <div style={{ position: 'relative', minWidth: '220px' }}>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama tamu..."
            style={{ 
              width: '100%', padding: '8px 12px 8px 36px', 
              backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', 
              borderRadius: '8px', color: 'var(--text-main)', fontSize: '13px', outline: 'none',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
          />
          <svg 
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', display: 'flex' }}
            >
              <X size="14" />
            </button>
          )}
        </div>

        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border)', margin: '0 8px' }}></div>

        <button onClick={selectAllPhotos} style={{ padding: '8px 16px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {selectedPhotos.length === photos.length && photos.length > 0 ? <CheckSquare size={14} /> : <Square size={14} />}
          {selectedPhotos.length === photos.length && photos.length > 0 ? 'Batal' : 'Pilih Semua'}
        </button>
        
        {['pending', 'approved', 'rejected', 'all'].map((val) => (
          <button key={val} onClick={() => setFilter(val)} style={{ 
            padding: '8px 16px', 
            backgroundColor: filter === val ? 'var(--accent)' : 'var(--bg-main)', 
            color: filter === val ? 'var(--bg-card)' : 'var(--text-muted)', 
            border: '1px solid var(--border)', 
            borderRadius: '8px', 
            cursor: 'pointer', 
            fontWeight: '600', 
            fontSize: '13px', 
            textTransform: 'capitalize',
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px' 
          }}>
            {val}
            {val === 'pending' && stats.pending > 0 && (
              <span style={{ backgroundColor: '#eab308', color: '#000', fontSize: '11px', fontWeight: '800', padding: '2px 6px', borderRadius: '10px', minWidth: '18px', textAlign: 'center' }}>
                {stats.pending}
              </span>
            )}
          </button>
        ))}
      </div>
      <button onClick={loadInitialPhotos} style={{ padding: '8px 16px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <RefreshCw size={14} /> Refresh
      </button>
    </div>

    {/* Loading State */}
    {loading ? (
      <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    ) : (
      /* Filter Photos Logic */
      <div>
        {(() => {
          const filteredPhotos = photos.filter(photo => {
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            const name = photo.guest_name?.toLowerCase() || '';
            const message = photo.message?.toLowerCase() || '';
            return name.includes(query) || message.includes(query);
          });

          if (filteredPhotos.length === 0) {
            return (
              <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)' }}>
                <ImageIcon size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                <p>{searchQuery ? `Tidak ada foto yang cocok dengan "${searchQuery}"` : 'Tidak ada foto ditemukan'}</p>
              </div>
            );
          }

          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
              {filteredPhotos.map((photo) => (
                <div key={photo.id} style={{ border: selectedPhotos.includes(photo.id) ? '2px solid var(--accent)' : '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', backgroundColor: 'var(--bg-main)', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 10 }}>
                    <button onClick={(e) => { e.stopPropagation(); toggleSelectPhoto(photo.id); }} style={{ width: '24px', height: '24px', borderRadius: '6px', backgroundColor: selectedPhotos.includes(photo.id) ? 'var(--accent)' : 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {selectedPhotos.includes(photo.id) ? <Check size={14} color="var(--bg-card)" /> : <Square size={14} color="#000" />}
                    </button>
                  </div>
                  <div style={{ height: '160px', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setPreviewPhoto(photo)}>
                    <img src={photo.image_url} alt={`Foto dari ${photo.guest_name || 'tamu'}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: '12px' }}>
                    <p style={{ fontWeight: '700', margin: '0 0 4px 0', fontSize: '14px' }}>{photo.guest_name}</p>
                    {photo.message && <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px 0', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{"“"}{photo.message}{"”"}</p>}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {photo.status !== 'approved' && <button onClick={() => handleStatusChange(photo.id, 'approved')} style={{ flex: 1, padding: '8px', backgroundColor: '#dcfce7', color: '#166534', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>Approve</button>}
                      {photo.status !== 'rejected' && <button onClick={() => handleStatusChange(photo.id, 'rejected')} style={{ flex: 1, padding: '8px', backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>Reject</button>}
                      <button onClick={() => handleDelete(photo.id)} style={{ padding: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer' }}><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    )}
  </div>
)}

            {/* === TAB: LAPORAN === */}
            {activeTab === 'laporan' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {reportLoading ? (
                  <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                ) : reportData ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                      <StatCard icon={<User size={22} />} label="Tamu Unik" value={reportData.uniqueGuests} color="#3b82f6" />
                      <StatCard icon={<ImageIcon size={22} />} label="Total Foto" value={reportData.total} color="#8b5cf6" />
                      <StatCard icon={<CheckCircle2 size={22} />} label="Approved" value={reportData.approved} color="#22c55e" />
                      <StatCard icon={<Clock size={22} />} label="Pending" value={reportData.pending} color="#eab308" />
                      <StatCard icon={<XCircle size={22} />} label="Rejected" value={reportData.rejected} color="#dc2626" />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                      <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', margin: '0 0 20px 0' }}>Distribusi Status Foto</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie data={[
                              { name: 'Approved', value: reportData.approved },
                              { name: 'Pending', value: reportData.pending },
                              { name: 'Rejected', value: reportData.rejected },
                            ]} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                              {[
                                { name: 'Approved', value: reportData.approved },
                                { name: 'Pending', value: reportData.pending },
                                { name: 'Rejected', value: reportData.rejected },
                              ].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {reportData.topContributors.length > 0 && (
                        <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Trophy size={18} color="#eab308" /> Top 5 Kontributor
                          </h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={reportData.topContributors} layout="vertical">
                              <XAxis type="number" />
                              <YAxis type="category" dataKey="name" width={100} style={{ fontSize: '12px' }} />
                              <Tooltip />
                              <Bar dataKey="count" fill="#8b5cf6" radius={[0, 10, 10, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    <BarChart3 size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                    <p>Tidak ada data laporan untuk event ini.</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '64px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border)' }}>
            <ImageIcon size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <p style={{ fontSize: '18px', fontWeight: '600' }}>Silakan pilih atau buat event baru di Sidebar</p>
          </div>
        )}
      </main>

      {/* Floating Action Bar (Bulk Actions) */}
      {selectedPhotos.length > 0 && activeTab === 'foto' && (
        <div style={{ position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', zIndex: 50 }}>
          <span style={{ fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckSquare size={18} color="var(--accent)" /> {selectedPhotos.length} Dipilih</span>
          <button onClick={() => handleBulkAction('approved')} style={{ padding: '8px 16px', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>Approve</button>
          <button onClick={() => handleBulkAction('rejected')} style={{ padding: '8px 16px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>Reject</button>
          <button onClick={() => setSelectedPhotos([])} style={{ padding: '8px', backgroundColor: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      {/* Preview Modal */}
            {/* Preview Modal dengan Simulasi Layar Besar */}
      {previewPhoto && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }} onClick={() => setPreviewPhoto(null)}>
          
          {/* Container Simulasi Layar */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '900px', aspectRatio: '16/9', backgroundColor: '#000', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
            
            {/* Gambar Utama */}
            <img src={previewPhoto.image_url} alt={`Foto dari ${previewPhoto.guest_name || 'tamu'}`} style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }} />
            
            {/* Overlay Bawah (Simulasi Tampilan Display Page) */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '40px', background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)', pointerEvents: 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <p style={{ fontSize: '32px', fontWeight: '800', margin: 0, color: '#fff', fontFamily: 'var(--font-heading)', textShadow: '0 2px 4px rgba(0,0,0,0.8)', lineHeight: 1.1 }}>
                  {previewPhoto.guest_name}
                </p>
                {previewPhoto.message && (
                  <p style={{ fontSize: '20px', color: '#e4e4e7', margin: 0, fontStyle: 'italic', textShadow: '0 2px 4px rgba(0,0,0,0.8)', lineHeight: 1.4, maxWidth: '800px' }}>
                    {"“"}{previewPhoto.message}{"”"}
                  </p>
                )}
              </div>
            </div>

            {/* Badge Status di Pojok Kanan Atas */}
            <div style={{ position: 'absolute', top: '20px', right: '20px', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: '800', backgroundColor: previewPhoto.status === 'approved' ? '#22c55e' : previewPhoto.status === 'rejected' ? '#dc2626' : '#eab308', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
              {previewPhoto.status === 'approved' && <CheckCircle2 size={14} />}
              {previewPhoto.status === 'rejected' && <XCircle size={14} />}
              {previewPhoto.status === 'pending' && <Clock size={14} />}
              {previewPhoto.status}
            </div>

            {/* Badge "Preview Mode" di Pojok Kiri Atas */}
            <div style={{ position: 'absolute', top: '20px', left: '20px', padding: '8px 16px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Eye size={12} /> SIMULASI LAYAR
            </div>

            {/* Tombol Aksi Admin (Floating di Bawah) */}
            <div style={{ position: 'absolute', bottom: '20px', right: '20px', display: 'flex', gap: '12px', pointerEvents: 'auto' }}>
              {previewPhoto.status !== 'approved' && (
                <button onClick={() => { handleStatusChange(previewPhoto.id, 'approved'); setPreviewPhoto({ ...previewPhoto, status: 'approved' }); }} style={{ padding: '12px 24px', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                  <CheckCircle2 size={16} /> Approve
                </button>
              )}
              {previewPhoto.status !== 'rejected' && (
                <button onClick={() => { handleStatusChange(previewPhoto.id, 'rejected'); setPreviewPhoto({ ...previewPhoto, status: 'rejected' }); }} style={{ padding: '12px 24px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                  <XCircle size={16} /> Reject
                </button>
              )}
            </div>

            {/* Tombol Navigasi & Close */}
            <button onClick={() => setPreviewPhoto(null)} style={{ position: 'absolute', top: '20px', right: '50%', transform: 'translateX(50%)', width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}><X size={18} /></button>
            <button onClick={() => { const idx = photos.findIndex(p => p.id === previewPhoto.id); if (idx > 0) setPreviewPhoto(photos[idx - 1]); }} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}><ChevronLeft size={20} /></button>
            <button onClick={() => { const idx = photos.findIndex(p => p.id === previewPhoto.id); if (idx < photos.length - 1) setPreviewPhoto(photos[idx + 1]); }} style={{ position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)', width: '44px', height: '44px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}><ChevronRight size={20} /></button>
            
            {/* Info Keyboard Shortcut (Kecil di Bawah) */}
            <div style={{ position: 'absolute', bottom: '20px', left: '20px', fontSize: '11px', color: 'rgba(255,255,255,0.6)', display: 'flex', gap: '12px', pointerEvents: 'none' }}>
              <span>️ <b>A</b> Approve</span>
              <span><b>R</b> Reject</span>
              <span><b>← →</b> Navigasi</span>
            </div>
          </div>
        </div>
      )}

      {showMagicLinkModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }} onClick={() => setShowMagicLinkModal(false)}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '24px', maxWidth: '400px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0' }}>Magic Link Admin</h3>
            <input type="text" value={currentEventLink} readOnly style={{ width: '100%', padding: '12px', marginBottom: '16px', borderRadius: '8px', border: '1px solid var(--border)', boxSizing: 'border-box' }} />
            <button onClick={() => { navigator.clipboard.writeText(currentEventLink); showToast('Disalin!'); }} style={{ width: '100%', padding: '12px', backgroundColor: 'var(--accent)', color: 'var(--bg-card)', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>Salin Link</button>
          </div>
        </div>
      )}

            {/* === UNDO SNACKBAR === */}
      {undoAction && (
        <div style={{ 
          position: 'fixed', 
          bottom: '24px', 
          left: '50%', 
          transform: 'translateX(-50%)',
          zIndex: 10001,
          backgroundColor: '#1E293B',
          color: '#fff',
          padding: '14px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontSize: '14px',
          fontWeight: '600',
          animation: 'slideUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <span>Aksi berhasil dilakukan.</span>
          <button 
            onClick={performUndo}
            style={{ 
              backgroundColor: 'transparent', 
              color: '#3B82F6', 
              border: 'none', 
              padding: '6px 12px', 
              borderRadius: '6px',
              cursor: 'pointer', 
              fontWeight: '700',
              fontSize: '14px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Undo
          </button>
        </div>
      )}

            {/* === MODAL HAPUS EVENT === */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' }} onClick={() => setShowDeleteModal(false)}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '32px', maxWidth: '450px', width: '100%', border: '1px solid var(--border)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={20} color="#dc2626" />
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>Hapus Event Permanen?</h3>
            </div>
            
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
              Anda akan menghapus event <b style={{ color: 'var(--text-main)' }}>{"“"}{selectedEvent?.name}{"”"}</b> beserta <b style={{ color: '#dc2626' }}>SEMUA foto dan data tamu</b> di dalamnya. 
              <br/><br/>
              Tindakan ini <b>tidak dapat dibatalkan (Undo)</b>.
            </p>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowDeleteModal(false)} style={{ flex: 1, padding: '12px', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--border)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-main)'}
              >
                Batal
              </button>
              <button onClick={handleDeleteEvent} style={{ flex: 1, padding: '12px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
              >
                <Trash2 size={16} /> Ya, Hapus!
              </button>
            </div>
          </div>
        </div>
      )}
            {/* === MODAL BUAT EVENT BARU === */}
            {/* === MODAL BUAT EVENT BARU === */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' }} onClick={() => { setShowCreateModal(false); setCreatedMagicLink(''); setCreatedEventToken(''); }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '32px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()}>
            
            {/* Header Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={20} color="var(--accent)" /> Buat Event Baru
              </h3>
              <button onClick={() => { setShowCreateModal(false); setCreatedMagicLink(''); setCreatedEventToken(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
            </div>
            
            {/* CONDITIONAL: Tampilkan Form ATAU Success Card */}
            {!createdMagicLink ? (
              /* === FORM BUAT EVENT === */
              <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input type="text" value={newEventName} onChange={(e) => setNewEventName(e.target.value)} placeholder="Nama Event (wajib)..." required style={{ width: '100%', padding: '12px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <input type="text" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Nama Klien" style={{ padding: '12px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-main)', outline: 'none' }} />
                  <input type="email" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} placeholder="Email Klien" style={{ padding: '12px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-main)', outline: 'none' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <input type="tel" value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} placeholder="No. WhatsApp" style={{ padding: '12px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-main)', outline: 'none' }} />
                  <input type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} style={{ padding: '12px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-main)', outline: 'none' }} />
                </div>
                <input type="text" value={newVenue} onChange={(e) => setNewVenue(e.target.value)} placeholder="Lokasi/Venue Acara" style={{ width: '100%', padding: '12px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <select value={newEventDelay} onChange={(e) => setNewEventDelay(e.target.value)} style={{ padding: '12px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-main)', outline: 'none' }}>
                    <option value="15">Auto-Approve: 15 Menit</option>
                    <option value="30">Auto-Approve: 30 Menit</option>
                    <option value="60">Auto-Approve: 1 Jam</option>
                    <option value="999999">Manual Only</option>
                  </select>
                  <select value={newEventTheme} onChange={(e) => setNewEventTheme(e.target.value)} style={{ padding: '12px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-main)', outline: 'none' }}>
                    {THEME_LIST.map((t) => (
                      <option key={t.id} value={t.id}>{t.emoji} Tema {t.label}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" disabled={isCreatingEvent} style={{ padding: '14px', backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                  {isCreatingEvent ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <PlusCircle size={16} />} 
                  {isCreatingEvent ? 'Memproses...' : 'Buat Event'}
                </button>
              </form>
            ) : (
              /* === SUCCESS CARD (Pengganti Form) === */
              <div style={{ 
                padding: '32px 24px', 
                backgroundColor: '#f0fdf4', 
                borderRadius: '12px', 
                border: '1px solid #bbf7d0',
                textAlign: 'center',
                animation: 'slideUp 0.5s ease-out'
              }}>
                <div style={{ width: '64px', height: '64px', backgroundColor: '#22c55e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', boxShadow: '0 8px 16px rgba(34, 197, 94, 0.3)' }}>
                  <CheckCircle2 size={36} color="#fff" />
                </div>
                <h4 style={{ margin: '0 0 12px 0', color: '#166534', fontSize: '20px', fontWeight: '800' }}>Event Berhasil Dibuat!</h4>
                <p style={{ margin: '0 0 24px 0', color: '#15803d', fontSize: '14px', lineHeight: 1.5 }}>Event siap digunakan. Silakan salin link atau QR Code di bawah ini untuk dibagikan ke klien.</p>
                
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(createdMagicLink); showToast('Link Admin disalin!', 'success'); }} 
                    style={{ flex: 1, padding: '12px', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#22c55e'}
                  >
                    <Link2 size={16} /> Salin Link Admin
                  </button>
                  <button 
                    onClick={() => { 
                      const newEvent = events.find(e => e.magic_link_token === createdEventToken);
                      if(newEvent) {
                        setQrEvent(newEvent);
                        setShowCreateModal(false);
                        setCreatedMagicLink('');
                        setCreatedEventToken('');
                      }
                    }} 
                    style={{ flex: 1, padding: '12px', backgroundColor: '#fff', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#dcfce7'; e.currentTarget.style.borderColor = '#22c55e'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#bbf7d0'; }}
                  >
                    <QrCode size={16} /> Lihat QR Code
                  </button>
                </div>
                
                <button 
                  onClick={() => { setShowCreateModal(false); setCreatedMagicLink(''); setCreatedEventToken(''); }}
                  style={{ marginTop: '20px', background: 'none', border: 'none', color: '#15803d', cursor: 'pointer', fontSize: '13px', fontWeight: '600', textDecoration: 'underline' }}
                >
                  Tutup & Kembali ke Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* === MODAL PREVIEW QR CODE (PREMIUM) === */}
      {qrEvent && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(4px)' }} onClick={() => setQrEvent(null)}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '16px', padding: '32px', maxWidth: '400px', width: '100%', textAlign: 'center', border: '1px solid var(--border)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()}>
            
            <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '800', color: 'var(--text-main)' }}>{qrEvent.name}</h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: 'var(--text-muted)' }}>Scan QR ini untuk upload foto</p>
            
            {/* Container QR Code Premium */}
            <div style={{ 
              backgroundColor: '#ffffff', 
              padding: '24px', 
              borderRadius: '16px', 
              marginBottom: '24px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid #f1f5f9',
              display: 'inline-block'
            }}>
              <QRCodeCanvas 
                value={getBaseUrl() + '/e/' + qrEvent.code} 
                size={200} 
                level="H" 
                fgColor="#1e293b" 
                bgColor="#ffffff"
                imageSettings={{
                  src: haqLogoDataUri,
                  height: 44, 
                  width: 44,
                  excavate: true, 
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                onClick={() => showToast('Fitur download QR coming soon!', 'info')} 
                style={{ flex: 1, padding: '12px', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', color: 'var(--text-main)' }}
              >
                Download QR
              </button>
              <button 
                onClick={() => { 
                  const link = getBaseUrl() + '/e/' + qrEvent.code;
                  navigator.clipboard.writeText(link);
                  showToast('Link upload disalin!', 'success');
                }} 
                style={{ flex: 1, padding: '12px', backgroundColor: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600' }}
              >
                Salin Link
              </button>
            </div>
            
            <button onClick={() => setQrEvent(null)} style={{ marginTop: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
              Tutup
            </button>
          </div>
        </div>
      )}

    {/* === TOAST NOTIFICATION CONTAINER === */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 10000, display: 'flex', flexDirection: 'column', gap: '12px', pointerEvents: 'none' }}>
        {toasts.map(toast => (
          <div key={toast.id} style={{
            backgroundColor: toast.type === 'success' ? '#10B981' : toast.type === 'error' ? '#EF4444' : '#3B82F6',
            color: '#fff', padding: '14px 20px', borderRadius: '12px', 
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: '600',
            animation: 'slideIn 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)', minWidth: '280px', pointerEvents: 'auto',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : toast.type === 'error' ? <XCircle size={18} /> : <Info size={18} />}
            {toast.message}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes slideIn {
          0% { transform: translateX(100%); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; } }
          @keyframes slideUp {
          0% { transform: translateX(-50%) translateY(100px); opacity: 0; }
          100% { transform: translateX(-50%) translateY(0); opacity: 1; } }
      `}
        </style>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{ backgroundColor: 'var(--bg-card)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }}>{icon}</div>
      <div><p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px 0', fontWeight: '600' }}>{label}</p><p style={{ fontSize: '24px', fontWeight: '800', margin: 0 }}>{value}</p></div>
    </div>
  );
}

export default function AdminPage() {
  return (<ThemeProvider><AdminDashboard /></ThemeProvider>);
}