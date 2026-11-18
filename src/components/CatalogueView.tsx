import React, { useMemo, useState } from 'react';
import { MessageSquarePlus, Search, X } from 'lucide-react';
import { t } from '../i18n/translations';
import { formatMYR, validateMalaysiaPhone } from '../lib/malaysia';
import { createCustomCakeRequest } from '../services/firestoreService';
import { CakeRange, Locale, Product } from '../types/domain';

interface CatalogueViewProps {
  locale: Locale;
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export const CatalogueView: React.FC<CatalogueViewProps> = ({
  locale,
  products,
  onSelectProduct,
}) => {
  const [rangeFilter, setRangeFilter] = useState<'all' | CakeRange>('all');
  const [butterOnly, setButterOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priceSort, setPriceSort] = useState<'default' | 'asc' | 'desc'>('default');

  const [requestOpen, setRequestOpen] = useState(false);
  const [reqName, setReqName] = useState('');
  const [reqPhone, setReqPhone] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqFlavour, setReqFlavour] = useState('');
  const [reqDate, setReqDate] = useState('');
  const [reqNotes, setReqNotes] = useState('');
  const [reqBusy, setReqBusy] = useState(false);
  const [reqMessage, setReqMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const getMinPriceSen = (p: Product): number => {
    if (p.formats.combo) return p.formats.combo.priceSen;
    if (p.formats.loaf) return p.formats.loaf.priceSen;
    return p.formats.whole?.priceSen ?? 0;
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = products.filter((p) => {
      if (!p.active) return false;
      if (rangeFilter !== 'all' && p.range !== rangeFilter) return false;
      if (butterOnly && p.baseFat !== 'butter') return false;
      if (q) {
        const hay = `${p.name.ms} ${p.name.en} ${p.flavour.ms} ${p.flavour.en} ${p.range}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (priceSort === 'asc') {
      list = [...list].sort((a, b) => getMinPriceSen(a) - getMinPriceSen(b));
    } else if (priceSort === 'desc') {
      list = [...list].sort((a, b) => getMinPriceSen(b) - getMinPriceSen(a));
    }
    return list;
  }, [products, rangeFilter, butterOnly, searchQuery, priceSort]);

  const handleSubmitCustomRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqMessage(null);
    const phoneCheck = validateMalaysiaPhone(reqPhone);
    if (reqName.trim().length < 2) {
      setReqMessage({
        type: 'err',
        text: locale === 'ms' ? 'Sila masukkan nama penuh anda.' : 'Please enter your full name.',
      });
      return;
    }
    if (!phoneCheck.valid) {
      setReqMessage({
        type: 'err',
        text:
          locale === 'ms'
            ? 'Format nombor telefon Malaysia tidak sah (contoh: 0123456789 atau +60123456789).'
            : 'Invalid Malaysian phone number format.',
      });
      return;
    }
    if (reqFlavour.trim().length < 2) {
      setReqMessage({
        type: 'err',
        text: locale === 'ms' ? 'Sila nyatakan perisa kek yang diingini.' : 'Please specify requested flavour.',
      });
      return;
    }

    setReqBusy(true);
    try {
      await createCustomCakeRequest({
        name: reqName.trim(),
        phone: phoneCheck.normalized,
        email: reqEmail.trim(),
        requestedFlavour: reqFlavour.trim(),
        targetDate: reqDate,
        notes: reqNotes.trim(),
      });
      setReqMessage({
        type: 'ok',
        text:
          locale === 'ms'
            ? 'Permintaan sebut harga berjaya dihantar! Pemilik akan membalas melalui WhatsApp/emel.'
            : 'Quote request sent! The owner will reply via WhatsApp or email.',
      });
      setReqName('');
      setReqPhone('');
      setReqEmail('');
      setReqFlavour('');
      setReqDate('');
      setReqNotes('');
    } catch {
      setReqMessage({
        type: 'err',
        text:
          locale === 'ms'
            ? 'Gagal menghantar permintaan. Sila cuba sebentar lagi.'
            : 'Failed to submit request. Please try again.',
      });
    } finally {
      setReqBusy(false);
    }
  };

  const rangeTabs: Array<{ id: 'all' | CakeRange; label: string }> = [
    { id: 'all', label: t(locale, 'filterAll') },
    { id: 'budget', label: t(locale, 'filterBudget') },
    { id: 'classic', label: t(locale, 'filterClassic') },
    { id: 'cadbury', label: t(locale, 'filterCadbury') },
    { id: 'trendy', label: t(locale, 'filterTrendy') },
  ];

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#292524]">
            {t(locale, 'catalogueTitle')}
          </h1>
          <p className="text-sm text-[#554336] mt-1">{t(locale, 'catalogueSub')}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setReqMessage(null);
            setRequestOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#831843]/30 text-[#831843] text-sm font-semibold hover:bg-[#831843]/5 transition-colors self-start whitespace-nowrap shrink-0"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>{t(locale, 'customRequestTitle')}</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="bakery-glass rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {rangeTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRangeFilter(tab.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                rangeFilter === tab.id
                  ? 'bg-[#831843] text-white'
                  : 'bg-[#F5ECEA] text-[#554336] hover:text-[#292524]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-[#887364] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t(locale, 'searchPlaceholder')}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/80 border border-[#DBC2B0] text-sm text-[#292524] focus:outline-none focus:border-[#D97706]"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={priceSort}
              onChange={(e) => setPriceSort(e.target.value as 'default' | 'asc' | 'desc')}
              className="w-full px-3 py-2 rounded-lg bg-white/80 border border-[#DBC2B0] text-sm text-[#292524] focus:outline-none focus:border-[#D97706]"
              aria-label="Sort by price"
            >
              <option value="default">{locale === 'ms' ? 'Susunan Asal' : 'Default Order'}</option>
              <option value="asc">{locale === 'ms' ? 'Harga: Rendah ke Tinggi' : 'Price: Low to High'}</option>
              <option value="desc">{locale === 'ms' ? 'Harga: Tinggi ke Rendah' : 'Price: High to Low'}</option>
            </select>
          </div>

          <label className="sm:col-span-3 flex items-center gap-2 text-xs font-semibold text-[#554336] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={butterOnly}
              onChange={(e) => setButterOnly(e.target.checked)}
              className="rounded border-[#DBC2B0] text-[#D97706] focus:ring-[#D97706]"
            />
            <span>{t(locale, 'filterPureButter')}</span>
          </label>
        </div>
      </div>

      {/* Product Grid */}
      {filtered.length === 0 ? (
        <div className="bakery-glass rounded-xl p-10 text-center space-y-3">
          <p className="font-display text-xl text-[#292524]">
            {locale === 'ms' ? 'Tiada kek sepadan dengan carian anda.' : 'No cakes match your current filters.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setRangeFilter('all');
              setButterOnly(false);
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-lg bg-[#D97706] text-white text-xs font-semibold"
          >
            {locale === 'ms' ? 'Set Semula Penapis' : 'Reset Filters'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((cake) => (
            <article
              key={cake.id}
              onClick={() => onSelectProduct(cake)}
              className="bakery-glass rounded-xl overflow-hidden cursor-pointer group hover:-translate-y-0.5 transition-transform duration-200 flex flex-col"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-[#F5ECEA]">
                <img
                  src={cake.imageUrl}
                  alt={cake.name[locale]}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                />
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <p className="text-xs text-[#554336]">
                    {cake.baseFat === 'butter' ? t(locale, 'pureButter') : t(locale, 'margarineBase')} ·{' '}
                    {cake.range.toUpperCase()}
                  </p>
                  <h2 className="font-display text-xl font-semibold text-[#292524]">
                    {cake.name[locale]}
                  </h2>
                  <p className="text-sm text-[#554336] line-clamp-2">{cake.flavour[locale]}</p>
                </div>

                <div className="pt-3 border-t border-[#E7DDD3] space-y-3">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    {cake.formats.combo ? (
                      <span className="font-bold text-[#292524] tabular-nums">
                        {formatMYR(cake.formats.combo.priceSen)}{' '}
                        <span className="text-xs font-normal text-[#554336]">/ set (5 kek)</span>
                      </span>
                    ) : (
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        {cake.formats.loaf && (
                          <span className="font-bold text-[#292524] tabular-nums">
                            Loaf {formatMYR(cake.formats.loaf.priceSen)}
                          </span>
                        )}
                        {cake.formats.whole && (
                          <span className="text-xs font-semibold text-[#554336] tabular-nums">
                            Whole {formatMYR(cake.formats.whole.priceSen)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectProduct(cake);
                    }}
                    className="w-full py-2.5 px-4 rounded-lg bg-[#D97706] text-white text-xs font-semibold hover:bg-[#B45309] transition-colors"
                  >
                    {t(locale, 'configureCake')}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Custom Cake Request Modal (FR-07) */}
      {requestOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bakery-sheet w-full max-w-lg rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-[#292524]">
                  {t(locale, 'customRequestTitle')}
                </h2>
                <p className="text-xs text-[#554336] mt-1">{t(locale, 'customRequestSub')}</p>
              </div>
              <button
                type="button"
                onClick={() => setRequestOpen(false)}
                className="p-2 rounded-lg text-[#554336] hover:bg-[#F5ECEA]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reqMessage && (
              <div
                className={`rounded-lg p-3 text-xs ${
                  reqMessage.type === 'ok'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                    : 'bg-[#FFDAD6] text-[#93000A] border border-[#BA1A1A]/30'
                }`}
              >
                {reqMessage.text}
              </div>
            )}

            <form onSubmit={handleSubmitCustomRequest} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#554336] mb-1">
                  {t(locale, 'fullName')} *
                </label>
                <input
                  type="text"
                  required
                  value={reqName}
                  onChange={(e) => setReqName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#DBC2B0] text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#554336] mb-1">
                    {t(locale, 'phoneMY')} *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+60123456789"
                    value={reqPhone}
                    onChange={(e) => setReqPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#DBC2B0] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#554336] mb-1">
                    {t(locale, 'emailAddress')}
                  </label>
                  <input
                    type="email"
                    value={reqEmail}
                    onChange={(e) => setReqEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#DBC2B0] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#554336] mb-1">
                  {locale === 'ms' ? 'Perisa Kek Lapis (Saiz Whole Sahaja)' : 'Requested Flavour (Whole Size Only)'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={locale === 'ms' ? 'Contoh: Pandan Gula Melaka' : 'Example: Pandan Gula Melaka'}
                  value={reqFlavour}
                  onChange={(e) => setReqFlavour(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#DBC2B0] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#554336] mb-1">
                  {locale === 'ms' ? 'Tarikh Diperlukan' : 'Target Date'}
                </label>
                <input
                  type="date"
                  value={reqDate}
                  onChange={(e) => setReqDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#DBC2B0] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#554336] mb-1">
                  {locale === 'ms' ? 'Nota Tambahan' : 'Additional Notes'}
                </label>
                <textarea
                  rows={3}
                  maxLength={400}
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#DBC2B0] text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={reqBusy}
                className="w-full py-2.5 px-4 rounded-lg bg-[#831843] text-white text-sm font-semibold hover:bg-[#6B1236] disabled:opacity-60"
              >
                {reqBusy
                  ? locale === 'ms'
                    ? 'Menghantar...'
                    : 'Sending...'
                  : t(locale, 'requestQuoteBtn')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
