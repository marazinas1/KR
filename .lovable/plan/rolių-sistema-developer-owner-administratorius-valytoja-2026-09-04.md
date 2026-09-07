# Rolių sistema: Developer / Owner / Administratorius / Valytoja

## Hierarchija

```text
Developer        (jūs — viską galite, neliečiamas)
  Owner          (viešbučio savininkas — viskas, išskyrus Developer paskyrą)
    Administratorius (darbuotojas — kasdienis valdymas, be Nustatymų ir naudotojų)
      Valytoja   (housekeeper — tik /staff ekranai)
```

Ateityje prie žemiausios grandies (šalia Valytojos) galima pridėti lygiagrečių darbuotojų rolių — struktūra tam paruošta.

## Ką gausite

- **Developer** — aukščiausia rolė. Jūsų paskyra (rutkusmarius@gmail.com) tampa Developer. Šios rolės niekas negali suteikti, pakeisti ar panaikinti, išskyrus patį Developer.
- **Owner** — viskas admin panelėje, įskaitant Nustatymus ir naudotojų kvietimą/šalinimą, bet negali liesti Developer paskyros.
- **Administratorius** — rezervacijos, objektai, tvarkymas, sutartys, išlaidos, turinys. Nemato Nustatymų skilties ir negali valdyti naudotojų.
- **Valytoja** — kaip ir dabar: tik /staff ekranai.
- Admin panelės šoninės juostos apačioje visada matomas prisijungęs žmogus: vardas arba el. paštas ir po juo rolė (DEVELOPER / OWNER / ADMINISTRATORIUS), o žemiau — „Grįžti į svetainę" ir „Atsijungti", kaip Halliday projekte.
- Viešos svetainės apatinėje juostoje (footeryje) atsiranda nuoroda **Admin**, vedanti tiesiai į prisijungimą / admin panelę.

## Naudotojų valdymas

Nustatymų → Naudotojai kortelėje kviečiant bus galima pasirinkti rolę: Owner, Administratorius arba Valytoja. Sąraše rodoma kiekvieno rolė; Developer eilutė pažymėta ir jos veiksmų mygtukai neaktyvūs kitiems. Owner negali pašalinti ar pakeisti Developer.

## Techninė dalis

**Duomenų bazė (viena migracija):**
- `app_role` enum papildomas reikšmėmis `developer`, `owner`, `administrator` (esamos `admin`, `user`, `housekeeper` lieka; `admin` tampa senąja reikšme).
- Jūsų esama `admin` eilutė perrašoma į `developer`.
- `public.has_role(_user_id, _role)` perrašoma taip, kad `'admin'` užklausa būtų tenkinama, kai naudotojas turi `developer`, `owner`, `administrator` arba senąjį `admin`. Taip visos 30 esamų RLS politikų lieka nepakeistos ir toliau veikia.
- Naujos SECURITY DEFINER funkcijos: `is_developer(uuid)` ir `is_owner(uuid)` (developer arba owner) — naudojamos Nustatymų ir naudotojų valdymo apsaugai.
- Apsauginis trigeris `guard_user_roles` ant `user_roles`: draudžia bet kam (išskyrus developer ir service_role) sukurti, pakeisti ar ištrinti `developer` eilutę.

**Kodas:**
- `src/lib/properties.functions.ts` → `getMyRole` grąžina ir tikslią rolę (`developer|owner|administrator|housekeeper`) bei vėliavas `isDeveloper`, `isOwner`, `isAdmin`.
- `src/lib/users.server.ts` → naujas `assertOwner` (developer/owner); naudojamas `users.functions.ts` (kvietimas, pervadinimas, šalinimas) ir nustatymų išsaugojimo serverio funkcijose. Kvietimo rolių sąrašas: `owner | administrator | housekeeper`; šalinant Developer — klaida.
- `src/routes/_authenticated/admin.tsx` → meniu punktas „Nustatymai" rodomas tik owner/developer; šoninės juostos apačioje naujas naudotojo blokas (vardas/el. paštas + rolė), „Grįžti į svetainę" ir „Atsijungti".
- `src/routes/_authenticated/admin.settings.tsx` → administratoriaus bandymas patekti nukreipia atgal į skydelį; Naudotojų kortelė matoma tik owner/developer.
- `src/components/admin/settings/UsersSection.tsx` → naujos rolės pasirinkime, rolės ženkleliai, Developer eilutės apsauga.
- `src/components/site/SiteFooter.tsx` → „Admin" nuoroda į `/admin` apatinėje teisinių nuorodų juostoje.
- Nauji vertimai LT/EN `src/i18n/locales/*.json` ir viešos svetainės turinio failuose (footerio „Admin").
