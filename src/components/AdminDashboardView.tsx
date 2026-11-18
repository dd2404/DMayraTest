import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  Database,
  Download,
  Lock,
  PackageCheck,
  Printer,
  RefreshCw,
  Settings as SettingsIcon,
  Shield,
  Sparkles,
  Truck,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { PAYMENT_STATUS_LABELS, STATUS_LABELS } from '../i18n/translations';
import { formatDateMY, formatMYR, getKualaLumpurTodayISO } from '../lib/malaysia';
import {
  fetchAdminAuditLogs,
  fetchAdminOrders,
  fetchAdminUsers,
  fetchCustomRequestsAdmin,
  moderateReviewAdmin,
  saveCapacityDayAdmin,
  saveProductAdmin,
  saveShippingRateAdmin,
  saveStoreSettingsAdmin,
  seedDatabase,
  updateCustomRequestAdmin,
  updateOrderStatusAndTracking,
  updateUserRoleAdmin,
} from '../services/firestoreService';
import {
  AuditLog,
  CapacityDay,
  CustomRequest,
  Locale,
  Order,
  OrderStatus,
  Product,
  Review,
  ShippingRate,
  StoreSettings,
  UserAccount,
  UserRole,
} from '../types/domain';

interface AdminDashboardViewProps {
  locale: Locale;
  products: Product[];
  shippingRates: ShippingRate[];
  settings: StoreSettings;
  capacity: CapacityDay[];
  reviews: Review[];
  onRefreshStore: () => Promise<void>;
  onOpenAuth: () => void;
}

type AdminTab =
  | 'dashboard'
  | 'orders'
  | 'production'
  | 'packing'
  | 'capacity'
  | 'catalogue'
  | 'shipping'
  | 'requests'
  | 'users'
  | 'audit';

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  locale,
  products,
  shippingRates,
  settings,
  capacity,
  reviews,
  onRefreshStore,
  onOpenAuth,
}) => {
  const { firebaseUser, account, role, isStaff, canManage, isOwner } = useAuth();

  const defaultTab: AdminTab = role === 'helper' ? 'orders' : 'dashboard';
  const [tab, setTab] = useState<AdminTab>(defaultTab);

  const [orders, setOrders] = useState<Order[]>([]);
  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [customRequests, setCustomRequests] = useState<CustomRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Filters & Selections
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | OrderStatus>('all');
  const [orderMethodFilter, setOrderMethodFilter] = useState<'all' | 'courier' | 'self_delivery'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [trackingInput, setTrackingInput] = useState('');

  const [workDate, setWorkDate] = useState(getKualaLumpurTodayISO());
  const [settingsDraft, setSettingsDraft] = useState<StoreSettings>(settings);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    setSettingsDraft(settings);
  }, [settings]);

  useEffect(() => {
    if (role === 'helper' && !['orders', 'production', 'packing'].includes(tab)) {
      setTab('orders');
    }
  }, [role, tab]);

  const loadAdminData = async () => {
    if (!isStaff) return;
    setLoading(true);
    try {
      const [ordData, reqData] = await Promise.all([
        fetchAdminOrders(),
        canManage ? fetchCustomRequestsAdmin() : Promise.resolve([]),
      ]);
      setOrders(ordData);
      setCustomRequests(reqData);
      if (canManage) {
        const uData = await fetchAdminUsers();
        setUsersList(uData);
      }
      if (isOwner) {
        const aData = await fetchAdminAuditLogs();
        setAuditLogs(aData);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaff, canManage, isOwner]);

  if (!firebaseUser || !account) {
    return (
      <div className="bakery-glass rounded-2xl p-10 text-center space-y-4 my-8 max-w-xl mx-auto">
        <Lock className="w-8 h-8 text-[#831843] mx-auto" />
        <h1 className="font-display text-3xl font-bold text-[#292524]">
          {locale === 'ms' ? 'Portal Pentadbir D\'Mayra' : 'D\'Mayra Admin Portal'}
        </h1>
        <p className="text-sm text-[#554336]">
          {locale === 'ms'
            ? 'Sila log masuk dengan Akaun Google staf atau pemilik yang disahkan.'
            : 'Please sign in with an authorized staff or owner Google account.'}
        </p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="px-6 py-3 rounded-xl bg-[#831843] text-white text-sm font-semibold"
        >
          {locale === 'ms' ? 'Log Masuk Google' : 'Sign In with Google'}
        </button>
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="bakery-glass rounded-2xl p-10 text-center space-y-3 my-8 max-w-xl mx-auto">
        <Shield className="w-8 h-8 text-[#BA1A1A] mx-auto" />
        <h1 className="font-display text-2xl font-bold text-[#292524]">
          {locale === 'ms' ? 'Akses Ditolak (Bukan Staf)' : 'Access Denied (Staff Only)'}
        </h1>
        <p className="text-sm text-[#554336]">
          {locale === 'ms'
            ? `Akaun ${account.email} berdaftar sebagai Pelanggan. Hanya Pemilik, Pengurus atau Pembantu dapur dibenarkan masuk.`
            : `${account.email} is registered as a Customer. Only Owner, Manager, or Kitchen Helper roles may access /admin.`}
        </p>
      </div>
    );
  }

  const showNotice = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 4000);
  };

  const handleSeedDatabase = async (force = false) => {
    setLoading(true);
    try {
      const res = await seedDatabase(force);
      await onRefreshStore();
      await loadAdminData();
      showNotice(
        res.seeded
          ? `Berjaya menyegerakkan ${res.count} rekod demo ke Firestore!`
          : 'Data Firestore sudah wujud.'
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false;
      if (orderMethodFilter !== 'all' && o.fulfilment.method !== orderMethodFilter) return false;
      return true;
    });
  }, [orders, orderStatusFilter, orderMethodFilter]);

  // Production Aggregation for chosen date (FR-42)
  const productionGrouped = useMemo(() => {
    const map = new Map<
      string,
      { key: string; name: string; format: string; qty: number; notes: string[] }
    >();
    const dayOrders = orders.filter(
      (o) =>
        o.fulfilment.dispatchDate === workDate &&
        o.status !== 'cancelled'
    );

    for (const o of dayOrders) {
      for (const it of o.items) {
        const comboInfo = it.comboPicks.length > 0 ? ` [${it.comboPicks.join(', ')}]` : '';
        const key = `${it.productId}__${it.format}__${comboInfo}`;
        const existing = map.get(key);
        const noteText = it.notes ? `${o.orderNo}: ${it.notes}` : '';
        if (existing) {
          existing.qty += it.quantity;
          if (noteText) existing.notes.push(noteText);
        } else {
          map.set(key, {
            key,
            name: `${it.productName[locale]}${comboInfo}`,
            format: it.format.toUpperCase(),
            qty: it.quantity,
            notes: noteText ? [noteText] : [],
          });
        }
      }
    }
    return Array.from(map.values());
  }, [orders, workDate, locale]);

  // Packing list for chosen date (FR-47)
  const packingOrders = useMemo(() => {
    return orders.filter(
      (o) => o.fulfilment.dispatchDate === workDate && o.status !== 'cancelled'
    );
  }, [orders, workDate]);

  // Dashboard Metrics
  const totalRevenueSen = useMemo(
    () =>
      orders
        .filter((o) => o.status !== 'cancelled')
        .reduce((acc, o) => acc + o.pricing.totalSen, 0),
    [orders]
  );

  const exportOrdersCsv = () => {
    const header = ['OrderNo', 'Date', 'Status', 'Buyer', 'Phone', 'Email', 'Method', 'State', 'TotalMYR'];
    const rows = orders.map((o) => [
      o.orderNo,
      o.fulfilment.dispatchDate,
      o.status,
      `"${o.buyer.name.replace(/"/g, '""')}"`,
      o.buyer.phone,
      o.buyer.email,
      o.fulfilment.courierName,
      o.fulfilment.state,
      (o.pricing.totalSen / 100).toFixed(2),
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dmayra-orders-${getKualaLumpurTodayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOrderStatusChange = async (order: Order, nextStatus: OrderStatus, trackingNo?: string) => {
    let trackingUrl = order.fulfilment.trackingUrl || '';
    if (trackingNo && order.fulfilment.courier) {
      const rate = shippingRates.find((r) => r.courier === order.fulfilment.courier);
      if (rate) {
        trackingUrl = rate.trackingUrlTemplate.replace('{trackingNo}', encodeURIComponent(trackingNo));
      }
    }
    await updateOrderStatusAndTracking({
      order,
      newStatus: nextStatus,
      trackingNo: trackingNo !== undefined ? trackingNo : order.fulfilment.trackingNo,
      trackingUrl,
      actorUid: account.uid,
      actorEmail: account.email,
    });
    await loadAdminData();
    if (selectedOrder?.id === order.id) {
      setSelectedOrder({
        ...order,
        status: nextStatus,
        fulfilment: {
          ...order.fulfilment,
          trackingNo: trackingNo ?? order.fulfilment.trackingNo,
          trackingUrl,
        },
      });
    }
    showNotice(`Status ${order.orderNo} dikemaskini kepada ${STATUS_LABELS[nextStatus][locale]}.`);
  };

  const allTabs: Array<{ id: AdminTab; label: string; icon: React.ElementType; minRole: UserRole[] }> = [
    { id: 'dashboard', label: 'Ringkasan', icon: Sparkles, minRole: ['owner', 'manager'] },
    { id: 'orders', label: 'Pesanan', icon: ClipboardList, minRole: ['owner', 'manager', 'helper'] },
    { id: 'production', label: 'Senarai Bakar', icon: PackageCheck, minRole: ['owner', 'manager', 'helper'] },
    { id: 'packing', label: 'Bungkus & Pos', icon: Truck, minRole: ['owner', 'manager', 'helper'] },
    { id: 'capacity', label: 'Kapasiti', icon: Calendar, minRole: ['owner', 'manager'] },
    { id: 'catalogue', label: 'Katalog', icon: Database, minRole: ['owner', 'manager'] },
    { id: 'shipping', label: 'Kurier & Kedai', icon: SettingsIcon, minRole: ['owner', 'manager'] },
    { id: 'requests', label: 'Permintaan & Ulasan', icon: CheckCircle2, minRole: ['owner', 'manager'] },
    { id: 'users', label: 'Staf & Peranan', icon: Users, minRole: ['owner'] },
    { id: 'audit', label: 'Log Audit', icon: Shield, minRole: ['owner'] },
  ];

  const visibleTabs = allTabs.filter((tb) => role && tb.minRole.includes(role));

  return (
    <div className="space-y-6 pb-20">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <p className="text-xs font-semibold text-[#831843]">
            {account.email} · {role?.toUpperCase()}
          </p>
          <h1 className="font-display text-3xl font-bold text-[#292524]">
            {locale === 'ms' ? 'Pengurusan Dapur & Kedai' : 'Bakery Back-Office'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isOwner && (
            <button
              type="button"
              onClick={() => handleSeedDatabase(true)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#831843] text-white text-xs font-semibold hover:bg-[#6B1236] whitespace-nowrap"
            >
              <Database className="w-3.5 h-3.5" />
              <span>{locale === 'ms' ? 'Segerak Data Demo Firebase' : 'Sync Demo Data to Firebase'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={loadAdminData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#DBC2B0] bg-white text-xs font-semibold text-[#292524]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{locale === 'ms' ? 'Muat Semula' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {toast && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-semibold text-emerald-900 no-print">
          {toast}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1.5 p-1.5 rounded-xl bg-[#F5ECEA] no-print">
        {visibleTabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              tab === item.id
                ? 'bg-white text-[#831843] shadow-sm'
                : 'text-[#554336] hover:text-[#292524]'
            }`}
          >
            <item.icon className="w-3.5 h-3.5" />
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* TAB: DASHBOARD */}
      {tab === 'dashboard' && canManage && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bakery-glass rounded-xl p-4 space-y-1">
              <p className="text-xs text-[#554336]">Jumlah Pesanan</p>
              <p className="text-2xl font-bold text-[#292524] tabular-nums">{orders.length}</p>
            </div>
            <div className="bakery-glass rounded-xl p-4 space-y-1">
              <p className="text-xs text-[#554336]">Jumlah Hasil</p>
              <p className="text-2xl font-bold text-[#831843] tabular-nums">
                {formatMYR(totalRevenueSen)}
              </p>
            </div>
            <div className="bakery-glass rounded-xl p-4 space-y-1">
              <p className="text-xs text-[#554336]">Perlu Dibakar / Dibungkus</p>
              <p className="text-2xl font-bold text-[#D97706] tabular-nums">
                {orders.filter((o) => ['confirmed', 'in_production', 'packed'].includes(o.status)).length}
              </p>
            </div>
            <div className="bakery-glass rounded-xl p-4 space-y-1">
              <p className="text-xs text-[#554336]">Permintaan Kek Khas</p>
              <p className="text-2xl font-bold text-[#292524] tabular-nums">
                {customRequests.filter((r) => r.status === 'new').length}
              </p>
            </div>
          </div>

          <div className="bakery-glass rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold text-[#292524]">
                Beban Kapasiti 7 Hari Hadapan
              </h2>
              <button
                type="button"
                onClick={exportOrdersCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DBC2B0] bg-white text-xs font-semibold text-[#292524]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Eksport CSV Pelanggan</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {capacity.slice(0, 7).map((day) => {
                const pct = day.limit > 0 ? Math.min(100, Math.round((day.used / day.limit) * 100)) : 0;
                return (
                  <div key={day.date} className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="font-semibold text-[#292524]">
                        {formatDateMY(day.date)}{' '}
                        {day.blocked
                          ? '(DITUTUP)'
                          : day.dispatchEnabled
                          ? '· Kurier'
                          : day.selfDeliveryEnabled
                          ? '· Balik Pulau'
                          : ''}
                      </span>
                      <span className="tabular-nums text-[#554336]">
                        {day.used} / {day.limit} slot ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#EFE6E4] overflow-hidden">
                      <div
                        className={`h-full ${day.blocked ? 'bg-[#BA1A1A]' : 'bg-[#D97706]'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB: ORDERS */}
      {tab === 'orders' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap gap-2">
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value as 'all' | OrderStatus)}
                className="px-3 py-2 rounded-lg bg-white border border-[#DBC2B0] text-xs"
              >
                <option value="all">Semua Status</option>
                {Object.keys(STATUS_LABELS).map((st) => (
                  <option key={st} value={st}>
                    {STATUS_LABELS[st as OrderStatus][locale]}
                  </option>
                ))}
              </select>
              <select
                value={orderMethodFilter}
                onChange={(e) =>
                  setOrderMethodFilter(e.target.value as 'all' | 'courier' | 'self_delivery')
                }
                className="px-3 py-2 rounded-lg bg-white border border-[#DBC2B0] text-xs"
              >
                <option value="all">Semua Kaedah</option>
                <option value="courier">Kurier Malaysia</option>
                <option value="self_delivery">Balik Pulau RM5</option>
              </select>
            </div>

            <div className="space-y-3">
              {filteredOrders.map((ord) => (
                <div
                  key={ord.id}
                  onClick={() => {
                    setSelectedOrder(ord);
                    setTrackingInput(ord.fulfilment.trackingNo || '');
                  }}
                  className={`bakery-glass rounded-xl p-4 cursor-pointer transition-colors ${
                    selectedOrder?.id === ord.id ? 'ring-2 ring-[#D97706]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-sm font-bold text-[#831843]">{ord.orderNo}</p>
                      <p className="text-sm font-semibold text-[#292524]">{ord.buyer.name}</p>
                      <p className="text-xs text-[#554336]">
                        {ord.fulfilment.courierName} · {formatDateMY(ord.fulfilment.dispatchDate)} ·{' '}
                        {ord.fulfilment.state}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#292524] tabular-nums">
                        {formatMYR(ord.pricing.totalSen)}
                      </p>
                      <p className="text-xs font-semibold text-[#8D4B00]">
                        {STATUS_LABELS[ord.status][locale]}
                      </p>
                      <p className="text-[11px] text-[#554336]">
                        {PAYMENT_STATUS_LABELS[ord.payment.status][locale]}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            {selectedOrder ? (
              <div className="bakery-glass rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-start border-b border-[#E7DDD3] pb-3">
                  <div>
                    <p className="font-mono text-sm font-bold text-[#831843]">
                      {selectedOrder.orderNo}
                    </p>
                    <p className="text-xs text-[#554336]">
                      Token: <span className="font-mono">{selectedOrder.trackingToken}</span>
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#8D4B00]">
                    {STATUS_LABELS[selectedOrder.status][locale]}
                  </span>
                </div>

                <div className="text-xs space-y-1 text-[#554336]">
                  <p>
                    <strong className="text-[#292524]">Pembeli:</strong> {selectedOrder.buyer.name} (
                    {selectedOrder.buyer.phone})
                  </p>
                  <p>
                    <strong className="text-[#292524]">Penerima:</strong>{' '}
                    {selectedOrder.recipient.name} ({selectedOrder.recipient.phone})
                  </p>
                  <p>
                    <strong className="text-[#292524]">Alamat:</strong>{' '}
                    {selectedOrder.fulfilment.address}, {selectedOrder.fulfilment.postcode}{' '}
                    {selectedOrder.fulfilment.state}
                  </p>
                </div>

                <div className="space-y-2 border-t border-[#E7DDD3] pt-3">
                  {selectedOrder.items.map((it, idx) => (
                    <div key={idx} className="text-xs bg-[#FAF7F2] p-2.5 rounded-lg">
                      <p className="font-semibold text-[#292524]">
                        {it.quantity}× {it.productName[locale]} ({it.format.toUpperCase()})
                      </p>
                      {it.comboPicks.length > 0 && (
                        <p className="text-[#831843]">{it.comboPicks.join(', ')}</p>
                      )}
                      {it.notes && <p className="italic text-[#554336]">Nota: “{it.notes}”</p>}
                    </div>
                  ))}
                </div>

                {/* Status Actions */}
                <div className="space-y-2 border-t border-[#E7DDD3] pt-3">
                  <p className="text-xs font-semibold text-[#292524]">Tukar Status Pesanan</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        'confirmed',
                        'in_production',
                        'packed',
                        'out_for_delivery',
                        'delivered',
                        'completed',
                        'cancelled',
                      ] as OrderStatus[]
                    ).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleOrderStatusChange(selectedOrder, st)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border ${
                          selectedOrder.status === st
                            ? 'bg-[#831843] text-white border-[#831843]'
                            : 'bg-white text-[#292524] border-[#DBC2B0]'
                        }`}
                      >
                        {STATUS_LABELS[st][locale]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tracking No -> Marks Shipped (FR-46) */}
                {selectedOrder.fulfilment.method === 'courier' && (
                  <div className="space-y-2 border-t border-[#E7DDD3] pt-3">
                    <label className="block text-xs font-semibold text-[#292524]">
                      No. Penjejakan Kurier ({selectedOrder.fulfilment.courierName})
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={trackingInput}
                        onChange={(e) => setTrackingInput(e.target.value)}
                        placeholder="Contoh: 620091847210"
                        className="flex-1 px-3 py-2 rounded-lg bg-white border border-[#DBC2B0] text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleOrderStatusChange(selectedOrder, 'shipped', trackingInput.trim())
                        }
                        disabled={!trackingInput.trim()}
                        className="px-3.5 py-2 rounded-lg bg-[#D97706] text-white text-xs font-semibold disabled:opacity-50"
                      >
                        Tanda Dipos
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bakery-glass rounded-xl p-8 text-center text-xs text-[#554336]">
                Pilih pesanan di sebelah kiri untuk melihat butiran penuh & mengemaskini status.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: PRODUCTION LIST (FR-42) */}
      {tab === 'production' && (
        <div className="bakery-glass rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-[#554336]">Tarikh Pos / Hantar:</label>
              <input
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white border border-[#DBC2B0] text-xs"
              />
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#831843] text-white text-xs font-semibold"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Senarai Bakar</span>
            </button>
          </div>

          <h2 className="font-display text-2xl font-bold text-[#292524]">
            Senarai Pengeluaran Dapur · {formatDateMY(workDate)}
          </h2>

          {productionGrouped.length === 0 ? (
            <p className="text-sm text-[#554336]">Tiada kek dijadualkan untuk tarikh ini.</p>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#DBC2B0] text-xs text-[#554336]">
                  <th className="py-2 pr-4">Kek / Perisa</th>
                  <th className="py-2 pr-4">Saiz</th>
                  <th className="py-2 pr-4 text-right">Kuantiti</th>
                  <th className="py-2">Nota Potongan / Hiasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7DDD3]">
                {productionGrouped.map((row) => (
                  <tr key={row.key}>
                    <td className="py-3 pr-4 font-semibold text-[#292524]">{row.name}</td>
                    <td className="py-3 pr-4 text-xs">{row.format}</td>
                    <td className="py-3 pr-4 text-right font-bold tabular-nums">{row.qty}</td>
                    <td className="py-3 text-xs text-[#554336]">
                      {row.notes.length > 0 ? row.notes.join(' | ') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB: PACKING & DISPATCH LIST (FR-47) */}
      {tab === 'packing' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-[#554336]">Tarikh Pos / Hantar:</label>
              <input
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white border border-[#DBC2B0] text-xs"
              />
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#831843] text-white text-xs font-semibold"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Label Alamat</span>
            </button>
          </div>

          {packingOrders.length === 0 ? (
            <div className="bakery-glass rounded-xl p-6 text-sm text-[#554336]">
              Tiada bungkusan untuk tarikh {formatDateMY(workDate)}.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {packingOrders.map((ord) => (
                <div key={ord.id} className="bakery-glass rounded-xl p-5 space-y-2 border border-[#DBC2B0]">
                  <div className="flex justify-between items-center border-b border-[#E7DDD3] pb-2">
                    <span className="font-mono text-sm font-bold text-[#831843]">{ord.orderNo}</span>
                    <span className="text-xs font-semibold text-[#292524] tabular-nums">
                      {ord.fulfilment.courierName} · {ord.fulfilment.parcelWeightGrams}g
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-[#292524]">
                    <p className="font-bold text-sm">KEPADA: {ord.recipient.name}</p>
                    <p>TEL: {ord.recipient.phone}</p>
                    <p>
                      {ord.fulfilment.address}, {ord.fulfilment.postcode} {ord.fulfilment.state}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#E7DDD3] text-xs text-[#554336]">
                    {ord.items.map((it, idx) => (
                      <p key={idx}>
                        • {it.quantity}× {it.productName[locale]} ({it.format})
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: CAPACITY CALENDAR (FR-43) */}
      {tab === 'capacity' && canManage && (
        <div className="bakery-glass rounded-xl p-5 space-y-4">
          <h2 className="font-display text-xl font-semibold text-[#292524]">
            Kalendar Kapasiti Harian (Slot Kek Whole = 1.0 · Loaf = 0.25)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#DBC2B0] text-[#554336]">
                  <th className="py-2 pr-3">Tarikh</th>
                  <th className="py-2 pr-3">Had Slot</th>
                  <th className="py-2 pr-3">Digunakan</th>
                  <th className="py-2 pr-3">Pos Kurier</th>
                  <th className="py-2 pr-3">Balik Pulau</th>
                  <th className="py-2 pr-3">Tutup / Cuti</th>
                  <th className="py-2">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7DDD3]">
                {capacity.slice(0, 21).map((day) => (
                  <tr key={day.date}>
                    <td className="py-2.5 pr-3 font-semibold tabular-nums">{formatDateMY(day.date)}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{day.limit}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{day.used}</td>
                    <td className="py-2.5 pr-3">{day.dispatchEnabled ? 'Aktif' : '—'}</td>
                    <td className="py-2.5 pr-3">{day.selfDeliveryEnabled ? 'Aktif' : '—'}</td>
                    <td className="py-2.5 pr-3">{day.blocked ? 'Ya' : 'Tidak'}</td>
                    <td className="py-2.5 flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await saveCapacityDayAdmin(
                            { ...day, blocked: !day.blocked },
                            account.uid,
                            account.email
                          );
                          await onRefreshStore();
                          showNotice(`Status tarikh ${formatDateMY(day.date)} dikemaskini.`);
                        }}
                        className="px-2.5 py-1 rounded border border-[#DBC2B0] bg-white hover:bg-[#FAF7F2]"
                      >
                        {day.blocked ? 'Buka Tarikh' : 'Sekat Tarikh'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await saveCapacityDayAdmin(
                            { ...day, limit: day.limit + 4 },
                            account.uid,
                            account.email
                          );
                          await onRefreshStore();
                          showNotice(`Had slot ${formatDateMY(day.date)} ditambah +4.`);
                        }}
                        className="px-2.5 py-1 rounded border border-[#D97706] text-[#8D4B00]"
                      >
                        +4 Slot
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: CATALOGUE MANAGER (FR-44) */}
      {tab === 'catalogue' && canManage && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {products.map((prod) => (
              <div key={prod.id} className="bakery-glass rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={prod.imageUrl}
                    alt={prod.name.ms}
                    referrerPolicy="no-referrer"
                    className="w-16 h-12 rounded-lg object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-[#292524] truncate">{prod.name.ms}</p>
                    <p className="text-xs text-[#554336] tabular-nums">
                      {prod.formats.combo
                        ? `Combo ${formatMYR(prod.formats.combo.priceSen)}`
                        : `Whole ${formatMYR(prod.formats.whole?.priceSen || 0)} · Loaf ${formatMYR(
                            prod.formats.loaf?.priceSen || 0
                          )}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={async () => {
                      await saveProductAdmin(
                        { ...prod, active: !prod.active },
                        account.uid,
                        account.email
                      );
                      await onRefreshStore();
                      showNotice(`${prod.name.ms} ${!prod.active ? 'diaktifkan' : 'disembunyikan'}.`);
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-semibold ${
                      prod.active
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-[#E7DDD3] text-[#554336]'
                    }`}
                  >
                    {prod.active ? 'Aktif' : 'Tutup'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProduct(prod)}
                    className="px-2.5 py-1 rounded border border-[#DBC2B0] bg-white text-xs font-semibold"
                  >
                    Sunting
                  </button>
                </div>
              </div>
            ))}
          </div>

          {editingProduct && (
            <div className="bakery-sheet rounded-xl p-5 space-y-3">
              <h3 className="font-display text-xl font-bold text-[#292524]">
                Sunting {editingProduct.name.ms}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Lead Time (Hari)</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={editingProduct.leadTimeDays}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        leadTimeDays: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#DBC2B0] bg-white"
                  />
                </div>
                {editingProduct.formats.whole && (
                  <div>
                    <label className="block font-semibold mb-1">Harga Whole (Sen)</label>
                    <input
                      type="number"
                      value={editingProduct.formats.whole.priceSen}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          formats: {
                            ...editingProduct.formats,
                            whole: {
                              ...editingProduct.formats.whole!,
                              priceSen: Number(e.target.value),
                            },
                          },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#DBC2B0] bg-white"
                    />
                  </div>
                )}
                {editingProduct.formats.loaf && (
                  <div>
                    <label className="block font-semibold mb-1">Harga Loaf (Sen)</label>
                    <input
                      type="number"
                      value={editingProduct.formats.loaf.priceSen}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          formats: {
                            ...editingProduct.formats,
                            loaf: {
                              ...editingProduct.formats.loaf!,
                              priceSen: Number(e.target.value),
                            },
                          },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#DBC2B0] bg-white"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await saveProductAdmin(editingProduct, account.uid, account.email);
                    setEditingProduct(null);
                    await onRefreshStore();
                    showNotice('Produk dikemaskini.');
                  }}
                  className="px-4 py-2 rounded-lg bg-[#D97706] text-white text-xs font-semibold"
                >
                  Simpan Perubahan
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-lg border border-[#DBC2B0] text-xs"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: SHIPPING & STORE SETTINGS (FR-45) */}
      {tab === 'shipping' && canManage && (
        <div className="space-y-6">
          <div className="bakery-glass rounded-xl p-5 space-y-4">
            <h2 className="font-display text-xl font-semibold text-[#292524]">
              Kadar Kurier Mengikut Wilayah
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {shippingRates.map((rate) => (
                <div key={rate.id} className="rounded-xl bg-white border border-[#E7DDD3] p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[#292524]">{rate.courierName}</span>
                    <button
                      type="button"
                      onClick={async () => {
                        await saveShippingRateAdmin(
                          { ...rate, active: !rate.active },
                          account.uid,
                          account.email
                        );
                        await onRefreshStore();
                        showNotice(`${rate.courierName} (${rate.region}) dikemaskini.`);
                      }}
                      className={`px-2 py-0.5 rounded font-semibold ${
                        rate.active ? 'bg-emerald-100 text-emerald-900' : 'bg-[#E7DDD3] text-[#554336]'
                      }`}
                    >
                      {rate.active ? 'Aktif' : 'Ditutup'}
                    </button>
                  </div>
                  <p className="text-[#554336]">{rate.regionLabel[locale]}</p>
                  <p className="font-bold text-sm text-[#831843] tabular-nums">
                    {formatMYR(rate.feeSen)} · {rate.estimatedDaysMin}–{rate.estimatedDaysMax} hari
                  </p>
                </div>
              ))}
            </div>
          </div>

          {isOwner && (
            <div className="bakery-glass rounded-xl p-5 space-y-4">
              <h2 className="font-display text-xl font-semibold text-[#292524]">
                Tetapan Penghantaran Balik Pulau & Polisi Kedai (Owner)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Caj Balik Pulau (Sen, RM5 = 500)</label>
                  <input
                    type="number"
                    value={settingsDraft.selfDelivery.feeSen}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        selfDelivery: {
                          ...settingsDraft.selfDelivery,
                          feeSen: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#DBC2B0]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">
                    Poskod Balik Pulau (dipisah koma)
                  </label>
                  <input
                    type="text"
                    value={settingsDraft.selfDelivery.postcodes.join(', ')}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        selfDelivery: {
                          ...settingsDraft.selfDelivery,
                          postcodes: e.target.value
                            .split(',')
                            .map((s) => s.trim())
                            .filter(Boolean),
                        },
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#DBC2B0]"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Had Kapasiti Harian Default</label>
                  <input
                    type="number"
                    value={settingsDraft.defaultDailyLimit}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        defaultDailyLimit: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#DBC2B0]"
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="deposit-toggle"
                    checked={settingsDraft.selfDelivery.depositEnabled}
                    onChange={(e) =>
                      setSettingsDraft({
                        ...settingsDraft,
                        selfDelivery: {
                          ...settingsDraft.selfDelivery,
                          depositEnabled: e.target.checked,
                        },
                      })
                    }
                  />
                  <label htmlFor="deposit-toggle" className="font-semibold">
                    Benarkan Deposit 50% (Balik Pulau Sahaja)
                  </label>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await saveStoreSettingsAdmin(settingsDraft, account.uid, account.email);
                  await onRefreshStore();
                  showNotice('Tetapan kedai berjaya disimpan.');
                }}
                className="px-5 py-2.5 rounded-lg bg-[#D97706] text-white text-xs font-semibold"
              >
                Simpan Tetapan Kedai
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB: CUSTOM REQUESTS & REVIEWS */}
      {tab === 'requests' && canManage && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bakery-glass rounded-xl p-5 space-y-3">
            <h2 className="font-display text-xl font-semibold text-[#292524]">
              Permintaan Kek Khas (Whole Sahaja)
            </h2>
            {customRequests.map((req) => (
              <div key={req.id} className="rounded-lg bg-white border border-[#E7DDD3] p-3.5 text-xs space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span>{req.name} ({req.phone})</span>
                  <span className="text-[#831843] uppercase">{req.status}</span>
                </div>
                <p className="font-semibold text-[#292524]">{req.requestedFlavour}</p>
                {req.notes && <p className="text-[#554336]">{req.notes}</p>}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      await updateCustomRequestAdmin(req, 'quoted', 'Sebut harga dihantar melalui WhatsApp.');
                      await loadAdminData();
                      showNotice('Permintaan ditanda sebagai Quoted.');
                    }}
                    className="px-2.5 py-1 rounded bg-[#D97706] text-white font-semibold"
                  >
                    Tanda Quoted
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="bakery-glass rounded-xl p-5 space-y-3">
            <h2 className="font-display text-xl font-semibold text-[#292524]">
              Moderasi Ulasan Pelanggan
            </h2>
            {reviews.map((rev) => (
              <div key={rev.id} className="rounded-lg bg-white border border-[#E7DDD3] p-3.5 text-xs space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span>{rev.authorName} · {rev.rating}★</span>
                  <span className={rev.approved ? 'text-emerald-700' : 'text-[#831843]'}>
                    {rev.approved ? 'Diterbitkan' : 'Menunggu'}
                  </span>
                </div>
                <p className="text-[#554336]">{rev.text}</p>
                <button
                  type="button"
                  onClick={async () => {
                    await moderateReviewAdmin(rev.id, !rev.approved);
                    await onRefreshStore();
                    showNotice('Status ulasan dikemaskini.');
                  }}
                  className="px-2.5 py-1 rounded border border-[#DBC2B0] font-semibold"
                >
                  {rev.approved ? 'Sembunyikan' : 'Luluskan'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: USERS & ROLES (OWNER ONLY - AC-07) */}
      {tab === 'users' && isOwner && (
        <div className="bakery-glass rounded-xl p-5 space-y-4">
          <h2 className="font-display text-xl font-semibold text-[#292524]">
            Pengurusan Pengguna & Peranan Staf
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#DBC2B0] text-[#554336]">
                  <th className="py-2 pr-4">Nama</th>
                  <th className="py-2 pr-4">Emel Google</th>
                  <th className="py-2 pr-4">Peranan</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7DDD3]">
                {usersList.map((u) => (
                  <tr key={u.uid}>
                    <td className="py-2.5 pr-4 font-semibold text-[#292524]">{u.displayName}</td>
                    <td className="py-2.5 pr-4">{u.email}</td>
                    <td className="py-2.5 pr-4">
                      <select
                        value={u.role}
                        onChange={async (e) => {
                          await updateUserRoleAdmin({
                            targetUser: u,
                            newRole: e.target.value as UserRole,
                            active: u.active,
                            actorUid: account.uid,
                            actorEmail: account.email,
                          });
                          await loadAdminData();
                          showNotice(`Peranan ${u.email} ditukar kepada ${e.target.value}.`);
                        }}
                        className="px-2 py-1 rounded border border-[#DBC2B0] bg-white"
                      >
                        <option value="customer">Customer</option>
                        <option value="helper">Helper</option>
                        <option value="manager">Manager</option>
                        <option value="owner">Owner</option>
                      </select>
                    </td>
                    <td className="py-2.5">
                      <button
                        type="button"
                        onClick={async () => {
                          await updateUserRoleAdmin({
                            targetUser: u,
                            newRole: u.role,
                            active: !u.active,
                            actorUid: account.uid,
                            actorEmail: account.email,
                          });
                          await loadAdminData();
                        }}
                        className={`px-2.5 py-1 rounded font-semibold ${
                          u.active ? 'bg-emerald-100 text-emerald-900' : 'bg-[#FFDAD6] text-[#93000A]'
                        }`}
                      >
                        {u.active ? 'Aktif' : 'Disekat'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: AUDIT LOG (OWNER ONLY - FR-49) */}
      {tab === 'audit' && isOwner && (
        <div className="bakery-glass rounded-xl p-5 space-y-4">
          <h2 className="font-display text-xl font-semibold text-[#292524]">
            Log Audit Perubahan Sistem
          </h2>
          <div className="space-y-2 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="rounded-lg bg-white border border-[#E7DDD3] p-3 flex flex-wrap justify-between gap-2">
                <div>
                  <span className="font-mono font-bold text-[#831843]">{log.action}</span> ·{' '}
                  <span className="font-semibold text-[#292524]">{log.entity}</span>
                  <p className="text-[#554336] mt-0.5">
                    Oleh {log.actorEmail}
                    {log.after ? ` → ${log.after}` : ''}
                  </p>
                </div>
                <span className="font-mono text-[11px] text-[#554336]">
                  {typeof log.timestamp === 'string' ? log.timestamp.slice(0, 16) : 'Baru'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
