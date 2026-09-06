# Population sizing — decisions taken during execution

Automated execution of `plans/2026-09-06-population-sizing.md` on 2026-09-06.
Every line below marked `Ruling:` is a decision made on the team's behalf while the
plan was running, with what it costs if wrong. Kept because none of it is recoverable
from git history. Reverse anything you disagree with.

# SDD ledger — plan: supplai-dev/docs/superpowers/plans/2026-09-06-population-sizing.md

Spec: supplai-dev/docs/superpowers/specs/2026-09-06-population-sizing-and-ai-narration-design.md (read)
Working dir: /home/jupyter/kawa-temp/hackathon_phase2
Interpreter: /opt/conda/envs/dicoding/bin/python

## Pre-flight conflict scan

| # | Pair / task | Produces -> consumes | Finding |
|---|---|---|---|
| 1 | T1 -> T5,T6 | `region_of(prov)` -> elasticity lookup | clean; signature matches |
| 2 | T2 -> T5,T6 | `data/elastisitas.csv` cols komoditas,wilayah,epsilon,se,signifikan | clean; T6 reads all five |
| 3 | T3 -> T5,T7 | `data/neraca_nasional.csv` col neraca_ton | clean; T7 `anggaran_nasional` reads it |
| 4 | T4 -> T5 | `data/konsumsi_per_kapita.csv` -> `konsumsi_bulanan` | **DEFECT A** (see rulings) |
| 5 | T5,T6,T7 same file | supplai/kebutuhan.py, additive appends | clean; sequential, no overlap |
| 6 | T7 -> T11 | `GPM_RP_PER_KEGIATAN` module constant | clean; importable |
| 7 | T5-T7 -> T8 | Kebutuhan methods -> build_plan | clean; `kecukupan(kom, Series, Series)` matches call site |
| 8 | T8 -> T9 | build_plan signature -> rebuild_plan.py + train.py | clean; both pass `keb, postur=, forecast_path=` |
| 9 | T9 -> T10 | flows columns + `postur_tersedia` in meta.json | clean; exporter reads both |
| 10 | T9 -> T11 | rebuild_plan.py modified twice (T9 creates, T11 appends) | clean; T11 append is additive |
| 11 | T8,T11 | match.COST_PER_TON_KM -> buku_besar | clean; no import cycle (match never imports kebutuhan) |
| 12 | T5 self | test asserts `punya_neraca is False` vs pandas bool | **DEFECT B** (see rulings) |
| 13 | T0,T10 self | two repos; root init vs FE feature branch | clean; T10 branches supplai-dev separately |
| 14 | T2,T6 self | insignificant-elasticity rule stated in both | clean; consistent fallback to national |

## Rulings

Ruling: Isolation — Task 0 creates the root repo, so there is nothing to isolate from (no history, no remote, no collaborators); Python work runs on its initial branch. FE work runs on `feat/population-sizing`, never on the shared `dev`. Cost if wrong: FE commits landing on `dev` would need moving — recoverable.

Ruling: `.superpowers/` was not git-ignored in supplai-dev, so the SDD workspace would have been committed. Added the pattern to supplai-dev/.gitignore before any commit. Cost if wrong: none; it is scratch.

Ruling: DEFECT A — the plan built market size from the regional consumption table raw, which puts national rice 10.85% above the Bapanas balance sheet, so Task 5's <2% ground-truth test would have failed. The regional table's "Beras" is the broader definition already documented in the spec's definition trap. Decided: keep the regional table for the SHAPE of variation and rescale the LEVEL by one factor per commodity to the Susenas anchor, which reconciles to 0.31%. Verified: variation ratio unchanged at 1.98x. Patched Task 4 (script + provenance + two new tests). Cost if wrong: market sizes ~11% smaller than the raw table implies, so volumes ~11% smaller and persen_pasar ~11% larger — errs toward caution.

Ruling: DEFECT B — Task 5's test asserted `punya_neraca is False`; pandas returns numpy.bool_ so identity never matches and the test could never pass. Rewrote to truthiness. Cost if wrong: none; mechanical.

Ruling: Population-weighted kabupaten aggregation was tried first as a less invasive fix for DEFECT A and abandoned — COD-PS adm2 pcodes matched 0% of the source's Kode_Wilayah. Cost if wrong: a weighted aggregation might have been more accurate than calibration; the calibration is documented and reversible.

## Progress

Pre-flight verification (controller, no project files written):
- Task 3 column indices exercised against all six spreadsheets: 6 commodities, 19 rows,
  zero duplicates, Beras 2026 = 16,248,732 and Bawang Merah 2026 = 41,882 both match the
  task's asserted values. Task 3 will pass as written.
- Task 4 calibration verified: 0.31% against the balance sheet, variation ratio 1.98x held.

Task 0: dispatched (sonnet) — repo init + secret-safe gitignore.
Task 0: implementer DONE (commit 009ae28). Secret gate held — .env untracked, 0 matches.
Task 0: fix round 1/5 dispatched — see ruling below.

Ruling: The .gitignore I wrote in the plan was far too narrow — it named two zips (one with
a case typo, `supplai_` vs `SupplAi_`) and no media directories at all. Result: an 82 MB repo
with 243 files, carrying two demo videos (14 MB + 7.3 MB), multi-megabyte PNGs, the PIDI
evidence pack, and the speaker deck. Decided: broaden the ignore list to the evidence/media
directories and redo the single initial commit. Safe because the repo has one commit, no
remote, and no collaborator — rewriting it destroys nothing anyone holds, and `git rm --cached`
leaves every file on disk. Cost if wrong: if the team later wants those artefacts versioned
here, they re-add them deliberately; nothing is lost from the filesystem.
Pre-flight verification (continued): Task 1 mapping is exactly the artifact's 34 provinces
with the asserted group sizes (10/7/6/6/5); Task 2 elasticity table is 36 rows with exactly
one positive and one insignificant entry, both Beras Medium/Nusmapua. Both pass as written.
Task 0: fix round 1/5 (1 addressed, 1 open — repo down 243->96 files, 82MB->28MB; residual
bulk is `mentor list/` 24MB of PNGs; commit 009ae28 -> 8aef517)

Ruling: `mentor list/` (20 mentor-feedback screenshots, 24 MB) is reference material no script
reads — ignore it. `additional data/` stays tracked: only ~3.2 MB of it is tracked once the
PDFs and .docx are excluded, and Tasks 3 and 4 read those .xlsx files, so versioning them is
what makes the ingest reproducible. Cost if wrong: the screenshots stay on disk and can be
added deliberately later; nothing is lost.
Task 0: fix round 2/5 (1 addressed, 0 open — 96->76 files, 28MB->4.3MB; commit 8aef517 -> af9544f)
Task 0: task review — spec ❌ (1 Critical, 2 Minor) + 1 security observation. All trace to the
  brief's text, not the implementer's execution.
Task 0: fix round 3/5 dispatched.

Ruling: Critical — the .gitignore claimed the 49 MB WFP CSV and the World Bank pinksheet were
"tracked out-of-band; see README", but no fetch script, LFS pointer or DVC config exists, while
supplai/data.py and supplai/exogenous.py read those paths. The claim was false. Decided: do NOT
track the 49 MB public dataset (twelve-fold repo bloat to prove a point is the wrong trade);
instead make the claim true by naming both sources and their URLs in the ignore file, and state
that nothing in the sizing pipeline needs them. Cost if wrong: a fresh clone still cannot run
train.py without two manual downloads — now documented rather than implied. A real fetch script
is a worthwhile follow-up outside this plan.

Ruling: Security — review found supplai-dev-dev/id_ed25519.pub on disk is an OpenSSH PRIVATE key
despite its .pub name, protected only by the directory pattern. Added explicit key patterns
(id_rsa*, id_ed25519*, *.pem, kaggle.json, ...) as defense in depth. Cost if wrong: none; the
patterns match nothing the project needs tracked. SEPARATE ACTION FOR THE USER: that key is the
one previously committed to the public FE repo and still needs rotating by its owner.

Task 0: minor (deferred): *.docx and *.pdf are repo-wide rather than scoped to `additional data/`.

Ruling (pre-flight, Task 8): I dry-ran the Task 8 LP before dispatching it and it produced ZERO
routes under all three postures — its first test (`status == "ok"`) would have failed. Two defects
in my own plan text:
  (a) I dropped the old `dispatch_share` lower bound and left only upper bounds. With every
      freight cost positive and nothing pulling volume in, minimising cost makes shipping nothing
      optimal, and the solver returned an empty plan.
  (b) Surplus was classified as `naik < 2%` under the *posture* path, so at p90 almost every
      province is rising and the surplus set emptied entirely.
Decided: (a) measured demand becomes a LOWER bound — the LP sources a known requirement at least
cost — scaled down proportionally if source capacity cannot cover it; the urgency-benefit term in
the objective is dropped as unnecessary once demand is a constraint. (b) classification uses the
POINT forecast under every posture, so the route map is stable and the posture moves volumes
rather than reshuffling the map — which is what the spec's posture switch is meant to do.
Verified after the fix: konservatif "tidak perlu intervensi", seimbang 57.4 t (1.30% of market,
10.4x median real shipment), aman_pangan 59.1 t — the symmetric cap visibly binding. All Task 8
assertions pass. Added two tests: one for the empty-conservative case, one asserting the cap
still binds. Cost if wrong: if capacity is ever short the proportional scale-down silently
under-serves every destination equally rather than prioritising the worst — defensible, but it is
a choice, and a priority rule would be the alternative.
Task 0: fix round 3/5 (3 addressed, 0 open; commit af9544f -> e7de3d9)
Task 0: re-review clean — all three findings ADDRESSED, HDX dataset id confirmed to resolve
  ("Indonesia - Food Prices"), no new breakage, all four tracked paths still visible to git.
Task 0: complete (commit e7de3d9, review clean, 1 minor deferred)
  Controller independently verified: 76 files, 4.3M, 1 commit, 0 secrets tracked, and the new
  key patterns catch id_ed25519.pub / sub/id_ed25519 / sub/server.pem in an isolated repo
  WITHOUT the directory rule.

Tasks 1+2: batched (same shape — a static file plus its guard test, both pre-verified by the
  controller to pass as written). BASE=e7de3d929844bbbb4ca3107b88a3077ef95e7dee

Ruling (pre-flight, Tasks 5+6): two numeric test bounds in my plan were taken from the spec's
worked example, which computed Kalimantan Utara's market from the NATIONAL per-capita figure
(79.077 kg -> 4,917 t/month -> 64 t). The implementation uses that province's OWN calibrated
regional figure (70.74 kg -> 4,422 t/month -> 57.5 t), because regional variation is the entire
reason we adopted that dataset. Both bounds would have failed. Decided: the implementation is
right and the spec's worked example is stale — widened Task 5's market bound to 4,200-4,700 and
Task 6's volume bound to 52-63, each with a comment saying why. Verified the surrounding
assertions still hold: Task 5's ground-truth check is 0.31% (needs <2%), Task 7's adequacy is
9.2% (needs 3-20%). Cost if wrong: none to the code; it is the spec's §"Risk posture" and
§"Adequacy output" tables that now need reconciling to 4,422 / 57.5 t / 9.2% — logged as
follow-up, not silently left.

FOLLOW-UP FOR RECONCILIATION (after the plan lands): spec worked-example numbers
4,917 t/month, 64 t, 8% become 4,422 t/month, 57.5 t, 9.2%.
Tasks 1+2: implementer DONE — 11 tests pass, commits 2139695 (wilayah) and f32d265 (elastisitas).

Ruling: controller housekeeping — the review-package script writes into `.superpowers/` at the
repo root, which became a git repo in Task 0 and did not ignore that path. Left alone, the next
`git add -A` would have swept the SDD scratch workspace into a commit. Added the pattern to the
root .gitignore myself rather than reopening the closed Task 0 for one line; it will ride along
in the next task's commit. Cost if wrong: none; it is scratch.

Ruling (pre-flight, Task 7): `kecukupan` looked up GPM activity by province name with a
`.get(prov, 0.0)` default, and the GPM file uses the post-2022 38-province split while the model
uses 34. All 34 of our names match directly, so no province silently returned zero — but the four
Papua splits were being DROPPED rather than merged. Papua would have reported 9 events instead of
69 and Papua Barat 16 instead of 42: a 7.7x understatement, and only 1.2% of national activity,
so it would never have shown up in an aggregate check. Decided: apply the same Papua merge the
consumption ingest already uses, as a named module constant with the reason in a comment. Cost if
wrong: none — the merge mirrors the province set the rest of the pipeline uses.

Tasks 1+2: task review dispatched.
Tasks 1+2: task review — spec ✅ both, quality Approved both, 0 Critical, 0 Important.
  Reviewer verified all 36 elasticity rows byte-for-byte against the brief and simulated that
  dropping `se` or renaming a region fails loudly.
Tasks 1+2: minor (deferred): no digit-level test of epsilon/se — a typo preserving sign and
  significance would pass (reviewer independently checked the values and found an exact match).
Tasks 1+2: minor (deferred): test_the_only_insignificant_row_is_nusmapua_rice is logically
  implied by test_significance_flag_matches_the_confidence_interval.
Tasks 1+2: complete (commits 2139695..f32d265, review clean, 2 minor deferred)

Tasks 3+4: batched (both are ingest scripts producing a reference CSV plus its guard test).
  BASE=f32d265f75c88019b3ca5de60aa8ffa854a7fc36

Ruling (pre-flight, Task 9): I ran the corrected LP across all 6 commodities x 3 postures before
dispatching. The conservative posture produces NO routes for ANY commodity — at p10 nothing is
predicted to rise, so it correctly ships nothing. But Task 9's test asserted all three postures
appear in flows.parquet, which would have failed. Decided: the test now asserts all three are
ATTEMPTED and recorded in meta.plan_meta with a named status, while flows contains only those
that produced routes. Demanding `konservatif` in flows would demand a fabricated shipment.
Added a second test asserting the empty posture carries a reason rather than vanishing.
Full matrix: 8/18 combinations produce routes; Bawang Merah and Minyak Goreng produce none in
any posture ("tidak ada pasangan surplus-defisit"), which matches the existing artifacts.
Sanity of the rest: Telur Ayam 613 t over 13 routes at max 3.64% of market; Daging Ayam 269 t
at max 0.89%; Bawang Putih 88 t at 3.36%. All far below the 10% flood threshold.
Cost if wrong: the FE posture toggle must render "this posture ships nothing" gracefully rather
than an unexplained empty table — carried into plan 2.
Tasks 3+4: implementer DONE_WITH_CONCERNS — commits 12e5a8a (neraca, 5/5) and f768690
  (konsumsi, 6/7). Calibration factors: Beras 0.8997, Daging Ayam 0.7921, Telur 0.9276,
  Minyak Goreng 1.2166.
Tasks 3+4: fix round 1/5 dispatched — one red test committed, plus uncommitted renames.

Ruling: the failing test is my defect, not the implementer's. tests/test_konsumsi_data.py:24
asserted the rice variation ratio > 2.0; the true value is 1.9845. The 2.76x I wrote into the
brief is the spread across the 38-province split — merging the four Papua provinces back into 34
pulls the extremes together. Decided: fix the threshold to 1.9 with the reason in a comment, and
patch the plan text to match. The implementer was right about the number and right not to edit a
test on its own authority. Cost if wrong: none; the assertion still fails if regional variation
collapses, which is what it exists to catch.

Ruling: the implementer independently found that the source spells "Bangka Belitung" without
"Kepulauan", so that province was silently falling back to the national mean while still being
labelled resolusi="regional" — a bug my own pre-verification printed and I failed to act on. It
fixed it via the existing rename dict. Accepted and kept. Cost if wrong: none; verified the
province now carries a real regional value (73.275 kg/capita/year).

Ruling: the seven `additional data/` renames and one duplicate deletion were left uncommitted
because the brief's `git add` list did not name them. The implementer read the brief correctly;
the brief was incomplete. Folding them into a fix commit so the tree matches the commits and
ingest_konsumsi.py's filename reference is tracked.
Tasks 3+4: fix round 1/5 (2 addressed, 0 open — 23 passed, tree clean; commit f768690 -> ff0530f)
Tasks 3+4: task review dispatched over the full range f32d265..ff0530f (3 commits).
Controller verification against the committed files: neraca 19 rows / 6 commodities / Bawang
  Putih correctly absent; konsumsi 204 rows with resolusi {regional:136, nasional:68}; rice
  population-weighted national mean lands exactly on the 79.077 anchor.
Pre-flight for Tasks 5-7 re-run against the REAL committed CSVs (not scratch reconstructions) —
  every assertion passes: ground truth 0.31% (<2%), Kaltara market 4,424 (4,200-4,700), Kaltara
  elasticity regional 0.625, NTT correctly falls back to national 0.385, volume 57.51 (52-63),
  rice budget 16,248,732, adequacy 8.3% (3-20%).
Tasks 3+4: task review — spec ✅ both, quality Approved both. 0 Critical, 3 Important (all
  latent test-coverage gaps, no defect in current data), 2 Minor. Reviewer verified live that
  the calibration is a single uniform factor per commodity, that no province name mismatches
  remain, and that `resolusi` is truthful on every path.

Ruling: the three Important findings are about guards that do not guard — only 2 of 6 neraca
commodities and 1 of 4 calibrations are value-checked, so a wrong column index or a broken
factor for the others would pass every test. The reviewer graded them "follow-up, not blocking",
but a guard test that cannot fail is close to a test that asserts nothing, which this project's
own rubric treats as a defect. I had already verified all six neraca rows and all four factors
by hand during pre-flight, so encoding that verification costs one small round and makes the
guards real. Dispatched as fix round 2.

Ruling: Finding 3 — a province absent from the regional source was filled with an unweighted
mean of whatever provinces were present, labelled resolusi="nasional" (which reads as the
Susenas national figure, and is not), and fed back into the calibration weighted by the missing
province's real population. Zero provinces trigger it today. Decided: make it raise instead of
invent, per the project's own stated rule that a missing input is never silently defaulted.
Cost if wrong: a future source with a genuinely absent province halts the ingest instead of
producing a quietly wrong number — which is the failure mode this project prefers.

Tasks 3+4: minor (deferred): the regional fallback label conflated two fallback semantics
  (now removed by the Finding 3 fix).
Tasks 3+4: minor (deferred): test_calibration_preserves_relative_variation checks the final
  ratio, not that it equals the raw ratio — a non-uniform rescale landing above 1.9 would pass.
Tasks 3+4: fix round 2/5 (3 addressed, 0 open — 25 passed, tree clean, konsumsi CSV byte-identical
  which confirms no province was ever being invented; commit ff0530f -> 5ef8f45)
Tasks 3+4: scoped re-review dispatched.
Tasks 5+6+7: batched (three sequential additive edits to one file, supplai/kebutuhan.py; all
  assertions pre-verified against the committed CSVs). BASE=5ef8f45
Tasks 3+4: scoped re-review clean — all three findings ADDRESSED, konsumsi CSV absent from the
  fix diff (so the numbers genuinely did not move), neraca assertions use exact equality and the
  anchor tolerance is 0.05 kg/capita/year.
Tasks 3+4: complete (commits f32d265..5ef8f45, review clean, 2 minor deferred)
Tasks 5+6+7: implementer dispatched (sonnet).
Tasks 5+6+7: implementer returned BLOCKED — correctly. It diffed its files against the brief,
  found them identical, checked the data for stray rows, and refused to touch the failing test.

Ruling: CONTROLLER ERROR, not a plan or implementer fault. I had already corrected the Task 5
market-size bound in the plan (4_200-4_700), but when I regenerated the briefs I piped the
generator's output through `sed 's|.*/||'` to shorten it, which hid the path it printed. The
regeneration did not take effect and I handed the implementer the stale 09:45 brief while the
plan said something else. Fixed: regenerated all three briefs and VERIFIED THEIR CONTENTS by
grepping for each patched value rather than trusting the generator's own output line.
Process change for the rest of this run: after patching a task in the plan, regenerate its brief
AND grep the brief for the patched value before dispatching. Cost of the error: one blocked
implementer round, no wrong data committed — the implementer's refusal to edit a test is what
kept 4,424 from being papered over.
Tasks 5+6+7: implementer DONE — 40 passed, tree clean. Commits 60d9d15 (market size),
  e269f35 (volume + CI), eb7f1ff (budget + adequacy).
Controller end-to-end check of the class: cakupan() reports Beras Medium elasticity resolution
  as "campuran" (honest — Nusmapua falls back to national); Bawang Putih anggaran_nasional
  returns None; Kaltara 4,424 t/month market, 57.51 t volume with CI 46.5-68.5 sourced
  "regional"; NTT correctly sourced "nasional" at eps 0.38; adequacy 9.22%.
Tasks 5+6+7: task review dispatched. BASE for Task 8 = eb7f1ff8a9a4607f84f93860abf0308467a4c36b

Ruling: ROOT CAUSE of the stale-brief incident found. The task-brief generator resolves the
workspace from the invocation context, and since Task 0 made the project root a git repo there
have been TWO workspaces: `.superpowers/sdd/...` at the root and `supplai-dev/.superpowers/sdd/...`.
Briefs were landing in whichever the script picked, and I was grepping the other one. Decided:
delete every duplicate brief, keep ONE workspace at the repo root, copy the ledger and reports
across, and from here on read the path the script prints and verify content at THAT path before
dispatching. Cost of the error: one blocked implementer round, already paid.

Ruling: a ninth plan defect found by that verification — Task 9's Step 2 still invoked pytest with
the OLD test name (`test_rebuilt_flows_carry_all_three_postures`) after I renamed the test itself.
The implementer would have run a selector matching nothing, seen "no tests ran", and had to guess
whether that counted as the expected failure. Renamed in the plan and brief regenerated.
Cost if wrong: none; caught before dispatch.
Tasks 5+6+7: task review — spec ✅ all three, quality Approved all three. 0 Critical, 2 Important,
  2 Minor. Reviewer independently reproduced 22.58 Mt/year within 0.32%, verified the Papua merge
  arithmetic against the raw spreadsheet (9+55+4+1=69, 16+26=42), and confirmed all four honesty
  properties are visible to callers rather than merely handled.

Ruling: Important #1 — `n_bulan` in kecukupan counted distinct month NAMES, so a file spanning two
years would fold "Januari 2025" into "Januari 2026" and silently halve every adequacy figure. The
current file is single-year so both readings give 7 and nothing changes today. Fixed to count
(Tahun, Bulan) pairs. Cost if wrong: none; behaviour-preserving on present data.

Ruling: Important #2 — `test_adequacy_is_zero_where_no_gpm_ran` was named for the zero-activity
path but passed a province with 24 GPM events and asserted only `>= 0`, a bound that holds for
almost any implementation including one ignoring the GPM file entirely. My test, my defect. I
verified no province in the dataset has zero activity, so the path is only reachable with a name
absent from the file. Rewritten to use a fabricated province AND assert a real one differs from
it. Cost if wrong: none; the new test is strictly stronger.

Tasks 5+6+7: minor (deferred): GPM_BERKAS is a repo-root-relative path independent of the
  data_dir constructor argument — works only when cwd is the repo root.
Tasks 5+6+7: minor (deferred): konsumsi_bulanan gives no resolution signal at the point of use;
  a caller must separately consult cakupan(). Carry this into the match.py wiring in Task 8.
Tasks 5+6+7: fix round 1/5 (2 addressed, 0 open — 40 passed, tree clean; commit eb7f1ff -> 1dd1d65)
  Implementer flagged that adequacy computes 8.30%, not the 9.2% I quoted. It was right and I
  mis-cited: 9.22% belongs to a requirement of 57.5 t (the computed value), 8.30% to 63.9 t (the
  test fixture, taken from the spec's stale worked example). Verified both. No defect.
Tasks 5+6+7: minor (deferred): the kecukupan test fixture hardcodes 63.9 t where the pipeline now
  computes 57.5 t. The function takes the requirement as an argument so the test is valid, but the
  constant is stale — folded into the spec-number reconciliation follow-up rather than its own round.
Tasks 5+6+7: scoped re-review dispatched.
Task 8: implementer dispatched (sonnet). BASE=1dd1d65
Tasks 5+6+7: scoped re-review clean — both findings ADDRESSED, no collateral change to any other
  method or CSV. Reviewer's read on the stale 63.9 fixture: acceptable, not a correctness defect.
Tasks 5+6+7: complete (commits 5ef8f45..1dd1d65, review clean, 3 minor deferred)

Task 8: implementer returned BLOCKED — correctly, and its diagnosis found a real defect rather
  than a wrong test bound. It traced aman_pangan shipping 138 t instead of the expected 59 t to
  the `p70` fallback: my dry-run passed the thresholds table (rice p70 = 2.14) while the test
  helper passed nothing, so p70 defaulted to a hardcoded 5.0 and the safety cap came out 2.3x
  looser. 10/11 new tests passed; it refused to touch the failing one.

Ruling: the silent `p70=5.0` default is the defect, not the test bound. Checked the real values:
the default is arbitrary in BOTH directions — Beras Medium p70 is 2.14 (default 2.3x too loose),
Bawang Merah is 12.95 (default 2.6x too tight). A safety cap we invented is not a safety cap, and
this plan's own constraint says no input is silently defaulted. Decided: `build_plan` now raises
ValueError when thresholds are missing or lack the commodity; every production caller already
passes the table so no real code path is lost. Also deleted the urgency-banding fixed-cut fallback
`[-inf, 5, 10, inf]` as dead code — unreachable under the new guard, and a second invented scale
beside the calibrated one. Test helper now passes the real thresholds so tests exercise the
configuration that actually runs, plus a new test asserting the missing case raises.
Cost if wrong: a caller that genuinely has no thresholds now fails instead of silently using a
weaker cap — which is the failure mode this project prefers.
Task 8: BLOCKED a second time — again correctly. Making thresholds mandatory, I updated the
  plan() helper but missed the standalone build_plan calls: an incomplete propagation of my own
  change. Implementer hit the guard on the Bawang Putih test and refused to patch around it.

Ruling: enumerated EVERY build_plan call in the plan rather than the ones I remembered, and found
two. (1) test_commodity_without_a_balance_sheet_still_plans_but_uncapped now passes thresholds=THR
— its purpose is the missing balance sheet, not the thresholds guard. (2) test_unknown_posture_raises
was the more dangerous one and had not been reached yet: it caught a bare ValueError, so once
thresholds became mandatory it could have been satisfied by the THRESHOLDS error instead of the
posture error — passing while the posture check silently rotted. Now passes thresholds=THR and pins
the message with match="postur". Cost if wrong: none; both changes make the tests test what their
names claim.

Process note: the enumeration was scripted (regex over every build_plan call, checking each for a
thresholds argument) rather than done from memory. Doing it from memory is what caused this round.
Task 8: fix rounds 1-2 resolved; implementer DONE — commit 7523a53, 52 passed (40 baseline + 12
  new), tree clean. Beras Medium: konservatif "tidak perlu intervensi" 0 routes, seimbang 57.41 t,
  aman_pangan 59.16 t — the symmetric cap binding with rice's real p70 of 2.14.
Task 8: controller check — all 6 new flows columns present. Observed that dasar_takaran only ever
  takes the value "terukur"; the source-side capacity remains a declared heuristic. Raised with
  the reviewer as an open question rather than pre-judged. BASE for Task 9 = 7523a535076c891c7ad477ff085b0736041b7e3d
Task 8: task review — spec ✅ but quality NOT APPROVED. 1 Critical, 2 Important. Reviewer hand-
  checked the LP constraint matrix (supply rows, demand stride, sign convention, reshape order)
  and confirmed no transposition bug, and verified the proportional scale-down cannot exceed the
  cap it was clipped to.
Task 8: fix round 3/5 dispatched.

Ruling: Critical — `_kenaikan` returned the point forecast whenever forecast_path was None,
REGARDLESS of posture, so konservatif and aman_pangan would silently produce seimbang's numbers
under a different label. This is the identical defect class we removed from the p70 default two
rounds earlier, hiding in another function; no test touched it because every test passes FP.
Decided: raise for any posture needing the p10/p90 path, plus a parametrised test over both
postures and a test that seimbang still works without it. Cost if wrong: a caller with no
forecast_path must now pass one or use seimbang explicitly — the failure is visible either way.

Ruling: Important — ci_bawah/ci_atas were computed in kebutuhan and dropped when building flows,
so the primary output table stated volumes with no interval. Added volume_ci_bawah/volume_ci_atas,
scaled by what the cap and scale-down did to the point estimate, then split across routes serving
a destination in proportion to delivery. Cost if wrong: the split is proportional rather than
per-route-derived; the interval is the destination's, apportioned.

Ruling: Important — dasar_takaran was a hardcoded "terukur" on every row and no branch ever emitted
"diasumsikan"; it asserted a distinction it never computed, while a route's volume can be set by
the source heuristic. Now derived from whether the destination received its PRE-SCALING measured
requirement. This needed a second change: the scale-down overwrites kebutuhan_ton, so comparing
against it would always agree with itself — kebutuhan_terukur_ton is now preserved first.
Test value kapasitas_share=2e-5 verified against real data: 12 routes, 21.4 t delivered against a
57.4 t requirement, volumes above the dust filter. Cost if wrong: none; the label now moves.
Task 8: fix round 3/5 (3 addressed — 58 passed, posture results unchanged; commit 7523a53 -> 857d2a1)
Task 8: controller verification of all three fixes: konservatif/aman_pangan raise without
  forecast_path while seimbang still works; flows carry CI 46.43-68.39 bracketing 57.41; and with
  kapasitas_share=2e-5 the label flips to "diasumsikan" across 12 routes delivering 21.39 t
  against a 57.41 t requirement.
Task 8: scoped re-review dispatched. BASE for Task 9 = 857d2a10a26a49dc9b2a68212a0fbb4c3089bdd9
Task 8: scoped re-review clean — all three ADDRESSED, no breakage. Reviewer worked the algebra to
  confirm rasio in [0,1] and that ci_bawah <= volume_ton <= ci_atas survives the scaling, and
  confirmed the snapshot is taken after the price cap but strictly before the capacity scale-down.
Task 8: complete (commits 1dd1d65..857d2a1, review clean, 1 minor deferred)
Task 8: minor (deferred): volume_ci_bawah/atas are the DESTINATION's interval apportioned by
  delivery share, not a route-level interval. Reviewer's verdict: defensible given the adjacent
  comment, but the dashboard label in plan 2 should say "selang tujuan, dibagi menurut porsi
  kiriman" rather than implying a per-route interval.
Task 9: implementer dispatched (sonnet).
Pre-flight for Tasks 10-11: both constants the ledger imports exist with the expected names and
  values (COST_PER_TON_KM 2,500; GPM_RP_PER_KEGIATAN 26,300,000). Task 10's two patch anchors are
  present in scripts/export_web.py (the routes.append block at line 182, _response_for at 179,
  build_redistribution at 204) and RedistributionRoute is in src/lib/types.ts. TypeScript is
  installed locally so `npx tsc --noEmit` will not need a download.
Task 9: implementer DONE — commit 92ddc05, 60 passed (58 + 2 new), tree clean. 8 of 18
  commodity-posture combinations produce routes, matching the dry-run exactly. It self-reported
  dropping two import lines while transcribing, catching it by re-diffing against the brief
  before running anything — correct process, no test logic altered.
Task 9: controller verification — flows.parquet 72 rows (36 seimbang, 36 aman_pangan, 0
  konservatif); meta.json 18 plan_meta keys plus postur_tersedia; konservatif recorded two named
  statuses rather than vanishing; max persen_pasar 3.64% against the 10% flood threshold; CI
  columns present.
Task 9: NOTABLE — dasar_takaran splits 57 "diasumsikan" / 15 "terukur". For most routes the
  shipped volume is set by the source-side capacity heuristic (10% of a source's own monthly
  consumption), not by the measured requirement. The label built in Task 8 is doing exactly the
  job it was built for: telling us the result leans on assumption more than the headline implies.
  Raised with the reviewer for a verdict rather than pre-judged.
Task 9: task review dispatched. BASE for Task 10 = 92ddc0581820b9c03cb9f9891364f965402142e1
Task 9: task review — spec ✅ both files, quality Approved. 0 Critical, 0 Important, 2 Minor.
  Reviewer confirmed rebuild_plan.py and train.py agree structurally (same posture tuple, same
  plan_meta key format, same build_plan arguments, same metadata keys) and that forecast_path is
  genuinely in scope at train.py:320.
Task 9: minor (deferred): rebuild_plan.py writes meta with indent=1 while train.py uses
  indent=2, default=str — cosmetic, but a needless divergence in a task about producing the
  same shape; would frustrate a future diff-based retrain-vs-rebuild check.
Task 9: minor (deferred, pre-existing): train.py iterates its hardcoded COMMODITIES while
  rebuild_plan.py iterates forecast["komoditas"].unique() — they can drift.
Task 9: complete (commit 92ddc05, review clean, 2 minor deferred)

Ruling: reviewer's verdict on the 57/15 dasar_takaran split — the 10%-of-own-consumption source
cap is a floor-protection heuristic and binding often is its purpose, so the heuristic is not a
defect. But the "measured volumes" framing IS overstated: the destination requirement is measured
while the SHIPPED number is capacity-clamped 79% of the time. Decided: this is a communication
gap, not a code defect, and it is fixed downstream — the exporter must carry dasar_takaran into
the dashboard prominently rather than let "measured" stand unqualified, and the spec's own
language needs the same qualification. Carried into the Task 10 dispatch and added to the
reconciliation follow-up. Cost if wrong: none to the code; the risk is presenting assumption-set
numbers as measured to an offtaker whose expertise is exactly that distinction.

Ruling: reconciled the SPEC against the built implementation rather than leaving it as a
follow-up, because two of its numbers were now wrong in a way that would mislead a reader.
Changed: Kalimantan Utara market 4,917 -> 4,424 t/month (the code uses that province's own
regional per-capita, 70.7 kg, not the national 79.1); the posture table 64/181 t -> 57.4/59.2 t
with real CIs; the old plan's share 16.27% -> 18.08%; adequacy 8% -> 9.2%; and the
regional-vs-national elasticity illustration 39->64 t -> 35->57 t. Left a dated note in the spec
saying which figures were reconciled and why, rather than silently overwriting. All six
recomputed. Cost if wrong: none; the spec now matches what the code produces.

Ruling: added a new spec section, "How much of this is actually measured", stating plainly that
the destination requirement is measured while the shipped volume is capacity-clamped for 57 of
72 routes, and that any summary saying "measured" without dasar_takaran overstates what the
system knows. This closes the reviewer's finding at the level where the claim is actually made.
Cost if wrong: none; it narrows a claim rather than widening one.

Task 10: implementer BLOCKED — correctly, and it found two things my brief missed plus one it
  was not asked about. It verified the brief line-for-line first and confirmed baseline tsc was
  clean via git stash before blaming its own edit.

Ruling: Blocker 1 — src/data/redistribution.ts was absent from my Files list. It is the ONLY
consumer of the JSON whose shape I changed, and its Record<string, RedistributionResponse> cast
cannot type-check against a posture-keyed object. Added its full replacement to the brief:
getRedistributionData(commodity?, postur="default") through RedistributionByPostur, with a
comment that a posture producing no routes returns its own empty entry rather than falling
through to another posture's numbers. Cost if wrong: none; without it tsc simply fails.

Ruling: Blocker 2 — test_build_redistribution is a PRE-EXISTING test whose fixture predates the
Task 8-9 schema, so it now raises AttributeError on persen_pasar. The implementer was right not
to touch it unbidden and right that it was not part of "the append". Decided: it is a real test
and must be brought in line, not deleted or skipped. Full replacement added — fixture gains every
new column, meta gains postur_tersedia and the "Beras Medium|seimbang" key format, assertions
move to res["seimbang"]["beras"], plus a new assertion that konservatif appears with an empty
route list. Cost if wrong: none; the test now covers the shape actually produced.

Ruling: Blocker 3, unprompted — the root repository commit in my Step 5 would have been EMPTY,
because artifacts/ is git-ignored and nothing else in the root changed. Removed it; Task 10 now
makes a single supplai-dev commit on feat/population-sizing, never on the shared dev branch, and
does not push.
Task 10: implementer DONE — supplai-dev commit 518703c on feat/population-sizing (not pushed).
  Root Python suite 60 passed; tsc clean; redistribution.json keyed konservatif/seimbang/
  aman_pangan/default with konservatif empty throughout and default mirroring seimbang.
Task 10: controller verification — created a clean worktree of the unmodified `dev` branch and
  ran the FE test file there: 3 failed / 8 passed on dev, 3 failed / 10 passed on our branch.
  The three failures (build_heatmap_shape_and_change, build_commodity_mape,
  headline_mape_and_exec_values_parser_safe) are genuinely pre-existing, not a regression. We
  added two passing tests and broke nothing.
Task 10: FOR THE TEAM — those three tests are red on the shared `dev` branch of supplai-dev and
  predate this work entirely. Someone should look at them; they are outside this plan's scope.
Task 10: the implementer also had to change the main() self-check from redist["all"] to
  redist["default"]["all"] — neither brief version covered it, and without it export_web.py exits
  non-zero despite writing correct JSON. It flagged this in both rounds rather than hiding it.
  Referred to the reviewer for a scope judgement.
Task 10: task review dispatched.
Task 10: task review — spec ✅ all four files, quality Approved. 0 Critical, 1 Important, 3 Minor.
  Reviewer traced the TS fallback chain and confirmed konservatif cannot leak seimbang's numbers,
  and verified the plan_meta key format against the actual artifacts/meta.json.
Task 10: reviewer's verdict on the unauthorised main() assertion change — forced by the reshape,
  same file and same function, still fails loudly for its original purpose: in scope, not scope
  creep. The implementer was right to make it and right to flag it twice.

Ruling: Important — test_build_redistribution would pass against a completely broken plan_meta
lookup. The fixture's total_ton=700, n_rute=2 and total_biaya=3.75e9 coincidentally equal what
the code derives from the raw rows when the lookup misses, so a changed key format would leave
the test green. Only activeRoutes (from n_sumber/n_tujuan, which have no row-derived fallback)
would differ, and nothing asserted it. Added that assertion. Cost if wrong: none; it is the only
value that distinguishes a hit from a miss.

Ruling: Minor but the same defect class removed twice already today — build_redistribution read
meta.get("plan_meta", {}) and meta.get("postur_tersedia", ["seimbang"]), so a meta.json missing
either key would quietly export a single posture with empty summaries. Made both absences raise.
Cost if wrong: an exporter run against a stale meta.json now fails instead of producing a quietly
wrong dashboard — the failure mode this project prefers.

Task 10: minor (deferred): getRedistributionData falls back to `default` if a posture key were
  absent from the JSON. Unreachable today (fixed POSTUR list plus the Postur union type), but no
  guard exists if that drifts.
Task 10: fix round 1/5 (2 addressed — 3 failed/10 passed unchanged, tsc clean; commit 518703c -> 5d4dbdf)
Task 10: controller PROOF that the new assertion bites — with a broken plan_meta key format,
  totalRoutes (2) and totalVolume (700) are IDENTICAL to the correct case, which is exactly why
  the old test was blind; only activeRoutes differs, "2 → 1" vs "0 → 0". Missing meta keys now raise.
Task 10: complete (supplai-dev commit 5d4dbdf on feat/population-sizing, review clean, 3 minor deferred)
Task 11: implementer dispatched (sonnet). BASE=$(git rev-parse HEAD)
Task 11: implementer DONE — commit 4d86da5, 65 passed (60 + 5 new). Ledger has 8 entries:
  5 terukur, 3 diasumsikan (freight rate, GPM per-event budget, source-capacity heuristic).

Ruling: the implementer flagged, unprompted, that one ledger entry OVERSTATES its provenance —
"Konsumsi per kapita (regional)" claimed "diolah dari Susenas BPS". I checked: the kab/kota
spreadsheet has no provenance row, no footnote, no source line at all; it is a bare column dump.
Only the national ANCHOR used to calibrate the level is Susenas-derived; the regional SHAPE comes
from that undocumented file. The derived CSV's own header was already more careful than the ledger.
An overstated source claim inside the honesty ledger is the worst place for one, so: rewrote the
entry to say plainly that the file carries no source of its own and that only the calibration
anchor is Susenas-derived, kept status "terukur" (the values are measurements; we just cannot
document who took them), and added a test so the claim cannot creep back. Cost if wrong: none —
it narrows a claim. This is the finding the ledger existed to make possible, found by an agent
asked to judge its own output rather than only transcribe it.
Task 11: fix round 1/5 (1 addressed — 66 passed; commit 4d86da5 -> bb35be6)
Task 11: complete (commits 92ddc05..bb35be6, review clean)

ALL 12 TASKS COMPLETE. Root: 16 commits, 66 tests passing, tree clean.
supplai-dev: 2 commits on feat/population-sizing (518703c, 5d4dbdf), not pushed, tree clean.
Final whole-branch review dispatched on opus with the spec, plan, 15-commit diff, the
deferred-minor list and this ledger.

Note for the final review / merge: two commits share the message "feat: match.py sizes routes
from measured demand, not assumed stock" (7523a53 and 857d2a1) — the second is Task 8's fix
round, which reused the brief's message. Cosmetic; a human may want to reword before merging.
