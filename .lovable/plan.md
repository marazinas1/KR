# Step 8 — Tariffs, charges and invoices per lease

Answers to the four questions first; the build scope follows.

## 1. Reading + tariff → one charge row

Charging happens per **(lease, period, meter)**. Inputs:

- `meter_readings` row with `status = 'approved'`, `period = :period`, whose meter belongs to the lease's unit (or the unit's building, for shared meters). `consumption` is already computed by the existing database trigger — it is never recomputed in TypeScript.
- The tariff in force for that period:

```sql
SELECT * FROM utility_rates
WHERE type = :meter_type AND effective_from <= :period
ORDER BY effective_from DESC
LIMIT 1;
```
`:period` is the first day of the month, and `utility_rates` already has `UNIQUE (type, effective_from)`, so this resolves to exactly one row. A rate is never edited in place — a change is a new row with a later `effective_from` (AGENTS.md section 6).

Amount, rounded to cents:

```text
amount = round(consumption * rate.price_per_unit, 2)
```

`fixed_monthly` on a rate is **not** folded into the same row. If the effective rate has `fixed_monthly > 0`, a second charge row of `kind = 'fixed'` is written for that (lease, period, type) with `quantity = 1`, `unit_price = fixed_monthly`. Mixing a per-unit and a flat fee into one row would make the invoice line unreadable and the amount unauditable.

Row written:

| column | value |
|---|---|
| `lease_id` | the lease holding the unit in that period |
| `period` | first day of the month |
| `kind` | `utility` (or `fixed`) |
| `meter_reading_id` | the approved reading (audit link) |
| `utility_rate_id` | the resolved rate (audit link) |
| `description` | `"<meter type>, <serial>, <period>"` built from i18n on display — the stored text is a neutral fallback |
| `quantity` | `consumption` (1 for fixed) |
| `unit_price` | `rate.price_per_unit` (`fixed_monthly` for fixed) |
| `amount` | as above |

**Shared (building) meters:** consumption is split across the units of that building that had a holding lease in the period, equally by unit count in v1 (documented in the description, e.g. "shared, 1/6"). No area-weighted split until they ask for one.

**No rate for the period.** Nothing is invented and nothing is skipped silently. Generation is a preview-then-commit action (see 2): a reading with no effective rate is listed in the preview as a **blocked line** with the reason "no tariff effective for <type> on <period>", the generation of the remaining lines still proceeds, and the run result reports `blocked: n`. The dashboard's missing-readings card gains no new state; instead the charges screen shows the blocked list until a rate is added, after which re-running the same period fills only the missing rows (2 makes that safe). A charge with `amount = 0` is never written as a substitute.

## 2. Rent generation — manual, guarded by a unique index

**Manual action, not cron.** The manager opens `/admin/charges`, picks a period (defaults to the current month), sees a preview table of everything that would be created (rent per active lease, utilities per approved reading, fixed fees, blocked lines with reasons and totals), and presses "Generate". Nothing writes to `charges` until that press. This matches the way they work today (Rapolas reviews before money leaves the spreadsheet) and avoids a scheduled job silently charging a wrong tariff. A cron wrapper can be added in step 10 on top of the same server function once they trust it.

Rent line: for every lease with `status IN ('active','ending')` overlapping the period, `kind = 'rent'`, `quantity = 1`, `unit_price = amount = leases.monthly_rent`. Partial first/last month is **pro-rated by days** when the lease starts or ends inside the period (`monthly_rent * covered_days / days_in_month`, rounded to cents) and the description states the day range.

**Double-generation guard — database level, two partial unique indexes:**

```sql
CREATE UNIQUE INDEX charges_one_rent_per_lease_period
  ON public.charges (lease_id, period) WHERE kind = 'rent';
CREATE UNIQUE INDEX charges_one_utility_per_reading
  ON public.charges (meter_reading_id, lease_id) WHERE meter_reading_id IS NOT NULL;
CREATE UNIQUE INDEX charges_one_fixed_per_lease_period_rate
  ON public.charges (lease_id, period, utility_rate_id) WHERE kind = 'fixed';
```

The reading index is keyed on **(meter_reading_id, lease_id)**, not on the reading alone: one shared building meter legitimately produces one charge per lease in that building (section 1's split). Keying it on the reading alone would let the first lease's insert succeed and silently swallow every other lease in the building as "skipped" — those tenants would never be billed for their share. With `lease_id` included, the split works and a repeat run still cannot double-charge the same lease for the same reading. Same principle as `charges_one_fixed_per_lease_period_rate`.

Generation inserts with `ON CONFLICT DO NOTHING` and reports `created` / `skipped (already existed)` / `blocked`. Re-running a period is therefore safe and idempotent by construction, not by a TypeScript "did I already do this" check. `one_off` and `penalty` charges are hand-added and intentionally unconstrained.

An already-invoiced charge (`invoice_id IS NOT NULL`) can never be edited or deleted — enforced in the server function and stated in the UI.

## 3. Charges → invoices

**Default: one invoice per (lease, period), covering every uninvoiced charge of that lease for that period** — rent plus all utilities plus fixed fees, one line per charge row, in a fixed order (rent first, then utilities by type, then fixed, then one-offs). From the charges screen the manager selects periods/leases and presses "Issue invoices"; each invoice writes back `charges.invoice_id` for its lines, so a charge can never land on two invoices.

Manual selection stays available as the escape hatch: on a lease's charges list the manager can tick specific uninvoiced rows and issue an invoice from just those (needed for a mid-month settlement or a damage charge).

**Yes — the same numbering series and the same PDF engine.** No new invoice path is created:
- number comes from the existing atomic `claim_invoice_number()` RPC,
- the record is written by the existing `createInvoiceRecord()` in `invoices.server.ts`, with seller taken from `org_settings` (white-label) and `lease_id` set,
- the PDF is the existing `buildInvoicePdf` / `InvoiceViewerDialog`.

The only change to that engine is an input path: `createInvoiceRecord` gains an optional `chargeIds` mode that turns charge rows into its existing `lineItems` shape (`gross` = charge `amount`; the engine keeps deriving net/VAT exactly as it does today) and stamps `invoice_id` on those charges inside the same call. The buyer block is filled from the lease's tenant instead of being typed by hand. `invoices` itself is untouched.

## 4. One balance arithmetic, shared

Confirmed, and enforced the same way availability was in step 7 — by deleting the second implementation, not by keeping two in sync.

Today the admin debtor card uses `fetchDebtors()` in `dashboard-queries.server.ts` (Σ charges with `period <= today` − Σ payments) while the tenant portal's `getMyBalance` sums whatever RLS returns with **no period filter**. Those are already two arithmetics and would drift the moment a future-dated charge exists.

Step 8 adds one exported helper in `dashboard-queries.server.ts`:

```text
computeBalances(db, todayIso, opts?) -> Map<lease_id, {charged, paid, balance}>
  charged = Σ charges.amount WHERE period <= todayIso
  paid    = Σ payments.amount
  balance = charged − paid   (rounded to cents)
```

`fetchDebtors()` becomes a filter over it (`balance > 0`), `listUnits`' per-unit balance reads it, and `getMyBalance` calls the same helper with the tenant's own client — RLS narrows the rows, the arithmetic is identical, including the `period <= today` cut-off. The tenant screen then also shows "upcoming" (charges dated after today) separately instead of silently mixing them in. A comment on the helper states it is the only place a balance is computed.

## Build scope

- **Migration (no data):** the three partial unique indexes above; `CHECK (quantity >= 0)` and `amount = round(quantity*unit_price,2)` left alone if already implied; `COMMENT ON TABLE charges` documenting the (lease, period, kind) rule and the "invoiced charges are immutable" rule; RLS/grants review so a tenant can read only their own lease's charges (existing policies checked and extended only if a gap is found).
- **New:** `src/lib/charges.server.ts` (preview + generate, the one place the formula lives), `src/lib/charges.functions.ts` (manager-gated `previewCharges`, `generateCharges`, `listCharges`, `addManualCharge`, `deleteCharge`, `issueInvoices`), `src/lib/rates.functions.ts` (list/add tariff — never edit), `/admin/charges` route, tariffs section in settings, nav entry.
- **Edited:** `invoices.server.ts` / `invoices.functions.ts` (charge-based creation), `dashboard-queries.server.ts` (`computeBalances`), `tenant-portal.functions.ts` (`getMyBalance` uses it), `units.functions.ts`, locale files.
- **Payments:** admin can record a payment against a lease (`payments` table already exists) from the lease panel and from `/admin/charges`; that is what makes the debtor card real.

## Verification (real output printed)

1. Fixture: 2 tariff rows for `cold_water` (`effective_from` last year and this month) + an approved reading → printed charge row showing the **later** rate was used, with `utility_rate_id` matching.
2. A reading whose type has **no** rate → printed preview showing it as blocked with the reason, and `SELECT count(*) FROM charges` proving nothing was written for it.
3. Generate the same period twice → printed `created`/`skipped` counts and a `count(*)` proving one rent row per lease.
4. Pro-rated first month printed against a hand-computed figure.
5. Issue an invoice from those charges → printed `full_number` from the existing series, printed `charges.invoice_id` set on exactly those rows, PDF rendered in the browser.
6. Same lease read three ways — dashboard debtor card, `listUnits` balance, tenant `getMyBalance` while signed in as that tenant — printed side by side, identical numbers.
7. Fixture cleanup counts = 0, `bunx tsgo --noEmit`, full `bun run build` tail.
