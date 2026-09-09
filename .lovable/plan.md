# Step 9 — Lease contracts

Turn the existing contract-template engine into a working lease-contract system: write a template once, generate a filled contract from any lease, produce a PDF, store it in the private documents area, and let the dashboard warn before it expires.

Signing in v1 is on paper: the manager generates the PDF, prints or emails it, and both parties sign physically. The signed scan is uploaded back against the same lease.

## What Rapolas will be able to do

1. Open Contracts, write or edit a lease template in the existing rich-text editor, and insert long-term rental placeholders from a side list (tenant name, unit address, rent, deposit, start/end date, payment day, notice period, landlord company details, and so on).
2. Open any lease, press "Generate contract", see the template filled with that lease's real values, and download the PDF.
3. Save the generated contract to the lease. It lands in the private documents area as a `lease_contract` document with the lease's end date as its expiry, so the dashboard's "documents expiring" card picks it up automatically.
4. Upload the scan of the signed paper copy against the same lease afterwards.
5. See on the lease panel whether a contract has been generated, and for which version.

Tenants with a portal login see their own contract in their Documents screen through the existing rule — no new access path.

## Booking-era leftovers this step clears

Checked against the live database and the code:

- `signed_contracts` still has `booking_id` pointing at `bookings`, plus a `bookings` foreign key. With paper signing there is no in-app signature to store, so the table and its policies are dropped rather than repointed. Nothing in the application code reads or writes it (verified: no source file references it).
- Template placeholders in the Contracts screen are still the booking set (`naktys`, `sveciai`, `rezervacijos_nr`, `nuo`/`iki` as a stay). They are replaced by lease variables.
- The `bookings` table itself, `booking_notifications`, and `set_booking_number` / `cancel_expired_pending_bookings` remain as unrelated leftovers. This step does not touch them — they belong to a separate cleanup task, and dropping them is destructive enough to deserve its own approval.
- The `privacy` template kind and the public `/v1/legal` endpoint stay as they are, by your decision.

## Template variables

The old set is replaced. Each variable is filled from data that already exists — no new fields to type twice.

| Placeholder | Source |
|---|---|
| tenant name, personal code, phone, email, address | `tenants` (+ `tenant_identity` when the person generating is an owner) |
| co-occupants | `lease_occupants` |
| unit address, unit number, floor, area, rooms | `units` (+ `buildings`) |
| lease start, lease end, term in months | `leases` |
| monthly rent, rent in words, deposit, deposit in words | `leases` |
| payment day, notice days | `leases` |
| landlord name, company code, VAT code, address, bank, IBAN | `org_settings` |
| document date, city | generation date, `org_settings` |

An unfilled placeholder is never silently blanked: generation lists every missing value before producing anything, so a contract cannot go out with an empty deposit line. Personal code appears only when an owner generates; for a manager the placeholder resolves to a blank to be filled by hand (per the personal-data rule).

## PDF

Uses the same engine as invoices (jsPDF with the DejaVu font already bundled), so Lithuanian letters render correctly, the file stays small, and the text is searchable and selectable. The template's headings, paragraphs, bold/italic and bullet/numbered lists are honoured; page breaks, page numbers, a header with the landlord name and a signature block for both parties are added automatically. Tables and images inside a template are out of scope for this step.

## Technical section

**Database (one migration)**

- Drop `public.signed_contracts` (with its policies) — booking-bound, unused by code, replaced by the paper flow. This is destructive and will ask for your confirmation; the table is currently empty, which is verified before the migration runs.
- Add `contract_templates.kind` value `lease` alongside the existing `rental`/`privacy` (kind is free text today, so this is a data/labels change, not a constraint change). Existing rows untouched.
- Add `documents.source_lease_contract` boolean-free approach: no schema change. Generated contracts are ordinary `documents` rows with `kind = 'lease_contract'`, `lease_id` set, `expires_at = lease.end_date`. No new table, no second source of truth.

**New/changed files**

- `src/lib/contract-vars.ts` — the single definition of the lease variable list (key, label key, sample value). Used by both the editor's insert list and the filler, so the two can never drift.
- `src/lib/contracts.server.ts` — `buildLeaseContract(db, leaseId, templateId)`: loads lease + tenant + occupants + unit + building + org settings under the caller's own permissions, resolves every placeholder, returns `{ html, missing[] }`.
- `src/lib/contracts.functions.ts` — add `previewLeaseContract` (manager) and `listLeaseTemplates`; existing template CRUD unchanged.
- `src/lib/contract-pdf.ts` — HTML-subset → jsPDF renderer, sharing the font loader and page furniture with `invoice-pdf.ts` (extracted into a small shared helper rather than copied).
- `src/components/admin/units/ContractDialog.tsx` — template picker, filled preview, missing-value warnings, Download PDF, Save to lease.
- `src/components/admin/units/LeasePanel.tsx` — "Contract" action + generated-contract state.
- `src/routes/_authenticated/admin.contracts.tsx` — lease variable list, `lease` kind in the picker and labels.
- `src/i18n/locales/lt.json` / `en.json` — new variable labels and dialog strings; the booking variable labels are removed.

Saving uses the existing `documents` upload path and private bucket; the file is generated in the browser and uploaded exactly like a manual document, so access rules, signed URLs and deletion cleanup are the ones already in place.

**Verification (real data, reported back)**

1. Generate a contract from a real lease and show the filled values against the database row.
2. Show the missing-value warning by leaving a template placeholder unresolvable.
3. Show the personal-code difference between an owner-generated and a manager-generated contract.
4. Open the produced PDF page images and confirm Lithuanian characters, layout and the signature block.
5. Save to lease, then confirm the document row (lease link, kind, expiry = lease end date) and that the dashboard "documents expiring" card counts it.
6. Confirm from a real tenant login that the tenant sees their own contract and no other.
7. Confirm `signed_contracts` is gone and nothing in the app broke: typecheck plus production build.
