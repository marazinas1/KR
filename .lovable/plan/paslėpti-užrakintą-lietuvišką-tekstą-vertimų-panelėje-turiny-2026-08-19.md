# Paslėpti užrakintą lietuvišką tekstą vertimų panelėje (Turinys)

## Ką gaus vartotojas
- Skiltyje „Turinys" prie kiekvieno šablono, vertimų panelėje („Vertimai"), nebebus rodomas pilkas, užrakintas lietuviškas originalas po laukais „Laiško tema" ir „Turinys".
- Lieka tik EN įvesties laukai, kintamųjų juosta, „Išsaugoti" ir „Auto-versti" mygtukai.
- Lietuviškas tekstas viršuje, pačioje šablono formoje, rodomas kaip anksčiau — nieko nekeičiame.
- Objektų kortelėse vertimų panelė lieka nepakitusi (originalai matomi).

## Techniniai pakeitimai
1. `src/components/admin/TranslationPanel.tsx` — pridedamas neprivalomas prop `hideOriginals?: boolean`. Kai `true`, laukų cikle nerenderinami originalo blokai (nei HTML `dangerouslySetInnerHTML` peržiūra, nei paprasto teksto blokas). `originals` propas paliekamas — jis vis tiek reikalingas automatiniam vertimui.
2. `src/components/admin/content/ContentTemplateCard.tsx` — `<TranslationPanel ... hideOriginals />`.

Jokių pakeitimų vertimų saugojimo, auto-vertimo ar laiškų siuntimo logikoje.
