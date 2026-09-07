# Minimal Demo Page

Replace the placeholder index route with a single, blank page that displays the word "Demo" and nothing else. No backend, no database, no auth, and no extra pages.

## What to change
1. Rewrite `src/routes/index.tsx`:
   - Center the word "Demo" on a full-screen blank page using Tailwind utilities.
   - Remove the placeholder image and the `data-lovable-blank-page-placeholder` attribute.
   - Add a `head()` with title "Demo", description, `og:title`, `og:description`, and `twitter:card`.

2. Leave the rest of the codebase untouched:
   - Keep the existing TanStack Start + TypeScript + Tailwind setup.
   - Do not add any server functions, routes, database tables, or auth.

## Verification
- Run the dev build and confirm `/` renders only the centered word "Demo".
- Confirm no new routes appear in `src/routeTree.gen.ts` and no backend dependencies are added.
