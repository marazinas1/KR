# Šablonų vertimai ir laiškai svečio kalba

## Ką gaus vartotojas
- Skiltyje „Turinys" prie kiekvieno išsaugoto šablono atsiranda vertimų panelė (ta pati, kuri jau veikia objektams): verčiama „Laiško tema" ir „Turinys".
- Neišsaugotam šablonui rodomas paaiškinimas, kad vertimus bus galima suvesti po pirmo išsaugojimo.
- Svečiui laiškas siunčiamas ta kalba, kuri išsaugota rezervacijoje. Trūkstant vertimo — originalo kalba (niekada ne tuščias laiškas).
- Administratoriaus pranešimas lieka lietuviškas.

## Techniniai pakeitimai
1. `src/lib/content-templates.ts` — `ContentTemplateRecord` papildomas lauku `id: string | null`; `defaultsFor()` grąžina `id: null`.
2. `src/lib/content-templates.server.ts` — `rowToRecord` grąžina `id` iš DB eilutės.
3. `src/components/admin/content/ContentTemplateCard.tsx` — po `</form>` (kad mygtukas nesubmitintų šablono formos) renderinama `TranslationPanel` su `entityType="content_template"`, `entityId={record.id}`, laukais „Laiško tema" (`subject`, tik kai `def.hasSubject`) ir „Turinys" (`content`, multiline), originalais iš `record`. Kai `record?.id` nėra — informacinė eilutė.
4. `src/lib/translations.ts` — `isAllowedField` leidžia `content_template` tipui tik `subject` ir `content`.
5. `src/lib/notifications.server.ts` — `loadTemplate(name, lang?)`: į `select` pridedamas `id`; kai `lang` skiriasi nuo numatytosios kalbos, per `loadTranslations("content_template", [id], lang)` perrašomi `subject`/`content`, jei vertimas netuščias. `notifyBookingEvent` perduoda `booking.language` kaip svečio kalbą.

## Ko neliečiame
Viešojo API, `buildTokens`, `isPaid`, ONE_SHOT sąrašo, dublikatų žurnalo ir `ADMIN_SUBJECTS`.
