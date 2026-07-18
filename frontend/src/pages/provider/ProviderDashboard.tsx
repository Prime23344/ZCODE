import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { userApi } from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import StarRating from '../../components/StarRating';

export default function ProviderDashboard() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (user.provider?.verificationStatus === 'UNVERIFIED') {
      navigate('/provider/onboarding');
      return;
    }
    userApi.getMyBookings().then((r) => setBookings(r.data.data)).finally(() => setLoading(false));
  }, [user]);

  if (!user?.provider) return <div className="text-center py-12">{t('common.loading')}</div>;

  const provider = user.provider;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Provider Profile Summary */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-2xl">👷</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{user.fullName}</h1>
              <StatusBadge status={provider.verificationStatus} />
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              <span><StarRating rating={provider.averageRating} size="sm" /> ({provider.ratingCount})</span>
              <span>{provider.county}</span>
              <span>{provider.bio?.slice(0, 60)}...</span>
            </div>
          </div>
          <button onClick={() => navigate('/provider/onboarding')} className="text-sm bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200">
            Edit Profile
          </button>
        </div>
      </div>

      {/* Verification banner */}
      {provider.verificationStatus === 'PENDING_VERIFICATION' && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-6 py-4 rounded-xl mb-6">
          ⏳ Your verification is under review. We'll notify you once it's approved.
        </div>
      )}
      {provider.verificationStatus === 'REJECTED' && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-6 py-4 rounded-xl mb-6">
          ❌ Verification rejected: {provider.verificationRejectionReason || 'Please re-upload your documents.'}
          <button onClick={() => navigate('/provider/onboarding')} className="ml-3 underline font-medium">Re-submit</button>
        </div>
      )}

      {/* Bookings */}
      <h2 className="text-xl font-bold mb-4">Incoming Bookings</h2>
      {loading ? (
        <div className="text-center py-12">{t('common.loading')}</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-xl">No bookings yet</div>
      ) : (
        <div className="space-y-4">
          {bookings.map((b: any) => (
            <div
              key={b.id}
              onClick={() => navigate(`/bookings/${b.id}`)}
              className="bg-white rounded-xl shadow-sm p-5 cursor-pointer card-hover"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={b.status} />
                    <span className="text-sm">{b.category.icon} {b.category.name}</span>
                  </div>
                  <p className="text-sm text-gray-700">{b.description}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {b.customer.fullName} • {b.county} • {new Date(b.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {b.quoteAmount && (
                  <span className="font-semibold text-primary-700">KES {b.quoteAmount.toLocaleString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
