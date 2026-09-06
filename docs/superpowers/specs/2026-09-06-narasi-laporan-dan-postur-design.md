# Narration, redistribution report, and the posture UI — Design

Second half of the work opened by the mentor's 29 August feedback. The first half — sizing
shipments to measured need — is built and reconciled in
`2026-09-06-population-sizing-and-ai-narration-design.md`. That document's Subsystem 2
(narration) is **superseded by this one**; its Subsystem 1 stands.

## What changed since that spec was written

Two things, and both narrow the work.

**Tama shipped a rule-based narration engine on `dev`.** `src/lib/prediction/analysis.ts`
computes every figure in TypeScript and `report.ts` draws a vector PDF through jsPDF. Its
numbers cannot be wrong, because nothing generates them. The prediction page is therefore
done, and this spec does not touch it.

**The sizing work is invisible.** Every field computed in the first half reaches
`src/data/generated/redistribution.json` and `src/lib/types.ts`, and then stops:

- `/api/redistribution` takes no `postur` parameter. Three postures exist in the data;
  one can be seen.
- `route-table.tsx` renders `from`, `to`, `volume`, `distance`, `cost`, `priority`.
  `persenPasar`, `dasarTakaran`, `kecukupanPersen`, `volumeCiBawah`, `volumeCiAtas`,
  `epsilon` and `epsilonSumber` render nowhere.
- `artifacts/buku_besar.json` is never exported to the front end. The honesty ledger is
  not in the product.

So the most valuable remaining work is not new intelligence. It is showing what has
already been computed.

## Goal

Make the sizing legible, give the offtaker a report they can carry into a meeting, and add
generated prose only where no explanation exists at all.

## Non-goals

- Rewriting the prediction page or its report. Tama's work stands.
- A chat interface. `agent-panel.tsx` is deleted, not replaced.
- Free multi-province report selection. A report addressed to "Jabar + Maluku + Papua" has
  no reader.
- Live per-click LLM calls anywhere in this scope.

---

## Part 1 — Make the sizing visible

No model involved. This part is arithmetic already done, rendered.

### API

`GET /api/redistribution?commodity=<id>&postur=<konservatif|seimbang|aman_pangan>`

`postur` is optional and defaults to `default` (which mirrors `seimbang`). An unrecognised
value returns **400**, never a silent fallback to another posture's numbers. Sizing is the
whole point of the parameter; quietly serving a different posture would show a reader
tonnages that are not the ones they asked for.

### Route table columns

| Column | Source field | Rendering |
|---|---|---|
| Volume | `volumeTon` | `57,41 t`, with `46,43–68,39` beneath in muted type |
| % pasar tujuan | `persenPasar` | bar on a fixed 0–5% scale; `konsumsiTujuanTonBulan` is the denominator, shown on hover |
| Dasar takaran | `dasarTakaran` | badge: **Terukur** / **Diasumsikan**, with a tooltip saying which rule set the volume |
| Kecukupan GPM | `kecukupanPersen` | share of the destination's measured requirement already covered by Gerakan Pangan Murah, the intervention programme already running there |

The 0–5% scale is chosen against the data, not invented: across the 36 routes of
`seimbang`, `persenPasar` runs **0,023% to 3,642%**. The old heuristic's 18,08% would run
off this scale, which is the correct visual impression.

`kecukupanPersen` ranges **4,5% to 168,1%** in `seimbang`. It is **not** the coverage of the
shipment on that row. `supplai/kebutuhan.py:Kebutuhan.kecukupan` computes it as the tonnage
Gerakan Pangan Murah already delivers per month in the destination province, divided by the
measured requirement — so it is a property of the destination, identical on every route
arriving there, and it says nothing about this plan. The column is therefore labelled
**Kecukupan GPM**, on screen and in the government report. Values above 100% are real — the
running programme already more than covers the measured requirement — and must not be clamped.

`kecukupan`'s docstring mandates three caveats that must be rendered beside the figure, and
they are, in the on-screen `Penjelas` and in Section 02 of the government report: GPM is one
instrument among several and CPP disbursement is far larger; the per-activity budget is a
2027 plan applied to 2026 realisations; and GPM sells several commodities, so converting its
budget at a single commodity's price is indicative only.

### Three things that are wrong if skipped

**The empty state invents a reason the solver never gave.** `route-table.tsx` explains every
empty plan with one sentence: "Model memproyeksikan harga komoditas ini stabil atau menurun
di seluruh wilayah pantauan." The solver actually returns a `status` string naming which of
its guards fired, and `meta.json:plan_meta` already carries it per commodity × posture.
Ten of the eighteen commodity-posture combinations are empty today, and they split into **two unrelated causes**:

| Commodity × posture | `status` | What actually happened |
|---|---|---|
| Bawang Merah, Minyak Goreng — **all three postures** | `tidak ada pasangan surplus-defisit` | Classification found no usable source/destination pair at all. Posture-independent. |
| Beras, Bawang Putih, Daging Ayam, Telur Ayam — `konservatif` | `tidak perlu intervensi` | Destinations *were* identified. The p10 reading of their rise is ≤ 0, so the required volume computes to zero. |

The existing sentence is wrong for both. It is wrong for the first because prices are not
the reason — no pairing existed. It is wrong for the second in a subtler and worse way:
classification runs on the **point** forecast under every posture (`match.py` lines
100–103, deliberately, so the posture switch moves volumes rather than reshuffling the map),
so those provinces *are* still flagged as at risk. What `konservatif` says is "at the bottom
of the forecast interval, the rise may be zero, so nothing is required" — which is not the
same claim as "the model projects stable prices", and is the more useful one.

**Design: export the status, render the real reason.** `export_web.py` already receives
`plan_meta` in `_response_for` and uses it for the summary numbers, but drops `status`.
Carry it onto `summary` and map each of the solver's five possible statuses
(`tidak ada pasangan surplus-defisit`, `tidak ada kebutuhan terukur`,
`tidak perlu intervensi`, `tidak ada rute ekonomis`, `solver gagal: …`) to a human sentence.
Hard-coding text per posture would be wrong the moment the data shifts; reading the status
stays true.

**A schema hole to close while here.** `RedistributionResponse["summary"]` declares
`anggaranNasionalTon: number | null` as required, but `build_redistribution` omits the key
entirely when assembling `per_kom["all"]`. The JSON is cast `as unknown as`, so TypeScript
never checks it, and `/api/redistribution` with no `commodity` returns exactly that object.
It is `undefined` at runtime where the type promises a number or an explicit null.

**The aggressive posture is almost entirely assumption.** `dasarTakaran` tallies:

| Posture | terukur | diasumsikan |
|---|---|---|
| `seimbang` | 14 | 22 |
| `aman_pangan` | 1 | 35 |
| total | 15 | 57 |

The more aggressive the posture, the less of it is measured — because the elasticity
formula asks for more than the source-side 10% rule will spare, so the heuristic binds.
That relationship must be readable on screen, not buried. A summary line above the table
states the split for the posture in view.

### The honesty ledger, in the product

`scripts/export_web.py` copies `artifacts/buku_besar.json` to
`src/data/generated/buku_besar.json`. It renders as a panel on the redistribution page:
ten rows, each with input, value, source, year, and a **terukur/diasumsikan** badge. It is
also the text behind the `Dasar takaran` tooltip, so "where did this number come from?" is
answered inside the product rather than in a document nobody opens.

All ten entries render. No truncation, no "and 4 more".

### Bawang Putih has no budget cap

`anggaranNasionalTon` is `null` for Bawang Putih — no neraca exists for it, so the plan runs
uncapped. That renders as an explicit stated condition, not an empty cell.

---

## Part 2 — Redistribution report

Same shape as Tama's, three files, so there is one way to build a report in this codebase:

- `src/lib/redistribusi/analysis.ts` — pure computation from
  `getRedistributionData(commodity, postur)`; returns a facts object plus rule-based
  skeleton sentences. No jsPDF import, so it is testable without a PDF.
- `src/lib/redistribusi/report.ts` — jsPDF, vector text and drawn tables.
- `src/app/api/redistribution-report/route.ts` — validates, returns `application/pdf`.

`GET ?commodity=<id>&postur=<postur>&pembaca=<pemerintah|pedagang>`

### Government framing

Where to intervene, how many tonnes, at what freight cost, whether the intervention is
adequate (`kecukupanPersen`), and on what basis each volume was set. Carries the ledger as
an appendix and the `terukur`/`diasumsikan` split as a stated caveat, not a footnote.

### Trader framing

For each route: destination price minus origin price, against freight of
**Rp2,5/kg/km × distance** (the ledger's Rp2.500/ton/km).

Prices come from **`flows.parquet`'s own `harga_asal` and `harga_tujuan`** — the two figures
the solver itself used when it chose the route. `export_web.py` does not currently carry
them to the front end and must (`hargaAsal`, `hargaTujuan`; `hematRp` and `urgensi` are
there too and equally free). Deriving the gap from `heatmap.json` instead would couple the
report to an unrelated artifact and could disagree with the plan it is describing.

Measured now, on the flows' own prices: **30 of 36 routes** in `seimbang` have a gap that
covers freight. The six that do not are printed too, marked as not covering, never
dropped — a report that only lists profitable routes is an advertisement. The worst is
Telur Ayam, Sumatera Selatan → Sulawesi Tenggara: a Rp2.800/kg gap against Rp5.125/kg of
freight over 2.050 km.

One caveat prints with this table, because without it the result flatters itself: **the
sign of the gap is structural.** The solver only draws routes from below-median-price
provinces to above-median ones, so a positive gap is built in by construction — and
measurement confirms it, **zero of the 36 routes have a negative gap**. What the arithmetic
actually establishes is the **size** of the gap against a specific freight assumption — and
that assumption is itself `diasumsikan` in the ledger.

---

## Part 3 — Generated narration, only where nothing exists

### What gets a model, and what does not

**Feature explainers** — "what this table shows, how to read it" — are **static, human
written, human reviewed**. They do not change when the data changes, so generating them
buys nothing and adds a hallucination surface to text that could simply be correct. About
eight strings.

**Data explanations** — "what these numbers say now" — change every retrain. These are
generated. Nine targets, and that is what got built:

| Target | Count |
|---|---|
| Redistribution plans that have routes | 8 |
| Executive summary | 1 |
| | **9** |

Eight, not eighteen: of the 6 × 3 commodity-posture combinations, ten are empty (Bawang
Merah and Minyak Goreng in all three postures, and the four remaining commodities under
`konservatif`). An empty plan gets the rule-based sentence derived from its `status`, which
is both cheaper and more precise than asking a model to describe an absence.

**Corrected during reconciliation (Task 14): an earlier draft of this table also carried a
"Per commodity" row of 6, for a stated total of 15.** That row was never built.
`supplai/narasi.py` writes exactly two kinds of entry into `artifacts/narasi.json` —
`redistribusi` (one per non-empty commodity × posture) and `eksekutif` — and nothing else.
There is no per-commodity narration aggregating across postures. This is consistent with
this plan's own self-review, Known-gap 3 ("`per_kom["all"]` narration is not built... a
paragraph mixing six commodities' tonnages has no reader"), which argued against the
cross-commodity aggregate specifically; the sixth target here would have been a different
cut (one paragraph per commodity, spanning its postures) and it simply was not built either.
Stated plainly rather than silently dropped: the product ships 9 generated narratives, not
15, and no per-commodity narration exists in this scope.

### Where it runs

**Build time, in Python.** `supplai/narasi.py` writes `artifacts/narasi.json`;
`export_web.py` copies it to `src/data/generated/narasi.json`. The demo then works
offline, no API key exists in production, and the cost is paid once rather than per click.

### Model

`gpt-5.4-mini-2026-03-17`, pinned to the snapshot. A one-off build of 9 short narratives
costs almost nothing — a smoke test ran one at 141 total tokens — so there is no reason to
economise on quality here. `gpt-5.4-nano` stays reserved for any live per-request path, if
one is ever added.

### The fact block must be pre-formatted, not raw

Discovered by smoke test, and it is the sharpest failure mode in this part. Handed
`persen_pasar: 1.298` as a float, the model wrote:

> "Komoditas ini mencakup 1.298 persen pasar"

In Indonesian, `1.298` reads as **one thousand two hundred ninety-eight**. The sentence
states a figure a thousand times its true value — and it **passes a naive number verifier**,
because the numeral does match the fact block exactly.

So the fact block carries **pre-formatted Indonesian strings**: `"1,30%"`, `"57,41 ton"`,
`"Rp100.692.943"`. The model copies strings rather than formatting floats. The verifier
normalises Indonesian separators on both sides before comparing.

This is now true of the honesty ledger's numbers too, not only the narration facts:
`supplai/buku_besar.py`'s `nilai` field is built with the same `format_id` helper
(`supplai/narasi.py`), so `"Rp2.500"` and `"284.667.253 jiwa"` reach the product already
formatted for an Indonesian reader — no raw float crosses into either surface for the model
or the UI to reformat and possibly misread.

### Verifier

Every numeral in the generated text is extracted, normalised from Indonesian formatting,
and matched against the fact block. **Exact copy, no rounding tolerance** — the fact block
is already formatted for the reader, so the model has nothing left to round, and a
tolerance would be standing permission to alter a figure. Unmatched → reject and
retry once. Two failures → the narrative is **dropped** and the table renders bare. Fail
closed. A missing paragraph is a smaller harm than a confident wrong one.

The comparison is also **ASCII-digit-only and sign-aware**, added during implementation and
not originally called out here:

- A numeral written in a non-ASCII digit (Devanagari, fullwidth, etc.) is deliberately still
  *found* by the numeral scanner — hiding it would make a wrong number invisible rather than
  invalid — but it always fails normalisation and is rejected. An Indonesian government
  document must never contain one, so anything outside ASCII `0-9` is treated as malformed,
  not merely unusual.
- A leading `-` is part of the numeral, not punctuation around it: `"-57,41"` and `"57,41"`
  are opposite claims, and the verifier tracks the sign through normalisation rather than
  stripping it.

**An empty model reply is treated as a failed attempt, not a vacuous pass.** A reply with no
text also has no numerals to reject, so a verifier that only checks numerals would pass it
by default and cache it as verified prose. That case is checked explicitly and counted as a
failure before verification runs, consuming one of the two attempts.

### Cache

Content-addressed: `sha256(facts + prompt_version + model_id)`. A retrain pays only for
what changed. Identical facts must produce zero API calls.

### Marking

Every generated paragraph is visually distinct from human-written text and labelled as
machine-generated. A reader must never have to guess which sentences a model wrote.

---

## Part 4 — Removals

- `src/components/agent/agent-panel.tsx`, its dynamic import and `isAgentOpen` state in
  `src/app/(dashboard)/layout.tsx`, and its trigger in `src/components/layout/header.tsx`.
  It answers from a `setTimeout` with an invented Jakarta beef price of Rp135.200 and an
  invented cause. Nothing is behind it.
- `src/components/layout/filter-bar.tsx` — dead code, imported by nobody. Its export button
  fires `toast.success("Laporan berhasil diunduh")` and produces no file.
- `src/components/landing/about-us.tsx` — dead code holding a copy of landing claims that
  were corrected elsewhere.

---

## Testing

- Adversarial fixtures containing invented numbers must be rejected by the verifier.
- A number correct as a float but wrong in Indonesian rendering (`1.298` for 1,298%) must
  be rejected — this is the smoke-test failure, as a regression test.
- Identical facts produce zero API calls (mocked client).
- `/api/redistribution` returns 400 for an unknown posture and never another posture's data.
- Each posture's route count and `dasarTakaran` split match the JSON: 0 routes for
  `konservatif`; 14/22 for `seimbang`; 1/35 for `aman_pangan`.
- Every empty plan renders the sentence for its own `status`. Specifically: Bawang Merah
  under `seimbang` must **not** say prices are projected stable, and Beras under
  `konservatif` must say something different from Bawang Merah under `konservatif` — they
  are empty for different reasons.
- `summary.anggaranNasionalTon` is present on every response including `all`, as a number or
  an explicit `null`, never absent.
- The ledger panel renders all ten entries.
- The trader report marks no route as covering freight whose gap is below it, and prints
  the six that do not cover.
- `kecukupanPersen` above 100% is not clamped.

## Risks

1. **The freight figure is assumed.** Rp2.500/ton/km carries the whole trader framing. It
   is `diasumsikan` in the ledger and must be stated wherever the framing appears.
2. **Prices for the trader gap are provincial averages, not wholesale quotes.** They come
   from `flows.parquet`'s own `harga_asal` and `harga_tujuan` — the figures the solver used
   when it chose the route, as Part 2 states — and not from the heatmap. The substance of
   the risk is unchanged by that correction: a provincial average is still not a price a
   trader could transact at.
3. **9 narratives is small enough to review by hand.** If the target set grows, the
   verifier becomes the only thing standing between the product and a confident error —
   and it only checks numerals, not causal claims.
4. **Static explainers rot silently.** They are correct on the day they are written and
   nothing fails when the feature changes underneath them.
5. **A number written as a word passes the verifier untouched.** The verifier extracts
   numerals; "seribu ton" and "dua puluh persen" contain none, so there is nothing to
   compare against the fact block and the check succeeds vacuously. Nothing in the pipeline
   catches it. The mitigation is the prompt, which hands the model pre-formatted strings and
   asks it to copy them, plus a human reading each of the nine narratives before release.
