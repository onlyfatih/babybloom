"""INTERNAL CONSISTENCY check of one WHO table. NOT independent validation.

For every row, each printed percentile is recomputed from the same row's
L, M, S and rounded to the printed precision (1 decimal, kg). A match means
the transcription of L, M, S and the percentile columns agree with each other.
It does not prove the LMS engine is right, and it cannot detect an error that
WHO itself made, or a transcription error repeated consistently in L/M/S and
the percentiles.

Usage:  python3 data-pipeline/growth/check_table_consistency.py
Writes: data-pipeline/growth/reports/table-consistency.md
"""
import csv, math, pathlib
from statistics import NormalDist

ROOT = pathlib.Path(__file__).resolve().parents[2]
FIX = ROOT / 'data-pipeline/growth/fixtures'
COLS = ['P1', 'P3', 'P5', 'P15', 'P25', 'P50', 'P75', 'P85', 'P95', 'P97', 'P99']
Z = {c: NormalDist().inv_cdf(int(c[1:]) / 100) for c in COLS}

def lms_value(L, M, S, z):
    return M * math.exp(S * z) if L == 0 else M * (1 + L * S * z) ** (1 / L)

lines = ['# WHO table internal consistency', '',
         'Check: recompute each printed percentile from the same row\'s L, M, S; round half-up to 1 decimal (the printed precision); compare for equality.',
         'Tolerance: exact equality after rounding. Max raw |computed − printed| is also reported (the printed value is itself rounded, so up to 0.05 kg is expected).',
         'This is an internal consistency check of the transcription, **not** independent validation of the engine.', '']
total_fail = 0
for name in sorted(FIX.glob('who-wfa-*-0-24mo-pdf.csv')):
    n = fails = 0; worst = 0.0
    for r in csv.DictReader(name.open()):
        L, M, S = float(r['L']), float(r['M']), float(r['S'])
        for c in COLS:
            x = lms_value(L, M, S, Z[c])
            rounded = math.floor(x * 10 + 0.5) / 10
            printed = float(r[c]); n += 1
            worst = max(worst, abs(x - printed))
            if abs(rounded - printed) > 1e-9:
                fails += 1
                lines.append(f'- MISMATCH {name.name} month {r["Month"]} {c}: computed {x:.4f} → {rounded}, printed {printed}')
    total_fail += fails
    lines.append(f'- `{name.name}`: {n} values, {n - fails} equal after rounding to 1 decimal, {fails} differ; max raw difference {worst:.4f} kg')
lines.append('')
lines.append('Result: ' + ('PASS' if total_fail == 0 else f'FAIL ({total_fail})'))
(ROOT / 'data-pipeline/growth/reports/table-consistency.md').write_text('\n'.join(lines) + '\n')
print('\n'.join(lines))
raise SystemExit(1 if total_fail else 0)
