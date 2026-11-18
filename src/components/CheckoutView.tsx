import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  CreditCard,
  Info,
  Lock,
  Minus,
  Plus,
  QrCode,
  Trash2,
  Truck,
  Upload,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../i18n/translations';
import {
  formatDateMY,
  formatMYR,
  getDestinationRegion,
  getKualaLumpurTodayISO,
  isBalikPulauPostcode,
  MALAYSIAN_STATES,
  validateMalaysiaPhone,
  validateMalaysianPostcode,
} from '../lib/malaysia';
import { calculateCartTotals } from '../lib/pricing';
import { getAvailableDates } from '../lib/scheduling';
import {
  completeOrderPayment,
  createOrderWithCapacityHold,
  validatePromoCode,
} from '../services/firestoreService';
import {
  CapacityDay,
  CartItem,
  CourierId,
  FulfilmentMethod,
  Locale,
  Order,
  OrderTracking,
  PaymentMethod,
  Product,
  PromoCode,
  ShippingRate,
  StoreSettings,
} from '../types/domain';

interface CheckoutViewProps {
  locale: Locale;
  cart: CartItem[];
  products: Product[];
  shippingRates: ShippingRate[];
  settings: StoreSettings;
  capacity: CapacityDay[];
  onUpdateQty: (itemId: string, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onClearCart: () => void;
  onBrowseCatalogue: () => void;
  onOrderCompleted: (tracking: OrderTracking) => void;
  onOpenAuth: () => void;
}

const FPX_BANKS = [
  'Maybank2u',
  'CIMB Clicks',
  'Public Bank (PBe)',
  'RHB Now',
  'Hong Leong Connect',
  'Bank Islam',
  'AmOnline',
];

export const CheckoutView: React.FC<CheckoutViewProps> = ({
  locale,
  cart,
  products,
  shippingRates,
  settings,
  capacity,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onBrowseCatalogue,
  onOrderCompleted,
  onOpenAuth,
}) => {
  const { firebaseUser, account, customerProfile } = useAuth();

  const [buyerName, setBuyerName] = useState(account?.displayName || '');
  const [buyerPhone, setBuyerPhone] = useState(customerProfile?.phone || '');
  const [buyerEmail, setBuyerEmail] = useState(account?.email || '');
  const [sameAsBuyer, setSameAsBuyer] = useState(true);
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');

  const [address, setAddress] = useState('');
  const [state, setState] = useState<string>('Pulau Pinang');
  const [postcode, setPostcode] = useState('');

  const [selectedMethod, setSelectedMethod] = useState<FulfilmentMethod>('courier');
  const [selectedCourier, setSelectedCourier] = useState<CourierId>('jnt');
  const [selectedDate, setSelectedDate] = useState('');
  const [payDepositOnly, setPayDepositOnly] = useState(false);

  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [promoFeedback, setPromoFeedback] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Payment Gateway Modal State
  const [pendingOrder, setPendingOrder] = useState<{ order: Order; tracking: OrderTracking } | null>(
    null
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('fpx');
  const [fpxBank, setFpxBank] = useState(FPX_BANKS[0]);
  const [receiptRef, setReceiptRef] = useState('');
  const [holdSeconds, setHoldSeconds] = useState(1800);
  const [paymentBusy, setPaymentBusy] = useState(false);

  useEffect(() => {
    if (account && !buyerName) setBuyerName(account.displayName);
    if (account && !buyerEmail) setBuyerEmail(account.email);
    if (customerProfile?.phone && !buyerPhone) setBuyerPhone(customerProfile.phone);
  }, [account, customerProfile, buyerName, buyerEmail, buyerPhone]);

  useEffect(() => {
    if (!pendingOrder) return;
    const timer = window.setInterval(() => {
      setHoldSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [pendingOrder]);

  const postcodeCheck = useMemo(
    () => validateMalaysianPostcode(postcode, state),
    [postcode, state]
  );
  const qualifiesBalikPulau = useMemo(
    () =>
      settings.selfDelivery.enabled &&
      state === 'Pulau Pinang' &&
      postcodeCheck.valid &&
      isBalikPulauPostcode(postcode, settings.selfDelivery.postcodes),
    [settings.selfDelivery, state, postcode, postcodeCheck.valid]
  );

  useEffect(() => {
    if (!qualifiesBalikPulau && selectedMethod === 'self_delivery') {
      setSelectedMethod('courier');
      setPayDepositOnly(false);
    }
  }, [qualifiesBalikPulau, selectedMethod]);

  const destinationRegion = useMemo(
    () => getDestinationRegion(state, postcode),
    [state, postcode]
  );

  const availableCourierRates = useMemo(() => {
    if (destinationRegion === 'unsupported') return [];
    return shippingRates.filter((r) => r.region === destinationRegion && r.active);
  }, [shippingRates, destinationRegion]);

  useEffect(() => {
    if (
      availableCourierRates.length > 0 &&
      !availableCourierRates.some((r) => r.courier === selectedCourier)
    ) {
      setSelectedCourier(availableCourierRates[0].courier);
    }
  }, [availableCourierRates, selectedCourier]);

  const activeCourierRate = useMemo(
    () => availableCourierRates.find((r) => r.courier === selectedCourier) || null,
    [availableCourierRates, selectedCourier]
  );

  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const maxLeadTime = useMemo(() => {
    if (cart.length === 0) return settings.defaultLeadTimeDays;
    return Math.max(...cart.map((c) => c.leadTimeDays), settings.defaultLeadTimeDays);
  }, [cart, settings.defaultLeadTimeDays]);

  const totalRequiredSlots = useMemo(
    () => Number(cart.reduce((acc, it) => acc + it.capacitySlots, 0).toFixed(2)),
    [cart]
  );

  const capacityMap = useMemo(() => new Map(capacity.map((c) => [c.date, c])), [capacity]);

  const scheduleDates = useMemo(
    () =>
      getAvailableDates({
        leadTimeDays: maxLeadTime,
        requiredSlots: totalRequiredSlots,
        fulfilmentMethod: selectedMethod,
        settings,
        capacityMap,
        horizonDays: 35,
      }),
    [maxLeadTime, totalRequiredSlots, selectedMethod, settings, capacityMap]
  );

  useEffect(() => {
    const currentValid = scheduleDates.find((d) => d.date === selectedDate && d.available);
    if (!currentValid) {
      const firstAvail = scheduleDates.find((d) => d.available);
      setSelectedDate(firstAvail ? firstAvail.date : '');
    }
  }, [scheduleDates, selectedDate]);

  const shippingFeeSen = useMemo(() => {
    if (selectedMethod === 'self_delivery' && qualifiesBalikPulau) {
      return settings.selfDelivery.feeSen;
    }
    return activeCourierRate ? activeCourierRate.feeSen : 0;
  }, [selectedMethod, qualifiesBalikPulau, settings.selfDelivery.feeSen, activeCourierRate]);

  const totals = useMemo(
    () =>
      calculateCartTotals({
        items: cart,
        productsById,
        shippingFeeSen,
        fulfilmentMethod: selectedMethod,
        promo: appliedPromo,
        freeShippingThresholdSen: settings.freeShippingThresholdSen,
        selfDeliveryConfig: settings.selfDelivery,
        payDepositOnly,
        todayISO: getKualaLumpurTodayISO(),
      }),
    [
      cart,
      productsById,
      shippingFeeSen,
      selectedMethod,
      appliedPromo,
      settings.freeShippingThresholdSen,
      settings.selfDelivery,
      payDepositOnly,
    ]
  );

  const handleApplyPromo = async () => {
    setPromoFeedback(null);
    if (!promoInput.trim()) return;
    const found = await validatePromoCode(promoInput);
    if (!found) {
      setAppliedPromo(null);
      setPromoFeedback(
        locale === 'ms' ? 'Kod promo tidak sah atau telah tamat.' : 'Invalid or expired promo code.'
      );
      return;
    }
    if (totals.subtotalSen < found.minSpendSen) {
      setAppliedPromo(null);
      setPromoFeedback(
        locale === 'ms'
          ? `Perbelanjaan minimum ${formatMYR(found.minSpendSen)} diperlukan.`
          : `Minimum spend of ${formatMYR(found.minSpendSen)} required.`
      );
      return;
    }
    setAppliedPromo(found);
    setPromoFeedback(
      locale === 'ms' ? `Kod ${found.code} berjaya digunakan!` : `Promo ${found.code} applied!`
    );
  };

  const handleApplySavedAddress = (savedId: string) => {
    const addr = customerProfile?.savedAddresses.find((a) => a.id === savedId);
    if (!addr) return;
    setSameAsBuyer(false);
    setRecipientName(addr.recipientName);
    setRecipientPhone(addr.recipientPhone);
    setAddress(addr.address);
    setState(addr.state);
    setPostcode(addr.postcode);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (cart.length === 0) return;

    const bPhone = validateMalaysiaPhone(buyerPhone);
    if (buyerName.trim().length < 2) {
      setFormError(locale === 'ms' ? 'Sila masukkan nama pembeli.' : 'Please enter buyer name.');
      return;
    }
    if (!bPhone.valid) {
      setFormError(
        locale === 'ms'
          ? 'No. telefon pembeli tidak sah. Gunakan format +60 (cth: 0123456789).'
          : 'Invalid buyer phone number (+60 format required).'
      );
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail.trim())) {
      setFormError(locale === 'ms' ? 'Alamat emel tidak sah.' : 'Invalid email address.');
      return;
    }

    const finalRecName = sameAsBuyer ? buyerName.trim() : recipientName.trim();
    const recPhoneCheck = sameAsBuyer
      ? bPhone
      : validateMalaysiaPhone(recipientPhone);

    if (finalRecName.length < 2 || !recPhoneCheck.valid) {
      setFormError(
        locale === 'ms'
          ? 'Sila lengkapkan nama & no. telefon penerima (+60).'
          : 'Please complete recipient name and valid +60 phone.'
      );
      return;
    }

    if (address.trim().length < 8) {
      setFormError(
        locale === 'ms'
          ? 'Sila masukkan alamat penghantaran penuh.'
          : 'Please enter the full delivery street address.'
      );
      return;
    }

    if (!postcodeCheck.valid) {
      setFormError(
        postcodeCheck.reason === 'unserved'
          ? locale === 'ms'
            ? 'Harap maaf, tiada perkhidmatan kurier untuk poskod luar kawasan ini.'
            : 'Sorry, this postcode is outside all courier service zones.'
          : postcodeCheck.reason === 'mismatch'
          ? locale === 'ms'
            ? `Poskod ${postcode} tidak sepadan dengan negeri ${state}.`
            : `Postcode ${postcode} does not match state ${state}.`
          : locale === 'ms'
          ? 'Sila masukkan poskod 5 digit yang sah.'
          : 'Please enter a valid 5-digit Malaysian postcode.'
      );
      return;
    }

    if (selectedMethod === 'courier' && !activeCourierRate) {
      setFormError(
        locale === 'ms'
          ? 'Tiada kurier aktif untuk destinasi ini.'
          : 'No active courier available for this destination.'
      );
      return;
    }

    if (!selectedDate) {
      setFormError(
        locale === 'ms'
          ? 'Sila pilih tarikh pos atau penghantaran yang tersedia.'
          : 'Please choose an available dispatch/delivery date.'
      );
      return;
    }

    if (!termsAccepted) {
      setFormError(
        locale === 'ms'
          ? 'Anda mesti bersetuju dengan Terma Tempahan & Notis Privasi sebelum membayar.'
          : 'You must accept the Order Terms and Privacy Notice before payment.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const created = await createOrderWithCapacityHold({
        buyerUid: firebaseUser?.uid ?? null,
        buyer: {
          name: buyerName.trim(),
          phone: bPhone.normalized,
          email: buyerEmail.trim(),
        },
        recipient: {
          name: finalRecName,
          phone: recPhoneCheck.normalized,
        },
        items: cart,
        products,
        fulfilment: {
          method: selectedMethod,
          courier: selectedMethod === 'courier' ? selectedCourier : null,
          courierName:
            selectedMethod === 'self_delivery'
              ? locale === 'ms'
                ? 'Penghantaran Terus Balik Pulau'
                : 'Balik Pulau Owner Delivery'
              : activeCourierRate?.courierName || 'Courier',
          address: address.trim(),
          state,
          postcode: postcode.trim(),
          region:
            selectedMethod === 'self_delivery'
              ? 'balik_pulau'
              : (destinationRegion as 'west_malaysia' | 'sabah' | 'sarawak'),
          dispatchDate: selectedDate,
          estimatedArrival:
            selectedMethod === 'self_delivery'
              ? locale === 'ms'
                ? 'Hari yang sama (Balik Pulau)'
                : 'Same day (Balik Pulau)'
              : `${activeCourierRate?.estimatedDaysMin}-${activeCourierRate?.estimatedDaysMax} ${
                  locale === 'ms' ? 'hari bekerja' : 'working days'
                }`,
        },
        shippingFeeSen,
        promo: appliedPromo,
        settings,
        payDepositOnly,
        paymentMethod,
        termsAccepted,
      });

      setPendingOrder(created);
      setHoldSeconds(1800);
    } catch (err) {
      if (err instanceof Error && err.message === 'CAPACITY_EXCEEDED') {
        setFormError(
          locale === 'ms'
            ? 'Tarikh yang dipilih tidak lagi mempunyai slot mencukupi. Sila pilih tarikh lain.'
            : 'Selected date no longer has enough baking capacity. Please choose another date.'
        );
      } else {
        setFormError(
          locale === 'ms'
            ? 'Gagal mencipta pesanan. Sila semak sambungan dan cuba semula.'
            : 'Unable to create order. Please check your connection and try again.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmGatewayPayment = async () => {
    if (!pendingOrder) return;
    if (paymentMethod === 'bank_transfer' && receiptRef.trim().length < 4) {
      setFormError(
        locale === 'ms'
          ? 'Sila masukkan nombor rujukan resit pindahan bank.'
          : 'Please provide your bank transfer receipt reference.'
      );
      return;
    }

    setPaymentBusy(true);
    try {
      const completed = await completeOrderPayment({
        order: pendingOrder.order,
        tracking: pendingOrder.tracking,
        method: paymentMethod,
        bankName: paymentMethod === 'fpx' ? fpxBank : undefined,
        receiptRef: paymentMethod === 'bank_transfer' ? receiptRef.trim() : undefined,
      });
      onClearCart();
      setPendingOrder(null);
      onOrderCompleted(completed.tracking);
    } catch {
      setFormError(
        locale === 'ms' ? 'Pengesahan bayaran gagal. Sila cuba lagi.' : 'Payment confirmation failed.'
      );
    } finally {
      setPaymentBusy(false);
    }
  };

  if (cart.length === 0 && !pendingOrder) {
    return (
      <div className="bakery-glass rounded-2xl p-10 text-center space-y-4 my-8">
        <h1 className="font-display text-3xl font-bold text-[#292524]">
          {t(locale, 'cartTitle')}
        </h1>
        <p className="text-sm text-[#554336]">{t(locale, 'cartEmpty')}</p>
        <button
          type="button"
          onClick={onBrowseCatalogue}
          className="px-6 py-3 rounded-xl bg-[#D97706] text-white text-sm font-semibold hover:bg-[#B45309]"
        >
          {t(locale, 'browseCakes')}
        </button>
      </div>
    );
  }

  const formatCountdown = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onBrowseCatalogue}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8D4B00] hover:underline mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{locale === 'ms' ? 'Tambah kek lain' : 'Continue browsing'}</span>
          </button>
          <h1 className="font-display text-3xl font-bold text-[#292524]">
            {t(locale, 'checkoutTitle')}
          </h1>
        </div>

        {!firebaseUser && (
          <button
            type="button"
            onClick={onOpenAuth}
            className="text-xs font-semibold text-[#831843] border border-[#831843]/30 px-3.5 py-2 rounded-lg hover:bg-[#831843]/5 whitespace-nowrap"
          >
            {t(locale, 'signInGoogle')}
          </button>
        )}
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* Buyer Details */}
          <section className="bakery-glass rounded-xl p-5 space-y-4">
            <h2 className="font-display text-xl font-semibold text-[#292524]">
              1. {t(locale, 'buyerSection')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#554336] mb-1">
                  {t(locale, 'fullName')} *
                </label>
                <input
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-white border border-[#DBC2B0] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#554336] mb-1">
                  {t(locale, 'phoneMY')} *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+60123456789"
                  value={buyerPhone}
                  onChange={(e) => setBuyerPhone(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-white border border-[#DBC2B0] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#554336] mb-1">
                  {t(locale, 'emailAddress')} *
                </label>
                <input
                  type="email"
                  required
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-white border border-[#DBC2B0] text-sm"
                />
              </div>
            </div>
          </section>

          {/* Recipient & Address */}
          <section className="bakery-glass rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-xl font-semibold text-[#292524]">
                2. {t(locale, 'recipientSection')}
              </h2>

              {customerProfile && customerProfile.savedAddresses.length > 0 && (
                <select
                  onChange={(e) => handleApplySavedAddress(e.target.value)}
                  defaultValue=""
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-[#DBC2B0] text-xs text-[#292524]"
                >
                  <option value="" disabled>
                    {locale === 'ms' ? 'Pilih Alamat Tersimpan' : 'Use Saved Address'}
                  </option>
                  {customerProfile.savedAddresses.map((sa) => (
                    <option key={sa.id} value={sa.id}>
                      {sa.label} ({sa.postcode})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#554336] cursor-pointer">
              <input
                type="checkbox"
                checked={sameAsBuyer}
                onChange={(e) => setSameAsBuyer(e.target.checked)}
                className="rounded border-[#DBC2B0] text-[#D97706]"
              />
              <span>{t(locale, 'sameAsBuyer')}</span>
            </label>

            {!sameAsBuyer && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#554336] mb-1">
                    {locale === 'ms' ? 'Nama Penerima' : 'Recipient Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-white border border-[#DBC2B0] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#554336] mb-1">
                    {locale === 'ms' ? 'Telefon Penerima (+60)' : 'Recipient Phone (+60)'} *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+60123456789"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-white border border-[#DBC2B0] text-sm"
                  />
                </div>
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#554336] mb-1">
                  {t(locale, 'streetAddress')} *
                </label>
                <textarea
                  rows={2}
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="No. rumah, nama jalan, taman..."
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#DBC2B0] text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#554336] mb-1">
                    {t(locale, 'stateLabel')} *
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-white border border-[#DBC2B0] text-sm"
                  >
                    {MALAYSIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#554336] mb-1">
                    {t(locale, 'postcodeLabel')} *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    inputMode="numeric"
                    placeholder="11000"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    className="w-full px-3 py-2.5 rounded-lg bg-white border border-[#DBC2B0] text-sm tabular-nums"
                  />
                  {postcode.length === 5 && !postcodeCheck.valid && (
                    <p className="text-[11px] text-[#BA1A1A] mt-1">
                      {postcodeCheck.reason === 'unserved'
                        ? locale === 'ms'
                          ? 'Poskod tidak diliputi perkhidmatan kurier.'
                          : 'Postcode not served by couriers.'
                        : locale === 'ms'
                        ? `Poskod tidak sepadan dengan ${state}.`
                        : `Postcode does not match ${state}.`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Fulfilment & Courier Selection */}
          <section className="bakery-glass rounded-xl p-5 space-y-4">
            <h2 className="font-display text-xl font-semibold text-[#292524]">
              3. {t(locale, 'fulfilmentMethod')}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedMethod('courier');
                  setPayDepositOnly(false);
                }}
                className={`p-3.5 rounded-xl border text-left transition-colors ${
                  selectedMethod === 'courier'
                    ? 'border-[#D97706] bg-[#FEF3C7]/45'
                    : 'border-[#DBC2B0] bg-white'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-sm text-[#292524]">
                  <Truck className="w-4 h-4 text-[#831843]" />
                  <span>{t(locale, 'courierTitle')}</span>
                </div>
                <p className="text-xs text-[#554336] mt-1">
                  Pos Laju · City-Link · J&T
                </p>
              </button>

              {qualifiesBalikPulau ? (
                <button
                  type="button"
                  onClick={() => setSelectedMethod('self_delivery')}
                  className={`p-3.5 rounded-xl border text-left transition-colors ${
                    selectedMethod === 'self_delivery'
                      ? 'border-[#831843] bg-[#FFD9E1]/40'
                      : 'border-[#DBC2B0] bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 font-semibold text-sm text-[#831843]">
                    <span>{t(locale, 'selfDeliveryTitle')}</span>
                    <span className="tabular-nums">{formatMYR(settings.selfDelivery.feeSen)}</span>
                  </div>
                  <p className="text-xs text-[#554336] mt-1">{t(locale, 'selfDeliveryFeeNote')}</p>
                </button>
              ) : (
                <div className="p-3.5 rounded-xl border border-dashed border-[#DBC2B0] bg-[#FAF7F2] text-xs text-[#554336]">
                  <p className="font-semibold text-[#292524]">{t(locale, 'selfDeliveryTitle')}</p>
                  <p className="mt-1">
                    {locale === 'ms'
                      ? `Tersedia hanya untuk poskod Balik Pulau (${settings.selfDelivery.postcodes.join(', ')}).`
                      : `Available exclusively for Balik Pulau postcodes (${settings.selfDelivery.postcodes.join(', ')}).`}
                  </p>
                </div>
              )}
            </div>

            {selectedMethod === 'courier' && (
              <div className="space-y-2.5 pt-1">
                <label className="block text-xs font-semibold text-[#554336]">
                  {t(locale, 'selectCourier')}
                </label>
                {availableCourierRates.length === 0 ? (
                  <p className="text-xs text-[#BA1A1A]">
                    {locale === 'ms'
                      ? 'Masukkan negeri dan poskod 5 digit yang sah untuk melihat kadar kurier.'
                      : 'Enter a valid Malaysian state and 5-digit postcode to view courier options.'}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {availableCourierRates.map((rate) => (
                      <button
                        key={rate.id}
                        type="button"
                        onClick={() => setSelectedCourier(rate.courier)}
                        className={`p-3 rounded-xl border text-left transition-colors ${
                          selectedCourier === rate.courier
                            ? 'border-[#D97706] bg-[#FEF3C7]/45'
                            : 'border-[#DBC2B0] bg-white hover:border-[#D97706]/60'
                        }`}
                      >
                        <p className="text-xs font-bold text-[#292524]">{rate.courierName}</p>
                        <p className="text-sm font-bold text-[#831843] tabular-nums mt-0.5">
                          {formatMYR(rate.feeSen)}
                        </p>
                        <p className="text-[11px] text-[#554336] mt-0.5">
                          {rate.estimatedDaysMin}–{rate.estimatedDaysMax}{' '}
                          {locale === 'ms' ? 'hari bekerja' : 'working days'}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Deposit Option ONLY for Balik Pulau if enabled by Owner */}
            {selectedMethod === 'self_delivery' &&
              qualifiesBalikPulau &&
              settings.selfDelivery.depositEnabled && (
                <label className="flex items-center gap-2.5 rounded-lg bg-[#FEF3C7]/50 border border-[#FCD34D] p-3 text-xs font-semibold text-[#92400E] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={payDepositOnly}
                    onChange={(e) => setPayDepositOnly(e.target.checked)}
                    className="rounded border-[#D97706] text-[#D97706]"
                  />
                  <span>{t(locale, 'depositToggle')}</span>
                </label>
              )}
          </section>

          {/* Date Picker */}
          <section className="bakery-glass rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-xl font-semibold text-[#292524] flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#831843]" />
                  <span>4. {t(locale, 'selectDate')}</span>
                </h2>
                <p className="text-xs text-[#554336] mt-1">
                  {selectedMethod === 'courier'
                    ? t(locale, 'dateHelperCourier')
                    : t(locale, 'dateHelperSelf')}
                </p>
              </div>
              <span className="text-xs font-semibold text-[#831843] tabular-nums shrink-0">
                {totalRequiredSlots} slot
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-1">
              {scheduleDates.slice(0, 28).map((d) => {
                const isSelected = selectedDate === d.date;
                const dayLabel = new Date(`${d.date}T00:00:00Z`).toLocaleDateString(
                  locale === 'ms' ? 'ms-MY' : 'en-MY',
                  { weekday: 'short', timeZone: 'UTC' }
                );
                return (
                  <button
                    key={d.date}
                    type="button"
                    disabled={!d.available}
                    onClick={() => setSelectedDate(d.date)}
                    className={`p-2.5 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'border-[#831843] bg-[#831843] text-white'
                        : d.available
                        ? 'border-[#DBC2B0] bg-white hover:border-[#D97706] text-[#292524]'
                        : 'border-[#E7DDD3] bg-[#F5ECEA]/60 text-[#887364] opacity-55 cursor-not-allowed'
                    }`}
                  >
                    <p className="text-[11px] font-semibold">
                      {dayLabel} · {formatDateMY(d.date)}
                    </p>
                    <p className="text-[10px] mt-0.5 tabular-nums">
                      {d.available
                        ? locale === 'ms'
                          ? `Baki ${d.remainingSlots} slot`
                          : `${d.remainingSlots} slots left`
                        : d.reason === 'before_lead_time'
                        ? locale === 'ms'
                          ? 'Tempoh siap'
                          : 'Lead time'
                        : d.reason === 'blocked_holiday'
                        ? locale === 'ms'
                          ? 'Tutup'
                          : 'Blocked'
                        : d.reason === 'at_capacity'
                        ? locale === 'ms'
                          ? 'Penuh'
                          : 'Full'
                        : locale === 'ms'
                        ? 'Tiada pos'
                        : 'No dispatch'}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Summary Column */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-20">
          <div className="bakery-glass rounded-xl p-5 space-y-4">
            <h2 className="font-display text-xl font-semibold text-[#292524]">
              {locale === 'ms' ? 'Ringkasan Pesanan' : 'Order Summary'}
            </h2>

            <div className="divide-y divide-[#E7DDD3]">
              {cart.map((item) => (
                <div key={item.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-semibold text-[#292524] truncate">
                      {item.productName[locale]}
                    </p>
                    <p className="text-xs text-[#554336]">
                      {item.format.toUpperCase()} · {formatMYR(item.unitPriceSen)}
                    </p>
                    {item.comboPicks.length > 0 && (
                      <p className="text-[11px] text-[#831843]">
                        {item.comboPicks.join(', ')}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-[11px] text-[#554336] italic">“{item.notes}”</p>
                    )}
                    <div className="inline-flex items-center gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.id, -1)}
                        className="p-1 rounded border border-[#DBC2B0] bg-white"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-xs font-semibold tabular-nums">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.id, 1)}
                        className="p-1 rounded border border-[#DBC2B0] bg-white"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(item.id)}
                        className="p-1 ml-2 text-[#BA1A1A] hover:bg-[#FFDAD6] rounded"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-[#292524] tabular-nums shrink-0">
                    {formatMYR(item.lineTotalSen)}
                  </p>
                </div>
              ))}
            </div>

            {/* Promo Code */}
            <div className="pt-2 border-t border-[#E7DDD3] space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder={`${t(locale, 'promoCodeLabel')} (cth: RAYA10)`}
                  className="flex-1 px-3 py-2 rounded-lg bg-white border border-[#DBC2B0] text-xs uppercase"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="px-3.5 py-2 rounded-lg border border-[#D97706] text-[#8D4B00] text-xs font-semibold hover:bg-[#FEF3C7]/40 whitespace-nowrap"
                >
                  {t(locale, 'applyPromo')}
                </button>
              </div>
              {promoFeedback && <p className="text-[11px] text-[#831843]">{promoFeedback}</p>}
            </div>

            {/* Totals */}
            <div className="pt-3 border-t border-[#E7DDD3] space-y-2 text-sm">
              <div className="flex justify-between text-[#554336]">
                <span>{t(locale, 'subtotal')}</span>
                <span className="tabular-nums">{formatMYR(totals.subtotalSen)}</span>
              </div>
              <div className="flex justify-between text-[#554336]">
                <span>
                  {t(locale, 'shippingFee')} ({totals.totalWeightGrams}g)
                </span>
                <span className="tabular-nums">
                  {totals.freeShippingApplied
                    ? locale === 'ms'
                      ? 'PERCUMA'
                      : 'FREE'
                    : formatMYR(totals.shippingFeeSen)}
                </span>
              </div>
              {totals.discountSen > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>{t(locale, 'promoDiscount')}</span>
                  <span className="tabular-nums">-{formatMYR(totals.discountSen)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-[#292524] pt-2 border-t border-[#E7DDD3]">
                <span>{t(locale, 'totalAmount')}</span>
                <span className="tabular-nums">{formatMYR(totals.totalSen)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#831843]">
                <span>{t(locale, 'amountDueNow')}</span>
                <span className="tabular-nums">{formatMYR(totals.amountDueNowSen)}</span>
              </div>
              {totals.balanceDueSen > 0 && (
                <div className="flex justify-between text-xs text-[#554336]">
                  <span>{t(locale, 'balanceDue')}</span>
                  <span className="tabular-nums">{formatMYR(totals.balanceDueSen)}</span>
                </div>
              )}
            </div>

            {/* Notices */}
            <div className="rounded-lg bg-[#FEF3C7]/55 border border-[#FCD34D] p-3 text-xs text-[#92400E] flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{t(locale, 'shelfLifeBanner')}</span>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-[#554336] cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 rounded border-[#DBC2B0] text-[#D97706]"
              />
              <span>{t(locale, 'termsConsent')}</span>
            </label>

            {formError && (
              <div className="flex items-start gap-2 rounded-lg bg-[#FFDAD6] border border-[#BA1A1A]/30 p-3 text-xs text-[#93000A]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-5 rounded-xl bg-[#D97706] text-white text-sm font-semibold hover:bg-[#B45309] disabled:opacity-60 transition-colors shadow-sm"
            >
              {submitting
                ? locale === 'ms'
                  ? 'Mengunci Slot & Menyediakan Bayaran...'
                  : 'Reserving Slot & Preparing Payment...'
                : `${t(locale, 'proceedToPay')} · ${formatMYR(totals.amountDueNowSen)}`}
            </button>
          </div>
        </div>
      </form>

      {/* Malaysian Payment Gateway Modal */}
      {pendingOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bakery-sheet w-full max-w-lg rounded-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-[#831843]">
                  {pendingOrder.order.orderNo}
                </p>
                <h2 className="font-display text-2xl font-bold text-[#292524]">
                  {t(locale, 'paymentModalTitle')}
                </h2>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-[#554336] block">{t(locale, 'paymentHoldTimer')}</span>
                <span className="font-mono text-sm font-bold text-[#831843] tabular-nums">
                  {formatCountdown(holdSeconds)}
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-[#FAF7F2] border border-[#E7DDD3] p-4 flex items-center justify-between">
              <span className="text-sm font-medium text-[#554336]">{t(locale, 'amountDueNow')}</span>
              <span className="text-xl font-bold text-[#292524] tabular-nums">
                {formatMYR(pendingOrder.order.pricing.amountDueNowSen)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {(
                [
                  { id: 'fpx', label: t(locale, 'payMethodFPX'), icon: Lock },
                  { id: 'duitnow_qr', label: t(locale, 'payMethodDuitNow'), icon: QrCode },
                  { id: 'card', label: t(locale, 'payMethodCard'), icon: CreditCard },
                  { id: 'bank_transfer', label: t(locale, 'payMethodTransfer'), icon: Upload },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition-colors ${
                    paymentMethod === m.id
                      ? 'border-[#831843] bg-[#831843] text-white'
                      : 'border-[#DBC2B0] bg-white text-[#292524]'
                  }`}
                >
                  <m.icon className="w-4 h-4 shrink-0" />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            {paymentMethod === 'fpx' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#554336]">
                  {locale === 'ms' ? 'Pilih Bank FPX Anda' : 'Select Your FPX Bank'}
                </label>
                <select
                  value={fpxBank}
                  onChange={(e) => setFpxBank(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-white border border-[#DBC2B0] text-sm"
                >
                  {FPX_BANKS.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {paymentMethod === 'duitnow_qr' && (
              <div className="rounded-xl border border-[#DBC2B0] bg-white p-4 text-center space-y-2">
                <div className="mx-auto w-32 h-32 rounded-xl bg-[#831843] text-white flex flex-col items-center justify-center p-2">
                  <QrCode className="w-16 h-16" />
                  <span className="text-[10px] font-semibold mt-1">DuitNow QR · D'Mayra</span>
                </div>
                <p className="text-xs text-[#554336]">
                  {locale === 'ms'
                    ? 'Imbas menggunakan aplikasi perbankan atau e-dompet anda.'
                    : 'Scan with any Malaysian banking app or e-wallet.'}
                </p>
              </div>
            )}

            {paymentMethod === 'bank_transfer' && (
              <div className="space-y-2 rounded-xl bg-[#FAF7F2] border border-[#E7DDD3] p-4 text-xs">
                <p className="font-semibold text-[#292524]">
                  Maybank · 5570 9182 4410 (D&apos;Mayra Enterprise)
                </p>
                <label className="block font-semibold text-[#554336] pt-1">
                  {locale === 'ms' ? 'No. Rujukan Resit / Nama Pengirim' : 'Transfer Receipt Ref'} *
                </label>
                <input
                  type="text"
                  value={receiptRef}
                  onChange={(e) => setReceiptRef(e.target.value)}
                  placeholder="MBB-20261118-8821"
                  className="w-full px-3 py-2 rounded-lg bg-white border border-[#DBC2B0] text-sm"
                />
              </div>
            )}

            <button
              type="button"
              disabled={paymentBusy || holdSeconds === 0}
              onClick={handleConfirmGatewayPayment}
              className="w-full py-3 px-4 rounded-xl bg-[#D97706] text-white text-sm font-semibold hover:bg-[#B45309] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {paymentBusy
                  ? locale === 'ms'
                    ? 'Mengesahkan Bayaran...'
                    : 'Confirming Payment...'
                  : t(locale, 'confirmPaymentBtn')}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
