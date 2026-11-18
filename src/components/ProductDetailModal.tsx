import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, Info, Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { t } from '../i18n/translations';
import { formatMYR } from '../lib/malaysia';
import { calculatePrice } from '../lib/pricing';
import { CakeFormat, CartItem, Locale, Product } from '../types/domain';

interface ProductDetailModalProps {
  product: Product | null;
  locale: Locale;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  locale,
  onClose,
  onAddToCart,
}) => {
  const isCombo = Boolean(product?.range === 'budget' || product?.comboRule);
  const initialFormat: CakeFormat = isCombo
    ? 'combo'
    : product?.formats.whole
    ? 'whole'
    : 'loaf';

  const [format, setFormat] = useState<CakeFormat>(initialFormat);
  const [quantity, setQuantity] = useState(1);
  const [comboPicks, setComboPicks] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const effectiveFormat: CakeFormat = product
    ? product.range === 'budget' || product.comboRule
      ? 'combo'
      : format === 'combo'
      ? product.formats.whole
        ? 'whole'
        : 'loaf'
      : format
    : 'whole';

  const priceCalc = useMemo(() => {
    if (!product) return null;
    return calculatePrice(product, {
      format: effectiveFormat,
      quantity,
      comboPicks,
      notes,
    });
  }, [product, effectiveFormat, quantity, comboPicks, notes]);

  if (!product || !priceCalc) return null;

  const comboFlavours = product.comboRule?.flavours || product.formats.combo?.flavours || [];
  const pickTarget = product.comboRule?.pickCount || 5;

  const toggleComboFlavour = (flavour: string) => {
    setErrorMsg(null);
    setComboPicks((prev) => {
      if (prev.includes(flavour)) {
        return prev.filter((item) => item !== flavour);
      }
      if (prev.length >= pickTarget) {
        return prev;
      }
      return [...prev, flavour];
    });
  };

  const handleAdd = () => {
    if (!priceCalc.valid) {
      if (priceCalc.errorCode === 'INVALID_COMBO_COUNT') {
        setErrorMsg(
          locale === 'ms'
            ? `Sila pilih tepat ${pickTarget} perisa untuk Set Budget Combo.`
            : `Please select exactly ${pickTarget} flavours for the Budget Combo.`
        );
      } else if (priceCalc.errorCode === 'NOTES_TOO_LONG') {
        setErrorMsg(
          locale === 'ms'
            ? 'Nota melebihi had maksimum 200 aksara.'
            : 'Notes cannot exceed 200 characters.'
        );
      } else {
        setErrorMsg(
          locale === 'ms' ? 'Sila semak pilihan konfigurasi kek anda.' : 'Please verify your cake options.'
        );
      }
      return;
    }

    onAddToCart({
      id: `${product.id}-${effectiveFormat}-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      imageUrl: product.imageUrl,
      range: product.range,
      baseFat: product.baseFat,
      leadTimeDays: product.leadTimeDays,
      format: effectiveFormat,
      quantity,
      comboPicks: effectiveFormat === 'combo' ? comboPicks : [],
      notes: priceCalc.sanitizedNotes,
      unitPriceSen: priceCalc.unitPriceSen,
      lineTotalSen: priceCalc.lineTotalSen,
      capacitySlots: priceCalc.capacitySlots,
      packedWeightGrams: priceCalc.packedWeightGrams,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={product.name[locale]}
    >
      <div className="bakery-sheet relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl p-5 sm:p-7">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-lg bg-[#F5ECEA] text-[#554336] hover:text-[#292524]"
          aria-label={locale === 'ms' ? 'Tutup' : 'Close'}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Image & Ingredients Left */}
          <div className="md:col-span-5 space-y-4">
            <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-[#F5ECEA] border border-[#E7DDD3]">
              <img
                src={product.imageUrl}
                alt={product.name[locale]}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="rounded-xl bg-[#FAF7F2] border border-[#E7DDD3] p-4 space-y-2.5 text-xs text-[#554336]">
              <div>
                <p className="font-semibold text-[#292524]">{t(locale, 'ingredientsLabel')}</p>
                <p className="mt-1 leading-relaxed">{product.ingredients[locale]}</p>
              </div>
              <div className="pt-2 border-t border-[#E7DDD3]">
                <p className="font-semibold text-[#831843]">{t(locale, 'allergenLabel')}</p>
                <p className="mt-1 font-medium text-[#292524]">
                  {product.allergens.join(' · ')}
                </p>
                <p className="mt-1 text-[11px]">{t(locale, 'allergenKitchenWarning')}</p>
              </div>
            </div>

            <div className="rounded-xl bg-[#FEF3C7]/60 border border-[#FCD34D] p-3.5 flex items-start gap-2.5 text-xs text-[#92400E]">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t(locale, 'shelfLifeBanner')}</span>
            </div>
          </div>

          {/* Contiguous Purchase Module Right */}
          <div className="md:col-span-7 space-y-5 pr-0 md:pr-4">
            <div>
              <p className="text-xs font-semibold text-[#831843]">
                {product.baseFat === 'butter' ? t(locale, 'pureButter') : t(locale, 'margarineBase')} ·{' '}
                {product.range.toUpperCase()} · {locale === 'ms' ? `Siap ${product.leadTimeDays} hari` : `${product.leadTimeDays}-day lead time`}
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#292524] mt-1">
                {product.name[locale]}
              </h2>
              <p className="text-sm text-[#554336] mt-2 leading-relaxed">
                {product.description[locale]}
              </p>
            </div>

            {product.durianNotice && (
              <div className="rounded-lg bg-[#FFF8F6] border border-[#E5A93C]/50 p-3 flex items-start gap-2 text-xs text-[#8D4B00]">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{t(locale, 'durianNoticeText')}</span>
              </div>
            )}

            {/* Format Selector */}
            {effectiveFormat === 'combo' ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-[#D97706] bg-[#FEF3C7]/40 p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#292524]">{t(locale, 'formatCombo')}</p>
                    <p className="text-xs text-[#554336]">
                      {locale === 'ms' ? '5 kek saiz Whole dalam satu set' : '5 Whole cakes per set'}
                    </p>
                  </div>
                  <span className="text-base font-bold text-[#831843] tabular-nums">
                    {formatMYR(priceCalc.unitPriceSen)}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[#292524]">{t(locale, 'comboRuleHint')}</span>
                    <span className="text-[#831843] tabular-nums">
                      {t(locale, 'comboPickedCount')}: {comboPicks.length} / {pickTarget}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {comboFlavours.map((flv) => {
                      const picked = comboPicks.includes(flv);
                      const disabled = !picked && comboPicks.length >= pickTarget;
                      return (
                        <button
                          key={flv}
                          type="button"
                          onClick={() => toggleComboFlavour(flv)}
                          disabled={disabled}
                          className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-left text-xs font-medium transition-colors ${
                            picked
                              ? 'border-[#831843] bg-[#831843] text-white'
                              : disabled
                              ? 'border-[#E7DDD3] bg-[#FAF7F2] text-[#887364] opacity-55 cursor-not-allowed'
                              : 'border-[#DBC2B0] bg-white text-[#292524] hover:border-[#D97706]'
                          }`}
                        >
                          <span className="truncate">{flv}</span>
                          {picked && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="block text-xs font-semibold text-[#554336]">
                  {locale === 'ms' ? 'Pilih Saiz Kek' : 'Select Cake Format'}
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {product.formats.whole && (
                    <button
                      type="button"
                      onClick={() => setFormat('whole')}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        effectiveFormat === 'whole'
                          ? 'border-[#D97706] bg-[#FEF3C7]/50'
                          : 'border-[#DBC2B0] bg-white hover:border-[#D97706]/60'
                      }`}
                    >
                      <span className="block text-xs font-semibold text-[#554336]">
                        {t(locale, 'formatWhole')}
                      </span>
                      <span className="block text-base font-bold text-[#292524] tabular-nums mt-0.5">
                        {formatMYR(product.formats.whole.priceSen)}
                      </span>
                      <span className="block text-[11px] text-[#554336] mt-0.5 tabular-nums">
                        ±{product.formats.whole.packedWeightGrams}g · 1.0 slot
                      </span>
                    </button>
                  )}

                  {product.formats.loaf && (
                    <button
                      type="button"
                      onClick={() => setFormat('loaf')}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        effectiveFormat === 'loaf'
                          ? 'border-[#D97706] bg-[#FEF3C7]/50'
                          : 'border-[#DBC2B0] bg-white hover:border-[#D97706]/60'
                      }`}
                    >
                      <span className="block text-xs font-semibold text-[#554336]">
                        {t(locale, 'formatLoaf')}
                      </span>
                      <span className="block text-base font-bold text-[#292524] tabular-nums mt-0.5">
                        {formatMYR(product.formats.loaf.priceSen)}
                      </span>
                      <span className="block text-[11px] text-[#554336] mt-0.5 tabular-nums">
                        ±{product.formats.loaf.packedWeightGrams}g · 0.25 slot
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Quantity Stepper (1-10) */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#554336]">{t(locale, 'quantityLabel')}</span>
              <div className="inline-flex items-center rounded-lg border border-[#DBC2B0] bg-white">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-2.5 text-[#554336] hover:text-[#292524] disabled:opacity-40"
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 text-sm font-bold text-[#292524] tabular-nums">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  className="p-2.5 text-[#554336] hover:text-[#292524] disabled:opacity-40"
                  disabled={quantity >= 10}
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notes Box (max 200 chars) */}
            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-[#554336] mb-1">
                <label htmlFor="cake-notes">{t(locale, 'notesLabel')}</label>
                <span className="tabular-nums">{notes.length}/200</span>
              </div>
              <textarea
                id="cake-notes"
                rows={2}
                maxLength={200}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t(locale, 'notesPlaceholder')}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#DBC2B0] text-sm text-[#292524] focus:outline-none focus:border-[#D97706]"
              />
            </div>

            {errorMsg && (
              <div className="rounded-lg bg-[#FFDAD6] border border-[#BA1A1A]/30 px-3 py-2 text-xs text-[#93000A]">
                {errorMsg}
              </div>
            )}

            {/* Live Price + Add CTA */}
            <div className="pt-3 border-t border-[#E7DDD3] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs text-[#554336] block">
                  {locale === 'ms' ? 'Anggaran Jumlah Item' : 'Live Item Total'}
                </span>
                <span className="text-2xl font-bold text-[#292524] tabular-nums">
                  {formatMYR(priceCalc.lineTotalSen)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleAdd}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#D97706] text-white text-sm font-semibold hover:bg-[#B45309] transition-colors shadow-sm"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{t(locale, 'addToCart')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
