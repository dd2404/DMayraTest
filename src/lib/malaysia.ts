import { RegionId } from '../types/domain';

export const MALAYSIAN_STATES = [
  'Pulau Pinang',
  'Kedah',
  'Perlis',
  'Perak',
  'Selangor',
  'WP Kuala Lumpur',
  'WP Putrajaya',
  'Negeri Sembilan',
  'Melaka',
  'Johor',
  'Pahang',
  'Terengganu',
  'Kelantan',
  'Sabah',
  'WP Labuan',
  'Sarawak',
] as const;

export type MalaysianState = (typeof MALAYSIAN_STATES)[number];

const POSTCODE_STATE_RANGES: Record<MalaysianState, Array<[number, number]>> = {
  Perlis: [[1000, 2999]],
  Kedah: [[5000, 9999]],
  'Pulau Pinang': [[10000, 14999]],
  Kelantan: [[15000, 18999]],
  Terengganu: [[20000, 24999]],
  Pahang: [
    [25000, 28999],
    [39000, 39999],
    [49000, 49999],
    [69000, 69999],
  ],
  Perak: [[30000, 36999]],
  Selangor: [
    [40000, 48999],
    [63000, 68100],
  ],
  'WP Kuala Lumpur': [[50000, 60000]],
  'WP Putrajaya': [[62000, 62999]],
  'Negeri Sembilan': [[70000, 73999]],
  Melaka: [[75000, 78999]],
  Johor: [[79000, 86999]],
  'WP Labuan': [[87000, 87999]],
  Sabah: [[88000, 91999]],
  Sarawak: [[93000, 98999]],
};

// Remote island/offshore/PO-box ranges or invalid ranges flagged clearly (AC-09)
const UNSERVED_POSTCODES = new Set(['00000', '99999', '88999', '98999']);

export function validateMalaysianPostcode(
  postcodeRaw: string,
  state: string
): { valid: boolean; reason?: 'format' | 'mismatch' | 'unserved' } {
  const postcode = postcodeRaw.trim();
  if (!/^\d{5}$/.test(postcode)) {
    return { valid: false, reason: 'format' };
  }
  if (UNSERVED_POSTCODES.has(postcode)) {
    return { valid: false, reason: 'unserved' };
  }
  const num = Number.parseInt(postcode, 10);
  const ranges = POSTCODE_STATE_RANGES[state as MalaysianState];
  if (!ranges) {
    return { valid: false, reason: 'mismatch' };
  }
  const matches = ranges.some(([min, max]) => num >= min && num <= max);
  if (!matches) {
    return { valid: false, reason: 'mismatch' };
  }
  return { valid: true };
}

export function isBalikPulauPostcode(postcodeRaw: string, allowedPostcodes: string[]): boolean {
  const normalized = postcodeRaw.trim();
  return allowedPostcodes.includes(normalized);
}

export function getDestinationRegion(state: string, postcodeRaw: string): RegionId | 'unsupported' {
  const check = validateMalaysianPostcode(postcodeRaw, state);
  if (!check.valid) return 'unsupported';
  if (state === 'Sabah' || state === 'WP Labuan') return 'sabah';
  if (state === 'Sarawak') return 'sarawak';
  return 'west_malaysia';
}

export function validateMalaysiaPhone(phoneRaw: string): { valid: boolean; normalized: string } {
  const cleaned = phoneRaw.replace(/[\s\-()]/g, '');
  if (/^\+601\d{8,9}$/.test(cleaned)) {
    return { valid: true, normalized: cleaned };
  }
  if (/^601\d{8,9}$/.test(cleaned)) {
    return { valid: true, normalized: `+${cleaned}` };
  }
  if (/^01\d{8,9}$/.test(cleaned)) {
    return { valid: true, normalized: `+6${cleaned}` };
  }
  if (/^\+60[3-9]\d{7,8}$/.test(cleaned)) {
    return { valid: true, normalized: cleaned };
  }
  if (/^0[3-9]\d{7,8}$/.test(cleaned)) {
    return { valid: true, normalized: `+6${cleaned}` };
  }
  return { valid: false, normalized: cleaned };
}

export function formatMYR(sen: number): string {
  const rm = (sen / 100).toFixed(2);
  return `RM ${rm}`;
}

export function getKualaLumpurTodayISO(referenceDate: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(referenceDate);
}

export function formatDateMY(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}/.test(isoDate)) return isoDate;
  const [y, m, d] = isoDate.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}
