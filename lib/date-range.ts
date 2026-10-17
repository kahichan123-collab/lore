// Date-range parsing for the admin analytics filter. Inputs are
// <input type="date"> values (YYYY-MM-DD) interpreted in Hong Kong time;
// the SQL function receives timestamptz bounds. `to` is exclusive (the day
// after the chosen end date), so a single-day range includes the whole day.

export interface DateRange {
  from: string | null;
  to: string | null;
  fromIso: string | null;
  toIso: string | null;
  invalid: boolean;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function parseDateRange(from?: string | null, to?: string | null): DateRange {
  const rawFrom = typeof from === "string" && from.trim() ? from.trim() : null;
  const rawTo = typeof to === "string" && to.trim() ? to.trim() : null;

  if ((rawFrom && !validDate(rawFrom)) || (rawTo && !validDate(rawTo))) {
    return { from: null, to: null, fromIso: null, toIso: null, invalid: true };
  }
  if (rawFrom && rawTo && rawFrom > rawTo) {
    return { from: null, to: null, fromIso: null, toIso: null, invalid: true };
  }

  const fromIso = rawFrom ? new Date(`${rawFrom}T00:00:00+08:00`).toISOString() : null;
  let toIso: string | null = null;
  if (rawTo) {
    const end = new Date(`${rawTo}T00:00:00+08:00`);
    end.setUTCDate(end.getUTCDate() + 1);
    toIso = end.toISOString();
  }
  return { from: rawFrom, to: rawTo, fromIso, toIso, invalid: false };
}
