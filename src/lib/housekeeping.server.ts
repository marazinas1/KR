// Server-only: kambarių tvarkymo darbų apskaičiavimas iš rezervacijų.

export type WorkType =
  | "turnover" // išvyksta ir tą pačią dieną atvyksta — siauriausias langas
  | "departure" // išvyksta, tą dieną naujo svečio nėra
  | "pre_arrival" // tuščias, atvyksta svečias
  | "stayover" // svečias gyvena ir lieka toliau
  | "none"; // nieko nereikia

/** Mažesnis skaičius = svarbiau. Naudojama rikiavimui. */
export const WORK_TYPE_PRIORITY: Record<WorkType, number> = {
  turnover: 1,
  departure: 2,
  pre_arrival: 3,
  stayover: 4,
  none: 5,
};

/** Objekto „šiandien“ pagal jo laiko zoną, ne pagal serverio UTC. */
export function localToday(timeZone: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone || "Europe/Vilnius",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type BookingLite = {
  property_id: string;
  date_from: string;
  date_to: string;
  status: string;
  adults_count: number;
  children_count: number;
  infants_count: number;
  check_in_time: string | null;
  check_out_time: string | null;
  customer_name: string | null;
  extras: unknown;
};

export type DayWork = {
  work_type: WorkType;
  priority: number;
  departing: { guests: string; time: string | null } | null;
  arriving: {
    guests: string;
    time: string | null;
    adults: number;
    children: number;
    infants: number;
    extras: string[];
  } | null;
};

function extrasNames(extras: unknown): string[] {
  if (!Array.isArray(extras)) return [];
  return extras
    .map((e) => String((e as { name?: string })?.name ?? "").trim())
    .filter(Boolean);
}

/**
 * Apskaičiuoja, kokio darbo reikia vienam kambariui vieną dieną.
 *
 * SVARBU: sprendžiama tik pagal rezervacijas. Nesutvarkyti kambariai
 * (`room_status.status !== 'svarus'`) į sąrašą įtraukiami atskirai —
 * žr. `rooms.ts`, kitaip vakar neatliktas darbas dingtų iš sąrašo.
 */
export function computeDayWork(
  bookings: BookingLite[],
  date: string,
  stayoverEveryDays: number,
): DayWork {
  const departingB = bookings.find((b) => b.date_to === date);
  const arrivingB = bookings.find((b) => b.date_from === date);
  const stayingB = bookings.find((b) => b.date_from < date && b.date_to > date);

  let work_type: WorkType = "none";
  if (departingB && arrivingB) work_type = "turnover";
  else if (departingB) work_type = "departure";
  else if (arrivingB) work_type = "pre_arrival";
  else if (stayingB) {
    // Gyvenamas kambarys tvarkomas kas N parų nuo atvykimo, o ne kasdien.
    const n = Number(stayoverEveryDays) || 0;
    if (n > 0) {
      const from = new Date(`${stayingB.date_from}T00:00:00Z`).getTime();
      const cur = new Date(`${date}T00:00:00Z`).getTime();
      const nights = Math.round((cur - from) / 86400000);
      if (nights > 0 && nights % n === 0) work_type = "stayover";
    }
  }

  const guestsOf = (b: BookingLite) =>
    String(b.customer_name ?? "").trim() ||
    `${(b.adults_count ?? 0) + (b.children_count ?? 0) + (b.infants_count ?? 0)} sv.`;

  return {
    work_type,
    priority: WORK_TYPE_PRIORITY[work_type],
    departing: departingB
      ? { guests: guestsOf(departingB), time: departingB.check_out_time || null }
      : null,
    arriving: arrivingB
      ? {
          guests: guestsOf(arrivingB),
          time: arrivingB.check_in_time || null,
          adults: arrivingB.adults_count ?? 0,
          children: arrivingB.children_count ?? 0,
          infants: arrivingB.infants_count ?? 0,
          extras: extrasNames(arrivingB.extras),
        }
      : null,
  };
}

/** Užduoties statusas pagal kambario švaros būklę. */
export function taskStatusForRoomStatus(status: string): "laukia" | "vykdoma" | "atlikta" {
  if (status === "svarus") return "atlikta";
  if (status === "tvarkoma") return "vykdoma";
  return "laukia";
}
