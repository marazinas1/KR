# Resend jungties prijungimas prie projekto

Naujoji Resend jungtis („Revoo demo“) sukurta darbo srityje, bet dar nėra susieta su šiuo projektu, todėl laiškų siuntimas kol kas neveiktų.

## Ką padarysiu

1. Atidarysiu jungties pasirinkimo kortelę ir susiesiu pasirinktą Resend jungtį su šiuo projektu (sąraše bus „Revoo demo“ bei kitos esamos jungtys).
2. Po susiejimo patikrinsiu, kad jungties raktas tikrai pasiekiamas projekte.
3. Atliksiu Resend kredencialų patikrą (verify), kad įsitikintume, jog raktas veikia.

## Techninės detalės

- Kodo keisti nereikia: `src/lib/notifications.server.ts` ir `src/lib/email-test.functions.ts` jau siunčia per Lovable connector gateway naudodami `RESEND_API_KEY` + `LOVABLE_API_KEY`. Šis kintamasis atsiranda automatiškai, kai jungtis susiejama su projektu.
- `RESEND_FROM_EMAIL` jau nustatytas; siuntėjo domenas turi būti patvirtintas Resend paskyroje, kitaip laiškai grįš su 403.

## Patikra

- Administravimo skydelio Nustatymai → El. pašto patikra: išsiunčiamas testinis laiškas ir gaunamas `ok` su laiško ID.
