# Kalbos palaikymas viešajame API

Vertimai jau yra duomenų bazėje, bet svečiams nepasiekiami. Pridedame neprivalomą `language` parametrą prie turinio endpoint'ų — laukų pavadinimai nesikeičia, keičiasi tik turinys.

## Ką darome

1. **Migracija** — `bookings` lentelėje naujas stulpelis `language` (numatyta `lt`). Kol kas tik saugomas, laiškuose nenaudojamas.

2. **Naujas vertimų sluoksnis** (`src/lib/translations.server.ts`):
   - numatytosios kalbos nuskaitymas iš bendrųjų nustatymų;
   - vertimų užkrovimas iš `content_translations` privilegijuotu klientu (kaip daro `/v1/legal`);
   - vertimų pritaikymas objektui (`name`, `description`, papildomų paslaugų pavadinimai);
   - atvirkštinis žodynas „išverstas pavadinimas → originalus".
   - Klaidos atveju grąžinami originalai, o ne klaida.

3. **`GET /properties` ir `GET /properties/{id}`** priima `?language=`. Kai prašoma originalo kalba — atsakymas nesikeičia visai.

4. **`POST /quote` ir `POST /bookings`** priima `language` lauką kūne. Kritinis niuansas: gaunami paslaugų pavadinimai pirma verčiami atgal į originalius, ir tik tada skaičiuojama kaina — priimami ir originalūs, ir išversti pavadinimai. `/quote` atsakyme paslaugų pavadinimai grąžinami prašyta kalba; rezervacijoje ir admin panelėje lieka originalūs. Rezervacijoje išsaugomas kalbos kodas.

5. **`GET /bookings/{number}`** priima `?language=`; nenurodžius naudojama rezervacijos kalba, o jos nesant — numatytoji. Verčiami tik `extras[].name`.

6. **Dokumentacija** — `docs/klientines-dalies-promptas.md` papildomas skiltimi „Kalba" su visų endpoint'ų sąrašu ir paaiškinimu apie papildomų paslaugų pavadinimus.

## Suderinamumas atgal

`language` visur neprivalomas. Jo nenurodžius atsakymai identiški dabartiniams, tad dharma.revoo.lt veiks be jokių pakeitimų. Nežinoma kalba (`?language=xx`) grąžina originalus, ne klaidą. Trūkstamas vertimas — grąžinamas originalas, niekada ne tuščias laukas.

## Ko neliečiame

Laiškų siuntimo (`notifications.server.ts`), admin sąsajos ir `TranslationPanel`, atsakymų laukų pavadinimų.

## Techninės pastabos

- `content_translations` neturi `anon` skaitymo teisių, tad skaitoma per `supabaseAdmin` — kvietėjas tuo metu jau patvirtintas API raktu.
- Nėra užkoduotos prielaidos „lietuvių = originalas": originalo kalba visada imama iš `property_settings.default_language`.
- `extraServiceField()` iš `src/lib/translations.ts` naudojamas kaip vienintelis paslaugų lauko raktų šaltinis.
