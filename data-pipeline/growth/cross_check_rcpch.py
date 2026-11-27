"""INDEPENDENT cross-check against a separate implementation and a separate
copy of the WHO data: rcpchgrowth 4.6.5 (RCPCH, AGPL-3.0; used here only as an
external tool, never bundled in the app).

For each sex and whole month 0..24 and a spread of weights, compute the
z-score with (a) our formula on the WHO PDF monthly L/M/S and (b) rcpchgrowth's
`sds_for_measurement` (its daily WHO table, its own lookup). Writes the
rcpchgrowth results as fixtures for the TypeScript tests.

Needs: a virtualenv with `pip install rcpchgrowth==4.6.5`.
Usage: <venv>/bin/python data-pipeline/growth/cross_check_rcpch.py
"""
import csv, json, math, pathlib
from rcpchgrowth.global_functions import sds_for_measurement
import rcpchgrowth

ROOT = pathlib.Path(__file__).resolve().parents[2]
FIX = ROOT / 'data-pipeline/growth/fixtures'
TOL = 0.01  # z-score units; see report for why

def z_ours(L, M, S, x):
    return math.log(x / M) / S if L == 0 else ((x / M) ** L - 1) / (L * S)

cases, worst, n, fail = [], 0.0, 0, 0
for sex, name in [('female', 'who-wfa-girls-0-24mo-pdf.csv'), ('male', 'who-wfa-boys-0-24mo-pdf.csv')]:
    for r in csv.DictReader((FIX / name).open()):
        m = int(r['Month']); L, M, S = float(r['L']), float(r['M']), float(r['S'])
        age = m / 12  # decimal years; month m = 30.4375*m days = m/12 years
        for factor in (0.8, 0.9, 1.0, 1.1, 1.25):
            x = round(M * factor, 2)
            ours = z_ours(L, M, S, x)
            if abs(ours) > 3:
                continue
            theirs = sds_for_measurement(reference='who', age=age, measurement_method='weight', observation_value=x, sex=sex)
            d = abs(ours - theirs); worst = max(worst, d); n += 1
            if d > TOL: fail += 1
            cases.append({'sex': sex, 'ageMonths': m, 'weightKg': x, 'zRcpch': round(theirs, 6)})

(FIX / 'rcpch-wfa-z-fixtures.json').write_text(json.dumps({
    'generatedBy': f'rcpchgrowth {rcpchgrowth.__version__ if hasattr(rcpchgrowth, "__version__") else "4.6.5"} sds_for_measurement(reference="who")',
    'note': 'Expected z-scores from an independent implementation. Do not regenerate with Minik Atlas code.',
    'cases': cases}, indent=1) + '\n')
report = ['# Independent cross-check: rcpchgrowth vs WHO PDF monthly L/M/S', '',
          f'Cases: {n} (2 sexes × months 0–24 × weights at 0.8–1.25 × median, |z| ≤ 3).',
          f'Tolerance: |Δz| ≤ {TOL}. Max |Δz|: {worst:.5f}. Over tolerance: {fail}.',
          'Why not exact: rcpchgrowth uses the WHO daily table (L/M/S to 4–5 decimals at day-level ages); the PDF gives monthly rows at 30.4375·m days.',
          '', 'Result: ' + ('PASS' if fail == 0 else 'FAIL')]
(ROOT / 'data-pipeline/growth/reports/independent-cross-check.md').write_text('\n'.join(report) + '\n')
print('\n'.join(report))
raise SystemExit(1 if fail else 0)
