import React from 'react';
import { ArrowRight, Calendar, Package, ShieldCheck, Star, Truck } from 'lucide-react';
import { HERO_IMAGE } from '../data/seedData';
import { t } from '../i18n/translations';
import { formatDateMY, formatMYR } from '../lib/malaysia';
import { Locale, Product, Review, StoreSettings } from '../types/domain';

interface StorefrontHomeProps {
  locale: Locale;
  products: Product[];
  settings: StoreSettings;
  reviews: Review[];
  earliestCourierDate: string | null;
  onSelectProduct: (product: Product) => void;
  onNavigate: (view: 'catalogue' | 'track' | 'info' | 'checkout') => void;
}

export const StorefrontHome: React.FC<StorefrontHomeProps> = ({
  locale,
  products,
  settings,
  reviews,
  earliestCourierDate,
  onSelectProduct,
  onNavigate,
}) => {
  const featured = products.filter((p) => p.active && p.featured).slice(0, 3);
  const displayFeatured = featured.length > 0 ? featured : products.filter((p) => p.active).slice(0, 3);

  const getStartingPriceSen = (p: Product): number => {
    if (p.formats.combo) return p.formats.combo.priceSen;
    if (p.formats.loaf) return p.formats.loaf.priceSen;
    if (p.formats.whole) return p.formats.whole.priceSen;
    return 0;
  };

  return (
    <div className="space-y-12 pb-16">
      {/* Seasonal Campaign Notice */}
      {settings.seasonalCampaign.active && (
        <div className="rounded-xl bg-[#831843] text-[#FFFDF9] px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-sm font-medium">
            {locale === 'ms' ? settings.seasonalCampaign.titleMs : settings.seasonalCampaign.titleEn}
          </div>
          <div className="text-xs text-[#FFD9E1] tabular-nums shrink-0">
            {locale === 'ms' ? 'Tarikh pos terawal' : 'Earliest dispatch'}:{' '}
            {earliestCourierDate ? formatDateMY(earliestCourierDate) : '—'}
          </div>
        </div>
      )}

      {/* Hero Split */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-center space-y-5">
          <p className="text-xs font-semibold tracking-wide text-[#831843]">
            {t(locale, 'heroKicker')}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-bold leading-tight text-[#292524]">
            {t(locale, 'heroTitle')}
          </h1>
          <p className="text-base text-[#554336] leading-relaxed max-w-xl">
            {t(locale, 'heroSubtitle')}
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => onNavigate('catalogue')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#D97706] text-white text-sm font-semibold hover:bg-[#B45309] transition-colors shadow-sm whitespace-nowrap shrink-0"
            >
              <span>{t(locale, 'heroPrimaryCta')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('track')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-[#D97706]/40 text-[#8D4B00] text-sm font-semibold hover:bg-[#FEF3C7]/50 transition-colors whitespace-nowrap shrink-0"
            >
              <span>{t(locale, 'heroSecondaryCta')}</span>
            </button>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="relative h-64 sm:h-80 lg:h-full min-h-[300px] rounded-2xl overflow-hidden border border-[#E7DDD3] bg-[#F5ECEA]">
            <img
              src={HERO_IMAGE}
              alt="D'Mayra Artisanal Sarawak Layer Cake"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-5 text-white">
              <p className="text-xs font-medium text-[#FFDCC3]">
                {locale === 'ms' ? 'Resepi Tradisi Turun-Temurun' : 'Heritage Recipe from Balik Pulau'}
              </p>
              <p className="font-display text-lg font-semibold">
                {locale === 'ms'
                  ? 'Tahan ±5 hari pada suhu bilik selepas dinyahbeku'
                  : 'Keeps ±5 days at room temperature after defrosting'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4-column Fulfillment & Trust Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bakery-glass rounded-xl p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-[#831843] text-sm font-semibold">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>{t(locale, 'nextDispatchLabel')}</span>
          </div>
          <p className="text-sm font-semibold text-[#292524] tabular-nums">
            {earliestCourierDate ? formatDateMY(earliestCourierDate) : 'Isnin–Rabu'}
          </p>
          <p className="text-xs text-[#554336]">
            {locale === 'ms' ? 'Pos kurier Isnin–Rabu · Had harian terkawal' : 'Mon–Wed courier dispatch · Capped daily slots'}
          </p>
        </div>

        <div className="bakery-glass rounded-xl p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-[#831843] text-sm font-semibold">
            <Truck className="w-4 h-4 shrink-0" />
            <span>{locale === 'ms' ? 'Balik Pulau RM 5.00' : 'Balik Pulau RM 5.00'}</span>
          </div>
          <p className="text-sm font-semibold text-[#292524]">
            {locale === 'ms' ? 'Penghantaran Terus Pemilik' : 'Owner Self-Delivery'}
          </p>
          <p className="text-xs text-[#554336]">
            {locale === 'ms'
              ? `Poskod ${settings.selfDelivery.postcodes.join(', ')}`
              : `Postcodes ${settings.selfDelivery.postcodes.join(', ')}`}
          </p>
        </div>

        <div className="bakery-glass rounded-xl p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-[#831843] text-sm font-semibold">
            <Package className="w-4 h-4 shrink-0" />
            <span>{locale === 'ms' ? 'Pos Seluruh Malaysia' : 'Nationwide Courier'}</span>
          </div>
          <p className="text-sm font-semibold text-[#292524]">
            Pos Laju · Citylink · J&T
          </p>
          <p className="text-xs text-[#554336]">
            {locale === 'ms' ? 'Semenanjung RM15 · Sabah RM28 · Sarawak RM26' : 'West MY RM15 · Sabah RM28 · Sarawak RM26'}
          </p>
        </div>

        <div className="bakery-glass rounded-xl p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-[#831843] text-sm font-semibold">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{locale === 'ms' ? 'Bayaran Tempatan' : 'Malaysian Checkout'}</span>
          </div>
          <p className="text-sm font-semibold text-[#292524]">
            FPX · DuitNow QR · Kad
          </p>
          <p className="text-xs text-[#554336]">
            {locale === 'ms' ? 'Kunci slot 30 minit & resit segera' : '30-min slot hold & instant receipt'}
          </p>
        </div>
      </section>

      {/* Featured Cakes (3-column grid) */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#292524]">
              {t(locale, 'featuredHeading')}
            </h2>
            <p className="text-sm text-[#554336] mt-1">{t(locale, 'featuredSub')}</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('catalogue')}
            className="text-sm font-semibold text-[#8D4B00] hover:text-[#831843] inline-flex items-center gap-1 self-start sm:self-auto"
          >
            <span>{locale === 'ms' ? 'Lihat semua 12 kek' : 'View all 12 cakes'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayFeatured.map((cake) => (
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
                  <h3 className="font-display text-xl font-semibold text-[#292524]">
                    {cake.name[locale]}
                  </h3>
                  <p className="text-sm text-[#554336] line-clamp-2">{cake.flavour[locale]}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#E7DDD3]">
                  <div>
                    <span className="text-xs text-[#554336] block">{t(locale, 'fromPrice')}</span>
                    <span className="text-base font-bold text-[#292524] tabular-nums">
                      {formatMYR(getStartingPriceSen(cake))}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[#D97706] group-hover:underline">
                    {t(locale, 'configureCake')}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Customer Reviews */}
      {reviews.length > 0 && (
        <section className="space-y-5">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#292524]">
              {locale === 'ms' ? 'Ulasan Pelanggan Seluruh Malaysia' : 'Customer Reviews Across Malaysia'}
            </h2>
            <p className="text-sm text-[#554336] mt-1">
              {locale === 'ms'
                ? 'Diuji penghantaran ke Lembah Klang, Balik Pulau, Sabah & Sarawak.'
                : 'Proven delivery across Klang Valley, Balik Pulau, Sabah & Sarawak.'}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {reviews.slice(0, 3).map((rev) => (
              <div key={rev.id} className="bakery-glass rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-1 text-[#D97706]">
                  {Array.from({ length: rev.rating }).map((_, idx) => (
                    <Star key={idx} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm text-[#292524] leading-relaxed">“{rev.text}”</p>
                <p className="text-xs text-[#554336] font-medium">
                  {rev.authorName} · {rev.orderNo}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
