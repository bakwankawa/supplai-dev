# Narration, Redistribution Report, and Posture UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the population-based sizing visible and explainable — a posture switch, the honesty columns, the ledger, a redistribution report, and grounded generated prose where no explanation exists.

**Architecture:** Three layers, each testable alone. Python (`export_web.py`, `supplai/narasi.py`) produces JSON artifacts; pure TypeScript modules under `src/lib/redistribusi/` compute and phrase; React components render. Nothing in a component computes a number. Generated prose is built offline, number-verified, and shipped as static JSON — the running product makes no model calls.

**Tech Stack:** Python 3.10 (pandas, openai 2.29), Next.js 16 / React 19 / TypeScript, jsPDF 4.2, vitest 4.1, pytest.

**Spec:** `docs/superpowers/specs/2026-09-06-narasi-laporan-dan-postur-design.md`

## Global Constraints

- **Two repositories.** Front-end work is in `/home/jupyter/kawa-temp/hackathon_phase2/supplai-dev` on branch `feat/population-sizing` (PR #8, open). Pipeline work is in the root repo `/home/jupyter/kawa-temp/hackathon_phase2` on `master` (no remote). Each task names which.
- **Python interpreter: `/opt/conda/bin/python`.** It is the only interpreter with `openai` installed. `/opt/conda/envs/dicoding/bin/python` does **not** have it. Both have pandas/scipy/pytest.
- **No silent fallbacks.** An unknown posture, a missing `plan_meta` key, or an unverifiable narrative fails loudly or is dropped. Never substitute a neighbouring value.
- **All user-facing copy is Indonesian.** Numbers use Indonesian conventions: comma decimal separator, dot thousands separator (`57,41 t`, `Rp100.692.943`, `1,30%`).
- **Every machine-generated paragraph is visually marked** and labelled as such.
- **Commit messages carry no `Claude-Session:` attribution line.**
- Run front-end tests with `npm test` (vitest, already configured in `vitest.config.mts`). Run pipeline tests with `/opt/conda/bin/python -m pytest`.
- Do not touch `src/lib/prediction/*` or the prediction page. That is Tama's work and it is correct.

---

## File Structure

**Root repo** (`/home/jupyter/kawa-temp/hackathon_phase2`)

| File | Responsibility |
|---|---|
| `supplai/narasi.py` | Fact blocks, number verifier, content-addressed cache, OpenAI call. Writes `artifacts/narasi.json`. |
| `tests/test_narasi.py` | Verifier adversarial cases, formatting rules, cache behaviour. |

**Front end** (`supplai-dev`)

| File | Responsibility |
|---|---|
| `scripts/export_web.py` | *(modify)* carry `status`, prices, ledger, narration into generated JSON |
| `scripts/tests/test_export_web.py` | *(modify)* assertions for the above |
| `src/lib/types.ts` | *(modify)* new route/summary fields, `BukuBesarEntry`, `Narasi` |
| `src/lib/redistribusi/postur.ts` | posture constants, labels, `isPostur` guard |
| `src/lib/redistribusi/status.ts` | solver status → human sentence |
| `src/lib/redistribusi/analysis.ts` | pure facts: totals, takaran split, trader margins |
| `src/lib/redistribusi/report.ts` | jsPDF vector report, two framings |
| `src/app/api/redistribution/route.ts` | *(modify)* accept and validate `postur` |
| `src/app/api/redistribution-report/route.ts` | serve the PDF |
| `src/components/redistribusi/posture-switch.tsx` | three-position control |
| `src/components/redistribusi/route-table.tsx` | *(modify)* honesty columns, status-driven empty state |
| `src/components/redistribusi/buku-besar-panel.tsx` | the ledger, all entries |
| `src/components/ui/narasi.tsx` | marked machine-generated prose block |
| `src/app/(dashboard)/redistribusi/page.tsx` | *(modify)* wire posture, report button, ledger, narration |

---

## Task 1: export_web carries status, prices, and the ledger

**Repo:** `supplai-dev`

**Files:**
- Modify: `scripts/export_web.py` (`load_artifacts`, `_response_for`, `build_redistribution`, `main`)
- Modify: `scripts/tests/test_export_web.py`
- Regenerate: `src/data/generated/redistribution.json`, `src/data/generated/buku_besar.json`

**Interfaces:**
- Consumes: `artifacts/flows.parquet` columns `harga_asal`, `harga_tujuan`, `hemat_rp`; `artifacts/meta.json` key `plan_meta` (18 entries keyed `"<Komoditas WFP>|<postur>"`, each with a `status` string); `artifacts/buku_besar.json` (list of 10 dicts with keys `input`, `nilai`, `sumber`, `tahun`, `status`).
- Produces: every `summary` object gains `status: str`; every route gains `hargaAsal: int`, `hargaTujuan: int`, `hematRp: int`; a new generated file `buku_besar.json`.

- [ ] **Step 1: Write the failing tests**

Append to `scripts/tests/test_export_web.py`:

```python
def _redist():
    import json, pathlib
    art = pathlib.Path(__file__).resolve().parents[3] / "artifacts"
    A = ew.load_artifacts(art)
    return ew.build_redistribution(A["flows"], A["meta"])


def test_every_summary_carries_status():
    out = _redist()
    for postur, per_kom in out.items():
        for cid, resp in per_kom.items():
            assert "status" in resp["summary"], f"{postur}/{cid} has no status"
            assert isinstance(resp["summary"]["status"], str)
            assert resp["summary"]["status"], f"{postur}/{cid} status is empty"


def test_empty_plans_report_their_own_reason():
    # Bawang Merah is empty because no surplus/deficit pair formed; Beras under
    # konservatif is empty because the required volume computed to zero. Two
    # different causes, and the UI must be able to tell them apart.
    out = _redist()
    assert out["seimbang"]["bawang-merah"]["summary"]["status"] == \
        "tidak ada pasangan surplus-defisit"
    assert out["konservatif"]["beras"]["summary"]["status"] == "tidak perlu intervensi"


def test_anggaran_key_present_even_on_all():
    # Declared required in RedistributionResponse but previously omitted from
    # the aggregate, which is exactly what /api/redistribution returns when no
    # commodity is given.
    out = _redist()
    for postur, per_kom in out.items():
        for cid, resp in per_kom.items():
            assert "anggaranNasionalTon" in resp["summary"], f"{postur}/{cid}"


def test_routes_carry_the_prices_the_solver_used():
    out = _redist()
    route = out["seimbang"]["beras"]["routes"][0]
    for key in ("hargaAsal", "hargaTujuan", "hematRp"):
        assert key in route, f"route missing {key}"
    assert route["hargaTujuan"] > route["hargaAsal"], \
        "the solver ships from cheaper to dearer; this route inverts it"


def test_ledger_loads_and_is_well_formed():
    import pathlib
    art = pathlib.Path(__file__).resolve().parents[3] / "artifacts"
    A = ew.load_artifacts(art)
    ledger = A["buku_besar"]
    assert len(ledger) >= 10
    assert all({"input", "nilai", "sumber", "tahun", "status"} <= set(e) for e in ledger)
    assert all(e["status"] in {"terukur", "diasumsikan"} for e in ledger)


def test_missing_plan_meta_entry_raises():
    import pandas as pd, pytest
    flows = pd.DataFrame(columns=["komoditas", "postur"])
    meta = {"plan_meta": {}, "postur_tersedia": ["seimbang"]}
    with pytest.raises(KeyError, match="plan_meta"):
        ew.build_redistribution(flows, meta)
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd /home/jupyter/kawa-temp/hackathon_phase2/supplai-dev
/opt/conda/bin/python -m pytest scripts/tests/test_export_web.py -k "status or anggaran or prices or ledger or plan_meta" -v
```

Expected: FAIL. `test_ledger_loads_and_is_well_formed` fails with `KeyError: 'buku_besar'`; the rest fail on missing keys.

- [ ] **Step 3: Load the ledger**

In `load_artifacts`, add one entry to the returned dict, after `"meta"`:

```python
        "buku_besar": json.loads((art / "buku_besar.json").read_text()),
```

- [ ] **Step 4: Carry prices onto each route**

In `_response_for`, inside the route dict literal, after `"konsumsiTujuanTonBulan"`:

```python
                       # The two prices the solver itself compared when it chose
                       # this lane. A report that recomputed them from heatmap.json
                       # could disagree with the plan it is describing.
                       "hargaAsal": round(float(r.harga_asal)),
                       "hargaTujuan": round(float(r.harga_tujuan)),
                       "hematRp": round(float(r.hemat_rp))})
```

(remove the closing `})` from the previous `"konsumsiTujuanTonBulan"` line so the dict closes here instead)

- [ ] **Step 5: Carry status onto the summary**

In `_response_for`, in the `summary` dict, after `"anggaranNasionalTon"`:

```python
               # Why the plan looks the way it does, straight from the solver.
               # The front end used to invent this sentence and got it wrong for
               # every empty plan.
               "status": str(plan["status"])}
```

- [ ] **Step 6: Require the plan_meta entry**

In `build_redistribution`, replace the line
`per_kom[cid] = _response_for(sub, cid, plan_meta.get(f"{wfp}|{postur}", {}))`
with:

```python
            key = f"{wfp}|{postur}"
            if key not in plan_meta:
                raise KeyError(
                    f"plan_meta has no entry for {key!r}. Every commodity-posture "
                    f"pair must be present, including empty ones — a missing entry "
                    f"would render as an unexplained blank table."
                )
            per_kom[cid] = _response_for(sub, cid, plan_meta[key])
```

- [ ] **Step 7: Complete the aggregate summary**

In `build_redistribution`, in the `per_kom["all"]` summary dict, after `"estimatedCost"`:

```python
                        # A national tonnage cap is per-commodity; summing it
                        # across six commodities would be a number with no meaning.
                        "anggaranNasionalTon": None,
                        "status": "ok" if all_routes else "kosong",
```

- [ ] **Step 8: Write the ledger out and self-check it**

In `main`, after `commodity_mape = build_commodity_mape(...)`, add:

```python
    buku_besar = A["buku_besar"]
```

after `_write(args.out, "commodity_mape.json", commodity_mape)`:

```python
    _write(args.out, "buku_besar.json", buku_besar)
```

and in the fail-closed self-check block, before `print("export_web: OK")`:

```python
    assert buku_besar and all(
        {"input", "nilai", "sumber", "tahun", "status"} <= set(e) for e in buku_besar
    ), "buku_besar entries are missing required fields"
    assert all(e["status"] in {"terukur", "diasumsikan"} for e in buku_besar), \
        "buku_besar status must be terukur or diasumsikan"
    for postur, per_kom in redist.items():
        for cid, resp in per_kom.items():
            assert resp["summary"].get("status"), f"{postur}/{cid} has no status"
            assert "anggaranNasionalTon" in resp["summary"], f"{postur}/{cid}"
```

- [ ] **Step 9: Run the tests to verify they pass**

```bash
/opt/conda/bin/python -m pytest scripts/tests/test_export_web.py -v
```

Expected: the six new tests PASS. Three tests were already failing before this task (`test_build_alerts_*` and one heatmap test) — verify their failure messages are unchanged, and do not fix them; they are out of scope.

- [ ] **Step 10: Regenerate the data**

```bash
/opt/conda/bin/python scripts/export_web.py
```

Expected: prints `export_web: OK`. Then verify by hand:

```bash
/opt/conda/bin/python -c "
import json
d=json.load(open('src/data/generated/redistribution.json'))
print('beras|konservatif:', d['konservatif']['beras']['summary']['status'])
print('bawang-merah|seimbang:', d['seimbang']['bawang-merah']['summary']['status'])
print('route keys:', sorted(d['seimbang']['beras']['routes'][0]))
print('ledger entries:', len(json.load(open('src/data/generated/buku_besar.json'))))
"
```

Expected: `tidak perlu intervensi`, `tidak ada pasangan surplus-defisit`, a key list containing `hargaAsal`/`hargaTujuan`/`hematRp`, and `10`.

- [ ] **Step 11: Commit**

```bash
git add scripts/export_web.py scripts/tests/test_export_web.py src/data/generated/redistribution.json src/data/generated/buku_besar.json
git commit -m "feat: carry the solver's own status, prices, and ledger to the front end

The front end invented a reason for every empty plan. The solver returns
one, and plan_meta has carried it all along. Ten of eighteen commodity-posture
combinations are empty, for two unrelated causes.

Also closes a schema hole: anggaranNasionalTon is declared required but was
omitted from the aggregate, which is what /api/redistribution returns when
no commodity is named."
```

---

## Task 2: Posture reaches the API

**Repo:** `supplai-dev`

**Files:**
- Create: `src/lib/redistribusi/postur.ts`
- Create: `src/lib/redistribusi/postur.test.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/app/api/redistribution/route.ts`

**Interfaces:**
- Consumes: `Postur` from `@/lib/types`; `getRedistributionData(commodity?, postur)` from `@/data/redistribution`.
- Produces: `POSTUR: readonly Postur[]`, `POSTUR_LABEL: Record<Postur, {nama: string; arti: string}>`, `isPostur(value: string): value is Postur`. `RedistributionResponse["summary"]` gains `status: string`; `RedistributionRoute` gains `hargaAsal`, `hargaTujuan`, `hematRp`; new exported `BukuBesarEntry`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/redistribusi/postur.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { POSTUR, POSTUR_LABEL, isPostur } from "./postur";

describe("isPostur", () => {
  it("accepts the three real postures", () => {
    expect(POSTUR).toEqual(["konservatif", "seimbang", "aman_pangan"]);
    for (const p of POSTUR) expect(isPostur(p)).toBe(true);
  });

  it("rejects anything else, including 'default'", () => {
    // "default" is a key in the JSON but not a posture a user may ask for:
    // it mirrors seimbang, and letting it through the query string would put
    // an undisclosed alias in the URL.
    for (const bad of ["default", "Seimbang", "", "aman pangan", "konservatiff"]) {
      expect(isPostur(bad)).toBe(false);
    }
  });

  it("labels every posture with a name and a plain-language meaning", () => {
    for (const p of POSTUR) {
      expect(POSTUR_LABEL[p].nama.length).toBeGreaterThan(0);
      expect(POSTUR_LABEL[p].arti.length).toBeGreaterThan(20);
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd /home/jupyter/kawa-temp/hackathon_phase2/supplai-dev && npm test
```

Expected: FAIL — `Failed to resolve import "./postur"`.

- [ ] **Step 3: Create the module**

`src/lib/redistribusi/postur.ts`:

```ts
import type { Postur } from "@/lib/types"

export const POSTUR: readonly Postur[] = ["konservatif", "seimbang", "aman_pangan"] as const

/** What each posture reads, in words a non-technical reader can act on. The
 *  postures are not "levels of caution" in the abstract — each one reads a
 *  different path of the same calibrated forecast interval. */
export const POSTUR_LABEL: Record<Postur, { nama: string; arti: string }> = {
  konservatif: {
    nama: "Konservatif",
    arti: "Membaca batas bawah selang prediksi. Kirim hanya jika kenaikan tetap muncul pada pembacaan paling hati-hati.",
  },
  seimbang: {
    nama: "Seimbang",
    arti: "Membaca prediksi titik. Volume mengikuti kenaikan yang paling mungkin terjadi.",
  },
  aman_pangan: {
    nama: "Aman Pangan",
    arti: "Membaca batas atas selang prediksi. Kirim seolah kenaikan terburuk yang akan terjadi.",
  },
}

export function isPostur(value: string): value is Postur {
  return (POSTUR as readonly string[]).includes(value)
}
```

- [ ] **Step 4: Extend the types**

In `src/lib/types.ts`, inside `RedistributionRoute`, after `konsumsiTujuanTonBulan`:

```ts
  /** The two prices the solver compared when it chose this lane. Kept here so a
   *  report never has to recompute them from an unrelated artifact and disagree
   *  with the plan it describes. */
  hargaAsal: number
  hargaTujuan: number
  hematRp: number
```

Replace the `RedistributionResponse` summary type with:

```ts
export interface RedistributionResponse {
  summary: { totalRoutes: number; totalVolume: number; activeRoutes: string
             estimatedCost: number
             anggaranNasionalTon: number | null
             /** The solver's own reason, e.g. "ok", "tidak perlu intervensi".
              *  Left as a string, not a union: "solver gagal: …" carries a
              *  variable message. */
             status: string }
  provinces: RedistributionProvince[]
  routes: RedistributionRoute[]
}
```

And add at the end of the file:

```ts
export interface BukuBesarEntry {
  input: string
  nilai: string
  sumber: string
  tahun: string
  status: "terukur" | "diasumsikan"
}
```

- [ ] **Step 5: Validate the posture in the route handler**

Replace `src/app/api/redistribution/route.ts` entirely:

```ts
import { NextRequest, NextResponse } from "next/server"
import { getRedistributionData } from "@/data/redistribution"
import { POSTUR, isPostur } from "@/lib/redistribusi/postur"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const commodity = searchParams.get("commodity")
  const postur = searchParams.get("postur")

  // Serving a different posture than the one asked for would show tonnages
  // that are not the ones on screen. Fail instead.
  if (postur !== null && !isPostur(postur)) {
    return NextResponse.json(
      { error: `Postur '${postur}' tidak dikenal. Pilih salah satu: ${POSTUR.join(", ")}.` },
      { status: 400 },
    )
  }

  const data = getRedistributionData(commodity || undefined, postur ?? "default")
  return NextResponse.json(data)
}
```

- [ ] **Step 6: Run the tests and the type check**

```bash
npm test && npx tsc --noEmit
```

Expected: vitest PASS (3 tests), `tsc` clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/redistribusi/postur.ts src/lib/redistribusi/postur.test.ts src/lib/types.ts src/app/api/redistribution/route.ts
git commit -m "feat: /api/redistribution accepts a posture and rejects unknown ones

Three postures were in the data and one was reachable. An unrecognised
value returns 400 rather than quietly serving another posture's tonnages."
```

---

## Task 3: The empty table explains itself

**Repo:** `supplai-dev`

**Files:**
- Create: `src/lib/redistribusi/status.ts`
- Create: `src/lib/redistribusi/status.test.ts`
- Modify: `src/components/redistribusi/route-table.tsx:36-48`

**Interfaces:**
- Consumes: `Postur`, `POSTUR_LABEL`.
- Produces: `jelaskanStatus(status: string, postur: Postur, komoditas: string): { judul: string; alasan: string }`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/redistribusi/status.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { jelaskanStatus } from "./status";

describe("jelaskanStatus", () => {
  it("gives different reasons for the two ways a plan can be empty", () => {
    const pair = jelaskanStatus("tidak ada pasangan surplus-defisit", "seimbang", "Bawang Merah");
    const zero = jelaskanStatus("tidak perlu intervensi", "konservatif", "Beras Medium");
    expect(pair.alasan).not.toBe(zero.alasan);
    expect(pair.judul).not.toBe(zero.judul);
  });

  it("never claims prices are projected stable when no pairing formed", () => {
    // The old single sentence said exactly this, and it was false: the cause
    // was that no province qualified as a source or a destination at all.
    const out = jelaskanStatus("tidak ada pasangan surplus-defisit", "seimbang", "Bawang Merah");
    expect(`${out.judul} ${out.alasan}`).not.toMatch(/stabil atau menurun/i);
  });

  it("says the destinations were still identified under konservatif", () => {
    const out = jelaskanStatus("tidak perlu intervensi", "konservatif", "Beras Medium");
    expect(out.alasan).toMatch(/batas bawah/i);
    expect(out.alasan).toMatch(/Seimbang/);
  });

  it("names the commodity it is talking about", () => {
    const out = jelaskanStatus("tidak ada pasangan surplus-defisit", "seimbang", "Minyak Goreng");
    expect(out.alasan).toContain("Minyak Goreng");
  });

  it("passes a solver failure message through instead of hiding it", () => {
    const out = jelaskanStatus("solver gagal: infeasible", "seimbang", "Beras Medium");
    expect(out.alasan).toContain("infeasible");
  });

  it("surfaces an unrecognised status verbatim rather than inventing one", () => {
    const out = jelaskanStatus("sesuatu yang baru", "seimbang", "Beras Medium");
    expect(out.alasan).toContain("sesuatu yang baru");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test
```

Expected: FAIL — cannot resolve `./status`.

- [ ] **Step 3: Create the module**

`src/lib/redistribusi/status.ts`:

```ts
import type { Postur } from "@/lib/types"
import { POSTUR_LABEL } from "./postur"

/** Turn the solver's own status string into something a reader can act on.
 *
 *  The table used to explain every empty plan with one sentence — "model
 *  memproyeksikan harga stabil atau menurun" — which was false for all ten
 *  empty combinations. Bawang Merah and Minyak Goreng are empty because no
 *  source/destination pairing formed at all; the other four are empty under
 *  konservatif because the p10 reading of the rise puts required volume at
 *  zero, even though those destinations were still flagged as at risk.
 */
export function jelaskanStatus(
  status: string,
  postur: Postur,
  komoditas: string,
): { judul: string; alasan: string } {
  if (status.startsWith("solver gagal")) {
    return {
      judul: "Optimasi tidak menghasilkan solusi.",
      alasan: `Pemecah rute berhenti dengan pesan: "${status}". Ini kegagalan teknis, bukan pernyataan tentang harga ${komoditas}.`,
    }
  }

  switch (status) {
    case "tidak ada pasangan surplus-defisit":
      return {
        judul: "Tidak ada pasangan wilayah yang dapat dibentuk.",
        alasan: `Untuk ${komoditas}, tidak ada provinsi yang memenuhi syarat sebagai asal (harga di bawah median nasional dan tidak sedang naik) berpasangan dengan provinsi tujuan (naik minimal 2% dan harga di atas median). Penyebabnya bukan prediksi harga yang datar, melainkan pemasangan wilayah yang tidak terbentuk — dan itu sama di ketiga postur.`,
      }
    case "tidak perlu intervensi":
      return {
        judul: "Wilayah berisiko tetap terdeteksi, tetapi kebutuhannya nol pada postur ini.",
        alasan: `Postur ${POSTUR_LABEL[postur].nama} membaca batas bawah selang prediksi. Pada pembacaan itu kenaikan ${komoditas} dapat bernilai nol, sehingga volume yang dibutuhkan menjadi nol. Provinsi tujuannya sendiri tetap tertandai berisiko. Pilih postur Seimbang untuk melihat rencana pada prediksi titik.`,
      }
    case "tidak ada kebutuhan terukur":
      return {
        judul: "Kebutuhan tidak dapat diukur untuk komoditas ini.",
        alasan: `Tidak tersedia koefisien konsumsi per kapita untuk ${komoditas} di provinsi tujuan, sehingga volume tidak dapat dihitung dari populasi. Rencana dikosongkan, bukan ditaksir.`,
      }
    case "tidak ada rute ekonomis":
      return {
        judul: "Kebutuhan ada, rutenya tidak.",
        alasan: `Kebutuhan ${komoditas} terhitung, tetapi tidak ada jalur yang ongkos angkutnya tertutup oleh selisih harga antar-provinsi.`,
      }
    case "kosong":
      return {
        judul: "Tidak ada rute pada gabungan komoditas.",
        alasan: `Tidak ada satu pun komoditas yang menghasilkan rute pada postur ${POSTUR_LABEL[postur].nama}.`,
      }
    default:
      return {
        judul: "Rencana kosong dengan sebab yang belum dipetakan.",
        alasan: `Pemecah rute mengembalikan status "${status}", yang belum punya penjelasan di antarmuka ini. Status ditampilkan apa adanya agar tidak digantikan keterangan yang keliru.`,
      }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test
```

Expected: PASS, 9 tests total.

- [ ] **Step 5: Use it in the table**

In `src/components/redistribusi/route-table.tsx`, extend the props interface:

```ts
interface RouteTableProps {
  routes: RedistributionRoute[];
  loading: boolean;
  status: string;
  postur: Postur;
  komoditas: string;
}
```

Add the imports:

```ts
import type { RedistributionRoute, Postur } from "@/lib/types"
import { jelaskanStatus } from "@/lib/redistribusi/status"
```

Change the signature to `export function RouteTable({ routes, loading, status, postur, komoditas }: RouteTableProps)` and replace the whole `if (routes.length === 0)` block (currently lines 36-48, including the comment above it) with:

```tsx
  // An empty plan is a result, not a gap — and there is more than one way to
  // get one. The solver says which; we show that rather than guessing.
  if (routes.length === 0) {
    const { judul, alasan } = jelaskanStatus(status, postur, komoditas);
    return (
      <div className="py-12 px-6 text-center space-y-1.5">
        <p className="text-xs font-bold text-slate-500">{judul}</p>
        <p className="text-[11px] font-medium text-slate-400 leading-relaxed max-w-md mx-auto">
          {alasan}
        </p>
      </div>
    );
  }
```

- [ ] **Step 6: Pass the new props from the page**

In `src/app/(dashboard)/redistribusi/page.tsx`, replace `<RouteTable routes={routes} loading={loading} />` with:

```tsx
            <RouteTable
              routes={routes}
              loading={loading}
              status={summary?.status ?? "kosong"}
              postur="seimbang"
              komoditas={currentCommodityName}
            />
```

(Task 5 replaces the hard-coded `"seimbang"` with real state; leaving it literal here keeps this task independently reviewable.)

- [ ] **Step 7: Type-check and commit**

```bash
npm test && npx tsc --noEmit
git add src/lib/redistribusi/status.ts src/lib/redistribusi/status.test.ts src/components/redistribusi/route-table.tsx "src/app/(dashboard)/redistribusi/page.tsx"
git commit -m "fix: an empty plan states the solver's reason, not an invented one

One sentence covered all ten empty commodity-posture combinations and was
false for every one of them. Bawang Merah has no surplus/deficit pairing at
all; Beras under konservatif has destinations but zero required volume."
```

---

## Task 4: The honesty columns

**Repo:** `supplai-dev`

**Files:**
- Create: `src/lib/redistribusi/format.ts`
- Create: `src/lib/redistribusi/format.test.ts`
- Modify: `src/components/redistribusi/route-table.tsx`

**Interfaces:**
- Consumes: `RedistributionRoute`.
- Produces: `ton(v: number): string`, `persen(v: number, digits?: number): string`, `SKALA_PERSEN_PASAR: number` (= 5), `takaranLabel(d: "terukur" | "diasumsikan"): { teks: string; keterangan: string }`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/redistribusi/format.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { ton, persen, SKALA_PERSEN_PASAR, takaranLabel } from "./format";

describe("Indonesian number formatting", () => {
  it("uses a comma for decimals, not a dot", () => {
    // A dot decimal reads as a thousands separator in Indonesian: "1.298"
    // is one thousand two hundred ninety-eight, not 1.298.
    expect(ton(57.41)).toBe("57,41 t");
    expect(persen(1.298)).toBe("1,30%");
  });

  it("uses a dot for thousands", () => {
    expect(ton(4424)).toBe("4.424,00 t");
  });

  it("keeps percentages above 100 intact", () => {
    // kecukupanPersen reaches 168,1% — a shipment that more than covers the
    // requirement. Clamping it would hide a real result.
    expect(persen(168.1, 1)).toBe("168,1%");
  });
});

describe("the % pasar scale", () => {
  it("is 5, which contains every observed value", () => {
    // seimbang runs 0,023% to 3,642%. The old heuristic's 18,08% runs off the
    // scale, and should.
    expect(SKALA_PERSEN_PASAR).toBe(5);
    expect(3.642).toBeLessThan(SKALA_PERSEN_PASAR);
  });
});

describe("takaranLabel", () => {
  it("distinguishes the two bases and explains each", () => {
    expect(takaranLabel("terukur").teks).toBe("Terukur");
    expect(takaranLabel("diasumsikan").teks).toBe("Diasumsikan");
    expect(takaranLabel("terukur").keterangan).not.toBe(takaranLabel("diasumsikan").keterangan);
    expect(takaranLabel("diasumsikan").keterangan).toMatch(/10%/);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test
```

Expected: FAIL — cannot resolve `./format`.

- [ ] **Step 3: Create the module**

`src/lib/redistribusi/format.ts`:

```ts
/** Indonesian number rendering for the sizing figures.
 *
 *  `src/lib/format.ts` covers rupiah and dates. These are the shapes the
 *  sizing work needs and the reason they are strict: a dot decimal separator
 *  reads as a thousands separator in Indonesian, so "1.298 persen" states a
 *  figure a thousand times its true value. */
const nf = (min: number, max: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: min, maximumFractionDigits: max })

export const ton = (value: number): string => `${nf(2, 2).format(value)} t`

export const persen = (value: number, digits = 2): string =>
  `${nf(digits, digits).format(value)}%`

/** Upper bound of the % pasar bar. Every route in the balanced plan falls
 *  between 0,023% and 3,642%; the heuristic this work replaced reached 18,08%
 *  and would run off the end, which is the honest visual impression. */
export const SKALA_PERSEN_PASAR = 5

export function takaranLabel(dasar: "terukur" | "diasumsikan"): {
  teks: string
  keterangan: string
} {
  return dasar === "terukur"
    ? {
        teks: "Terukur",
        keterangan:
          "Volume ditetapkan rumus elastisitas: populasi × konsumsi per kapita × elastisitas harga sendiri × kenaikan yang diprediksi.",
      }
    : {
        teks: "Diasumsikan",
        keterangan:
          "Volume dibatasi aturan sisi asal — sebuah provinsi hanya boleh mengirim maksimal 10% konsumsi bulanannya sendiri. Data produksi per provinsi tidak tersedia bagi kami, sehingga batas ini kami tetapkan, bukan kami ukur.",
      }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test
```

Expected: PASS, 15 tests total.

- [ ] **Step 5: Add the columns to the table**

In `src/components/redistribusi/route-table.tsx`:

Extend the sort keys: `type SortKey = "from" | "to" | "volume" | "distance" | "cost" | "priority" | "persenPasar" | "kecukupanPersen";`

Add imports:

```ts
import { ton, persen, SKALA_PERSEN_PASAR, takaranLabel } from "@/lib/redistribusi/format"
```

Above the `<Table>`, add the measured/assumed summary line:

```tsx
      {(() => {
        const terukur = routes.filter((r) => r.dasarTakaran === "terukur").length;
        return (
          <p className="text-[11px] font-medium text-slate-500 mb-3 leading-relaxed">
            <span className="font-bold text-slate-700">{terukur} dari {routes.length} rute</span>{" "}
            volumenya ditetapkan dari kebutuhan terukur. Sisanya dibatasi aturan sisi asal
            yang kami tetapkan sendiri, bukan yang kami ukur — makin agresif posturnya,
            makin besar bagian yang diasumsikan.
          </p>
        );
      })()}
```

Add four `<TableHead>` cells after the existing volume header, and in each `<TableRow>` the matching cells:

```tsx
                <TableCell className="text-right tabular-nums">
                  <div className="font-bold text-slate-700">{ton(r.volumeTon)}</div>
                  <div className="text-[10px] text-slate-400">
                    {ton(r.volumeCiBawah).replace(" t", "")}–{ton(r.volumeCiAtas)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#006c4a]"
                        style={{ width: `${Math.min(100, r.persenPasar / SKALA_PERSEN_PASAR * 100)}%` }}
                      />
                    </div>
                    <span
                      className="text-[11px] font-bold tabular-nums text-slate-600"
                      title={`Konsumsi bulanan ${r.to}: ${ton(r.konsumsiTujuanTonBulan)}`}
                    >
                      {persen(r.persenPasar)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={r.dasarTakaran === "terukur" ? "default" : "outline"}
                    title={takaranLabel(r.dasarTakaran).keterangan}
                  >
                    {takaranLabel(r.dasarTakaran).teks}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums text-slate-600 font-bold">
                  {persen(r.kecukupanPersen, 1)}
                </TableCell>
```

Headers, with the scale stated so the bar is readable:

```tsx
              <TableHead className="text-right">Volume</TableHead>
              <TableHead>% pasar tujuan <span className="font-normal text-slate-400">(skala 0–5%)</span></TableHead>
              <TableHead>Dasar takaran</TableHead>
              <TableHead className="text-right">Kecukupan</TableHead>
```

- [ ] **Step 6: Verify in the browser**

```bash
npm run dev
```

Open `http://localhost:3000/redistribusi`. Confirm on Beras: one route, `57,41 t` with `46,43–68,39` beneath, `1,30%` with a bar about a quarter filled, a **Terukur** badge, and `9,2%` adequacy. Switch to Telur Ayam and confirm 13 routes render with a mix of badges. Stop the server.

- [ ] **Step 7: Commit**

```bash
npm test && npx tsc --noEmit
git add src/lib/redistribusi/format.ts src/lib/redistribusi/format.test.ts src/components/redistribusi/route-table.tsx
git commit -m "feat: the route table shows volume, market share, basis, and adequacy

These were computed, exported, typed, and then rendered nowhere. The
measured/assumed split gets a line of its own above the table because it is
the honest headline: most routes are sized by a rule we declared, not
by a quantity we measured."
```

---

## Task 5: The posture switch

**Repo:** `supplai-dev`

**Files:**
- Create: `src/components/redistribusi/posture-switch.tsx`
- Modify: `src/app/(dashboard)/redistribusi/page.tsx`
- Modify: `src/hooks/use-api.ts`

**Interfaces:**
- Consumes: `POSTUR`, `POSTUR_LABEL`, `Postur`.
- Produces: `<PostureSwitch value={postur} onChange={(p: Postur) => void} />`.

- [ ] **Step 1: Create the control**

`src/components/redistribusi/posture-switch.tsx`:

```tsx
"use client";

import type { Postur } from "@/lib/types";
import { POSTUR, POSTUR_LABEL } from "@/lib/redistribusi/postur";

interface PostureSwitchProps {
  value: Postur;
  onChange: (postur: Postur) => void;
}

export function PostureSwitch({ value, onChange }: PostureSwitchProps) {
  return (
    <div className="space-y-2">
      <div className="inline-flex rounded-xl border border-slate-300 bg-white p-1 shadow-xs">
        {POSTUR.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-pressed={p === value}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              p === value ? "bg-[#006c4a] text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {POSTUR_LABEL[p].nama}
          </button>
        ))}
      </div>
      <p className="text-[11px] font-medium text-slate-500 max-w-md leading-relaxed">
        {POSTUR_LABEL[value].arti}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Remove the dead `refetch` cast**

`src/hooks/use-api.ts` returns `{ data, loading }`, but the redistribution page casts the result to include `refetch: () => void` and never calls it. The cast is a lie the type system cannot catch. In `src/app/(dashboard)/redistribusi/page.tsx`, delete the comment on line 64 and replace lines 65-67 with the wired call in Step 3.

- [ ] **Step 3: Wire the posture through the page**

In `src/app/(dashboard)/redistribusi/page.tsx`:

Add to the imports:

```tsx
import type { RedistributionResponse, Postur } from "@/lib/types";
import { PostureSwitch } from "@/components/redistribusi/posture-switch";
```

Add state beside `commodity`:

```tsx
  const [postur, setPostur] = useState<Postur>("seimbang");
```

Replace the `useApi` call and its comment with:

```tsx
  const { data, loading } = useApi<RedistributionResponse>(
    `/api/redistribution?commodity=${commodity}&postur=${postur}`
  );
```

Place `<PostureSwitch value={postur} onChange={setPostur} />` in the header block, directly below the `<p>` describing the page.

Change the `RouteTable` usage from the literal `postur="seimbang"` to `postur={postur}`.

- [ ] **Step 4: Verify all three postures in the browser**

```bash
npm run dev
```

At `http://localhost:3000/redistribusi`:

1. Beras + **Seimbang** → 1 route, 57,41 t.
2. Beras + **Aman Pangan** → volume rises; the badge should now read **Diasumsikan**.
3. Beras + **Konservatif** → empty table reading "Wilayah berisiko tetap terdeteksi, tetapi kebutuhannya nol pada postur ini." — *not* "harga stabil atau menurun".
4. Bawang Merah + **Seimbang** → empty table reading "Tidak ada pasangan wilayah yang dapat dibentuk."
5. Confirm 3 and 4 show **different** text. That difference is the point of Task 3.

Then check the API rejects a bad value:

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/redistribution?commodity=beras&postur=ngawur"
```

Expected: `400`. Stop the server.

- [ ] **Step 5: Commit**

```bash
npm test && npx tsc --noEmit
git add src/components/redistribusi/posture-switch.tsx "src/app/(dashboard)/redistribusi/page.tsx"
git commit -m "feat: a posture switch that actually moves the numbers

Also drops a cast that claimed useApi returns refetch. It does not, and
nothing called it."
```

---

## Task 6: The honesty ledger, on screen

**Repo:** `supplai-dev`

**Files:**
- Create: `src/components/redistribusi/buku-besar-panel.tsx`
- Create: `src/data/buku-besar.ts`
- Modify: `src/app/(dashboard)/redistribusi/page.tsx`

**Interfaces:**
- Consumes: `src/data/generated/buku_besar.json`, `BukuBesarEntry`.
- Produces: `bukuBesar: BukuBesarEntry[]` from `@/data/buku-besar`; `<BukuBesarPanel />`.

- [ ] **Step 1: Create the data accessor**

`src/data/buku-besar.ts`:

```ts
import type { BukuBesarEntry } from "@/lib/types"
import generated from "./generated/buku_besar.json"

/** Every input behind the sizing, with its source and whether it was measured
 *  or declared. Ten entries: six measured, four assumed. */
export const bukuBesar = generated as BukuBesarEntry[]
```

- [ ] **Step 2: Create the panel**

`src/components/redistribusi/buku-besar-panel.tsx`:

```tsx
"use client";

import { bukuBesar } from "@/data/buku-besar";
import { Badge } from "@/components/ui/badge";

export function BukuBesarPanel() {
  const terukur = bukuBesar.filter((e) => e.status === "terukur").length;

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
        Setiap angka yang dipakai perhitungan ini, beserta asalnya.{" "}
        <span className="font-bold text-slate-700">
          {terukur} dari {bukuBesar.length}
        </span>{" "}
        berasal dari sumber yang dapat diperiksa; sisanya kami tetapkan sendiri dan
        ditandai demikian.
      </p>
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {bukuBesar.map((e) => (
          <div key={e.input} className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-bold text-slate-700">{e.input}</span>
              <Badge variant={e.status === "terukur" ? "default" : "outline"} className="shrink-0">
                {e.status === "terukur" ? "Terukur" : "Diasumsikan"}
              </Badge>
            </div>
            <p className="text-[11px] font-bold text-[#006c4a]">{e.nilai}</p>
            <p className="text-[10px] text-slate-500 leading-relaxed">{e.sumber}</p>
            <p className="text-[10px] text-slate-400">Tahun: {e.tahun}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

Note there is no truncation and no "and N more": every entry renders, which is the point of a ledger.

- [ ] **Step 3: Place it on the page**

In `src/app/(dashboard)/redistribusi/page.tsx`, add the import and a new card in the last grid row, beside the surplus panel:

```tsx
import { BukuBesarPanel } from "@/components/redistribusi/buku-besar-panel";
```

```tsx
        <motion.div variants={itemVariants} className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
            <Layers3 className="w-4 h-4 text-[#006c4a]" />
            <h3 className="text-lg font-bold text-slate-800">Asal-usul Angka</h3>
          </div>
          <BukuBesarPanel />
        </motion.div>
```

- [ ] **Step 4: Verify in the browser**

```bash
npm run dev
```

At `/redistribusi`, count the ledger cards: **10**. Confirm the "Kapasitas kirim provinsi sumber" entry reads **Diasumsikan** and its source text mentions that per-province production data was unavailable. Stop the server.

- [ ] **Step 5: Commit**

```bash
npx tsc --noEmit
git add src/data/buku-besar.ts src/components/redistribusi/buku-besar-panel.tsx "src/app/(dashboard)/redistribusi/page.tsx"
git commit -m "feat: the honesty ledger renders inside the product

It was written to artifacts/ and never shipped. Ten inputs, six measured,
four declared — answering 'where did this number come from' in the place
the number appears rather than in a document nobody opens."
```

---

## Task 7: Redistribution analysis (pure)

**Repo:** `supplai-dev`

**Files:**
- Create: `src/lib/redistribusi/analysis.ts`
- Create: `src/lib/redistribusi/analysis.test.ts`

**Interfaces:**
- Consumes: `RedistributionResponse`, `RedistributionRoute`, `Postur`, `jelaskanStatus`.
- Produces:
  ```ts
  export const ONGKOS_RP_PER_KG_KM = 2.5
  export type RuteMargin = RedistributionRoute & {
    ongkosRpPerKg: number; selisihRpPerKg: number; marginRpPerKg: number; menutupOngkos: boolean
  }
  export type RedistribusiAnalysis = {
    komoditas: string; postur: Postur; status: string
    totalRute: number; totalTon: number; totalBiaya: number
    anggaranNasionalTon: number | null
    terukur: number; diasumsikan: number
    routes: RuteMargin[]
    menutup: number
    ringkasan: string; catatanTakaran: string; catatanPedagang: string
  }
  export function analyzeRedistribusi(
    data: RedistributionResponse, komoditas: string, postur: Postur
  ): RedistribusiAnalysis
  ```

- [ ] **Step 1: Write the failing test**

Create `src/lib/redistribusi/analysis.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getRedistributionData } from "@/data/redistribution";
import { analyzeRedistribusi, ONGKOS_RP_PER_KG_KM } from "./analysis";

const all = (postur: "seimbang" | "aman_pangan" | "konservatif") =>
  ["beras", "bawang-merah", "bawang-putih", "daging-ayam", "telur-ayam", "minyak-goreng"]
    .map((k) => analyzeRedistribusi(getRedistributionData(k, postur), k, postur));

describe("analyzeRedistribusi", () => {
  it("counts the measured/assumed split the JSON actually holds", () => {
    const s = all("seimbang");
    expect(s.reduce((n, a) => n + a.terukur, 0)).toBe(14);
    expect(s.reduce((n, a) => n + a.diasumsikan, 0)).toBe(22);
    const a = all("aman_pangan");
    expect(a.reduce((n, x) => n + x.terukur, 0)).toBe(1);
    expect(a.reduce((n, x) => n + x.diasumsikan, 0)).toBe(35);
  });

  it("finds 30 of 36 routes covering freight in the balanced plan", () => {
    const s = all("seimbang");
    expect(s.reduce((n, a) => n + a.routes.length, 0)).toBe(36);
    expect(s.reduce((n, a) => n + a.menutup, 0)).toBe(30);
  });

  it("never marks a route as covering freight when its margin is negative", () => {
    for (const a of all("seimbang")) {
      for (const r of a.routes) {
        expect(r.menutupOngkos).toBe(r.marginRpPerKg > 0);
        expect(r.marginRpPerKg).toBeCloseTo(r.selisihRpPerKg - r.ongkosRpPerKg, 6);
      }
    }
  });

  it("computes freight at Rp2,5 per kg per km", () => {
    const a = analyzeRedistribusi(getRedistributionData("beras", "seimbang"), "beras", "seimbang");
    const r = a.routes[0];
    expect(ONGKOS_RP_PER_KG_KM).toBe(2.5);
    expect(r.ongkosRpPerKg).toBeCloseTo(r.distance * 2.5, 6);
  });

  it("keeps the six routes that do not cover freight rather than dropping them", () => {
    const worst = all("seimbang")
      .flatMap((a) => a.routes)
      .filter((r) => !r.menutupOngkos)
      .sort((x, y) => x.marginRpPerKg - y.marginRpPerKg);
    expect(worst).toHaveLength(6);
    expect(worst[0].from).toBe("Sumatera Selatan");
    expect(worst[0].to).toBe("Sulawesi Tenggara");
  });

  it("states that the sign of the gap is structural, not a finding", () => {
    const a = analyzeRedistribusi(getRedistributionData("beras", "seimbang"), "beras", "seimbang");
    expect(a.catatanPedagang).toMatch(/median/);
    // Zero of the 36 routes has a negative gap, which is what "structural" means.
    const negatives = all("seimbang").flatMap((x) => x.routes).filter((r) => r.selisihRpPerKg <= 0);
    expect(negatives).toHaveLength(0);
  });

  it("carries the solver's reason through for an empty plan", () => {
    const a = analyzeRedistribusi(
      getRedistributionData("bawang-merah", "seimbang"), "bawang-merah", "seimbang");
    expect(a.totalRute).toBe(0);
    expect(a.ringkasan).toMatch(/pasangan/);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm test
```

Expected: FAIL — cannot resolve `./analysis`.

- [ ] **Step 3: Implement**

`src/lib/redistribusi/analysis.ts`:

```ts
import type { Postur, RedistributionResponse, RedistributionRoute } from "@/lib/types"
import { jelaskanStatus } from "./status"
import { ton, persen } from "./format"

/** Rp per kg per km. The ledger carries Rp2.500 per ton-km; a tonne is 1.000 kg.
 *  This figure is `diasumsikan` — Indonesian inter-island freight runs roughly
 *  Rp2.000-4.000 per ton-km — and it carries the whole trader framing. */
export const ONGKOS_RP_PER_KG_KM = 2.5

export type RuteMargin = RedistributionRoute & {
  ongkosRpPerKg: number
  selisihRpPerKg: number
  marginRpPerKg: number
  menutupOngkos: boolean
}

export type RedistribusiAnalysis = {
  komoditas: string
  postur: Postur
  status: string
  totalRute: number
  totalTon: number
  totalBiaya: number
  anggaranNasionalTon: number | null
  terukur: number
  diasumsikan: number
  routes: RuteMargin[]
  menutup: number
  ringkasan: string
  catatanTakaran: string
  catatanPedagang: string
}

export function analyzeRedistribusi(
  data: RedistributionResponse,
  komoditas: string,
  postur: Postur,
): RedistribusiAnalysis {
  const routes: RuteMargin[] = data.routes.map((r) => {
    const ongkosRpPerKg = r.distance * ONGKOS_RP_PER_KG_KM
    const selisihRpPerKg = r.hargaTujuan - r.hargaAsal
    const marginRpPerKg = selisihRpPerKg - ongkosRpPerKg
    return { ...r, ongkosRpPerKg, selisihRpPerKg, marginRpPerKg, menutupOngkos: marginRpPerKg > 0 }
  })

  const terukur = routes.filter((r) => r.dasarTakaran === "terukur").length
  const diasumsikan = routes.length - terukur
  const menutup = routes.filter((r) => r.menutupOngkos).length
  const status = data.summary.status

  // summary.totalVolume is rounded to whole tonnes for the dashboard tiles.
  // A report must not quote 57 t where the plan says 57,41 t.
  const totalTon = routes.reduce((sum, r) => sum + r.volumeTon, 0)
  const kosong = jelaskanStatus(status, postur, komoditas)

  const ringkasan =
    routes.length === 0
      ? `${kosong.judul} ${kosong.alasan}`
      : `Rencana ini memindahkan ${ton(totalTon)} ${komoditas} melalui ${routes.length} rute. ` +
        `Rute terbesar mengisi ${persen(Math.max(...routes.map((r) => r.persenPasar)))} pasar bulanan wilayah tujuannya, ` +
        `sehingga penambahan pasokan ini tidak menggantikan perdagangan yang sudah berjalan di sana.`

  const catatanTakaran =
    routes.length === 0
      ? "Tidak ada rute, sehingga tidak ada takaran yang perlu dipertanggungjawabkan."
      : `${terukur} dari ${routes.length} rute volumenya ditetapkan dari kebutuhan terukur — populasi dikali konsumsi per kapita dikali elastisitas harga sendiri. ` +
        `${diasumsikan} sisanya dibatasi aturan yang kami tetapkan sendiri: sebuah provinsi asal hanya boleh mengirim maksimal 10% konsumsi bulanannya. ` +
        `Data produksi per provinsi tidak tersedia bagi kami, jadi batas itu bukan hasil pengukuran.`

  const catatanPedagang =
    `Ongkos angkut dihitung Rp${ONGKOS_RP_PER_KG_KM.toLocaleString("id-ID")}/kg/km, angka yang kami asumsikan, bukan kami ukur. ` +
    `Tanda selisih harganya sendiri bersifat bawaan: pemecah rute hanya menarik jalur dari provinsi berharga di bawah median nasional ke provinsi di atasnya, ` +
    `sehingga selisih positif sudah pasti ada sejak awal. Yang benar-benar diuji di sini adalah besar selisih itu terhadap ongkos angkut.`

  return {
    komoditas,
    postur,
    status,
    totalRute: routes.length,
    totalTon,
    totalBiaya: data.summary.estimatedCost,
    anggaranNasionalTon: data.summary.anggaranNasionalTon,
    terukur,
    diasumsikan,
    routes,
    menutup,
    ringkasan,
    catatanTakaran,
    catatanPedagang,
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npm test
```

Expected: PASS, 22 tests total.

- [ ] **Step 5: Commit**

```bash
npx tsc --noEmit
git add src/lib/redistribusi/analysis.ts src/lib/redistribusi/analysis.test.ts
git commit -m "feat: pure analysis for the redistribution report

Trader margins come from flows' own harga_asal/harga_tujuan, so the report
cannot disagree with the plan it describes. Thirty of thirty-six routes
cover freight; the six that do not are kept, not filtered."
```

---

## Task 8: The redistribution PDF

**Repo:** `supplai-dev`

**Files:**
- Create: `src/lib/redistribusi/report.ts`
- Create: `src/app/api/redistribution-report/route.ts`
- Modify: `src/app/(dashboard)/redistribusi/page.tsx`

**Interfaces:**
- Consumes: `RedistribusiAnalysis`, `bukuBesar`, jsPDF.
- Produces: `createRedistribusiReport(a: RedistribusiAnalysis, pembaca: "pemerintah" | "pedagang"): Uint8Array`.

- [ ] **Step 1: Write the report module**

`src/lib/redistribusi/report.ts` — follow the structure of `src/lib/prediction/report.ts` exactly (same page furniture, same `clean`/`paragraph`/`heading`/`table` helpers, same footer loop) so there is one report idiom in this codebase. Read that file first and mirror it.

Sections for `pembaca === "pemerintah"`:

1. `01  Ringkasan` — `a.ringkasan`, then three cards: total tonnage, route count, freight cost.
2. `02  Rute dan takaran` — table with columns Asal, Tujuan, Volume, % pasar, Dasar, Kecukupan.
3. `03  Dasar takaran` — `a.catatanTakaran`, then the measured/assumed count as a stated caveat.
4. `04  Pagu anggaran` — if `a.anggaranNasionalTon === null`, print: *"Komoditas ini tidak memiliki neraca nasional yang dapat dijadikan pagu, sehingga rencana berjalan tanpa batas anggaran. Keterbatasan ini dinyatakan, bukan diabaikan."* Otherwise print the cap in tonnes and the plan's share of it.
5. `05  Asal-usul angka` — the ten ledger rows as a table (`input`, `nilai`, `tahun`, `status`).

Sections for `pembaca === "pedagang"`:

1. `01  Ringkasan` — how many routes cover freight out of how many.
2. `02  Selisih harga terhadap ongkos angkut` — every route, sorted by `marginRpPerKg` descending, columns Asal, Tujuan, Harga asal, Harga tujuan, Jarak, Ongkos/kg, Margin/kg, and a Ya/Tidak column. **All routes print, including negative margins.**
3. `03  Batasan` — `a.catatanPedagang` verbatim, then the ledger's freight row.

Use `ton`, `persen` from `./format` and `formatRupiah` from `@/lib/format` for every number.

- [ ] **Step 2: Write the API route**

`src/app/api/redistribution-report/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getRedistributionData } from "@/data/redistribution";
import { analyzeRedistribusi } from "@/lib/redistribusi/analysis";
import { createRedistribusiReport } from "@/lib/redistribusi/report";
import { isPostur, POSTUR } from "@/lib/redistribusi/postur";
import { commodities } from "@/data/commodities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PEMBACA = ["pemerintah", "pedagang"] as const;
type Pembaca = (typeof PEMBACA)[number];
const isPembaca = (v: string): v is Pembaca => (PEMBACA as readonly string[]).includes(v);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const commodity = params.get("commodity") ?? "";
  const postur = params.get("postur") ?? "";
  const pembaca = params.get("pembaca") ?? "";

  const komoditas = commodities.find((c) => c.id === commodity);
  if (!komoditas || !isPostur(postur) || !isPembaca(pembaca)) {
    return NextResponse.json(
      { error: `Pilih komoditas yang tersedia, postur (${POSTUR.join(", ")}), dan pembaca (${PEMBACA.join(", ")}).` },
      { status: 400 },
    );
  }

  const analysis = analyzeRedistribusi(
    getRedistributionData(commodity, postur), komoditas.name, postur);
  const pdf = createRedistribusiReport(analysis, pembaca);
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Laporan-Redistribusi-${commodity}-${postur}-${pembaca}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
```

- [ ] **Step 3: Add the download buttons to the page**

In the redistribution page header, beside the commodity dropdown:

```tsx
          {(["pemerintah", "pedagang"] as const).map((pembaca) => (
            <a
              key={pembaca}
              href={`/api/redistribution-report?commodity=${commodity}&postur=${postur}&pembaca=${pembaca}`}
              className="h-10 inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:border-slate-400 shadow-xs transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              Laporan {pembaca === "pemerintah" ? "Pemerintah" : "Pedagang"}
            </a>
          ))}
```

Add `Download` to the `lucide-react` import list.

- [ ] **Step 4: Verify both reports actually open**

```bash
npm run dev
curl -sD - -o /var/tmp/gov.pdf "http://localhost:3000/api/redistribution-report?commodity=telur-ayam&postur=seimbang&pembaca=pemerintah" | head -3
curl -sD - -o /var/tmp/trader.pdf "http://localhost:3000/api/redistribution-report?commodity=telur-ayam&postur=seimbang&pembaca=pedagang" | head -3
curl -s -o /dev/null -w "bad postur: %{http_code}\n" "http://localhost:3000/api/redistribution-report?commodity=telur-ayam&postur=x&pembaca=pedagang"
ls -la /var/tmp/gov.pdf /var/tmp/trader.pdf
```

Expected: `200` and `Content-Type: application/pdf` twice, `400` for the bad posture, and two non-empty files. Open both and confirm: the government report's ledger section lists ten rows; the trader report lists **13 routes for Telur Ayam including the negative-margin ones**, with Sumatera Selatan → Sulawesi Tenggara showing a negative margin and "Tidak". Stop the server.

- [ ] **Step 5: Commit**

```bash
npm test && npx tsc --noEmit
git add src/lib/redistribusi/report.ts src/app/api/redistribution-report/route.ts "src/app/(dashboard)/redistribusi/page.tsx"
git commit -m "feat: redistribution report in two framings, government and trader

Mirrors the prediction report's vector-drawing approach so the codebase has
one report idiom. The trader table prints unprofitable routes too: a report
that lists only the profitable ones is an advertisement."
```

---

## Task 9: Fact blocks that a model cannot mis-render

**Repo:** root (`/home/jupyter/kawa-temp/hackathon_phase2`)

**Files:**
- Create: `supplai/narasi.py`
- Create: `tests/test_narasi.py`

**Interfaces:**
- Consumes: `artifacts/flows.parquet`, `artifacts/meta.json`, `artifacts/buku_besar.json`.
- Produces:
  ```python
  def format_id(value: float, digits: int = 2) -> str      # 1.298 -> "1,30"
  def rupiah(value: float) -> str                          # 100692943 -> "Rp100.692.943"
  def fakta_redistribusi(flows, meta, komoditas, postur) -> dict   # all values are str
  def fakta_eksekutif(flows, meta) -> dict
  ```

- [ ] **Step 1: Write the failing test**

Create `tests/test_narasi.py`:

```python
import json
import pathlib

import pandas as pd
import pytest

from supplai import narasi

ART = pathlib.Path(__file__).resolve().parents[1] / "artifacts"


@pytest.fixture(scope="module")
def bahan():
    return (pd.read_parquet(ART / "flows.parquet"),
            json.loads((ART / "meta.json").read_text()))


def test_format_uses_indonesian_separators():
    # This is the whole reason the fact block exists. Handed the float 1.298,
    # a model wrote "1.298 persen", which in Indonesian reads as one thousand
    # two hundred ninety-eight percent — and matched the fact block exactly,
    # so a naive verifier passed it.
    assert narasi.format_id(1.298) == "1,30"
    assert narasi.format_id(57.41) == "57,41"
    assert narasi.format_id(4424.0) == "4.424,00"
    assert narasi.rupiah(100692943) == "Rp100.692.943"


def test_fact_block_contains_no_raw_numbers(bahan):
    flows, meta = bahan
    f = narasi.fakta_redistribusi(flows, meta, "Beras Medium", "seimbang")
    for key, value in f.items():
        assert not isinstance(value, (int, float)), (
            f"{key} is a raw number. Every value must be a pre-formatted string, "
            f"otherwise the model formats it and gets Indonesian conventions wrong."
        )


def test_fact_block_carries_the_real_numbers(bahan):
    flows, meta = bahan
    f = narasi.fakta_redistribusi(flows, meta, "Beras Medium", "seimbang")
    assert f["jumlah_rute"] == "1"
    assert f["total_ton"] == "57,41"
    assert f["persen_pasar_terbesar"] == "1,30"
    assert f["takaran_terukur"] == "1"
    assert f["takaran_diasumsikan"] == "0"


def test_empty_plan_carries_its_status(bahan):
    flows, meta = bahan
    f = narasi.fakta_redistribusi(flows, meta, "Bawang Merah", "seimbang")
    assert f["jumlah_rute"] == "0"
    assert f["status"] == "tidak ada pasangan surplus-defisit"


def test_konservatif_status_differs_from_no_pairing(bahan):
    flows, meta = bahan
    a = narasi.fakta_redistribusi(flows, meta, "Beras Medium", "konservatif")
    b = narasi.fakta_redistribusi(flows, meta, "Bawang Merah", "konservatif")
    assert a["status"] == "tidak perlu intervensi"
    assert b["status"] == "tidak ada pasangan surplus-defisit"


def test_executive_facts_are_strings(bahan):
    flows, meta = bahan
    f = narasi.fakta_eksekutif(flows, meta)
    assert all(isinstance(v, str) for v in f.values())
    assert f["total_ton_seimbang"] == "1.025,74"  # executive.json rounds this to 1026
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd /home/jupyter/kawa-temp/hackathon_phase2
/opt/conda/bin/python -m pytest tests/test_narasi.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'supplai.narasi'`.

- [ ] **Step 3: Implement the formatting and fact blocks**

Create `supplai/narasi.py`:

```python
"""SupplAi Narasi — grounded prose for the numbers the pipeline already computed.

Two rules make this safe enough to ship.

First, the model is never handed a number. It is handed a *string already
formatted for an Indonesian reader*, and told to copy it. A smoke test showed
why: given the float 1.298 for 1,298 percent, the model wrote "1.298 persen",
which an Indonesian reader parses as one thousand two hundred ninety-eight
percent. The numeral matched the fact block exactly, so a naive verifier
passed it. Formatting is not presentation here; it is correctness.

Second, every numeral in the output is checked back against the fact block.
Two failures and the narrative is dropped, not patched. A table with no
paragraph is a smaller harm than a table with a confident wrong one.
"""

from __future__ import annotations

import json
from typing import Any

import pandas as pd

POSTUR = ("konservatif", "seimbang", "aman_pangan")


def format_id(value: float, digits: int = 2) -> str:
    """Indonesian number: dot for thousands, comma for decimals."""
    s = f"{value:,.{digits}f}"
    return s.replace(",", "\x00").replace(".", ",").replace("\x00", ".")


def rupiah(value: float) -> str:
    return "Rp" + format_id(value, 0)


def _plan(meta: dict, komoditas: str, postur: str) -> dict:
    key = f"{komoditas}|{postur}"
    if key not in meta.get("plan_meta", {}):
        raise KeyError(
            f"meta.json:plan_meta has no entry for {key!r}. Narration must not "
            f"describe a plan the pipeline did not record."
        )
    return meta["plan_meta"][key]


def fakta_redistribusi(
    flows: pd.DataFrame, meta: dict, komoditas: str, postur: str
) -> dict[str, str]:
    """Every number the redistribution narrative may use, already formatted.

    Values are strings on purpose — see the module docstring."""
    if postur not in POSTUR:
        raise ValueError(f"postur {postur!r} unknown; pick one of {list(POSTUR)}")
    plan = _plan(meta, komoditas, postur)
    sub = flows[(flows.komoditas == komoditas) & (flows.postur == postur)]

    fakta: dict[str, str] = {
        "komoditas": komoditas,
        "postur": postur,
        "status": str(plan["status"]),
        "jumlah_rute": str(len(sub)),
    }
    if sub.empty:
        return fakta

    terukur = int((sub.dasar_takaran == "terukur").sum())
    fakta.update({
        "total_ton": format_id(float(sub.volume_ton.sum())),
        "total_biaya": rupiah(float(sub.biaya_rp.sum())),
        "jumlah_asal": str(sub.dari.nunique()),
        "jumlah_tujuan": str(sub.ke.nunique()),
        "persen_pasar_terbesar": format_id(float(sub.persen_pasar.max())),
        "persen_pasar_terkecil": format_id(float(sub.persen_pasar.min())),
        "takaran_terukur": str(terukur),
        "takaran_diasumsikan": str(len(sub) - terukur),
        "kecukupan_terbesar": format_id(float(sub.kecukupan_persen.max()), 1),
        "kecukupan_terkecil": format_id(float(sub.kecukupan_persen.min()), 1),
        "rute_terbesar_asal": str(sub.loc[sub.volume_ton.idxmax(), "dari"]),
        "rute_terbesar_tujuan": str(sub.loc[sub.volume_ton.idxmax(), "ke"]),
        "rute_terbesar_ton": format_id(float(sub.volume_ton.max())),
    })
    return fakta


def fakta_eksekutif(flows: pd.DataFrame, meta: dict) -> dict[str, str]:
    s = flows[flows.postur == "seimbang"]
    return {
        "total_ton_seimbang": format_id(float(s.volume_ton.sum())),
        "jumlah_rute_seimbang": str(len(s)),
        "jumlah_komoditas_berrute": str(s.komoditas.nunique()),
        "takaran_terukur": str(int((s.dasar_takaran == "terukur").sum())),
        "takaran_diasumsikan": str(int((s.dasar_takaran == "diasumsikan").sum())),
        "provinsi_tujuan": str(s.ke.nunique()),
    }
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
/opt/conda/bin/python -m pytest tests/test_narasi.py -v
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add supplai/narasi.py tests/test_narasi.py
git commit -m "feat: fact blocks that hand the model strings, never numbers

A smoke test handed gpt-5.4-mini the float 1.298 for 1,298 percent and it
wrote '1.298 persen' — a thousandfold error that an Indonesian reader would
take at face value and that matched the fact block exactly, so a naive
verifier would pass it. Formatting happens before the model, not after."
```

---

## Task 10: The number verifier

**Repo:** root

**Files:**
- Modify: `supplai/narasi.py`
- Modify: `tests/test_narasi.py`

**Interfaces:**
- Produces: `def angka_dalam(teks: str) -> list[str]`, `def verifikasi(teks: str, fakta: dict[str, str]) -> tuple[bool, list[str]]` — returns `(ok, unmatched_numerals)`.

- [ ] **Step 1: Write the failing test**

Append to `tests/test_narasi.py`:

```python
FAKTA = {
    "komoditas": "Beras Medium",
    "total_ton": "57,41",
    "persen_pasar_terbesar": "1,30",
    "jumlah_rute": "1",
    "total_biaya": "Rp100.692.943",
}


def test_accepts_text_that_only_copies_the_facts():
    ok, sisa = narasi.verifikasi(
        "Rencana ini memindahkan 57,41 ton melalui 1 rute, "
        "mengisi 1,30% pasar tujuan, dengan biaya Rp100.692.943.", FAKTA)
    assert ok, sisa


def test_rejects_an_invented_number():
    ok, sisa = narasi.verifikasi("Rencana ini memindahkan 812,00 ton beras.", FAKTA)
    assert not ok
    assert "812,00" in sisa


def test_rejects_the_indonesian_decimal_trap():
    # The exact smoke-test failure, as a regression. "1.298" is 1,298 written
    # with an English decimal point; in Indonesian it reads as 1298. It must not
    # be accepted just because the digits resemble a fact.
    ok, sisa = narasi.verifikasi("Rencana ini mengisi 1.298 persen pasar.", FAKTA)
    assert not ok, "1.298 means 1298 in Indonesian and is not 1,30"


def test_rejects_a_plausible_but_absent_year():
    ok, _ = narasi.verifikasi("Data ini berasal dari tahun 2019.", FAKTA)
    assert not ok


def test_requires_the_numeral_to_be_copied_exactly():
    # No rounding tolerance, deliberately: the fact block is already formatted
    # for the reader, so the model has nothing to round. "57,410" is a numeral
    # the facts do not contain, and inventing a tolerance would be inventing
    # permission to alter figures.
    ok, _ = narasi.verifikasi("Terdapat 1 rute dengan 57,41 ton.", FAKTA)
    assert ok
    ok, sisa = narasi.verifikasi("Terdapat 1 rute dengan 57,410 ton.", FAKTA)
    assert not ok
    assert "57,410" in sisa


def test_text_with_no_numerals_passes():
    ok, _ = narasi.verifikasi("Rencana ini tidak menyebut angka sama sekali.", FAKTA)
    assert ok
```

- [ ] **Step 2: Run it to verify it fails**

```bash
/opt/conda/bin/python -m pytest tests/test_narasi.py -k verifikasi -v
```

Expected: FAIL — `AttributeError: module 'supplai.narasi' has no attribute 'verifikasi'`.

- [ ] **Step 3: Implement the verifier**

Add to `supplai/narasi.py`:

```python
import re

# A numeral as an Indonesian reader writes it: digits, optional dot-grouped
# thousands, optional comma decimals. Matched greedily so "100.692.943" is one
# token rather than three.
_ANGKA = re.compile(r"\d[\d.]*(?:,\d+)?")


def angka_dalam(teks: str) -> list[str]:
    """Every numeral in the text, as written."""
    return [m.group(0).rstrip(".") for m in _ANGKA.finditer(teks)]


def _kanonik(token: str) -> str | None:
    """Normalise an Indonesian numeral to a plain decimal string.

    Read strictly, as an Indonesian reader would: "1.298" is one thousand two
    hundred ninety-eight, not 1,298. That is the whole point — a model that
    writes it meaning 1,298 gets rejected, because 1298 is not in the facts.
    Returns None for a token that is not well-formed at all (a dot group with
    the wrong number of digits), which also counts as a rejection.
    """
    token = token.strip()
    if not token:
        return None
    bulat, _, desimal = token.partition(",")
    bagian = bulat.split(".")
    if len(bagian) > 1:
        if any(len(b) != 3 for b in bagian[1:]) or not bagian[0]:
            return None
    if not all(b.isdigit() for b in bagian):
        return None
    utuh = "".join(bagian)
    return f"{int(utuh)}.{desimal}" if desimal else str(int(utuh))


def verifikasi(teks: str, fakta: dict[str, str]) -> tuple[bool, list[str]]:
    """True only if every numeral in `teks` also appears in `fakta`.

    Fails closed: an unparseable numeral counts as unmatched. Instructing a
    model not to invent numbers is a hope; this is the check.
    """
    diizinkan: set[str] = set()
    for nilai in fakta.values():
        for token in angka_dalam(str(nilai)):
            k = _kanonik(token)
            if k is not None:
                diizinkan.add(k)

    sisa: list[str] = []
    for token in angka_dalam(teks):
        k = _kanonik(token)
        if k is None or k not in diizinkan:
            sisa.append(token)
    return (not sisa), sisa
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
/opt/conda/bin/python -m pytest tests/test_narasi.py -v
```

Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add supplai/narasi.py tests/test_narasi.py
git commit -m "feat: reject every numeral the fact block does not contain

Including the one that looks right: '1.298' is a malformed Indonesian
numeral, and treating it as a match for 1,30 would ship a thousandfold
error with a verifier's blessing."
```

---

## Task 11: Cache, client, and the actual build

**Repo:** root

**Files:**
- Modify: `supplai/narasi.py`
- Modify: `tests/test_narasi.py`
- Create: `artifacts/narasi.json`, `artifacts/narasi_cache.json`

**Interfaces:**
- Produces:
  ```python
  MODEL = "gpt-5.4-mini-2026-03-17"
  PROMPT_VERSION = "1"
  def kunci_cache(fakta: dict, prompt: str) -> str
  def tulis_narasi(fakta, prompt, cache, client) -> str | None   # None = dropped
  def bangun(art_dir, client=None) -> dict                        # writes narasi.json
  ```

- [ ] **Step 1: Write the failing test**

Append to `tests/test_narasi.py`:

```python
class FakeClient:
    """Counts calls so the cache can be proven, and returns whatever we queue."""

    def __init__(self, balasan):
        self.balasan = list(balasan)
        self.panggilan = 0
        self.responses = self

    def create(self, **kwargs):
        self.panggilan += 1
        teks = self.balasan.pop(0)

        class C:
            type = "output_text"
        c = C(); c.text = teks

        class O:
            content = [c]
        class R:
            output = [O()]
        return R()


def test_identical_facts_make_zero_extra_calls():
    cache = {}
    client = FakeClient(["Rencana ini memindahkan 57,41 ton melalui 1 rute."] * 2)
    a = narasi.tulis_narasi(FAKTA, "tulis dua kalimat", cache, client)
    b = narasi.tulis_narasi(FAKTA, "tulis dua kalimat", cache, client)
    assert a == b
    assert client.panggilan == 1, "the second call should have been served from cache"


def test_two_failed_verifications_drop_the_narrative():
    cache = {}
    client = FakeClient(["Ada 999,00 ton di sini.", "Bahkan 888,00 ton."])
    out = narasi.tulis_narasi(FAKTA, "tulis dua kalimat", cache, client)
    assert out is None, "a narrative that cannot be verified must be dropped"
    assert client.panggilan == 2, "one retry, then stop"


def test_a_retry_that_verifies_is_kept():
    cache = {}
    client = FakeClient(["Ada 999,00 ton.", "Ada 57,41 ton melalui 1 rute."])
    out = narasi.tulis_narasi(FAKTA, "tulis dua kalimat", cache, client)
    assert out == "Ada 57,41 ton melalui 1 rute."
    assert client.panggilan == 2


def test_cache_key_changes_with_facts_and_prompt():
    k1 = narasi.kunci_cache(FAKTA, "p")
    k2 = narasi.kunci_cache({**FAKTA, "total_ton": "58,00"}, "p")
    k3 = narasi.kunci_cache(FAKTA, "p2")
    assert len({k1, k2, k3}) == 3
```

- [ ] **Step 2: Run it to verify it fails**

```bash
/opt/conda/bin/python -m pytest tests/test_narasi.py -k "cache or drop or retry" -v
```

Expected: FAIL — `tulis_narasi` and `kunci_cache` do not exist.

- [ ] **Step 3: Implement**

Add to `supplai/narasi.py`:

```python
import hashlib
import os
from pathlib import Path

MODEL = "gpt-5.4-mini-2026-03-17"
PROMPT_VERSION = "1"

INSTRUKSI = (
    "Kamu menulis penjelasan untuk pembaca non-teknis di Indonesia — pegawai "
    "pemerintah daerah atau pedagang, bukan ahli statistik.\n\n"
    "ATURAN MUTLAK tentang angka:\n"
    "- Gunakan HANYA angka yang tertulis di blok fakta, disalin PERSIS seperti "
    "tertulis, termasuk koma dan titiknya.\n"
    "- JANGAN membulatkan, mengubah format, menjumlahkan, atau menghitung angka baru.\n"
    "- Jika sebuah angka tidak ada di blok fakta, jangan sebutkan.\n\n"
    "Gaya: bahasa Indonesia, kalimat pendek, tanpa jargon, tanpa kata sifat "
    "yang melebih-lebihkan. Jangan menyebut dirimu atau proses pembuatannya."
)


def kunci_cache(fakta: dict, prompt: str) -> str:
    bahan = json.dumps({"f": fakta, "p": prompt, "v": PROMPT_VERSION, "m": MODEL},
                       sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(bahan.encode("utf-8")).hexdigest()


def _panggil(client, fakta: dict, prompt: str) -> str:
    balasan = client.responses.create(
        model=MODEL,
        input=(f"{INSTRUKSI}\n\nBlok fakta (JSON):\n"
               f"{json.dumps(fakta, ensure_ascii=False, indent=1)}\n\nTugas: {prompt}"),
        max_output_tokens=600,
    )
    keping = [c.text for o in balasan.output for c in getattr(o, "content", [])
              if getattr(c, "type", "") == "output_text"]
    return "\n".join(keping).strip()


def tulis_narasi(fakta: dict, prompt: str, cache: dict, client) -> str | None:
    """One narrative, cached and verified. None means it was dropped.

    Two attempts. Never a third, and never a repaired version of a rejected
    one — editing a model's numbers on its behalf is how a wrong figure gets
    laundered into looking checked.
    """
    kunci = kunci_cache(fakta, prompt)
    if kunci in cache:
        return cache[kunci]

    for _ in range(2):
        teks = _panggil(client, fakta, prompt)
        ok, sisa = verifikasi(teks, fakta)
        if ok:
            cache[kunci] = teks
            return teks
        print(f"  verifikasi gagal, angka tak dikenal: {sisa}")
    return None


def bangun(art_dir: Path, client=None) -> dict:
    """Build every narrative into artifacts/narasi.json."""
    art_dir = Path(art_dir)
    if client is None:
        from openai import OpenAI
        kunci_api = os.environ.get("OPENAI_API_KEY")
        if not kunci_api:
            raise RuntimeError(
                "OPENAI_API_KEY is not set. Narration is a separate stage: the "
                "pipeline still produces every artifact without it."
            )
        client = OpenAI(api_key=kunci_api)

    flows = pd.read_parquet(art_dir / "flows.parquet")
    meta = json.loads((art_dir / "meta.json").read_text())
    berkas_cache = art_dir / "narasi_cache.json"
    cache = json.loads(berkas_cache.read_text()) if berkas_cache.exists() else {}

    keluar: dict[str, Any] = {"model": MODEL, "prompt_version": PROMPT_VERSION,
                              "redistribusi": {}, "eksekutif": None}

    for komoditas in sorted(flows.komoditas.unique()):
        for postur in POSTUR:
            fakta = fakta_redistribusi(flows, meta, komoditas, postur)
            if fakta["jumlah_rute"] == "0":
                continue  # an empty plan is explained by its status, in code
            print(f"narasi: {komoditas} | {postur}")
            teks = tulis_narasi(
                fakta,
                "Tulis 3-4 kalimat yang menjelaskan rencana redistribusi ini: berapa "
                "yang dikirim, ke mana, seberapa besar dibanding pasar tujuan, dan "
                "berapa banyak rute yang volumenya berdasar kebutuhan terukur.",
                cache, client)
            if teks is not None:
                keluar["redistribusi"][f"{komoditas}|{postur}"] = teks

    print("narasi: eksekutif")
    keluar["eksekutif"] = tulis_narasi(
        fakta_eksekutif(flows, meta),
        "Tulis 3-4 kalimat ringkasan untuk pimpinan: total yang direkomendasikan "
        "dipindahkan pada postur seimbang, jumlah rute dan komoditas, serta berapa "
        "banyak rute yang takarannya terukur dibanding yang diasumsikan.",
        cache, client)

    berkas_cache.write_text(json.dumps(cache, ensure_ascii=False, indent=1))
    (art_dir / "narasi.json").write_text(
        json.dumps(keluar, ensure_ascii=False, indent=1))
    return keluar


if __name__ == "__main__":
    bangun(Path(__file__).resolve().parents[1] / "artifacts")
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
/opt/conda/bin/python -m pytest tests/test_narasi.py -v
```

Expected: PASS, 16 tests.

- [ ] **Step 5: Build the narratives for real**

```bash
cd /home/jupyter/kawa-temp/hackathon_phase2
set -a && . ./.env && set +a && /opt/conda/bin/python -m supplai.narasi
```

Expected: eight `narasi: <komoditas> | <postur>` lines plus `narasi: eksekutif`. Any `verifikasi gagal` line is informational — the retry usually succeeds. Then read every narrative and check it by hand:

```bash
/opt/conda/bin/python -c "
import json
d=json.load(open('artifacts/narasi.json'))
print('model:', d['model'], '| narasi:', len(d['redistribusi']), '+ eksekutif:', d['eksekutif'] is not None)
for k,v in d['redistribusi'].items(): print(f'\n--- {k}\n{v}')
print(f'\n--- eksekutif\n{d[\"eksekutif\"]}')
"
```

**This step requires human judgement, not just a green test.** Fifteen narratives is few enough to read. The verifier only checks numerals; it cannot catch a wrong causal claim ("karena curah hujan rendah") or an overstatement ("menjamin harga turun"). If any narrative asserts a cause, a guarantee, or anything not present in the fact block, tighten `INSTRUKSI`, bump `PROMPT_VERSION` to `"2"`, delete `artifacts/narasi_cache.json`, and rebuild. Report what you found either way.

- [ ] **Step 6: Commit**

```bash
git add supplai/narasi.py tests/test_narasi.py artifacts/narasi.json artifacts/narasi_cache.json
git commit -m "feat: build the narratives once, offline, verified

Eight redistribution plans plus one executive summary; the ten empty
commodity-posture combinations are explained by their solver status in code,
which is both cheaper and more precise than asking a model to describe an
absence. gpt-5.4-mini because this is a one-off build and there is nothing
to save by using a smaller model."
```

---

## Task 12: Narration reaches the screen

**Repo:** `supplai-dev`

**Files:**
- Modify: `scripts/export_web.py`
- Modify: `scripts/tests/test_export_web.py`
- Create: `src/components/ui/narasi.tsx`
- Create: `src/data/narasi.ts`
- Modify: `src/app/(dashboard)/redistribusi/page.tsx`
- Modify: `src/components/redistribusi/info-panels.tsx`

**Interfaces:**
- Consumes: `artifacts/narasi.json`.
- Produces: `src/data/generated/narasi.json`; `narasiRedistribusi(komoditas: string, postur: Postur): string | null`; `<Narasi teks={...} />`; `<Penjelas judul={...} isi={...} />`.

- [ ] **Step 1: Write the failing export test**

Append to `scripts/tests/test_export_web.py`:

```python
def test_narasi_loads_and_is_keyed_by_commodity_and_posture():
    import pathlib
    art = pathlib.Path(__file__).resolve().parents[3] / "artifacts"
    A = ew.load_artifacts(art)
    n = A["narasi"]
    assert n["model"].startswith("gpt-"), "the model must be recorded with the text"
    assert n["redistribusi"], "no redistribution narratives were built"
    for key in n["redistribusi"]:
        komoditas, _, postur = key.partition("|")
        assert komoditas in ew.COMMODITY_ID, f"unknown commodity in narasi key: {key}"
        assert postur in {"konservatif", "seimbang", "aman_pangan"}, key
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd /home/jupyter/kawa-temp/hackathon_phase2/supplai-dev
/opt/conda/bin/python -m pytest scripts/tests/test_export_web.py -k narasi -v
```

Expected: FAIL — `KeyError: 'narasi'`.

- [ ] **Step 3: Export it**

In `scripts/export_web.py`, in `load_artifacts`, after the `"buku_besar"` entry:

```python
        "narasi": json.loads((art / "narasi.json").read_text()),
```

In `main`, after the ledger write:

```python
    _write(args.out, "narasi.json", A["narasi"])
```

and in the self-check block:

```python
    assert A["narasi"]["redistribusi"], "narasi.json has no redistribution text"
```

Then regenerate: `/opt/conda/bin/python scripts/export_web.py`

- [ ] **Step 4: Create the data accessor**

`src/data/narasi.ts`:

```ts
import type { Postur } from "@/lib/types"
import generated from "./generated/narasi.json"

type NarasiFile = {
  model: string
  prompt_version: string
  redistribusi: Record<string, string>
  eksekutif: string | null
}

const data = generated as NarasiFile

/** WFP commodity names, the keys narasi.json uses. */
const NAMA: Record<string, string> = {
  beras: "Beras Medium",
  "bawang-merah": "Bawang Merah",
  "bawang-putih": "Bawang Putih",
  "daging-ayam": "Daging Ayam",
  "telur-ayam": "Telur Ayam",
  "minyak-goreng": "Minyak Goreng",
}

/** null where no narrative exists — an empty plan, or one whose text failed
 *  verification twice and was dropped. The caller renders nothing, not a
 *  placeholder. */
export function narasiRedistribusi(komoditas: string, postur: Postur): string | null {
  const nama = NAMA[komoditas]
  if (!nama) return null
  return data.redistribusi[`${nama}|${postur}`] ?? null
}

export const narasiEksekutif = data.eksekutif
export const narasiModel = data.model
```

- [ ] **Step 5: Create the two prose components**

`src/components/ui/narasi.tsx`:

```tsx
import { Sparkles, BookOpen } from "lucide-react";
import { narasiModel } from "@/data/narasi";

/** Machine-generated prose. Visually distinct from human-written text, and
 *  labelled, because a reader must never have to guess which sentences a model
 *  wrote. Every numeral in this text was checked against the computed figures
 *  before it shipped; the reasoning around them was not. */
export function Narasi({ teks }: { teks: string | null }) {
  if (!teks) return null;
  return (
    <div className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4 space-y-2">
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-violet-600" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700">
          Ditulis model bahasa
        </span>
      </div>
      <p className="text-xs text-slate-700 leading-relaxed">{teks}</p>
      <p className="text-[10px] text-violet-600/80 leading-relaxed">
        Disusun {narasiModel} dari angka yang sudah dihitung pipeline, lalu diperiksa
        ulang: setiap angka dalam teks ini harus cocok dengan angka aslinya.
        Penalarannya tidak ikut diperiksa.
      </p>
    </div>
  );
}

/** Human-written, human-reviewed explanation of what a feature is. Static on
 *  purpose: this text does not change when the data changes, so generating it
 *  would add a hallucination surface to something that can simply be correct. */
export function Penjelas({ judul, isi }: { judul: string; isi: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <BookOpen className="w-3.5 h-3.5 text-slate-500" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {judul}
        </span>
      </div>
      <p className="text-xs text-slate-600 leading-relaxed">{isi}</p>
    </div>
  );
}
```

- [ ] **Step 6: Place them on the redistribution page**

Add imports, then put `<Narasi teks={narasiRedistribusi(commodity, postur)} />` directly above the route table card, and a `<Penjelas>` inside the route table card above the table itself:

```tsx
            <Penjelas
              judul="Cara membaca tabel ini"
              isi="Tiap baris adalah satu usulan pengiriman dari provinsi asal ke provinsi tujuan. Kolom '% pasar tujuan' menunjukkan seberapa besar kiriman itu dibanding konsumsi bulanan wilayah tujuan — makin kecil, makin kecil pula risiko menekan harga pedagang setempat. Kolom 'Dasar takaran' menyatakan apakah volumenya dihitung dari kebutuhan terukur, atau dibatasi aturan yang kami tetapkan sendiri. 'Kecukupan' membandingkan kiriman ini dengan kebutuhan yang terhitung, bukan dengan seluruh kebutuhan pangan wilayah itu."
            />
```

Add a second `<Penjelas>` to the ledger card:

```tsx
            <Penjelas
              judul="Mengapa daftar ini ada"
              isi="Angka yang tidak diketahui asalnya tidak bisa diperiksa siapa pun. Daftar ini menyebut setiap masukan perhitungan beserta sumber dan tahunnya, dan menandai mana yang kami ukur dan mana yang kami tetapkan sendiri."
            />
```

- [ ] **Step 7: Verify in the browser**

```bash
npm test && npx tsc --noEmit && npm run dev
```

At `/redistribusi`: the violet narration block appears for Beras + Seimbang and Beras + Aman Pangan, and is **absent** (not blank, not a placeholder) for Beras + Konservatif and for Bawang Merah. The two grey `Penjelas` blocks read as human text and are visually distinct from the violet one. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add scripts/export_web.py scripts/tests/test_export_web.py src/data/generated/narasi.json src/data/narasi.ts src/components/ui/narasi.tsx "src/app/(dashboard)/redistribusi/page.tsx"
git commit -m "feat: generated narration on screen, marked as generated

Two visually distinct blocks: violet for text a model wrote, grey for text a
human wrote and reviewed. The static explainers are static because they do not
change when the data does, so generating them would buy nothing and risk
something."
```

---

## Task 13: Delete what has nothing behind it

**Repo:** `supplai-dev`

**Files:**
- Delete: `src/components/agent/agent-panel.tsx`
- Delete: `src/components/layout/filter-bar.tsx`
- Delete: `src/components/landing/about-us.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `src/components/layout/header.tsx`

- [ ] **Step 1: Confirm nothing else imports them**

```bash
cd /home/jupyter/kawa-temp/hackathon_phase2/supplai-dev
grep -rn "agent-panel\|AgentPanel\|isAgentOpen\|FilterBar\|filter-bar\|about-us\|AboutUs" --include=*.tsx --include=*.ts src/
```

Expected: matches only in `(dashboard)/layout.tsx` (import, state, render, and the `onToggleAgent` prop passed to `Header`), in `header.tsx` (the prop and its button), and inside the three files being deleted. If anything else appears, stop and report it rather than deleting.

- [ ] **Step 2: Delete the files**

```bash
git rm src/components/agent/agent-panel.tsx src/components/layout/filter-bar.tsx src/components/landing/about-us.tsx
```

- [ ] **Step 3: Unwire the panel**

In `src/app/(dashboard)/layout.tsx`: remove the `AgentPanel` dynamic import (lines 10-12), the `isAgentOpen` state (line 20), the `onToggleAgent` prop passed to `<Header>` (line 43), and the whole `{isAgentOpen && (...)}` block (lines 74-85).

In `src/components/layout/header.tsx`: remove `onToggleAgent` from `HeaderProps` and the function signature, and delete the button that calls it (around line 345). Remove any icon import left unused.

- [ ] **Step 4: Verify the build and every page**

```bash
npx tsc --noEmit && npm run build && npm test
npm run dev
```

Visit `/`, `/dashboard`, `/heatmap`, `/redistribusi`, `/alerts`, `/executive-summary`. Every page must render with no console error and no gap where the removed trigger sat. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: delete three components with nothing behind them

agent-panel answered from a setTimeout with an invented Jakarta beef price
of Rp135.200 and an invented cause. filter-bar's export button fired a
success toast and produced no file; nothing imported it. about-us was dead
code holding a copy of landing claims already corrected elsewhere."
```

---

## Task 14: Reconcile the numbers that this work moved

**Repo:** both

**Files:**
- Modify: `docs/superpowers/specs/2026-09-06-narasi-laporan-dan-postur-design.md`
- Modify: `../LAPORAN_TEKNIS_E2E.md` (§14 backlog)

- [ ] **Step 1: Re-measure every figure the spec asserts**

```bash
cd /home/jupyter/kawa-temp/hackathon_phase2
/opt/conda/bin/python -c "
import pandas as pd, json
f=pd.read_parquet('artifacts/flows.parquet')
for p in ['seimbang','aman_pangan']:
    s=f[f.postur==p]
    t=int((s.dasar_takaran=='terukur').sum())
    print(p,'rute',len(s),'terukur',t,'diasumsikan',len(s)-t)
s=f[f.postur=='seimbang'].copy()
s['margin']=(s.harga_tujuan-s.harga_asal)-s.jarak_km*2.5
print('menutup ongkos:',int((s.margin>0).sum()),'dari',len(s))
print('persen_pasar', round(s.persen_pasar.min(),3), '-', round(s.persen_pasar.max(),3))
print('kecukupan', round(s.kecukupan_persen.min(),1), '-', round(s.kecukupan_persen.max(),1))
print('narasi:', len(json.load(open('artifacts/narasi.json'))['redistribusi']))
"
```

- [ ] **Step 2: Correct any figure in the spec that no longer matches**

Every number in the spec was measured before implementation. If any moved, fix the spec — do not leave a document asserting a figure the artifacts contradict. If none moved, say so explicitly in the commit message rather than committing nothing.

- [ ] **Step 3: Add the remaining stale-number work to the §14 backlog**

`Proposal_Tahap3_SupplAi.md` still carries pre-sizing figures and now also predates the report and narration. Add a line naming which sections are affected. Do not edit the proposal in this task — it is the offtaker-facing document and needs its own pass.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "docs: reconcile the spec against what was built"
```

---

## Self-Review

**Spec coverage.** Part 1 → Tasks 1-6. Part 2 → Tasks 7-8. Part 3 → Tasks 9-12. Part 4 → Task 13. Testing → folded into each task. Risks → Task 11 Step 5 (human read of every narrative) and Task 14 (reconciliation).

**Known gaps, stated rather than hidden:**

1. **`konsumsi_per_kapita` provenance for the "tidak ada kebutuhan terukur" branch is never exercised.** No commodity currently hits it, so `jelaskanStatus` handles a case that has no live example. It is written from the solver's code path, not from an observed artifact.
2. **The trader report's price basis is a provincial average**, not a wholesale quote. Stated in the report; not fixable with the data we have.
3. **`per_kom["all"]` narration is not built.** Narratives are per commodity; the aggregate view gets none. Deliberate — a paragraph mixing six commodities' tonnages has no reader.
4. **Three pre-existing test failures** in `scripts/tests/test_export_web.py` predate this work and are verified failing on `dev`. Task 1 Step 9 says to leave them.
