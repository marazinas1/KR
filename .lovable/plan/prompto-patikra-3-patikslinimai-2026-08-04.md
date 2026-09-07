# Prompto patikra + 3 patikslinimai

Peržiūrėjau prompt'ą prieš realų kodą (`src/routes/api/public/v1/*`, `src/lib/api-auth.server.ts`, `src/lib/booking-pricing.ts`). **Beveik viskas teisinga** — endpointai, laukai, klaidų kodai, rate limitai (quote 120 / bookings 10 / booking status 60 per 10 min), 24 val. `expires_at`, el. pašto patikra prie būsenos — visa tai atitinka kodą.

Netikslumai / trūkumai, kuriuos verta ištaisyti prieš perduodant:

## 1. Palikti dvi aplinkas (rekomenduoju)
Prompte tik `RENTIVO_API_URL` / `RENTIVO_API_KEY`. Rekomenduoju grąžinti dviejų aplinkų variantą, kaip buvo sutarta: taip klientinė dalis gali testuoti nepaliesdama realių rezervacijų, o PROD raktą galima išjungti atskirai nuo DEV.

```
RENTIVO_API_URL_PROD=https://project--3b144e50-7336-4c5e-a93d-7aeca70328ba.lovable.app/api/public/v1
RENTIVO_API_URL_DEV =https://project--3b144e50-7336-4c5e-a93d-7aeca70328ba-dev.lovable.app/api/public/v1
RENTIVO_API_KEY_PROD=...
RENTIVO_API_KEY_DEV =...
```
ir wrapperyje pasirinkti pagal aplinką (gamyboje — PROD, kitur — DEV).

Vieno adreso variantas priimtinas tik jei klientinė dalis niekada netestuos su gyvais duomenimis — tada mažiau kintamųjų, bet kiekvienas testas kuria realią rezervaciją Core sistemoje.

## 2. `/quote` atsakymo laukai neaprašyti
Kodas grąžina konkrečią struktūrą — verta ją įrašyti, kad klientinė dalis nespėliotų:

Laukas vadinasi **`nightly_rate`**, ne `price_per_night` (žr. `QuoteResult` faile `booking-pricing.ts`) — ieškant `price_per_night` bus gauta `undefined`.

```json
{ "data": { "nights": 4, "nightly_rate": 89, "stay_total": 356,
  "extras": [{ "name": "Pusryčiai", "calc": "per_person",
               "pricePerDay": 12, "amount": 96 }],
  "extras_total": 96, "total": 452,
  "currency": "EUR", "available": true } }
```
`extras` elementai turi pilną struktūrą `{ name, calc, pricePerDay, amount }` — tiek `/quote`, tiek `/bookings` atsakymuose. Į užklausos body siunčiama tik `{ "name": "..." }`.

Galimos `calc` reikšmės (tik šios trys): `per_person`, `per_child`, `flat_per_day`. Dienų skaičius jau įskaičiuotas į `amount`, o `pricePerDay` yra vieneto kaina už dieną.

## 3. Mokėjimo rekvizitai
Pastaba prompte teisinga: tokio endpointo nėra. Duomenys sistemoje jau yra — „Bendrieji nustatymai“ turi `iban` ir `bank_name` laukus. Rekomenduoju Core pusėje pridėti `GET /v1/payment-details`, grąžinantį tik `iban`, `bank_name`, gavėjo pavadinimą — tada klientinė dalis padėkos puslapyje nerodys statiškai įrašytų rekvizitų.

## Ką siūlau daryti
1. Atnaujinti perduodamą prompt'ą (1 ir 2 punktai) — parengsiu galutinę versiją kopijavimui.
2. Pasirinktinai: sukurti `GET /api/public/v1/payment-details` endpointą (ta pati Bearer autentifikacija, CORS ir klaidų formatas kaip kitur; grąžina tik viešai saugius banko rekvizitus iš globalių nustatymų) ir įtraukti jį į prompt'ą.

## Smulkios pastabos
- `bookings.extras` atsakyme grąžinamas su suskaičiuotomis sumomis (ne tik `name`).
- `POST /bookings` `source` visada įrašomas kaip `website` — klientinė dalis jo nenustato.
- `/properties` sąrašas užimtų datų negrąžina; jos yra tik `/properties/:id` (`occupied`) ir `/availability`.
