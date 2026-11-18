import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  AuditLog,
  CapacityDay,
  CartItem,
  CustomerProfile,
  CustomRequest,
  DamageClaim,
  FulfilmentMethod,
  Order,
  OrderStatus,
  OrderTracking,
  PaymentMethod,
  PaymentStatus,
  Product,
  PromoCode,
  Review,
  SavedAddress,
  ShippingRate,
  StoreSettings,
  UserAccount,
  UserRole,
} from '../types/domain';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { calculateCartTotals } from '../lib/pricing';
import { getKualaLumpurTodayISO } from '../lib/malaysia';
import {
  buildSeedCapacity,
  buildSeedOrders,
  SEED_AUDIT_LOGS,
  SEED_CUSTOM_REQUESTS,
  SEED_PRODUCTS,
  SEED_PROMOS,
  SEED_REVIEWS,
  SEED_SETTINGS,
  SEED_SHIPPING_RATES,
} from '../data/seedData';

function generateRandomId(prefix: string, length = 18): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = prefix;
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function seedDatabase(force = false): Promise<{ seeded: boolean; count: number }> {
  try {
    const settingsSnap = await getDoc(doc(db, 'settings', 'store'));
    if (settingsSnap.exists() && !force) {
      return { seeded: false, count: 0 };
    }

    const batch = writeBatch(db);
    let count = 0;

    batch.set(doc(db, 'settings', 'store'), {
      ...SEED_SETTINGS,
      updatedAt: serverTimestamp(),
    });
    count++;

    for (const prod of SEED_PRODUCTS) {
      batch.set(doc(db, 'products', prod.id), {
        ...prod,
        updatedAt: serverTimestamp(),
      });
      count++;
    }

    for (const rate of SEED_SHIPPING_RATES) {
      batch.set(doc(db, 'shippingRates', rate.id), rate);
      count++;
    }

    for (const promo of SEED_PROMOS) {
      batch.set(doc(db, 'promos', promo.code), promo);
      count++;
    }

    const capDays = buildSeedCapacity();
    for (const day of capDays) {
      batch.set(doc(db, 'capacity', day.date), day);
      count++;
    }

    const { orders, trackings } = buildSeedOrders();
    for (const o of orders) {
      batch.set(doc(db, 'orders', o.id), o);
      count++;
    }
    for (const tr of trackings) {
      batch.set(doc(db, 'orderTracking', tr.orderNo === 'DM-2026-1001'
        ? 'trk_dmayra_1001_a9f8c2e1'
        : tr.orderNo === 'DM-2026-1002'
        ? 'trk_dmayra_1002_b7d3k4p9'
        : tr.orderNo === 'DM-2026-1003'
        ? 'trk_dmayra_1003_c8e2m1z5'
        : 'trk_dmayra_1004_f4x9r2w8'), tr);
      count++;
    }

    for (const rev of SEED_REVIEWS) {
      batch.set(doc(db, 'reviews', rev.id), rev);
      count++;
    }

    for (const req of SEED_CUSTOM_REQUESTS) {
      batch.set(doc(db, 'customRequests', req.id), req);
      count++;
    }

    for (const log of SEED_AUDIT_LOGS) {
      batch.set(doc(db, 'auditLogs', log.id), log);
      count++;
    }

    await batch.commit();
    return { seeded: true, count };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'seedDatabase');
  }
}

export async function fetchStoreBootstrap(includeInactiveProducts = false): Promise<{
  products: Product[];
  shippingRates: ShippingRate[];
  settings: StoreSettings;
  capacity: CapacityDay[];
  reviews: Review[];
  fromFirestore: boolean;
}> {
  let fromFirestore = false;
  let products: Product[] = [];
  let shippingRates: ShippingRate[] = [];
  let settings: StoreSettings = SEED_SETTINGS;
  let capacity: CapacityDay[] = [];
  let reviews: Review[] = [];

  try {
    const prodQuery = includeInactiveProducts
      ? collection(db, 'products')
      : query(collection(db, 'products'), where('active', '==', true));
    const prodSnap = await getDocs(prodQuery);
    if (!prodSnap.empty) {
      products = prodSnap.docs.map((d) => d.data() as Product);
      fromFirestore = true;
    } else {
      products = SEED_PRODUCTS;
    }

    const rateQuery = includeInactiveProducts
      ? collection(db, 'shippingRates')
      : query(collection(db, 'shippingRates'), where('active', '==', true));
    const rateSnap = await getDocs(rateQuery);
    shippingRates = !rateSnap.empty
      ? rateSnap.docs.map((d) => d.data() as ShippingRate)
      : SEED_SHIPPING_RATES;

    const settingsSnap = await getDoc(doc(db, 'settings', 'store'));
    if (settingsSnap.exists()) {
      settings = settingsSnap.data() as StoreSettings;
    }

    const capSnap = await getDocs(query(collection(db, 'capacity'), limit(90)));
    capacity = !capSnap.empty ? capSnap.docs.map((d) => d.data() as CapacityDay) : buildSeedCapacity();

    const revQuery = includeInactiveProducts
      ? collection(db, 'reviews')
      : query(collection(db, 'reviews'), where('approved', '==', true));
    const revSnap = await getDocs(revQuery);
    reviews = !revSnap.empty ? revSnap.docs.map((d) => ({ ...(d.data() as Review), id: d.id })) : SEED_REVIEWS;

    return { products, shippingRates, settings, capacity, reviews, fromFirestore };
  } catch (err) {
    console.warn('Using fallback store seed data due to Firestore read issue:', err);
    return {
      products: SEED_PRODUCTS,
      shippingRates: SEED_SHIPPING_RATES,
      settings: SEED_SETTINGS,
      capacity: buildSeedCapacity(),
      reviews: SEED_REVIEWS,
      fromFirestore: false,
    };
  }
}

export async function validatePromoCode(codeRaw: string): Promise<PromoCode | null> {
  const code = codeRaw.trim().toUpperCase();
  if (!code) return null;
  try {
    const snap = await getDoc(doc(db, 'promos', code));
    if (snap.exists()) {
      const promo = snap.data() as PromoCode;
      return promo.active ? promo : null;
    }
  } catch {
    // Fallback to seeded promos if Firestore promos not yet seeded
  }
  const seed = SEED_PROMOS.find((p) => p.code === code && p.active);
  return seed || null;
}

export interface CreateOrderInput {
  buyerUid?: string | null;
  buyer: { name: string; phone: string; email: string };
  recipient: { name: string; phone: string };
  items: CartItem[];
  products: Product[];
  fulfilment: {
    method: FulfilmentMethod;
    courier?: 'pos_laju' | 'citylink' | 'jnt' | null;
    courierName: string;
    address: string;
    state: string;
    postcode: string;
    region: 'west_malaysia' | 'sabah' | 'sarawak' | 'balik_pulau';
    dispatchDate: string;
    estimatedArrival: string;
  };
  shippingFeeSen: number;
  promo?: PromoCode | null;
  settings: StoreSettings;
  payDepositOnly: boolean;
  paymentMethod: PaymentMethod;
  termsAccepted: boolean;
}

export async function createOrderWithCapacityHold(
  input: CreateOrderInput
): Promise<{ order: Order; tracking: OrderTracking }> {
  const productsById = new Map(input.products.map((p) => [p.id, p]));
  const todayISO = getKualaLumpurTodayISO();

  // Recompute authoritative pricing (AC-03)
  const totals = calculateCartTotals({
    items: input.items,
    productsById,
    shippingFeeSen: input.shippingFeeSen,
    fulfilmentMethod: input.fulfilment.method,
    promo: input.promo,
    freeShippingThresholdSen: input.settings.freeShippingThresholdSen,
    selfDeliveryConfig: input.settings.selfDelivery,
    payDepositOnly: input.payDepositOnly,
    todayISO,
  });

  const orderNo = `DM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const orderId = `${orderNo}-${Math.floor(100 + Math.random() * 899)}`;
  const trackingToken = generateRandomId('trk_', 20);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const capRef = doc(db, 'capacity', input.fulfilment.dispatchDate);

  try {
    await runTransaction(db, async (tx) => {
      const capSnap = await tx.get(capRef);
      const weekday = new Date(`${input.fulfilment.dispatchDate}T00:00:00Z`).getUTCDay();
      const existingCap: CapacityDay = capSnap.exists()
        ? (capSnap.data() as CapacityDay)
        : {
            date: input.fulfilment.dispatchDate,
            limit: input.settings.defaultDailyLimit,
            used: 0,
            dispatchEnabled: input.settings.dispatchDays.includes(weekday),
            selfDeliveryEnabled: input.settings.selfDelivery.days.includes(weekday),
            blocked: false,
          };

      if (existingCap.blocked) {
        throw new Error('CAPACITY_BLOCKED');
      }
      if (existingCap.used + totals.totalCapacitySlots > existingCap.limit) {
        throw new Error('CAPACITY_EXCEEDED');
      }

      const newUsed = Number((existingCap.used + totals.totalCapacitySlots).toFixed(2));
      if (capSnap.exists()) {
        tx.update(capRef, { used: newUsed });
      } else {
        tx.set(capRef, { ...existingCap, used: newUsed });
      }
    });
  } catch (err) {
    if (err instanceof Error && (err.message === 'CAPACITY_EXCEEDED' || err.message === 'CAPACITY_BLOCKED')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.WRITE, `capacity/${input.fulfilment.dispatchDate}`);
  }

  const orderDoc: Order = {
    id: orderId,
    orderNo,
    trackingToken,
    buyerUid: input.buyerUid ?? null,
    buyer: input.buyer,
    recipient: input.recipient,
    items: input.items.map((it) => ({
      productId: it.productId,
      productName: it.productName,
      format: it.format,
      quantity: it.quantity,
      comboPicks: it.comboPicks,
      notes: it.notes,
      unitPriceSen: it.unitPriceSen,
      lineTotalSen: it.lineTotalSen,
      capacitySlots: it.capacitySlots,
      packedWeightGrams: it.packedWeightGrams,
    })),
    fulfilment: {
      ...input.fulfilment,
      parcelWeightGrams: totals.totalWeightGrams,
    },
    pricing: {
      subtotalSen: totals.subtotalSen,
      shippingFeeSen: totals.shippingFeeSen,
      discountSen: totals.discountSen,
      promoCode: input.promo?.code ?? null,
      totalSen: totals.totalSen,
      amountDueNowSen: totals.amountDueNowSen,
      balanceDueSen: totals.balanceDueSen,
    },
    payment: {
      status: 'pending',
      method: input.paymentMethod,
    },
    status: 'pending_payment',
    termsAccepted: input.termsAccepted,
    termsVersion: input.settings.termsVersion,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    expiresAt,
  };

  const trackingDoc: OrderTracking = {
    orderNo,
    orderId,
    status: 'pending_payment',
    fulfilmentMethod: input.fulfilment.method,
    courierName: input.fulfilment.courierName,
    trackingNo: '',
    trackingUrl: '',
    dispatchDate: input.fulfilment.dispatchDate,
    estimatedArrival: input.fulfilment.estimatedArrival,
    cityState: `${input.fulfilment.postcode} · ${input.fulfilment.state}`,
    itemsSummary: input.items.map((it) => ({
      name: it.productName,
      format: it.format,
      quantity: it.quantity,
      comboPicks: it.comboPicks,
      notes: it.notes,
    })),
    totalSen: totals.totalSen,
    amountDueNowSen: totals.amountDueNowSen,
    balanceDueSen: totals.balanceDueSen,
    paymentStatus: 'pending',
    history: [
      {
        status: 'pending_payment',
        changedBy: 'Checkout',
        note: 'Slot kapasiti dikunci selama 30 minit sementara menunggu bayaran.',
        timestamp: new Date().toISOString(),
      },
    ],
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'orders', orderId), orderDoc);
    await setDoc(doc(db, 'orderTracking', trackingToken), trackingDoc);
    await setDoc(doc(db, 'orders', orderId, 'history', 'h_init'), {
      status: 'pending_payment',
      changedBy: 'System',
      note: 'Pesanan dicipta & slot dikunci',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `orders/${orderId}`);
  }

  return { order: orderDoc, tracking: trackingDoc };
}

export async function completeOrderPayment(params: {
  order: Order;
  tracking: OrderTracking;
  method: PaymentMethod;
  bankName?: string;
  receiptRef?: string;
}): Promise<{ order: Order; tracking: OrderTracking }> {
  const isManualTransfer = params.method === 'bank_transfer';
  const isDeposit = params.order.pricing.balanceDueSen > 0;
  const newPaymentStatus: PaymentStatus = isManualTransfer
    ? 'pending'
    : isDeposit
    ? 'deposit_paid'
    : 'paid';
  const newOrderStatus: OrderStatus = isManualTransfer ? 'pending_payment' : 'confirmed';
  const gatewayRef = `${params.method.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const nowISO = new Date().toISOString();

  const updatedPayment = {
    status: newPaymentStatus,
    method: params.method,
    gatewayRef,
    bankName: params.bankName || '',
    receiptRef: params.receiptRef || '',
    paidAt: isManualTransfer ? '' : nowISO,
  };

  const newHistoryEntry = {
    status: newOrderStatus,
    changedBy: isManualTransfer ? 'Manual Transfer' : 'Payment Gateway',
    note: isManualTransfer
      ? `Resit pindahan bank dimuat naik (${params.receiptRef || 'menunggu semakan admin'}).`
      : `Bayaran disahkan (${params.method.toUpperCase()} · ${gatewayRef}).`,
    timestamp: nowISO,
  };

  const updatedHistory = [...params.tracking.history, newHistoryEntry];

  try {
    await updateDoc(doc(db, 'orders', params.order.id), {
      payment: updatedPayment,
      status: newOrderStatus,
      updatedAt: serverTimestamp(),
    });

    await updateDoc(doc(db, 'orderTracking', params.order.trackingToken), {
      paymentStatus: newPaymentStatus,
      status: newOrderStatus,
      history: updatedHistory,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `orders/${params.order.id}`);
  }

  return {
    order: { ...params.order, payment: updatedPayment, status: newOrderStatus },
    tracking: {
      ...params.tracking,
      paymentStatus: newPaymentStatus,
      status: newOrderStatus,
      history: updatedHistory,
    },
  };
}

export async function getOrderTrackingByToken(tokenRaw: string): Promise<OrderTracking | null> {
  const token = tokenRaw.trim();
  if (!token) return null;

  // Check seeded demo shortcuts by orderNo or trackingToken first
  const demoMap: Record<string, string> = {
    'DM-2026-1001': 'trk_dmayra_1001_a9f8c2e1',
    'DM-2026-1002': 'trk_dmayra_1002_b7d3k4p9',
    'DM-2026-1003': 'trk_dmayra_1003_c8e2m1z5',
    'DM-2026-1004': 'trk_dmayra_1004_f4x9r2w8',
  };
  const resolvedToken = demoMap[token.toUpperCase()] || token;

  if (resolvedToken.length >= 16) {
    try {
      const snap = await getDoc(doc(db, 'orderTracking', resolvedToken));
      if (snap.exists()) {
        return snap.data() as OrderTracking;
      }
    } catch {
      // Fall back to demo seed check below
    }
  }

  // Fallback for seeded orders before Owner seeds Firestore
  const { trackings } = buildSeedOrders();
  const matchedSeed = trackings.find(
    (t) =>
      t.orderNo.toUpperCase() === token.toUpperCase() ||
      (demoMap[t.orderNo] && demoMap[t.orderNo] === resolvedToken)
  );
  return matchedSeed || null;
}

export async function submitOrderProblemReport(params: {
  trackingToken: string;
  orderId: string;
  claim: DamageClaim;
}): Promise<void> {
  try {
    await updateDoc(doc(db, 'orderTracking', params.trackingToken), {
      damageClaim: params.claim,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `orderTracking/${params.trackingToken}`);
  }
}

export async function submitOrderChangeRequest(params: {
  trackingToken: string;
  note: string;
}): Promise<void> {
  try {
    await updateDoc(doc(db, 'orderTracking', params.trackingToken), {
      changeRequest: {
        note: params.note,
        status: 'pending',
        requestedAt: new Date().toISOString(),
      },
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `orderTracking/${params.trackingToken}`);
  }
}

export async function createCustomCakeRequest(
  req: Omit<CustomRequest, 'id' | 'status' | 'createdAt'>
): Promise<string> {
  const id = generateRandomId('creq_', 12);
  try {
    await setDoc(doc(db, 'customRequests', id), {
      ...req,
      status: 'new',
      createdAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `customRequests/${id}`);
  }
}

export async function fetchMyOrders(uid: string): Promise<Order[]> {
  try {
    const q = query(
      collection(db, 'orders'),
      where('buyerUid', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...(d.data() as Order), id: d.id }));
  } catch (err) {
    // Fallback without composite index if needed
    try {
      const q2 = query(collection(db, 'orders'), where('buyerUid', '==', uid), limit(30));
      const snap2 = await getDocs(q2);
      return snap2.docs.map((d) => ({ ...(d.data() as Order), id: d.id }));
    } catch (innerErr) {
      handleFirestoreError(innerErr, OperationType.LIST, 'orders');
    }
  }
}

export async function saveCustomerAddresses(
  uid: string,
  phone: string,
  savedAddresses: SavedAddress[],
  marketingConsent: boolean
): Promise<void> {
  try {
    await setDoc(
      doc(db, 'customers', uid),
      {
        uid,
        phone,
        savedAddresses,
        marketingConsent,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `customers/${uid}`);
  }
}

export async function submitCustomerReview(params: {
  orderNo: string;
  authorName: string;
  uid: string;
  rating: number;
  text: string;
}): Promise<void> {
  const id = generateRandomId('rev_', 12);
  try {
    await setDoc(doc(db, 'reviews', id), {
      orderNo: params.orderNo,
      authorName: params.authorName,
      uid: params.uid,
      rating: params.rating,
      text: params.text,
      approved: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `reviews/${id}`);
  }
}

// ============================================================================
// Admin Back-Office Services
// ============================================================================

export async function logAdminAudit(params: {
  actorUid: string;
  actorEmail: string;
  action: string;
  entity: string;
  before?: string;
  after?: string;
}): Promise<void> {
  const id = generateRandomId('aud_', 14);
  try {
    await setDoc(doc(db, 'auditLogs', id), {
      ...params,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Audit log write skipped:', err);
  }
}

export async function fetchAdminOrders(): Promise<Order[]> {
  try {
    const snap = await getDocs(query(collection(db, 'orders'), limit(100)));
    if (snap.empty) {
      return buildSeedOrders().orders;
    }
    return snap.docs.map((d) => ({ ...(d.data() as Order), id: d.id }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'orders');
  }
}

export async function updateOrderStatusAndTracking(params: {
  order: Order;
  newStatus: OrderStatus;
  trackingNo?: string;
  trackingUrl?: string;
  paymentStatus?: PaymentStatus;
  actorUid: string;
  actorEmail: string;
  note?: string;
}): Promise<void> {
  const { order, newStatus, trackingNo, trackingUrl, paymentStatus, actorUid, actorEmail, note } = params;
  const updatedFulfilment = {
    ...order.fulfilment,
    ...(trackingNo !== undefined ? { trackingNo } : {}),
    ...(trackingUrl !== undefined ? { trackingUrl } : {}),
  };
  const updatedPayment = {
    ...order.payment,
    ...(paymentStatus ? { status: paymentStatus } : {}),
  };

  try {
    await updateDoc(doc(db, 'orders', order.id), {
      status: newStatus,
      fulfilment: updatedFulfilment,
      payment: updatedPayment,
      updatedAt: serverTimestamp(),
    });

    const trRef = doc(db, 'orderTracking', order.trackingToken);
    const trSnap = await getDoc(trRef);
    const prevHistory = trSnap.exists() ? (trSnap.data() as OrderTracking).history || [] : [];
    const newEntry = {
      status: newStatus,
      changedBy: actorEmail,
      note:
        note ||
        (newStatus === 'shipped' && trackingNo
          ? `Dipos melalui ${order.fulfilment.courierName} · No. Penjejakan: ${trackingNo}`
          : `Status dikemaskini kepada ${newStatus}.`),
      timestamp: new Date().toISOString(),
    };

    if (trSnap.exists()) {
      await updateDoc(trRef, {
        status: newStatus,
        trackingNo: updatedFulfilment.trackingNo || '',
        trackingUrl: updatedFulfilment.trackingUrl || '',
        paymentStatus: updatedPayment.status,
        history: [...prevHistory, newEntry],
        updatedAt: serverTimestamp(),
      });
    }

    await logAdminAudit({
      actorUid,
      actorEmail,
      action: 'UPDATE_ORDER_STATUS',
      entity: `orders/${order.orderNo}`,
      before: order.status,
      after: `${newStatus}${trackingNo ? ` (${trackingNo})` : ''}`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
  }
}

export async function saveProductAdmin(
  product: Product,
  actorUid: string,
  actorEmail: string
): Promise<void> {
  try {
    await setDoc(doc(db, 'products', product.id), {
      ...product,
      updatedAt: serverTimestamp(),
    });
    await logAdminAudit({
      actorUid,
      actorEmail,
      action: 'SAVE_PRODUCT',
      entity: `products/${product.id}`,
      after: `${product.name.ms} (Active: ${product.active})`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `products/${product.id}`);
  }
}

export async function saveCapacityDayAdmin(
  day: CapacityDay,
  actorUid: string,
  actorEmail: string
): Promise<void> {
  try {
    await setDoc(doc(db, 'capacity', day.date), day);
    await logAdminAudit({
      actorUid,
      actorEmail,
      action: 'UPDATE_CAPACITY',
      entity: `capacity/${day.date}`,
      after: `limit=${day.limit}, blocked=${day.blocked}`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `capacity/${day.date}`);
  }
}

export async function saveShippingRateAdmin(
  rate: ShippingRate,
  actorUid: string,
  actorEmail: string
): Promise<void> {
  try {
    await setDoc(doc(db, 'shippingRates', rate.id), rate);
    await logAdminAudit({
      actorUid,
      actorEmail,
      action: 'UPDATE_SHIPPING_RATE',
      entity: `shippingRates/${rate.id}`,
      after: `feeSen=${rate.feeSen}, active=${rate.active}`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `shippingRates/${rate.id}`);
  }
}

export async function saveStoreSettingsAdmin(
  settings: StoreSettings,
  actorUid: string,
  actorEmail: string
): Promise<void> {
  try {
    await setDoc(doc(db, 'settings', 'store'), {
      ...settings,
      updatedAt: serverTimestamp(),
    });
    await logAdminAudit({
      actorUid,
      actorEmail,
      action: 'UPDATE_SETTINGS',
      entity: 'settings/store',
      after: `leadTime=${settings.defaultLeadTimeDays}, selfDeliveryRM=${(
        settings.selfDelivery.feeSen / 100
      ).toFixed(2)}`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/store');
  }
}

export async function fetchAdminUsers(): Promise<UserAccount[]> {
  try {
    const snap = await getDocs(query(collection(db, 'users'), limit(100)));
    return snap.docs.map((d) => d.data() as UserAccount);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'users');
  }
}

export async function updateUserRoleAdmin(params: {
  targetUser: UserAccount;
  newRole: UserRole;
  active: boolean;
  actorUid: string;
  actorEmail: string;
}): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', params.targetUser.uid), {
      role: params.newRole,
      active: params.active,
      updatedAt: serverTimestamp(),
    });
    await logAdminAudit({
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
      action: 'UPDATE_USER_ROLE',
      entity: `users/${params.targetUser.email}`,
      before: `${params.targetUser.role} (active=${params.targetUser.active})`,
      after: `${params.newRole} (active=${params.active})`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${params.targetUser.uid}`);
  }
}

export async function fetchAdminAuditLogs(): Promise<AuditLog[]> {
  try {
    const snap = await getDocs(query(collection(db, 'auditLogs'), limit(80)));
    if (snap.empty) return SEED_AUDIT_LOGS;
    return snap.docs.map((d) => ({ ...(d.data() as AuditLog), id: d.id }));
  } catch {
    return SEED_AUDIT_LOGS;
  }
}

export async function fetchCustomRequestsAdmin(): Promise<CustomRequest[]> {
  try {
    const snap = await getDocs(query(collection(db, 'customRequests'), limit(50)));
    if (snap.empty) return SEED_CUSTOM_REQUESTS;
    return snap.docs.map((d) => ({ ...(d.data() as CustomRequest), id: d.id }));
  } catch {
    return SEED_CUSTOM_REQUESTS;
  }
}

export async function updateCustomRequestAdmin(
  req: CustomRequest,
  status: 'new' | 'quoted' | 'closed',
  quoteNotes: string
): Promise<void> {
  try {
    await updateDoc(doc(db, 'customRequests', req.id), {
      status,
      quoteNotes,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `customRequests/${req.id}`);
  }
}

export async function moderateReviewAdmin(reviewId: string, approved: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, 'reviews', reviewId), { approved });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `reviews/${reviewId}`);
  }
}
