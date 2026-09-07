# i18n pamatai + admin/staff šoninės juostos vertimas

## Ką darysime

Sutvarkome vertimų sistemos pamatus ir išverčiame tik administratoriaus šoninę juostą bei kambarinių antraštę — kaip veikiantį pavyzdį. Likusi sąsaja lieka lietuviška.

## Žingsniai

1. **Vertimų failai perrašomi nuo nulio** — `lt.json` ir `en.json` valomi nuo seno automobilių nuomos turinio (272 raktai) ir pakeičiami nurodytais raktais: `language`, `common`, `nav`, `admin`, `staff`.

2. **`src/i18n/index.ts`** — nauja sąranka su `SUPPORTED_LANGUAGES`, `DEFAULT_LANGUAGE`, `LANGUAGE_STORAGE_KEY`, pagalbinėmis funkcijomis `isSupportedLanguage` / `readStoredLanguage` / `storeLanguage`. Init visada startuoja su `lt`, kad nebūtų SSR/hydration neatitikimo.

3. **`src/components/LanguageProvider.tsx`** (naujas) — po atvaizdavimo naršyklėje pritaiko išsaugotą kalbą per `useEffect`.

4. **`src/components/LanguageSwitcher.tsx`** (naujas) — dropdown jungiklis su `Languages` ikona; kalbos rodomos savo kalba.

5. **`src/routes/__root.tsx`** — `<Outlet />` apgaubiamas `<LanguageProvider>` viduje `QueryClientProvider`.

6. **`src/routes/_authenticated/admin.tsx`** — meniu punktai, „Kraunama…", „Neturite administratoriaus teisių" per `t()`; šoninės juostos pavadinimas imamas iš nustatymų (`displayName`, fallback „Revoo") vietoje užkoduoto „Dharma Stay"; apačioje virš „Svetainė" įdedamas kalbos jungiklis.

7. **`src/routes/_authenticated/staff.tsx`** — antraštė, prieigos klaidos tekstai ir „Atsijungti" per `t()`; jungiklis antraštėje kompaktišku stiliumi.

## Techninės pastabos

- Nustatymų užklausa naudoja tą patį `queryKey: ["property-settings"]` kaip nustatymų puslapis, tad papildomos užklausos nebus.
- Kalba saugoma `localStorage` rakte `revoo.lang`; skaitoma tik naršyklėje.
- DB saugomas turinys (objektai, el. laiškų šablonai, papildomos paslaugos) nekeičiamas.
- Rezervacijų svetainė (atskiras projektas) neliečiama.

## Patikra

Perjungus į „English" pasikeičia tik šoninė juosta ir staff antraštė; po F5 kalba išlieka; konsolėje neturi būti hydration klaidų.
