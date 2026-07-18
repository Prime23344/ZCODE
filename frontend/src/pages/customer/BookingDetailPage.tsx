import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { bookingApi, paymentApi, reviewApi, disputeApi } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [reviewForm, setReviewForm] = useState({ rating: 5, text: '' });
  const [disputeReason, setDisputeReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [quoteForm, setQuoteForm] = useState({ amount: '', duration: '' });
  const [showReview, setShowReview] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBooking = () => {
    if (!id) return;
    bookingApi.get(id).then((r) => setBooking(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchBooking(); }, [id]);

  const doAction = async (fn: () => Promise<any>) => {
    setActionLoading(true);
    setMessage('');
    try { await fn(); fetchBooking(); }
    catch (err: any) { setMessage(err.response?.data?.error || t('common.error')); }
    setActionLoading(false);
  };

  if (loading) return <div className="text-center py-12">{t('common.loading')}</div>;
  if (!booking) return <div className="text-center py-12">{t('common.no_data')}</div>;

  const isCustomer = user?.id === booking.customerId;
  const isProvider = user?.id === booking.provider.userId;
  const s = booking.status;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {message && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{message}</div>}

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
          <h1 className="text-2xl font-bold">{t('booking.status.' + s)}</h1>
          <StatusBadge status={s} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Provider:</span> <span className="font-medium">{booking.provider.user.fullName}</span></div>
          <div><span className="text-gray-500">Customer:</span> <span className="font-medium">{booking.customer.fullName}</span></div>
          <div><span className="text-gray-500">Category:</span> {booking.category.icon} {booking.category.name}</div>
          <div><span className="text-gray-500">Location:</span> {booking.county}</div>
          <div className="sm:col-span-2"><span className="text-gray-500">Description:</span> <p className="mt-1">{booking.description}</p></div>
          {booking.quoteAmount && (
            <div><span className="text-gray-500">Quote:</span> <span className="font-semibold">KES {booking.quoteAmount.toLocaleString()}</span> {booking.quoteDuration && `(~${booking.quoteDuration} min)`}</div>
          )}
          {booking.scheduledAt && (
            <div><span className="text-gray-500">Scheduled:</span> {new Date(booking.scheduledAt).toLocaleString()}</div>
          )}
          {booking.cancelReason && (
            <div className="sm:col-span-2"><span className="text-gray-500">Cancel reason:</span> {booking.cancelReason}</div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        {isProvider && s === 'REQUESTED' && (
          <button onClick={() => setShowQuote(true)} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
            Submit Quote
          </button>
        )}
        {isCustomer && s === 'QUOTED' && (
          <button onClick={() => doAction(() => bookingApi.acceptQuote(booking.id))} disabled={actionLoading} className="bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
            Accept Quote
          </button>
        )}
        {isCustomer && s === 'QUOTED' && (
          <button onClick={() => setShowCancel(true)} className="bg-gray-200 text-gray-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-300">
            Decline
          </button>
        )}
        {isProvider && s === 'ACCEPTED' && (
          <button onClick={() => doAction(() => bookingApi.start(booking.id))} disabled={actionLoading} className="bg-amber-500 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-amber-600">
            Start Job
          </button>
        )}
        {isProvider && (s === 'IN_PROGRESS' || s === 'ACCEPTED') && (
          <button onClick={() => doAction(() => bookingApi.complete(booking.id))} disabled={actionLoading} className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
            Mark Complete
          </button>
        )}
        {isCustomer && (s === 'ACCEPTED' || s === 'COMPLETED') && (
          <button onClick={() => doAction(() => paymentApi.initiate(booking.id))} disabled={actionLoading} className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
            Pay Now (M-Pesa)
          </button>
        )}
        {isCustomer && s === 'PAID' && !booking.reviews?.length && (
          <button onClick={() => setShowReview(true)} className="bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
            Leave Review
          </button>
        )}
        {isProvider && s === 'PAID' && (
          <button onClick={() => doAction(() => paymentApi.payout(booking.id))} disabled={actionLoading} className="bg-emerald-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
            Request Payout
          </button>
        )}
        {(isCustomer || isProvider) && ['REQUESTED', 'QUOTED', 'ACCEPTED'].includes(s) && !booking.disputes?.length && (
          <button onClick={() => setShowDispute(true)} className="bg-red-100 text-red-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-200">
            Open Dispute
          </button>
        )}
        {(isCustomer || isProvider) && ['REQUESTED', 'QUOTED', 'ACCEPTED'].includes(s) && (
          <button onClick={() => setShowCancel(true)} className="bg-gray-200 text-gray-600 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-300">
            Cancel
          </button>
        )}
      </div>

      {/* Quote Modal */}
      {showQuote && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="font-semibold mb-3">Submit a Quote</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Amount (KES)</label>
              <input type="number" value={quoteForm.amount} onChange={(e) => setQuoteForm({...quoteForm, amount: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Duration (min)</label>
              <input type="number" value={quoteForm.duration} onChange={(e) => setQuoteForm({...quoteForm, duration: e.target.value})} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => doAction(() => bookingApi.quote(booking.id, { amount: parseInt(quoteForm.amount), duration: parseInt(quoteForm.duration) }))} disabled={actionLoading || !quoteForm.amount} className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium">Submit</button>
            <button onClick={() => setShowQuote(false)} className="bg-gray-200 px-5 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReview && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="font-semibold mb-3">{t('review.title')}</h3>
          <div className="mb-3">
            <label className="block text-sm text-gray-600 mb-1">Rating</label>
            <select value={reviewForm.rating} onChange={(e) => setReviewForm({...reviewForm, rating: parseInt(e.target.value)})} className="border rounded-lg px-3 py-2">
              {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">{t('review.comment')}</label>
            <textarea value={reviewForm.text} onChange={(e) => setReviewForm({...reviewForm, text: e.target.value})} rows={3} className="w-full border rounded-lg px-3 py-2" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => doAction(() => reviewApi.create({ bookingId: booking.id, rating: reviewForm.rating, text: reviewForm.text }))} disabled={actionLoading} className="bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-medium">{t('review.submit')}</button>
            <button onClick={() => setShowReview(false)} className="bg-gray-200 px-5 py-2 rounded-lg text-sm">{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {showDispute && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="font-semibold mb-3">{t('dispute.title')}</h3>
          <textarea value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} rows={3} className="w-full border rounded-lg px-3 py-2 mb-4" placeholder={t('dispute.reason')} />
          <div className="flex gap-3">
            <button onClick={() => doAction(() => disputeApi.create({ bookingId: booking.id, reason: disputeReason }))} disabled={actionLoading || !disputeReason} className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium">{t('dispute.submit')}</button>
            <button onClick={() => setShowDispute(false)} className="bg-gray-200 px-5 py-2 rounded-lg text-sm">{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancel && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="font-semibold mb-3">{t('booking.cancel')}</h3>
          <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={2} className="w-full border rounded-lg px-3 py-2 mb-4" placeholder={t('booking.cancel_reason')} />
          <div className="flex gap-3">
            <button onClick={() => doAction(() => bookingApi.cancel(booking.id, { reason: cancelReason }))} disabled={actionLoading} className="bg-gray-800 text-white px-5 py-2 rounded-lg text-sm font-medium">{t('booking.cancel')}</button>
            <button onClick={() => setShowCancel(false)} className="bg-gray-200 px-5 py-2 rounded-lg text-sm">{t('common.cancel')}</button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <h3 className="font-semibold mb-4">Messages</h3>
        <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
          {booking.messages?.length === 0 && <p className="text-gray-400 text-sm">No messages yet</p>}
          {booking.messages?.map((m: any) => (
            <div key={m.id} className={`flex ${m.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs px-4 py-2 rounded-lg text-sm ${m.senderId === user?.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                <span className="text-xs font-medium block">{m.sender?.fullName || 'Unknown'}</span>
                {m.content}
                <span className="text-xs opacity-70 block mt-1">{new Date(m.createdAt).toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
        </div>
        {['REQUESTED', 'QUOTED', 'ACCEPTED', 'IN_PROGRESS'].includes(s) && (
          <form onSubmit={(e) => { e.preventDefault(); const input = (e.target as HTMLFormElement).querySelector('input') as HTMLInputElement; if (input.value.trim()) { doAction(() => bookingApi.sendMessage(booking.id, input.value)); input.value = ''; } }}>
            <div className="flex gap-2">
              <input type="text" placeholder="Type a message..." className="flex-1 border rounded-lg px-3 py-2 text-sm" />
              <button type="submit" className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm">Send</button>
            </div>
          </form>
        )}
      </div>

      {/* Payments */}
      {booking.payments?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold mb-3">{t('payment.history')}</h3>
          {booking.payments.map((p: any) => (
            <div key={p.id} className="flex justify-between text-sm border-b border-gray-100 py-2 last:border-0">
              <div>
                <StatusBadge status={p.status} />
                <span className="ml-2">KES {p.amount.toLocaleString()}</span>
              </div>
              <div className="text-gray-500 text-xs">{p.externalRef || '—'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
