import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { paymentApi } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

export default function PaymentHistoryPage() {
  const { t } = useTranslation();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    paymentApi.history().then((r) => setPayments(r.data.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t('payment.history')}</h1>
      {loading ? (
        <div className="text-center py-12">{t('common.loading')}</div>
      ) : payments.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('common.no_data')}</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Date</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Booking</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Amount</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">Commission</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p: any) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{p.booking?.description?.slice(0, 40) || p.bookingId}</td>
                    <td className="px-4 py-3 font-medium">KES {p.amount.toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-gray-500">KES {p.commissionAmount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
