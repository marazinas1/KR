import { supabase } from "@/integrations/supabase/client";

/** Kviečia /api/staff/v1/* su Bearer tokenu iš esamos Supabase sesijos. */
export async function callStaffApi<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`/api/staff/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export type StaffRoomStatus = "nesvarus" | "tvarkoma" | "svarus";

export type StaffRoom = {
  id: string;
  name: string;
  sort_order: number;
  date: string;
  work_type: "turnover" | "departure" | "pre_arrival" | "stayover" | "none";
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
  checkin_today: boolean;
  checkout_today: boolean;
  occupied_today: boolean;
  status: StaffRoomStatus;
  note: string;
  has_issue: boolean;
  issue_note: string;
  task_status: "laukia" | "vykdoma" | "atlikta";
  assigned_to: string | null;
  assigned_to_email: string | null;
  assigned_to_name: string | null;
  assigned_to_me: boolean;
  comment_count: number;
  updated_at: string | null;
};

export const WORK_TYPE_LABEL_KEYS: Record<string, string> = {
  turnover: "staff.workType.turnover",
  departure: "staff.workType.departure",
  pre_arrival: "staff.workType.pre_arrival",
  stayover: "staff.workType.stayover",
  none: "staff.workType.none",
};

export const STAFF_STATUS_LABEL_KEYS: Record<StaffRoomStatus, string> = {
  nesvarus: "staff.roomStatus.nesvarus",
  tvarkoma: "staff.roomStatus.tvarkoma",
  svarus: "staff.roomStatus.svarus",
};

export const STAFF_STATUS_CLASS: Record<StaffRoomStatus, string> = {
  nesvarus: "border-destructive/40 bg-destructive/10 text-destructive",
  tvarkoma: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  svarus: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};
/** Prideda dienų prie YYYY-MM-DD datos (be laiko zonų įtakos). */
export function addDaysISO(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
