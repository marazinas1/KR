# Core išvalymas: paliekame tik admin + API sluoksnį

Senoji vieša rezervacijų svetainė šalinama iš šio projekto. Lieka administravimo sistema, verslo logika, DB ir viešas `/api/public/v1/*` API, per kurį jungsis nauja klientinė dalis.

## 1. Naujas API endpointas teisiniam turiniui (daroma pirma)

`src/routes/api/public/v1/legal.ts` — pagal `availability.ts` modelį (`withApiAuth`, `apiJson`, `apiError`, `OPTIONS` preflight).

- `GET /api/public/v1/legal?kind=rental|privacy&language=lt|en`
- Zod: `kind` privalomas enum, `language` enum su default `lt`
- Užklausa į `contract_templates`: `id, name, content, language, kind, updated_at`, filtras `is_active = true`, `order by updated_at desc limit 1`, anon (publishable) klientas
- Atsakymas `{ data: { kind, language, name, content, updated_at } }`, arba 404 `not_found`
- Be rate limit

Po sukūrimo — patikra su galiojančiu API raktu abiem `kind` reikšmėms ir abiem kalboms.

`docs/klientines-dalies-promptas.md` papildomas šio endpointo aprašymu (užklausa, parametrai, atsakymo forma, pastaba, kad klientinė dalis pati sanitizuoja HTML su DOMPurify).

## 2. Šalinami maršrutai

- `src/routes/index.tsx`
- `src/routes/offers.tsx`
- `src/routes/about.tsx`
- `src/routes/contact.tsx`
- `src/routes/faq.tsx`
- `src/routes/properties.$id.tsx`
- `src/routes/paslaugu-taisykles.tsx`, `src/routes/privatumo-politika.tsx` (tik po 1 punkto)
- `src/routes/api/public/booking-submit.ts` (pakeičia `POST /api/public/v1/bookings`)
- `src/routes/api/public/track.ts` (`page_views` lentelė DB lieka nepaliesta)

## 3. Šalinami komponentai

`SiteHeader.tsx`, `SiteFooter.tsx`, `LanguageSwitcher.tsx`, `PageTracker.tsx`.

`src/routes/__root.tsx`: pašalinamas `PageTracker` importas ir `<PageTracker />`. Root 404/error blokuose esančios „Go home“ nuorodos į `/` lieka veikti per naują šaknies peradresavimą.

Prieš kiekvieną trynimą — paieška visame projekte, ar niekas kitas neimportuoja.

## 4. Papildomas apsivalymas (po patikros, kad neimportuojami)

`src/components/BankLogo.tsx`, `src/components/AvailabilityCalendar.tsx`, `src/components/AvailabilityDatePicker.tsx`, `public/cars/**`.

Patikrinta: šiuo metu šie trys komponentai neturi importų iš jokio kito failo.

Nešalinama: `DatePicker`, `GuestsPicker`, `NumberInput`, `TimeInput`, `DateRangePicker` — naudojami admin panelėje.

## 5. Šaknies kelias

Naujas `src/routes/index.tsx`, kurio `beforeLoad` daro `redirect({ to: "/auth" })` — Core įėjimo taškas yra prisijungimo forma.

## 6. Patikros po pakeitimų

- Maršrutų medis persigeneruoja be ištrintų puslapių, preview pakyla be klaidų
- Admin panelė (rezervacijos, objektai, nustatymai, turinys, sutartys) veikia nepakitusi
- `/api/public/v1/*` (properties, availability, quote, bookings, payment-details, legal) atsako kaip anksčiau
- `/` peradresuoja į `/auth`

## Nepaliečiama

`src/routes/_authenticated/**`, `auth.tsx`, `reset-password.tsx`, `src/routes/api/public/v1/**`, `ical-sync.ts`, `notifications-cron.ts`, `src/lib/**` verslo logika, `src/components/admin/**`, `src/components/ui/**`, DB schema.

## Vertimai

`src/i18n/locales/{lt,en}.json` nenaudojami raktai (`home.*`, `offers.*`, `legal.*` ir pan.) šįkart nešalinami — palieku atskiram žingsniui, kad šis pakeitimas liktų siauras ir saugus.