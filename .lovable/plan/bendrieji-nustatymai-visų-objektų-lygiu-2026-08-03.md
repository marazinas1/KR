# Bendrieji nustatymai visų objektų lygiu

Šiuo metu nustatymai saugomi 1:1 su kiekvienu objektu, todėl viršuje reikia rinktis „Objektas“ ir viską konfigūruoti iš naujo kiekvienam objektui. Pakeisime taip, kad būtų **vieni bendri nustatymai visai sistemai**, galiojantys visiems objektams.

## Ką matys naudotojas

- Dingsta „Objektas“ parinkiklis iš „Turto nustatymai“ viršaus.
- Kairėje lieka tos pačios sekcijos (Objekto informacija, Viešnagės taisyklės, Svečių politika, Mokesčiai, Mokėjimai, Atšaukimo politika, Sąskaitos, Pranešimai, Prekės ženklas, Integracijos).
- Kiekviena sekcija išsaugoma atskirai, kaip ir dabar; įrašyti nustatymai iškart galioja visiems objektams.
- Integracijų kortelė rodo bendrą iCal būseną: kiek objektų turi prijungtą iCal ir kada paskutinį kartą sinchronizuota.
- Sekcijos „Objekto informacija“ laukai virsta įmonės / valdytojo lygio informacija (pavadinimas, kontaktai, valiuta, kalba, laiko juosta), o konkretaus objekto duomenys (adresas, aprašymas, nuotraukos, iCal nuoroda) lieka objekto kortelėje.

## Duomenų bazė

- Nauja migracija: `property_settings` tampa vienos eilutės (singleton) lentele — pridedamas `scope` stulpelis su fiksuota reikšme `global` ir unikaliu indeksu, `property_id` tampa nebūtinas ir nebenaudojamas.
- Esami duomenys: į bendrą įrašą perkeliama naujausiai atnaujinta eilutė, likusios lieka istorijai (nenaudojamos) arba išvalomos.
- RLS lieka ta pati logika: skaityti gali prisijungę naudotojai, keisti — tik administratoriai.

## Kodo pakeitimai

- `src/lib/property-settings.functions.ts`: `getPropertySettings` ir `savePropertySettings` nebepriima `propertyId`; dirba su vienintele `scope = 'global'` eilute (`upsert` pagal `scope`).
- `src/routes/_authenticated/admin.settings.tsx`: pašalinamas objekto pasirinkimas ir su juo susijusi užklausa; `queryKey` tampa `['property-settings']`; integracijų kortelės skaičiuojamos iš visų objektų sąrašo.
- `src/lib/property-settings.ts`: pakoreguojami sekcijos „Objekto informacija“ laukų pavadinimai/paaiškinimai, kad atspindėtų bendrą (ne vieno objekto) kontekstą.
- Komponentai `SettingsSectionForm.tsx` ir `SettingsField.tsx` nesikeičia.

## Eiga

1. Migracija (singleton lentelė + duomenų perkėlimas).
2. Serverinių funkcijų atnaujinimas.
3. UI atnaujinimas (objekto parinkiklio pašalinimas, integracijų suvestinė).
