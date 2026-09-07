# Perkelti šiandienos pakeitimus į Demo-Dharma

Peržiūrėjau Demo-Dharma projektą: jis tikrai beveik identiškas, bet dar be nieko iš to, ką padarėme šiandien — nėra rolių sistemos, nėra Analitikos ir Vartotojų skilčių, nėra Admin nuorodos apačioje, nėra prisijungusio žmogaus rodymo šone.

Svarbu: iš čia negaliu rašyti į kitą projektą — kitų projektų failus galiu tik skaityti. Todėl perkėlimas atliekamas Demo-Dharma pokalbyje, o šis projektas ten naudojamas kaip šaltinis.

## Kaip tai padaryti (jūsų žingsniai)

1. Atsidarykite Demo-Dharma projektą.
2. Pokalbio lauke parašykite `@` ir pasirinkite šį projektą (Demo-Rentals).
3. Nusiųskite žinutę: „Perkelk visus vakarykščius/šiandienos pakeitimus iš @Demo-Rentals: rolių sistemą, Analitikos ir Vartotojų skiltis, Admin nuorodą svetainės apačioje ir prisijungusio naudotojo rodymą admin šone. Sek planu, kuris aprašytas .lovable/plan/ faile."

Kad ten nieko nepasimestų, žemiau surašiau tikslų perkeliamų dalykų sąrašą — jį galite tiesiog nukopijuoti į Demo-Dharma pokalbį.

## Ką reikia perkelti

1. **Rolių sistema** – Developer (aukščiausia, neliečiama), Owner, Administrator, Kambarių tvarkytoja. Jūsų paskyra ten taip pat turi tapti Developer.
2. **Admin šone apačioje** – rodomas prisijungęs žmogus ir jo rolė.
3. **Svetainės apačioje (footeryje)** – nuoroda „Admin“ prisijungimui.
4. **Admin mygtukas „Svetainė“** – veda į to projekto publikuotą adresą (Demo-Dharma atveju – jo savo domeną, ne demo-rentals).
5. **Prisijungimo puslapio dešinė pusė** – užrašas „Demo“.
6. **Nauja Analitikos skiltis** – peržiūros, lankytojai, rezervacijos, konversija, srauto grafikas (7/30/90 d.), populiariausi puslapiai, šaltiniai, įrenginiai.
7. **Nauja Vartotojų skiltis** – atskiras puslapis su kvietimais ir rolėmis (išimta iš Nustatymų).

## Techninė dalis (Demo-Dharma agentui)

Demo-Dharma turi savo atskirą duomenų bazę, todėl vien failų nukopijuoti neužtenka – reikia ir migracijų.

Duomenų bazė (naujos migracijos):
- `app_role` enum papildymas: `developer`, `owner`, `administrator`.
- `guard_user_roles` trigeris: developer eilutės negali keisti/šalinti niekas, išskyrus developer / service_role.
- `is_developer()`, `is_owner()` security-definer funkcijos ir jų naudojimas RLS politikose.
- `page_views` lentelė (path, session_id, referrer, country, user_agent, created_at) su anon INSERT politika ir admin SELECT; GRANT'ai anon/authenticated/service_role.
- `analytics_summary(_from date, _to date)` – security definer, admin-only, grąžina JSONB: totals, previous, daily, top_pages, sources, devices, leads; EXECUTE atšaukiamas nuo anon.
- Marius Rutkus paskyrai priskirti `developer` rolę.

Failai, kuriuos kopijuoti / pritaikyti iš Demo-Rentals:
- `src/hooks/usePageTracking.ts`, `src/hooks/useAnalytics.ts` (nauji)
- `src/routes/_authenticated/admin.analytics.tsx`, `admin.users.tsx` (nauji)
- `src/routes/_authenticated/admin.tsx` – nav įrašai `analytics`, `users` (tik isOwner), naudotojo blokas šone
- `src/routes/_authenticated/admin.settings.tsx` – pašalintas „users“ tabas
- `src/components/admin/settings/UsersSection.tsx` – rolių pasirinkimas ir apsaugos
- `src/lib/users.functions.ts`, `src/lib/users.server.ts`, `src/lib/properties.functions.ts` (`getMyRole` su `isOwner`/`isDeveloper`)
- `src/routes/__root.tsx` – `usePageTracking()`
- `src/routes/auth.tsx` – „Demo“ dešinėje
- footerio komponentas – „Admin“ nuoroda
- `src/data/nav.ts` – `SITE_URL` nustatyti į Demo-Dharma publikuotą adresą
- `src/i18n/locales/lt.json` ir `en.json` – `nav.analytics`, `nav.users`

Patikra po perkėlimo: tipų patikra, `build:dev`, ir kad `/admin`, `/admin/analytics`, `/admin/users` atsidaro.
