export type Locale = 'ms' | 'en';

export type CakeRange = 'budget' | 'classic' | 'cadbury' | 'trendy';
export type BaseFat = 'butter' | 'margarine';
export type CakeFormat = 'whole' | 'loaf' | 'combo';
export type CourierId = 'pos_laju' | 'citylink' | 'jnt';
export type RegionId = 'west_malaysia' | 'sabah' | 'sarawak';
export type FulfilmentMethod = 'courier' | 'self_delivery';
export type UserRole = 'owner' | 'manager' | 'helper' | 'customer';

export type OrderStatus =
  | 'pending_payment'
  | 'confirmed'
  | 'in_production'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'deposit_paid'
  | 'failed'
  | 'refunded'
  | 'partial_refund';

export type PaymentMethod = 'fpx' | 'duitnow_qr' | 'card' | 'bank_transfer';

export interface LocalizedText {
  ms: string;
  en: string;
}

export interface ProductFormatSpec {
  priceSen: number;
  capacityWeight: number;
  packedWeightGrams: number;
}

export interface ProductComboRule {
  pickCount: number;
  flavours: string[];
  priceSen: number;
  capacityWeight: number;
  packedWeightGrams: number;
}

export interface Product {
  id: string;
  slug: string;
  name: LocalizedText;
  description: LocalizedText;
  flavour: LocalizedText;
  ingredients: LocalizedText;
  range: CakeRange;
  baseFat: BaseFat;
  imageUrl: string;
  active: boolean;
  featured: boolean;
  leadTimeDays: number;
  allergens: string[];
  formats: {
    whole?: ProductFormatSpec;
    loaf?: ProductFormatSpec;
    combo?: ProductComboRule;
  };
  comboRule?: ProductComboRule;
  durianNotice?: boolean;
  updatedAt?: unknown;
}

export interface ShippingRate {
  id: string;
  courier: CourierId;
  courierName: string;
  region: RegionId;
  regionLabel: LocalizedText;
  feeSen: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  trackingUrlTemplate: string;
  active: boolean;
}

export interface CapacityDay {
  date: string; // yyyy-mm-dd
  limit: number;
  used: number;
  dispatchEnabled: boolean;
  selfDeliveryEnabled: boolean;
  blocked: boolean;
  note?: string;
  campaignLabel?: string;
}

export interface SelfDeliveryConfig {
  enabled: boolean;
  feeSen: number;
  postcodes: string[];
  days: number[]; // 0=Sun..6=Sat
  depositEnabled: boolean;
  depositPercent: number;
}

export interface SeasonalCampaign {
  active: boolean;
  titleMs: string;
  titleEn: string;
  closeDate: string;
  fixedDispatchDates: string[];
}

export interface StoreSettings {
  storeName: string;
  ssmNo: string;
  contactPhone: string;
  contactEmail: string;
  whatsappNumber: string;
  defaultDailyLimit: number;
  defaultLeadTimeDays: number;
  dispatchDays: number[]; // 1=Mon, 2=Tue, 3=Wed
  selfDelivery: SelfDeliveryConfig;
  freeShippingThresholdSen: number;
  termsVersion: string;
  termsText: LocalizedText;
  privacyText: LocalizedText;
  holidays: string[];
  seasonalCampaign: SeasonalCampaign;
  updatedAt?: unknown;
}

export interface PromoCode {
  code: string;
  type: 'percent' | 'fixed';
  value: number; // percent integer (e.g. 10) or sen integer (e.g. 500)
  minSpendSen: number;
  expiresAt: string;
  usesLeft: number;
  active: boolean;
}

export interface CartSelection {
  format: CakeFormat;
  quantity: number;
  comboPicks?: string[];
  notes?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: LocalizedText;
  imageUrl: string;
  range: CakeRange;
  baseFat: BaseFat;
  leadTimeDays: number;
  format: CakeFormat;
  quantity: number;
  comboPicks: string[];
  notes: string;
  unitPriceSen: number;
  lineTotalSen: number;
  capacitySlots: number;
  packedWeightGrams: number;
}

export interface OrderHistoryEntry {
  status: OrderStatus;
  changedBy: string;
  note: string;
  timestamp: string;
}

export interface DamageClaim {
  reason: 'damaged_in_transit' | 'late_delivery' | 'wrong_item';
  description: string;
  photoDataUrl?: string;
  status: 'pending' | 'approved_replacement' | 'approved_refund' | 'rejected';
  resolutionNote?: string;
  submittedAt: string;
}

export interface ChangeRequest {
  note: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
}

export interface Order {
  id: string;
  orderNo: string;
  trackingToken: string;
  buyerUid?: string | null;
  buyer: {
    name: string;
    phone: string;
    email: string;
  };
  recipient: {
    name: string;
    phone: string;
  };
  items: {
    productId: string;
    productName: LocalizedText;
    format: CakeFormat;
    quantity: number;
    comboPicks: string[];
    notes: string;
    unitPriceSen: number;
    lineTotalSen: number;
    capacitySlots: number;
    packedWeightGrams: number;
  }[];
  fulfilment: {
    method: FulfilmentMethod;
    courier?: CourierId | null;
    courierName: string;
    address: string;
    state: string;
    postcode: string;
    region: RegionId | 'balik_pulau';
    dispatchDate: string;
    estimatedArrival: string;
    parcelWeightGrams: number;
    trackingNo?: string;
    trackingUrl?: string;
  };
  pricing: {
    subtotalSen: number;
    shippingFeeSen: number;
    discountSen: number;
    promoCode?: string | null;
    totalSen: number;
    amountDueNowSen: number;
    balanceDueSen: number;
  };
  payment: {
    status: PaymentStatus;
    method: PaymentMethod;
    gatewayRef?: string;
    bankName?: string;
    receiptRef?: string;
    paidAt?: string;
  };
  status: OrderStatus;
  termsAccepted: boolean;
  termsVersion: string;
  damageClaim?: DamageClaim;
  changeRequest?: ChangeRequest;
  createdAt: unknown;
  updatedAt: unknown;
  expiresAt?: string;
}

export interface OrderTracking {
  orderNo: string;
  orderId: string;
  status: OrderStatus;
  fulfilmentMethod: FulfilmentMethod;
  courierName: string;
  trackingNo?: string;
  trackingUrl?: string;
  dispatchDate: string;
  estimatedArrival: string;
  cityState: string;
  itemsSummary: {
    name: LocalizedText;
    format: CakeFormat;
    quantity: number;
    comboPicks: string[];
    notes: string;
  }[];
  totalSen: number;
  amountDueNowSen: number;
  balanceDueSen: number;
  paymentStatus: PaymentStatus;
  history: OrderHistoryEntry[];
  damageClaim?: DamageClaim;
  changeRequest?: ChangeRequest;
  updatedAt: unknown;
}

export interface UserAccount {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  role: UserRole;
  active: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SavedAddress {
  id: string;
  label: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  state: string;
  postcode: string;
}

export interface CustomerProfile {
  uid: string;
  phone?: string;
  savedAddresses: SavedAddress[];
  marketingConsent: boolean;
  updatedAt?: unknown;
}

export interface CustomRequest {
  id: string;
  name: string;
  phone: string;
  email?: string;
  requestedFlavour: string;
  targetDate?: string;
  notes?: string;
  status: 'new' | 'quoted' | 'closed';
  quoteNotes?: string;
  createdAt?: unknown;
}

export interface Review {
  id: string;
  orderNo: string;
  authorName: string;
  uid: string;
  rating: number;
  text: string;
  photoUrl?: string;
  approved: boolean;
  createdAt?: unknown;
}

export interface AuditLog {
  id: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  entity: string;
  before?: string;
  after?: string;
  timestamp?: unknown;
}
