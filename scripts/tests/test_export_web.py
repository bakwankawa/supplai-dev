import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import re as _re

import pandas as pd
import export_web as ew


def test_slug_basic():
    assert ew.slug("DKI Jakarta") == "dki-jakarta"
    assert ew.slug("Jawa Barat") == "jawa-barat"
    assert ew.slug("D.I. Yogyakarta") == "d-i-yogyakarta"


def test_commodity_map_has_six_kg():
    assert len(ew.COMMODITY_ID) == 6
    assert ew.COMMODITY_ID["Beras Medium"] == ("beras", "Beras Medium", "kg")
    assert all(u == "kg" for _, _, u in ew.COMMODITY_ID.values())


def test_build_commodities_shape():
    out = ew.build_commodities()
    assert len(out) == 6
    ids = {c["id"] for c in out}
    assert "minyak-goreng" in ids and "cabai-rawit" not in ids
    assert all(set(c) == {"id", "name", "unit"} for c in out)


def test_build_regions_shape():
    cent = pd.DataFrame({"provinsi": ["DKI Jakarta", "Jawa Barat"],
                         "lat": [-6.2, -6.9], "lon": [106.8, 107.6]})
    out = ew.build_regions(cent)
    assert out[0] == {"id": "dki-jakarta", "name": "DKI Jakarta",
                      "province": "DKI Jakarta", "lat": -6.2, "lng": 106.8}


def test_build_regional_status_rule():
    cent = pd.DataFrame({"provinsi": ["Aceh", "Bali", "Riau"],
                         "lat": [0, 0, 0], "lon": [0, 0, 0]})
    fc = pd.DataFrame({
        "provinsi": ["Aceh", "Bali", "Riau"],
        "komoditas": ["Beras Medium"] * 3,
        "harga_kini": [15000, 14000, 13000],
        "perubahan_persen": [5.0, -5.0, 0.0],
    })
    out = {r["region"]: r for r in ew.build_regional(fc, cent)}
    assert out["Aceh"]["status"] == "CRITICAL"   # >+3%
    assert out["Bali"]["status"] == "SURPLUS"    # <-3%
    assert out["Riau"]["status"] == "STABLE"
    assert out["Aceh"]["price"] == 15000


def _mini_panel():
    rows = []
    for prov, base in [("Aceh", 15000), ("Bali", 14000)]:
        for i, m in enumerate(pd.date_range("2025-07-01", periods=12, freq="MS")):
            rows.append({"provinsi": prov, "komoditas": "Beras Medium",
                         "bulan": m, "harga": base + i * 100, "n_pasar": 3})
    return pd.DataFrame(rows)


def test_build_heatmap_shape_and_change():
    panel = _mini_panel()
    fc = pd.DataFrame({"provinsi": ["Aceh", "Bali"],
                       "komoditas": ["Beras Medium", "Beras Medium"],
                       "harga_kini": [16100, 15100], "harga_prediksi": [16500, 15000],
                       "perubahan_persen": [2.5, -0.7]})
    hm = ew.build_heatmap(panel, fc, months=12)
    beras = hm["beras"]
    assert beras["summary"]["totalRegions"] == 2
    row = next(r for r in beras["matrix"] if r["region"] == "Aceh")
    assert len(row["data"]) == 12
    assert row["data"][0]["change"] == 0.0
    assert row["data"][-1]["change"] > 0
    assert beras["topCritical"][0]["region"] == "Aceh"


def test_build_alerts_mapping():
    df = pd.DataFrame({
        "provinsi": ["Sulawesi Utara", "Gorontalo"],
        "komoditas": ["Beras Medium", "Beras Medium"],
        "severity": ["Warning", "Info"],
        "perubahan_persen": [5.99, 4.10],
        "persentil_historis": [85.9, 70.1],
        "harga_kini": [15000, 15000], "harga_prediksi": [15899, 15600],
        "confidence": [0.97, 0.9], "model": ["LSTM", "LSTM"],
        "mape_komoditas": [1.62, 1.62], "anomali_terkonfirmasi": [False, False],
        "di_atas_het": [True, True], "alasan": ["naik", "naik"],
    })
    res = ew.build_alerts(df, {"dibuat": "2026-07-20T12:42:56"})
    assert res["summary"]["thisMonth"] == 2
    assert res["summary"]["active"] == 2
    # Neither field was ever measured; both used to be emitted as a flat 0 and
    # rendered as if they were. They must not come back.
    assert "avgResponseTime" not in res["summary"]
    assert "resolved" not in res["summary"]
    a0 = res["alerts"][0]
    assert a0["severity"] == "tinggi"           # Warning -> tinggi
    assert a0["commodity"] == "beras"
    assert a0["confidence"] == 97
    assert round(a0["change"], 2) == 5.99
    assert a0["id"] == "ALT-001"
    assert res["alerts"][1]["severity"] == "sedang"   # Info -> sedang
    d = a0["detail"]
    assert d["hargaKini"] == 15000 and d["hargaPrediksi"] == 15899
    assert d["diAtasHet"] is True and d["anomaliTerkonfirmasi"] is False
    assert d["mapeKomoditas"] == 1.62


def test_build_redistribution():
    flows = pd.DataFrame({
        "komoditas": ["Beras Medium", "Beras Medium"],
        "dari": ["Jawa Timur", "Bali"], "ke": ["Papua", "Papua"],
        "volume_ton": [500.0, 200.0], "jarak_km": [3800.0, 3000.0],
        "biaya_rp": [2.85e9, 9e8], "harga_asal": [14000, 14950],
        "harga_tujuan": [17000, 17000], "prediksi_kenaikan": [3.4, 3.4],
        "urgensi": ["Warning", "Info"], "marjin_harapan_rp": [-1e8, -4e7],
        # Bulan sasaran dan horizon yang mendasarinya (Tasks 12-13) — konstan
        # di seluruh flows, sama seperti supplai/match.py menjaminnya.
        "bulan_prediksi": ["2026-09-01", "2026-09-01"],
        "horizon_bulan": [3, 3],
        # Columns added by the population-sizing work (Tasks 8-9).
        "postur": ["seimbang", "seimbang"],
        "konsumsi_tujuan_ton_bulan": [20000.0, 20000.0],
        "persen_pasar": [2.5, 1.0],
        "epsilon": [0.385, 0.385],
        "epsilon_sumber": ["nasional", "nasional"],
        "volume_ci_bawah": [450.0, 180.0],
        "volume_ci_atas": [550.0, 220.0],
        "dasar_takaran": ["terukur", "terukur"],
        "kecukupan_persen": [12.0, 12.0],
        # Dampak harga (Tasks 12-13): poin persen kenaikan yang ditahan, its
        # interval, dan bagian kenaikan yang tertutup. Second row is NaN, to
        # exercise the "no supporting consumption data -> null, not zero"
        # path through or_none() below.
        "ditahan_pp": [2.0, float("nan")],
        "ditahan_ci_bawah": [1.5, float("nan")],
        "ditahan_ci_atas": [2.5, float("nan")],
        "fraksi_ditahan": [0.5, float("nan")],
    })
    # build_redistribution now requires a plan_meta entry for every
    # commodity-posture pair (Step 6) — fill them all, then override the one
    # combination this test actually exercises.
    plan_meta = {
        f"{wfp}|{postur}": {"status": "tidak perlu intervensi"}
        for wfp in ew.COMMODITY_ID
        for postur in ("konservatif", "seimbang", "aman_pangan")
    }
    plan_meta["Beras Medium|seimbang"] = {
        "status": "ok", "total_ton": 700.0, "total_biaya": 3.75e9,
        "n_rute": 2, "n_sumber": 2, "n_tujuan": 1,
    }
    meta = {
        "postur_tersedia": ["konservatif", "seimbang", "aman_pangan"],
        "plan_meta": plan_meta,
    }
    res = ew.build_redistribution(flows, meta)
    assert set(res) == {"konservatif", "seimbang", "aman_pangan", "default"}
    assert res["default"] == res["seimbang"]

    beras = res["seimbang"]["beras"]
    assert beras["summary"]["totalRoutes"] == 2
    assert beras["summary"]["totalVolume"] == 700
    # Comes from plan_meta's n_sumber/n_tujuan, which have no row-derived
    # fallback — so this is the assertion that actually proves the
    # f"{komoditas}|{postur}" lookup hit. The other summary values happen to
    # equal what the code computes from the rows when the lookup misses.
    assert beras["summary"]["activeRoutes"] == "2 → 1"
    # Bulan sasaran dan horizon (Tasks 12-13): read once from flows and
    # carried through untouched, including into the "all" aggregate below —
    # they are properties of the forecast run, not of one commodity's plan.
    assert beras["summary"]["bulanPrediksi"] == "2026-09-01"
    assert beras["summary"]["horizonBulan"] == 3
    r0 = next(r for r in beras["routes"] if r["from"] == "Jawa Timur")
    assert r0["priority"] == "medium" and r0["commodity"] == "beras"
    assert r0["volumeTon"] == 500.0 and r0["dasarTakaran"] == "terukur"
    # Marjin harapan (Rp, total rute, memakai harga tujuan SETELAH prediksi
    # kenaikan) — carried straight from the pipeline's marjin_harapan_rp.
    assert r0["marjinHarapanRp"] == -100_000_000
    # ditahanPp/ditahanCiBawah/ditahanCiAtas/fraksiDitahan: real numbers for
    # a route whose destination has supporting consumption data.
    assert r0["ditahanPp"] == 2.0
    assert r0["ditahanCiBawah"] == 1.5
    assert r0["ditahanCiAtas"] == 2.5
    assert r0["fraksiDitahan"] == 0.5
    # Second row is NaN in the fixture, meaning no supporting consumption
    # data for its destination — unknown must not read as zero, so it must
    # serialize as None (-> JSON null), never as 0.
    r1 = next(r for r in beras["routes"] if r["from"] == "Bali")
    assert r1["ditahanPp"] is None
    assert r1["ditahanCiBawah"] is None
    assert r1["ditahanCiAtas"] is None
    assert r1["fraksiDitahan"] is None
    provs = {p["name"]: p for p in beras["provinces"]}
    assert provs["Jawa Timur"]["status"] == "surplus"
    assert provs["Papua"]["status"] == "deficit" and provs["Papua"]["stock"] == 700
    assert "all" in res["seimbang"]
    # The "all" aggregate carries the same bulanPrediksi/horizonBulan — they
    # describe the whole forecast run, not any one commodity's slice of it.
    assert res["seimbang"]["all"]["summary"]["bulanPrediksi"] == "2026-09-01"
    assert res["seimbang"]["all"]["summary"]["horizonBulan"] == 3

    # A posture that produced no routes still gets an entry, with empty lists —
    # the UI must be able to say "this posture ships nothing" rather than fall
    # through to another posture's numbers.
    assert res["konservatif"]["beras"]["routes"] == []


def test_build_timeseries_history_then_forecast():
    panel = _mini_panel()   # Aceh + Bali, 12 monthly actuals each
    fpath = pd.DataFrame({
        "provinsi": ["Aceh"] * 3 + ["Bali"] * 3,
        "komoditas": ["Beras Medium"] * 6,
        "bulan": list(pd.date_range("2026-07-01", periods=3, freq="MS")) * 2,
        "h": [1, 2, 3, 1, 2, 3],
        "ensemble": [16200, 16300, 16400, 15200, 15300, 15400],
    })
    ts = ew.build_timeseries(panel, fpath, months_hist=6)
    aceh = ts["beras"]["Aceh"]
    assert len([p for p in aceh if not p["isFuture"]]) == 6      # history capped
    assert sum(p["isFuture"] for p in aceh) == 3                 # 3 forecast
    hist = [p for p in aceh if not p["isFuture"]]
    assert hist[-1]["isToday"] and not hist[0]["isToday"]        # last actual flagged
    assert aceh[-1]["price"] == 16400 and aceh[-1]["isFuture"]
    assert aceh[0]["displayDate"].split()[0] in ew.IND_MONTHS


def test_build_commodity_mape():
    bf = pd.DataFrame({"h": [1, 1], "komoditas": ["Beras Medium", "Bawang Merah"],
                       "actual": [100.0, 100.0], "lstm": [120.0, 80.0],
                       "lgbm": [120.0, 80.0]})
    m = ew.build_commodity_mape(bf)
    assert m["beras"] == 20.0 and m["bawang-merah"] == 20.0


def test_headline_mape_and_exec_values_parser_safe():
    # blend = mean(lstm,lgbm) = [120,220]; ape vs actual [100,200] = 20%,10% -> 15%
    bf = pd.DataFrame({"h": [1, 1, 2], "actual": [100.0, 200.0, 999.0],
                       "lstm": [120.0, 220.0, 0.0], "lgbm": [120.0, 220.0, 0.0]})
    assert abs(ew.headline_mape_h1(bf) - 15.0) < 1e-6   # h=2 row excluded

    A = {"bench_final": bf,
         "forecast": pd.DataFrame({"perubahan_persen": [-2.0, 0.0]}),
         "flows": pd.DataFrame({"x": range(65)}),
         "alerts": pd.DataFrame({"severity": ["Warning", "Info"]}),
         "meta": {"plan_meta": {"Beras Medium": {"total_ton": 800.0}}}}
    ex = ew.build_executive(A)
    vals = [m["value"] for m in ex["topMetrics"]]
    for v in vals:
        assert _re.fullmatch(r"\d+(\.\d+)?[^0-9.-]*", v), f"unsafe value {v!r}"
    assert any("%" in v for v in vals)


def _exec_fixture():
    bf = pd.DataFrame({"h": [1], "komoditas": ["Beras Medium"], "actual": [100.0],
                       "lgbm": [100.0], "lstm": [100.0], "qnt": [100.0]})
    fr = {"bobot": {"Beras Medium": [1 / 3, 1 / 3, 1 / 3]}}
    forecast = pd.DataFrame({"perubahan_persen": [0.0]})
    alerts = pd.DataFrame({"severity": []})
    return {"bench_final": bf, "final_results": fr, "forecast": forecast,
            "alerts": alerts, "flows": pd.DataFrame(), "meta": {}}


def test_executive_never_presents_mape_as_accuracy():
    """100 - MAPE reads as a probability of being right. It is not: MAPE is a
    backtest error. The Prediction page already says "KESALAHAN HISTORIS";
    the Executive Summary must not contradict it."""
    ex = ew.build_executive(_exec_fixture())
    titles = [m["title"] for m in ex["topMetrics"]]
    assert "KESALAHAN HISTORIS (MAPE)" in titles
    assert not any("AKURASI" in t.upper() for t in titles), titles
    kartu = next(m for m in ex["topMetrics"] if m["title"] == "KESALAHAN HISTORIS (MAPE)")
    # The value must be the error itself, not its complement.
    assert float(kartu["value"].rstrip("%")) < 50, kartu["value"]


def test_executive_totals_describe_one_posture_only():
    """flows and plan_meta hold three postures. Summing across them reports the
    balanced plan plus the food-security plan as if both would run — the tile
    read 2,276 t against a balanced plan of 1,026 t."""
    flows = pd.DataFrame({
        "komoditas": ["Beras Medium"] * 2,
        "dari": ["Bali", "Bali"], "ke": ["Papua", "Papua"],
        "volume_ton": [100.0, 300.0], "jarak_km": [3000.0, 3000.0],
        "biaya_rp": [9e8, 9e8], "harga_asal": [14950, 14950],
        "harga_tujuan": [17000, 17000], "prediksi_kenaikan": [3.4, 3.4],
        "urgensi": ["Info", "Info"], "marjin_harapan_rp": [-4e7, -4e7],
        "postur": ["seimbang", "aman_pangan"],
        "konsumsi_tujuan_ton_bulan": [20000.0, 20000.0],
        "persen_pasar": [0.5, 1.5], "epsilon": [0.385, 0.385],
        "epsilon_sumber": ["nasional", "nasional"],
        "volume_ci_bawah": [90.0, 270.0], "volume_ci_atas": [110.0, 330.0],
        "dasar_takaran": ["terukur", "terukur"],
        "kecukupan_persen": [12.0, 12.0],
    })
    meta = {
        "postur_tersedia": ["konservatif", "seimbang", "aman_pangan"],
        "plan_meta": {
            "Beras Medium|seimbang": {"status": "ok", "total_ton": 100.0},
            "Beras Medium|aman_pangan": {"status": "ok", "total_ton": 300.0},
            "Beras Medium|konservatif": {"status": "tidak perlu intervensi"},
        },
    }
    A = dict(_exec_fixture(), flows=flows, meta=meta)
    ex = ew.build_executive(A)
    vol = next(m for m in ex["topMetrics"] if m["title"] == "VOL. REDISTRIBUSI")
    assert vol["value"] == "100", f"summed across postures: {vol['value']}"


def test_redistribution_is_keyed_by_posture():
    import json, subprocess, sys
    subprocess.run([sys.executable, "scripts/export_web.py"], check=True)
    data = json.load(open("src/data/generated/redistribution.json"))
    assert {"konservatif", "seimbang", "aman_pangan", "default"} <= set(data)
    assert data["default"] == data["seimbang"]


def test_redistribution_routes_carry_sizing_fields():
    import json
    data = json.load(open("src/data/generated/redistribution.json"))
    routes = data["default"]["all"]["routes"]
    assert routes, "no routes exported"
    r = routes[0]
    for field in ["volumeTon", "persenPasar", "postur", "epsilon",
                  "dasarTakaran", "kecukupanPersen"]:
        assert field in r, f"missing {field}"
    assert 0 <= r["persenPasar"] <= 100
    assert r["postur"] == "seimbang"


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
    for key in ("hargaAsal", "hargaTujuan", "marjinHarapanRp"):
        assert key in route, f"route missing {key}"
    assert route["hargaTujuan"] > route["hargaAsal"], \
        "the solver ships from cheaper to dearer; this route inverts it"


def test_summary_carries_bulan_prediksi_and_horizon():
    # Tasks 12-13: every summary — per commodity and the "all" aggregate —
    # must be able to say which month it targets and the deadline is built
    # from (jendelaWaktu on the front end reads bulanPrediksi directly).
    out = _redist()
    for postur, per_kom in out.items():
        for cid, resp in per_kom.items():
            assert "bulanPrediksi" in resp["summary"], f"{postur}/{cid}"
            assert "horizonBulan" in resp["summary"], f"{postur}/{cid}"
            assert isinstance(resp["summary"]["horizonBulan"], int)
            # ISO "YYYY-MM-DD", not a pandas Timestamp repr leaking through.
            assert len(resp["summary"]["bulanPrediksi"]) == 10
    # Constant across the whole export — one forecast run, one target month.
    bulan = {resp["summary"]["bulanPrediksi"]
             for per_kom in out.values() for resp in per_kom.values()}
    assert len(bulan) == 1, f"bulanPrediksi is not constant across the export: {bulan}"


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


def test_empty_flows_reaches_plan_meta_error_not_an_iloc_crash():
    # Regression: reading flows.bulan_prediksi.iloc[0] before this KeyError
    # check used to throw an unrelated AttributeError/IndexError on a
    # completely empty flows frame (this fixture has no bulan_prediksi
    # column at all), which masked the file's own deliberate empty-flows
    # defence below. This is the same assertion as
    # test_missing_plan_meta_entry_raises, kept separate and named for the
    # regression so it does not silently start passing for the wrong reason
    # again.
    import pandas as pd, pytest
    flows = pd.DataFrame(columns=["komoditas", "postur"])
    meta = {"plan_meta": {}, "postur_tersedia": ["seimbang"]}
    with pytest.raises(KeyError, match="plan_meta"):
        ew.build_redistribution(flows, meta)


def test_non_unique_bulan_prediksi_raises():
    # supplai/match.py refuses to pick an arbitrary bulan_prediksi when a
    # commodity carries more than one distinct value; build_redistribution
    # must refuse the same way rather than silently take flows.iloc[0].
    import pandas as pd, pytest
    flows = pd.DataFrame({
        "komoditas": ["Beras Medium", "Beras Medium"],
        "postur": ["seimbang", "seimbang"],
        "bulan_prediksi": ["2026-09-01", "2026-10-01"],
        "horizon_bulan": [3, 3],
    })
    meta = {"plan_meta": {}, "postur_tersedia": ["seimbang"]}
    with pytest.raises(ValueError, match="bulan_prediksi"):
        ew.build_redistribution(flows, meta)


def test_non_unique_horizon_bulan_raises():
    import pandas as pd, pytest
    flows = pd.DataFrame({
        "komoditas": ["Beras Medium", "Beras Medium"],
        "postur": ["seimbang", "seimbang"],
        "bulan_prediksi": ["2026-09-01", "2026-09-01"],
        "horizon_bulan": [3, 6],
    })
    meta = {"plan_meta": {}, "postur_tersedia": ["seimbang"]}
    with pytest.raises(ValueError, match="horizon_bulan"):
        ew.build_redistribution(flows, meta)


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
