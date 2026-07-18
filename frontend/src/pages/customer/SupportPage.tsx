import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supportApi } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

export default function SupportPage() {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: '', description: '' });
  const [error, setError] = useState('');

  useState(() => {
    supportApi.list().then((r) => setTickets(r.data.data)).finally(() => setLoading(false));
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await supportApi.create(form);
      setShowForm(false);
      setForm({ subject: '', description: '' });
      supportApi.list().then((r) => setTickets(r.data.data));
    } catch (err: any) {
      setError(err.response?.data?.error || t('common.error'));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('support.title')}</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
          {showForm ? t('common.cancel') : t('support.new_ticket')}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg mb-3 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('support.subject')}</label>
              <input type="text" value={form.subject} onChange={(e) => setForm({...form, subject: e.target.value})} className="w-full border rounded-lg px-3 py-2" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('support.description')}</label>
              <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={4} className="w-full border rounded-lg px-3 py-2" required />
            </div>
            <button type="submit" className="bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-medium">{t('support.submit')}</button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">{t('common.loading')}</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('common.no_data')}</div>
      ) : (
        <div className="space-y-4">
          {tickets.map((tk: any) => (
            <div key={tk.id} className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{tk.subject}</h3>
                <StatusBadge status={tk.status} />
              </div>
              <p className="text-sm text-gray-600">{tk.description}</p>
              {tk.adminResponse && (
                <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm">
                  <span className="font-medium text-blue-700">{t('support.admin_response')}:</span>
                  <p className="text-blue-800 mt-1">{tk.adminResponse}</p>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">{new Date(tk.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
