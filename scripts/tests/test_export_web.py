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
        "urgensi": ["Warning", "Info"], "hemat_rp": [-1e8, -4e7],
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
    })
    meta = {
        "postur_tersedia": ["konservatif", "seimbang", "aman_pangan"],
        "plan_meta": {"Beras Medium|seimbang": {
            "status": "ok", "total_ton": 700.0, "total_biaya": 3.75e9,
            "n_rute": 2, "n_sumber": 2, "n_tujuan": 1}},
    }
    res = ew.build_redistribution(flows, meta)
    assert set(res) == {"konservatif", "seimbang", "aman_pangan", "default"}
    assert res["default"] == res["seimbang"]

    beras = res["seimbang"]["beras"]
    assert beras["summary"]["totalRoutes"] == 2
    assert beras["summary"]["totalVolume"] == 700
    r0 = next(r for r in beras["routes"] if r["from"] == "Jawa Timur")
    assert r0["priority"] == "medium" and r0["commodity"] == "beras"
    assert r0["volumeTon"] == 500.0 and r0["dasarTakaran"] == "terukur"
    provs = {p["name"]: p for p in beras["provinces"]}
    assert provs["Jawa Timur"]["status"] == "surplus"
    assert provs["Papua"]["status"] == "deficit" and provs["Papua"]["stock"] == 700
    assert "all" in res["seimbang"]

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
