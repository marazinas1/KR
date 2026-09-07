# Objektų turinio vertimai (universali vertimų lentelė)

## Ką darysime

Sukuriame universalią vertimų saugyklą duomenų bazėje ir kortelę „Vertimai" objekto redagavimo lange. Originalūs tekstai lieka ten, kur buvo — verčiama tik į kitas kalbas.

## Žingsniai

1. **Migracija** — nauja lentelė `content_translations` (tipas, įrašo ID, laukas, kalba, reikšmė), unikalumo taisyklė, paieškos indeksas, `updated_at` trigeris, prieigos teisės ir taisyklė: valdyti gali tik administratoriai.

2. **`src/lib/languages.ts`** (naujas) — vienintelis palaikomų kalbų sąrašas, `FALLBACK_LANGUAGE`, `translationLanguagesFor`, `resolveDefaultLanguage`. Naudos ir sąsaja, ir serveris.

3. **`src/i18n/index.ts`** — kalbų sąrašas importuojamas iš `@/lib/languages` ir persiunčiamas toliau (esami importai iš `@/i18n` veikia nepakitę). `readStoredLanguage()` grąžina `null`, kai vartotojas kalbos niekada nesirinko.

4. **`src/components/LanguageProvider.tsx`** — kalbą keičia tik esant sąmoningam pasirinkimui.

5. **`src/hooks/useDefaultLanguage.ts`** (naujas) — paima „Numatytoji kalba" iš nustatymų (ta pati `["property-settings"]` užklausa, papildomo kreipimosi nebus) ir pritaiko sąsajai, jei vartotojas nieko nesirinko.

6. **`src/routes/_authenticated/admin.tsx`** — iškviečiamas `useDefaultLanguage()`.

7. **`src/lib/translations.ts`** (naujas) — verčiamų laukų registras: `name`, `description`, `location_note`, `rooms_notes` + papildomos paslaugos su priešdėliu `extra_service.`; leistinų laukų patikra.

8. **`src/lib/translations.functions.ts`** (naujas) — `getTranslations` ir `saveTranslations` serverinės funkcijos su administratoriaus patikra; tuščia reikšmė = įrašas ištrinamas.

9. **`src/components/admin/TranslationPanel.tsx`** (naujas) — universali kortelė: kalbų kortelės, originalo tekstas virš kiekvieno lauko, „Išversta X iš Y", atskiras mygtukas „Išsaugoti vertimus" ir įspėjimas apie neišsaugotus vertimus išeinant.

10. **`src/routes/_authenticated/admin.properties.$id.edit.tsx`** — po objekto formos prijungiama vertimų kortelė su statiniais laukais ir objekto papildomomis paslaugomis + pastaba, kad paslaugų vertimai rišami prie jau išsaugotų pavadinimų. Naujo objekto lange (`new`) kortelės nebus.

## Techninės pastabos

- `entity_id` be užsienio rakto — lentelė aptarnaus kelis tipus; našlaičių valymas — vėlesniame etape.
- Vieša API (`/api/public/v1/*`), laiškų logika, `content_templates` ir `property_settings` vertimai šiame etape neliečiami.
- `properties` schema ir esami duomenys nekeičiami.
- Papildomų paslaugų vertimo raktas remiasi lietuvišku pavadinimu — pervadinus paslaugą, senas vertimas taps našlaičiu.

## Patikra

Objekto redagavime atsiranda kortelė „Vertimai"; įvesti vertimai išlieka po perkrovimo, ištuštinti — pašalinami; neišsaugoti vertimai išeinant įspėja; pakeitus numatytąją kalbą nustatymuose keičiasi ir sąsajos kalba (jei vartotojas jos nesirinko), ir verčiamų kalbų sąrašas.
