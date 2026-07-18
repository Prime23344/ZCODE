import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { providerApi, categoryApi } from '../../services/api';
import StarRating from '../../components/StarRating';
import StatusBadge from '../../components/StatusBadge';

export default function SearchPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 12;

  const county = params.get('county') || '';
  const category = params.get('category') || '';
  const minRating = parseFloat(params.get('minRating') || '0');
  const verifiedOnly = params.get('verifiedOnly') === 'true';

  useEffect(() => { categoryApi.getAll().then((r) => setCategories(r.data)); }, []);

  useEffect(() => {
    setLoading(true);
    providerApi
      .search({ category: category || undefined, county: county || undefined, minRating: minRating || undefined, verifiedOnly, page, limit })
      .then((r) => { setProviders(r.data.data); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  }, [page, category, county, minRating, verifiedOnly]);

  const counties = ['Nairobi', 'Kiambu', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Machakos'];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">{t('search.title')}</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-8 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('search.category')}</label>
          <select
            value={category}
            onChange={(e) => { const p = new URLSearchParams(params); p.set('category', e.target.value); setParams(p); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">{t('search.all_categories')}</option>
            {categories.map((c) => <option key={c.id} value={c.slug}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('search.county')}</label>
          <select
            value={county}
            onChange={(e) => { const p = new URLSearchParams(params); p.set('county', e.target.value); setParams(p); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">{t('search.all_counties')}</option>
            {counties.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="verified"
            checked={verifiedOnly}
            onChange={(e) => { const p = new URLSearchParams(params); p.set('verifiedOnly', String(e.target.checked)); setParams(p); setPage(1); }}
            className="rounded"
          />
          <label htmlFor="verified" className="text-sm">{t('search.verified_only')}</label>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
      ) : providers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{t('search.no_results')}</div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">{total} {t('search.results')}</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map((prov: any) => (
              <div
                key={prov.id}
                onClick={() => navigate(`/provider/${prov.id}`)}
                className="bg-white rounded-xl shadow-sm p-6 cursor-pointer card-hover"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{prov.user.fullName}</h3>
                    <p className="text-sm text-gray-500">{prov.county}, {prov.countryCode}</p>
                  </div>
                  <StatusBadge status={prov.verificationStatus} />
                </div>
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">{prov.bio}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {prov.categories?.map((pc: any) => (
                    <span key={pc.categoryId} className="text-xs bg-gray-100 px-2 py-0.5 rounded">{pc.category.icon} {pc.category.name}</span>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <StarRating rating={prov.averageRating} size="sm" />
                  <span className="text-gray-500">({prov.ratingCount})</span>
                  {prov.responseTimeMinutes && (
                    <span className="text-gray-400 ml-auto">~{prov.responseTimeMinutes}m response</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-center gap-2 mt-8">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              {t('common.back')}
            </button>
            <span className="px-4 py-2 text-sm">{t('common.page')} {page}</span>
            <button
              disabled={page * limit >= total}
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
            >
              {t('common.next')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
