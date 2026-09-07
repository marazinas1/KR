# Viešas API sluoksnis klientinei daliai (kita Lovable paskyra)

Duomenų bazė lieka viena — šiame projekte. Kitos paskyros klientinė dalis nieko nesaugo pati, o kviečia šio projekto `/api/public/*` endpointus per HTTPS su API raktu.

## Ką kursime

Nauji endpointai po `/api/public/v1/`:

| Metodas | Kelias | Paskirtis |
|---|---|---|
| GET | `/api/public/v1/properties` | Aktyvių objektų sąrašas (kaina, tipas, kambariai, svečiai, patogumai, nuotraukos, papildomos paslaugos) |
| GET | `/api/public/v1/properties/:id` | Vieno objekto detalės |
| GET | `/api/public/v1/availability?property_id=&from=&to=` | Užimtos datos / ar laisva |
| POST | `/api/public/v1/quote` | Kainos skaičiavimas (sezoninė kainodara + papildomos paslaugos), be įrašo į DB |
| POST | `/api/public/v1/bookings` | Rezervacijos pateikimas (ta pati logika kaip dabartinis `booking-submit`) |
| GET | `/api/public/v1/bookings/:booking_number` | Rezervacijos būsenos patikra (tik su el. paštu kaip patvirtinimu) |

Esamas `/api/public/booking-submit` lieka veikti (dabartinė klientinė dalis nesulūžta).

## Saugumas

- Naujas `api_clients` lentelė: pavadinimas, rakto hash'as (SHA-256), aktyvumas, leidžiami domenai, sukūrimo data. Grynas raktas rodomas tik vieną kartą kuriant.
- Kiekvienas užklausos apdorojimas tikrina `Authorization: Bearer <raktas>` (hash palyginimas). Be rakto — 401.
- Rašymo endpointai (`/bookings`) papildomai turi rate limit pagal IP + klientą (pvz. 10 užklausų / 10 min), įrašai į `api_request_log`.
- CORS: leidžiami tik tie domenai, kurie nurodyti to rakto įraše; `OPTIONS` grąžina 204.
- Atsakymuose — jokių DB klaidų tekstų, jokių kitų klientų asmens duomenų. Objektų sąrašas grąžina tik viešus laukus (be vidinių pastabų, savikainos, iCal URL).
- Rašymui naudojamas `supabaseAdmin` tik po rakto patikros; skaitymui — publishable klientas su esamomis RLS taisyklėmis.
- Validacija su Zod visiems body ir query parametrams.

## Admin pusė

Skiltyje „Bendrieji nustatymai" → „Integracijos" atsiranda kortelė **API prieiga**:
- API raktų sąrašas (pavadinimas, sukurta, paskutinis naudojimas, būsena)
- „Sukurti raktą" (įvedamas pavadinimas ir leidžiami domenai) — raktas parodomas vieną kartą
- Rakto išjungimas / ištrynimas
- Rodoma bazinė API nuoroda, kurią reikia įklijuoti kitame projekte

## Kaip prijungsite kitą projektą

Kitame projekte reikės tik dviejų dalykų:
1. Bazinis URL: `https://project--3b144e50-7336-4c5e-a93d-7aeca70328ba.lovable.app/api/public/v1`
2. API raktas kaip secret (`RENTIVO_API_KEY`), siunčiamas `Authorization: Bearer ...` iš serverio pusės (ne iš naršyklės, kad raktas neišsiviešintų).

Kartu paruošiu trumpą API dokumentaciją (endpointai, pavyzdiniai request/response JSON), kurią galėsite tiesiog perduoti kitam projektui.

## Techninės detalės

- Migracija: `public.api_clients` (id, name, key_hash, allowed_origins text[], is_active, last_used_at, created_at) ir `public.api_request_log` (id, api_client_id, path, ip, created_at) — abi tik `service_role`, be `anon`/`authenticated` prieigos; skaitymas admin UI per serverinę funkciją su `has_role(auth.uid(),'admin')`.
- Bendra pagalbinė `src/lib/api-auth.server.ts`: rakto tikrinimas, CORS antraštės, rate limit, vienodas klaidų formatas.
- Kainodaros/užimtumo logika iškeliama į `src/lib/booking-pricing.ts`, kad ją naudotų ir `quote`, ir `bookings` endpointai, ir admin forma — vienas skaičiavimo šaltinis.
- Endpointai versijuojami (`v1`), kad vėliau būtų galima keisti nelaužant klientinės dalies.
