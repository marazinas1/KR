# Favicon (KR) + grouped admin menu

## 1. Favicon still shows "D"

What I checked: the icon file in the project is already the KR mark, and the published site returns that same KR image at `/favicon.png`. So the file is right — the "D" you see is the browser holding on to the old icon, helped by two gaps:

- There is no `/favicon.ico` at all (the address returns "not found"). Browsers and tab-restore still ask for that address first and, when it fails, keep whatever icon they cached earlier.
- There is no Apple touch icon and no explicit icon sizes, so pinned tabs and phone home screens have nothing to refresh from.

What will be done:

- Produce a crisper KR mark rendered for small sizes (a clean square, dark "KR" on the cream background, readable at 16px).
- Ship it as `favicon.ico` (16/32/48 in one file), `favicon.png` (a 64px version), `favicon-512.png`, and `apple-touch-icon.png` (180px).
- Reference all of them from the app head with a version marker on the address, which forces every browser to fetch the new icon instead of the cached "D".
- Add a small web app manifest so the phone home-screen icon and app name are KR / Kazimieras ir Rapolas rather than a generic one.

After this you may still need one hard refresh; from then on the KR icon sticks for everyone.

## 2. Admin menu grouping

Today the left menu is one flat list of 13 items with no headings, so "Skydelis", "Sąskaitos" and "Bendrieji nustatymai" all have the same visual weight. The reference project groups the same kind of list under short headings — that is the model here.

Proposed grouping (nothing is removed or renamed, only ordered and labelled):

```text
APŽVALGA          what needs attention now
  Skydelis
  Užklausos            (new inquiries from the public site)
  Gedimai              (open faults)

NUOMA             the portfolio and the people in it
  Butai
  Nuomininkai
  Sutartys

FINANSAI          money in and out
  Mokesčiai
  Sąskaitos
  Išlaidos             (currently labelled "Finansai")

ANALIZĖ
  Analitika

SISTEMA           owner-only, set up once
  Vartotojai
  Bendrieji nustatymai
  Turinys
```

Reasoning for Rapolas' morning routine: the first group is everything that changed since yesterday and needs a decision; the second is the portfolio he edits during the week; the third is the monthly billing cycle; the last is configuration he touches rarely. Owner-only entries stay owner-only — a manager simply does not see the "Sistema" group, and if a group ends up with no visible items its heading disappears too.

Alongside the grouping, small quality touches in the same pass:

- Counters on "Užklausos" (new inquiries) and "Gedimai" (open faults) so the two things that arrive on their own are visible without clicking. They reuse the numbers the dashboard already calculates.
- The current page keeps the existing black highlight; group headings are small, spaced, grey uppercase to match the rest of the design.
- The mobile drawer uses exactly the same grouping.
- The bottom block (account, language, back to site, sign out) stays where it is.

## Technical notes

- Icons: generate one square source, then produce `public/favicon.ico`, `public/favicon.png`, `public/favicon-512.png`, `public/apple-touch-icon.png` with ImageMagick; declare them plus `manifest.webmanifest` in `head().links` of `src/routes/__root.tsx` with a `?v=2` cache-buster.
- Menu: replace the flat `links` array in `src/routes/_authenticated/admin.tsx` with a `GROUPS: { labelKey, items }[]` structure, filtering by `role.isOwner` per item and dropping empty groups; render group headings in both the desktop `aside` and the `Sheet`. No routing, permission or data change.
- Badges: reuse the existing dashboard server function's open-issue and new-inquiry counts through the query cache; no new server function, no new query on every page load beyond the one the dashboard already makes.
- New translation keys `nav.group.*` in `lt.json` and `en.json`; "Išlaidos" label corrected in both.
