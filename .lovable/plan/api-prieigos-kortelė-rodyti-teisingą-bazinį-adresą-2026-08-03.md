# API prieigos kortelė: rodyti teisingą bazinį adresą

## Problema

Kortelėje „Bazinis API adresas“ adresas sudaromas iš naršyklės adreso (`window.location.origin`). Kai nustatymus atidarote Lovable redaktoriuje, tai yra laikinas preview adresas (`...lovableproject.com`), kurio klientinei svetainei perduoti negalima — jis keičiasi ir veikia tik redaguojant.

## Sprendimas

Vietoje vieno adreso rodyti **tris aiškiai pažymėtus** adresus, kiekvieną su savo kopijavimo mygtuku:

| Etiketė | Adresas | Paaiškinimas po ja |
|---|---|---|
| Gamybai (rekomenduojama) | `https://project--<project-id>.lovable.app/api/public/v1` | Stabilus — nesikeis net pervadinus projektą |
| Publikuotas adresas | `https://dharmastay.lovable.app/api/public/v1` | Keisis, jei pakeisite projekto pavadinimą |
| Testavimui | `https://project--<project-id>-dev.lovable.app/api/public/v1` | Preview versija, prieš publikavimą |

Papildomai:
- Trumpas paaiškinimas kortelės viršuje: „Šį adresą perduokite klientinei svetainei kaip `RENTIVO_API_URL`.“
- Jei atidaryta iš preview lango, po adresais rodomas įspėjimas: „Dabar esate peržiūros lange — nekopijuokite naršyklės adreso, naudokite gamybinį adresą aukščiau.“
- Adresai rodomi pilnai (be nukirpimo `…`), kad matytųsi ką kopijuojate.

## Techninės pastabos

- Projekto ID imamas iš `import.meta.env.VITE_SUPABASE_PROJECT_ID` neatitinka Lovable projekto ID, todėl gamybinis/dev adresas įrašomas kaip konstanta faile `src/components/admin/settings/ApiAccessSection.tsx` (projekto ID: `3b144e50-7336-4c5e-a93d-7aeca70328ba`).
- Keičiamas tik šis vienas komponentas; API endpointai ir raktų logika nekeičiami.