import { CapacityDay, FulfilmentMethod, StoreSettings } from '../types/domain';
import { getKualaLumpurTodayISO } from './malaysia';

export type DateUnavailableReason =
  | 'before_lead_time'
  | 'not_dispatch_day'
  | 'blocked_holiday'
  | 'at_capacity'
  | 'campaign_closed';

export interface SchedulableDate {
  date: string; // yyyy-mm-dd
  weekday: number; // 0=Sun..6=Sat
  available: boolean;
  reason?: DateUnavailableReason;
  remainingSlots: number;
  limit: number;
  used: number;
  note?: string;
}

function addDaysISO(baseISO: string, daysToAdd: number): string {
  const [y, m, d] = baseISO.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + daysToAdd));
  return dt.toISOString().slice(0, 10);
}

function getWeekdayUTC(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function getAvailableDates(params: {
  todayISO?: string;
  leadTimeDays: number;
  requiredSlots: number;
  fulfilmentMethod: FulfilmentMethod;
  settings: StoreSettings;
  capacityMap: Map<string, CapacityDay>;
  horizonDays?: number;
}): SchedulableDate[] {
  const {
    todayISO = getKualaLumpurTodayISO(),
    leadTimeDays,
    requiredSlots,
    fulfilmentMethod,
    settings,
    capacityMap,
    horizonDays = 42,
  } = params;

  const earliestDate = addDaysISO(todayISO, Math.max(1, leadTimeDays));
  const results: SchedulableDate[] = [];

  for (let i = 1; i <= horizonDays; i++) {
    const date = addDaysISO(todayISO, i);
    const weekday = getWeekdayUTC(date);
    const cap = capacityMap.get(date);

    const limit = cap ? cap.limit : settings.defaultDailyLimit;
    const used = cap ? cap.used : 0;
    const remainingSlots = Number(Math.max(0, limit - used).toFixed(2));
    const isHoliday = settings.holidays.includes(date) || Boolean(cap?.blocked);

    const isAllowedDay =
      fulfilmentMethod === 'courier'
        ? cap
          ? cap.dispatchEnabled
          : settings.dispatchDays.includes(weekday)
        : cap
        ? cap.selfDeliveryEnabled
        : settings.selfDelivery.days.includes(weekday);

    let available = true;
    let reason: DateUnavailableReason | undefined;

    if (date < earliestDate) {
      available = false;
      reason = 'before_lead_time';
    } else if (isHoliday) {
      available = false;
      reason = 'blocked_holiday';
    } else if (!isAllowedDay) {
      available = false;
      reason = 'not_dispatch_day';
    } else if (remainingSlots < requiredSlots) {
      available = false;
      reason = 'at_capacity';
    }

    results.push({
      date,
      weekday,
      available,
      reason,
      remainingSlots,
      limit,
      used,
      note: cap?.note,
    });
  }

  return results;
}

export function getEarliestAvailableDate(dates: SchedulableDate[]): SchedulableDate | null {
  return dates.find((d) => d.available) || null;
}
