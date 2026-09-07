// Server-only: check if an email domain has MX (or A/AAAA) records via DoH.
// Cloudflare DNS-over-HTTPS works inside Cloudflare Workers (the Node `dns`
// module is not available there).

const CACHE = new Map<string, { ok: boolean; expires: number }>();
const TTL_MS = 10 * 60 * 1000;

type DoHAnswer = { type: number; data: string };
type DoHResponse = { Status: number; Answer?: DoHAnswer[] };

async function dohQuery(name: string, type: "MX" | "A" | "AAAA"): Promise<DoHAnswer[]> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetch(url, { headers: { accept: "application/dns-json" } });
  if (!res.ok) throw new Error(`DoH ${type} ${res.status}`);
  const data = (await res.json()) as DoHResponse;
  if (data.Status !== 0) return [];
  return data.Answer ?? [];
}

export async function hasMxRecord(domain: string): Promise<boolean> {
  const d = domain.toLowerCase().trim();
  if (!d || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(d)) return false;
  const now = Date.now();
  const cached = CACHE.get(d);
  if (cached && cached.expires > now) return cached.ok;
  let ok = false;
  try {
    const mx = await dohQuery(d, "MX");
    if (mx.length > 0) {
      ok = true;
    } else {
      // Fallback: per RFC 5321, A/AAAA acts as implicit MX.
      const [a, aaaa] = await Promise.all([dohQuery(d, "A"), dohQuery(d, "AAAA")]);
      ok = a.length > 0 || aaaa.length > 0;
    }
  } catch (e) {
    console.error("[email-domain] DoH lookup failed", d, e);
    // Fail-open on DNS infra outage so legitimate users aren't blocked.
    ok = true;
  }
  CACHE.set(d, { ok, expires: now + TTL_MS });
  return ok;
}
