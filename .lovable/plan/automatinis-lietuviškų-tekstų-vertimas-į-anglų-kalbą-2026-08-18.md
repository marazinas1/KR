# Automatinis lietuviškų tekstų vertimas į anglų kalbą

Tikslas: užpildyti tuščius EN vertimų laukus visose objektų kortelėse ir „Turinio" šablonuose — automatiškai, be rankinio rašymo.

## Ką padarysiu

1. **Automatinio vertimo variklis (AI)**
   - Nauja serverio funkcija, kuri paima lietuvišką originalą ir grąžina anglišką vertimą naudodama Lovable AI (be atskiro API rakto).
   - Vertimo taisyklės: išsaugomi HTML žymėjimai (`<p>`, `<strong>`, sąrašai) ir kintamieji `{{guest_name}}`, `{{door_code}}` ir kt. — jie NIEKADA neverčiami ir nepertvarkomi.
   - Verčiami tik tie laukai, kurie EN kalba dar tušti; jau įvesti vertimai nebus perrašyti (nebent pasirinktas perrašymo režimas).

2. **Mygtukas „Išversti automatiškai" vertimų panelėje**
   - Objekto redagavimo kortelėje ir kiekvienoje turinio šablono kortelėje.
   - Užpildo aktyvios kalbos laukus; galima peržiūrėti ir pataisyti prieš išsaugant.

3. **Masinis vertimas visiems objektams ir šablonams**
   - Veiksmas „Išversti viską į EN": pereina per visus objektus (pavadinimas, aprašymas, vietos pastabos, kambarių pastabos, papildomų paslaugų pavadinimai) ir visus turinio šablonus (tema + turinys), užpildo trūkstamus EN vertimus ir įrašo į vertimų lentelę.
   - Rodoma eiga ir suvestinė: kiek laukų išversta, kiek praleista, kiek nepavyko.

4. **Paleidžiu vieną kartą už jus**
   - Po įdiegimo pats paleisiu masinį vertimą, kad EN laukai jau būtų užpildyti, ir pranešiu suvestinę. Vertimus galėsite laisvai koreguoti ranka.

## Techninės detalės

- Nauji failai: `src/lib/auto-translate.server.ts` (AI kvietimas, HTML/kintamųjų apsauga) ir `src/lib/auto-translate.functions.ts` (serverFn: vieno įrašo vertimas + masinis vertimas), abu su admin rolės patikra kaip esamose vertimų funkcijose.
- Modelis: Lovable AI Gateway (`google/gemini-2.5-flash`) — greitas ir pigus tekstams; vertimai vykdomi paketais su ribotu lygiagretumu.
- Įrašymas per esamą `content_translations` logiką (`entity_type`/`entity_id`/`field`/`lang`) — API atsakymų struktūra nesikeičia.
- UI: `TranslationPanel.tsx` papildoma vertimo mygtuku; masinio vertimo veiksmas objektų sąraše ir „Turinio" puslapyje.
- Nauji lt/en sąsajos raktai vertimo mygtukams ir pranešimams.
