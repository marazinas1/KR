# First login + role hierarchy

Confirmed by querying the live backend: there are currently **zero user accounts**, so nobody can sign in to the admin panel yet. The role list in the database is `admin, user, housekeeper, developer, owner, administrator` — leftovers from the previous project, and no `tenant` role exists.

## What will be done

### 1. Your account
Create `rutkusmarius@gmail.com` as the very first account with the **developer** role, and email you a link to set your own password. Nothing else in the app changes for this.

### 2. Clean up the role list
Final hierarchy, top to bottom:

| Role | Who | What they can do |
|---|---|---|
| developer | Revoo | Everything. Cannot be changed or removed by anyone else. |
| owner | Kazimieras, Rapolas | Everything except touching a developer. Manages users and settings. |
| administrator | Staff | Full day-to-day admin panel: all requests, events, notifications, units, tenants, readings, faults, invoices. No user management, no settings, no deletions. |
| tenant | Renters | Only their own unit: submit meter readings, report a fault, send a message, see their lease and balance. |

Changes: add `tenant`, and stop using the leftover `housekeeper`, `admin`, `user` values anywhere in the app. (The old values stay in the database type itself — removing a value from a list like this is not safely reversible — but no code will assign or check them, and no account will hold them.)

### 3. Update the app to match
- The permission check that the whole admin panel relies on gets the four-role hierarchy: developer > owner > administrator > tenant.
- Administrator gets full admin-panel access (currently equivalent), owner keeps settings and user management, developer sits above owner.
- Anyone with the tenant role who lands on `/admin` is sent to the tenant portal instead of seeing the panel.
- The invite form in Settings offers `owner`, `administrator`, `tenant` (a developer can also invite a developer); the leftover housekeeper option is removed.
- Role names shown on screen are translated in both languages.

Nothing about the tenant portal screens themselves is built in this task — only the role that will drive them.

## Technical notes

- Migration: `ALTER TYPE app_role ADD VALUE 'tenant'`; keep `has_role`/`is_developer` as-is; add `is_administrator`-style helper only if a policy needs it later.
- `getMyRole` in `src/lib/properties.functions.ts`: return `isDeveloper`, `isOwner`, `isAdmin` (developer|owner|administrator), `isTenant`; drop `admin`/`housekeeper` fallbacks.
- `src/routes/_authenticated/admin.tsx`: replace the `housekeeper` → `/staff` redirect with `tenant` → tenant portal; keep owner-only nav items.
- `src/lib/users.functions.ts`: invite role enum becomes `owner | administrator | tenant` (+ `developer` when the caller is a developer); keep `assertNotDeveloperTarget`; make the invite email text neutral (currently hardcodes "Dharma Stay", which breaks the white-label rule).
- Account creation itself is done with the Auth admin API plus a `user_roles` row — not written into a migration (rule 5.4).
- No client data goes into any SQL file.
