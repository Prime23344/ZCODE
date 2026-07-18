import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useState } from 'react';
import { categoryApi } from '../../services/api';

export default function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    categoryApi.getAll().then((res) => setCategories(res.data));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t('tagline')}
          </h1>
          <p className="text-lg md:text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Find verified, trustworthy service providers — electricians, plumbers, cleaners, tutors, and more.
            Every provider is vetted. Every payment is protected.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/search')}
              className="bg-white text-primary-700 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 text-lg"
            >
              {t('nav.search')} 🔍
            </button>
            {!user && (
              <button
                onClick={() => navigate('/signup')}
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 text-lg"
              >
                Join as Provider
              </button>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-10">How Surety Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: '🔍', title: 'Search', desc: 'Browse verified providers by category and location' },
              { icon: '📋', title: 'Book & Quote', desc: 'Request a job, get a quote, and confirm — all in-app' },
              { icon: '✅', title: 'Pay Safely', desc: 'M-Pesa payments held in escrow until job is complete' },
            ].map((step) => (
              <div key={step.title} className="text-center p-6">
                <span className="text-5xl block mb-4">{step.icon}</span>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-2xl font-bold text-center mb-10">Popular Services</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {categories.slice(0, 18).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => navigate(`/search?category=${cat.slug}`)}
                  className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow text-center card-hover"
                >
                  <span className="text-3xl block mb-2">{cat.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trust signals */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: '🪪', title: 'ID Verified', desc: 'Every provider is verified with national ID or passport' },
              { icon: '💰', title: 'Escrow Payments', desc: 'Your money is held securely until the job is done' },
              { icon: '⭐', title: 'Real Reviews', desc: 'Only verified customers can leave reviews — no fakes' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4 p-6 bg-gray-50 rounded-xl">
                <span className="text-3xl">{item.icon}</span>
                <div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
