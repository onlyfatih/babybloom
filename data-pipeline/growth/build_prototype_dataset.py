"""Builds the PROTOTYPE WHO weight-for-age dataset (monthly, 0-24 months) used by
the in-app preview, from the fixture CSVs transcribed from the official WHO PDF.

Usage:  python3 data-pipeline/growth/build_prototype_dataset.py

Transformation: CSV columns Month, L, M, S are copied unchanged (no rounding,
no unit change; weight in kg). Percentile columns are not copied. Output
records the SHA-256 of the input CSV. Status stays 'unvalidated-prototype':
this is not the daily expanded table and must not drive percentiles.
"""
import csv, hashlib, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
FIX = ROOT / 'data-pipeline/growth/fixtures'
OUT = ROOT / 'src/content/growth-references/who'
SOURCES = {
    'female': ('who-wfa-girls-0-24mo-pdf.csv', 'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-age/wfa-girls-0-5-percentiles.pdf?sfvrsn=1a008a84_11'),
    'male': ('who-wfa-boys-0-24mo-pdf.csv', 'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-age/wfa-boys-0-5-percentiles.pdf?sfvrsn=488e74e6_11'),
}

printed = {}
for sex, (name, url) in SOURCES.items():
    raw = (FIX / name).read_bytes()
    rows = [{'x': int(r['Month']), 'lms': {'L': float(r['L']), 'M': float(r['M']), 'S': float(r['S'])}} for r in csv.DictReader(raw.decode().splitlines())]
    ds = {
        'id': f'who-2006-wfa-{sex}-monthly-0-24-prototype',
        'publisher': 'WHO',
        'name': 'WHO Child Growth Standards, weight-for-age, birth to 5 years (percentiles) — months 0–24 transcribed from PDF',
        'release': '2006 (PDF as served 2026-11-27)',
        'indicator': 'weight-for-age',
        'sex': sex,
        'ageUnit': 'month',
        'ageMin': 0,
        'ageMax': 24,
        'valueUnit': 'kg',
        'measurementConvention': 'weight',
        'sourceUrl': url,
        'accessedOn': '2026-11-27',
        'sha256': hashlib.sha256(raw).hexdigest(),
        'sha256Of': f'data-pipeline/growth/fixtures/{name} (transcription; the PDF itself was not downloadable here)',
        'validation': 'unvalidated-prototype',
        'rows': rows,
    }
    printed[sex] = [{k: float(v) for k, v in r.items()} for r in csv.DictReader(raw.decode().splitlines())]
    path = OUT / f'wfa-{sex}-monthly-0-24.prototype.json'
    path.write_text(json.dumps(ds, indent=1) + '\n')
    print('wrote', path.relative_to(ROOT), len(rows), 'rows')

# JSON mirror of the printed tables, for TypeScript tests (fixtures stay CSV-canonical).
(FIX / 'who-wfa-pdf-printed.json').write_text(json.dumps(printed, indent=0) + '\n')
print('wrote data-pipeline/growth/fixtures/who-wfa-pdf-printed.json')
