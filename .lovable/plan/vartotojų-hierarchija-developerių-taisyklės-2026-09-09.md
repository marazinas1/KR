# Vartotojų hierarchija: developerių taisyklės

## Kaip yra dabar (patikrinta kode ir gyvoje duomenų bazėje)

- Rolės: `developer`, `owner`, `manager`, `tenant`. Sistemoje šiuo metu yra **viena** paskyra su role `developer` ir daugiau jokių rolių įrašų.
- Kviesti žmones gali savininko lygio naudotojas (owner arba developer). Kvietimo formoje galima pasirinkti `owner` ir `manager`; `developer` pasirinkimas rodomas ir priimamas tik tada, kai kviečiantysis pats yra developer. Ši taisyklė jau veikia ir serverio pusėje.
- Developerio paskyros negalima nei pervadinti, nei ištrinti niekam, išskyrus developerį. Trynimo mygtukas developerio eilutėje išjungtas.
- Rolės keitimo esamam vartotojui apskritai nėra – rolė nustatoma tik kvietimo metu.
- **Spraga duomenų bazėje:** prieigos taisyklės leidžia bet kuriam savininko lygio naudotojui tiesiogiai įrašyti, pakeisti ar ištrinti bet kurią rolių eilutę – įskaitant `developer`. Apsauga šiandien yra tik programos kode, ne pačioje duomenų bazėje. Tai reiškia, kad owner techniškai gali pasidaryti save developeriu apeidamas sąsają.

## Ką padarysime

### 1. Taisyklės (galutinės)
- Developerį gali pridėti tik developeris.
- Naujo developerio kvietimas įsigalioja tik tada, kai jį patvirtina **visi** kiti esami developeriai. Kol nepatvirtinta – tai laukiantis pasiūlymas, ne paskyra su teisėmis.
- Owner ir žemesni negali nei pridėti developerio, nei pakelti nieko iki developerio, nei liesti developerio paskyros.
- Developerį pašalinti gali tik jis pats sau. Paskutinio developerio pašalinti negalima.
- Rolės keitimas sąraše atsiranda, bet tik žemyn nuo savo lygio: developeris gali skirti `owner` / `manager` / `tenant`; owner gali skirti `manager` / `tenant`. Niekas negali skirti `developer` rolės tiesiogiai – tik per patvirtinimų procesą.

### 2. Naujas ekranas Vartotojų skiltyje
- „Laukiantys developerio kvietimai“ kortelė: kas pasiūlytas, kas pasiūlė, kiek patvirtinimų surinkta (pvz. 1 iš 2), mygtukai „Patvirtinti“ ir „Atmesti“ – matomi tik developeriams.
- Kai surenkami visi patvirtinimai, žmogui automatiškai išsiunčiamas kvietimo laiškas ir suteikiama developer rolė.
- Jei sistemoje yra tik vienas developeris, jo paties pasiūlymas įsigalioja iš karto (nėra kam patvirtinti).
- Atmetimas arba pasiūlymo atšaukimas panaikina laukiantį įrašą; nepatvirtinti pasiūlymai galioja 14 dienų.

### 3. Apsauga duomenų bazėje
Prieigos taisyklės perrašomos taip, kad pati duomenų bazė neleistų:
- niekam, išskyrus developerį, sukurti, pakeisti ar ištrinti `developer` rolės įrašo;
- developeriui būti ištrintam kito developerio;
- likti sistemai be nė vieno developerio.

## Techninės pastabos

- Nauja lentelė `developer_invites`: `email`, `full_name`, `proposed_by`, `status` (`pending` / `approved` / `rejected` / `expired`), `expires_at`, laiko žymos; plius `developer_invite_approvals` (`invite_id`, `approver_id`, unikalu kartu). GRANT `authenticated` (select/insert/update) ir `service_role`; RLS – matoma ir keičiama tik developeriams (`is_developer(auth.uid())`).
- `user_roles` politikos perrašomos:
  - INSERT/UPDATE WITH CHECK: `is_owner(auth.uid()) AND (role <> 'developer' OR is_developer(auth.uid()))`;
  - DELETE USING: `is_owner(auth.uid()) AND (role <> 'developer' OR user_id = auth.uid())`;
  - trigeris `prevent_last_developer_removal` prieš DELETE/UPDATE, jei tai paskutinis `developer` įrašas.
- `inviteUser` (`src/lib/users.functions.ts`): kai `role = 'developer'`, vietoje tiesioginio kūrimo sukuriamas `developer_invites` įrašas + automatinis siūlytojo patvirtinimas; jei patvirtinimų skaičius = esamų developerių skaičius, vykdoma esama `generateLink` + rolės suteikimo logika. Kvietimo laiškas siunčiamas tik įsigaliojus.
- Naujos serverio funkcijos: `listDeveloperInvites`, `approveDeveloperInvite`, `rejectDeveloperInvite`, `cancelDeveloperInvite` – visos su `isDeveloper` patikra; patvirtinimo skaičiavimas ir rolės suteikimas vienoje `SECURITY DEFINER` funkcijoje `finalize_developer_invite(_invite_id uuid)`, kad nebūtų lenktynių tarp dviejų vienalaikių patvirtinimų.
- Nauja `updateUserRole` serverio funkcija: `assertOwner`, draudžia `developer` reikšmę, draudžia keisti developerio eilutę, draudžia keisti savo paties rolę.
- UI: `UsersSection.tsx` – rolės `Select` eilutėje (išjungtas developerio eilutei ir savo paties eilutei), laukiančių kvietimų kortelė, trynimo mygtukas developerio eilutėje aktyvus tik savo paties eilutėje.
- Visi tekstai per i18n (`lt` ir `en`), jokių vardų ar el. pašto adresų kode ar migracijoje.

## Patikrinimas prieš užbaigiant

1. Antro developerio pasiūlymas su vienu esamu developeriu – įsigalioja iš karto; su dviem – lieka laukiantis, kol patvirtina antras.
2. Owner bandymas tiesiogiai įrašyti `developer` rolę į duomenų bazę – gaunamas atmetimas (ne tik paslėptas mygtukas).
3. Developerio trynimas kito developerio – atmestas; savęs – pavyksta; paskutinio – atmestas.
4. Rolės keitimas sąraše: owner gali `manager` ↔ `tenant`, negali `developer`.
5. `bun run build` ir tipų patikra be naujų klaidų; visi bandomieji įrašai išvalyti.
