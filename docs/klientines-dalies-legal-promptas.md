# Promptas klientinei daliai: privatumo politika ir paslaugų teikimo taisyklės

Nukopijuokite visą tekstą į klientinio (Booking Engine) projekto pokalbį.

---

Sukurk du teisinio turinio puslapius, kurių tekstas NĖRA saugomas šiame projekte —
jis paimamas iš Core sistemos per API.

## 1. Duomenų šaltinis

Endpoint (Core): `GET {RENTIVO_API_URL}/legal?kind=<rental|privacy>&language=<lt|en>`

- `kind=rental` — paslaugų teikimo taisyklės / nuomos sutarties sąlygos
- `kind=privacy` — privatumo politika
- `language` — `lt` arba `en` (nenurodžius — `lt`)
- Antraštė: `Authorization: Bearer <RENTIVO_API_KEY>` (privaloma)

Atsakymas `200`:

```json
{
  "data": {
    "kind": "rental",
    "language": "lt",
    "name": "Paslaugų teikimo taisyklės",
    "content": "<h2>...</h2><p>...</p>",
    "updated_at": "2026-08-05T07:00:00.000Z"
  }
}
```

Klaidos: `401 unauthorized`, `404 not_found` (nėra aktyvaus šablono),
formatas visada `{ "error": { "code": "...", "message": "..." } }`.
Rate limit šiam endpointui netaikomas.

## 2. Saugumo reikalavimai (privaloma)

- API raktas naudojamas TIK serverio pusėje (server function / API route).
  Niekada `VITE_` prefikso, niekada fetch iš naršyklės su raktu.
- `content` yra HTML iš Core. Prieš `dangerouslySetInnerHTML` BŪTINA sanitizuoti
  (pvz. `DOMPurify.sanitize(html)`), leidžiant tik tekstinius/sąrašų/nuorodų tagus.

## 3. Aplinkos kintamieji (server-side)

```
RENTIVO_API_URL_PROD=https://project--3b144e50-7336-4c5e-a93d-7aeca70328ba.lovable.app/api/public/v1
RENTIVO_API_URL_DEV=https://project--3b144e50-7336-4c5e-a93d-7aeca70328ba-dev.lovable.app/api/public/v1
RENTIVO_API_KEY_PROD=<iš Core administratoriaus>
RENTIVO_API_KEY_DEV=<iš Core administratoriaus>
```

Publikuotoje versijoje — PROD, peržiūroje/lokaliai — DEV.

## 4. Ką sukurti

1. Serverinė funkcija `getLegal({ kind, language })`, kviečianti Core `/legal`.
   Rezultatą kešuoti ~5 min (arba `staleTime: 5 * 60 * 1000`).
2. Puslapis `/taisykles` (`kind=rental`) — antraštė iš `name`, turinys iš `content`,
   apačioje „Atnaujinta: {updated_at}".
3. Puslapis `/privatumo-politika` (`kind=privacy`) — analogiškai.
4. Abu puslapiai turi savo `head()` metaduomenis (unikalus title, description,
   `og:title`, `og:description`, canonical) ir `robots: index,follow`.
5. Poraštėje (footer) — nuorodos į abu puslapius.
6. Rezervacijos formoje — privalomas checkbox:
   „Susipažinau ir sutinku su [Paslaugų teikimo taisyklėmis] ir [Privatumo politika]",
   nuorodos atsidaro tuose puslapiuose (arba modaliniame lange su tuo pačiu turiniu).
   Be pažymėto checkbox `POST /bookings` nekviečiamas.
7. Jei API grąžina `404 not_found` — parodyti draugišką pranešimą
   („Turinys šiuo metu neprieinamas"), o ne klaidos ekraną. Puslapis neturi lūžti.

## 5. Ko NEDARYTI

- Nekopijuoti teisinio teksto į projekto kodą ar DB — jis visada iš Core.
- Neredaguoti turinio klientinėje dalyje (redaguojama tik Core panelėje
  „Sutartys / Politikos").
- Nerodyti nesanitizuoto HTML.
