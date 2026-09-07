# Kambarinių (housekeeping) API sluoksnis

Naujas, atskiras nuo `/api/public/v1/*` sluoksnis `/api/staff/v1/*`, skirtas būsimai kambarinių programėlei. Esamos rezervacijų/objektų logikos, RLS taisyklių ir viešo API nekeičiame.

## 1. Nauja lentelė „kambarių švaros būsena"

Lentelė `room_status` — po vieną įrašą kiekvienam objektui:
- būsena: švaru / reikia tvarkyti / tvarkoma / problema
- pastaba, priskirta kambarinė, priskyrimo laikas, kas paskutinis keitė
- automatinis `updated_at` atnaujinimas
- pradiniai įrašai sukuriami visiems aktyviems objektams

Prieiga: kambarinė **neturi jokios tiesioginės DB prieigos** — tik per naują API. Administratorius gali skaityti/valdyti tiesiogiai (per esamą rolių patikrą), jei ateityje norėsis rodyti tai admin skydelyje.

## 2. Bendras autentifikacijos sluoksnis

`src/lib/staff-api-auth.server.ts`:
- tikrina `Authorization: Bearer <JWT>` per Supabase `getClaims`
- patikrina, ar vartotojas turi `admin` arba `housekeeper` rolę (kitaip 403)
- prideda CORS antraštes pagal `STAFF_ALLOWED_ORIGINS` sąrašą
- vienodas klaidų formatas, klaidų tekstai neatskleidžia DB detalių

## 3. Keturi endpoint'ai

| Metodas | Kelias | Paskirtis |
|---|---|---|
| GET | `/api/staff/v1/rooms` | Kambarių sąrašas: šiandienos atvykimas/išvykimas/užimtumas, artimiausios datos, švaros būsena, priskyrimas |
| POST | `/api/staff/v1/rooms/:id/status` | Keisti būseną (+ pastaba) |
| POST | `/api/staff/v1/rooms/:id/assign` | Priskirti kambarį sau (409, jei jau priskirtas kitam) |
| POST | `/api/staff/v1/rooms/:id/unassign` | Atsisakyti priskyrimo (403, jei priskirta ne jums) |

Visi skaičiavimai daromi serveryje; atsakyme **nėra jokių svečio duomenų** (vardo, el. pašto, telefono, sumų) — tik datų požymiai. Kiekvienas endpoint'as turi `OPTIONS` (CORS preflight).

## 4. Leidžiami domenai

Naujas aplinkos kintamasis `STAFF_ALLOWED_ORIGINS` (kableliais atskirtų domenų sąrašas). Kol kambarinių programėlės domenas nežinomas — paliekamas tuščias; tikroji apsauga yra JWT + rolės patikra, CORS tik papildomai riboja naršyklę.

## Techninės detalės

- Migracija: `public.room_status` su `UNIQUE(property_id)`, `CHECK` būsenoms, `ON DELETE CASCADE`; trigeris `touch_room_status_updated_at`; `REVOKE ALL FROM anon, authenticated`, `GRANT ALL TO service_role`; RLS įjungta su admin politika + `GRANT SELECT, INSERT, UPDATE TO authenticated` (politika praleidžia tik `has_role(auth.uid(),'admin')`).
- Užimtumas skaičiuojamas iš `bookings` su statusais `confirmed` ir `blocked_external` (`date_to >= šiandien`).
- Rašymui naudojamas `supabaseAdmin`, importuojamas **handler'io viduje** (`await import`), kad server-only modulis nepatektų į kliento bundle.
- Įvestis validuojama su Zod (`status` enum, `note` iki 500 simbolių).
- Failai: `src/lib/staff-api-auth.server.ts`, `src/routes/api/staff/v1/rooms.ts`, `rooms.$id.status.ts`, `rooms.$id.assign.ts`, `rooms.$id.unassign.ts`. Perpanaudojamos esamos `apiJson`, `apiError`, `corsHeaders`, `preflight` iš `api-auth.server.ts`.

## Patikros

- Be `Authorization` → 401; su bet kokio vartotojo be rolės JWT → 403; su `housekeeper` JWT → 200 be svečių PII.
- `assign` du kartus skirtingais vartotojais → antrasis 409; `unassign` svetimam kambariui → 403.
- Tiesioginis `room_status` skaitymas su `housekeeper` JWT apeinant API → tuščia/klaida.
