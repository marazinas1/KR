/**
 * Canonical lease-contract placeholders.
 *
 * One list, used by the template editor (the chips a manager inserts) and by
 * the server-side filler. Adding a variable anywhere else is a bug.
 *
 * Two categories, deliberately separate:
 *
 * - BLOCKING_VARS — real data that must exist before a contract can be printed
 *   (rent, deposit, start date, landlord details, unit address). If one of
 *   these is empty the generation is blocked and the manager is told what to
 *   fill in first.
 *
 * - MANUAL_VARS — fields that are legitimately blank at print time and are
 *   written on the paper copy by hand. The tenant's personal code is the main
 *   one: only an owner may read it (`tenant_identity` is owner-only by RLS), so
 *   a manager generating a contract gets a blank line marked "pildoma ranka".
 *   That is a design decision, not an error, and it NEVER blocks generation.
 */

export const CONTRACT_VARS = [
  "nuomotojas",
  "nuomotojo_kodas",
  "nuomotojo_adresas",
  "nuomotojo_saskaita",
  "nuomotojo_bankas",
  "nuomininkas",
  "nuomininko_asmens_kodas",
  "nuomininko_telefonas",
  "nuomininko_el_pastas",
  "kartu_gyvenantys",
  "objektas",
  "objekto_adresas",
  "objekto_plotas",
  "objekto_kambariai",
  "sutarties_pradzia",
  "sutarties_pabaiga",
  "nuomos_mokestis",
  "depozitas",
  "mokejimo_diena",
  "ispejimo_terminas",
  "data",
  "miestas",
] as const;

export type ContractVar = (typeof CONTRACT_VARS)[number];

/** Empty value here stops generation. */
export const BLOCKING_VARS: ContractVar[] = [
  "nuomotojas",
  "nuomotojo_adresas",
  "nuomininkas",
  "objektas",
  "objekto_adresas",
  "sutarties_pradzia",
  "nuomos_mokestis",
  "depozitas",
  "mokejimo_diena",
];

/** Empty value here is expected and is filled in by hand on the printed copy. */
export const MANUAL_VARS: ContractVar[] = [
  "nuomininko_asmens_kodas",
  "nuomotojo_kodas",
  "nuomotojo_saskaita",
  "nuomotojo_bankas",
];

/** What a blank manual field looks like in the generated PDF. */
export const MANUAL_PLACEHOLDER = "________________ (pildoma ranka)";

export const isBlockingVar = (k: string) => BLOCKING_VARS.includes(k as ContractVar);
export const isManualVar = (k: string) => MANUAL_VARS.includes(k as ContractVar);
