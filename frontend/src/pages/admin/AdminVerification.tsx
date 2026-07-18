import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { providerApi } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

export default function AdminVerification() {
  const { t } = useTranslation();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState('');

  const fetchQueue = () => {
    setLoading(true);
    providerApi.getVerificationQueue().then((r) => setProviders(r.data.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchQueue(); }, []);

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    setError('');
    try {
      await providerApi.verifyProvider(id, { action: 'APPROVE' });
      fetchQueue();
    } catch (err: any) {
      setError(err.response?.data?.error || t('common.error'));
    }
    setActionLoading(null);
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    setActionLoading(rejectModal.id);
    setError('');
    try {
      await providerApi.verifyProvider(rejectModal.id, { action: 'REJECT', reason: rejectReason });
      setRejectModal(null);
      setRejectReason('');
      fetchQueue();
    } catch (err: any) {
      setError(err.response?.data?.error || t('common.error'));
    }
    setActionLoading(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t('admin.verification_queue')}</h1>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {loading ? (
        <div className="text-center py-12">{t('common.loading')}</div>
      ) : providers.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl">No providers pending verification 🎉</div>
      ) : (
        <div className="space-y-6">
          {providers.map((p: any) => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-col md:flex-row md:items-start gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h3 className="font-semibold text-lg">{p.user.fullName}</h3>
                    <StatusBadge status={p.verificationStatus} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-500">Phone:</span> {p.user.phone}</div>
                    <div><span className="text-gray-500">Email:</span> {p.user.email || '—'}</div>
                    <div><span className="text-gray-500">County:</span> {p.county}</div>
                    <div><span className="text-gray-500">Bio:</span> {p.bio}</div>
                  </div>
                  {p.categories?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-1">Services offered:</p>
                      <div className="flex flex-wrap gap-1">
                        {p.categories.map((pc: any) => (
                          <span key={pc.categoryId} className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                            {pc.category.icon} {pc.category.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {p.verificationDocuments?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-1">Documents ({p.verificationDocuments.length}):</p>
                      <div className="flex gap-2">
                        {p.verificationDocuments.map((doc: any) => (
                          <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                            className="border rounded-lg p-3 text-center text-xs hover:bg-gray-50">
                            <span className="text-2xl block mb-1">📄</span>
                            {doc.documentType.replace(/_/g, ' ')}<br />
                            <span className="text-gray-400">{doc.issuingCountry}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 border-t pt-4">
                <button
                  onClick={() => handleApprove(p.id)}
                  disabled={actionLoading === p.id}
                  className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading === p.id ? '...' : t('admin.approve')}
                </button>
                <button
                  onClick={() => setRejectModal({ id: p.id, name: p.user.fullName })}
                  disabled={actionLoading === p.id}
                  className="bg-red-100 text-red-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-200"
                >
                  {t('admin.reject')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="font-semibold text-lg mb-2">Reject {rejectModal.name}?</h3>
            <p className="text-sm text-gray-500 mb-4">Provide a reason for rejection:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="w-full border rounded-lg px-3 py-2 mb-4"
              placeholder="e.g. ID document is unclear. Please upload a clearer photo."
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setRejectModal(null); setRejectReason(''); }} className="px-4 py-2 text-sm bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleReject} disabled={!rejectReason} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg disabled:opacity-50">Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
