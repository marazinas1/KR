# Klientinės dalies sujungimas su core projektu

Į šį projektą perkeliama klientinė (viešoji) svetainė iš `marazinas1/dharma-stay-boutique`. Rezultatas — vienas projektas su dviem dalimis:

- **Klientinė dalis** — viešieji adresai: `/`, `/apartamentai/...`, `/apie`, `/kontaktai`, `/sauna`, `/restobaras`, `/banketine-sale`, `/dovanu-kuponai`, `/namelis`, `/taisykles`, `/privatumo-politika`, `/rezervacija/patvirtinta`, `/en/...`, `/sitemap.xml`.
- **Core dalis (nekeičiama)** — `/admin/...`, `/staff/...`, `/auth`, `/reset-password`, `/api/...`.

Abi dalys naudoja tą patį TanStack Start stacką, todėl kodas perkeliamas be perrašymo.

## Ką darysiu

1. **Maršrutai.** Perkeliu visus klientinės dalies route failus į `src/routes/` (įskaitant `en/` ir `sitemap[.]xml.ts`). Vienintelis konfliktas — dabartinis `src/routes/index.tsx`, kuris nukreipia į `/auth`; jį pakeičia svetainės pradinis puslapis. Prisijungimas lieka `/auth`.

2. **Bendras karkasas.** `src/routes/__root.tsx` sujungiamas: administravimo ir personalo adresai (`/admin`, `/staff`, `/auth`, `/reset-password`) rodomi kaip dabar, o viešieji adresai gauna svetainės antraštę, poraštę ir rezervacijos dialogą.

3. **Dizainas.** Į `src/styles.css` pridedu svetainės paletę (linen / ink / sage / clay), šriftus (Cormorant Garamond + Inter) ir visas svetainės pagalbines klases (`reveal`, `hero-*`, `photo-zoom`, `label-caps`, `legal-prose`). Svetainės semantinės spalvos taikomos tik viešiesiems puslapiams per atskirą apvalkalo klasę, todėl administravimo panelės išvaizda nepasikeičia.

4. **Komponentai ir logika.** Perkeliami `components/site`, `components/home`, `components/stay`, `content/lt` + `content/en`, `data`, `pages` ir susijusios `lib` bibliotekos. Iš `components/ui` perkeliami tik tie failai, kurių dar nėra — esami nekeičiami.

5. **Nuotraukos.** 11 svetainės paveikslėlių (hero, apartamentai, restobaras ir kt.) pridedami kaip Lovable Assets nuorodos, kad projekto kodas neišsipūstų iki 4 MB.

6. **Paketai.** Įdiegiami `@fontsource-variable/inter`, `@fontsource/cormorant-garamond`, `maplibre-gl`, `@tanstack/react-router-ssr-query`.

7. **Duomenys iš core.** Klientinė dalis duomenis (objektai, laisvos datos, kainos, rezervacijos, teisiniai tekstai) gauna per viešąjį `/api/public/v1` sluoksnį — tą patį, kuris jau veikia šiame projekte. Kadangi dabar tai tas pats projektas, bazinis adresas nustatomas į patį projektą, o API raktas paimamas iš esamų core API raktų. Vėliau, jei norėsite, galima šį HTTP šuolį pakeisti tiesioginiu vidiniu kvietimu (greičiau, be rakto).

## Techninės detalės

- `src/lib/runtime-env.server.ts` `resolveRentivoConfig` lieka, bet numatytasis bazinis adresas — dabartinio užklausos domeno `origin`; raktas iš `RENTIVO_API_KEY_DEV` / `RENTIVO_API_KEY_PROD` secretų (jei jų nėra, paprašysiu įvesti).
- `src/start.ts`: prie esamo `requestMiddleware` pridedamas CSRF middleware serverio funkcijoms (buvo klientinės dalies projekte), `attachSupabaseAuth` lieka.
- SEO: kiekvienas viešas maršrutas jau turi savo `head()` su unikaliais `title`/`description`/OG — perkeliama nepakeista.
- `src/routeTree.gen.ts` neredaguojamas — jį sugeneruoja Vite pluginas.

## Ko nedarysiu

- Nekeičiu administravimo panelės, personalo ekranų, duomenų bazės schemos ir laiškų logikos.
- Neperkeliu klientinės dalies `routeTree.gen.ts`, `router.tsx`, `server.ts` — naudojami esami.
