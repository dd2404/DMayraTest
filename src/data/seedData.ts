import {
  AuditLog,
  CapacityDay,
  CustomRequest,
  Order,
  OrderTracking,
  Product,
  PromoCode,
  Review,
  ShippingRate,
  StoreSettings,
} from '../types/domain';
import { getKualaLumpurTodayISO } from '../lib/malaysia';

export const HERO_IMAGE = '/src/assets/images/hero_kek_lapis_artisan_1794977091357.jpg';
const IMG_MASAM_MANIS = '/src/assets/images/cake_masam_manis_1794977091628.jpg';
const IMG_CADBURY = '/src/assets/images/cake_cadbury_cheese_1794977092573.jpg';
const IMG_DURIAN = '/src/assets/images/cake_durian_musang_1794977092999.jpg';
const IMG_COMBO = '/src/assets/images/cake_budget_combo_1794977093284.jpg';

export const BUDGET_COMBO_FLAVOURS = [
  'Coffee Cheese',
  'Crush CremeO Cheese',
  'Strawberry Blueberry Cheese',
  'Strawberry Masam Manis',
  'Chocolate Cadbury',
  'Chocolate Cheese',
  'Mango Cheese',
  'Red Velvet',
];

export const SEED_PRODUCTS: Product[] = [
  {
    id: 'budget-combo',
    slug: 'budget-combo-5-perisa',
    name: { ms: 'Budget Combo (Set 5 Kek Whole)', en: 'Budget Combo (5 Whole Cakes Set)' },
    description: {
      ms: 'Set jimat paling laris! Pilih mana-mana 5 daripada 8 perisa kegemaran keluarga dalam saiz Whole asas marjerin.',
      en: 'Best-value gifting and family assortment. Choose any 5 of 8 signature flavours in Whole size with margarine base.',
    },
    flavour: {
      ms: 'Pilihan 5 daripada 8 perisa (Coffee Cheese, CremeO, Berry, Masam Manis, Cadbury, Choco Cheese, Mango, Red Velvet)',
      en: 'Pick 5 from 8 signature flavours',
    },
    ingredients: {
      ms: 'Marjerin berkualiti, tepung gandum, telur gred A, susu pekat, keju krim, serbuk koko, perisa buah & kopi.',
      en: 'Quality margarine, wheat flour, grade-A eggs, condensed milk, cream cheese, cocoa, fruit & coffee infusions.',
    },
    range: 'budget',
    baseFat: 'margarine',
    imageUrl: IMG_COMBO,
    active: true,
    featured: true,
    leadTimeDays: 3,
    allergens: ['Gluten', 'Telur / Egg', 'Tenusu / Dairy'],
    formats: {
      combo: {
        pickCount: 5,
        flavours: BUDGET_COMBO_FLAVOURS,
        priceSen: 10000,
        capacityWeight: 1,
        packedWeightGrams: 1850,
      },
    },
    comboRule: {
      pickCount: 5,
      flavours: BUDGET_COMBO_FLAVOURS,
      priceSen: 10000,
      capacityWeight: 1,
      packedWeightGrams: 1850,
    },
  },
  {
    id: 'masam-manis',
    slug: 'kek-lapis-masam-manis',
    name: { ms: 'Masam Manis Klasik', en: 'Classic Masam Manis' },
    description: {
      ms: 'Kek lapis mentega tulen tradisi Sarawak dengan lapisan jem strawberi dan kepingan asam manis hawflakes.',
      en: 'Traditional pure-butter Sarawak layer cake layered with fruity jam and tangy hawflake discs.',
    },
    flavour: { ms: 'Jem & asam manis hawflakes', en: 'Jam and hawflakes' },
    ingredients: {
      ms: 'Mentega tulen, telur gred A, tepung hong kong, gula halus, susu pekat, jem buah, asam manis hawflakes.',
      en: 'Pure butter, grade-A eggs, superfine flour, caster sugar, condensed milk, fruit jam, hawflakes.',
    },
    range: 'classic',
    baseFat: 'butter',
    imageUrl: IMG_MASAM_MANIS,
    active: true,
    featured: true,
    leadTimeDays: 3,
    allergens: ['Gluten', 'Telur / Egg', 'Tenusu / Dairy'],
    formats: {
      whole: { priceSen: 16000, capacityWeight: 1, packedWeightGrams: 1350 },
      loaf: { priceSen: 4500, capacityWeight: 0.25, packedWeightGrams: 380 },
    },
  },
  {
    id: 'sisik-ikan',
    slug: 'kek-lapis-sisik-ikan',
    name: { ms: 'Sisik Ikan Horlicks', en: 'Sisik Ikan (Fish Scale)' },
    description: {
      ms: 'Corak sisik ikan ikonik menggunakan Horlicks beraroma malt dengan asam manis hawflakes dan mentega tulen.',
      en: 'Iconic mosaic pattern crafted with malted Horlicks, tangy hawflakes, and pure butter.',
    },
    flavour: { ms: 'Horlicks & asam manis hawflakes', en: 'Horlicks and hawflakes' },
    ingredients: {
      ms: 'Mentega tulen, Horlicks malt, telur, tepung hong kong, susu pekat, kepingan asam manis.',
      en: 'Pure butter, Horlicks malt, eggs, superfine flour, condensed milk, hawflake slices.',
    },
    range: 'classic',
    baseFat: 'butter',
    imageUrl: IMG_MASAM_MANIS,
    active: true,
    featured: false,
    leadTimeDays: 3,
    allergens: ['Gluten', 'Telur / Egg', 'Tenusu / Dairy'],
    formats: {
      whole: { priceSen: 17000, capacityWeight: 1, packedWeightGrams: 1380 },
      loaf: { priceSen: 4500, capacityWeight: 0.25, packedWeightGrams: 380 },
    },
  },
  {
    id: 'cadbury-original',
    slug: 'kek-lapis-cadbury-original',
    name: { ms: 'Cadbury Original', en: 'Cadbury Original' },
    description: {
      ms: 'Gabungan coklat susu Cadbury sebenar bersama aroma Horlicks dalam adunan mentega tulen yang lembut.',
      en: 'Real Cadbury Dairy Milk chocolate bars layered into fragrant Horlicks pure-butter sponge.',
    },
    flavour: { ms: 'Coklat Cadbury & Horlicks', en: 'Cadbury and Horlicks' },
    ingredients: {
      ms: 'Mentega tulen, bar coklat Cadbury, Horlicks, telur, susu pekat, tepung gandum.',
      en: 'Pure butter, Cadbury chocolate bars, Horlicks, eggs, condensed milk, wheat flour.',
    },
    range: 'cadbury',
    baseFat: 'butter',
    imageUrl: IMG_CADBURY,
    active: true,
    featured: false,
    leadTimeDays: 3,
    allergens: ['Gluten', 'Telur / Egg', 'Tenusu / Dairy', 'Soya / Soy'],
    formats: {
      whole: { priceSen: 18000, capacityWeight: 1, packedWeightGrams: 1420 },
      loaf: { priceSen: 4500, capacityWeight: 0.25, packedWeightGrams: 390 },
    },
  },
  {
    id: 'cadbury-cheese',
    slug: 'kek-lapis-cadbury-cheese',
    name: { ms: 'Cadbury Cheese', en: 'Cadbury Cheese' },
    description: {
      ms: 'Lapisan keju krim lemak berkrim diseimbangkan dengan coklat Cadbury cair dan adunan susu mentega tulen.',
      en: 'Velvety cream cheese ribbons balanced with rich Cadbury chocolate bars and pure butter.',
    },
    flavour: { ms: 'Susu, keju krim & Cadbury', en: 'Milk, cheese and Cadbury' },
    ingredients: {
      ms: 'Mentega tulen, keju krim Philadelphia/Tatura, coklat Cadbury, susu penuh krim, telur, tepung.',
      en: 'Pure butter, cream cheese, Cadbury chocolate, full-cream milk, eggs, flour.',
    },
    range: 'cadbury',
    baseFat: 'butter',
    imageUrl: IMG_CADBURY,
    active: true,
    featured: true,
    leadTimeDays: 3,
    allergens: ['Gluten', 'Telur / Egg', 'Tenusu / Dairy', 'Soya / Soy'],
    formats: {
      whole: { priceSen: 19000, capacityWeight: 1, packedWeightGrams: 1480 },
      loaf: { priceSen: 5000, capacityWeight: 0.25, packedWeightGrams: 400 },
    },
  },
  {
    id: 'cranberry-cheese',
    slug: 'kek-lapis-cranberry-cheese',
    name: { ms: 'Cranberry Cheese', en: 'Cranberry Cheese' },
    description: {
      ms: 'Kek lapis moden berperisa strawberi, kranberi kering, keju krim dan lapisan red velvet mentega tulen.',
      en: 'Modern gourmet layers of strawberry, dried cranberry, cream cheese, and pure-butter red velvet.',
    },
    flavour: { ms: 'Strawberi, kranberi, keju & red velvet', en: 'Strawberry, cranberry, cheese, red velvet' },
    ingredients: {
      ms: 'Mentega tulen, buah kranberi kering, pes strawberi, keju krim, serbuk koko red velvet, telur, tepung.',
      en: 'Pure butter, dried cranberries, strawberry puree, cream cheese, red velvet cocoa, eggs, flour.',
    },
    range: 'trendy',
    baseFat: 'butter',
    imageUrl: HERO_IMAGE,
    active: true,
    featured: false,
    leadTimeDays: 3,
    allergens: ['Gluten', 'Telur / Egg', 'Tenusu / Dairy'],
    formats: {
      whole: { priceSen: 26000, capacityWeight: 1, packedWeightGrams: 1500 },
      loaf: { priceSen: 6000, capacityWeight: 0.25, packedWeightGrams: 410 },
    },
  },
  {
    id: 'sicily',
    slug: 'kek-lapis-sicily',
    name: { ms: 'Sicily', en: 'Sicily' },
    description: {
      ms: 'Harmoni rasa buah-buahan premium, kekacang panggang rangup dan coklat gelap bersama mentega tulen.',
      en: 'Rich medley of candied orchard fruits, roasted nuts, and dark chocolate in pure butter.',
    },
    flavour: { ms: 'Buah-buahan, kekacang & coklat', en: 'Fruity, nutty, chocolate' },
    ingredients: {
      ms: 'Mentega tulen, campuran buah kering, badam & walnut panggang, coklat masakan, telur, tepung.',
      en: 'Pure butter, mixed dried fruits, roasted almonds & walnuts, dark chocolate, eggs, flour.',
    },
    range: 'trendy',
    baseFat: 'butter',
    imageUrl: HERO_IMAGE,
    active: true,
    featured: false,
    leadTimeDays: 3,
    allergens: ['Gluten', 'Telur / Egg', 'Tenusu / Dairy', 'Kekacang / Tree Nuts'],
    formats: {
      whole: { priceSen: 26000, capacityWeight: 1, packedWeightGrams: 1520 },
      loaf: { priceSen: 6000, capacityWeight: 0.25, packedWeightGrams: 410 },
    },
  },
  {
    id: 'chocoful-cheezy',
    slug: 'kek-lapis-chocoful-cheezy',
    name: { ms: 'Chocoful Cheezy', en: 'Chocoful Cheezy' },
    description: {
      ms: 'Lapisan berganda coklat pekat dan keju krim yang padat bagi pencinta coklat sejati.',
      en: 'Intense double-chocolate and cream cheese pure-butter layers for true chocolate devotees.',
    },
    flavour: { ms: 'Coklat pekat & keju krim', en: 'Chocolate and cheese' },
    ingredients: {
      ms: 'Mentega tulen, coklat gelap Callebaut, keju krim, serbuk koko, telur, susu pekat, tepung.',
      en: 'Pure butter, dark chocolate, cream cheese, cocoa powder, eggs, condensed milk, flour.',
    },
    range: 'trendy',
    baseFat: 'butter',
    imageUrl: IMG_CADBURY,
    active: true,
    featured: false,
    leadTimeDays: 3,
    allergens: ['Gluten', 'Telur / Egg', 'Tenusu / Dairy', 'Soya / Soy'],
    formats: {
      whole: { priceSen: 26000, capacityWeight: 1, packedWeightGrams: 1500 },
      loaf: { priceSen: 6000, capacityWeight: 0.25, packedWeightGrams: 410 },
    },
  },
  {
    id: 'espresso-cheese',
    slug: 'kek-lapis-espresso-cheese',
    name: { ms: 'Espresso Cheese', en: 'Espresso Cheese' },
    description: {
      ms: 'Aroma espreso panggang segar digabungkan dengan coklat dan lapisan keju krim berlemak.',
      en: 'Freshly brewed espresso notes folded with chocolate and savoury cream cheese layers.',
    },
    flavour: { ms: 'Espreso, coklat & keju', en: 'Espresso, chocolate, cheese' },
    ingredients: {
      ms: 'Mentega tulen, ekstrak kopi espreso, coklat gelap, keju krim, telur, tepung gandum.',
      en: 'Pure butter, espresso coffee extract, dark chocolate, cream cheese, eggs, wheat flour.',
    },
    range: 'trendy',
    baseFat: 'butter',
    imageUrl: IMG_CADBURY,
    active: true,
    featured: false,
    leadTimeDays: 3,
    allergens: ['Gluten', 'Telur / Egg', 'Tenusu / Dairy'],
    formats: {
      whole: { priceSen: 24000, capacityWeight: 1, packedWeightGrams: 1460 },
      loaf: { priceSen: 5500, capacityWeight: 0.25, packedWeightGrams: 400 },
    },
  },
  {
    id: 'chocolate-cheese-almond',
    slug: 'kek-lapis-chocolate-cheese-almond',
    name: { ms: 'Chocolate Cheese Almond', en: 'Chocolate Cheese Almond' },
    description: {
      ms: 'Coklat lembut dan keju berkrim ditaburi kepingan badam panggang di setiap lapisan.',
      en: 'Smooth chocolate and cream cheese studded with toasted almond nibs across every layer.',
    },
    flavour: { ms: 'Coklat, kepingan badam & keju', en: 'Chocolate, almond nibs, cheese' },
    ingredients: {
      ms: 'Mentega tulen, badam cincang panggang, serbuk koko, keju krim, telur, susu pekat, tepung.',
      en: 'Pure butter, roasted almond nibs, cocoa, cream cheese, eggs, condensed milk, flour.',
    },
    range: 'trendy',
    baseFat: 'butter',
    imageUrl: IMG_CADBURY,
    active: true,
    featured: false,
    leadTimeDays: 3,
    allergens: ['Gluten', 'Telur / Egg', 'Tenusu / Dairy', 'Kekacang / Tree Nuts'],
    formats: {
      whole: { priceSen: 16000, capacityWeight: 1, packedWeightGrams: 1450 },
      loaf: { priceSen: 4500, capacityWeight: 0.25, packedWeightGrams: 390 },
    },
  },
  {
    id: 'durian-cheese',
    slug: 'kek-lapis-durian-cheese',
    name: { ms: 'Durian Cheese Premium', en: 'Durian Cheese' },
    description: {
      ms: 'Isi durian Udang Merah atau Musang King Balik Pulau sebenar bersama keju krim dan mentega tulen.',
      en: 'Authentic Balik Pulau Udang Merah or Musang King durian pulp layered with cream cheese and pure butter.',
    },
    flavour: { ms: 'Durian Udang Merah / Musang King & keju', en: 'Udang Merah or Musang King durian, cheese' },
    ingredients: {
      ms: 'Mentega tulen, isi durian segar Balik Pulau, keju krim, telur gred A, susu pekat, tepung.',
      en: 'Pure butter, fresh Balik Pulau durian pulp, cream cheese, grade-A eggs, condensed milk, flour.',
    },
    range: 'trendy',
    baseFat: 'butter',
    imageUrl: IMG_DURIAN,
    active: true,
    featured: true,
    leadTimeDays: 3,
    allergens: ['Gluten', 'Telur / Egg', 'Tenusu / Dairy'],
    durianNotice: true,
    formats: {
      whole: { priceSen: 35000, capacityWeight: 1, packedWeightGrams: 1550 },
      loaf: { priceSen: 7000, capacityWeight: 0.25, packedWeightGrams: 420 },
    },
  },
  {
    id: 'durilicious',
    slug: 'kek-lapis-durilicious',
    name: { ms: 'Durilicious (Tanpa Keju)', en: 'Durilicious (No Cheese)' },
    description: {
      ms: 'Khas untuk peminat durian tulen tanpa keju — menggunakan durian Udang Merah atau Musang King Balik Pulau.',
      en: 'Pure durian indulgence with zero cheese — showcasing Udang Merah or Musang King durian.',
    },
    flavour: { ms: 'Durian Udang Merah / Musang King tulen', en: 'Udang Merah or Musang King durian' },
    ingredients: {
      ms: 'Mentega tulen, isi durian segar Balik Pulau, telur gred A, susu pekat, tepung hong kong.',
      en: 'Pure butter, fresh Balik Pulau durian pulp, grade-A eggs, condensed milk, superfine flour.',
    },
    range: 'trendy',
    baseFat: 'butter',
    imageUrl: IMG_DURIAN,
    active: true,
    featured: false,
    leadTimeDays: 3,
    allergens: ['Gluten', 'Telur / Egg', 'Tenusu / Dairy'],
    durianNotice: true,
    formats: {
      whole: { priceSen: 35000, capacityWeight: 1, packedWeightGrams: 1500 },
      loaf: { priceSen: 7000, capacityWeight: 0.25, packedWeightGrams: 410 },
    },
  },
];

export const SEED_SHIPPING_RATES: ShippingRate[] = [
  {
    id: 'pos_laju-west_malaysia',
    courier: 'pos_laju',
    courierName: 'Pos Laju',
    region: 'west_malaysia',
    regionLabel: { ms: 'Semenanjung Malaysia', en: 'West Malaysia' },
    feeSen: 1500,
    estimatedDaysMin: 1,
    estimatedDaysMax: 3,
    trackingUrlTemplate: 'https://tracking.pos.com.my/postal-services/quick-access/?track={trackingNo}',
    active: true,
  },
  {
    id: 'citylink-west_malaysia',
    courier: 'citylink',
    courierName: 'City-Link Express',
    region: 'west_malaysia',
    regionLabel: { ms: 'Semenanjung Malaysia', en: 'West Malaysia' },
    feeSen: 1500,
    estimatedDaysMin: 1,
    estimatedDaysMax: 3,
    trackingUrlTemplate: 'https://www.citylinkexpress.com/tracking-result/?track0={trackingNo}',
    active: true,
  },
  {
    id: 'jnt-west_malaysia',
    courier: 'jnt',
    courierName: 'J&T Express',
    region: 'west_malaysia',
    regionLabel: { ms: 'Semenanjung Malaysia', en: 'West Malaysia' },
    feeSen: 1500,
    estimatedDaysMin: 1,
    estimatedDaysMax: 3,
    trackingUrlTemplate: 'https://www.jtexpress.my/tracking/{trackingNo}',
    active: true,
  },
  {
    id: 'pos_laju-sabah',
    courier: 'pos_laju',
    courierName: 'Pos Laju',
    region: 'sabah',
    regionLabel: { ms: 'Sabah & WP Labuan', en: 'Sabah & Labuan' },
    feeSen: 2800,
    estimatedDaysMin: 3,
    estimatedDaysMax: 5,
    trackingUrlTemplate: 'https://tracking.pos.com.my/postal-services/quick-access/?track={trackingNo}',
    active: true,
  },
  {
    id: 'citylink-sabah',
    courier: 'citylink',
    courierName: 'City-Link Express',
    region: 'sabah',
    regionLabel: { ms: 'Sabah & WP Labuan', en: 'Sabah & Labuan' },
    feeSen: 2800,
    estimatedDaysMin: 3,
    estimatedDaysMax: 5,
    trackingUrlTemplate: 'https://www.citylinkexpress.com/tracking-result/?track0={trackingNo}',
    active: true,
  },
  {
    id: 'jnt-sabah',
    courier: 'jnt',
    courierName: 'J&T Express',
    region: 'sabah',
    regionLabel: { ms: 'Sabah & WP Labuan', en: 'Sabah & Labuan' },
    feeSen: 2800,
    estimatedDaysMin: 3,
    estimatedDaysMax: 5,
    trackingUrlTemplate: 'https://www.jtexpress.my/tracking/{trackingNo}',
    active: true,
  },
  {
    id: 'pos_laju-sarawak',
    courier: 'pos_laju',
    courierName: 'Pos Laju',
    region: 'sarawak',
    regionLabel: { ms: 'Sarawak', en: 'Sarawak' },
    feeSen: 2600,
    estimatedDaysMin: 3,
    estimatedDaysMax: 5,
    trackingUrlTemplate: 'https://tracking.pos.com.my/postal-services/quick-access/?track={trackingNo}',
    active: true,
  },
  {
    id: 'citylink-sarawak',
    courier: 'citylink',
    courierName: 'City-Link Express',
    region: 'sarawak',
    regionLabel: { ms: 'Sarawak', en: 'Sarawak' },
    feeSen: 2600,
    estimatedDaysMin: 3,
    estimatedDaysMax: 5,
    trackingUrlTemplate: 'https://www.citylinkexpress.com/tracking-result/?track0={trackingNo}',
    active: true,
  },
  {
    id: 'jnt-sarawak',
    courier: 'jnt',
    courierName: 'J&T Express',
    region: 'sarawak',
    regionLabel: { ms: 'Sarawak', en: 'Sarawak' },
    feeSen: 2600,
    estimatedDaysMin: 3,
    estimatedDaysMax: 5,
    trackingUrlTemplate: 'https://www.jtexpress.my/tracking/{trackingNo}',
    active: true,
  },
];

export const SEED_SETTINGS: StoreSettings = {
  storeName: "D'Mayra Layer Cake",
  ssmNo: 'PG0548291-K (Home Bakery Balik Pulau)',
  contactPhone: '+6012-488 9210',
  contactEmail: 'TVET1720@gmail.com',
  whatsappNumber: '60124889210',
  defaultDailyLimit: 12,
  defaultLeadTimeDays: 3,
  dispatchDays: [1, 2, 3], // Monday, Tuesday, Wednesday
  selfDelivery: {
    enabled: true,
    feeSen: 500,
    postcodes: ['11000', '11010', '11020'],
    days: [2, 4, 6], // Tuesday, Thursday, Saturday
    depositEnabled: false,
    depositPercent: 50,
  },
  freeShippingThresholdSen: 35000,
  termsVersion: '2026.1',
  termsText: {
    ms: '1. Tempahan dibuat khusus mengikut giliran (pre-order minimum 3 hari).\n2. Pembatalan tempahan akan melucutkan jumlah bayaran yang telah dibuat.\n3. Kek dinyahbeku sebelum pos dan tahan kira-kira 5 hari pada suhu bilik.\n4. Tuntutan kerosakan atau kelewatan hanya boleh dibuat melalui halaman Jejak Pesanan dengan memuat naik gambar dalam tempoh 24 jam selepas diterima.\n5. Kelewatan pihak kurier selepas bungkusan dipos tertakluk kepada terma kurier pilihan.',
    en: '1. Cakes are baked fresh to order with a minimum 3-day lead time.\n2. Cancelled orders forfeit the amount paid (no refund).\n3. Cakes are defrosted before dispatch and keep approximately 5 days at room temperature.\n4. Damage or delay claims must be submitted exclusively via the Order Tracking page with photo evidence within 24 hours of receipt.\n5. Transit delays after courier handover are governed by the chosen courier terms.',
  },
  privacyText: {
    ms: 'Selaras dengan Akta Perlindungan Data Peribadi 2010 (PDPA), D\'Mayra Layer Cake hanya mengumpul nama, nombor telefon, emel dan alamat penerima bagi tujuan penyediaan, penghantaran kurier dan resit pesanan anda. Anda boleh memohon pemadaman data pada bila-bila masa melalui emel rasmi kami.',
    en: 'In compliance with Malaysia PDPA 2010, D\'Mayra Layer Cake collects only buyer/recipient name, phone, email, and delivery address solely to bake, dispatch, and confirm your order. You may request data deletion anytime via our official email.',
  },
  holidays: [],
  seasonalCampaign: {
    active: true,
    titleMs: 'Pra-Tempahan Musim Perayaan & Cuti Sekolah Dibuka',
    titleEn: 'Festive & School Holiday Pre-Orders Now Open',
    closeDate: '2027-02-10',
    fixedDispatchDates: [],
  },
};

export const SEED_PROMOS: PromoCode[] = [
  {
    code: 'RAYA10',
    type: 'percent',
    value: 10,
    minSpendSen: 15000,
    expiresAt: '2027-12-31',
    usesLeft: 200,
    active: true,
  },
  {
    code: 'BALIKPULAU5',
    type: 'fixed',
    value: 500,
    minSpendSen: 4500,
    expiresAt: '2027-12-31',
    usesLeft: 100,
    active: true,
  },
  {
    code: 'MANIS20',
    type: 'fixed',
    value: 2000,
    minSpendSen: 25000,
    expiresAt: '2027-12-31',
    usesLeft: 50,
    active: true,
  },
];

export function buildSeedCapacity(todayISO: string = getKualaLumpurTodayISO()): CapacityDay[] {
  const days: CapacityDay[] = [];
  const [y, m, d] = todayISO.split('-').map(Number);

  for (let i = 0; i <= 45; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d + i));
    const iso = dt.toISOString().slice(0, 10);
    const weekday = dt.getUTCDay();
    const dispatchEnabled = [1, 2, 3].includes(weekday);
    const selfDeliveryEnabled = [2, 4, 6].includes(weekday);

    let used = 0;
    let blocked = false;
    let note = '';

    if (i === 4 || i === 5) used = 4.5;
    if (i === 7) used = 8;
    if (i === 10) {
      used = 11.25;
      note = 'Hampir penuh (slot terhad)';
    }
    if (i === 14) {
      blocked = true;
      note = 'Rehat Dapur / Penyelenggaraan Ketuhar';
    }

    days.push({
      date: iso,
      limit: 12,
      used,
      dispatchEnabled,
      selfDeliveryEnabled,
      blocked,
      note,
    });
  }
  return days;
}

export function buildSeedOrders(todayISO: string = getKualaLumpurTodayISO()): {
  orders: Order[];
  trackings: OrderTracking[];
} {
  const addDays = (offset: number) => {
    const [y, m, d] = todayISO.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + offset)).toISOString().slice(0, 10);
  };

  const orders: Order[] = [
    {
      id: 'DM-2026-1001',
      orderNo: 'DM-2026-1001',
      trackingToken: 'trk_dmayra_1001_a9f8c2e1',
      buyerUid: null,
      buyer: { name: 'Nurul Huda Aziz', phone: '+60134552190', email: 'nurul.huda@example.my' },
      recipient: { name: 'Puan Zainab Omar', phone: '+60194128833' },
      items: [
        {
          productId: 'cadbury-cheese',
          productName: { ms: 'Cadbury Cheese', en: 'Cadbury Cheese' },
          format: 'whole',
          quantity: 1,
          comboPicks: [],
          notes: 'Potong 4 bahagian kemas, hadiah hari ibu.',
          unitPriceSen: 19000,
          lineTotalSen: 19000,
          capacitySlots: 1,
          packedWeightGrams: 1480,
        },
        {
          productId: 'masam-manis',
          productName: { ms: 'Masam Manis Klasik', en: 'Classic Masam Manis' },
          format: 'loaf',
          quantity: 2,
          comboPicks: [],
          notes: '',
          unitPriceSen: 4500,
          lineTotalSen: 9000,
          capacitySlots: 0.5,
          packedWeightGrams: 760,
        },
      ],
      fulfilment: {
        method: 'courier',
        courier: 'jnt',
        courierName: 'J&T Express',
        address: 'No 24, Jalan Seri Hartamas 7, Taman Seri Hartamas',
        state: 'WP Kuala Lumpur',
        postcode: '50480',
        region: 'west_malaysia',
        dispatchDate: addDays(-2),
        estimatedArrival: '1–3 hari bekerja',
        parcelWeightGrams: 2240,
        trackingNo: '620091847210',
        trackingUrl: 'https://www.jtexpress.my/tracking/620091847210',
      },
      pricing: {
        subtotalSen: 28000,
        shippingFeeSen: 1500,
        discountSen: 0,
        promoCode: null,
        totalSen: 29500,
        amountDueNowSen: 29500,
        balanceDueSen: 0,
      },
      payment: {
        status: 'paid',
        method: 'fpx',
        gatewayRef: 'FPX-261118-8821',
        bankName: 'Maybank2u',
        paidAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      status: 'shipped',
      termsAccepted: true,
      termsVersion: '2026.1',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    },
    {
      id: 'DM-2026-1002',
      orderNo: 'DM-2026-1002',
      trackingToken: 'trk_dmayra_1002_b7d3k4p9',
      buyerUid: null,
      buyer: { name: 'Ahmad Faizal Razak', phone: '+60125008712', email: 'faizal.razak@example.my' },
      recipient: { name: 'Ahmad Faizal Razak', phone: '+60125008712' },
      items: [
        {
          productId: 'budget-combo',
          productName: { ms: 'Budget Combo (Set 5 Kek Whole)', en: 'Budget Combo (5 Whole Cakes Set)' },
          format: 'combo',
          quantity: 1,
          comboPicks: [
            'Coffee Cheese',
            'Crush CremeO Cheese',
            'Strawberry Blueberry Cheese',
            'Chocolate Cadbury',
            'Red Velvet',
          ],
          notes: 'Untuk jamuan pejabat hari Jumaat.',
          unitPriceSen: 10000,
          lineTotalSen: 10000,
          capacitySlots: 1,
          packedWeightGrams: 1850,
        },
      ],
      fulfilment: {
        method: 'self_delivery',
        courier: null,
        courierName: 'Penghantaran Balik Pulau',
        address: '18 Lorong Sungai Pinang 2, Kampung Sungai Pinang',
        state: 'Pulau Pinang',
        postcode: '11010',
        region: 'balik_pulau',
        dispatchDate: addDays(4),
        estimatedArrival: 'Hari yang sama (Balik Pulau)',
        parcelWeightGrams: 1850,
      },
      pricing: {
        subtotalSen: 10000,
        shippingFeeSen: 500,
        discountSen: 0,
        promoCode: null,
        totalSen: 10500,
        amountDueNowSen: 10500,
        balanceDueSen: 0,
      },
      payment: {
        status: 'paid',
        method: 'duitnow_qr',
        gatewayRef: 'DNQR-261118-3341',
        paidAt: new Date(Date.now() - 86400000).toISOString(),
      },
      status: 'in_production',
      termsAccepted: true,
      termsVersion: '2026.1',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: 'DM-2026-1003',
      orderNo: 'DM-2026-1003',
      trackingToken: 'trk_dmayra_1003_c8e2m1z5',
      buyerUid: null,
      buyer: { name: 'Melissa Tan', phone: '+60168894321', email: 'melissa.tan@example.my' },
      recipient: { name: 'David Tan', phone: '+60168890011' },
      items: [
        {
          productId: 'durian-cheese',
          productName: { ms: 'Durian Cheese Premium', en: 'Durian Cheese' },
          format: 'whole',
          quantity: 1,
          comboPicks: [],
          notes: 'Jika ada Musang King diutamakan, terima kasih!',
          unitPriceSen: 35000,
          lineTotalSen: 35000,
          capacitySlots: 1,
          packedWeightGrams: 1550,
        },
      ],
      fulfilment: {
        method: 'courier',
        courier: 'pos_laju',
        courierName: 'Pos Laju',
        address: 'Lot 88, Jalan Lintas, Luyang',
        state: 'Sabah',
        postcode: '88300',
        region: 'sabah',
        dispatchDate: addDays(5),
        estimatedArrival: '3–5 hari bekerja',
        parcelWeightGrams: 1550,
      },
      pricing: {
        subtotalSen: 35000,
        shippingFeeSen: 0,
        discountSen: 3500,
        promoCode: 'RAYA10',
        totalSen: 31500,
        amountDueNowSen: 31500,
        balanceDueSen: 0,
      },
      payment: {
        status: 'paid',
        method: 'card',
        gatewayRef: 'CARD-261118-9942',
        paidAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
      status: 'confirmed',
      termsAccepted: true,
      termsVersion: '2026.1',
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
    {
      id: 'DM-2026-1004',
      orderNo: 'DM-2026-1004',
      trackingToken: 'trk_dmayra_1004_f4x9r2w8',
      buyerUid: null,
      buyer: { name: 'Siti Aishah Rahman', phone: '+60197732018', email: 'aishah.rahman@example.my' },
      recipient: { name: 'Hajah Aminah Yusof', phone: '+60197730019' },
      items: [
        {
          productId: 'cranberry-cheese',
          productName: { ms: 'Cranberry Cheese', en: 'Cranberry Cheese' },
          format: 'loaf',
          quantity: 2,
          comboPicks: [],
          notes: 'Bungkus kemas dengan kad ucapan.',
          unitPriceSen: 6000,
          lineTotalSen: 12000,
          capacitySlots: 0.5,
          packedWeightGrams: 820,
        },
        {
          productId: 'espresso-cheese',
          productName: { ms: 'Espresso Cheese', en: 'Espresso Cheese' },
          format: 'loaf',
          quantity: 1,
          comboPicks: [],
          notes: '',
          unitPriceSen: 5500,
          lineTotalSen: 5500,
          capacitySlots: 0.25,
          packedWeightGrams: 400,
        },
      ],
      fulfilment: {
        method: 'courier',
        courier: 'citylink',
        courierName: 'City-Link Express',
        address: 'No 12, Jalan Larkin Jaya 4',
        state: 'Johor',
        postcode: '80350',
        region: 'west_malaysia',
        dispatchDate: addDays(5),
        estimatedArrival: '1–3 hari bekerja',
        parcelWeightGrams: 1220,
      },
      pricing: {
        subtotalSen: 17500,
        shippingFeeSen: 1500,
        discountSen: 0,
        promoCode: null,
        totalSen: 19000,
        amountDueNowSen: 19000,
        balanceDueSen: 0,
      },
      payment: {
        status: 'paid',
        method: 'fpx',
        gatewayRef: 'FPX-261118-5503',
        bankName: 'CIMB Clicks',
        paidAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      },
      status: 'packed',
      termsAccepted: true,
      termsVersion: '2026.1',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  const trackings: OrderTracking[] = orders.map((o) => ({
    orderNo: o.orderNo,
    orderId: o.id,
    status: o.status,
    fulfilmentMethod: o.fulfilment.method,
    courierName: o.fulfilment.courierName,
    trackingNo: o.fulfilment.trackingNo || '',
    trackingUrl: o.fulfilment.trackingUrl || '',
    dispatchDate: o.fulfilment.dispatchDate,
    estimatedArrival: o.fulfilment.estimatedArrival,
    cityState: `${o.fulfilment.postcode} · ${o.fulfilment.state}`,
    itemsSummary: o.items.map((it) => ({
      name: it.productName,
      format: it.format,
      quantity: it.quantity,
      comboPicks: it.comboPicks,
      notes: it.notes,
    })),
    totalSen: o.pricing.totalSen,
    amountDueNowSen: o.pricing.amountDueNowSen,
    balanceDueSen: o.pricing.balanceDueSen,
    paymentStatus: o.payment.status,
    history: [
      {
        status: 'confirmed',
        changedBy: 'FPX / Gateway',
        note: 'Pembayaran disahkan.',
        timestamp: typeof o.createdAt === 'string' ? o.createdAt : new Date().toISOString(),
      },
      ...(o.status !== 'confirmed'
        ? [
            {
              status: o.status,
              changedBy: "D'Mayra Kitchen",
              note:
                o.status === 'shipped' && o.fulfilment.trackingNo
                  ? `Dipos melalui ${o.fulfilment.courierName} (${o.fulfilment.trackingNo})`
                  : 'Dikemaskini oleh dapur.',
              timestamp: typeof o.updatedAt === 'string' ? o.updatedAt : new Date().toISOString(),
            },
          ]
        : []),
    ],
    updatedAt: o.updatedAt,
  }));

  return { orders, trackings };
}

export const SEED_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    orderNo: 'DM-2026-0982',
    authorName: 'Hafizah Kamarudin (Shah Alam)',
    uid: 'seed_user_1',
    rating: 5,
    text: 'Kek lapis Cadbury Cheese memang lembap dan kaya mentega tulen! Sampai ke Shah Alam dengan J&T dalam keadaan sempurna tanpa penyek.',
    approved: true,
    createdAt: '2026-11-10T09:00:00Z',
  },
  {
    id: 'rev-2',
    orderNo: 'DM-2026-0989',
    authorName: 'Farah Nadia (Balik Pulau)',
    uid: 'seed_user_2',
    rating: 5,
    text: 'Penghantaran terus RM5 di Balik Pulau sangat memudahkan. Budget Combo 5 perisa RM100 berbaloi untuk jamuan keluarga.',
    approved: true,
    createdAt: '2026-11-12T14:30:00Z',
  },
  {
    id: 'rev-3',
    orderNo: 'DM-2026-0994',
    authorName: 'Daniel Chong (Kuching)',
    uid: 'seed_user_3',
    rating: 5,
    text: 'Ordered Durian Cheese for my parents. Properly defrosted and packed tightly — stayed fresh for days!',
    approved: true,
    createdAt: '2026-11-14T11:15:00Z',
  },
];

export const SEED_CUSTOM_REQUESTS: CustomRequest[] = [
  {
    id: 'req-1',
    name: 'Puan Mariam Salleh',
    phone: '+60194421008',
    email: 'mariam.salleh@example.my',
    requestedFlavour: 'Kek Lapis Pandan Gula Melaka (Saiz Whole)',
    targetDate: '2026-12-15',
    notes: 'Untuk hantaran pertunangan anak, perlukan potongan 4.',
    status: 'new',
    createdAt: '2026-11-16T08:30:00Z',
  },
];

export const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit-1',
    actorUid: 'system-bootstrap',
    actorEmail: 'TVET1720@gmail.com',
    action: 'UPDATE_SHIPPING_RATES',
    entity: 'shippingRates/west_malaysia',
    before: 'RM 15.00',
    after: 'RM 15.00 (Pos Laju, Citylink, J&T aktif)',
    timestamp: '2026-11-15T10:00:00Z',
  },
  {
    id: 'audit-2',
    actorUid: 'system-bootstrap',
    actorEmail: 'TVET1720@gmail.com',
    action: 'UPDATE_ORDER_STATUS',
    entity: 'orders/DM-2026-1001',
    before: 'packed',
    after: 'shipped (J&T 620091847210)',
    timestamp: '2026-11-17T15:20:00Z',
  },
];
