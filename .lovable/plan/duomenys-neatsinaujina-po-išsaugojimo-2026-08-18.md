# Duomenys neatsinaujina po išsaugojimo

## Kas vyksta

Išsaugojus objektą (ar kitą įrašą), sistema iškart nukreipia į sąrašą, bet **neišvalo įsimintų (cache) duomenų**. Grįžus į redagavimą forma užsipildo senais įsimintais duomenimis ir lieka tokia, net kai naujesni duomenys jau atkeliauja iš serverio — nes forma savo laukus nustato tik vieną kartą, atsidarymo momentu. Todėl padeda tik puslapio perkrovimas.

Patvirtinta kode:
- `admin.properties.$id.edit.tsx` — po `updateProperty` tik `navigate(...)`, be užklausų `property-edit` / `admin-all-properties` atnaujinimo.
- `PropertyForm.tsx` — būsena inicijuojama `useState(initial)` ir niekada nesinchronizuojama, kai `initial` pasikeičia.
- Tas pats šablonas sutarčių formoje (`admin.contracts.tsx` — `useState(initial?...)`).
- Rezervacijos redagavime (`admin.bookings.$id.tsx`) po išsaugojimo taip pat tik `navigate`, be `admin-bookings` / `admin-booking` atnaujinimo.

## Ką taisysime

1. **Objekto redagavimas** — po sėkmingo išsaugojimo atnaujinti (invalidate) `property-edit`, `admin-all-properties`, `admin-props`, `admin-props-all` užklausas, tik tada nukreipti į sąrašą. Tas pats po naujo objekto sukūrimo.
2. **PropertyForm** — kai iš serverio ateina nauji duomenys, forma persikrauna į naujas reikšmes (sinchronizacija su `initial`, nenutraukiant redagavimo, kai vartotojas jau kažką pakeitė).
3. **Rezervacijos** — po išsaugojimo atnaujinti rezervacijų sąrašo ir konkrečios rezervacijos duomenis.
4. **Sutarčių forma** — ta pati sinchronizacija su naujausiais duomenimis.
5. **Bendra apsauga** — nustatyti bendrą `QueryClient` politiką (`staleTime: 0`, atnaujinimas grįžus į langą / pakartotinai atidarius ekraną), kad visur po išsaugojimo matytųsi šviežias turinys be perkrovimo.

## Techninės detalės

- `src/router.tsx`: `new QueryClient({ defaultOptions: { queries: { staleTime: 0, refetchOnMount: "always", refetchOnWindowFocus: true } } })`.
- `src/routes/_authenticated/admin.properties.$id.edit.tsx` ir `admin.properties.new.tsx`: `useQueryClient()` + `await qc.invalidateQueries(...)` mutacijos `onSuccess` prieš `navigate`.
- `src/components/admin/PropertyForm.tsx`: `useEffect` su stabiliu raktu (objekto `id` + `updated_at`, jei yra) → `setV(initial)`; nekeisti jokios verslo logikos, tik būsenos sinchronizaciją.
- `src/routes/_authenticated/admin.bookings.$id.tsx`: invalidate `["admin-bookings"]`, `["admin-booking", id]`, `["dashboard-stats"]`.
- `src/routes/_authenticated/admin.contracts.tsx`: `useEffect` sinchronizacija formos laukams pagal `initial`.
