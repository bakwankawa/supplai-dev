"""Export SupplAi model artifacts to JSON for the Next.js front-end.

Reads the batch pipeline's precomputed parquet/meta from an artifacts dir and
writes JSON (shaped to src/lib/types.ts) into src/data/generated/. Re-run after
each retrain:  python scripts/export_web.py
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

import pandas as pd

# WFP commodity name -> (id, display name, unit). The 6 the model forecasts.
COMMODITY_ID = {
    "Beras Medium":  ("beras",         "Beras Medium",  "kg"),
    "Bawang Merah":  ("bawang-merah",  "Bawang Merah",  "kg"),
    "Bawang Putih":  ("bawang-putih",  "Bawang Putih",  "kg"),
    "Daging Ayam":   ("daging-ayam",   "Daging Ayam",   "kg"),
    "Telur Ayam":    ("telur-ayam",    "Telur Ayam",    "kg"),
    "Minyak Goreng": ("minyak-goreng", "Minyak Goreng", "kg"),
}

SEV_MAP = {"Kritis": "kritis", "Warning": "tinggi", "Info": "sedang"}
PRIO_MAP = {"Kritis": "high", "Warning": "medium", "Info": "low"}
IND_MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
              "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]


def _disp_month(ts) -> str:
    return f"{IND_MONTHS[ts.month]} {ts.year % 100:02d}"

def _pipeline_root() -> Path:
    """Where the pipeline repo (bakwankawa/supplai-pipeline) lives.

    supplai-dev and the pipeline are two independent repositories — the
    pipeline's own .gitignore excludes supplai-dev/, so nothing declares this
    layout. On this machine supplai-dev happens to sit two directories inside
    a pipeline checkout (scripts/ -> supplai-dev/ -> pipeline root, where
    artifacts/ and data/ live), and that sibling guess is the fallback here.
    It is not guaranteed elsewhere: a standalone supplai-dev checkout, a
    teammate's machine, CI. Set SUPPLAI_PIPELINE_ROOT to override it.
    """
    override = os.environ.get("SUPPLAI_PIPELINE_ROOT")
    return Path(override).resolve() if override else Path(__file__).resolve().parents[2]


_PIPELINE_ROOT = _pipeline_root()
# artifacts/ and data/ are expected to live under the pipeline root regardless
# of whether that root came from the env override or the sibling guess.
DEFAULT_ARTIFACTS = _PIPELINE_ROOT / "artifacts"
DEFAULT_DATA = _PIPELINE_ROOT / "data"


def _ensure_supplai_importable() -> None:
    """Put the pipeline package on sys.path, failing loudly and specifically
    if it isn't there to be found.

    Called lazily from build_tingkatan()/build_lanskap() — the rest of this
    module's tests never touch the pipeline package and must not start
    failing because it is missing. When it IS needed and can't be found, a
    bare ModuleNotFoundError would point at nothing useful (a directory the
    reader has never heard of); this raises one that names the missing repo,
    where it looked, and how to point it somewhere else.
    """
    root = str(_PIPELINE_ROOT)
    if root not in sys.path:
        sys.path.insert(0, root)
    try:
        import supplai  # noqa: F401
    except ModuleNotFoundError as e:
        raise ModuleNotFoundError(
            f"cannot import 'supplai': the pipeline repository "
            f"(bakwankawa/supplai-pipeline) was not found at {_PIPELINE_ROOT}. "
            f"export_web.py guesses that location by assuming supplai-dev sits "
            f"inside a pipeline checkout, which is only true on some machines. "
            f"Set the SUPPLAI_PIPELINE_ROOT environment variable to a checkout "
            f"of bakwankawa/supplai-pipeline to fix this."
        ) from e


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", str(s).lower()).strip("-")


def load_artifacts(art: Path) -> dict:
    def pq(name):
        return pd.read_parquet(art / f"{name}.parquet")

    return {
        "forecast": pq("forecast"),
        "forecast_path": pq("forecast_path"),
        "panel": pq("panel"),
        "alerts": pq("alerts"),
        "flows": pq("flows"),
        "thresholds": pq("thresholds"),
        "centroids": pq("centroids"),
        "bench_final": pq("bench_final"),
        "meta": json.loads((art / "meta.json").read_text()),
        "buku_besar": json.loads((art / "buku_besar.json").read_text()),
        "narasi": json.loads((art / "narasi.json").read_text()),
        "final_results": json.loads((art / "final_results.json").read_text()),
        "uji_ongkos": json.loads((art / "uji_ongkos.json").read_text()),
    }


def or_none(x, ndigits: int):
    # No data, no number: an unknown value (NaN) must not read as zero, and
    # json.dumps(..., allow_nan=False) rejects a bare NaN float outright — it
    # would rather fail loudly at write time than let one leak into the JSON
    # as a token the browser's JSON.parse chokes on. None survives the trip
    # and serializes to `null`, which keeps "unknown" representable. Shared
    # by every builder below rather than reimplemented per call site — see
    # anggaranNasionalTon in build_redistribution for the original precedent.
    x = float(x)
    return None if pd.isna(x) else round(x, ndigits)


# --------------------------------------------------------------------------- #
# Builders
# --------------------------------------------------------------------------- #
def build_commodities() -> list:
    return [{"id": cid, "name": name, "unit": unit}
            for (cid, name, unit) in COMMODITY_ID.values()]


def build_regions(cent: pd.DataFrame) -> list:
    return [{"id": slug(r.provinsi), "name": r.provinsi, "province": r.provinsi,
             "lat": float(r.lat), "lng": float(r.lon)}
            for r in cent.itertuples()]


def build_regional(forecast: pd.DataFrame, cent: pd.DataFrame) -> list:
    """Per-province staple (beras) current price + status, for the choropleth."""
    fc = forecast[forecast.komoditas == "Beras Medium"].set_index("provinsi")
    out = []
    for prov in cent["provinsi"]:
        if prov not in fc.index:
            continue
        chg = float(fc.loc[prov, "perubahan_persen"])
        status = "CRITICAL" if chg > 3 else "SURPLUS" if chg < -3 else "STABLE"
        out.append({"region": prov, "price": round(float(fc.loc[prov, "harga_kini"])),
                    "status": status})
    return out


def build_heatmap(panel: pd.DataFrame, forecast: pd.DataFrame,
                  forecast_path: pd.DataFrame, months: int = 12) -> dict:
    """Per-commodity matrix of monthly prices, history followed by the forecast.

    The matrix used to stop at the last observed month, which left the whole
    grid descriptive and pushed the only forward-looking figures into a
    separate Top-5 panel. Every monitored province now carries its three
    forecast months in the same row, flagged `isFuture` so the table can draw
    the boundary rather than blur it.
    """
    out = {}
    for wfp, (cid, _disp, _unit) in COMMODITY_ID.items():
        p = panel[panel.komoditas == wfp]
        fp = forecast_path[forecast_path.komoditas == wfp]
        matrix = []
        for prov, g in p.groupby("provinsi"):
            g = g.sort_values("bulan").tail(months)
            if g.empty:
                continue
            base = float(g["harga"].iloc[0]) or 1.0
            data = [{"date": f"{b:%Y-%m-01}", "price": round(float(h)),
                     "change": round((float(h) - base) / base * 100, 2),
                     "isFuture": False}
                    for b, h in zip(g["bulan"], g["harga"])]
            # Same base as the history, so one colour scale spans the whole row.
            for b, e in zip(*[fp[fp.provinsi == prov].sort_values("h")[c]
                              for c in ("bulan", "ensemble")]):
                data.append({"date": f"{b:%Y-%m-01}", "price": round(float(e)),
                             "change": round((float(e) - base) / base * 100, 2),
                             "isFuture": True})
            matrix.append({"region": prov, "data": data})
        # Summary stats describe what has actually happened, so they ignore the
        # forecast cells appended above.
        hist = [[c for c in row["data"] if not c["isFuture"]] for row in matrix]
        last = [h[-1]["change"] for h in hist if h]
        avg_inc = round(sum(last) / len(last), 2) if last else 0.0
        alert_cnt = sum(1 for h in hist
                        if len(h) >= 2
                        and (h[-1]["price"] - h[0]["price"]) / max(h[0]["price"], 1) * 100 > 10)
        fc = forecast[forecast.komoditas == wfp].sort_values("perubahan_persen",
                                                             ascending=False)
        top = [{"region": r.provinsi, "commodity": cid,
                "change": round(float(r.perubahan_persen), 2)}
               for r in fc.head(5).itertuples()]
        out[cid] = {"summary": {"totalRegions": len(matrix), "avgIncrease": avg_inc,
                                "alertCount": alert_cnt},
                    "matrix": matrix, "topCritical": top}
    return out


def build_alerts(alerts_df: pd.DataFrame, meta: dict) -> dict:
    order = {"Kritis": 0, "Warning": 1, "Info": 2}
    df = alerts_df.copy()
    df["_o"] = df["severity"].map(order).fillna(9)
    df = df.sort_values(["_o", "perubahan_persen"],
                        ascending=[True, False]).reset_index(drop=True)
    ts = meta.get("dibuat", "2026-07-20T00:00:00")
    alerts = []
    for i, r in df.iterrows():
        cid = COMMODITY_ID.get(r["komoditas"],
                               (slug(r["komoditas"]), r["komoditas"], "kg"))[0]
        disp = COMMODITY_ID.get(r["komoditas"], ("", r["komoditas"]))[1]
        chg = float(r["perubahan_persen"])
        arah = "naik" if chg >= 0 else "turun"
        alerts.append({
            "id": f"ALT-{i + 1:03d}",
            "severity": SEV_MAP.get(r["severity"], "sedang"),
            "title": f"Harga {disp} {r['provinsi']} diperkirakan {arah} "
                     f"{abs(chg):.1f}% dalam 3 bulan",
            "region": r["provinsi"], "commodity": cid,
            "timestamp": ts, "status": "aktif",
            "confidence": round(float(r["confidence"]) * 100),
            "change": round(chg, 2),
            "detail": {
                "recommendation": str(r["alasan"]),
                "history": [{"status": "Terdeteksi", "timestamp": ts}],
                "hargaKini": round(float(r["harga_kini"])),
                "hargaPrediksi": round(float(r["harga_prediksi"])),
                "persentilHistoris": round(float(r["persentil_historis"]), 1),
                "mapeKomoditas": round(float(r["mape_komoditas"]), 2),
                "diAtasHet": bool(r["di_atas_het"]),
                "anomaliTerkonfirmasi": bool(r["anomali_terkonfirmasi"]),
            },
        })
    # `avgResponseTime` and `resolved` used to ship here as hardcoded zeros.
    # Nothing in the product measures a response time or closes a distribution
    # case, so the fields carried no measurement — only the appearance of one.
    return {"summary": {"active": len(alerts), "thisMonth": len(alerts)},
            "alerts": alerts}


def _response_for(sub: pd.DataFrame, cid: str, plan: dict,
                  bulan_prediksi: str, horizon_bulan: int) -> dict:
    routes, net = [], {}

    # ditahan_pp and its three companions are deliberately NaN for a route
    # with no supporting consumption data (kebutuhan.dampak_harga simply
    # omits that province, so a .map() lookup comes back NaN) — unknown must
    # not read as zero. or_none() (module level, above) is the shared helper
    # for that; mirrors anggaranNasionalTon's None-if-missing precedent below.
    for r in sub.itertuples():
        routes.append({"from": r.dari, "to": r.ke, "commodity": cid,
                       "volume": round(float(r.volume_ton)),
                       "distance": round(float(r.jarak_km)),
                       "cost": round(float(r.biaya_rp)),
                       "priority": PRIO_MAP.get(r.urgensi, "low"),
                       # Population-based sizing. `volume` above stays rounded
                       # for the existing display; volumeTon keeps the precision
                       # the new figures need — routes are tens of tonnes now,
                       # not hundreds, so rounding to integer loses real signal.
                       "volumeTon": round(float(r.volume_ton), 2),
                       "persenPasar": round(float(r.persen_pasar), 3),
                       "postur": str(r.postur),
                       "epsilon": round(float(r.epsilon), 3),
                       "dasarTakaran": str(r.dasar_takaran),
                       "kecukupanPersen": round(float(r.kecukupan_persen), 1),
                       "epsilonSumber": str(r.epsilon_sumber),
                       "volumeCiBawah": round(float(r.volume_ci_bawah), 2),
                       "volumeCiAtas": round(float(r.volume_ci_atas), 2),
                       "konsumsiTujuanTonBulan": round(float(r.konsumsi_tujuan_ton_bulan), 1),
                       # The two prices the solver itself compared when it chose
                       # this lane. A report that recomputed them from heatmap.json
                       # could disagree with the plan it is describing.
                       "hargaAsal": round(float(r.harga_asal)),
                       "hargaTujuan": round(float(r.harga_tujuan)),
                       "marjinHarapanRp": round(float(r.marjin_harapan_rp)),
                       # Poin persen kenaikan yang ditahan rute ini. Mewarisi
                       # dasarTakaran: NaN (-> null) di sini berarti tidak ada
                       # data konsumsi pendukung untuk provinsi tujuannya.
                       "ditahanPp": or_none(r.ditahan_pp, 3),
                       "ditahanCiBawah": or_none(r.ditahan_ci_bawah, 3),
                       "ditahanCiAtas": or_none(r.ditahan_ci_atas, 3),
                       "fraksiDitahan": or_none(r.fraksi_ditahan, 4)})
        net[r.dari] = net.get(r.dari, 0.0) + float(r.volume_ton)
        net[r.ke] = net.get(r.ke, 0.0) - float(r.volume_ton)
    provinces = [{"id": slug(name), "name": name,
                  "status": "surplus" if v >= 0 else "deficit", "stock": round(abs(v))}
                 for name, v in sorted(net.items(), key=lambda kv: -kv[1])]
    def col_sum(name: str) -> float:
        return float(sub[name].sum()) if name in getattr(sub, "columns", []) else 0.0

    summary = {"totalRoutes": int(plan.get("n_rute", len(routes))),
               "totalVolume": round(float(plan.get("total_ton", col_sum("volume_ton")))),
               "activeRoutes": f"{int(plan.get('n_sumber', 0))} → "
                               f"{int(plan.get('n_tujuan', 0))}",
               "estimatedCost": round(float(plan.get("total_biaya",
                                                     col_sum("biaya_rp")))),
               "anggaranNasionalTon": (None if plan.get("anggaran_nasional") is None
                                       else round(float(plan["anggaran_nasional"]))),
               # Bulan yang diramal dan horizon yang mendasarinya — konstan di
               # seluruh flows, diteruskan apa adanya dari build_redistribution.
               "bulanPrediksi": bulan_prediksi,
               "horizonBulan": horizon_bulan,
               # Why the plan looks the way it does, straight from the solver.
               # The front end used to invent this sentence and got it wrong for
               # every empty plan.
               "status": str(plan["status"])}
    return {"summary": summary, "provinces": provinces, "routes": routes}


def build_redistribution(flows: pd.DataFrame, meta: dict) -> dict:
    # No silent defaults: a meta.json without these keys means the pipeline did
    # not run the posture loop, and quietly exporting a single posture with
    # empty summaries would hide that.
    if "plan_meta" not in meta or "postur_tersedia" not in meta:
        raise KeyError(
            "meta.json lacks 'plan_meta' and/or 'postur_tersedia' — rerun "
            "rebuild_plan.py or train.py before exporting."
        )
    plan_meta = meta["plan_meta"]
    posturs = meta["postur_tersedia"]
    # Single forecast run -> one target month and one horizon, constant across
    # every row of flows. Read once here rather than per commodity/posture
    # subset, since an empty subset (a commodity the solver moved nothing of)
    # has no row to read .iloc[0] from.
    #
    # An entirely empty *flows* (no commodity produced a single route, or no
    # column even exists yet) has nothing to read .iloc[0] from either. That
    # used to throw here — an IndexError/AttributeError with no context —
    # before the loop below ever got a chance to raise ITS own, more specific
    # KeyError about a missing plan_meta entry. Deferring this read until
    # flows is known to be non-empty restores that ordering: the file's
    # deliberate empty-flows defence (the plan_meta KeyError below) fires
    # first, the way it did before this branch added these two lines.
    #
    # supplai/match.py refuses to pick an arbitrary bulan_prediksi/
    # horizon_bulan when a commodity carries more than one distinct value —
    # it raises rather than silently take the first row. Mirror that guard
    # here: flows is meant to carry exactly one forecast run, so more than
    # one distinct value is a structural bug upstream, not a `.iloc[0]` away.
    if flows.empty:
        bulan_prediksi, horizon_bulan = "", 0
    else:
        unique_bulan = flows["bulan_prediksi"].unique()
        unique_horizon = flows["horizon_bulan"].unique()
        if len(unique_bulan) != 1:
            raise ValueError(
                f"flows carries {len(unique_bulan)} distinct bulan_prediksi "
                f"values {sorted(unique_bulan)}, but the whole export must "
                f"target exactly one month. Falling back to the first row "
                f"would silently pick an arbitrary month."
            )
        if len(unique_horizon) != 1:
            raise ValueError(
                f"flows carries {len(unique_horizon)} distinct horizon_bulan "
                f"values {sorted(unique_horizon)}, but the whole export must "
                f"have exactly one horizon. Falling back to the first row "
                f"would silently pick an arbitrary horizon."
            )
        bulan_prediksi = str(flows.bulan_prediksi.iloc[0])
        horizon_bulan = int(flows.horizon_bulan.iloc[0])
    out = {}
    for postur in posturs:
        by_postur = (flows[flows.postur == postur]
                     if not flows.empty and "postur" in flows.columns else flows)
        per_kom = {}
        for wfp, (cid, _d, _u) in COMMODITY_ID.items():
            sub = by_postur[by_postur.komoditas == wfp] if not by_postur.empty else by_postur
            # A commodity the solver found nothing to move still gets an entry.
            # Skipping it let the front-end's `data[commodity] ?? data["all"]`
            # fall through to the aggregate, so selecting Bawang Merah displayed
            # Beras routes under a Bawang Merah heading.
            key = f"{wfp}|{postur}"
            if key not in plan_meta:
                raise KeyError(
                    f"plan_meta has no entry for {key!r}. Every commodity-posture "
                    f"pair must be present, including empty ones — a missing entry "
                    f"would render as an unexplained blank table."
                )
            per_kom[cid] = _response_for(sub, cid, plan_meta[key],
                                         bulan_prediksi, horizon_bulan)
        with_routes = [r for r in per_kom.values() if r["routes"]]
        all_routes = [rt for resp in with_routes for rt in resp["routes"]]
        all_net = {}
        for resp in with_routes:
            for p in resp["provinces"]:
                sign = 1 if p["status"] == "surplus" else -1
                all_net[p["name"]] = all_net.get(p["name"], 0) + sign * p["stock"]
        per_kom["all"] = {
            "summary": {"totalRoutes": sum(r["summary"]["totalRoutes"] for r in with_routes),
                        "totalVolume": sum(r["summary"]["totalVolume"] for r in with_routes),
                        "activeRoutes": f"{len(with_routes)} komoditas",
                        "estimatedCost": sum(r["summary"]["estimatedCost"] for r in with_routes),
                        # A national tonnage cap is per-commodity; summing it
                        # across six commodities would be a number with no meaning.
                        "anggaranNasionalTon": None,
                        "bulanPrediksi": bulan_prediksi,
                        "horizonBulan": horizon_bulan,
                        "status": "ok" if all_routes else "kosong"},
            "provinces": [{"id": slug(n), "name": n,
                           "status": "surplus" if v >= 0 else "deficit", "stock": abs(v)}
                          for n, v in sorted(all_net.items(), key=lambda kv: -kv[1])],
            "routes": all_routes}
        out[postur] = per_kom
    # The dashboard's default view reads the balanced posture.
    out["default"] = out.get("seimbang", next(iter(out.values())))
    return out


# Component order of the per-commodity blend weights in final_results.json.
# Must match bench_final.py, which scores `w[0]*lgbm + w[1]*lstm + w[2]*qnt`.
BLEND_COLS = ("lgbm", "lstm", "qnt")


def blend_h1(bench_final: pd.DataFrame, final_results: dict) -> pd.DataFrame:
    """Horizon-1 rows with the tuned ensemble and its absolute % error.

    Applies the per-commodity weights the benchmark actually selected. A plain
    50/50 lgbm/lstm average was used here before; it ignored both the tuning and
    the quantile component, and reported 4.14% where the model delivers 3.94%.
    """
    b = bench_final[bench_final.h == 1].copy()
    bobot = final_results["bobot"]
    w = b["komoditas"].map(bobot)
    b["ens"] = [sum(wt[i] * row[BLEND_COLS[i]] for i in range(3))
                for wt, (_, row) in zip(w, b.iterrows())]
    b["ape"] = (b["ens"] - b["actual"]).abs() / b["actual"] * 100
    return b


def headline_mape_h1(bench_final: pd.DataFrame, final_results: dict) -> float:
    return float(blend_h1(bench_final, final_results)["ape"].mean())


def build_executive(A: dict) -> dict:
    mape = headline_mape_h1(A["bench_final"], A["final_results"])
    avg_chg = float(A["forecast"]["perubahan_persen"].mean())
    # flows and plan_meta carry three postures since the population-sizing work.
    # Aggregating without filtering counts the balanced plan and the food-security
    # plan as if both would be executed — this tile read 2,276 t where the balanced
    # plan is 1,026 t. Report the posture the dashboard actually shows.
    tersedia = A["meta"].get("postur_tersedia", ["seimbang"])
    postur_utama = "seimbang" if "seimbang" in tersedia else tersedia[0]
    flows_utama = (A["flows"][A["flows"]["postur"] == postur_utama]
                   if "postur" in A["flows"].columns else A["flows"])
    n_routes = len(flows_utama)
    n_alerts = len(A["alerts"])
    n_series = len(A["forecast"])
    total_ton = round(sum(v.get("total_ton", 0)
                          for k, v in A["meta"].get("plan_meta", {}).items()
                          if k.endswith(f"|{postur_utama}")))
    arah = "TURUN" if avg_chg < 0 else "NAIK"
    top = [
        # MAPE is a backtest error, not a probability of being right. Presenting
        # 100-MAPE as "accuracy" invites reading 96.1% as a 96% chance the
        # forecast is correct. Matches the Prediction page's wording exactly.
        {"title": "KESALAHAN HISTORIS (MAPE)", "value": f"{mape:.2f}%",
         "statusText": "EVALUASI 1 BULAN",
         "statusType": "stable", "chartType": "line-green"},
        {"title": "PERUBAHAN HARGA 3 BLN", "value": f"{abs(avg_chg):.1f}%",
         "statusText": arah, "statusType": "neutral",
         "subtext": "rata-rata 6 komoditas", "chartType": "line-red"},
        {"title": "SERI DIPANTAU", "value": f"{n_series}", "statusText": "34 PROVINSI",
         "statusType": "neutral", "subtext": "Seri", "chartType": "dots"},
        {"title": "VOL. REDISTRIBUSI", "value": f"{total_ton}", "statusText": "REKOMENDASI",
         "statusType": "surplus", "subtext": "Ton", "chartType": "bars"},
    ]
    shortcuts = [
        {"title": "Predict", "id": "MAPE", "value": f"{mape:.2f}%",
         "label": "Evaluasi historis 1 bln", "type": "predict", "color": "emerald"},
        {"title": "Heatmap", "id": "PROVINSI", "value": "34", "label": "DIPANTAU",
         "type": "heatmap", "color": "blue"},
        {"title": "Match", "id": "RUTE AKTIF", "value": f"{n_routes}", "label": "ROUTES",
         "type": "match", "color": "rose"},
        {"title": "Alert Center", "id": "PERINGATAN", "value": f"{n_alerts}",
         "label": "AKTIF", "type": "alerts", "color": "amber"},
    ]
    return {"topMetrics": top, "shortcutCards": shortcuts}


def build_timeseries(panel: pd.DataFrame, forecast_path: pd.DataFrame,
                     months_hist: int = 15) -> dict:
    """{commodityId: {province: TimeSeriesPoint[]}} — monthly history + forecast.

    Each series is the last `months_hist` months of actuals (last one flagged
    isToday) followed by the 3 forecast months (isFuture). Feeds the flagship
    Price-Prediction chart.
    """
    out = {}
    for wfp, (cid, _disp, _unit) in COMMODITY_ID.items():
        out[cid] = {}
        p = panel[panel.komoditas == wfp]
        fp = forecast_path[forecast_path.komoditas == wfp]
        for prov, g in p.groupby("provinsi"):
            g = g.sort_values("bulan").tail(months_hist)
            if g.empty:
                continue
            months = list(g["bulan"])
            pts = []
            for j, (b, h) in enumerate(zip(g["bulan"], g["harga"])):
                pts.append({"date": f"{b:%Y-%m-01}", "displayDate": _disp_month(b),
                            "price": round(float(h)), "isFuture": False,
                            "isToday": j == len(months) - 1, "region": prov})
            fpp = fp[fp.provinsi == prov].sort_values("h")
            for b, e in zip(fpp["bulan"], fpp["ensemble"]):
                pts.append({"date": f"{b:%Y-%m-01}", "displayDate": _disp_month(b),
                            "price": round(float(e)), "isFuture": True,
                            "isToday": False, "region": prov})
            out[cid][prov] = pts
    return out


def build_commodity_mape(bench_final: pd.DataFrame, final_results: dict) -> dict:
    """{commodityId: horizon-1 MAPE} from the rolling-origin blend."""
    m = blend_h1(bench_final, final_results).groupby("komoditas")["ape"].mean()
    return {COMMODITY_ID[k][0]: round(float(v), 2)
            for k, v in m.items() if k in COMMODITY_ID}


def build_tingkatan() -> dict:
    """Tiga kelompok IKP, plus provinsi mana yang tidak berpasangan.

    Cakupan ikut dikirim, bukan disembunyikan: empat provinsi Papua punya skor
    tetapi tidak punya harga, dan salah satunya ber-IKP terendah di negeri ini.
    """
    _ensure_supplai_importable()
    from supplai import tingkatan

    t = tingkatan.muat(DEFAULT_DATA)
    prov_model = sorted(pd.read_parquet(DEFAULT_ARTIFACTS / "forecast.parquet").provinsi.unique())
    c = tingkatan.cakupan(prov_model, DEFAULT_DATA)
    return {
        "label": {k: tingkatan.LABEL[k] for k in tingkatan.KELOMPOK},
        "provinsi": [
            {"provinsi": p, "ikp": round(float(r.ikp), 2),
             "peringkat": int(r.peringkat), "kelompok": str(r.kelompok)}
            for p, r in t.iterrows()
        ],
        "cakupan": {
            "cocok": c["cocok"],
            "ikpTanpaHarga": c["ikp_tanpa_harga"],
            "hargaTanpaIkp": c["harga_tanpa_ikp"],
        },
    }


def build_lanskap() -> dict:
    """Posisi harga tiap komoditas di tiap provinsi terhadap median nasional."""
    _ensure_supplai_importable()
    from supplai import lanskap

    p = lanskap.posisi_harga(DEFAULT_DATA)
    return {
        "komoditas": sorted(p.komoditas.unique().tolist()),
        "baris": [
            {"komoditas": r.komoditas, "provinsi": r.provinsi,
             "harga": round(float(r.harga)),
             "medianNasional": round(float(r.median_nasional)),
             "relatifPersen": round(float(r.relatif_persen), 2),
             "posisi": r.posisi}
            for r in p.itertuples()
        ],
    }


def build_muatan_balik() -> dict:
    """Diagnosis muatan balik per postur: bentuk rute (rantai, bukan pulang-
    pergi), dan ton-km reposisi kosong yang bisa dihindari bila kiriman-kiriman
    itu dirantai.

    camelCase mengikuti pemetaan yang dinyatakan di Self-Review rencana:
    n_rute -> nRute, total_ton -> totalTon, ton_km -> tonKm,
    pasangan_bolak_balik -> pasanganBolakBalik, ton_dirantai -> tonDirantai,
    persen_dirantai -> persenDirantai. `rantai` per postur adalah tabel per
    simpul (hub) yang menerima sekaligus mengirim — batasnya sama dengan
    modul sumbernya (supplai/muatan_balik.py): ini rute PENGIRIMAN yang
    dipasangkan, bukan kapal; ia tidak mengaku tahu kapal mana yang pulang
    kosong. `or_none()` menahan setiap total yang bisa NaN (seluruh baris
    yang ADA tapi volumenya tak diketahui) dari terbaca sebagai nol.
    """
    _ensure_supplai_importable()
    from supplai import muatan_balik as mb

    flows = pd.read_parquet(DEFAULT_ARTIFACTS / "flows.parquet")
    meta = json.loads((DEFAULT_ARTIFACTS / "meta.json").read_text())
    posturs = meta.get("postur_tersedia", ["seimbang"])

    out = {}
    for postur in posturs:
        d = mb.diagnosa(flows, postur)
        r = mb.ringkas(flows, postur)
        rantai_df = mb.rantai(flows, postur)
        out[postur] = {
            "nRute": int(d["n_rute"]),
            "totalTon": or_none(d["total_ton"], 2),
            "tonKm": or_none(d["ton_km"], 1),
            "pasanganBolakBalik": int(d["pasangan_bolak_balik"]),
            "simpul": list(d["simpul"]),
            "tonDirantai": or_none(r["ton_dirantai"], 2),
            "persenDirantai": or_none(r["persen_dirantai"], 2),
            "tonKmKosongDihindari": or_none(r["ton_km_kosong_dihindari"], 1),
            "rantai": [
                {"hub": row.hub, "dari": row.dari, "ke": row.ke,
                 "komoditasMasuk": row.komoditas_masuk,
                 "komoditasKeluar": row.komoditas_keluar,
                 "tonDirantai": round(float(row.ton_dirantai), 2)}
                for row in rantai_df.itertuples()
            ],
        }
    # The dashboard's default view reads the balanced posture — same
    # precedent as build_redistribution's "default" key.
    out["default"] = out.get("seimbang", next(iter(out.values())))
    return out


def _struktur_ongkos_out(s: dict) -> dict:
    return {
        "totalTon": round(float(s["total_ton"]), 2),
        "nRute": int(s["n_rute"]),
        "rute": [list(r) for r in s["rute"]],
        "totalOngkos": round(float(s["total_ongkos"])),
        "tonKeSepertigaBawah": or_none(s["ton_ke_sepertiga_bawah"], 2),
        "persenKeSepertigaBawah": or_none(s["persen_ke_sepertiga_bawah"], 2),
        "ongkosTetapTerkalibrasi": round(float(s["ongkos_tetap_terkalibrasi"]), 2),
    }


def build_uji_ongkos(uo: dict) -> dict:
    """Reshape bench_ongkos.py's uji_ongkos.json into camelCase for the FE.

    Every honesty field the source script carries is carried across, not
    dropped: `tetapDegenerate` and `keterbatasan` are the whole point of the
    experiment — the flat-cost objective is degenerate (total tonnage is
    pinned by the demand floor, so a uniform per-ton cost makes every
    feasible assignment equally optimal and the solver returns an arbitrary
    vertex of the tied face), so `ruteBerubah` on its own is not an economic
    result. `keterbatasan` records that this experiment cannot distinguish
    "distance doesn't matter economically" from "we only modelled distance".

    `persenBawahJarak`/`persenBawahTetap` are a deliberate flattening (not in
    the source JSON) of `struktur.jarak`/`struktur.tetap`'s
    `persen_ke_sepertiga_bawah`, added at this export boundary because the
    text-rendering task downstream reads those two names directly. The
    per-struktur nesting is kept alongside them — nothing is dropped, this is
    purely a convenience.
    """
    struktur = {
        "jarak": _struktur_ongkos_out(uo["struktur"]["jarak"]),
        "tetap": _struktur_ongkos_out(uo["struktur"]["tetap"]),
        "tetapPlusJarak": _struktur_ongkos_out(uo["struktur"]["tetap_plus_jarak"]),
    }

    degenerasi_detail = {}
    for kom, d in uo["degenerasi_tetap_detail"].items():
        row = {"diuji": bool(d["diuji"])}
        if d["diuji"]:
            row["nUlang"] = int(d["n_ulang"])
            row["nHimpunanUnik"] = int(d["n_himpunan_unik"])
            row["stabil"] = bool(d["stabil"])
        else:
            row["alasan"] = str(d["alasan"])
        degenerasi_detail[kom] = row

    status = uo["status_per_komoditas"]
    return {
        "postur": str(uo["postur"]),
        "komoditas": list(uo["komoditas"]),
        "struktur": struktur,
        "ruteBerubah": int(uo["rute_berubah"]),
        "ruteBerubahTetapPlusJarak": int(uo["rute_berubah_tetap_plus_jarak"]),
        "ongkosTetapTerkalibrasi": round(float(uo["ongkos_tetap_terkalibrasi"]), 2),
        "tetapDegenerate": bool(uo["tetap_degenerate"]),
        "degenerasiTetapDetail": degenerasi_detail,
        "statusPerKomoditas": {
            "jarak": dict(status["jarak"]),
            "tetap": dict(status["tetap"]),
            "tetapPlusJarak": dict(status["tetap_plus_jarak"]),
        },
        "keterbatasan": str(uo["keterbatasan"]),
        "persenBawahJarak": struktur["jarak"]["persenKeSepertigaBawah"],
        "persenBawahTetap": struktur["tetap"]["persenKeSepertigaBawah"],
    }


def build_tindakan() -> dict:
    """Jalur tindakan pembaca setelah membaca rencana: kapasitas instrumen,
    pasar bernama, dan modal-imbal hasil. Postur seimbang — laporan yang
    memakai angka ini menyatakan bulan sasarannya sendiri.

    `modal` diurutkan menurun menurut `imbalHasilPersen`, BUKAN menurut modal:
    pembaca yang memutuskan memindahkan barang ingin tahu rute mana yang
    paling menghasilkan per rupiah yang dikunci, bukan rute mana yang
    mengunci paling banyak. `pasar` mencakup ke-34 provinsi model (bukan
    hanya provinsi asal di `modal`), karena tabel rute kerangka pedagang
    menampilkannya untuk provinsi asal MAUPUN tujuan.
    """
    _ensure_supplai_importable()
    from supplai import tindakan as td

    flows = pd.read_parquet(DEFAULT_ARTIFACTS / "flows.parquet")
    postur = "seimbang"

    s = td.setara_kegiatan(flows, postur)
    setara_kegiatan = {
        "ton": round(float(s["ton"]), 1),
        "nilaiRp": round(float(s["nilai_rp"])),
        "kegiatan": round(float(s["kegiatan"])),
        "kapasitasTahunan": int(s["kapasitas_tahunan"]),
        "persenKapasitas": round(float(s["persen_kapasitas"]), 1),
    }

    m = td.modal_imbal_hasil(flows, postur).sort_values(
        "imbal_hasil_persen", ascending=False)
    modal = [
        {"dari": dari, "ton": round(float(row.ton), 2),
         "modalRp": round(float(row.modal_rp)),
         "marjinRp": round(float(row.marjin_rp)),
         "imbalHasilPersen": or_none(row.imbal_hasil_persen, 2)}
        for dari, row in m.iterrows()
    ]

    prov_model = sorted(
        pd.read_parquet(DEFAULT_ARTIFACTS / "centroids.parquet").provinsi.unique())
    pasar = {prov: td.pasar_provinsi(prov, DEFAULT_DATA) for prov in prov_model}

    return {"setaraKegiatan": setara_kegiatan, "modal": modal, "pasar": pasar}


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #
def _write(out_dir: Path, name: str, obj) -> None:
    # allow_nan=False: json.dumps defaults to writing bare NaN/Infinity tokens
    # for a float that carries them, which is not valid JSON and JSON.parse
    # rejects in the browser. Every builder above is expected to convert a
    # missing value to None (-> JSON null) before it gets here — see or_none
    # above — so a NaN reaching this call means a builder forgot, and that
    # should fail the export loudly rather than ship broken JSON.
    (out_dir / name).write_text(
        json.dumps(obj, ensure_ascii=False, indent=1, allow_nan=False))
    print(f"  wrote {name}")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--artifacts", type=Path, default=DEFAULT_ARTIFACTS)
    ap.add_argument("--out", type=Path,
                    default=Path(__file__).resolve().parents[1] / "src" / "data" / "generated")
    args = ap.parse_args(argv)

    print(f"reading artifacts from {args.artifacts}")
    A = load_artifacts(args.artifacts)
    args.out.mkdir(parents=True, exist_ok=True)

    commodities = build_commodities()
    regions = build_regions(A["centroids"])
    regional = build_regional(A["forecast"], A["centroids"])
    heatmap = build_heatmap(A["panel"], A["forecast"], A["forecast_path"])
    alerts = build_alerts(A["alerts"], A["meta"])
    redist = build_redistribution(A["flows"], A["meta"])
    executive = build_executive(A)
    timeseries = build_timeseries(A["panel"], A["forecast_path"])
    commodity_mape = build_commodity_mape(A["bench_final"], A["final_results"])
    buku_besar = A["buku_besar"]
    tingkatan = build_tingkatan()
    lanskap = build_lanskap()
    muatan_balik = build_muatan_balik()
    uji_ongkos = build_uji_ongkos(A["uji_ongkos"])
    tindakan = build_tindakan()

    _write(args.out, "commodities.json", commodities)
    _write(args.out, "regions.json", regions)
    _write(args.out, "regional.json", regional)
    _write(args.out, "heatmap.json", heatmap)
    _write(args.out, "alerts.json", alerts)
    _write(args.out, "redistribution.json", redist)
    _write(args.out, "executive.json", executive)
    _write(args.out, "timeseries.json", timeseries)
    _write(args.out, "commodity_mape.json", commodity_mape)
    _write(args.out, "buku_besar.json", buku_besar)
    _write(args.out, "narasi.json", A["narasi"])
    _write(args.out, "tingkatan.json", tingkatan)
    _write(args.out, "lanskap.json", lanskap)
    _write(args.out, "muatan_balik.json", muatan_balik)
    _write(args.out, "uji_ongkos.json", uji_ongkos)
    _write(args.out, "tindakan.json", tindakan)

    # ---- fail-closed self-check ----
    assert len(commodities) == 6, "expected 6 commodities"
    assert len(regions) == 34, f"expected 34 regions, got {len(regions)}"
    assert regional and all(r["status"] in {"CRITICAL", "STABLE", "SURPLUS"}
                            for r in regional)
    assert set(heatmap) == {c["id"] for c in commodities}, "heatmap missing a commodity"
    assert all(v["matrix"] for v in heatmap.values()), "heatmap has an empty matrix"
    assert alerts["alerts"], "no alerts produced"
    assert all(a["severity"] in {"kritis", "tinggi", "sedang", "rendah"}
               for a in alerts["alerts"])
    assert "default" in redist and redist["default"]["all"]["routes"], \
        "redistribution missing routes"
    assert len(executive["topMetrics"]) == 4 and len(executive["shortcutCards"]) == 4
    for m in executive["topMetrics"]:
        assert re.fullmatch(r"\d+(\.\d+)?[^0-9.-]*", m["value"]), \
            f"unsafe exec value {m['value']!r}"
    assert set(timeseries) == {c["id"] for c in commodities}, "timeseries missing a commodity"
    for cid, regs in timeseries.items():
        assert regs, f"timeseries[{cid}] empty"
        sample = next(iter(regs.values()))
        assert any(p["isToday"] for p in sample), "no isToday flag"
        assert sum(p["isFuture"] for p in sample) == 3, "expected 3 forecast points"
    assert len(commodity_mape) == 6, "commodity_mape must cover 6 commodities"
    assert buku_besar and all(
        {"input", "nilai", "sumber", "tahun", "status"} <= set(e) for e in buku_besar
    ), "buku_besar entries are missing required fields"
    assert all(e["status"] in {"terukur", "diasumsikan", "diturunkan"} for e in buku_besar), \
        "buku_besar status must be terukur, diasumsikan, or diturunkan"
    assert A["narasi"]["redistribusi"], "narasi.json has no redistribution text"
    for postur, per_kom in redist.items():
        for cid, resp in per_kom.items():
            assert resp["summary"].get("status"), f"{postur}/{cid} has no status"
            assert "anggaranNasionalTon" in resp["summary"], f"{postur}/{cid}"
    assert len(tingkatan["provinsi"]) == 38, "tingkatan must cover all 38 IKP provinces"
    assert set(tingkatan["label"]) == {"bawah", "tengah", "atas"}
    assert "tertinggal" not in json.dumps(tingkatan).lower(), \
        "'tertinggal' is a kabupaten designation (Perpres 63/2020); wrong at province level"
    assert tingkatan["cakupan"]["ikpTanpaHarga"], \
        "expected provinces with an IKP score but no price data (the 2022 Papua split)"
    assert len(lanskap["komoditas"]) == 8, "lanskap must cover 8 commodities"
    assert lanskap["baris"], "lanskap produced no rows"
    assert muatan_balik["seimbang"]["nRute"] == 36 and \
        muatan_balik["seimbang"]["pasanganBolakBalik"] == 0, \
        "muatan_balik seimbang must show 36 routes and zero round trips"
    assert "default" in muatan_balik, "muatan_balik missing the default posture"
    assert uji_ongkos["keterbatasan"], \
        "uji_ongkos must carry keterbatasan — the caveat that makes ruteBerubah honest"
    assert "tetapDegenerate" in uji_ongkos, "uji_ongkos missing tetapDegenerate"
    assert uji_ongkos["persenBawahJarak"] is not None and \
        uji_ongkos["persenBawahTetap"] is not None, \
        "uji_ongkos missing the flattened persenBawah* keys Task 8 reads"
    assert tindakan["setaraKegiatan"]["kapasitasTahunan"] == 1888
    imbal = [r["imbalHasilPersen"] for r in tindakan["modal"]]
    assert imbal == sorted(imbal, reverse=True), \
        "modal must be sorted by return, descending, not by capital"
    assert len(tindakan["pasar"]) == 34, "tindakan pasar must cover all 34 model provinces"
    print("export_web: OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
