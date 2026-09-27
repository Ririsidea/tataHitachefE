// A date picked in the browser ("2026-09-25", a local calendar day) -> the exact instants the API
// filters on, so an order placed at 02:00 IST still belongs to the day the employee sees on screen
// (sending the bare date would mean the UTC day). Pure - unit-tested in test/dateRange.test.ts.

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

function localInstant(day: string | null | undefined, end: boolean): string | undefined {
  const m = DAY.exec(day || '');
  if (!m) return undefined;
  const [year, month, date] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const instant = end ? new Date(year, month - 1, date, 23, 59, 59, 999) : new Date(year, month - 1, date, 0, 0, 0, 0);
  return Number.isNaN(instant.getTime()) ? undefined : instant.toISOString();
}

export const startOfLocalDay = (day: string | null | undefined) => localInstant(day, false);
export const endOfLocalDay = (day: string | null | undefined) => localInstant(day, true);
