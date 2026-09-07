# Admin panelės (Core) sujungimas su išorine klientine dalimi

API sluoksnis šiame projekte jau paruoštas. Liko: sukurti raktą, publikuoti ir aprašyti, ką turi daryti kitos paskyros klientinė dalis.

## 1 dalis — ką darote Jūs šiame projekte

1. Publikuokite projektą (kad API adresas veiktų viešai).
2. Admin > Bendrieji nustatymai > **API prieiga**:
   - Sukurkite raktą, pvz. „Klientinė svetainė".
   - Laukelyje „Leidžiami domenai" įrašykite klientinės svetainės adresą, pvz. `https://klientas.lovable.app` (kableliais galima kelis; be jų naršyklės užklausos iš to domeno bus blokuojamos).
   - Nukopijuokite raktą (rodomas tik vieną kartą) ir perduokite jį klientinės dalies savininkui saugiu kanalu.
3. Bazinis API adresas, kurį perduodate: `https://<jūsų-domenas>/api/public/v1`.

## 2 dalis — ką turi padaryti klientinė dalis

1. Įsirašyti du dalykus kaip **serverio pusės** paslaptis (ne `VITE_`):
   - `RENTIVO_API_URL` = bazinis adresas
   - `RENTIVO_API_KEY` = raktas
2. Visus kvietimus daryti **iš serverio** (server function / API route), ne iš naršyklės — kad raktas nepatektų į klientinį kodą.
3. Prie kiekvienos užklausos pridėti antraštę: `Authorization: Bearer <RENTIVO_API_KEY>`.

### Endpointai

| Metodas | Kelias | Paskirtis |
|---|---|---|
| GET | `/properties` | Aktyvių objektų sąrašas (kainos, patogumai, nuotraukos, papildomos paslaugos) |
| GET | `/properties/{id}` | Vieno objekto detalės + užimtos datos |
| GET | `/availability?property_id=&from=&to=` | Užimti intervalai; su `from`/`to` grąžina `available: true/false` |
| POST | `/quote` | Kainos skaičiavimas be rezervacijos |
| POST | `/bookings` | Rezervacijos sukūrimas (statusas „Laukiama apmokėjimo") |
| GET | `/bookings/{booking_number}?email=` | Rezervacijos būsenos patikra (reikia to paties el. pašto) |

### Rezervacijos pateikimo laukai (POST /bookings)

`property_id`, `date_from`, `date_to` (YYYY-MM-DD), `adults`, `children`, `infants`,
`extras: [{ name }]`, `customer_name`, `customer_email`, `customer_phone`, `bic` (nebūtina).

Atsakymas: `booking_number`, `status`, `total_amount`, `expires_at` (rezervacija galioja 24 val.).

### Klientinės dalies srautas

```text
Objektų sąrašas -> Objekto puslapis (+ užimtos datos kalendoriuje)
   -> Datų ir svečių pasirinkimas -> POST /quote (rodoma kaina)
   -> Kontaktų forma + banko pasirinkimas -> POST /bookings
   -> Padėkos puslapis: rezervacijos nr., suma, pavedimo rekvizitai
```

### Ko klientinė dalis NEDARO

- Neturi savo duomenų bazės objektams ar rezervacijoms — visa duomenų bazė lieka čia.
- Neinicijuoja mokėjimo (mokama pavedimu; klientas pasirenka banką, rekvizitai rodomi po rezervacijos).
- Nekeičia rezervacijų statusų — tai daroma admin panelėje.

### Klaidų kodai, kuriuos verta apdoroti

`401 unauthorized` (blogas raktas), `403 forbidden_origin` (domenas neįtrauktas),
`409 dates_unavailable` (datos užimtos), `429 rate_limited` (per daug užklausų),
`400 bad_request` / `too_many_guests`.

## Ką galiu padaryti aš (pasirinkite)

- Paruošti kopijuojamą **integracijos instrukciją (prompt) kitos paskyros projektui** su tiksliais laukais ir pavyzdiniu kodu.
- Pridėti admin pusėje API užklausų žurnalo peržiūrą (kas ir kada kvietė).
- Pridėti webhook'ą, kad klientinė dalis gautų pranešimą pasikeitus rezervacijos statusui.

## Techninės pastabos

- Autorizacija: SHA-256 hash'uoti Bearer raktai lentelėje `api_clients`; CORS leidžiamas tik pagal rakto `allowed_origins`.
- Dažnio ribojimas: 120/10 min `/quote`, 10/10 min `/bookings`, 60/10 min būsenos patikrai.
- Kainos skaičiuojamos serverio pusėje (`booking-pricing.ts`) — klientinė dalis kainų neskaičiuoja pati.
- Rezervacijų persidengimas tikrinamas prieš įrašymą; kūdikiai (`infants`) neapmokestinami papildomose paslaugose.