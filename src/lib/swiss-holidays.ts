// Schweizer Feiertage – national gültige Tage plus weit verbreitete kantonale Feiertage.
// Reine Berechnung ohne externe Abhängigkeiten (Ostern via Gauss/Meeus).

export interface SwissHoliday {
  /** ISO-Datum YYYY-MM-DD */
  date: string;
  name: string;
  /** true = in der ganzen Schweiz arbeitsfrei */
  national: boolean;
  /** Kantone (Kürzel), falls nicht national */
  cantons?: string[];
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

/** Ostersonntag (gregorianisch) */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = März, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** Eidgenössischer Dank-, Buss- und Bettag: 3. Sonntag im September */
function bettag(year: number): Date {
  const d = new Date(year, 8, 1);
  let sundays = 0;
  while (true) {
    if (d.getDay() === 0) {
      sundays++;
      if (sundays === 3) return new Date(d);
    }
    d.setDate(d.getDate() + 1);
  }
}

const cache = new Map<number, SwissHoliday[]>();

export function getSwissHolidays(year: number): SwissHoliday[] {
  const cached = cache.get(year);
  if (cached) return cached;

  const easter = easterSunday(year);

  const list: SwissHoliday[] = [
    { date: iso(new Date(year, 0, 1)), name: 'Neujahr', national: true },
    { date: iso(new Date(year, 0, 2)), name: 'Berchtoldstag', national: false, cantons: ['AG', 'BE', 'FR', 'GL', 'JU', 'NE', 'OW', 'SH', 'SO', 'TG', 'VD', 'ZH'] },
    { date: iso(new Date(year, 0, 6)), name: 'Heilige Drei Könige', national: false, cantons: ['GR', 'LU', 'SZ', 'TI', 'UR'] },
    { date: iso(new Date(year, 2, 19)), name: 'Josefstag', national: false, cantons: ['GR', 'LU', 'NW', 'SZ', 'TI', 'UR', 'VS'] },
    { date: iso(addDays(easter, -2)), name: 'Karfreitag', national: false, cantons: ['alle ausser TI, VS'] },
    { date: iso(easter), name: 'Ostersonntag', national: true },
    { date: iso(addDays(easter, 1)), name: 'Ostermontag', national: false, cantons: ['alle ausser VS'] },
    { date: iso(new Date(year, 4, 1)), name: 'Tag der Arbeit', national: false, cantons: ['AG', 'BL', 'BS', 'JU', 'NE', 'SH', 'SO', 'TG', 'TI', 'ZH'] },
    { date: iso(addDays(easter, 39)), name: 'Auffahrt', national: true },
    { date: iso(addDays(easter, 49)), name: 'Pfingstsonntag', national: true },
    { date: iso(addDays(easter, 50)), name: 'Pfingstmontag', national: false, cantons: ['alle ausser VS'] },
    { date: iso(addDays(easter, 60)), name: 'Fronleichnam', national: false, cantons: ['AI', 'AG', 'FR', 'JU', 'LU', 'NW', 'OW', 'SZ', 'TI', 'UR', 'VS', 'ZG'] },
    { date: iso(new Date(year, 7, 1)), name: 'Bundesfeier (Nationalfeiertag)', national: true },
    { date: iso(new Date(year, 7, 15)), name: 'Mariä Himmelfahrt', national: false, cantons: ['AI', 'AG', 'FR', 'JU', 'LU', 'NW', 'OW', 'SZ', 'TI', 'UR', 'VS', 'ZG'] },
    { date: iso(bettag(year)), name: 'Bettag (Dank-, Buss- und Bettag)', national: true },
    { date: iso(new Date(year, 10, 1)), name: 'Allerheiligen', national: false, cantons: ['AI', 'AG', 'FR', 'GL', 'JU', 'LU', 'NW', 'OW', 'SG', 'SZ', 'TI', 'UR', 'VS', 'ZG'] },
    { date: iso(new Date(year, 11, 8)), name: 'Mariä Empfängnis', national: false, cantons: ['AI', 'AG', 'FR', 'LU', 'NW', 'OW', 'SZ', 'TI', 'UR', 'VS', 'ZG'] },
    { date: iso(new Date(year, 11, 25)), name: 'Weihnachten', national: true },
    { date: iso(new Date(year, 11, 26)), name: 'Stephanstag', national: false, cantons: ['alle ausser GE, JU, VS'] },
    { date: iso(new Date(year, 11, 31)), name: 'Silvester', national: false, cantons: ['Betrieblich meist verkürzt'] },
  ];

  cache.set(year, list);
  return list;
}

const mapCache = new Map<number, Map<string, SwissHoliday>>();

function holidayMap(year: number) {
  let m = mapCache.get(year);
  if (!m) {
    m = new Map(getSwissHolidays(year).map(h => [h.date, h]));
    mapCache.set(year, m);
  }
  return m;
}

export function getHolidayByISO(dateISO: string): SwissHoliday | undefined {
  const year = Number(dateISO.slice(0, 4));
  if (!year) return undefined;
  return holidayMap(year).get(dateISO);
}

export function getHolidayForDate(date: Date): SwissHoliday | undefined {
  return getHolidayByISO(iso(date));
}

export function isSwissHoliday(date: Date): boolean {
  return !!getHolidayForDate(date);
}

export { iso as toISODate };
