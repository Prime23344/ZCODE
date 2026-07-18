import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { providerApi, reviewApi } from '../../services/api';
import StarRating from '../../components/StarRating';
import StatusBadge from '../../components/StatusBadge';

export default function ProviderProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [provider, setProvider] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      providerApi.get(id),
      reviewApi.getByProvider(id),
    ]).then(([prov, revs]) => {
      setProvider(prov.data);
      setReviews(revs.data.data);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center py-12">{t('common.loading')}</div>;
  if (!provider) return <div className="text-center py-12">{t('common.no_data')}</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 mb-6">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center text-3xl shrink-0">
            👷
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{provider.user.fullName}</h1>
              <StatusBadge status={provider.verificationStatus} />
            </div>
            <p className="text-gray-500 mt-1">{provider.county}, {provider.countryCode}</p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span><StarRating rating={provider.averageRating} size="sm" /> <span className="text-gray-500">({provider.ratingCount} {t('provider.reviews')})</span></span>
              {provider.responseTimeMinutes && (
                <span className="text-gray-400">{t('provider.response_time')}: ~{provider.responseTimeMinutes}{t('provider.minutes')}</span>
              )}
            </div>
          </div>
          {user?.role === 'CUSTOMER' && provider.verificationStatus === 'VERIFIED' && (
            <button
              onClick={() => navigate(`/book/${provider.id}`)}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 shrink-0"
            >
              {t('provider.book_now')}
            </button>
          )}
        </div>

        {provider.bio && (
          <div className="mt-6">
            <h2 className="font-semibold text-gray-700 mb-2">{t('provider.bio')}</h2>
            <p className="text-gray-600">{provider.bio}</p>
          </div>
        )}

        {provider.categories?.length > 0 && (
          <div className="mt-6">
            <h2 className="font-semibold text-gray-700 mb-2">{t('provider.categories')}</h2>
            <div className="flex flex-wrap gap-2">
              {provider.categories.map((pc: any) => (
                <span key={pc.categoryId} className="bg-gray-100 px-3 py-1 rounded-full text-sm">
                  {pc.category.icon} {pc.category.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Portfolio */}
      {provider.portfolioPhotos?.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-gray-700 mb-3">{t('provider.portfolio')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {provider.portfolioPhotos.map((p: any) => (
              <div key={p.id} className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">📷</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
        <h2 className="font-semibold text-gray-700 mb-4">{t('provider.reviews')} ({reviews.length})</h2>
        {reviews.length === 0 ? (
          <p className="text-gray-400">{t('review.no_reviews')}</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r: any) => (
              <div key={r.id} className="border-b border-gray-100 pb-4 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{r.customer?.fullName || 'Customer'}</span>
                  <StarRating rating={r.rating} size="sm" />
                  <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                {r.text && <p className="text-sm text-gray-600 mt-1">{r.text}</p>}
                {r.providerResponse && (
                  <div className="mt-2 ml-4 bg-gray-50 rounded-lg p-3 text-sm">
                    <span className="font-medium text-gray-500">Provider response:</span>
                    <p className="text-gray-600">{r.providerResponse}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
