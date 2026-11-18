import {
  CakeFormat,
  CartItem,
  CartSelection,
  FulfilmentMethod,
  Product,
  PromoCode,
  SelfDeliveryConfig,
} from '../types/domain';

export interface PriceCalculationResult {
  valid: boolean;
  errorCode?:
    | 'INVALID_FORMAT'
    | 'INVALID_QUANTITY'
    | 'INVALID_COMBO_COUNT'
    | 'INVALID_COMBO_FLAVOUR'
    | 'NOTES_TOO_LONG';
  unitPriceSen: number;
  lineTotalSen: number;
  capacitySlots: number;
  packedWeightGrams: number;
  sanitizedNotes: string;
}

/**
 * Pure pricing function shared across Product configurator, Cart, Checkout, and unit tests.
 * All money values are integer sen (e.g. RM 100.00 = 10000).
 */
export function calculatePrice(product: Product, selection: CartSelection): PriceCalculationResult {
  const quantity = Math.floor(selection.quantity);
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 10) {
    return {
      valid: false,
      errorCode: 'INVALID_QUANTITY',
      unitPriceSen: 0,
      lineTotalSen: 0,
      capacitySlots: 0,
      packedWeightGrams: 0,
      sanitizedNotes: '',
    };
  }

  const sanitizedNotes = (selection.notes || '').trim();
  if (sanitizedNotes.length > 200) {
    return {
      valid: false,
      errorCode: 'NOTES_TOO_LONG',
      unitPriceSen: 0,
      lineTotalSen: 0,
      capacitySlots: 0,
      packedWeightGrams: 0,
      sanitizedNotes: sanitizedNotes.slice(0, 200),
    };
  }

  const format: CakeFormat = selection.format;

  if (format === 'combo' || product.range === 'budget') {
    const comboRule = product.comboRule || product.formats.combo;
    if (!comboRule) {
      return {
        valid: false,
        errorCode: 'INVALID_FORMAT',
        unitPriceSen: 0,
        lineTotalSen: 0,
        capacitySlots: 0,
        packedWeightGrams: 0,
        sanitizedNotes,
      };
    }

    const picks = selection.comboPicks || [];
    if (picks.length !== comboRule.pickCount) {
      return {
        valid: false,
        errorCode: 'INVALID_COMBO_COUNT',
        unitPriceSen: comboRule.priceSen,
        lineTotalSen: comboRule.priceSen * quantity,
        capacitySlots: comboRule.capacityWeight * quantity,
        packedWeightGrams: comboRule.packedWeightGrams * quantity,
        sanitizedNotes,
      };
    }

    const allValidFlavours = picks.every((p) => comboRule.flavours.includes(p));
    if (!allValidFlavours) {
      return {
        valid: false,
        errorCode: 'INVALID_COMBO_FLAVOUR',
        unitPriceSen: comboRule.priceSen,
        lineTotalSen: comboRule.priceSen * quantity,
        capacitySlots: comboRule.capacityWeight * quantity,
        packedWeightGrams: comboRule.packedWeightGrams * quantity,
        sanitizedNotes,
      };
    }

    return {
      valid: true,
      unitPriceSen: comboRule.priceSen,
      lineTotalSen: comboRule.priceSen * quantity,
      capacitySlots: Number((comboRule.capacityWeight * quantity).toFixed(2)),
      packedWeightGrams: comboRule.packedWeightGrams * quantity,
      sanitizedNotes,
    };
  }

  const formatSpec = format === 'whole' ? product.formats.whole : product.formats.loaf;
  if (!formatSpec) {
    return {
      valid: false,
      errorCode: 'INVALID_FORMAT',
      unitPriceSen: 0,
      lineTotalSen: 0,
      capacitySlots: 0,
      packedWeightGrams: 0,
      sanitizedNotes,
    };
  }

  return {
    valid: true,
    unitPriceSen: formatSpec.priceSen,
    lineTotalSen: formatSpec.priceSen * quantity,
    capacitySlots: Number((formatSpec.capacityWeight * quantity).toFixed(2)),
    packedWeightGrams: formatSpec.packedWeightGrams * quantity,
    sanitizedNotes,
  };
}

export interface CartTotalsResult {
  subtotalSen: number;
  shippingFeeSen: number;
  discountSen: number;
  totalSen: number;
  amountDueNowSen: number;
  balanceDueSen: number;
  totalCapacitySlots: number;
  totalWeightGrams: number;
  freeShippingApplied: boolean;
}

export function calculateCartTotals(params: {
  items: CartItem[];
  productsById: Map<string, Product>;
  shippingFeeSen: number;
  fulfilmentMethod: FulfilmentMethod;
  promo?: PromoCode | null;
  freeShippingThresholdSen?: number;
  selfDeliveryConfig?: SelfDeliveryConfig;
  payDepositOnly?: boolean;
  todayISO?: string;
}): CartTotalsResult {
  const {
    items,
    productsById,
    shippingFeeSen,
    fulfilmentMethod,
    promo,
    freeShippingThresholdSen = 0,
    selfDeliveryConfig,
    payDepositOnly = false,
    todayISO = '',
  } = params;

  let subtotalSen = 0;
  let totalCapacitySlots = 0;
  let totalWeightGrams = 0;

  for (const item of items) {
    const prod = productsById.get(item.productId);
    if (prod) {
      const res = calculatePrice(prod, {
        format: item.format,
        quantity: item.quantity,
        comboPicks: item.comboPicks,
        notes: item.notes,
      });
      subtotalSen += res.lineTotalSen;
      totalCapacitySlots += res.capacitySlots;
      totalWeightGrams += res.packedWeightGrams;
    } else {
      subtotalSen += item.lineTotalSen;
      totalCapacitySlots += item.capacitySlots;
      totalWeightGrams += item.packedWeightGrams;
    }
  }

  let discountSen = 0;
  if (promo && promo.active && promo.usesLeft > 0) {
    const notExpired = !promo.expiresAt || !todayISO || promo.expiresAt >= todayISO;
    if (notExpired && subtotalSen >= promo.minSpendSen) {
      if (promo.type === 'percent') {
        discountSen = Math.round((subtotalSen * promo.value) / 100);
      } else {
        discountSen = Math.min(promo.value, subtotalSen);
      }
    }
  }

  const freeShippingApplied =
    fulfilmentMethod === 'courier' &&
    freeShippingThresholdSen > 0 &&
    subtotalSen >= freeShippingThresholdSen;

  const finalShippingFeeSen = freeShippingApplied ? 0 : Math.max(0, shippingFeeSen);
  const totalSen = Math.max(0, subtotalSen - discountSen + finalShippingFeeSen);

  let amountDueNowSen = totalSen;
  let balanceDueSen = 0;

  // Deposit applies ONLY to Balik Pulau self-delivery when owner enables it (FR-21)
  if (
    fulfilmentMethod === 'self_delivery' &&
    payDepositOnly &&
    selfDeliveryConfig?.depositEnabled &&
    selfDeliveryConfig.depositPercent > 0 &&
    selfDeliveryConfig.depositPercent < 100
  ) {
    amountDueNowSen = Math.round((totalSen * selfDeliveryConfig.depositPercent) / 100);
    balanceDueSen = totalSen - amountDueNowSen;
  }

  return {
    subtotalSen,
    shippingFeeSen: finalShippingFeeSen,
    discountSen,
    totalSen,
    amountDueNowSen,
    balanceDueSen,
    totalCapacitySlots: Number(totalCapacitySlots.toFixed(2)),
    totalWeightGrams,
    freeShippingApplied,
  };
}
