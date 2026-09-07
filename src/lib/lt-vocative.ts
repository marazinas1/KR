// Apytikslis lietuviškų vardų/pavardžių šauksmininko (vocative) linksnio
// formavimas — padengia dažniausius linksniavimo modelius. Neatpažintos ar
// svetimos formos paliekamos nepakeistos (saugus atsarginis variantas).

function vocativeWord(word: string): string {
  if (!word || word.length < 3) return word;

  if (word.includes("-")) {
    return word.split("-").map(vocativeWord).join("-");
  }

  const lower = word.toLowerCase();
  const cap = (rest: string) => word[0] + rest.slice(1);

  if (lower.endsWith("as")) return cap(lower.slice(0, -2) + "ai");
  if (lower.endsWith("us")) return cap(lower.slice(0, -2) + "au");
  if (lower.endsWith("ys")) return cap(lower.slice(0, -2) + "y");
  if (lower.endsWith("is")) return cap(lower.slice(0, -2) + "i");
  if (lower.endsWith("ė")) return cap(lower.slice(0, -1) + "e");

  // "-a" pabaiga (dažniausiai moteriški vardai) — šauksmininkas
  // šnekamojoje/šiuolaikinėje kalboje sutampa su vardininku, nekeičiama.
  return word;
}

/** Paverčia pilną vardą (vardas + pavardė, kiekvienas žodis atskirai) į šauksmininko linksnį. */
export function toVocative(fullName: string): string {
  const parts = String(fullName ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "";
  return parts.map(vocativeWord).join(" ");
}
