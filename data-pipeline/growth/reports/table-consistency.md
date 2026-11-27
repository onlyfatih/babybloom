# WHO table internal consistency

Check: recompute each printed percentile from the same row's L, M, S; round half-up to 1 decimal (the printed precision); compare for equality.
Tolerance: exact equality after rounding. Max raw |computed − printed| is also reported (the printed value is itself rounded, so up to 0.05 kg is expected).
This is an internal consistency check of the transcription, **not** independent validation of the engine.

- `who-wfa-boys-0-24mo-pdf.csv`: 275 values, 275 equal after rounding to 1 decimal, 0 differ; max raw difference 0.0499 kg
- `who-wfa-girls-0-24mo-pdf.csv`: 275 values, 275 equal after rounding to 1 decimal, 0 differ; max raw difference 0.0500 kg

Result: PASS
