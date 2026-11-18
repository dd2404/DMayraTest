import assert from 'node:assert/strict';
import { calculateCartTotals, calculatePrice } from './pricing';
import { getAvailableDates, getEarliestAvailableDate } from './scheduling';
import {
  getDestinationRegion,
  isBalikPulauPostcode,
  validateMalaysiaPhone,
  validateMalaysianPostcode,
} from './malaysia';
import { SEED_PRODUCTS, SEED_SETTINGS, buildSeedCapacity } from '../data/seedData';
import { CapacityDay } from '../types/domain';

// 1. Test Whole & Loaf pricing
const masamManis = SEED_PRODUCTS.find((p) => p.id === 'masam-manis')!;
const wholeRes = calculatePrice(masamManis, { format: 'whole', quantity: 2, notes: 'Cut into 4' });
assert.equal(wholeRes.valid, true);
assert.equal(wholeRes.unitPriceSen, 16000);
assert.equal(wholeRes.lineTotalSen, 32000);
assert.equal(wholeRes.capacitySlots, 2);

const loafRes = calculatePrice(masamManis, { format: 'loaf', quantity: 3 });
assert.equal(loafRes.valid, true);
assert.equal(loafRes.unitPriceSen, 4500);
assert.equal(loafRes.lineTotalSen, 13500);
assert.equal(loafRes.capacitySlots, 0.75);

// 2. Test Budget Combo exact 5-of-8 requirement
const combo = SEED_PRODUCTS.find((p) => p.id === 'budget-combo')!;
const badCombo = calculatePrice(combo, {
  format: 'combo',
  quantity: 1,
  comboPicks: ['Coffee Cheese', 'Red Velvet'],
});
assert.equal(badCombo.valid, false);
assert.equal(badCombo.errorCode, 'INVALID_COMBO_COUNT');

const goodCombo = calculatePrice(combo, {
  format: 'combo',
  quantity: 2,
  comboPicks: [
    'Coffee Cheese',
    'Crush CremeO Cheese',
    'Strawberry Blueberry Cheese',
    'Chocolate Cadbury',
    'Red Velvet',
  ],
});
assert.equal(goodCombo.valid, true);
assert.equal(goodCombo.lineTotalSen, 20000);

// 3. Test AC-01: Wed 18 Nov 2026 + 3 days lead time + Mon-Wed courier dispatch -> Mon 23 Nov 2026
const capMap = new Map<string, CapacityDay>(buildSeedCapacity('2026-11-18').map((c) => [c.date, c]));
const sched = getAvailableDates({
  todayISO: '2026-11-18',
  leadTimeDays: 3,
  requiredSlots: 1,
  fulfilmentMethod: 'courier',
  settings: SEED_SETTINGS,
  capacityMap: capMap,
  horizonDays: 14,
});
const earliest = getEarliestAvailableDate(sched);
assert.equal(earliest?.date, '2026-11-23', 'Earliest courier date from Wed 18 Nov must be Mon 23 Nov');

// 4. Test Malaysian postcode, Balik Pulau RM5 detection, and phone normalization
assert.equal(validateMalaysianPostcode('11000', 'Pulau Pinang').valid, true);
assert.equal(validateMalaysianPostcode('50480', 'Pulau Pinang').valid, false);
assert.equal(validateMalaysianPostcode('88999', 'Sabah').reason, 'unserved');
assert.equal(isBalikPulauPostcode('11010', SEED_SETTINGS.selfDelivery.postcodes), true);
assert.equal(isBalikPulauPostcode('10250', SEED_SETTINGS.selfDelivery.postcodes), false);
assert.equal(getDestinationRegion('Sabah', '88300'), 'sabah');
assert.equal(getDestinationRegion('Sarawak', '93000'), 'sarawak');
assert.equal(validateMalaysiaPhone('012-4889210').normalized, '+60124889210');

// 5. Test Cart Totals integrity
const productsById = new Map(SEED_PRODUCTS.map((p) => [p.id, p]));
const totals = calculateCartTotals({
  items: [
    {
      id: 'i1',
      productId: 'masam-manis',
      productName: masamManis.name,
      imageUrl: masamManis.imageUrl,
      range: 'classic',
      baseFat: 'butter',
      leadTimeDays: 3,
      format: 'whole',
      quantity: 1,
      comboPicks: [],
      notes: '',
      unitPriceSen: 999, // tampered price in client state
      lineTotalSen: 999,
      capacitySlots: 1,
      packedWeightGrams: 1350,
    },
  ],
  productsById,
  shippingFeeSen: 1500,
  fulfilmentMethod: 'courier',
});
assert.equal(totals.subtotalSen, 16000, 'Server/authoritative pricing must ignore tampered client prices');
assert.equal(totals.totalSen, 17500);

console.log('All D\'Mayra Layer Cake domain unit tests passed!');
