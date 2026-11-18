import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Package,
  Search,
  Share2,
  Truck,
} from 'lucide-react';
import { PAYMENT_STATUS_LABELS, STATUS_LABELS, t } from '../i18n/translations';
import { formatDateMY, formatMYR, getKualaLumpurTodayISO } from '../lib/malaysia';
import {
  getOrderTrackingByToken,
  submitOrderChangeRequest,
  submitOrderProblemReport,
} from '../services/firestoreService';
import { DamageClaim, Locale, OrderStatus, OrderTracking } from '../types/domain';

interface OrderTrackingViewProps {
  locale: Locale;
  initialTracking: OrderTracking | null;
  initialQuery?: string;
}

const STEPS_COURIER: OrderStatus[] = [
  'pending_payment',
  'confirmed',
  'in_production',
  'packed',
  'shipped',
  'delivered',
  'completed',
];

const STEPS_SELF: OrderStatus[] = [
  'pending_payment',
  'confirmed',
  'in_production',
  'packed',
  'out_for_delivery',
  'delivered',
  'completed',
];

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({
  locale,
  initialTracking,
  initialQuery = '',
}) => {
  const [lookupInput, setLookupInput] = useState(initialQuery || initialTracking?.orderNo || '');
  const [tracking, setTracking] = useState<OrderTracking | null>(initialTracking);
  const [activeToken, setActiveToken] = useState<string>(
    initialTracking
      ? initialQuery.startsWith('trk_')
        ? initialQuery
        : ''
      : ''
  );
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Damage / Delay Report
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [claimReason, setClaimReason] = useState<DamageClaim['reason']>('damaged_in_transit');
  const [claimDesc, setClaimDesc] = useState('');
  const [claimPhotoData, setClaimPhotoData] = useState<string>('');
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimFeedback, setClaimFeedback] = useState<string | null>(null);

  // Change Request (>=48h before dispatch)
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [changeNote, setChangeNote] = useState('');
  const [changeFeedback, setChangeFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (initialTracking) {
      setTracking(initialTracking);
      setLookupInput(initialTracking.orderNo);
    }
  }, [initialTracking]);

  const handleSearch = async (queryText: string) => {
    const clean = queryText.trim();
    if (!clean) return;
    setLoading(true);
    setLookupError(null);
    setClaimFeedback(null);
    setChangeFeedback(null);
    try {
      const found = await getOrderTrackingByToken(clean);
      if (!found) {
        setTracking(null);
        setLookupError(
          locale === 'ms'
            ? 'Pesanan tidak ditemui. Pastikan nombor pesanan atau token penjejakan tepat.'
            : 'Order not found. Please check your order number or tracking token.'
        );
      } else {
        setTracking(found);
        if (clean.startsWith('trk_')) setActiveToken(clean);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setClaimFeedback(
        locale === 'ms' ? 'Saiz gambar melebihi 5 MB.' : 'Image size exceeds 5 MB limit.'
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setClaimPhotoData(reader.result.slice(0, 120000));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tracking || claimDesc.trim().length < 8) return;
    const tokenForUpdate =
      activeToken ||
      (tracking.orderNo === 'DM-2026-1001'
        ? 'trk_dmayra_1001_a9f8c2e1'
        : tracking.orderNo === 'DM-2026-1002'
        ? 'trk_dmayra_1002_b7d3k4p9'
        : tracking.orderNo === 'DM-2026-1003'
        ? 'trk_dmayra_1003_c8e2m1z5'
        : tracking.orderNo === 'DM-2026-1004'
        ? 'trk_dmayra_1004_f4x9r2w8'
        : '');
    if (!tokenForUpdate) {
      setClaimFeedback(
        locale === 'ms'
          ? 'Sila buka halaman ini menggunakan token penjejakan penuh untuk menghantar tuntutan.'
          : 'Please look up using your full tracking token to submit a claim.'
      );
      return;
    }

    setClaimBusy(true);
    try {
      const claim: DamageClaim = {
        reason: claimReason,
        description: claimDesc.trim(),
        photoDataUrl: claimPhotoData || undefined,
        status: 'pending',
        submittedAt: new Date().toISOString(),
      };
      await submitOrderProblemReport({
        trackingToken: tokenForUpdate,
        orderId: tracking.orderId,
        claim,
      });
      setTracking({ ...tracking, damageClaim: claim });
      setShowClaimForm(false);
      setClaimFeedback(
        locale === 'ms'
          ? 'Laporan masalah telah dihantar kepada pemilik untuk semakan.'
          : 'Problem report submitted to the bakery owner for review.'
      );
    } catch {
      setClaimFeedback(
        locale === 'ms' ? 'Gagal menghantar laporan. Cuba lagi.' : 'Failed to submit report.'
      );
    } finally {
      setClaimBusy(false);
    }
  };

  const canRequestChange = (() => {
    if (!tracking || tracking.status === 'cancelled' || tracking.status === 'shipped') return false;
    const today = getKualaLumpurTodayISO();
    const diffMs =
      new Date(`${tracking.dispatchDate}T00:00:00Z`).getTime() -
      new Date(`${today}T00:00:00Z`).getTime();
    return diffMs >= 48 * 3600 * 1000;
  })();

  const handleSubmitChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tracking || changeNote.trim().length < 4) return;
    const tokenForUpdate = activeToken;
    if (!tokenForUpdate) {
      setChangeFeedback(
        locale === 'ms'
          ? 'Gunakan token penjejakan penuh untuk memohon pertukaran.'
          : 'Use your full tracking token to request an order change.'
      );
      return;
    }
    try {
      await submitOrderChangeRequest({
        trackingToken: tokenForUpdate,
        note: changeNote.trim(),
      });
      setTracking({
        ...tracking,
        changeRequest: {
          note: changeNote.trim(),
          status: 'pending',
          requestedAt: new Date().toISOString(),
        },
      });
      setShowChangeForm(false);
      setChangeFeedback(
        locale === 'ms'
          ? 'Permohonan pertukaran dihantar untuk kelulusan pemilik.'
          : 'Change request sent for owner approval.'
      );
    } catch {
      setChangeFeedback(
        locale === 'ms' ? 'Gagal menghantar permohonan.' : 'Failed to submit change request.'
      );
    }
  };

  const steps = tracking?.fulfilmentMethod === 'self_delivery' ? STEPS_SELF : STEPS_COURIER;
  const currentIdx = tracking ? steps.indexOf(tracking.status) : -1;

  const whatsappUrl = tracking
    ? `https://wa.me/?text=${encodeURIComponent(
        `D'Mayra Layer Cake · Pesanan ${tracking.orderNo}\nStatus: ${
          STATUS_LABELS[tracking.status][locale]
        }\nTarikh Pos/Hantar: ${formatDateMY(tracking.dispatchDate)}${
          tracking.trackingNo ? `\nNo. Tracking (${tracking.courierName}): ${tracking.trackingNo}` : ''
        }`
      )}`
    : '#';

  return (
    <div className="space-y-8 pb-16 max-w-3xl mx-auto">
      <div>
        <h1 className="font-display text-3xl font-bold text-[#292524]">
          {t(locale, 'trackPageTitle')}
        </h1>
        <p className="text-sm text-[#554336] mt-1">
          {locale === 'ms'
            ? 'Masukkan No. Pesanan contoh seperti DM-2026-1001, DM-2026-1002 atau token penjejakan anda.'
            : 'Enter your Order Number (e.g. DM-2026-1001, DM-2026-1002) or tracking token.'}
        </p>
      </div>

      {/* Search Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch(lookupInput);
        }}
        className="bakery-glass rounded-xl p-4 flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#887364] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={lookupInput}
            onChange={(e) => setLookupInput(e.target.value)}
            placeholder={t(locale, 'trackLookupPlaceholder')}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white border border-[#DBC2B0] text-sm font-mono"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-lg bg-[#D97706] text-white text-sm font-semibold hover:bg-[#B45309] disabled:opacity-60 whitespace-nowrap"
        >
          {loading ? '...' : t(locale, 'trackLookupBtn')}
        </button>
      </form>

      {/* Quick Demo Buttons */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-[#554336]">
        <span>{locale === 'ms' ? 'Contoh pantas:' : 'Quick samples:'}</span>
        {['DM-2026-1001', 'DM-2026-1002', 'DM-2026-1003'].map((sample) => (
          <button
            key={sample}
            type="button"
            onClick={() => {
              setLookupInput(sample);
              handleSearch(sample);
            }}
            className="px-2.5 py-1 rounded-md bg-[#F5ECEA] hover:bg-[#EFE6E4] font-mono text-[#831843] font-semibold"
          >
            {sample}
          </button>
        ))}
      </div>

      {lookupError && (
        <div className="rounded-xl bg-[#FFDAD6] border border-[#BA1A1A]/30 p-4 text-sm text-[#93000A]">
          {lookupError}
        </div>
      )}

      {tracking && (
        <div className="bakery-glass rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E7DDD3]">
            <div>
              <p className="font-mono text-sm font-bold text-[#831843]">{tracking.orderNo}</p>
              <h2 className="font-display text-2xl font-bold text-[#292524] mt-0.5">
                {STATUS_LABELS[tracking.status][locale]}
              </h2>
              <p className="text-xs text-[#554336] mt-1">
                {tracking.courierName} · {tracking.cityState} ·{' '}
                {PAYMENT_STATUS_LABELS[tracking.paymentStatus][locale]}
              </p>
            </div>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#831843] text-white text-xs font-semibold hover:bg-[#6B1236] self-start whitespace-nowrap"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{t(locale, 'shareWhatsappBtn')}</span>
            </a>
          </div>

          {/* Courier Tracking Box */}
          {tracking.trackingNo && (
            <div className="rounded-xl bg-[#FEF3C7]/55 border border-[#FCD34D] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-[#8D4B00]" />
                <div>
                  <p className="text-xs font-semibold text-[#92400E]">{tracking.courierName}</p>
                  <p className="font-mono text-sm font-bold text-[#292524]">{tracking.trackingNo}</p>
                </div>
              </div>
              {tracking.trackingUrl && (
                <a
                  href={tracking.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#831843] hover:underline"
                >
                  <span>{locale === 'ms' ? 'Semak di Laman Kurier' : 'Open Courier Tracker'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          {/* Status Timeline */}
          {tracking.status !== 'cancelled' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#554336]">
                {locale === 'ms' ? 'Garis Masa Status' : 'Order Progress Timeline'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {steps.map((st, idx) => {
                  const done = idx <= currentIdx;
                  return (
                    <div
                      key={st}
                      className={`rounded-lg p-2.5 border text-xs ${
                        done
                          ? 'border-[#D97706] bg-[#FEF3C7]/45 text-[#292524] font-semibold'
                          : 'border-[#E7DDD3] bg-white/60 text-[#887364]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2
                          className={`w-3.5 h-3.5 shrink-0 ${
                            done ? 'text-[#D97706]' : 'text-[#DBC2B0]'
                          }`}
                        />
                        <span className="truncate">{STATUS_LABELS[st][locale]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#E7DDD3] text-sm">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#554336]">
                {locale === 'ms' ? 'Senarai Kek Ditempah' : 'Ordered Items'}
              </p>
              {tracking.itemsSummary.map((it, idx) => (
                <div key={idx} className="rounded-lg bg-[#FAF7F2] p-3 border border-[#E7DDD3]">
                  <p className="font-semibold text-[#292524]">
                    {it.quantity}× {it.name[locale]} ({it.format.toUpperCase()})
                  </p>
                  {it.comboPicks.length > 0 && (
                    <p className="text-xs text-[#831843] mt-1">{it.comboPicks.join(', ')}</p>
                  )}
                  {it.notes && <p className="text-xs text-[#554336] italic mt-1">“{it.notes}”</p>}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#554336]">
                {locale === 'ms' ? 'Maklumat Pos & Bayaran' : 'Dispatch & Payment Info'}
              </p>
              <div className="rounded-lg bg-[#FAF7F2] p-3 border border-[#E7DDD3] space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#554336]">
                    {locale === 'ms' ? 'Tarikh Pos/Hantar' : 'Dispatch/Delivery Date'}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatDateMY(tracking.dispatchDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#554336]">
                    {locale === 'ms' ? 'Anggaran Tiba' : 'Est. Arrival'}
                  </span>
                  <span className="font-semibold">{tracking.estimatedArrival}</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-[#E7DDD3]">
                  <span className="text-[#554336]">{t(locale, 'totalAmount')}</span>
                  <span className="font-bold text-[#292524] tabular-nums">
                    {formatMYR(tracking.totalSen)}
                  </span>
                </div>
                {tracking.balanceDueSen > 0 && (
                  <div className="flex justify-between text-[#831843]">
                    <span>{t(locale, 'balanceDue')}</span>
                    <span className="font-bold tabular-nums">
                      {formatMYR(tracking.balanceDueSen)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action History */}
          {tracking.history.length > 0 && (
            <div className="pt-2 border-t border-[#E7DDD3] space-y-2">
              <p className="text-xs font-semibold text-[#554336]">
                {locale === 'ms' ? 'Rekod Aktiviti' : 'Activity Log'}
              </p>
              <div className="space-y-1.5">
                {tracking.history.map((h, i) => (
                  <div key={i} className="text-xs flex items-start justify-between gap-3 text-[#554336]">
                    <span>
                      <strong className="text-[#292524]">{STATUS_LABELS[h.status][locale]}</strong> —{' '}
                      {h.note}
                    </span>
                    <span className="font-mono text-[11px] shrink-0">
                      {h.timestamp.slice(0, 10)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer Self-Service Actions: Damage Claim (FR-34) & Change Request (FR-31) */}
          <div className="pt-4 border-t border-[#E7DDD3] flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowClaimForm((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#BA1A1A]/40 text-[#93000A] text-xs font-semibold hover:bg-[#FFDAD6]/40"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{t(locale, 'reportProblemBtn')}</span>
            </button>

            {canRequestChange && (
              <button
                type="button"
                onClick={() => setShowChangeForm((v) => !v)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#D97706]/40 text-[#8D4B00] text-xs font-semibold hover:bg-[#FEF3C7]/40"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{t(locale, 'requestChangeBtn')}</span>
              </button>
            )}
          </div>

          {claimFeedback && (
            <p className="text-xs font-medium text-[#831843]">{claimFeedback}</p>
          )}
          {changeFeedback && (
            <p className="text-xs font-medium text-[#831843]">{changeFeedback}</p>
          )}

          {tracking.damageClaim && (
            <div className="rounded-lg bg-[#FFDAD6]/40 border border-[#BA1A1A]/20 p-3 text-xs space-y-1">
              <p className="font-semibold text-[#93000A]">
                {locale === 'ms' ? 'Status Tuntutan Kerosakan/Kelewatan' : 'Problem Claim Status'}:{' '}
                {tracking.damageClaim.status.toUpperCase()}
              </p>
              <p className="text-[#292524]">{tracking.damageClaim.description}</p>
            </div>
          )}

          {showClaimForm && (
            <form
              onSubmit={handleSubmitClaim}
              className="rounded-xl bg-[#FAF7F2] border border-[#E7DDD3] p-4 space-y-3"
            >
              <p className="text-xs font-semibold text-[#292524]">
                {locale === 'ms'
                  ? 'Laporan Kerosakan atau Kelewatan (Sertakan Gambar)'
                  : 'Damage or Delay Report (Photo Evidence Required per Terms)'}
              </p>
              <select
                value={claimReason}
                onChange={(e) => setClaimReason(e.target.value as DamageClaim['reason'])}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#DBC2B0] text-xs"
              >
                <option value="damaged_in_transit">
                  {locale === 'ms' ? 'Kek Rosak Semasa Penghantaran' : 'Damaged in Transit'}
                </option>
                <option value="late_delivery">
                  {locale === 'ms' ? 'Kelewatan Melampau' : 'Excessive Courier Delay'}
                </option>
                <option value="wrong_item">
                  {locale === 'ms' ? 'Item Tidak Tepat' : 'Wrong Item Received'}
                </option>
              </select>
              <textarea
                rows={3}
                required
                value={claimDesc}
                onChange={(e) => setClaimDesc(e.target.value)}
                placeholder={
                  locale === 'ms' ? 'Terangkan masalah bungkusan atau kek...' : 'Describe the issue...'
                }
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#DBC2B0] text-xs"
              />
              <div>
                <label className="block text-[11px] font-semibold text-[#554336] mb-1">
                  {locale === 'ms' ? 'Muat Naik Gambar Bukti (Maks 5MB)' : 'Upload Photo Evidence (Max 5MB)'}
                </label>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="text-xs" />
              </div>
              <button
                type="submit"
                disabled={claimBusy}
                className="px-4 py-2 rounded-lg bg-[#93000A] text-white text-xs font-semibold"
              >
                {claimBusy ? '...' : locale === 'ms' ? 'Hantar Tuntutan' : 'Submit Claim'}
              </button>
            </form>
          )}

          {showChangeForm && (
            <form
              onSubmit={handleSubmitChange}
              className="rounded-xl bg-[#FAF7F2] border border-[#E7DDD3] p-4 space-y-3"
            >
              <p className="text-xs font-semibold text-[#292524]">
                {locale === 'ms'
                  ? 'Nyatakan Pertukaran (Tertakluk kelulusan pemilik ≥48 jam sebelum pos)'
                  : 'Specify Requested Change (Subject to owner approval ≥48h prior)'}
              </p>
              <textarea
                rows={2}
                required
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-[#DBC2B0] text-xs"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#D97706] text-white text-xs font-semibold"
              >
                {locale === 'ms' ? 'Hantar Permohonan' : 'Submit Request'}
              </button>
            </form>
          )}
        </div>
      )}

      {!tracking && !lookupError && (
        <div className="bakery-glass rounded-xl p-8 text-center space-y-2 text-sm text-[#554336]">
          <Package className="w-8 h-8 text-[#831843] mx-auto" />
          <p>
            {locale === 'ms'
              ? 'Masukkan nombor pesanan di atas untuk melihat status terkini pembakaran & penghantaran.'
              : 'Enter an order number above to inspect baking progress and courier tracking.'}
          </p>
        </div>
      )}
    </div>
  );
};
