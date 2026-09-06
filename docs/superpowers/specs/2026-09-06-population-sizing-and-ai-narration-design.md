# Population-based volume sizing + AI narration — Design

**Date:** 2026-09-06
**Status:** Approved (design), pending implementation plan
**Origin:** Mentor/offtaker feedback 29 Aug 2026 (`feedback from mentor/feedback_29August.md`),
narrowed by the team to two priorities, then extended with a second data drop from the
offtaker (DPR Komisi IV staff) on 6 Sep 2026.

## Goal

1. **Sizing.** A redistribution recommendation must state *how many tons* go to a
   province, derived from that region's own measured consumption, and bounded so the
   shipment does not push local prices low enough to harm traders.
2. **Adequacy.** Having computed the required volume, report whether real intervention
   at its current scale is large enough to matter.
3. **Narration.** An LLM writes plain-language explanations for each table/feature and
   assembles downloadable PDF reports for non-technical readers.

## Non-goals

- The chat panel. `src/components/agent/agent-panel.tsx` is **removed**, not rebuilt.
- Benchmarking our alerts against the Bapanas EWS classification. We use only its
  low-price *principle* (see "Symmetric cap"), not its labels.
- FSVA / Indeks Ketahanan Pangan prioritisation, and the "belanja daerah" heatmap layer.
  Data is now on hand for both; recorded as follow-ups.
- Kabupaten-level forecasting. Consumption data is kabupaten-level (514 regions) but the
  shipped model is province-level.
- Adding Gula / Daging Sapi to the forecast set (both have full WFP coverage to Jun 2026
  and a neraca). Follow-up.

---

## The problem, measured

`supplai/match.py` distributes a **hardcoded stabilisation stock** in proportion to the
size of the predicted price spike. Its own docstring admits it: *"The volumes are not
measured."*

The solved plan ships **800 t of rice to Kalimantan Utara**, whose measured rice market
is **4,424 t/month**. That is **18.1% of the destination's entire monthly market**, to
counter a predicted **+2.08%** rise.

*(Figures in this section and the two tables below were reconciled against the built
implementation on 2026-09-06. An earlier draft used the national per-capita coefficient,
which put Kalimantan Utara's market at 4,917 t/month. The code uses that province's own
regional figure — 70.7 kg/capita/year against a national 79.1 — because regional variation
is the reason the dataset was adopted.)*

For scale: across 20 actual government food-distribution shipments (Feb–Jul 2026), the
**median shipment was 5.5 t** and the largest was 30 t. The current plan is **145× the
median real shipment**.

---

## Data inventory

Every input is committed with its source. This table is also emitted as a
machine-readable **honesty ledger** shipped with the artifacts.

### Files from the offtaker

The second drop arrives with opaque numeric filenames. Rename on ingest:

| File | Rename to | Content |
|---|---|---|
| `1778632957.xlsx` | `konsumsi_pangan_kabkota_2021_2025.xlsx` | 87,354 rows; 514 kab/kota; kg/capita/year |
| `1780889077.xlsx` | `konsumsi_energi_kabkota_2021.xlsx` | kcal/capita/day per kabupaten |
| `1784172064.xlsx` | `jumlah_pasar_provinsi_2025.xlsx` | market counts per province |
| `1785899217.xlsx` | `gpm_pelaksanaan_kabkota_2026.xlsx` | 1,752 rows; 6,896 GPM events, Jan–Jul 2026 |
| `1786331351.xlsx` | `fasilitasi_distribusi_pangan_2026.xlsx` | 20 real shipments **with volume** |
| `1786338047.xlsx` | `ews_qipa_aipa_ifpa_2026.xlsx` | 91 rows; 13 commodities; Alert/Warning/Normal |
| `1787212524.xlsx` | `indeks_ketahanan_pangan_provinsi_2022_2026.xlsx` | 1,770 rows; 38 provinces |

Plus `Buletin Konsumsi Pangan Vol 17 No 1 2026.pdf`, `Statistik Pertanian 2026.pdf`, and
three Rapat Komisi IV DPR RI × Bapanas documents (15 Jul, 19 Aug, 1 Sep 2026).

### Inputs and status

| Input | Coverage | Source | Status |
|---|---|---|---|
| Province population | 34 provinces, national 284,667,253 | **BPS WebAPI**, var 2781, th 125, turvar 585 → `data/populasi_provinsi_2025.csv` | **measured**, 2025 |
| **Regional** per-capita consumption | 514 kab/kota, 2021–2025 | `konsumsi_pangan_kabkota_2021_2025.xlsx` (offtaker) | **measured**, 4/6 commodities |
| National per-capita consumption | fallback for the other 2 | Kementan Pusdatin *Statistik Konsumsi Pangan 2024*, from BPS Susenas March | **measured** |
| National stock budget | 6 commodities | Bapanas/BPS *Neraca*, column **Neraca** | **measured** |
| Real shipment scale | 20 shipments, Feb–Jul 2026 | `fasilitasi_distribusi_pangan_2026.xlsx` | **measured** |
| GPM execution | 6,896 events, Jan–Jul 2026 | `gpm_pelaksanaan_kabkota_2026.xlsx` | **measured** |
| GPM unit budget | Rp26.3 M/event | Bapanas RKA 2027 via DPR document, 1 Sep 2026 | **measured**, *2027 plan* |
| Low-price threshold principle | symmetric | Bapanas EWS status bands | **measured principle** |
| Price forecast + p10/p90 band | 204 series | `artifacts/forecast_path.parquet` | **measured** |
| Own-price elasticity | all 6 commodities, national + 5 regions, **with standard errors** | Hamzah (2022), SLU MSc thesis — QUAIDS on Susenas 2018, 295,155 households | **assumed, sourced** |

### Regional consumption replaces the uniform assumption

The earlier draft of this design assumed per-capita consumption was uniform nationally.
The new data shows that assumption would have been materially wrong:

> Rice consumption ranges from **40.6 kg/capita/year (Papua Pegunungan)** to
> **111.9 kg/capita/year (Nusa Tenggara Timur)** — a **2.76× spread**.

A uniform national figure would have understated NTT's market by ~41%. Kalimantan Utara
happens to sit at 78.7, near the national level, so the worked example below barely
moves — but that is luck, not vindication.

**Covered by the regional dataset:** Beras, Daging Unggas (→ Daging Ayam), Telur,
Minyak Sawit (→ Minyak Goreng), plus Gula and Daging Ruminansia for future use.
**Not covered:** Bawang Merah and Bawang Putih — both collapse into a "Sayur" aggregate.
Both fall back to the **national** Susenas coefficient (Bawang Merah 2.861, Bawang Putih
1.928 kg/capita/year), which is a resolution downgrade, not a missing input. The ledger
states the resolution per commodity.

**Bawang Putih additionally has no neraca** (≈95% imported, so Bapanas publishes no
domestic balance sheet). It therefore receives per-province sizing like any other
commodity but **no national stock budget cap** — `anggaran_nasional()` returns `None` and
the UI says so.

The commodity labels in this file are dirty — `Gula`, `Gula `, `Gula  `, `gula` appear as
distinct values. Ingest must normalise case and whitespace before grouping.

### The rice definition trap

Three different, all-correct rice consumption figures exist:

| Value | Definition | Source |
|---|---|---|
| 79.08 kg/cap/yr | the "Beras" line item alone | Statistik Konsumsi Pangan 2024, Table 1.1a |
| 88.76 kg/cap/yr | "Beras" as recorded in the kab/kota dataset, 2025 mean | offtaker data |
| 91.58 kg/cap/yr | all rice-containing foods (incl. nasi campur, nasi goreng) | Buletin Konsumsi Pangan 2026 |

**The spec commits to the kab/kota 2025 figure**, because it is regional, current, and
from the same source family as the neraca. The chosen definition must be named wherever
the number is displayed. Silently picking one of three is how unfalsifiable numbers are
made.

### Cross-validation

Two independent chains agree closely.

Susenas rice (79.077 kg/capita/year) against neraca household demand ÷ population
(79.2): **0.2% apart**.

National monthly rice consumption computed as Susenas × BPS 2025 population is
**1,875,886 t/month = 22.51 Mt/year**, against the 2026 neraca's household demand of
**22.58 Mt/year** — **0.3% apart**. A balance sheet published by Bapanas and a
consumption survey run by BPS, combined with a population count, land on the same number
by different routes. That is the strongest validation available for the sizing chain.

An earlier draft used the UNFPA COD-PS 2020 projection (269,603,430) and this same check
came out 5.6% apart. Replacing it with the BPS 2025 figure (284,667,253, +5.6%) closed
exactly that gap — which both fixes the input and confirms the diagnosis. The COD-PS
kabupaten file (`idn_admpop_adm2_2020_v3.csv`, 514 regions) is retained for the possible
future kabupaten-level model.

**Access note.** `www.bps.go.id` returns 403 to every automated fetch, including its
provincial subdomains. The **WebAPI** at `webapi.bps.go.id` is the working route; an
application must be registered under the account (the account alone yields no key). The
`th` parameter uses internal ids, not calendar years: **th = year − 1900** (2025 → 125).

### Elasticity

**Source:** Hamzah, I. (2022), *Understanding Indonesian Most Strategic Food Consumption
Pattern and Welfare Impact of Price Increase Events*, MSc thesis, Swedish University of
Agricultural Sciences (SLU), Dept. of Economics No. 1450, ISSN 1401-4084. QUAIDS
estimated on **Susenas 2018 microdata, 295,155 households** (representing 70.1 million),
Table 26. Read in the primary source, not from a search summary.

Uncompensated (Marshallian) conditional own-price elasticities, national:

| SupplAi commodity | Thesis class | ε | SE | 95% CI |
|---|---|---:|---:|---|
| Beras Medium | Rice | −0.385 | 0.019 | [−0.422, −0.348] |
| Bawang Merah | Shallot | −0.702 | 0.016 | [−0.733, −0.671] |
| Bawang Putih | Garlic | −0.722 | 0.019 | [−0.759, −0.685] |
| Daging Ayam | **Meat** | −0.356 | 0.015 | [−0.385, −0.327] |
| Telur Ayam | Chicken egg | −0.699 | 0.031 | [−0.760, −0.638] |
| Minyak Goreng | Cooking oil | −0.505 | 0.024 | [−0.552, −0.458] |

Regional estimates exist for five groups (Sumatera, Java-Bali, Kalimantan, Sulawesi,
Nusmapua) and our 34 provinces map onto them. Regional values are used where significant;
they matter — Kalimantan rice is −0.625 against −0.385 nationally, which raises the
Kalimantan Utara volume from 35 t to 57 t.

**Because standard errors are published, volume is reported as a 95% confidence interval
computed from them** — replacing the arbitrary ε ∈ [0.3, 0.5] range of the previous draft.
That is a real improvement in kind, not just precision.

Four limitations that must travel with these numbers:

1. **It is a master's thesis, not a peer-reviewed article.** Weigh accordingly. It uses a
   standard method on large official microdata and reports standard errors, and its rice
   estimate (−0.385) sits inside the published range from other studies (−0.37 to −0.43),
   which corroborates it — but the provenance must be stated, not glossed.
2. **"Meat" aggregates chicken and beef by design.** The author explains why: beef alone
   appears in only 5% of households, so a disaggregated estimate would not represent
   Indonesian households. So Daging Ayam borrows an elasticity that also carries beef.
   Documented, principled — and still an approximation.
3. **Rice in Nusmapua is +0.090 (SE 0.124).** The CI crosses zero; the author calls it
   uncertain and notes it would imply a Giffen good. **Provinces in NTB, NTT, Maluku,
   Maluku Utara, Papua and Papua Barat must not use the regional rice elasticity** — they
   fall back to the national figure, flagged. This bites hardest in exactly the
   food-insecure eastern provinces the DPR documents single out.
4. **The data is Susenas 2018.**

---

## Subsystem 1 — Sizing

### Formula

```
konsumsi_bulanan(prov, kom) = per_kapita_regional(prov, kom) / 12 × populasi(prov)

volume(prov, kom, postur)   = ε(kom) × kenaikan_persen(prov, kom, postur)
                                     × konsumsi_bulanan(prov, kom)
```

Demand is inelastic, so a small supply addition moves price by more than its own share.
For rice in Kalimantan (ε = 0.625) adding 1% of supply moves price about 1.6%, so
countering a 2.08% rise needs 1.30% of monthly consumption. The "don't flood the market"
bound is produced *by the formula*, not bolted on: the volume is small because that is all
that is required, not because we capped it.

### Risk posture

`match.py` reads only the point forecast and discards uncertainty the pipeline already
computes. `forecast_path.parquet` carries `lo`/`hi`, built in `train.py:241` from the
**10th and 90th percentiles of the backtest residual distribution** per (commodity,
horizon) — an empirically calibrated 80% interval.

Under-supplying lets prices spike; over-supplying harms traders. That asymmetry is a
newsvendor problem. We do **not** claim to know the government's loss function — we make
the choice visible with numbers attached:

Worked on Kalimantan Utara / Beras Medium, using the **Kalimantan** regional elasticity
(ε = −0.625, SE 0.061) against a measured market of 4,424 t/month:

| Posture | Reads | Volume | 95% CI | % of market | vs median real shipment |
|---|---|---:|---|---:|---:|
| Konservatif | `lo` (p10) | 0 t | — | 0.00% | — |
| Seimbang | `ensemble` (p50) | 57.4 t | 46.4–68.4 t | 1.30% | 10.4× |
| Aman pangan | `hi` (p90) | 59.2 t | 47.8–70.5 t | 1.34% | 10.8× |
| *(old code)* | — | *800 t* | — | *18.08%* | *145.5×* |

Aman pangan ships only 3% more than Seimbang despite reading a much larger predicted rise,
because the symmetric cap binds — that is the cap working, not a flat response. Konservatif
returns the status `"tidak perlu intervensi"`: at the p10 path nothing is predicted to rise,
and the honest output is an empty plan with a reason, not a fabricated shipment.

All three are precomputed; `flows.parquet` gains a `postur` column and 3× the rows.

### Symmetric cap

The Bapanas EWS classifies price anomalies symmetrically — a fall is treated as seriously
as a rise:

| Status | IFPA band |
|---|---|
| Alert (Low Price) | −2.08 … −1.01 |
| Warning (Low Price) | −0.97 … −0.51 |
| Normal | −0.50 … 0.43 |
| Warning (High Price) | 0.52 … 0.92 |
| Alert (High Price) | 1.22 … 2.67 |

We do not have the IFPA formula and cannot compute it for arbitrary prices. We take the
**principle**, not the index: the shipment must not depress the destination price by more
than the move that would trigger a "Warning" on the downside. That bound is implemented
with the **per-commodity percentile bands already calibrated in
`agent.py:severity_thresholds` (p70/p85/p95), applied symmetrically to the downside**.
The cap therefore references an official government stance rather than a number we chose.

### Adequacy output

Once the required volume is known, comparing it against real intervention is nearly free
and answers the offtaker's own question. From the 1 Sep 2026 DPR document: GPM 2027 is
planned at 1,888 activities for Rp49.7 bn ≈ **Rp26.3 M per activity**, and the DPR staff
ask whether GPM *"menjadi intervensi harga atau sekadar event."*

Worked example, Kalimantan Utara rice:

| | |
|---|---|
| Required (Seimbang) | 57.4 t/month |
| GPM delivered | 24 events / 7 months × 1.55 t = **5.3 t/month** |
| **Adequacy** | **9.2%** |
| National GPM | 985 events/month ≈ 1,524 t/month = **0.081% of the national rice market** |

New column: `kecukupan_persen`. **Three caveats must render attached to the number, not
in a footnote:**

1. GPM is not the only instrument — CPP disbursement is far larger (98.76% of Bapanas's
   2025 realisation).
2. The Rp26.3 M/event figure is a **2027 plan** applied to **2026 realisations**.
3. GPM sells several commodities; the rice-price conversion is indicative only.

Presented without these, the number overstates what we know. It is an illustration of what
the tool can answer, not a finished finding.

### Module: `supplai/kebutuhan.py`

```python
class Kebutuhan:
    def konsumsi_bulanan(self, komoditas: str) -> pd.Series      # index=provinsi, ton/bulan
    def volume_intervensi(self, komoditas: str, postur: str) -> pd.Series
    def anggaran_nasional(self, komoditas: str) -> float | None  # ton, from Neraca column
    def kecukupan(self, komoditas: str) -> pd.DataFrame          # required vs GPM-delivered
    def cakupan(self) -> pd.DataFrame                            # per-commodity basis + status
```

`cakupan()` is the honesty gate. It reports, per commodity, the **resolution** of each
input: whether consumption is regional or national, whether elasticity is regional or
national, and whether a national budget exists. All six commodities are sizeable today;
none falls back to the old heuristic, and any that loses an input in future must surface
an explicit "no data" state rather than degrade silently.

### Changes to `supplai/match.py`

| Today | Becomes |
|---|---|
| `total_stock_ton = 1_000` | `Kebutuhan.anggaran_nasional()` — the **Neraca** column |
| `kebutuhan_ton = stock × urgensi_share × 1.5` | `Kebutuhan.volume_intervensi(kom, postur)` |
| `kapasitas_ton` (source side) | stays heuristic — **newly bounded** so a source cannot ship itself into deficit |

The source side remains an assumption because per-province production data is not
available to us. Disclosed per row, not hidden.

### New columns on `flows`

`konsumsi_tujuan_ton_bulan`, `persen_pasar`, `postur`, `epsilon`, `epsilon_sumber`,
`volume_ci_bawah`, `volume_ci_atas`, `dasar_takaran`, `kecukupan_persen`.

### How much of this is actually measured — read this before quoting the headline

The destination-side **requirement** is measured. The **shipped volume** frequently is not:
the source-side rule (a province may spare at most 10% of its own monthly consumption)
binds more often than not, and when it does, the tonnage on the plan was set by that
heuristic rather than by the requirement.

In the built artifacts, `dasar_takaran` reads **"diasumsikan" for 57 of 72 routes** and
"terukur" for 15. So "population-based volume sizing" describes how the *need* is
established, not how every *shipment* is finally sized.

This is not a defect in the source rule — capping a source at a tenth of its own
consumption exists precisely to stop a plan gutting the province it draws from, and binding
is its purpose. But the distinction has to travel with the numbers. The dashboard must show
`dasar_takaran` beside every volume, and any summary that says "measured" without it is
overstating what this system knows.

---

## Subsystem 2 — Narration

### Two kinds of explanation; only one needs an LLM

- **Feature explainers** ("what this table shows, how to read it") do not change when data
  changes. ~8 static strings, human-written and reviewed. **No LLM.**
- **Data explanations** ("what these numbers say now") change every retrain. ~230 targets:
  1 executive summary, 6 per commodity, 204 per province×commodity, one per alert (11 in
  the current artifacts; the count moves with each retrain), 6 per redistribution plan.
  **LLM.**

### Pipeline: `supplai/narasi.py`

```
artifacts/*.parquet
  └→ build FACT BLOCK        JSON of values already computed in Python
  └→ cache lookup            key = sha256(facts + prompt_version + model_id)
  └→ miss → OpenAI Responses API, gpt-5.4-nano  (pinned gpt-5.4-nano-2026-03-17)
  └→ NUMBER VERIFIER         every numeral in the text must exist in the fact block
  └→ pass → artifacts/narasi.json → export_web.py → src/data/generated/narasi.json
  └→ fail 2× → narrative dropped; the table renders bare
```

**Number verifier.** Instructing a model not to invent numbers is a hope, not a guarantee.
Every numeral is extracted, normalised from Indonesian formatting (`17.000`, `2,08%`), and
matched against the fact block within a rounding tolerance. Unmatched → reject. Two
failures → drop the narrative. **Fail closed, never fail silently.**

Smoke-tested: `gpt-5.4-nano` obeyed the constraint on a grounded prompt (124 tokens total).
Key present in root `.env` (not a git repo; `supplai-dev/.gitignore` already covers
`.env*`).

**Cache.** Content-addressed, so a retrain pays only for changed facts. A full cold build
of ~230 narratives ≈ 90k input + 45k output tokens. Rupiah cost to be pinned against
published pricing.

**Reports are cache-first with a self-warming live fallback.** A report is addressed to
someone, so the useful units are far fewer than the filter cross-product:

| Report | Unit | Count |
|---|---|---|
| Regional government | one province, all commodities | 34 |
| Central government | national | 1 |
| Trader | one province as origin | 34 |
| Trader | national, per commodity | 6 |
| | | **75** |

All 75 are pre-baked, so realistic requests are warm and work offline. Date range is
**not** a cache dimension — the horizon is fixed at 3 months; 7/14/30 changes the history
window on a chart, not the recommendation. Unusual selections generate live and are
written back to the cache. Free multi-province selection is **not** offered for reports —
a report addressed to "Jabar + Maluku + Papua" has no reader.

**PDF.** `html2pdf.js` (already a dependency) renders client-side from cached narratives
plus live tables, in two framings: government (where to intervene, how many tons, at what
cost, and whether current intervention is adequate) and trader (where the price gap covers
freight).

---

## Front-end changes

- New generated data: `narasi.json`, `laporan.json`; `flows` tripled by posture.
- New `<Penjelas>` component, two visually distinct variants — static (human-written) and
  AI-generated. AI-generated blurbs **must** be marked as such.
- **Redistribusi page** changes most: route table gains `Volume`, `% pasar tujuan`,
  `Dasar takaran`, `Kecukupan`; a three-position posture switch above it moves the numbers
  live. `persen_pasar` renders as a banded bar, not a bare number.
- `filter-bar.tsx`: the export button currently fires `toast.success("Laporan berhasil
  diunduh")` and produces no file. Replaced with a real report preview + download.

### Removals

- `src/components/agent/agent-panel.tsx` — deleted. It fabricates both figures
  (`Rp 135.200` Jakarta beef) and causation ("minimnya curah hujan di daerah sentra
  produksi Jawa Barat") from a `setTimeout`, with no model behind it.
- Its references in `src/app/(dashboard)/layout.tsx` (import line 6, render line 78) and
  the `isAgentOpen` state/trigger.

---

## Honesty ledger

A machine-readable table shipped with the artifacts: for each input, its value, source,
year, and status (*measured* or *assumed*). Feeds the report and UI tooltips, so "where did
this number come from?" is answered by the product.

## Error handling

All failures are loud or closed; none silent.

- Commodity without a consumption coefficient → explicit "no data" state, **never** a
  silent fallback to the old heuristic.
- Commodity without a neraca (Bawang Putih) → sized normally, but `anggaran_nasional()`
  returns `None` and the plan runs uncapped, stated in the UI.
- Regional elasticity whose CI crosses zero (rice in Nusmapua) → fall back to the national
  figure and flag the row. Never size on a coefficient that is not significantly
  different from zero.
- Province missing from the population table → excluded, by name, in a logged error.
- Narrative fails verification twice → dropped; table renders bare.
- No API key → narration stops with a clear message; the model stage is independent and
  still produces artifacts.
- Negative `Neraca` → no routes, with the explanation that domestic redistribution cannot
  fix a national shortfall. All six commodities are in surplus for 2026 — a guard, not a
  live case.

## Testing

- **External ground truth #1:** the per-capita derivation must reproduce the published BPS
  figure (rice 79.077 vs neraca-derived 79.2, within 0.5%).
- **External ground truth #2:** computed volumes must land within one order of magnitude of
  observed real shipments (median 5.5 t, max 30 t). The current heuristic fails this at
  145×; it is a genuine regression guard, not a vanity check.
- **Properties of `volume_intervensi`:** zero when predicted change ≤ 0; monotonic in ε and
  in the predicted rise; never exceeds the national budget; never exceeds the symmetric
  low-price cap.
- **Ingest:** commodity-label normalisation must collapse `Gula`/`Gula `/`gula` to one key;
  a test asserts no duplicate keys survive.
- **Verifier:** adversarial fixtures with invented numbers must be rejected.
- **Cache:** identical facts produce zero API calls (mocked client).

## Downstream churn

Every route volume changes, so `hemat_rp`, `meta.json:plan_meta`, the generated FE JSON,
`Proposal_Tahap3_SupplAi.md`, `LAPORAN_TEKNIS_E2E.md`, and the video narration all carry
stale numbers afterwards. Reconciling them is part of this work. It compounds the pending
stale-number list mapped in §14 of `LAPORAN_TEKNIS_E2E.md`.

## Open risks

1. **The elasticity source is a master's thesis, not a peer-reviewed article,** and its
   data is Susenas 2018. Method and sample are strong and its rice estimate is corroborated
   by published work, but provenance must be stated wherever the numbers appear.
2. **Daging Ayam borrows the "Meat" elasticity, which also carries beef.** A principled
   aggregation by the author (beef appears in only 5% of households), still an
   approximation.
3. **Rice elasticity is not usable in the Nusmapua region** (CI crosses zero). Those
   provinces fall back to the national figure — and they are precisely the food-insecure
   eastern provinces the DPR documents highlight.
4. **Bawang Merah and Bawang Putih use national consumption coefficients** while four
   commodities use regional ones; **Bawang Putih additionally has no national budget cap.**
   Mixed resolution, stated per commodity in the ledger.
5. **Adequacy figures rest on a 2027 plan applied to 2026 realisations**, one instrument
   among several, converted at a single commodity's price. Caveats must render with the
   number.
6. **Consumption is 2025, population 2025, elasticity 2018, neraca 2026.** Mixed vintages
   throughout. Each is the latest available for its input; the ledger states the year per
   input so no reader has to assume they share one.

*Closed since the first draft: the population vintage risk (was COD-PS 2020, now BPS
2025) and the elasticity-unsourced risk (was 5 of 6 commodities, now all 6 with published
standard errors).*
