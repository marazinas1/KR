# Pokalbių asistentė „Eva“ admin dalyje

Į admin dalį pridedamas pokalbių langas apačioje dešinėje. Eva paaiškina, kur kas yra ir kaip atlikti veiksmą, ir mato dabartinę suvestinę (nustatymai, butų sąrašas, dashboard skaičiai). Ji nieko nekeičia — tik atsako ir pasiūlo nuorodą į reikiamą ekraną.

## Ką patikrinau prieš planą

- `assistant_messages` lentelė šiame projekte JAU egzistuoja (paveldėta iš demo remikso) su teisingomis prieigos taisyklėmis: kiekvienas mato, rašo ir trina tik savo žinutes. Naujos migracijos nereikia.
- Jokio asistento kodo projekte nėra — visa `src/lib/assistant*`, `src/routes/api/assistant/*`, widget dalis rašoma nauja.
- Rolės: `developer | owner | manager | tenant`. Demo naudojo `has_role(..., 'admin')`, ko čia nėra — prieiga tikrinama pagal tris admin roles.
- Dashboard skaičiai jau paruošti `getDashboard` funkcijoje (užimtumas, nuomos pajamos, tušti butai, besibaigiančios sutartys, trūkstami rodmenys, gedimai, skolininkai, užklausos) — Eva naudos tuos pačius skaičius, ne savo atskirą skaičiavimą.

## Kaip veiks

1. Apvalus mygtukas su Evos avataru apačioje dešinėje, matomas visuose `/admin` puslapiuose (developer, owner, manager). Nuomininkų portale jo nėra.
2. Paspaudus atsidaro šoninis pokalbio langas: atsakymas rašomas gyvai (žodis po žodžio), yra pasiūlymų mygtukai pradžioje ir „Išvalyti pokalbį“.
3. Atsakyme esančios nuorodos rodomos kaip mygtukai („Atidaryti butus“) — paspaudus iškart nueina į tą admin ekraną.
4. Kalba pagal pasirinktą sąsajos kalbą (lt/en).
5. Istorija saugoma vartotojui asmeniškai; kiti vartotojai jos nemato.
6. Ribojimas: iki 30 žinučių per valandą vienam vartotojui, žinutė iki 1000 simbolių, į modelį perduodamos 20 paskutinių žinučių.

## Ką Eva žino

- **Admin žemėlapis** (rašomas naujas, ilgalaikei nuomai): Skydelis, Užklausos, Analitika, Butai, Nuomininkai, Sutartys, Gedimai, Mokesčiai, Sąskaitos, Išlaidos, Vartotojai, Nustatymai, Turinys — ką kiekvienas ekranas daro ir kokia veiksmų seka (pvz. rodmuo → patvirtinimas → mokesčio eilutė → sąskaita; sutarties šablonas → PDF → dokumentas).
- **Nustatymų reikšmės** su paaiškinimais, bet jautrūs laukai (IBAN, banko, įmonės kodas, PVM kodas, adresas) į AI kontekstą neperduodami — perduodamas tik paaiškinimas ir žyma „(paslėpta)“.
- **Butų santrauka**: pavadinimas, pastatas, būsena, nuoma, ar viešinamas, nuotraukų kiekis.
- **Verslo suvestinė iš dashboard**: užimtumas, nuomos apyvarta, tušti butai, sutartys per 30/60/90 d., trūkstami rodmenys, atviri gedimai, skolos suma, naujos užklausos.
- **Niekada** neperduodami nuomininkų asmens duomenys: vardai, telefonai, el. paštai, asmens kodai, dokumentai, individualūs skolų dydžiai pagal asmenį. Tik suminiai skaičiai.

## Techninė dalis

- `src/routes/api/assistant/chat.ts` — POST maršrutas su SSE srautu. Autentikacija per Bearer token iš naršyklės sesijos; rolė tikrinama `has_role` per tris admin roles (naujas `src/lib/assistant-auth.server.ts`). Modelis: `google/gemini-3.8-flash` per Lovable AI Gateway `/v1/chat/completions` su `stream: true`; klaidos 402/403/429 verčiamos į aiškų lietuvišką tekstą pagal gateway taisykles. Įrašomos ir vartotojo, ir Evos žinutės.
- `src/lib/assistant-knowledge.ts` — sistemos promptas, limitai, `[[link:/admin/...|Pavadinimas]]` žymų formatas, lt/en žinių bazė.
- `src/lib/assistant-context.server.ts` — nustatymų (be jautrių laukų) ir butų santraukos surinkimas.
- `src/lib/assistant-analytics.server.ts` — verslo suvestinė, kviečianti tą pačią dashboard užklausų logiką (`src/lib/dashboard-queries.server.ts`), be trečio skaičiavimo.
- `src/lib/assistant.functions.ts` — istorijos skaitymas ir išvalymas (`requireSupabaseAuth`).
- `src/components/admin/assistant/AssistantWidget.tsx` — mygtukas, šoninis langas, srauto skaitymas, nuorodų mygtukai, pasiūlymai; stilius pagal Halliday tokenus (juodas mygtukas, plonas rėmelis, Manrope).
- Avataras: sugeneruojamas portretas į `src/assets/eva-avatar.jpg`, importuojamas įprastu ES importu.
- Įjungiama viena eilute `src/routes/_authenticated/admin.tsx` (renderinama tik kai rolė yra admin lygio).
- Vertimai `lt.json` / `en.json`: pavadinimas, paantraštė, pasiūlymai, klaidos, mygtukai.
- Migracijos nereikia.

## Patikrinimas

1. Prisijungus kaip owner uždavus klausimą — realus Evos atsakymas su veikiančia nuoroda (ekrano nuotrauka).
2. Klausimas apie skaičių (pvz. „kiek butų tušti“) — atsakymas sutampa su dashboard reikšme.
3. Klausimas apie IBAN ar nuomininko telefoną — Eva atsisako ir nurodo, kur tai matyti pačiam.
4. Užklausa be prisijungimo į `/api/assistant/chat` grąžina 401; nuomininko sesija taip pat atmetama.
5. „Išvalyti pokalbį“ ištrina tik savo istoriją.
6. `bunx tsgo --noEmit` ir `bun run build` praeina.
