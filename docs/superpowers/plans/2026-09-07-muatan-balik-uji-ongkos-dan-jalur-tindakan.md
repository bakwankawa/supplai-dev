# Muatan Balik, Uji Ongkos & Jalur Tindakan — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membuat rencana menyebutkan kaki pulang yang kosong, menguji apakah jarak benar-benar menyetir rekomendasinya, dan memberi pembaca cukup untuk bertindak — instrumen mana, pasar mana, modal berapa.

**Architecture:** `supplai/muatan_balik.py` memasangkan pengiriman yang bisa dirantai lewat simpul yang menerima sekaligus mengirim; ia memasangkan **pengiriman**, bukan kapal, karena kita tidak punya model kendaraan. `bench_ongkos.py` menjalankan LP di bawah tiga struktur ongkos dan melaporkan seberapa jauh rencananya bergeser. `supplai/tindakan.py` mengubah tonase menjadi jumlah kegiatan instrumen, memeriksa kapasitasnya, menamai pasar, dan menghitung modal beserta imbal hasilnya.

**Tech Stack:** Python 3.11 (`/opt/conda/bin/python`), pandas, scipy.optimize.linprog, pytest · Next.js 16, TypeScript, vitest, jsPDF

**Spec:** `docs/superpowers/specs/2026-09-07-feedback-mentor-7sept-design.md` — Bagian 3 dan Bagian 5.2–5.4.

## Global Constraints

- **Repo pipeline** di `/home/jupyter/kawa-temp/hackathon_phase2/`; **repo FE** di `.../supplai-dev/`. `scripts/export_web.py` ada di repo FE.
- Interpreter lewat jalur langsung: `/opt/conda/bin/python`.
- **Tidak ada model kendaraan.** Rencana kita himpunan pengiriman, bukan himpunan kapal. Modul muatan balik memasangkan pengiriman dan melaporkan ton-km yang tak lagi butuh reposisi kosong — ia tidak boleh mengaku tahu kapal mana pulang kosong.
- **Asumsi ditulis sebagai parameter, bukan disembunyikan sebagai angka.** Berapa bagian kaki kosong yang ditagihkan pengangkut tidak kita ketahui; ia menjadi argumen berdefault yang dinyatakan, bukan konstanta diam.
- **Model ongkos TIDAK dibongkar.** `COST_PER_TON_KM = 2500` di `supplai/match.py` tetap menjadi perilaku bawaan. Eksperimen menambah parameter; ia tidak mengganti bawaannya.
- **Angka Indonesia**: titik ribuan, koma desimal.
- **PDF permukaan utama.** Sebuah task yang temuannya baru ada di layar belum selesai.
- Baseline: **106 tes pipeline**, **49 tes FE**, **26 tes `supplai-dev/scripts/tests/` dengan 4 gagal lama** (`build_heatmap`, `build_commodity_mape`, `headline_mape_h1`, `ledger_loads`) — jangan sentuh keempatnya.
- **Rencana ini mengandaikan Rencana 2 sudah dieksekusi** (`supplai/tingkatan.py` dan `supplai/lanskap.py` ada). Bila belum, kerjakan Rencana 2 lebih dulu — Task 8 memakai kelompok IKP untuk melaporkan siapa yang diuntungkan pergeseran ongkos.

---

### Task 1: `supplai/muatan_balik.py` — diagnosis dan perantaian

**Files:**
- Create: `supplai/muatan_balik.py`
- Test: `tests/test_muatan_balik.py`

**Interfaces:**
- Consumes: `artifacts/flows.parquet` (kolom `dari`, `ke`, `volume_ton`, `jarak_km`, `postur`)
- Produces:
  - `diagnosa(flows, postur) -> dict` dengan kunci `n_rute`, `total_ton`, `ton_km`, `pasangan_bolak_balik`, `simpul`
  - `rantai(flows, postur) -> pd.DataFrame` berkolom `hub`, `dari`, `ke`, `komoditas_masuk`, `komoditas_keluar`, `ton_dirantai`
  - `ringkas(flows, postur, bagian_kaki_kosong_ditagih=1.0) -> dict` dengan kunci `ton_dirantai`, `persen_dirantai`, `ton_km_kosong_dihindari`

- [ ] **Step 1: Tulis tes yang gagal**

Buat `tests/test_muatan_balik.py`:

```python
import pandas as pd
import pytest

from supplai import muatan_balik

FLOWS = pd.read_parquet("artifacts/flows.parquet")


def test_the_plan_has_no_round_trips_at_all():
    """Temuan pembuka, dan ia tentang diri kita sendiri: alat yang dibuat untuk
    menekan biaya logistik merencanakan tingkat kekosongan balik 100%."""
    d = muatan_balik.diagnosa(FLOWS, "seimbang")
    assert d["pasangan_bolak_balik"] == 0
    assert d["n_rute"] == 36


def test_six_provinces_both_receive_and_send():
    d = muatan_balik.diagnosa(FLOWS, "seimbang")
    assert set(d["simpul"]) == {
        "Bali", "Bengkulu", "Gorontalo",
        "Kalimantan Barat", "Kepulauan Riau", "Sulawesi Tenggara",
    }


def test_chaining_never_exceeds_the_smaller_side_of_a_hub():
    """Yang bisa dirantai di sebuah simpul dibatasi sisi terkecilnya. Melampauinya
    berarti mengaku memindahkan barang yang tidak ada di sana."""
    r = muatan_balik.rantai(FLOWS, "seimbang")
    s = FLOWS[FLOWS.postur == "seimbang"]
    for hub, g in r.groupby("hub"):
        masuk = s[s["ke"] == hub].volume_ton.sum()
        keluar = s[s["dari"] == hub].volume_ton.sum()
        assert g.ton_dirantai.sum() <= min(masuk, keluar) + 1e-6


def test_chainable_share_is_about_thirteen_percent():
    r = muatan_balik.ringkas(FLOWS, "seimbang")
    assert 12.0 <= r["persen_dirantai"] <= 14.0
    assert 130.0 <= r["ton_dirantai"] <= 135.0


def test_the_billed_empty_leg_share_is_a_parameter_not_a_hidden_constant():
    """Berapa bagian kaki kosong yang benar-benar ditagihkan pengangkut tidak kita
    ketahui. Ia argumen yang dinyatakan, dan mengubahnya harus mengubah hasilnya —
    kalau tidak, angkanya bukan turunan dari asumsi itu."""
    penuh = muatan_balik.ringkas(FLOWS, "seimbang", bagian_kaki_kosong_ditagih=1.0)
    separuh = muatan_balik.ringkas(FLOWS, "seimbang", bagian_kaki_kosong_ditagih=0.5)
    assert separuh["ton_km_kosong_dihindari"] == pytest.approx(
        penuh["ton_km_kosong_dihindari"] / 2)


def test_a_posture_with_no_routes_reports_zero_rather_than_raising():
    d = muatan_balik.diagnosa(FLOWS, "konservatif")
    assert d["n_rute"] == 0
    assert d["pasangan_bolak_balik"] == 0
    r = muatan_balik.ringkas(FLOWS, "konservatif")
    assert r["ton_dirantai"] == 0.0
    assert r["persen_dirantai"] == 0.0
```

- [ ] **Step 2: Jalankan tes untuk memastikan gagal**

Run: `/opt/conda/bin/python -m pytest tests/test_muatan_balik.py -v`
Expected: 6 FAIL dengan `ModuleNotFoundError: No module named 'supplai.muatan_balik'`

- [ ] **Step 3: Tulis implementasi**

Buat `supplai/muatan_balik.py`. Docstring modulnya harus menyatakan batas berikut, karena itu batas yang paling mudah dilanggar tanpa sadar:

```python
"""Pengiriman mana yang bisa berbagi kaki perjalanan.

BATASNYA: kita tidak punya model kendaraan. Rencana ini himpunan pengiriman,
bukan himpunan kapal, sehingga modul ini memasangkan PENGIRIMAN dan melaporkan
ton-km yang tak lagi memerlukan reposisi kosong. Ia tidak mengaku tahu kapal
mana pulang kosong, dan tidak boleh menulis kalimat yang terbaca begitu.

Struktur yang benar-benar ada di rencana kita bukan pulang-pergi melainkan
RANTAI: nol pasangan bolak-balik, tetapi enam provinsi menerima sekaligus
mengirim. Itu justru lebih setia pada kenyataan tol laut, yang berjalan dalam
trayek melingkar dan kembali ke pelabuhan pangkal, bukan bolak-balik titik ke
titik.

Angkanya rendah — sekitar 13% — dan alasannya harus ikut disebutkan di mana pun
ia tampil: ia dihitung HANYA atas enam komoditas yang kita modelkan. Agregator
muatan sungguhan juga melihat hasil bumi lokal. Jadi 13% itu lantai, bukan
langit-langit.
"""
```

Implementasinya: `diagnosa` menghitung rute, ton, ton-km, pasangan bolak-balik, dan simpul yang menerima sekaligus mengirim. `rantai` menghasilkan satu baris per pasangan masuk-keluar di tiap simpul, dengan `ton_dirantai` dibatasi sisi terkecil simpulnya. `ringkas` menjumlahkannya dan mengalikan ton-km yang dihindari dengan `bagian_kaki_kosong_ditagih`.

Postur tanpa rute mengembalikan nol, bukan melempar — `konservatif` memang tak berrute dan itu keadaan sah, bukan kesalahan.

- [ ] **Step 4: Jalankan tes**

Run: `/opt/conda/bin/python -m pytest tests/ -q`
Expected: 112 passed

- [ ] **Step 5: Commit**

```bash
git add supplai/muatan_balik.py tests/test_muatan_balik.py
git commit -m "feat: diagnosis kekosongan balik dan perantaian pengiriman

Nol pasangan bolak-balik di seluruh rencana: kalau tiap rute dijalankan sebagai
perjalanan khusus, seluruh 897.063 ton-km pulang kosong. Yang ada bukan
pulang-pergi melainkan rantai lewat enam simpul yang menerima sekaligus
mengirim -- lebih setia pada trayek tol laut yang berjalan melingkar.

Memasangkan pengiriman, bukan kapal: kita tidak punya model kendaraan, dan
bagian kaki kosong yang ditagihkan pengangkut adalah parameter yang dinyatakan,
bukan konstanta diam."
```

---

### Task 2: Buku besar mencatat perantaian dan batasnya

**Files:**
- Modify: `supplai/buku_besar.py`
- Test: `tests/test_buku_besar.py`

- [ ] **Step 1: Tulis tes yang gagal**

```python
def test_ledger_records_the_chaining_assumption():
    entri = {e["input"]: e for e in bangun_buku_besar(Kebutuhan())}
    e = entri["Bagian kaki kosong yang ditagihkan"]
    assert e["status"] == "diasumsikan"
    assert "kendaraan" in e["sumber"].lower()
```

- [ ] **Step 2: Jalankan untuk memastikan gagal**

Run: `/opt/conda/bin/python -m pytest tests/test_buku_besar.py -k chaining -v`
Expected: FAIL dengan `KeyError`

- [ ] **Step 3: Tulis implementasi**

Tambahkan entri di `supplai/buku_besar.py`:

```python
        {
            "input": "Bagian kaki kosong yang ditagihkan",
            "nilai": "1,0 (seluruh kaki pulang dianggap ditagihkan)",
            "sumber": "Angka yang kami pilih, bukan yang kami ukur. Kami tidak "
                      "punya model kendaraan maupun tarif pengangkut, sehingga "
                      "berapa bagian perjalanan pulang yang benar-benar masuk "
                      "tagihan tidak diketahui. Ia parameter di "
                      "supplai/muatan_balik.py, dan penghematan yang dilaporkan "
                      "berbanding lurus dengannya.",
            "tahun": "—",
            "status": "diasumsikan",
        },
```

- [ ] **Step 4: Bangun ulang dan jalankan tes**

Run: `/opt/conda/bin/python rebuild_plan.py && /opt/conda/bin/python -m pytest tests/ -q`
Expected: 113 passed

- [ ] **Step 5: Commit**

```bash
git add supplai/buku_besar.py tests/test_buku_besar.py
git commit -m "docs: buku besar mencatat asumsi kaki kosong yang ditagihkan"
```

---

### Task 3: `match.py` menerima struktur ongkos sebagai parameter

**Files:**
- Modify: `supplai/match.py`
- Test: `tests/test_match_sizing.py`

**Interfaces:**
- Produces: `build_plan(..., struktur_ongkos: str = "jarak", ongkos_tetap: float = 0.0)` dengan `struktur_ongkos` bernilai `"jarak"`, `"tetap"`, atau `"tetap_plus_jarak"`

- [ ] **Step 1: Tulis tes yang gagal**

```python
def test_default_cost_structure_leaves_the_plan_byte_identical():
    """Eksperimen ini menambah parameter; ia tidak mengganti perilaku bawaan.
    Setiap angka yang sudah terbit bergantung pada itu."""
    import pandas as pd
    from supplai.match import build_plan
    fc = pd.read_parquet("artifacts/forecast.parquet")
    dist = pd.read_parquet("artifacts/distances.parquet")
    th = _thresholds()          # pembantu yang sudah ada di berkas tes ini
    k = _kebutuhan()            # pembantu yang sudah ada di berkas tes ini
    a = build_plan(fc, dist, "Beras Medium", k, thresholds=th)
    b = build_plan(fc, dist, "Beras Medium", k, thresholds=th,
                   struktur_ongkos="jarak")
    pd.testing.assert_frame_equal(a["flows"], b["flows"])


def test_flat_cost_structure_changes_which_sources_are_chosen():
    """Kalau struktur ongkos yang datar menghasilkan rencana yang sama persis,
    eksperimennya tidak menguji apa pun."""
    import pandas as pd
    from supplai.match import build_plan
    fc = pd.read_parquet("artifacts/forecast.parquet")
    dist = pd.read_parquet("artifacts/distances.parquet")
    th, k = _thresholds(), _kebutuhan()
    a = build_plan(fc, dist, "Telur Ayam", k, thresholds=th)
    b = build_plan(fc, dist, "Telur Ayam", k, thresholds=th,
                   struktur_ongkos="tetap", ongkos_tetap=1_000_000.0)
    assert set(zip(a["flows"]["dari"], a["flows"]["ke"])) != \
           set(zip(b["flows"]["dari"], b["flows"]["ke"]))


def test_unknown_cost_structure_raises_rather_than_falling_back():
    import pandas as pd
    from supplai.match import build_plan
    fc = pd.read_parquet("artifacts/forecast.parquet")
    dist = pd.read_parquet("artifacts/distances.parquet")
    with pytest.raises(ValueError, match="struktur_ongkos"):
        build_plan(fc, dist, "Beras Medium", _kebutuhan(),
                   thresholds=_thresholds(), struktur_ongkos="ajaib")
```

Periksa dulu nama pembantu yang sebenarnya ada di `tests/test_match_sizing.py` dengan `grep -n "^def _\|^K = \|thresholds" tests/test_match_sizing.py`, dan pakai nama yang ada. Kalau pembantu itu belum ada, buat satu di berkas tes itu — jangan membangun `Kebutuhan()` di dalam tiap tes.

- [ ] **Step 2: Jalankan untuk memastikan gagal**

Run: `/opt/conda/bin/python -m pytest tests/test_match_sizing.py -k cost_structure -v`
Expected: 3 FAIL dengan `TypeError: build_plan() got an unexpected keyword argument`

- [ ] **Step 3: Tulis implementasi**

Di `supplai/match.py`, tambahkan dua parameter pada `build_plan` dan ganti baris yang menyusun vektor biaya. Baris sekarang:

```python
    c = (km * COST_PER_TON_KM).flatten()
```

menjadi:

```python
    # Struktur ongkos dapat diganti UNTUK EKSPERIMEN. Bawaannya tetap "jarak"
    # dan menghasilkan vektor yang identik dengan sebelumnya; setiap angka yang
    # sudah terbit bergantung pada itu, dan tes menjaganya.
    if struktur_ongkos == "jarak":
        c = (km * COST_PER_TON_KM).flatten()
    elif struktur_ongkos == "tetap":
        c = np.full(km.size, float(ongkos_tetap))
    elif struktur_ongkos == "tetap_plus_jarak":
        c = (km * COST_PER_TON_KM + float(ongkos_tetap)).flatten()
    else:
        raise ValueError(
            f"struktur_ongkos={struktur_ongkos!r} tidak dikenal; pilih "
            f"'jarak', 'tetap', atau 'tetap_plus_jarak'. Tidak ada bawaan "
            f"diam-diam: struktur ongkos menentukan rute mana yang dipilih."
        )
```

- [ ] **Step 4: Jalankan tes**

Run: `/opt/conda/bin/python -m pytest tests/ -q`
Expected: 116 passed

- [ ] **Step 5: Commit**

```bash
git add supplai/match.py tests/test_match_sizing.py
git commit -m "feat: struktur ongkos LP dapat diganti untuk eksperimen

Bawaannya tetap jarak dan menghasilkan rencana yang identik -- diuji dengan
assert_frame_equal, karena setiap angka yang sudah terbit bergantung padanya.
Struktur tak dikenal melempar, tidak mundur diam-diam: ia menentukan rute mana
yang dipilih."
```

---

### Task 4: `bench_ongkos.py` — menguji tesis "jarak bukan masalah"

**Files:**
- Create: `bench_ongkos.py`
- Test: `tests/test_uji_ongkos.py`

**Interfaces:**
- Consumes: `build_plan(..., struktur_ongkos=..., ongkos_tetap=...)` dari Task 3; `supplai.tingkatan` dari Rencana 2
- Produces: `artifacts/uji_ongkos.json` dengan kunci `struktur`, tiap struktur memuat `total_ton`, `n_rute`, `rute`, `ton_ke_sepertiga_bawah`, `persen_ke_sepertiga_bawah`, dan `ongkos_tetap_terkalibrasi`

- [ ] **Step 1: Tulis tes yang gagal**

```python
import json
from pathlib import Path

ART = Path("artifacts")


def test_the_experiment_calibrates_the_flat_cost_to_match_total_spend():
    """Tanpa kalibrasi, perbandingannya mencampur dua hal: bentuk struktur ongkos
    dan tinggi tarifnya. Yang ingin kita ketahui hanya yang pertama."""
    u = json.loads((ART / "uji_ongkos.json").read_text())
    a = u["struktur"]["jarak"]["total_ongkos"]
    b = u["struktur"]["tetap"]["total_ongkos"]
    assert abs(a - b) / a < 0.02


def test_the_experiment_reports_who_gains_and_who_loses():
    u = json.loads((ART / "uji_ongkos.json").read_text())
    for s in ("jarak", "tetap", "tetap_plus_jarak"):
        assert "persen_ke_sepertiga_bawah" in u["struktur"][s]


def test_the_experiment_states_how_far_the_plan_moved():
    """Jawabannya boleh 'hampir tidak bergeser'. Itu temuan yang bisa dilaporkan,
    bukan kegagalan eksperimen."""
    u = json.loads((ART / "uji_ongkos.json").read_text())
    assert "rute_berubah" in u
    assert 0 <= u["rute_berubah"] <= u["struktur"]["jarak"]["n_rute"]
```

- [ ] **Step 2: Jalankan untuk memastikan gagal**

Run: `/opt/conda/bin/python -m pytest tests/test_uji_ongkos.py -v`
Expected: 3 FAIL dengan `FileNotFoundError: artifacts/uji_ongkos.json`

- [ ] **Step 3: Tulis skripnya**

Buat `bench_ongkos.py` mengikuti bentuk `bench_kabupaten.py` — baca berkas itu lebih dulu dan tiru cara ia memuat artefak, mencatat kemajuan lewat `log()`, dan menulis JSON di akhir dengan `default=float`.

Alurnya: untuk tiap struktur, jalankan `build_plan` atas keenam komoditas pada postur `seimbang`, gabungkan flows-nya, lalu catat total ton, jumlah rute, himpunan pasangan asal-tujuan, total ongkos, serta tonase dan persen yang sampai ke sepertiga terbawah IKP (lewat `supplai.tingkatan.muat()`).

**Kalibrasi terlebih dulu.** Jalankan struktur `jarak` lebih dahulu, ambil total ongkosnya, lalu tetapkan `ongkos_tetap = total_ongkos_jarak / jumlah_rute_jarak` sehingga struktur `tetap` membelanjakan kira-kira sama. Simpan nilai itu di JSON sebagai `ongkos_tetap_terkalibrasi` supaya pembacanya tahu perbandingannya adil.

`rute_berubah` adalah ukuran simetris antara himpunan pasangan `jarak` dan `tetap`.

- [ ] **Step 4: Jalankan dan periksa**

```bash
cd /home/jupyter/kawa-temp/hackathon_phase2
/opt/conda/bin/python bench_ongkos.py
/opt/conda/bin/python -m pytest tests/ -q
```
Expected: 119 passed

Laporkan angka `rute_berubah` yang benar-benar kamu dapat, dan apakah persen ke sepertiga terbawah naik atau turun. **Jangan menyesuaikan apa pun supaya hasilnya terlihat lebih menarik** — jawaban "rencananya hampir tidak bergeser" adalah temuan yang sah dan justru bisa dilaporkan ke mentor.

- [ ] **Step 5: Commit**

```bash
git add bench_ongkos.py tests/test_uji_ongkos.py
git commit -m "feat: uji apakah jarak benar-benar menyetir rencana

Tiga struktur ongkos, dengan biaya tetap dikalibrasi agar total belanjanya sama
-- tanpa itu perbandingannya mencampur bentuk struktur dengan tinggi tarif.
Melaporkan berapa rute bergeser dan siapa yang diuntungkan, termasuk porsi ke
sepertiga terbawah IKP."
```

---

### Task 5: `supplai/tindakan.py` — instrumen, kapasitas, pasar, modal

**Files:**
- Create: `supplai/tindakan.py`
- Test: `tests/test_tindakan.py`

**Interfaces:**
- Consumes: `GPM_RP_PER_KEGIATAN` dari `supplai/kebutuhan.py`; `data/wfp_markets_idn.csv`
- Produces:
  - `setara_kegiatan(flows, postur) -> dict` dengan `ton`, `nilai_rp`, `kegiatan`, `kapasitas_tahunan`, `persen_kapasitas`
  - `pasar_provinsi(provinsi, data_dir="data") -> list[dict]` berisi `nama`, `kabupaten`
  - `modal_imbal_hasil(flows, postur) -> pd.DataFrame` berindeks `dari`, berkolom `ton`, `modal_rp`, `marjin_rp`, `imbal_hasil_persen`

- [ ] **Step 1: Tulis tes yang gagal**

```python
import pandas as pd
import pytest

from supplai import tindakan

FLOWS = pd.read_parquet("artifacts/flows.parquet")


def test_instrument_conversion_follows_the_existing_kecukupan_convention():
    """kecukupan() mengubah anggaran per kegiatan menjadi tonase lewat harga
    lokal. Kebalikannya memakai konvensi yang sama, bukan konvensi kedua."""
    s = tindakan.setara_kegiatan(FLOWS, "seimbang")
    assert 1000 <= s["kegiatan"] <= 1800
    assert 30e9 <= s["nilai_rp"] <= 45e9


def test_the_plan_is_reported_against_the_instrument_capacity():
    """Temuan yang lebih penting daripada konversinya sendiri: rencana satu bulan
    setara sebagian besar program GPM nasional setahun penuh."""
    s = tindakan.setara_kegiatan(FLOWS, "seimbang")
    assert s["kapasitas_tahunan"] == 1888
    assert 60 <= s["persen_kapasitas"] <= 90


def test_markets_are_named_and_the_national_average_row_is_not_one():
    p = tindakan.pasar_provinsi("Aceh")
    assert len(p) > 0
    assert all(x["nama"] != "National Average" for x in p)
    assert all(x["kabupaten"] for x in p)


def test_an_unknown_province_has_no_markets_rather_than_all_of_them():
    assert tindakan.pasar_provinsi("Wakanda") == []


def test_return_is_margin_over_capital_not_over_revenue():
    m = tindakan.modal_imbal_hasil(FLOWS, "seimbang")
    r = m.loc["Kepulauan Riau"]
    assert r["imbal_hasil_persen"] == pytest.approx(
        r["marjin_rp"] / r["modal_rp"] * 100, rel=1e-6)


def test_a_route_that_locks_capital_for_almost_nothing_is_visible():
    """Bengkulu mengunci modal miliaran untuk imbal hasil di bawah satu persen.
    Laporan yang menyajikannya setara dengan rute lain menyesatkan pembacanya."""
    m = tindakan.modal_imbal_hasil(FLOWS, "seimbang")
    assert m.loc["Bengkulu", "imbal_hasil_persen"] < 1.0
    assert m.loc["Kepulauan Riau", "imbal_hasil_persen"] > 20.0


def test_zero_capital_does_not_produce_infinite_return():
    m = tindakan.modal_imbal_hasil(FLOWS, "konservatif")
    assert m.empty or m.imbal_hasil_persen.notna().all()
```

- [ ] **Step 2: Jalankan untuk memastikan gagal**

Run: `/opt/conda/bin/python -m pytest tests/test_tindakan.py -v`
Expected: 7 FAIL dengan `ModuleNotFoundError`

- [ ] **Step 3: Tulis implementasi**

Buat `supplai/tindakan.py`. Docstringnya harus membawa peringatan berikut karena tiap angkanya mudah disalahbacakan:

```python
"""Apa yang bisa dilakukan pembaca setelah membaca rencana ini.

Tiga hal, dan tiap angkanya membawa batasnya sendiri.

setara_kegiatan() mengubah tonase menjadi jumlah kegiatan Gerakan Pangan Murah
memakai konvensi yang SAMA dengan kecukupan() di kebutuhan.py — anggaran per
kegiatan dibagi harga lokal. Angkanya INDIKATIF dan mewarisi tiga peringatan
yang sudah melekat pada Kecukupan GPM: GPM satu instrumen di antara beberapa,
anggaran per kegiatan adalah rencana 2027 atas realisasi 2026, dan GPM menjual
beberapa komoditas sekaligus.

Yang lebih penting muncul begitu angka itu dihitung: rencana satu bulan ini
setara sebagian besar program GPM nasional SETAHUN PENUH. Laporan harus
mengatakan bahwa GPM saja tidak akan sanggup, alih-alih merekomendasikan volume
di luar kapasitas instrumen yang kita sendiri jadikan pembanding.

pasar_provinsi() menamai pasar tempat harga DIAMATI. Itu bukan jaminan barang
tersedia di sana; kita tidak punya data pasokan tingkat pasar.

modal_imbal_hasil() menghitung imbal hasil SATU TRANSAKSI, bukan setahun, dan
ia bersandar pada kenaikan harga yang diprediksi benar-benar terjadi.
"""
```

`KAPASITAS_KEGIATAN_TAHUNAN = 1888` dengan komentar yang menyebut sumbernya: RKA Bapanas 2027 sebagaimana dipaparkan ke Komisi IV DPR RI, 1 September 2026 — sumber yang sama dengan `GPM_RP_PER_KEGIATAN`.

`pasar_provinsi` membaca `data/wfp_markets_idn.csv`, menyaring baris `National Average`, mencocokkan `admin1` dengan nama provinsi (perhatikan: berkas itu HURUF BESAR, nama provinsi kita Judul), dan mengembalikan nama pasar beserta kabupatennya.

`modal_imbal_hasil` memakai `modal_rp = volume_ton * 1000 * harga_asal` dan `marjin_rp = marjin_harapan_rp`. Modal nol tidak boleh menghasilkan tak hingga.

- [ ] **Step 4: Jalankan tes**

Run: `/opt/conda/bin/python -m pytest tests/ -q`
Expected: 126 passed

- [ ] **Step 5: Commit**

```bash
git add supplai/tindakan.py tests/test_tindakan.py
git commit -m "feat: instrumen, kapasitasnya, pasar bernama, modal dan imbal hasil

Konversi kegiatan memakai konvensi kecukupan() yang sudah ada, bukan konvensi
kedua. Yang lebih penting daripada konversinya: rencana satu bulan setara
sebagian besar program GPM nasional setahun, jadi laporan harus mengatakan GPM
saja tidak akan sanggup.

Pasar yang dinamai adalah tempat harga diamati, bukan jaminan barang ada.
Imbal hasil adalah satu transaksi, bukan setahun."
```

---

### Task 6: `export_web.py` meneruskan muatan balik, uji ongkos, dan jalur tindakan

**Files:**
- Modify: `supplai-dev/scripts/export_web.py`
- Modify: `supplai-dev/src/lib/types.ts`
- Test: `supplai-dev/scripts/tests/test_export_web.py`

**Interfaces:**
- Produces: `src/data/generated/muatan_balik.json`, `uji_ongkos.json`, `tindakan.json`; tipe `RantaiMuatan`, `UjiOngkos`, `SetaraKegiatan`, `PasarProvinsi`, `ModalRute` di `types.ts`

- [ ] **Step 1: Tulis tes yang gagal**

```python
def test_muatan_balik_export_states_zero_round_trips():
    out = ew.build_muatan_balik()
    assert out["seimbang"]["pasanganBolakBalik"] == 0
    assert out["seimbang"]["nRute"] == 36


def test_tindakan_export_carries_capacity_not_just_the_conversion():
    out = ew.build_tindakan()
    assert out["setaraKegiatan"]["kapasitasTahunan"] == 1888
    assert out["setaraKegiatan"]["persenKapasitas"] > 50


def test_tindakan_export_ranks_routes_by_return_not_by_capital():
    out = ew.build_tindakan()
    imbal = [r["imbalHasilPersen"] for r in out["modal"]]
    assert imbal == sorted(imbal, reverse=True)
```

- [ ] **Step 2: Jalankan untuk memastikan gagal**

Run: `/opt/conda/bin/python -m pytest scripts/tests/test_export_web.py -k "muatan or tindakan" -v`
Expected: 3 FAIL dengan `ImportError`

- [ ] **Step 3: Tulis implementasi**

Tambahkan `build_muatan_balik`, `build_uji_ongkos`, dan `build_tindakan` di `scripts/export_web.py`, mengikuti bentuk `build_*` yang sudah ada. Urutkan `modal` menurut imbal hasil menurun, bukan menurut modal — pembaca yang memutuskan memindahkan barang ingin tahu rute mana yang paling menghasilkan per rupiah yang dikunci.

Tambahkan tipenya di `src/lib/types.ts`, masing-masing dengan komentar dokumen yang menyebut batasnya: pasar adalah tempat harga diamati; imbal hasil adalah satu transaksi; kegiatan GPM bersifat indikatif.

- [ ] **Step 4: Jalankan ekspor dan tes**

```bash
cd /home/jupyter/kawa-temp/hackathon_phase2/supplai-dev
/opt/conda/bin/python scripts/export_web.py
/opt/conda/bin/python -m pytest scripts/tests/ -q
npx tsc --noEmit && npx vitest run
```
Expected: scripts/tests 29 lulus 4 gagal lama; tsc bersih; vitest 49 lulus

- [ ] **Step 5: Commit**

```bash
git add scripts/export_web.py scripts/tests/test_export_web.py src/lib/types.ts src/data/generated/
git commit -m "feat: teruskan muatan balik, uji ongkos, dan jalur tindakan ke FE

Modal diurutkan menurut imbal hasil, bukan menurut modal: pembaca yang
memutuskan memindahkan barang ingin tahu mana yang paling menghasilkan per
rupiah yang dikunci."
```

---

### Task 7: Kerangka pedagang — muatan balik, pasar, modal

**Files:**
- Modify: `supplai-dev/src/lib/redistribusi/teks.ts`
- Modify: `supplai-dev/src/lib/redistribusi/report.ts`
- Test: `supplai-dev/src/lib/redistribusi/teks.test.ts`

**Interfaces:**
- Produces: `teksMuatanBalik(d)`, `teksPasar(pasar, provinsi)`, `teksModal(modal)` — semuanya `string[]`

- [ ] **Step 1: Tulis tes yang gagal**

```typescript
it("menyatakan kekosongan balik sebagai temuan tentang rencana kita sendiri", () => {
  const teks = teksMuatanBalik({ nRute: 36, tonKm: 897063, pasanganBolakBalik: 0,
                                 tonDirantai: 132.2, persenDirantai: 12.9 }).join(" ");
  expect(teks).toMatch(/nol pasangan|tidak ada pasangan/i);
  expect(teks).toContain("897.063");
});

it("menyebut mengapa angka perantaian rendah, bukan hanya angkanya", () => {
  // 12,9% dihitung hanya atas enam komoditas yang kita modelkan. Tanpa kalimat
  // itu, angkanya terbaca sebagai langit-langit padahal ia lantai.
  const teks = teksMuatanBalik({ nRute: 36, tonKm: 897063, pasanganBolakBalik: 0,
                                 tonDirantai: 132.2, persenDirantai: 12.9 }).join(" ");
  expect(teks).toMatch(/enam komoditas/);
});

it("tidak mengaku tahu kapal mana yang pulang kosong", () => {
  const teks = teksMuatanBalik({ nRute: 36, tonKm: 897063, pasanganBolakBalik: 0,
                                 tonDirantai: 132.2, persenDirantai: 12.9 }).join(" ");
  expect(teks.toLowerCase()).not.toMatch(/\bkapal (ini|itu|tersebut)\b/);
});

it("menyebut pasar sebagai tempat harga diamati, bukan jaminan barang ada", () => {
  const teks = teksPasar([{ nama: "Pasar Lapang", kabupaten: "Aceh Barat" }], "Aceh").join(" ");
  expect(teks).toContain("Pasar Lapang");
  expect(teks).toMatch(/diamati|pengamatan/);
  expect(teks).not.toMatch(/tersedia di sana|dijamin/);
});

it("menyatakan imbal hasil sebagai satu transaksi, bukan setahun", () => {
  const teks = teksModal([{ dari: "Bengkulu", modalRp: 3.22e9, marjinRp: 6e6, imbalHasilPersen: 0.2 }]).join(" ");
  expect(teks).toMatch(/satu transaksi|sekali jalan/);
  expect(teks).not.toMatch(/per tahun|tahunan/);
});
```

- [ ] **Step 2: Jalankan untuk memastikan gagal**

Run: `npx vitest run src/lib/redistribusi/teks.test.ts`
Expected: 5 FAIL

- [ ] **Step 3: Tulis implementasi**

Tambahkan ketiganya di `teks.ts`, lalu panggil dari kerangka **pedagang** di `report.ts` sebagai tiga bagian bernomor baru, menggeser penomoran sesudahnya. Kerangka pedagang tumbuh dari 3 bagian menjadi 6 — dan itu memang niatnya: spec mencatat kerangka itu jauh lebih tipis daripada kerangka pemerintah padahal pedagang justru pihak yang mentor sebut akan mengisi kekurangan subsidi.

`teksModal` harus menandai rute di bawah ambang yang dinyatakan sebagai tidak layak diambil. Ambangnya ditulis sebagai konstanta bernama di `format.ts` atau di `teks.ts`, bukan angka telanjang di tengah kalimat, dan disebut di buku besar sebagai angka yang kita pilih.

- [ ] **Step 4: Jalankan tes dan bangun**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: tsc bersih, 54 lulus, build sukses

- [ ] **Step 5: Commit**

```bash
git add src/lib/redistribusi/teks.ts src/lib/redistribusi/report.ts src/lib/redistribusi/teks.test.ts
git commit -m "feat: kerangka pedagang membawa muatan balik, pasar, dan modal

Tumbuh dari tiga bagian menjadi enam. Pedagang adalah pihak yang mentor sebut
akan mengisi kekurangan subsidi, dan kerangkanya selama ini paling tipis."
```

---

### Task 8: Kerangka pemerintah — kapasitas instrumen dan hasil uji ongkos

**Files:**
- Modify: `supplai-dev/src/lib/redistribusi/teks.ts`
- Modify: `supplai-dev/src/lib/redistribusi/report.ts`
- Test: `supplai-dev/src/lib/redistribusi/teks.test.ts`

**Interfaces:**
- Produces: `teksInstrumen(s)`, `teksUjiOngkos(u)` — keduanya `string[]`

- [ ] **Step 1: Tulis tes yang gagal**

```typescript
it("menyatakan bahwa instrumen yang dijadikan pembanding tidak akan sanggup", () => {
  // Merekomendasikan volume di luar kapasitas instrumen yang kita sendiri
  // jadikan pembanding, tanpa mengatakannya, adalah kelalaian yang bisa
  // dihindari dengan satu paragraf.
  const teks = teksInstrumen({ ton: 1025.7, nilaiRp: 37.16e9, kegiatan: 1413,
                               kapasitasTahunan: 1888, persenKapasitas: 74.8 }).join(" ");
  expect(teks).toMatch(/tidak (akan )?(sanggup|cukup)/);
  expect(teks).toContain("1.888");
});

it("menandai konversi kegiatan sebagai indikatif, bukan takaran", () => {
  const teks = teksInstrumen({ ton: 1025.7, nilaiRp: 37.16e9, kegiatan: 1413,
                               kapasitasTahunan: 1888, persenKapasitas: 74.8 }).join(" ");
  expect(teks).toMatch(/indikatif/);
});

it("melaporkan hasil uji ongkos apa adanya, termasuk bila rencananya tak bergeser", () => {
  const teks = teksUjiOngkos({ ruteBerubah: 0, persenBawahJarak: 7.4,
                               persenBawahTetap: 7.4 }).join(" ");
  expect(teks).toMatch(/tidak|nol/i);
});
```

- [ ] **Step 2: Jalankan untuk memastikan gagal**

Run: `npx vitest run src/lib/redistribusi/teks.test.ts`
Expected: 3 FAIL

- [ ] **Step 3: Tulis implementasi**

Tambahkan keduanya di `teks.ts` dan panggil dari kerangka **pemerintah**. `teksUjiOngkos` harus menuliskan hasilnya apa adanya: bila rencana hampir tidak bergeser ketika jarak dihapus dari fungsi objektif, katakan begitu — itu tesis mentor yang terbukti pada data kita sendiri, bukan eksperimen yang gagal.

- [ ] **Step 4: Jalankan tes dan bangun**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: tsc bersih, 57 lulus, build sukses

- [ ] **Step 5: Commit**

```bash
git add src/lib/redistribusi/teks.ts src/lib/redistribusi/report.ts src/lib/redistribusi/teks.test.ts
git commit -m "feat: kerangka pemerintah menyatakan kapasitas instrumen dan hasil uji ongkos"
```

---

### Task 9: Layar — panel muatan balik dan jalur tindakan

**Files:**
- Create: `supplai-dev/src/components/redistribusi/muatan-balik-panel.tsx`
- Create: `supplai-dev/src/components/redistribusi/tindakan-panel.tsx`
- Modify: `supplai-dev/src/app/(dashboard)/redistribusi/page.tsx`

- [ ] **Step 1: Buat kedua panel**

`muatan-balik-panel.tsx` menampilkan diagnosis (nol pasangan bolak-balik, ton-km) dan tabel rantai per simpul. `tindakan-panel.tsx` menampilkan setara kegiatan beserta kapasitasnya, dan tabel modal-imbal hasil yang diurutkan menurut imbal hasil dengan rute di bawah ambang ditandai.

Ikuti bentuk `buku-besar-panel.tsx` — baca berkas itu lebih dulu.

- [ ] **Step 2: Pasang di halaman, masing-masing pada barisnya sendiri**

Halaman ini pernah mengalami regresi tata letak ketika panel disisipkan ke baris yang sudah terisi dan memotong tabel rute.

- [ ] **Step 3: Bangun dan periksa di peramban**

```bash
npx tsc --noEmit && npx vitest run && npm run build
setsid nohup npx next start -p 3100 > /tmp/p3.log 2>&1 < /dev/null &
```

Buka `/redistribusi` dan **klik ketiga postur**. Halaman ini hanya merender tab aktif; memeriksa satu postur melewatkan sisanya. `konservatif` nol rute — periksa apa yang kedua panel tampilkan di sana, karena panel modal dengan nol rute adalah kasus yang paling mungkin merender pembagian nol.

Laporkan apa yang kamu lihat per postur, bukan kesimpulan bahwa semuanya baik.

- [ ] **Step 4: Hentikan server**

```bash
for p in $(pgrep -f "next-server" | grep -vx "$$"); do kill -9 "$p"; done
```

- [ ] **Step 5: Commit**

```bash
git add src/components/redistribusi/ "src/app/(dashboard)/redistribusi/page.tsx"
git commit -m "feat: panel muatan balik dan jalur tindakan di layar"
```

---

## Self-Review

**Cakupan spec.** Bagian 3 (muatan balik) → Task 1, 2, 7, 9. Bagian 3 (uji ongkos) → Task 3, 4, 8. Bagian 5.2 (instrumen dan kapasitas) → Task 5, 6, 8. Bagian 5.3 (pasar bernama) → Task 5, 6, 7. Bagian 5.4 (modal dan imbal hasil) → Task 5, 6, 7, 9. Bagian 5.5 (yang tetap tidak dijawab) → dinyatakan dalam docstring `tindakan.py` dan dalam bagian Batasan kedua PDF; bila reviewer menilai itu belum cukup terlihat oleh pembaca, ia masuk sebagai temuan.

**Angka yang dikoreksi dari spec.** Tabel modal di spec diurutkan menurut modal, bukan menurut imbal hasil, sehingga Sulawesi Barat (17,2%) tampil teratas. Urutan menurut imbal hasil yang sebenarnya: **Kepulauan Riau 39,9%**, Gorontalo 27,0%, Sulawesi Barat 17,2%, Kalimantan Barat 13,7%, dan Bengkulu 0,2% di dasar. Task 6 mengurutkan menurut imbal hasil; jangan mereproduksi urutan spec.

**Ketergantungan pada Rencana 2.** Task 4 memakai `supplai.tingkatan.muat()` untuk melaporkan porsi ke sepertiga terbawah IKP. Bila Rencana 2 belum dieksekusi, task itu tidak bisa jalan — kerjakan Rencana 2 lebih dulu.

**Konsistensi tipe.** `pasangan_bolak_balik` → `pasanganBolakBalik`; `ton_dirantai` → `tonDirantai`; `persen_dirantai` → `persenDirantai`; `imbal_hasil_persen` → `imbalHasilPersen`; `kapasitas_tahunan` → `kapasitasTahunan`. Semua diubah di batas ekspor Task 6 dan dipakai dengan bentuk camelCase di Task 7, 8, 9.

**Urutan.** Task 3 mendahului Task 4. Task 1 mendahului Task 6 dan 7. Task 5 mendahului Task 6. Task 6 mendahului Task 7, 8, 9. Task 2 berdiri sendiri. Eksekusi tetap berurutan karena beberapa task menyunting `teks.ts` dan `report.ts` yang sama.

**Angka harapan tes.** Pipeline 106 → 112 (T1) → 113 (T2) → 116 (T3) → 119 (T4) → 126 (T5). FE 49 → 54 (T7) → 57 (T8). `scripts/tests` 26 → 29 (T6). Laporkan yang benar-benar kamu dapat; angka ini bergeser bila sebuah ronde perbaikan menambah tes.
