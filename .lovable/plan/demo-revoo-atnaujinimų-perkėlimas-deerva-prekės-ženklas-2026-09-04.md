# Demo-Revoo atnaujinimų perkėlimas + Deerva prekės ženklas

Perkeliu visą Demo-Revoo (GitHub `revoo-demo`) kodo būseną į šį projektą ir pakeičiu prekės ženklą į Deerva.

## Kas bus perkelta

**Nauja viešoji svetainės dalis**
- Naujas pradinis puslapis (`HeroV2`, `home-v2` maršrutai LT ir EN).
- Paieškos juosta (`components/search`: datų intervalas, svečiai, `SearchBar`).
- Naujas „Laisvi kambariai“ puslapis (`/laisvi-kambariai`, `/en/laisvi-kambariai`).
- Atsiliepimai ir reitingai (`Testimonials`, `RatingsAndTestimonials`) vietoje senojo `Ratings`.
- Objektų nuotraukų galerija (`PropertyGallery`), atnaujintas kalendorius, kortelių karuselė, atnaujintas apartamentų zoom.
- Atnaujinti beveik visi `components/site`, `components/stay`, `components/home`, `pages/*`, `styles.css`, navigacija ir LT/EN tekstai.

**AI asistentas (admin)**
- `components/admin/assistant/AssistantWidget.tsx`, `lib/assistant*.ts`, `routes/api/assistant/*`.
- Nauja duomenų bazės lentelė `assistant_messages` (su GRANT ir RLS – kiekvienas mato tik savo žinutes). Naudoja jau esamą `LOVABLE_API_KEY`.

**Smulkūs pataisymai**
- `rentivo-api.server.ts` / `rentivo.functions.ts`, `availability.server.ts`, `housekeeping.functions.ts`, viešojo API maršrutai, `app-url.server.ts`, `property-view.ts`, `content-templates.ts`.

## Prekės ženklas: Deerva

- `PLATFORM_NAME` = `Deerva` (Demo-Revoo turi „Revoo“, dabar čia „StageHomy“).
- Iš projekto „Deerva“ perkeliu `logo.png` ir `favicon.png`; logotipas rodomas prisijungimo lange, `favicon` – naršyklės kortelėje.
- Prisijungimo lango tekstas – „Deerva“.

## Ko nekeisiu

- Šio projekto backend'o nustatymų: `.env`, `supabase/config.toml` (lieka šio projekto duomenų bazė), `src/integrations/supabase/types.ts` generuojamas iš šios bazės.
- Esamų `public/images`, `robots.txt`, `AGENTS.md`.
- „noindex, nofollow“ žymos šakniniame maršrute (demo projektas neturi būti indeksuojamas); iš Demo-Revoo neperkeliu Paysera patvirtinimo žymos.

## Techninės detalės

- Sinchronizuoju `src/` failus iš `revoo-demo` HEAD (2026-09-04), išskyrus išvardytas išimtis; `routeTree.gen.ts` persigeneruoja pats.
- Migracija `20260903074244_...sql` (assistant_messages) pritaikoma per migracijos įrankį byte-for-byte.
- `@supabase/supabase-js` lieka esamos versijos (naujesnė nei repo).
- Po perkėlimo paleidžiu typecheck + build ir patikrinu pagrindinius puslapius (`/`, `/en`, `/laisvi-kambariai`, `/auth`, `/admin`).
