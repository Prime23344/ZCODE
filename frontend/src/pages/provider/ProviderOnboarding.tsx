import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { providerApi, categoryApi } from '../../services/api';

export default function ProviderOnboarding() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState({
    bio: '',
    location: '',
    county: '',
    categoryIds: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    categoryApi.getAll().then((r) => setCategories(r.data));
    if (user?.provider) {
      setForm({
        bio: user.provider.bio || '',
        location: user.provider.location || '',
        county: user.provider.county || '',
        categoryIds: user.provider.categories?.map((pc: any) => pc.categoryId) || [],
      });
    }
  }, [user]);

  const toggleCategory = (id: string) => {
    setForm((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(id)
        ? prev.categoryIds.filter((c) => c !== id)
        : [...prev.categoryIds, id],
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      await providerApi.onboarding(form);
      await refreshUser();
      navigate('/provider/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || t('common.error'));
    }
    setLoading(false);
  };

  const counties = ['Nairobi', 'Kiambu', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Machakos'];

  const canSubmit = form.bio && form.county && form.categoryIds.length > 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">{t('onboarding.title')}</h1>
      <p className="text-gray-500 mb-8">Step {step} of 3</p>

      {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`flex-1 h-1.5 rounded-full ${s <= step ? 'bg-primary-600' : 'bg-gray-200'}`} />
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        {/* Step 1: Bio & Location */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold">{t('onboarding.step1')}</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('onboarding.bio')}</label>
              <textarea value={form.bio} onChange={(e) => setForm({...form, bio: e.target.value})} rows={4} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('onboarding.location')}</label>
              <input type="text" value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} className="w-full border rounded-lg px-3 py-2" placeholder="e.g. Westlands, Nairobi" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('onboarding.county')}</label>
              <select value={form.county} onChange={(e) => setForm({...form, county: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                <option value="">Select county...</option>
                {counties.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Step 2: Categories */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold">{t('onboarding.step2')}</h2>
            <p className="text-sm text-gray-500">{t('onboarding.select_categories')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`p-3 rounded-xl border-2 text-sm text-left transition-colors ${
                    form.categoryIds.includes(cat.id)
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl block mb-1">{cat.icon}</span>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Documents */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-semibold">{t('onboarding.step3')}</h2>
            <p className="text-sm text-gray-500">{t('onboarding.upload_id')}</p>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
              <span className="text-4xl block mb-2">📄</span>
              <p className="text-sm text-gray-500">Document upload will be available after initial submission.</p>
              <p className="text-xs text-gray-400 mt-2">In production, you'd upload your National ID or Passport here.</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="px-5 py-2 border rounded-lg text-sm hover:bg-gray-50">
              {t('common.back')}
            </button>
          )}
          <div className="ml-auto flex gap-3">
            {step < 3 ? (
              <button onClick={() => setStep(step + 1)} className="bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
                {t('common.next')}
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading || !canSubmit} className="bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                {loading ? '...' : t('onboarding.submit')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
