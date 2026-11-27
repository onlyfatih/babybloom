"""Download official growth-reference raw files listed in sources.json.

    python3 -I data-pipeline/growth/fetch_raw.py            # download missing files
    python3 -I data-pipeline/growth/fetch_raw.py --verify   # re-hash files against MANIFEST.json

Each file lands in data-pipeline/growth/raw/<publisher>/<file>. MANIFEST.json
records url, source page, size, sha256, HTTP Last-Modified / ETag and the UTC
retrieval time. Existing files are never overwritten: delete one on purpose to
re-download it, and the manifest diff will show the change. Stdlib only;
honours HTTPS_PROXY. Nothing here parses or trusts the content.
"""
import datetime as dt
import hashlib
import json
import pathlib
import sys
import urllib.request

HERE = pathlib.Path(__file__).resolve().parent
RAW = HERE / "raw"
MANIFEST = RAW / "MANIFEST.json"


def sha256(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    sources = json.loads((HERE / "sources.json").read_text())["files"]
    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}
    if "--verify" in sys.argv:
        bad = [k for k, m in manifest.items() if sha256(RAW / m["path"]) != m["sha256"]]
        print("verify:", "OK" if not bad else f"CHANGED {bad}")
        return 1 if bad else 0
    failures = 0
    for s in sources:
        rel = pathlib.Path(s["publisher"].lower()) / s["file"]
        dest = RAW / rel
        if dest.exists() and s["id"] in manifest:
            print(f"skip   {rel} (present)")
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request(s["url"], headers={"User-Agent": "growth-data-pipeline/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                body = r.read()
                headers = {k: r.headers.get(k) for k in ("Last-Modified", "ETag", "Content-Type")}
        except Exception as e:  # noqa: BLE001 - report and continue with the rest
            print(f"FAIL   {rel}: {e}")
            failures += 1
            continue
        dest.write_bytes(body)
        manifest[s["id"]] = {
            "publisher": s["publisher"],
            "path": rel.as_posix(),
            "url": s["url"],
            "page": s["page"],
            "bytes": len(body),
            "sha256": sha256(dest),
            "lastModified": headers["Last-Modified"],
            "etag": headers["ETag"],
            "contentType": headers["Content-Type"],
            "retrievedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        }
        print(f"ok     {rel} {len(body)} B")
    MANIFEST.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    print(f"{len(manifest)} files in manifest, {failures} failed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
