# Decisions

Short ADRs. Add new ones at the bottom; do not rewrite accepted ones, supersede them.

## ADR-001 JS tabs instead of NativeTabs (2026-11-27, accepted)
`expo-router/js-tabs`: predictable custom styling (cream bar, Turkish labels
that fit at 320 px and large text), identical on web for screenshot review.
Native tabs can be revisited after device testing.

## ADR-002 TanStack Query for server state, no Redux (accepted)
Almost all state is server data with caching, retries and invalidation.
Local UI state stays in components; the only global client store is the
prototype simulation store (`src/infrastructure/configuration/simulation.ts`).

## ADR-003 Typed in-house i18n (accepted)
One locale (tr). `t(key, params)` over a typed message tree in `tr.ts` gives
compile-time key checks with no dependency. Plurals are written out where
needed. Revisit when a second locale is real.

## ADR-004 Demo provider behind the Backend interface (accepted)
Screens depend on `Backend` only. The demo provider applies the same
permission rules and failure modes (offline, upload failure, revoked) so the
UI handles them now. Swapping to Supabase is a new provider, not screen edits.

## ADR-005 Supabase as the recommended backend (proposed, not activated)
Postgres + RLS fits family/visibility rules; private Storage; local CLI for
policy tests. Requires the owner's approval before creating any project or
paid plan. See architecture.md.

## ADR-006 Dates as strings + integer day math (accepted)
`LocalDate` strings and day numbers avoid timezone shifts; appointments keep
wall time + IANA zone. See date-rules.md.

## ADR-007 Re-encode every photo before upload (accepted)
Re-encoding to JPEG strips EXIF/GPS. If it fails, the photo is rejected rather
than uploaded as the original.

## ADR-008 Demo content is gated, never "published" (accepted)
Demo weekly entries carry `isDemo` and cannot pass the production gate.
Content version `0.1.0-demo`.

## ADR-009 Growth references enter scope, under conditions (2026-11-27, accepted by owner's request)
Supersedes the "no percentiles" line of product-v1.md for milestone M3 only.
Percentiles/z-scores come only from official machine-readable data after
numerical validation, need a parent-selected reference sex, and are never
shown as health judgements. Pregnancy size comparisons stay a separate
domain. See milestone-visuals-growth.md.

## ADR-010 Pregnancy artwork as code-authored SVG rendered to raster (proposed, awaiting approval)
No image-generation tool is available. Artwork is hand-written SVG (gradients,
light, procedural texture) rendered offline to PNG/WebP; the app ships rasters
and animates them with transforms only (sway, light), so native SVG filter
support does not matter. Alternative if the owner wants painterly realism:
commission an illustrator from the production brief in milestone-visuals-growth.md.

## ADR-011 Functional V1 first; email one-time code; local-first Supabase (2026-11-28, accepted by owner's brief)
The owner reprioritized: functional V1 before final artwork and editorial
content (R0–R6, docs/functional-v1-roadmap.md); M3 visual work moves to R7.
Supabase (ADR-005) is now active **locally** only. Authentication uses one
method, email one-time code (docs/auth.md). Lifecycle changes go through
security-definer RPCs; plain records use RLS-protected client calls.
Supersedes the approval gate in ADR-010 for implementation order only.
