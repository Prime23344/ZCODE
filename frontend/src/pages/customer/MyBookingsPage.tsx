import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { bookingApi } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

export default function MyBookingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchBookings = () => {
    setLoading(true);
    bookingApi.list({ status: statusFilter || undefined }).then((r) => {
      setBookings(r.data.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchBookings(); }, [statusFilter]);

  const statuses = ['REQUESTED', 'QUOTED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'PAID', 'REVIEWED', 'CANCELLED', 'DISPUTED'];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t('nav.my_bookings')}</h1>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!statusFilter ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          All
        </button>
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${statusFilter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {t(`booking.status.${s}`)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">{t('common.loading')}</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('common.no_data')}</div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b: any) => (
            <div
              key={b.id}
              onClick={() => navigate(`/bookings/${b.id}`)}
              className="bg-white rounded-xl shadow-sm p-5 cursor-pointer card-hover flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={b.status} />
                  <span className="text-sm text-gray-500">{b.category.icon} {b.category.name}</span>
                </div>
                <p className="text-sm text-gray-700 line-clamp-1">{b.description}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {b.provider.user.fullName} • {b.county}
                  {b.quoteAmount && ` • KES ${b.quoteAmount.toLocaleString()}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-400">{new Date(b.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
