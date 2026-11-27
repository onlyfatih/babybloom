# mapping

Row ↔ domain mappers for real providers live here (P3), e.g.
`memory-row.ts` mapping `memories` rows (snake_case, `pregnancy_id` /
`child_id` columns) to the `Memory` domain type with `subject: ProfileRef`.
The demo provider stores domain objects directly, so it needs no mapper.
