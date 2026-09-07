# API kortelės patikslinimas (PROD / DEV)

## Problema
Kortelėje trys adresai išvardyti be aiškaus ryšio su kintamaisiais, kuriuos reikia perduoti klientinei daliai. Dėl to lengva DEV vietoje įrašyti gamybinį adresą.

## Ką pakeisiu
Nustatymai → API prieiga kortelėje adresų blokas pergrupuojamas į du aiškius laukus:

1. `RENTIVO_API_URL_PROD` — `https://dharmastay.lovable.app/api/public/v1`
   - po juo maža pastaba: alternatyva (stabilus techninis adresas) `https://project--3b144e50-...lovable.app/api/public/v1`, su savo kopijavimo mygtuku.
2. `RENTIVO_API_URL_DEV` — `https://project--3b144e50-...-dev.lovable.app/api/public/v1`
   - pastaba: „privalo turėti `-dev`; be jo testai rašys į realius duomenis".

Papildomai:
- Kiekvienas adresas turi kopijavimo mygtuką (esama copy logika lieka).
- Kintamųjų pavadinimai rodomi kaip antraštės (`RENTIVO_API_URL_PROD` / `RENTIVO_API_URL_DEV`), kad būtų aišku, kur ką įklijuoti.
- Įspėjimas apie peržiūros langą lieka.

## Techninės detalės
- Failas: `src/components/admin/settings/ApiAccessSection.tsx`
- Keičiamas tik `BASE_URLS` masyvas ir jo atvaizdavimas (struktūra: `envVar`, `url`, `hint`, nebūtinas `alt`).
- Jokių serverio, DB ar API pakeitimų.
