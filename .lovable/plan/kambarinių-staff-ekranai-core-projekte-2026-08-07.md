# Kambarinių (staff) ekranai Core projekte

Naujas `/staff` skyrius tame pačiame projekte: minimalus mobiliam telefonui pritaikytas UI, dirbantis per jau esamą `/api/staff/v1/*` sluoksnį. Admin dalis, rezervacijų/objektų logika ir viešas API nekeičiami.

## 1. Layout `/staff`

`src/routes/_authenticated/staff.tsx` — pagal tą patį modelį kaip `admin.tsx` (`getMyRole` per `useServerFn`), bet praleidžia `housekeeper` **arba** `admin`, be admin meniu. Neturint rolės — „Prieiga negalima“ + mygtukas „Atsijungti“. Viršuje antraštė „Kambarių tvarkymas“ ir atsijungimas, apačioje `<Outlet />`.

Naujas `src/lib/staff-api-client.ts` su `callStaffApi`, kuris prie kiekvienos užklausos prideda `Authorization: Bearer <access_token>` iš esamos sesijos ir vienodai apdoroja klaidas.

## 2. Kambarių sąrašas

`src/routes/_authenticated/staff.index.tsx` — kortelių sąrašas iš `GET /rooms`, atnaujinamas kas 30 s. Kiekvienoje kortelėje: pavadinimas, spalvotas statusas (Švaru / Reikia tvarkyti / Tvarkoma / Problema), ženkliukai „Išvyksta šiandien“ / „Atvyksta šiandien“ / „Užimta“ ir kam priskirta. Šiandien išvykstantys kambariai rikiuojami viršuje.

## 3. Kambario detalė

`src/routes/_authenticated/staff.$id.tsx` — statuso mygtukai, pastabos laukas, „Priimti valyti“ / „Atsisakyti“ (assign/unassign), grįžimo mygtukas. Po kiekvieno veiksmo sąrašas perkraunamas. Klaidos (pvz. 409 „jau priskirta kitai“) rodomos pranešimu.

## 4. Peradresavimas pagal rolę

`src/routes/auth.tsx`: dabar bet kokia sesija metama į `/admin`. Vietoj to — bendra `goToDestination()`, kuri patikrina rolę: admin → `/admin`, housekeeper → `/staff`, kitaip → `/admin` (ten matys „Neturite teisių“). Naudojama abiejose vietose (`onAuthStateChange` ir `getSession()`).

## Techninės detalės

- `getMyRole` jau grąžina `{ userId, isAdmin, roles }` — nekeičiamas.
- **Svarbu:** `withStaffAuth` atmeta bet kokią užklausą su `Origin`, kurio nėra `STAFF_ALLOWED_ORIGINS` (403). Naršyklė POST užklausoms `Origin` siunčia net ir tam pačiam domenui, todėl į `STAFF_ALLOWED_ORIGINS` įrašomi šio projekto domenai (preview, `https://dharmastay.lovable.app`, `https://admin.dharma.revoo.lt`). Papildomai `staff-api-auth.server.ts` praleidžiamas tos pačios kilmės (`Origin === request URL origin`) atvejis, kad ekranai veiktų ir prieš nustatant kintamąjį, ir bet kuriame preview domene.
- Maršrutai gyvena po esamu `_authenticated` gate, todėl neprisijungęs vartotojas nukreipiamas į `/auth`.
- UI naudoja esamus dizaino tokenus (semantines klases), be hardcoded spalvų — statusų spalvoms naudojami `bg-*/text-*` tokenų atitikmenys projekto stiliuje.

## Patikros

- Housekeeper prisijungia → patenka į `/staff`, mato sąrašą be admin meniu; gali keisti statusą, priimti/atsisakyti, palikti pastabą.
- Adminas per URL atidaro `/staff` → veikia.
- Vartotojas be rolės → `/admin` ir `/staff` rodo aiškų pranešimą, ne klaidą.
- Kambarinė per URL bando `/admin` → „Neturite administratoriaus teisių“ (nepakitę).
