/** Minimalus iCal (.ics) parseris be išorinių priklausomybių. */

export type IcalEvent = {
  uid: string;
  summary: string;
  /** yyyy-MM-dd */
  start: string;
  /** yyyy-MM-dd (iCal DTEND yra exclusive) */
  end: string;
};

/** Išskleidžia sulaužytas (folded) eilutes pagal RFC 5545. */
function unfold(text: string): string[] {
  const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

function toIsoDate(value: string): string | null {
  const v = value.trim();
  // DATE: 20260812 arba DATE-TIME: 20260812T140000Z
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(v);
  if (!m) {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function parseIcal(text: string): IcalEvent[] {
  const lines = unfold(text);
  const events: IcalEvent[] = [];
  let cur: Partial<IcalEvent> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "BEGIN:VEVENT") {
      cur = {};
      continue;
    }
    if (trimmed === "END:VEVENT") {
      if (cur?.start && cur.end) {
        const uid = cur.uid?.trim() || `${cur.start}_${cur.end}_${cur.summary ?? ""}`;
        events.push({
          uid,
          summary: (cur.summary ?? "").trim(),
          start: cur.start,
          end: cur.end,
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;

    const sep = trimmed.indexOf(":");
    if (sep === -1) continue;
    const namePart = trimmed.slice(0, sep);
    const value = trimmed.slice(sep + 1);
    const name = namePart.split(";")[0].toUpperCase();

    if (name === "UID") cur.uid = value;
    else if (name === "SUMMARY") cur.summary = value.replace(/\\,/g, ",").replace(/\\n/gi, " ");
    else if (name === "DTSTART") cur.start = toIsoDate(value) ?? undefined;
    else if (name === "DTEND") cur.end = toIsoDate(value) ?? undefined;
    else if (name === "DURATION" && cur.start) {
      const d = /^P(?:(\d+)D)?/.exec(value.trim());
      const days = d?.[1] ? Number(d[1]) : 1;
      cur.end = addDays(cur.start, days);
    }
  }

  return events;
}

/** Nustato šaltinį pagal iCal nuorodą. */
export function sourceFromUrl(url: string): "booking" | "airbnb" | "other" {
  const u = url.toLowerCase();
  if (u.includes("airbnb")) return "airbnb";
  if (u.includes("booking.com") || u.includes("admin.booking")) return "booking";
  return "other";
}
