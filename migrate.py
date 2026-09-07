#!/usr/bin/env python3
"""
Perkelia 17 objektu ir ju nuotraukas i TAVO Supabase baze.

Paleidimas:
    cd ~/Desktop/demo-rentals
    python3 migrate.py

Reikia: .env faile SUPABASE_URL ir SUPABASE_PUBLISHABLE_KEY (jie ten jau yra),
        ir tavo admin prisijungimo (klaus paleidus).
"""

import json, os, sys, time, getpass, mimetypes
import urllib.request, urllib.error

JSON_PATH = os.path.expanduser("~/Desktop/dharma-properties.json")
BUCKET = "car-images"
SKIP_FIELDS = {"door_code", "ical_import_url", "ical_last_sync_at", "ical_last_status"}


def read_env():
    env = {}
    if not os.path.exists(".env"):
        sys.exit("KLAIDA: .env nerastas. Paleisk is ~/Desktop/demo-rentals aplanko.")
    for line in open(".env"):
        if "=" in line and not line.strip().startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    url = env.get("SUPABASE_URL")
    key = env.get("SUPABASE_PUBLISHABLE_KEY")
    if not url or not key:
        sys.exit("KLAIDA: .env truksta SUPABASE_URL arba SUPABASE_PUBLISHABLE_KEY.")
    return url.rstrip("/"), key


def request(url, method="GET", data=None, headers=None, timeout=120):
    req = urllib.request.Request(url, data=data, method=method)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, r.read()


def sign_in(url, key, email, password):
    body = json.dumps({"email": email, "password": password}).encode()
    try:
        _, raw = request(
            f"{url}/auth/v1/token?grant_type=password",
            "POST", body,
            {"apikey": key, "Content-Type": "application/json"},
        )
    except urllib.error.HTTPError as e:
        sys.exit(f"Prisijungti nepavyko ({e.code}). Patikrink el. pasta ir slaptazodi.")
    return json.loads(raw)["access_token"]


def main():
    if not os.path.exists(JSON_PATH):
        sys.exit(f"KLAIDA: nerastas {JSON_PATH}")

    props = json.load(open(JSON_PATH))
    url, key = read_env()
    print(f"Tavo Supabase: {url}")
    print(f"Objektu perkelsim: {len(props)}\n")

    email = input("Admin el. pastas: ").strip()
    password = getpass.getpass("Slaptazodis: ")
    token = sign_in(url, key, email, password)
    print("Prisijungta.\n")

    auth = {"apikey": key, "Authorization": f"Bearer {token}"}

    # 1) Nuotraukos
    all_urls = []
    for p in props:
        if p.get("cover_image_url"):
            all_urls.append(p["cover_image_url"])
        all_urls.extend(p.get("image_urls") or [])
    all_urls = list(dict.fromkeys(all_urls))

    print(f"1/2  Nuotraukos ({len(all_urls)} vnt.) - tai uztruks kelias minutes\n")
    mapping, failed = {}, []
    for i, old in enumerate(all_urls, 1):
        marker = f"/{BUCKET}/"
        if marker not in old:
            failed.append((old, "neatpazintas adresas")); continue
        path = old.split(marker, 1)[1].split("?")[0]
        try:
            _, blob = request(old)
            ctype = mimetypes.guess_type(path)[0] or "application/octet-stream"
            request(
                f"{url}/storage/v1/object/{BUCKET}/{path}", "POST", blob,
                {**auth, "Content-Type": ctype, "x-upsert": "true"},
            )
            mapping[old] = f"{url}/storage/v1/object/public/{BUCKET}/{path}"
            print(f"  [{i}/{len(all_urls)}] {os.path.basename(path)}")
        except urllib.error.HTTPError as e:
            failed.append((old, f"HTTP {e.code}"))
            print(f"  [{i}/{len(all_urls)}] NEPAVYKO: {os.path.basename(path)} ({e.code})")
        except Exception as e:
            failed.append((old, str(e)))
            print(f"  [{i}/{len(all_urls)}] NEPAVYKO: {os.path.basename(path)}")
        time.sleep(0.05)

    print(f"\n  Ikelta: {len(mapping)} | Nepavyko: {len(failed)}\n")

    # 2) Objektai
    print(f"2/2  Objektai ({len(props)} vnt.)\n")
    ok = 0
    for p in props:
        row = {k: v for k, v in p.items() if k not in SKIP_FIELDS}
        if row.get("cover_image_url"):
            row["cover_image_url"] = mapping.get(row["cover_image_url"], "")
        row["image_urls"] = [mapping[u] for u in (row.get("image_urls") or []) if u in mapping]
        try:
            request(
                f"{url}/rest/v1/properties", "POST",
                json.dumps(row).encode(),
                {**auth, "Content-Type": "application/json",
                 "Prefer": "resolution=merge-duplicates,return=minimal"},
            )
            ok += 1
            print(f"  OK  {p['name']}  ({len(row['image_urls'])} nuotr.)")
        except urllib.error.HTTPError as e:
            print(f"  KLAIDA  {p['name']}: HTTP {e.code} - {e.read()[:200].decode('utf-8','replace')}")

    print(f"\nBaigta. Objektu ikelta: {ok}/{len(props)}")
    if failed:
        print(f"Nepavykusiu nuotrauku: {len(failed)} (pirmos 5)")
        for u, why in failed[:5]:
            print("  -", why, os.path.basename(u.split('?')[0]))


if __name__ == "__main__":
    main()
