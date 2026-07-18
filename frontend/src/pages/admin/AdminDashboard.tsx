import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../services/api';
import { io as socketIo } from 'socket.io-client';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'ws://localhost:4000';
const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<any>(null);
  const [bookingsChart, setBookingsChart] = useState<any[]>([]);
  const [revenueChart, setRevenueChart] = useState<any[]>([]);
  const [categoryChart, setCategoryChart] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = () => {
      Promise.all([
        adminApi.getKPIs(),
        adminApi.getBookingsChart(),
        adminApi.getRevenueChart(),
        adminApi.getCategoryChart(),
        adminApi.getActivity({ limit: 30 }),
      ]).then(([k, bc, rc, cc, ac]) => {
        setKpis(k.data);
        setBookingsChart(bc.data.map((d: any) => ({ date: d.date.slice(5), value: d.value })));
        setRevenueChart(rc.data.map((d: any) => ({ date: d.date.slice(5), value: d.value })));
        setCategoryChart(cc.data.slice(0, 8));
        setActivity(ac.data.data);
      }).finally(() => setLoading(false));
    };
    fetchAll();

    // WebSocket for live activity feed
    const socket = socketIo(SOCKET_URL);
    socket.emit('subscribe:admin');
    socket.on('activity', (entry: any) => {
      setActivity((prev) => [entry, ...prev].slice(0, 50));
    });

    // Auto-refresh KPIs every 30s
    const interval = setInterval(fetchAll, 30000);

    return () => { socket.disconnect(); clearInterval(interval); };
  }, []);

  if (loading || !kpis) return <div className="text-center py-12">{t('common.loading')}</div>;

  const kpiCard = (label: string, value: string | number, color = 'primary', onClick?: () => void) => (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm p-5 ${onClick ? 'cursor-pointer card-hover' : ''} border-l-4 border-${color}-500`}
    >
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t('admin.dashboard')}</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        {kpiCard(t('admin.total_users'), kpis.totalUsers, 'primary', () => navigate('/admin'))}
        {kpiCard(t('admin.total_customers'), kpis.totalCustomers, 'blue')}
        {kpiCard(t('admin.total_providers'), kpis.totalProviders, 'purple')}
        {kpiCard(t('admin.pending_verification'), kpis.pendingVerification, 'amber', () => navigate('/admin/verification'))}
        {kpiCard(t('admin.open_disputes'), kpis.openDisputes, 'red', () => navigate('/admin/disputes'))}
        {kpiCard(t('admin.open_tickets'), kpis.openTickets, 'orange')}
      </div>

      {/* Signups */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {kpiCard(t('admin.today') + ' ' + t('admin.new_signups'), kpis.newSignupsToday, 'green')}
        {kpiCard(t('admin.last_7_days'), kpis.newSignups7d, 'teal')}
        {kpiCard(t('admin.last_30_days'), kpis.newSignups30d, 'cyan')}
      </div>

      {/* Revenue & Booking stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {kpiCard(t('admin.gross_revenue') + ' (30d)', `KES ${kpis.grossBookingValue30d.toLocaleString()}`, 'emerald')}
        {kpiCard(t('admin.platform_commission') + ' (30d)', `KES ${kpis.platformCommission30d.toLocaleString()}`, 'green')}
        {kpiCard(t('admin.avg_rating'), `${kpis.averageRating} ⭐ (${kpis.reviewVolume30d} reviews 30d)`, 'amber')}
      </div>

      {/* Bookings by status */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h2 className="font-semibold mb-4">{t('admin.bookings')} ({kpis.bookings30d} last 30d, {kpis.bookingsToday} today)</h2>
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
          {Object.entries(kpis.bookingsByStatus).map(([status, count]: any) => (
            <div key={status} className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-gray-800">{count}</p>
              <p className="text-xs text-gray-500">{status.replace(/_/g, ' ')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold mb-4">{t('admin.bookings_over_time')}</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={bookingsChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold mb-4">{t('admin.revenue_over_time')} (KES)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={revenueChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Popularity */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <h3 className="font-semibold mb-4">{t('admin.category_popularity')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryChart} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={120} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={categoryChart} dataKey="value" nameKey="category" cx="50%" cy="50%" outerRadius={100} label>
                {categoryChart.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          {t('admin.activity_feed')} (Live)
        </h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {activity.length === 0 ? (
            <p className="text-gray-400 text-sm">{t('common.no_data')}</p>
          ) : activity.map((a: any) => (
            <div key={a.id || Math.random()} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
              <span className="text-gray-400 text-xs mt-0.5 shrink-0">
                {new Date(a.createdAt || a.timestamp).toLocaleTimeString()}
              </span>
              <div className="flex-1 text-sm">
                <span className="font-medium text-gray-800">{a.type.replace(/_/g, ' ')}</span>
                {a.actorName && <span className="text-gray-500"> — {a.actorName}</span>}
                {a.metadata && Object.keys(a.metadata).length > 0 && (
                  <span className="text-gray-400 text-xs ml-2">
                    {Object.entries(a.metadata).map(([k, v]) => `${k}: ${v}`).join(', ')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
