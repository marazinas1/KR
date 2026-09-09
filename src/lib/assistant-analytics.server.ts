/**
 * Server-only: the numbers the assistant may quote.
 *
 * Everything comes from `buildDashboard()` — the same computation the admin
 * dashboard shows — so the assistant can never report a different figure for
 * the same thing. Only aggregates: no names, no per-person debt.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { buildDashboard } from "./dashboard.functions";
import type { AssistantLang } from "./assistant-knowledge";

export async function buildBusinessSummary(
  db: SupabaseClient<Database>,
  lang: AssistantLang,
): Promise<string> {
  const d = await buildDashboard(db);
  const en = lang === "en";
  const money = (n: number) => `${n.toLocaleString(en ? "en-US" : "lt-LT")} €`;

  return [
    `${en ? "Date" : "Data"}: ${d.today}, ${en ? "period" : "laikotarpis"}: ${d.period}`,
    `${en ? "Active units" : "Aktyvūs butai"}: ${d.kpis.activeUnits}, ${en ? "occupied" : "užimti"}: ${d.kpis.occupiedUnits}, ${en ? "vacant" : "laisvi"}: ${d.kpis.vacantUnits}, ${en ? "occupancy" : "užimtumas"}: ${d.kpis.occupancyPct}%`,
    `${en ? "Monthly rent roll" : "Mėnesio nuomos apyvarta"}: ${money(d.kpis.rentRoll)}`,
    `${en ? "Leases ending" : "Baigiasi sutartys"}: 30 ${en ? "d" : "d."}: ${d.expiring.d30}, 31–60: ${d.expiring.d60}, 61–90: ${d.expiring.d90}`,
    `${en ? "Units becoming vacant" : "Netrukus atsilaisvins butų"}: ${d.vacant.becomingVacant}`,
    `${en ? "Readings missing this period" : "Trūksta rodmenų šį laikotarpį"}: ${d.readings.unitsMissing}/${d.readings.unitsExpected} ${en ? "units" : "butų"}, ${en ? "meters" : "skaitiklių"}: ${d.readings.metersMissing}, ${en ? "awaiting approval" : "laukia patvirtinimo"}: ${d.readings.pendingReview}`,
    `${en ? "Open issues" : "Atviri gedimai"}: ${d.issues.open}${
      Object.keys(d.issues.byPriority).length
        ? ` (${Object.entries(d.issues.byPriority)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")})`
        : ""
    }`,
    `${en ? "Debtors" : "Skolininkų"}: ${d.debtors.count}, ${en ? "total debt" : "bendra skola"}: ${money(d.kpis.debtTotal)}`,
    `${en ? "New inquiries" : "Naujos užklausos"}: ${d.inquiries.newCount}`,
    `${en ? "Documents expiring within 30 days" : "Dokumentų baigiasi galiojimas per 30 d."}: ${d.documents.count}`,
  ].join("\n");
}
