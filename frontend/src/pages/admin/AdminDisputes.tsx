import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { disputeApi } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

export default function AdminDisputes() {
  const { t } = useTranslation();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [resolution, setResolution] = useState({ type: 'RELEASE_PAYMENT', notes: '', partialAmount: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchDisputes = () => {
    setLoading(true);
    disputeApi.getQueue().then((r) => setDisputes(r.data.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchDisputes(); }, []);

  const handleResolve = async () => {
    if (!selected) return;
    setActionLoading(true);
    setError('');
    try {
      await disputeApi.resolve(selected.id, {
        resolutionType: resolution.type,
        adminNotes: resolution.notes,
        partialAmount: resolution.partialAmount ? parseInt(resolution.partialAmount) : undefined,
      });
      setSelected(null);
      setResolution({ type: 'RELEASE_PAYMENT', notes: '', partialAmount: '' });
      fetchDisputes();
    } catch (err: any) {
      setError(err.response?.data?.error || t('common.error'));
    }
    setActionLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t('admin.dispute_queue')}</h1>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {loading ? (
        <div className="text-center py-12">{t('common.loading')}</div>
      ) : disputes.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl">No open disputes 🎉</div>
      ) : (
        <div className="space-y-4">
          {disputes.map((d: any) => (
            <div key={d.id} className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <StatusBadge status={d.status} />
                <span className="text-xs text-gray-400">{new Date(d.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1">Reason: {d.reason}</p>
              <div className="grid grid-cols-2 gap-3 text-sm text-gray-500 mb-3">
                <div><span className="text-gray-400">Opened by:</span> {d.openedBy?.fullName || '—'}</div>
                <div><span className="text-gray-400">Customer:</span> {d.booking?.customer?.fullName}</div>
                <div><span className="text-gray-400">Provider:</span> {d.booking?.provider?.user?.fullName}</div>
                <div><span className="text-gray-400">Category:</span> {d.booking?.category?.name}</div>
                <div className="col-span-2"><span className="text-gray-400">Booking:</span> {d.booking?.description}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelected(d)}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
                >
                  {t('admin.resolve_dispute')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolve Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-lg mb-4">{t('admin.resolve_dispute')}</h3>
            <p className="text-sm text-gray-500 mb-4">{selected.reason}</p>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resolution</label>
                <select
                  value={resolution.type}
                  onChange={(e) => setResolution({ ...resolution, type: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="RELEASE_PAYMENT">Release Payment to Provider</option>
                  <option value="REFUND_CUSTOMER">Refund Customer</option>
                  <option value="PARTIAL_SPLIT">Partial Split</option>
                  <option value="MORE_INFO">Request More Info</option>
                </select>
              </div>
              {resolution.type === 'PARTIAL_SPLIT' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer refund amount (KES)</label>
                  <input
                    type="number"
                    value={resolution.partialAmount}
                    onChange={(e) => setResolution({ ...resolution, partialAmount: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
                <textarea
                  value={resolution.notes}
                  onChange={(e) => setResolution({ ...resolution, notes: e.target.value })}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Document your decision..."
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => setSelected(null)} className="px-4 py-2 text-sm bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleResolve} disabled={actionLoading} className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg disabled:opacity-50">
                {actionLoading ? '...' : 'Confirm Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
