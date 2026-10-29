'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { 
  ArrowLeft, Image, CheckCircle2, Clock, XCircle, Users, Trophy, LayoutDashboard 
} from 'lucide-react';

export default function ReportPage() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('adminLoggedIn');
    if (isLoggedIn !== 'true') {
      router.push('/admin/login');
      return;
    }

    const isSuper = localStorage.getItem('adminIsSuperAdmin') === 'true';
    const savedCode = localStorage.getItem('adminEventCode');
    setIsSuperAdmin(isSuper);

    // Load events untuk dropdown (hanya super admin)
    if (isSuper) {
      fetch('/api/admin/events')
        .then(res => res.json())
        .then(result => {
          if (result.data) setEvents(result.data);
        });
    } else {
      setSelectedEvent(savedCode); // Event admin terkunci ke event mereka
    }
  }, [router]);

  // Load data report
  useEffect(() => {
    if (selectedEvent === '' && !isSuperAdmin) return; // Tunggu sampai selectedEvent terisi untuk event admin
    
    setLoading(true);
    const url = selectedEvent 
      ? `/api/admin/report?eventCode=${selectedEvent}` 
      : '/api/admin/report'; // Overall stats

    fetch(url)
      .then(res => res.json())
      .then(result => {
        if (result.success) setStats(result.data);
      })
      .finally(() => setLoading(false));
  }, [selectedEvent, isSuperAdmin]);

  const COLORS = ['#22c55e', '#eab308', '#dc2626']; // Hijau, Kuning, Merah

  if (loading || !stats) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}>
        Memuat laporan...
      </div>
    );
  }

  const pieData = [
    { name: 'Approved', value: stats.approved },
    { name: 'Pending', value: stats.pending },
    { name: 'Rejected', value: stats.rejected },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', color: 'var(--text-main)', padding: '32px', fontFamily: 'var(--font-body)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={() => router.push('/admin')}
              style={{ padding: '10px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-main)' }}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, fontFamily: 'var(--font-heading)' }}>
                {selectedEvent ? `Laporan Event` : 'Laporan Keseluruhan'}
              </h1>
              <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '14px' }}>
                {selectedEvent ? events.find(e => e.code === selectedEvent)?.name : 'Semua Event Aktif'}
              </p>
            </div>
          </div>

          {/* Dropdown Event (Hanya Super Admin) */}
          {isSuperAdmin && (
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              style={{ padding: '12px 16px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-main)', fontSize: '14px', outline: 'none', minWidth: '250px' }}
            >
              <option value="">-- Lihat Laporan Keseluruhan --</option>
              {events.map(ev => (
                <option key={ev.code} value={ev.code}>{ev.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Big Numbers Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          {selectedEvent ? (
            <>
              <StatCard icon={<Users size={24} />} label="Tamu Unik" value={stats.uniqueGuests} color="#3b82f6" />
              <StatCard icon={<Image size={24} aria-hidden="true" role="img" alt="" />} label="Total Foto" value={stats.total} color="#8b5cf6" />
            </>
          ) : (
            <>
              <StatCard icon={<LayoutDashboard size={24} />} label="Total Event" value={stats.totalEvents} color="#3b82f6" />
              <StatCard icon={<Image size={24} aria-hidden="true" role="img" alt="" />} label="Total Foto" value={stats.total} color="#8b5cf6" />
            </>
          )}
          <StatCard icon={<CheckCircle2 size={24} />} label="Approved" value={stats.approved} color="#22c55e" />
          <StatCard icon={<Clock size={24} />} label="Pending" value={stats.pending} color="#eab308" />
          <StatCard icon={<XCircle size={24} />} label="Rejected" value={stats.rejected} color="#dc2626" />
        </div>

        {/* Charts Section */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          
          {/* Pie Chart: Status Breakdown */}
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', margin: '0 0 20px 0' }}>Distribusi Status Foto</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart: Top Contributors (Hanya Per-Event) */}
          {selectedEvent && stats.topContributors.length > 0 && (
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trophy size={20} color="#eab308" /> Top 5 Kontributor
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.topContributors} layout="vertical">
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} style={{ fontSize: '12px' }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 10, 10, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Empty State untuk Overall Chart */}
        {selectedEvent === '' && (
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '48px', borderRadius: '20px', border: '1px solid var(--border)', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Users size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <p style={{ fontSize: '16px', fontWeight: '600' }}>Pilih event dari dropdown di atas untuk melihat detail tamu dan kontributor.</p>
          </div>
        )}

      </div>
    </div>
  );
}

// Komponen Kecil untuk Kartu Statistik
function StatCard({ icon, label, value, color }) {
  return (
    <div style={{ backgroundColor: 'var(--bg-card)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div style={{ width: '56px', height: '56px', borderRadius: '14px', backgroundColor: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 4px 0', fontWeight: '600' }}>{label}</p>
        <p style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>{value}</p>
      </div>
    </div>
  );
}