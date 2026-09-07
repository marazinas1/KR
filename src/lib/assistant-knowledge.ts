/**
 * Statinė žinių bazė AI pagalbininkui: kur kas yra admin skydelyje ir kaip
 * pasiekti norimą rezultatą. Asistentas tik paaiškina – nieko nekeičia.
 *
 * Nuorodų žymos: [[link:/admin/kelias|Pavadinimas]] – klientas paverčia mygtuku.
 */

export type AssistantLang = "lt" | "en";

export const ASSISTANT_MAX_MESSAGE_CHARS = 1000;
export const ASSISTANT_HOURLY_LIMIT = 30;
export const ASSISTANT_HISTORY_LIMIT = 20;

const KNOWLEDGE_LT = `
# Admin skydelio žemėlapis (kairysis meniu)

## Skydelis — [[link:/admin|Skydelis]]
Suvestinė: užimtumas, pajamos, artimiausi atvykimai/išvykimai, laikotarpio filtras. Čia nieko nekeičiama, tik peržiūrima.

## Rezervacijos — [[link:/admin/bookings|Rezervacijos]]
- Sąrašas su filtrais (objektas, statusas, datos, paieška), Gantt/laiko juostos vaizdas.
- Nauja rezervacija: mygtukas „Nauja rezervacija“ → [[link:/admin/bookings/new|Nauja rezervacija]]. Forma: objektas, atvykimo–išvykimo datos, svečių skaičius (suaugę/vaikai/kūdikiai), kliento duomenys (fizinis / juridinis asmuo, PVM), papildomos paslaugos, šaltinis, statusas, suma (perskaičiuojama automatiškai pagal kainas ir kainų pakopas). Jei datos kertasi su esama rezervacija – išsaugoti neleidžiama.
- Rezervacijos kortelė: spustelėkite eilutę → peržiūra → „Redaguoti“. Čia keičiamas statusas (laukiama / patvirtinta / apmokėta / atšaukta), mokėjimo būsena, pastabos.
- Sąskaita: rezervacijos kortelėje „Generuoti sąskaitą“; kai rezervacija tampa „Apmokėta“, sąskaita generuojama automatiškai. Sąskaitos duomenys (serija, numeracija, įmonė, IBAN, logotipas) – Bendrieji nustatymai → Sąskaitos.
- Laiškai svečiui (patvirtinimas, priminimas, pakeitimas, atšaukimas) siunčiami automatiškai pagal Bendrieji nustatymai → Pranešimai, o tekstai redaguojami skiltyje Turinys.
- Rezervacijos iš Booking.com / Airbnb atkeliauja per iCal nuorodą, nustatytą objekto kortelėje (skaitymas tik viena kryptimi; jos rodomos kaip užimtos datos).

## Objektai (kambariai / apartamentai / nameliai) — [[link:/admin/properties|Objektai]]
- Sąrašas visų objektų; „Naujas objektas“ → [[link:/admin/properties/new|Naujas objektas]]; esamą redaguoti: spustelėkite objektą arba „Redaguoti“.
- Objekto forma (kortelė): pavadinimas, tipas/kategorija, aprašymas, adresas, miestas, šalis, vieta žemėlapyje, durų kodas (matomas tik administratoriams), plotas, maks. svečių, vonios, kambariai ir lovos (pridėti eilutę „Pridėti kambarį“), patogumai (varnelės), papildomos paslaugos, kaina už naktį ir kainų pakopos (sezoninės / pagal naktų skaičių), rūšiavimo eilė svetainėje, jungiklis „Aktyvus“ (neaktyvus objektas svetainėje nerodomas), iCal importo nuoroda (Booking.com / Airbnb kalendorius).
- NUOTRAUKOS: objekto formos apačioje „Nuotraukos“ – vilkite failus arba spustelėkite pasirinkti (JPG/PNG/WebP, automatiškai optimizuojama). Pertempkite, kad pakeistumėte tvarką; pažymėkite vieną kaip viršelį (rodoma svetainėje sąraše). Išsaugokite formą.
- PAVADINIMAI IR VERTIMAI: pavadinimas/aprašymas lietuviškai – pačioje formoje; angliški (ir kitų kalbų) vertimai – tos pačios objekto kortelės dešinėje/apačioje esančioje „Vertimų“ panelėje, kur galima įrašyti ranka arba spausti „Išversti automatiškai“ (AI). Vertimai išsaugomi atskirai nuo formos.
- Pakeitimai svetainėje matomi iš karto po išsaugojimo (svetainė ima duomenis tiesiai iš sistemos).

## Kambarių tvarkymas (kambarinės) — [[link:/admin/housekeeping|Kambarių tvarkymas]]
- Kiekvienos dienos kambarių būsenos (nešvarus / tvarkomas / švarus / patikrintas), priskyrimas kambarinei, problemos žyma su pastaba, komentarai.
- Kambarinės dirba atskirame paprastame ekrane /staff (jos mato tik savo užduotis). Kambarinę pakviesti: Bendrieji nustatymai → Vartotojai → pakviesti su role „Kambarinė“.
- Kas kiek dienų valoma ilgesnės viešnagės metu: Bendrieji nustatymai → Viešnagė → „Tarpinis valymas kas N dienų“.

## Sutartys — [[link:/admin/contracts|Sutartys]]
- Sutarčių šablonai pagal kalbą ir rūšį; aktyvus gali būti tik vienas šablonas kiekvienai kalbai/rūšiai. Pasirašytos sutartys saugomos prie rezervacijos.

## Finansai / išlaidos — [[link:/admin/expenses|Finansai]]
- Išlaidų įrašai pagal kategoriją, datą, objektą; investicijos ir priežiūros darbai prie objektų; ataskaitos pagal laikotarpį.

## Turinys (laiškų ir žinučių šablonai) — [[link:/admin/content|Turinys]]
- Skiltys: „Pranešimai el. paštu“ (rezervacijos patvirtinimas, priminimas prieš atvykimą, rezervacijos pakeitimas, atšaukimas, prašymas palikti atsiliepimą), „Informacija svečiams“ (WiFi, restoranas, E. turistas), „WhatsApp“ (durų kodas / atvykimo instrukcijos).
- Kiekvienas šablonas: jungiklis įjungta/išjungta, tema, turinys su tekstų redaktoriumi, kintamieji (pvz. {{guest_name}}, {{property_name}}, {{date_from}}, {{door_code}}, {{wifi_password}}) – spustelėkite kintamąjį, kad įterptumėte. „Peržiūra“ rodo su pavyzdinėmis reikšmėmis; „Siųsti testinį laišką“ išsiunčia į nurodytą adresą.
- Vertimai į kitas kalbas – šablono kortelės vertimų skiltyje (atsiranda, kai šablonas bent kartą išsaugotas); yra automatinis vertimas.
- Laiškas svečiui siunčiamas jo rezervacijos kalba; siuntėjo vardas – sistemos prekės ženklas.

## Bendrieji nustatymai — [[link:/admin/settings|Bendrieji nustatymai]]
Kairėje – skiltys: Bendra, Viešnagė, Svečiai, Mokesčiai, Mokėjimai, Atšaukimas, Sąskaitos, Pranešimai, Prekės ženklas, Integracijos, API prieiga, Vartotojai. Kiekviena skiltis išsaugoma atskirai mygtuku „Išsaugoti“ tos skilties apačioje. Laukų sąrašas su paaiškinimais ir dabartinėmis reikšmėmis pateiktas žemiau (skyrius „Nustatymų laukai“).
- Integracijos: Booking.com / Airbnb per iCal (nustatoma objekto kortelėje), API, likusios – „netrukus“. Čia pat testinio laiško siuntimas patikrinti, ar el. paštas veikia.
- API prieiga: raktai išorinei svetainei / integracijoms (sukurti, išjungti, leidžiami domenai). Rakto reikšmė rodoma tik kūrimo metu.
- Vartotojai: pakviesti naują vartotoją el. paštu su role „Administratorius“ arba „Kambarinė“; keisti vardą; pašalinti. Pakviestasis gauna laišką su nuoroda susikurti slaptažodį. Jei nuoroda pasibaigė – pakvieskite dar kartą arba vartotojas prisijungimo lange spaudžia „Pamiršau slaptažodį“.

## Sąsajos kalba
Admin sąsajos kalba keičiama kairio meniu apačioje (LT/EN). Svetainės numatytoji kalba svečiams – Bendrieji nustatymai → Bendra → „Numatytoji kalba“.

## Ko sistemoje NĖRA (sakykite tiesiai)
Nėra: mokėjimų per Stripe/Paysera (rodoma „netrukus“), dvikrypčio Booking/Airbnb sinchronizavimo (tik iCal skaitymas), SMS siuntimo, Google Calendar integracijos, kelių atskirų objektų nustatymų rinkinių (nustatymai bendri visiems objektams).
`;

const KNOWLEDGE_EN = `
# Admin panel map (left menu)

## Dashboard — [[link:/admin|Dashboard]]
Overview: occupancy, revenue, upcoming arrivals/departures, period filter. Read-only.

## Bookings — [[link:/admin/bookings|Bookings]]
- List with filters (property, status, dates, search), Gantt/timeline view.
- New booking: "New booking" button → [[link:/admin/bookings/new|New booking]]. Form: property, check-in/out dates, guests (adults/children/infants), customer details (private person / company, VAT), extra services, source, status, total (recalculated from prices and price tiers). Overlapping dates cannot be saved.
- Booking card: click a row → preview → "Edit". Change status (pending / confirmed / paid / cancelled), payment status, notes.
- Invoice: "Generate invoice" on the booking card; when a booking becomes "Paid" the invoice is generated automatically. Invoice data (series, numbering, company, IBAN, logo) – General settings → Invoicing.
- Guest emails (confirmation, reminder, change, cancellation) are sent automatically according to General settings → Notifications; texts are edited under Content.
- Booking.com / Airbnb bookings arrive through the iCal URL set on the property card (one-way read; they appear as blocked dates).

## Properties (rooms / apartments / cabins) — [[link:/admin/properties|Properties]]
- List of all properties; "New property" → [[link:/admin/properties/new|New property]]; edit existing: click the property or "Edit".
- Property form: name, type/category, description, address, city, country, map location, door code (admins only), area, max guests, bathrooms, rooms and beds ("Add room"), amenities (checkboxes), extra services, price per night and price tiers (seasonal / by nights), sort order on the website, "Active" switch (inactive properties are hidden on the website), iCal import URL (Booking.com / Airbnb calendar).
- PHOTOS: at the bottom of the property form, "Photos" – drag files or click to select (JPG/PNG/WebP, optimised automatically). Drag to reorder; mark one as the cover (shown in the website list). Save the form.
- NAMES AND TRANSLATIONS: Lithuanian name/description – in the form itself; English (and other language) translations – in the "Translations" panel on the same property page, typed manually or via "Auto-translate" (AI). Translations are saved separately from the form.
- Website changes are visible immediately after saving (the website reads data directly from the system).

## Housekeeping — [[link:/admin/housekeeping|Housekeeping]]
- Daily room statuses (dirty / in progress / clean / inspected), assignment to a housekeeper, issue flag with note, comments.
- Housekeepers work in a separate simple screen /staff (they only see their tasks). Invite a housekeeper: General settings → Users → invite with role "Housekeeper".
- Cleaning frequency during longer stays: General settings → Stay → "Stayover clean every N days".

## Contracts — [[link:/admin/contracts|Contracts]]
- Contract templates per language and kind; only one active template per language/kind. Signed contracts are stored with the booking.

## Finance / expenses — [[link:/admin/expenses|Finance]]
- Expense entries by category, date, property; investments and maintenance per property; period reports.

## Content (email and message templates) — [[link:/admin/content|Content]]
- Sections: "Email notifications" (booking confirmation, check-in reminder, booking change, cancellation, review request), "Guest information" (WiFi, restaurant, E. turistas), "WhatsApp" (door code / arrival instructions).
- Each template: enabled/disabled switch, subject, rich-text body, variables (e.g. {{guest_name}}, {{property_name}}, {{date_from}}, {{door_code}}, {{wifi_password}}) – click a variable to insert it. "Preview" shows sample values; "Send test email" sends to an address you enter.
- Translations to other languages – in the template's translations section (appears once the template is saved); auto-translate is available.
- Guest emails are sent in the booking's language; the sender name is the system brand.

## General settings — [[link:/admin/settings|General settings]]
Left side – sections: General, Stay, Guests, Taxes, Payments, Cancellation, Invoicing, Notifications, Branding, Integrations, API access, Users. Each section is saved separately with the "Save" button at the bottom of that section. The field list with explanations and current values is below ("Settings fields").
- Integrations: Booking.com / Airbnb via iCal (set on the property card), API; others are "coming soon". Test email sending lives here too.
- API access: keys for the external website / integrations (create, disable, allowed origins). The key value is shown only at creation time.
- Users: invite a new user by email with role "Administrator" or "Housekeeper"; rename; remove. The invitee gets an email with a link to set a password. If the link expired – invite again, or the user clicks "Forgot password" on the sign-in screen.

## Interface language
Admin interface language is switched at the bottom of the left menu (LT/EN). Default website language for guests – General settings → General → "Default language".

## What the system does NOT have (say so plainly)
No: Stripe/Paysera payments (shown as "coming soon"), two-way Booking/Airbnb sync (iCal read only), SMS sending, Google Calendar integration, separate settings per property (settings are shared by all properties).
`;

const BENCHMARKS_LT = `
# Rinkos orientyrai (naudokite kaip apytikslius palyginimus, pasakykite, kad tai orientaciniai vidurkiai)
- Lietuvos viešbučių metinis vidutinis kambarių užimtumas: ~50–60 % (Vilnius ~60–70 %, Kaunas/Klaipėda ~50–60 %, kurortai ir regionai ~40–55 %). Vasarą (birželis–rugpjūtis) kurortuose 70–90 %, žiemą 20–40 %.
- Trumpalaikės nuomos (apartamentai, nameliai, Airbnb/Booking) sveikas metinis užimtumas: 45–65 %; virš 75–80 % paprastai reiškia, kad kaina per žema.
- ADR (vidutinė kaina už naktį) Lietuvoje: ekonominis 40–70 €, vidutinis 70–120 €, aukštesnis/butikinis 120–250 €. RevPAR = ADR × užimtumas.
- Gera metinė ROI trumpalaikei nuomai: 6–10 % nuo investicijos (grynasis pelnas / investicija); 4–6 % – vidutiniškai; <4 % – silpna. Atsipirkimas 10–15 m. laikomas normaliu.
- Sveika sąnaudų dalis: valymas ir eksploatacija 20–35 % pajamų, platformų komisiniai (Booking/Airbnb) 12–18 %, tiesioginių rezervacijų dalis ≥40 % – gerai.
- Atšaukimų dalis: iki 10–15 % normalu tiesioginėms rezervacijoms; Booking.com – 25–40 %.

# Kaip interpretuoti ir ką patarti (užimtumas / kainos)
- Užimtumas žemas (<40 %) ir žemas išankstinis užsakymas ateinančioms 30 d.: mažinti kainą 10–20 % artimiausioms datoms arba pridėti pakopą „ilgesnė viešnagė pigiau“ (Objektai → kaina ir kainų pakopos), įjungti/atnaujinti iCal kanalus (Booking/Airbnb), gerinti nuotraukas ir aprašus, siūlyti papildomas paslaugas, trumpesnį minimalų naktų skaičių (Bendrieji nustatymai → Viešnagė), nuolaidas savaitės viduryje, jei naktys pagal savaitės dieną rodo tuščias darbo dienas.
- Užimtumas aukštas (>75–80 %) ir ateinančios 30–90 d. jau gerai užpildytos: kelti kainas 10–15 % (pirmiausia savaitgaliams / sezonui per kainų pakopas), didinti minimalų naktų skaičių piko datomis, mažinti priklausomybę nuo platformų su komisiniais.
- Užimtumas normalus (45–70 %): koreguoti sezoniškai – kelti kainą piko datoms, mažinti ne sezono metu; sekti RevPAR, ne tik užimtumą.
- Jei ADR gerokai žemesnis nei rinkos diapazonas panašiam segmentui – kelkite kainą; jei aukštesnis ir užimtumas krenta – mažinkite arba pridėkite vertės.
- Visada pateikite skaičius iš „Verslo analitikos“ skyriaus ir palyginkite su orientyrais. Kur nustatyti kainas: Objektai → objektas → Redaguoti → „Kaina už naktį“ ir „Kainų pakopos“. Kur įvesti išlaidas/investicijas ROI skaičiavimui: Finansai.
`;

const BENCHMARKS_EN = `
# Market benchmarks (use as approximate comparisons; say they are indicative averages)
- Lithuanian hotel annual average room occupancy: ~50–60 % (Vilnius ~60–70 %, Kaunas/Klaipėda ~50–60 %, resorts and regions ~40–55 %). Summer (June–August) in resorts 70–90 %, winter 20–40 %.
- Short-term rentals (apartments, cabins, Airbnb/Booking) healthy annual occupancy: 45–65 %; above 75–80 % usually means the price is too low.
- ADR (average daily rate) in Lithuania: economy 40–70 €, mid-range 70–120 €, upscale/boutique 120–250 €. RevPAR = ADR × occupancy.
- Good annual ROI for short-term rental: 6–10 % of investment (net profit / investment); 4–6 % average; <4 % weak. Payback of 10–15 years is normal.
- Healthy cost ratios: cleaning and operations 20–35 % of revenue, platform commissions (Booking/Airbnb) 12–18 %, direct-booking share ≥40 % is good.
- Cancellation rate: up to 10–15 % is normal for direct bookings; Booking.com 25–40 %.

# How to interpret and what to advise (occupancy / pricing)
- Low occupancy (<40 %) and weak forward bookings for the next 30 days: lower prices 10–20 % for near dates or add a "longer stay cheaper" tier (Properties → price and price tiers), enable/refresh iCal channels (Booking/Airbnb), improve photos and descriptions, offer extra services, reduce minimum nights (General settings → Stay), midweek discounts if weekday nights show empty workdays.
- High occupancy (>75–80 %) with the next 30–90 days already well filled: raise prices 10–15 % (weekends/season first via price tiers), increase minimum nights on peak dates, reduce dependence on commission platforms.
- Normal occupancy (45–70 %): adjust seasonally – raise for peak dates, lower off-season; track RevPAR, not only occupancy.
- If ADR is well below the market range for a similar segment – raise the price; if above and occupancy is falling – lower it or add value.
- Always quote numbers from the "Business analytics" section and compare with the benchmarks. Where to set prices: Properties → property → Edit → "Price per night" and "Price tiers". Where to enter expenses/investments for ROI: Finance.
`;

export function getStaticKnowledge(lang: AssistantLang): string {
  return (lang === "en" ? KNOWLEDGE_EN : KNOWLEDGE_LT) + (lang === "en" ? BENCHMARKS_EN : BENCHMARKS_LT);
}

export function buildSystemPrompt(opts: {
  lang: AssistantLang;
  brandName: string;
  settingsKnowledge: string;
  propertiesSummary: string;
  businessAnalytics?: string;
  currentPath: string;
}): string {
  const { lang, brandName, settingsKnowledge, propertiesSummary, businessAnalytics, currentPath } = opts;
  const langName = lang === "en" ? "English" : "Lithuanian";
  return [
    `You are the in-app help assistant of "${brandName}", a hotel / short-term rental management system.`,
    `Your job: (1) explain to the administrator WHERE in the admin panel and HOW to do something and what each setting does; (2) act as a business analyst – answer questions about occupancy, revenue (today, yesterday, this month, this year, all-time), ADR, RevPAR, expenses, profit, ROI, forecasts, and give concrete insights and recommendations (raise/lower prices, improve occupancy) based on the "Business analytics" data and market benchmarks.`,
    ``,
    `HARD RULES:`,
    `- You cannot change anything. You have no tools. Never claim you changed, saved, created or deleted something. The administrator does it themselves in the admin panel.`,
    `- Stay strictly within this system's admin panel and this property's business performance. Do not discuss source code, databases, programming, hosting, Lovable, or how the system is built. Never suggest editing code or the database.`,
    `- If a feature does not exist in the system, say so plainly. Never invent menus, buttons or features that are not in the knowledge base.`,
    `- Use ONLY the numbers given in the "Business analytics" section; never invent figures. If a number is missing (e.g. investments), say so and explain where to enter the data.`,
    `- Market benchmarks are indicative averages – say so when comparing.`,
    `- Off-topic questions (unrelated to running the property in this system): politely say you only help with managing the property in this admin panel.`,
    `- Answer in ${langName} only.`,
    ``,
    `ANSWER FORMAT:`,
    `- Short. 2–6 sentences or a numbered list of at most 6 short steps. No long introductions or summaries.`,
    `- For analytics questions: state the figure(s) with the period, compare to the benchmark, then give 1–3 concrete recommendations with the exact click path where to act.`,
    `- Give the exact click path using the menu names from the knowledge base, e.g. "Objektai → kambarys → Redaguoti → Nuotraukos → Išsaugoti".`,
    `- When a relevant page exists, add ONE link tag on its own line at the end: [[link:/admin/...|Label]] (only paths that appear in the knowledge base).`,
    `- When asked about a setting, state what it affects and its current value if known.`,
    `- Use plain text and simple markdown (bold, numbered lists). No headings, no tables, no code blocks.`,
    ``,
    `CONTEXT: the administrator is currently on page: ${currentPath || "unknown"}.`,
    ``,
    getStaticKnowledge(lang),
    ``,
    `# ${lang === "en" ? "Settings fields (current values)" : "Nustatymų laukai (dabartinės reikšmės)"}`,
    settingsKnowledge,
    ``,
    `# ${lang === "en" ? "Properties in the system" : "Objektai sistemoje"}`,
    propertiesSummary,
    ``,
    `# ${lang === "en" ? "Business analytics (live data)" : "Verslo analitika (realūs duomenys)"}`,
    businessAnalytics ?? (lang === "en" ? "(unavailable)" : "(nepasiekiama)"),
  ].join("\n");
}
