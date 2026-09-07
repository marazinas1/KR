# Use Lumidenta typography throughout the application

## Goal
Apply Lumidenta’s typography system consistently to the public website, sign-in screens, tenant/staff areas, and the full admin interface, without changing layouts, colors, content, or application behavior.

## Changes
1. Add the same locally bundled variable font used by Lumidenta: **Manrope Variable**.
2. Replace the current Inter and Cormorant Garamond font imports with the Manrope package.
3. Set both global typography roles—body text and headings/display text—to Manrope, matching Lumidenta’s setup.
4. Apply the global font at the document body level so admin, authentication, staff/tenant, dialogs, forms, tables, and shared controls inherit it automatically.
5. Keep the public-site typography tokens aligned with the same Manrope family so public pages cannot fall back to the previous serif heading font.
6. Remove the now-unused Inter and Cormorant Garamond font dependencies.

## Technical details
- Update `package.json`/lockfile dependencies to include `@fontsource-variable/manrope` and remove the two superseded font packages.
- Update `src/styles.css` imports and `--font-sans` / `--font-display` tokens.
- Preserve existing font sizes, weights, spacing, colors, and component structure; this task changes only the font family.

## Verification
- Confirm there are no remaining Inter or Cormorant font imports/references in application source.
- Verify the computed font family is Manrope on the public page, `/admin`, and `/auth`.
- Check desktop and narrow mobile rendering for text clipping or layout regressions.
- Confirm the preview has no new console errors and the project validation passes.

Nothing else in this task.
