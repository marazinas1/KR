# Promptas klientinės dalies (Booking Engine) projektui

Nukopijuokite visą šį tekstą į naujo (klientinio) Lovable projekto pokalbį.

---

## 0. Svarbiausia taisyklė

Šis projektas (Booking Engine) **neturi savo duomenų bazės objektams ar rezervacijoms**.
Visi duomenys gaunami/siunčiami tik per žemiau aprašytą API. Jokia kainodaros ar verslo
logika čia nekuriama — ji visa gyvena Core sistemoje.

## 1. Aplinkos kintamieji (server-side, NE `VITE_`)

```
RENTIVO_API_URL_PROD=https://project--3b144e50-7336-4c5e-a93d-7aeca70328ba.lovable.app/api/public/v1
RENTIVO_API_URL_DEV=https://project--3b144e50-7336-4c5e-a93d-7aeca70328ba-dev.lovable.app/api/public/v1
RENTIVO_API_KEY_PROD=<gaunamas iš Core administratoriaus>
RENTIVO_API_KEY_DEV=<gaunamas iš Core administratoriaus>
```

Gamyboje (publikuotoje versijoje) naudojamos PROD reikšmės, visais kitais atvejais
(peržiūra, lokalus kūrimas) — DEV. Taip testai nekuria realių rezervacijų.

⚠️ Raktas siunčiamas TIK iš serverio pusės (server function / API route), niekada iš
naršyklės kodo — kitaip jis nutekės į client bundle.

## 2. Autentifikacija

Kiekvienoje užklausoje:

```
Authorization: Bearer <API raktas>
```

Be šios antraštės grąžinamas `401 unauthorized`. CORS leidžiamas tik tiems domenams,
kurie nurodyti API rakto įraše Core administratoriaus panelėje.

## 2a. Kalba

Visi turinio endpoint'ai priima neprivalomą kalbos parametrą:

- `GET /properties?language=en`
- `GET /properties/{id}?language=en`
- `GET /bookings/{number}?language=en`
- `POST /quote` — laukas `language` užklausos kūne
- `POST /bookings` — laukas `language` užklausos kūne (išsaugoma rezervacijoje)
- `GET /legal?language=en` (veikia jau seniai)

Nenurodžius, naudojama objekto numatytoji kalba. Atsakymo laukų pavadinimai
nesikeičia — `name` lieka `name`, tik turinys ateina prašyta kalba. Jei kurio
nors lauko vertimo nėra, grąžinamas tekstas originalo kalba (niekada ne tuščias).

SVARBU dėl papildomų paslaugų: `POST /quote` ir `POST /bookings` `extras[].name`
lauke galima siųsti ir originalų, ir išverstą pavadinimą — Core atpažįsta abu.
Rezervacijoje ir administratoriaus panelėje visada saugomas originalus pavadinimas.

## 3. Endpoint'ai

### GET `/properties`

Aktyvių objektų sąrašas. Rikiavimas: `sort_order`, po to `created_at`. Grąžinami tik
viešai saugūs laukai (be vidinių pastabų, savikainos, iCal nuorodų).

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "property_type": "string",
      "description": "string",
      "city": "string",
      "country": "LT",
      "address": "string",
      "area_m2": 45,
      "max_guests": 4,
      "beds": 2,
      "rooms": {},
      "amenities": ["wifi", "parking"],
      "price_per_night": 89.0,
      "price_tiers": [],
      "extra_services": [{ "name": "...", "calc": "per_person", "pricePerDay": 12 }],
      "cover_image_url": "string|null",
      "image_urls": ["..."],
      "category": "string"
    }
  ]
}
```

Užimtų datų šis sąrašas negrąžina — jos yra `/properties/:id` ir `/availability`.

### GET `/properties/:id`

Tas pats laukų rinkinys + `occupied: [{ date_from, date_to }]`.
`404 not_found`, jei objektas neaktyvus arba neegzistuoja. `id` turi būti UUID.

### GET `/availability?property_id=&from=&to=`

- `property_id` (UUID, privalomas)
- `from`, `to` (`YYYY-MM-DD`, nebūtini)

```json
{
  "data": {
    "property_id": "uuid",
    "occupied": [{ "date_from": "2026-08-10", "date_to": "2026-08-14" }],
    "available": true
  }
}
```

`available` yra `null`, jei `from`/`to` nenurodyti.

### POST `/quote`

Kainos paskaičiavimas BE rezervacijos sukūrimo.

**Body:**

```json
{
  "property_id": "uuid",
  "date_from": "2026-08-10",
  "date_to": "2026-08-14",
  "adults": 2,
  "children": 0,
  "infants": 0,
  "extras": [{ "name": "Pusryčiai" }]
}
```

`adults` (1–50, numatyta 1), `children`/`infants` (0–50, numatyta 0), `extras` (iki 20 įrašų,
siunčiamas tik `name`).

**Atsakymas `200`:**

```json
{
  "data": {
    "nights": 4,
    "nightly_rate": 89,
    "stay_total": 356,
    "extras": [
      { "name": "Pusryčiai", "calc": "per_person", "pricePerDay": 12, "amount": 96 }
    ],
    "extras_total": 96,
    "total": 452,
    "currency": "EUR",
    "available": true
  }
}
```

Dėmesio: laukas vadinasi `nightly_rate` (ne `price_per_night`).
`calc` gali būti tik `per_person`, `per_child` arba `flat_per_day`; dienų skaičius jau
įskaičiuotas į `amount`, o `pricePerDay` yra vieneto kaina už dieną.

Klaidos: `400 bad_request` (netinkami duomenys / `date_to <= date_from`),
`400 too_many_guests`, `404 not_found`. Rate limit: **120 užklausų / 10 min**.

### POST `/bookings`

Rezervacijos sukūrimas. Statusas iš karto `pending`, `payment_status: unpaid`,
`expires_at` = +24 val. `source` Core pusėje visada įrašomas kaip `website`.

**Body:** kaip `/quote` + `customer_name` (2–200), `customer_email` (galiojantis, iki 255),
`customer_phone` (5–50), `bic` (nebūtinas, iki 20 simbolių).

Papildomai (juridinis asmuo): `is_company` (boolean, numatyta `false`). Kai `true`,
PRIVALOMI: `company_name` (iki 200), `company_code` (iki 50), `company_address` (iki 300).
Nebūtinas: `company_vat_code` (iki 50).

**Atsakymas `201`:**

```json
{
  "data": {
    "booking_number": "string",
    "status": "pending",
    "date_from": "2026-08-10",
    "date_to": "2026-08-14",
    "total_amount": 452.0,
    "currency": "EUR",
    "expires_at": "2026-08-05T12:00:00.000Z",
    "nights": 4,
    "extras": [
      { "name": "Pusryčiai", "calc": "per_person", "pricePerDay": 12, "amount": 96 }
    ]
  }
}
```

Klaidos: `400 bad_request`, `400 too_many_guests`, `404 not_found`,
`409 dates_unavailable`. Rate limit: **10 užklausų / 10 min** (pagal IP + klientą).

### GET `/payment-details`

Banko pavedimo rekvizitai padėkos puslapiui.

```json
{
  "data": {
    "iban": "LT12 3456 7890 1234 5678",
    "bank_name": "Swedbank",
    "beneficiary_name": "UAB Pavyzdys",
    "currency": "EUR"
  }
}
```

### GET `/bookings/:booking_number?email=`

Rezervacijos būsenos patikra. Reikalauja to paties el. pašto, kuriuo rezervuota
(case-insensitive), kitaip `404 not_found`.

**Atsakymas `200`:** `booking_number, property_id, date_from, date_to, status,
payment_status, total_amount, currency, extras, extras_total`.
Rate limit: **60 užklausų / 10 min**.

### GET `/legal?kind=&language=`

Teisinio turinio (paslaugų teikimo taisyklės, privatumo politika) atidavimas.
Turinys valdomas Core administravimo panelėje.

**Parametrai:** `kind` — `rental` arba `privacy` (privalomas);
`language` — `lt` arba `en` (nenurodžius — `lt`).

**Atsakymas `200`:**

```json
{
  "data": {
    "kind": "rental",
    "language": "lt",
    "name": "Paslaugų teikimo taisyklės",
    "content": "<h2>...</h2>",
    "updated_at": "2026-08-05T07:00:00.000Z"
  }
}
```

`content` yra HTML — klientinė dalis privalo jį sanitizuoti (pvz. `DOMPurify.sanitize()`)
prieš `dangerouslySetInnerHTML`. Jei aktyvaus šablono nėra — `404 not_found`.
Rate limit netaikomas.

## 4. Klaidų formatas (visi endpoint'ai)

```json
{ "error": { "code": "bad_request", "message": "..." } }
```

Kodai: `unauthorized` (401), `forbidden_origin` (403), `not_found` (404),
`dates_unavailable` (409), `too_many_guests` (400), `bad_request` (400),
`rate_limited` (429).

## 5. Rekomenduojamas srautas

```text
Objektų sąrašas (GET /properties)
  -> Objekto puslapis (GET /properties/:id, užimtos datos kalendoriuje)
  -> Datų/svečių pasirinkimas -> POST /quote (kaina realiu laiku)
  -> Kontaktų forma + banko pasirinkimas -> POST /bookings
  -> Padėkos puslapis: booking_number, total_amount + GET /payment-details
  -> (vėliau) GET /bookings/:number?email= — būsenos patikros puslapis
```

## 6. Pavyzdinis server-side wrapper (TypeScript)

```typescript
// server-only failas, pvz. src/lib/rentivo-api.server.ts
const IS_PROD = process.env.NODE_ENV === "production";
const BASE_URL = (IS_PROD ? process.env.RENTIVO_API_URL_PROD : process.env.RENTIVO_API_URL_DEV)!;
const API_KEY = (IS_PROD ? process.env.RENTIVO_API_KEY_PROD : process.env.RENTIVO_API_KEY_DEV)!;

async function rentivoFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      ...(init?.headers ?? {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.code ?? "unknown_error");
  return json.data;
}

export const listProperties = () => rentivoFetch("/properties");
export const getProperty = (id: string) => rentivoFetch(`/properties/${id}`);
export const getQuote = (body: unknown) =>
  rentivoFetch("/quote", { method: "POST", body: JSON.stringify(body) });
export const createBooking = (body: unknown) =>
  rentivoFetch("/bookings", { method: "POST", body: JSON.stringify(body) });
export const getPaymentDetails = () => rentivoFetch("/payment-details");
export const getBookingStatus = (bookingNumber: string, email: string) =>
  rentivoFetch(`/bookings/${bookingNumber}?email=${encodeURIComponent(email)}`);
export const getLegal = (kind: "rental" | "privacy", language: "lt" | "en" = "lt") =>
  rentivoFetch(`/legal?kind=${kind}&language=${language}`);
```

## 7. Ko klientinė dalis NEDARO

- Nesaugo objektų/rezervacijų savo DB.
- Neskaičiuoja kainų pati — visada per `/quote` arba `/bookings` atsakymą.
- Nekeičia rezervacijų statusų (tai daroma Core administravimo panelėje).
- Neinicijuoja mokėjimo — apmokama pavedimu pagal `/payment-details` rekvizitus.
