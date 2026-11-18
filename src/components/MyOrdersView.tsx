import React, { useEffect, useState } from 'react';
import { MapPin, Plus, RefreshCw, RotateCcw, Star, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { STATUS_LABELS } from '../i18n/translations';
import { formatDateMY, formatMYR, MALAYSIAN_STATES } from '../lib/malaysia';
import {
  fetchMyOrders,
  saveCustomerAddresses,
  submitCustomerReview,
} from '../services/firestoreService';
import { Locale, Order, OrderTracking, SavedAddress } from '../types/domain';

interface MyOrdersViewProps {
  locale: Locale;
  onOpenAuth: () => void;
  onReorder: (order: Order) => void;
  onTrackOrder: (tracking: OrderTracking, token: string) => void;
}

export const MyOrdersView: React.FC<MyOrdersViewProps> = ({
  locale,
  onOpenAuth,
  onReorder,
  onTrackOrder,
}) => {
  const { firebaseUser, account, customerProfile, refreshProfile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const [newLabel, setNewLabel] = useState('');
  const [newRecName, setNewRecName] = useState('');
  const [newRecPhone, setNewRecPhone] = useState('');
  const [newAddr, setNewAddr] = useState('');
  const [newState, setNewState] = useState('Pulau Pinang');
  const [newPostcode, setNewPostcode] = useState('');
  const [addrBusy, setAddrBusy] = useState(false);

  const [reviewOrderNo, setReviewOrderNo] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewMsg, setReviewMsg] = useState<string | null>(null);

  const loadOrders = async () => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      const list = await fetchMyOrders(firebaseUser.uid);
      setOrders(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser?.uid]);

  if (!firebaseUser || !account) {
    return (
      <div className="bakery-glass rounded-2xl p-10 text-center space-y-4 my-8 max-w-xl mx-auto">
        <h1 className="font-display text-3xl font-bold text-[#292524]">
          {locale === 'ms' ? 'Akaun & Pesanan Saya' : 'My Account & Orders'}
        </h1>
        <p className="text-sm text-[#554336]">
          {locale === 'ms'
            ? 'Log masuk atau daftar menggunakan Akaun Google untuk menyemak sejarah pesanan, simpan alamat penerima, dan ulang tempahan satu klik.'
            : 'Sign in or register with your Google Account to view order history, manage saved addresses, and reorder in one tap.'}
        </p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="px-6 py-3 rounded-xl bg-[#D97706] text-white text-sm font-semibold hover:bg-[#B45309]"
        >
          {locale === 'ms' ? 'Log Masuk / Daftar dengan Google' : 'Sign In / Sign Up with Google'}
        </button>
      </div>
    );
  }

  const savedAddresses = customerProfile?.savedAddresses || [];

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !newAddr.trim() || newPostcode.length !== 5) return;
    setAddrBusy(true);
    try {
      const next: SavedAddress[] = [
        ...savedAddresses,
        {
          id: `addr_${Date.now()}`,
          label: newLabel.trim(),
          recipientName: newRecName.trim() || account.displayName,
          recipientPhone: newRecPhone.trim() || '+60120000000',
          address: newAddr.trim(),
          state: newState,
          postcode: newPostcode.trim(),
        },
      ];
      await saveCustomerAddresses(
        firebaseUser.uid,
        customerProfile?.phone || '',
        next,
        customerProfile?.marketingConsent || false
      );
      await refreshProfile();
      setNewLabel('');
      setNewRecName('');
      setNewRecPhone('');
      setNewAddr('');
      setNewPostcode('');
    } finally {
      setAddrBusy(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    const next = savedAddresses.filter((a) => a.id !== id);
    await saveCustomerAddresses(
      firebaseUser.uid,
      customerProfile?.phone || '',
      next,
      customerProfile?.marketingConsent || false
    );
    await refreshProfile();
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewOrderNo || reviewText.trim().length < 4) return;
    await submitCustomerReview({
      orderNo: reviewOrderNo,
      authorName: account.displayName,
      uid: firebaseUser.uid,
      rating: reviewRating,
      text: reviewText.trim(),
    });
    setReviewText('');
    setReviewOrderNo('');
    setReviewMsg(
      locale === 'ms'
        ? 'Terima kasih! Ulasan anda dihantar untuk semakan pentadbir.'
        : 'Thank you! Your review has been submitted for moderation.'
    );
  };

  return (
    <div className="space-y-8 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#292524]">
            {locale === 'ms' ? 'Pesanan & Profil Saya' : 'My Orders & Profile'}
          </h1>
          <p className="text-sm text-[#554336]">
            {account.displayName} · {account.email}
          </p>
        </div>
        <button
          type="button"
          onClick={loadOrders}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#DBC2B0] bg-white text-xs font-semibold text-[#554336]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{locale === 'ms' ? 'Muat Semula' : 'Refresh'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Order History */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="font-display text-xl font-semibold text-[#292524]">
            {locale === 'ms' ? 'Sejarah Tempahan' : 'Order History'}
          </h2>

          {loading ? (
            <div className="bakery-glass rounded-xl p-6 text-sm text-[#554336]">
              {locale === 'ms' ? 'Memuatkan pesanan...' : 'Loading orders...'}
            </div>
          ) : orders.length === 0 ? (
            <div className="bakery-glass rounded-xl p-6 text-sm text-[#554336]">
              {locale === 'ms'
                ? 'Anda belum mempunyai pesanan di bawah akaun Google ini.'
                : 'No orders placed under this Google account yet.'}
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((ord) => (
                <div key={ord.id} className="bakery-glass rounded-xl p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-mono text-sm font-bold text-[#831843]">
                        {ord.orderNo}
                      </span>
                      <p className="text-xs text-[#554336]">
                        {STATUS_LABELS[ord.status][locale]} · {formatDateMY(ord.fulfilment.dispatchDate)}
                      </p>
                    </div>
                    <span className="text-base font-bold text-[#292524] tabular-nums">
                      {formatMYR(ord.pricing.totalSen)}
                    </span>
                  </div>

                  <div className="text-xs text-[#554336] space-y-1">
                    {ord.items.map((it, i) => (
                      <p key={i}>
                        {it.quantity}× {it.productName[locale]} ({it.format.toUpperCase()})
                      </p>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E7DDD3]">
                    <button
                      type="button"
                      onClick={() => onReorder(ord)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D97706] text-white text-xs font-semibold hover:bg-[#B45309]"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{locale === 'ms' ? 'Ulang Tempah' : 'Reorder'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onTrackOrder(
                          {
                            orderNo: ord.orderNo,
                            orderId: ord.id,
                            status: ord.status,
                            fulfilmentMethod: ord.fulfilment.method,
                            courierName: ord.fulfilment.courierName,
                            trackingNo: ord.fulfilment.trackingNo,
                            trackingUrl: ord.fulfilment.trackingUrl,
                            dispatchDate: ord.fulfilment.dispatchDate,
                            estimatedArrival: ord.fulfilment.estimatedArrival,
                            cityState: `${ord.fulfilment.postcode} · ${ord.fulfilment.state}`,
                            itemsSummary: ord.items.map((it) => ({
                              name: it.productName,
                              format: it.format,
                              quantity: it.quantity,
                              comboPicks: it.comboPicks,
                              notes: it.notes,
                            })),
                            totalSen: ord.pricing.totalSen,
                            amountDueNowSen: ord.pricing.amountDueNowSen,
                            balanceDueSen: ord.pricing.balanceDueSen,
                            paymentStatus: ord.payment.status,
                            history: [],
                            updatedAt: ord.updatedAt,
                          },
                          ord.trackingToken
                        )
                      }
                      className="px-3 py-1.5 rounded-lg border border-[#DBC2B0] bg-white text-xs font-semibold text-[#292524]"
                    >
                      {locale === 'ms' ? 'Jejak Pesanan' : 'Track Status'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewOrderNo(ord.orderNo)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#831843]/30 text-xs font-semibold text-[#831843]"
                    >
                      <Star className="w-3.5 h-3.5" />
                      <span>{locale === 'ms' ? 'Tulis Ulasan' : 'Write Review'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {reviewMsg && <p className="text-xs text-emerald-800 font-medium">{reviewMsg}</p>}

          {reviewOrderNo && (
            <form onSubmit={handleSubmitReview} className="bakery-glass rounded-xl p-5 space-y-3">
              <h3 className="font-display text-lg font-semibold text-[#292524]">
                {locale === 'ms' ? `Ulasan untuk ${reviewOrderNo}` : `Review for ${reviewOrderNo}`}
              </h3>
              <select
                value={reviewRating}
                onChange={(e) => setReviewRating(Number(e.target.value))}
                className="px-3 py-2 rounded-lg bg-white border border-[#DBC2B0] text-xs"
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} Bintang
                  </option>
                ))}
              </select>
              <textarea
                rows={3}
                required
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder={locale === 'ms' ? 'Kongsi pengalaman anda...' : 'Share your experience...'}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#DBC2B0] text-sm"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#831843] text-white text-xs font-semibold"
                >
                  {locale === 'ms' ? 'Hantar Ulasan' : 'Submit Review'}
                </button>
                <button
                  type="button"
                  onClick={() => setReviewOrderNo('')}
                  className="px-4 py-2 rounded-lg border border-[#DBC2B0] text-xs"
                >
                  {locale === 'ms' ? 'Batal' : 'Cancel'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Saved Addresses */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="font-display text-xl font-semibold text-[#292524]">
            {locale === 'ms' ? 'Alamat Tersimpan' : 'Saved Addresses'}
          </h2>

          <div className="space-y-3">
            {savedAddresses.map((addr) => (
              <div
                key={addr.id}
                className="bakery-glass rounded-xl p-4 flex items-start justify-between gap-3"
              >
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-[#831843] flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{addr.label}</span>
                  </p>
                  <p className="font-medium text-[#292524]">
                    {addr.recipientName} · {addr.recipientPhone}
                  </p>
                  <p className="text-[#554336]">
                    {addr.address}, {addr.postcode} {addr.state}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteAddress(addr.id)}
                  className="p-1.5 text-[#BA1A1A] hover:bg-[#FFDAD6] rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddAddress} className="bakery-glass rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-[#292524] flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              <span>{locale === 'ms' ? 'Tambah Alamat Baru' : 'Add New Address'}</span>
            </p>
            <input
              type="text"
              required
              placeholder={locale === 'ms' ? 'Label (cth: Rumah Mak)' : 'Label (e.g. Home)'}
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white border border-[#DBC2B0] text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder={locale === 'ms' ? 'Nama Penerima' : 'Recipient Name'}
                value={newRecName}
                onChange={(e) => setNewRecName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#DBC2B0] text-xs"
              />
              <input
                type="tel"
                placeholder="+60123456789"
                value={newRecPhone}
                onChange={(e) => setNewRecPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#DBC2B0] text-xs"
              />
            </div>
            <textarea
              rows={2}
              required
              placeholder={locale === 'ms' ? 'Alamat jalan penuh...' : 'Street address...'}
              value={newAddr}
              onChange={(e) => setNewAddr(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white border border-[#DBC2B0] text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newState}
                onChange={(e) => setNewState(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#DBC2B0] text-xs"
              >
                {MALAYSIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                type="text"
                required
                maxLength={5}
                placeholder="Poskod"
                value={newPostcode}
                onChange={(e) => setNewPostcode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#DBC2B0] text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={addrBusy}
              className="w-full py-2 rounded-lg bg-[#831843] text-white text-xs font-semibold"
            >
              {addrBusy ? '...' : locale === 'ms' ? 'Simpan Alamat' : 'Save Address'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
