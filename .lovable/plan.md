# Step 5 — Public vacancy site

Scope: a new public surface (home + listings + single unit + inquiry form) reading only `public_vacancies`, plus an admin "Užklausos" list. No tenant portal, no dashboard, no billing. Nothing else in this task.

## 1. Visual direction (public pages only)

The mockup's tokens are adopted for the public surface only; the admin keeps its current look until a later step decides otherwise.

- IBM Plex Sans + IBM Plex Mono loaded with a `<link>` in `src/routes/__root.tsx` (never `@import` in CSS), registered as `--font-sans-public` / `--font-mono-public` in `@theme`.
- New tokens in `src/styles.css`, all oklch, scoped by a `.site-theme` class the public layout sets: paper background, card, ink, graphite, hairline, plus one dark `board` surface.
- Status colours (`available` / `soon` / `occupied`) are registered as their own tokens and used **only** for availability state — never for branding or emphasis.
- Restrained radii for public components; pill radius only for status chips.
- No hardcoded colour utilities in components — everything through tokens.

## 2. Routes and pages

All under the existing LT/EN pair (`/…` and `/en/…`), one page module shared by both route files, as the current locale pattern does.

| Route | Page |
|---|---|
| `/` (+ `/en`) | Home: hero copy + dark board panel of the soonest-available units, trust band, short "kaip tai veikia", contact CTA |
| `/butai` (+ `/en/butai`) | Full board: all listed units, tabs "Laisvi dabar" / "Laisvi netrukus" / "Visi", sort soonest-first |
| `/butai/$id` (+ `/en/…`) | Unit page: photos, facts, rent/deposit, availability line, inquiry form |
| `/kontaktai` (+ `/en/…`) | Contacts from `org_settings` |

Wordmark and contacts everywhere read from `org_settings` (`display_name`, phone, email, address) via one public loader — never i18n strings, never hardcoded. `src/data/nav.ts` gains the real nav; `sitemap[.]xml.ts` gains the listing URLs; each leaf gets its own `head()` via `pageHead`.

## 3. Components

New, under `src/components/public/`:

- `VacancyBoard` — the dark board panel (head, columns, rows, footer), used on the home hero and reused compactly elsewhere.
- `VacancyRow` / `VacancyCard` — one unit line; collapses to a card layout on phones.
- `StatusPill` — available / soon / occupied, the only place status colours appear.
- `UnitFacts` — rooms, m², floor, building, rent, deposit as mono figures.
- `UnitGallery` — plain image carousel from `image_urls`.
- `InquiryForm` — name, phone, email, desired move-in date, message; one date, no ranges, no guest counters.
- `VacancyFilters` — the three tabs plus a text search.

`SiteHeader`, `SiteFooter`, `PageHero`, `LocaleLink`, `Reveal`, `Prose` are re-skinned in place, not rebuilt.

## 4. Data layer

`src/lib/public-vacancies.functions.ts` — public `createServerFn`, **no** auth middleware, using the publishable-key server client:

- `listVacancies()` — selects from `public_vacancies` only, ordered `vacant_now` first then `available_from` ascending. The view is the single source of truth for availability; nothing is recomputed in the UI and no availability flag is ever stored.
- `getVacancy(id)` — one row from the same view; missing id → `notFound()`.
- `getPublicOrg()` — display name, phone, email, address, city from `org_settings`.

The `units` table is never queried publicly (it holds internal notes). Home and listing routes load through the loader + TanStack Query pattern; each route defines `errorComponent` and `notFoundComponent`.

Availability labels derive from the view alone: `vacant_now = true` → "Laisvas dabar"; otherwise `available_from` in the future → "Laisvas nuo {data}".

## 5. Inquiry form and its path

`submitInquiry` — a public server function (unauthenticated, validated with Zod):

- Fields: `name` (required), `phone`, `email` (at least one contact required), `move_in_date`, `message`, `unit_id` (optional — the general form on `/butai` has none).
- Inserts with `status = 'new'`, `source = 'public_site'`, `handled_by`/`converted_lease_id` null — exactly what the existing anon insert policy permits.
- Light spam protection: a hidden honeypot field and a per-IP rate limit, rejecting silently with the same confirmation the visitor would otherwise see.
- Confirmation copy is plain ("Užklausa gauta. Susisieksime telefonu."), with no invented response-time promise.
- **No email is sent in this step** — inquiries surface in the admin list only. The `notifyNewInquiry` toggle already exists in Settings and stays unwired; the email template is added in step 10 with the rest of the notification templates. This is a deliberate, recorded gap, noted in roadmap.md.

## 6. Admin — "Užklausos"

New route `/admin/inquiries` (sidebar entry between Nuomininkai and Sutartys) plus `src/lib/inquiries.functions.ts` (`requireManager`, deletes `requireOwner`):

- List: name, contact, unit (or "bendra užklausa"), desired move-in date, received date, status badge, message preview. Filter by status, search by name/phone/email; newest first, `new` highlighted.
- Detail drawer: full message, contact links (`tel:` / `mailto:`), the unit it named.
- Status change to the exact CHECK values only: `new` / `contacted` / `viewing_scheduled` / `converted` / `dismissed`, from one shared const in `src/lib/rental.ts` mirroring the constraint. Changing status stamps `handled_by`.
- **Convert to draft lease**: opens the existing lease-create dialog prefilled with the inquiry's unit (editable), start date = the desired move-in date, rent/deposit from the unit. It first creates a `tenants` row from the inquiry's name/phone/email (or lets the manager pick an existing tenant), then creates the lease as `draft` — never `active`, never automatic. On success, the inquiry gets `status = 'converted'` and `converted_lease_id`. Existing overlap protection still applies; a rejected overlap leaves the inquiry untouched.

## Technical notes

- Public server functions use the publishable-key client created inside the handler; no admin client, no service-role key on public paths.
- All copy through i18n (`lt` + `en`); a new `public.*` namespace, with unit content itself coming from the database.
- Mobile first: the board collapses to stacked cards below 640px, tap targets ≥44px, forms use `inputmode`/`type=tel`/`type=date`.

## Verification before reporting done

Each of these is reported with its actual output, not a summary:

1. `bunx tsgo --noEmit` — full output.
2. Production build — full tail of the result.
3. SQL: insert an inquiry as `anon` through the public function and read the row back (`status`, `source`, `handled_by`) — actual row printed.
4. SQL: attempt an `anon` select on `rental_inquiries` and on `units` — both must return empty/denied; actual result printed.
5. SQL: `public_vacancies` read as `anon` for a listed unit with `renewal = false` + future `end_date` — printed row showing the exact `available_from`; a `renewal = true` unit must be absent.
6. Browser: `/`, `/butai`, `/butai/$id`, `/en` loaded signed-out — final URLs, console errors (if any), screenshot evidence.
7. Admin: status change and convert-to-draft-lease run end to end — resulting `rental_inquiries` row and `leases` row printed.
8. Test data created for these checks is deleted afterwards, and the deletion is confirmed with a count query.
