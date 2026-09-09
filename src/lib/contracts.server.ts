/**
 * Fills a lease-contract template with real lease data.
 *
 * Runs with the caller's own Supabase client, so RLS decides what is visible.
 * The tenant's personal code lives in `tenant_identity`, which is readable by
 * owners only — a manager simply sees no row, and the placeholder becomes a
 * hand-filled blank line instead of an error. See contract-vars.ts.
 */
import {
  BLOCKING_VARS,
  CONTRACT_VARS,
  MANUAL_PLACEHOLDER,
  isManualVar,
  type ContractVar,
} from "./contract-vars";

type Ctx = { supabase: any; userId: string };

export type FilledContract = {
  html: string;
  /** Real data that is missing — generation is blocked. */
  missing: ContractVar[];
  /** Placeholders left blank on purpose, to be written by hand. */
  manual: ContractVar[];
  used: ContractVar[];
  meta: {
    lease_id: string;
    unit_id: string;
    tenant_id: string;
    tenant_name: string;
    unit_name: string;
    end_date: string | null;
  };
};

const money = (n: number) => `${(Number(n) || 0).toFixed(2).replace(".", ",")} €`;

export async function buildLeaseContract(
  ctx: Ctx,
  leaseId: string,
  templateContent: string,
): Promise<FilledContract> {
  const { data: lease, error } = await ctx.supabase
    .from("leases")
    .select(
      "id, unit_id, tenant_id, start_date, end_date, monthly_rent, deposit, payment_day, notice_days",
    )
    .eq("id", leaseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!lease) throw new Error("LeaseNotFound");

  const [unitRes, tenantRes, occRes, orgRes, identityRes] = await Promise.all([
    ctx.supabase
      .from("units")
      .select("id, name, unit_number, address, city, area_m2, room_count, building_id")
      .eq("id", lease.unit_id)
      .maybeSingle(),
    ctx.supabase
      .from("tenants")
      .select("id, first_name, last_name, phone, email")
      .eq("id", lease.tenant_id)
      .maybeSingle(),
    ctx.supabase.from("lease_occupants").select("full_name").eq("lease_id", leaseId),
    ctx.supabase.from("org_settings").select("*").maybeSingle(),
    ctx.supabase.from("tenant_identity").select("personal_code").eq("tenant_id", lease.tenant_id).maybeSingle(),
  ]);

  const unit = unitRes.data ?? {};
  const tenant = tenantRes.data ?? {};
  const org = orgRes.data ?? {};
  const occupants = (occRes.data ?? []).map((o: any) => o.full_name).filter(Boolean);

  let unitAddress = [unit.address, unit.unit_number ? `Nr. ${unit.unit_number}` : "", unit.city]
    .filter(Boolean)
    .join(", ");
  if (!unitAddress && unit.building_id) {
    const { data: b } = await ctx.supabase
      .from("buildings")
      .select("address, city")
      .eq("id", unit.building_id)
      .maybeSingle();
    unitAddress = [b?.address, unit.unit_number ? `Nr. ${unit.unit_number}` : "", b?.city]
      .filter(Boolean)
      .join(", ");
  }

  const tenantName = [tenant.first_name, tenant.last_name].filter(Boolean).join(" ");
  const today = new Date().toISOString().slice(0, 10);

  const values: Record<ContractVar, string> = {
    nuomotojas: org.company_name || org.display_name || "",
    nuomotojo_kodas: org.company_code || "",
    nuomotojo_adresas: org.company_address || org.address || "",
    nuomotojo_saskaita: org.iban || "",
    nuomotojo_bankas: org.bank_name || "",
    nuomininkas: tenantName,
    nuomininko_asmens_kodas: identityRes.data?.personal_code || "",
    nuomininko_telefonas: tenant.phone || "",
    nuomininko_el_pastas: tenant.email || "",
    kartu_gyvenantys: occupants.join(", "),
    objektas: unit.name || "",
    objekto_adresas: unitAddress,
    objekto_plotas: unit.area_m2 ? `${unit.area_m2} m²` : "",
    objekto_kambariai: unit.room_count ? String(unit.room_count) : "",
    sutarties_pradzia: lease.start_date || "",
    sutarties_pabaiga: lease.end_date || "neterminuota",
    nuomos_mokestis: lease.monthly_rent > 0 ? money(lease.monthly_rent) : "",
    depozitas: lease.deposit > 0 ? money(lease.deposit) : "",
    mokejimo_diena: lease.payment_day ? String(lease.payment_day) : "",
    ispejimo_terminas: lease.notice_days ? `${lease.notice_days} d.` : "",
    data: today,
    miestas: org.city || unit.city || "",
  };

  const used: ContractVar[] = [];
  const missing: ContractVar[] = [];
  const manual: ContractVar[] = [];

  let html = templateContent;
  for (const key of CONTRACT_VARS) {
    const token = `{{${key}}}`;
    if (!html.includes(token)) continue;
    used.push(key);
    const value = values[key];
    if (value) {
      html = html.split(token).join(escapeHtml(value));
      continue;
    }
    // Empty. Manual fields print a blank line; real data blocks generation.
    if (isManualVar(key)) {
      manual.push(key);
      html = html.split(token).join(escapeHtml(MANUAL_PLACEHOLDER));
    } else if (BLOCKING_VARS.includes(key)) {
      missing.push(key);
      html = html.split(token).join(escapeHtml(MANUAL_PLACEHOLDER));
    } else {
      html = html.split(token).join("—");
    }
  }

  return {
    html,
    missing,
    manual,
    used,
    meta: {
      lease_id: lease.id,
      unit_id: lease.unit_id,
      tenant_id: lease.tenant_id,
      tenant_name: tenantName,
      unit_name: unit.name || "",
      end_date: lease.end_date ?? null,
    },
  };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
