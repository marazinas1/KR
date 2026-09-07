# Durų kodo laiško pašalinimas ir atvykimo priminimo patikra

## 1. Pašalinti „durų kodo" laišką

Laiškas („… apmokėta — durų kodas") siunčiamas, kai rezervacijos statusas pakeičiamas į „Patvirtinta". Pašalinsiu jį visiškai:

- išimsiu automatinį siuntimą keičiant statusą (`src/lib/bookings.functions.ts`);
- pašalinsiu `door_code_delivery` tipą iš pranešimų variklio (`src/lib/notifications.server.ts`);
- ištrinsiu šabloną iš duomenų bazės, kad jo nebeliktų ir turinio įrašuose.

WhatsApp žinutė „Durų kodas" ir kintamasis `{{door_code}}` kituose laiškuose lieka nepakitę.

## 2. „Priminimas prieš atvykstant" — kodėl nesiunčiamas

Patikrinau:

- valandinis planuotojas veikia ir kviečia priminimų užduotį;
- jungiklis Bendruosiuose nustatymuose įjungtas, priminimas nustatytas likus 1 val. iki atvykimo;
- **bet šablono „Priminimas prieš atvykimą" įrašo duomenų bazėje nėra** — jis niekada nebuvo išsaugotas skiltyje „Turinys". Todėl svečiui laiškas nesiunčiamas (nueina tik kopija administratoriui).

Sprendimas: įrašyti numatytąjį šio laiško turinį (tema + tekstas su `{{door_code}}`, `{{wifi_name}}`, `{{location}}`), kad kortelė „Turinys" būtų užpildyta ir siuntimas veiktų. Vėliau tekstą galėsite laisvai redaguoti.

Papildomai pasiūlymas apsvarstyti: 1 valanda iki atvykimo yra labai vėlu — įprasta 24 val. Galiu pakeisti, jei norite.

## 3. Testinis laiškas

Išsiųsiu testinį „Priminimas prieš atvykimą" laišką į vasiliauskas.mantas88@gmail.com ir patvirtinsiu rezultatą iš siuntimo žurnalo.

Pastaba: nurodytas adresas žinutėje buvo `vasiliausas.mantas88@gmail.com` (be „k"). Naudosiu sistemoje jau esantį `vasiliauskas.mantas88@gmail.com`.