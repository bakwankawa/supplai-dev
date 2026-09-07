# Tingkatan Daerah & Lanskap Komoditas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menempatkan tiap rencana redistribusi pada peta kesenjangan daerah, dan memberi pembaca bacaan harga untuk komoditas di luar enam yang diramalkan.

**Architecture:** Indeks Ketahanan Pangan resmi Bapanas masuk sebagai berkas data berprovenans, dan `supplai/tingkatan.py` membaginya jadi tiga kelompok yang dinamai apa adanya. `supplai/lanskap.py` membaca posisi harga tiap komoditas terhadap median nasional — tanpa model ramalan, sehingga mencakup dua komoditas yang tidak kita ramalkan. Keduanya mengalir ke PDF: sebaran rencana atas tiga kelompok untuk pemerintah, lanskap harga untuk pedagang.

**Tech Stack:** Python 3.11 (`/opt/conda/bin/python`), pandas, pytest · Next.js 16, TypeScript, vitest, jsPDF

**Spec:** `docs/superpowers/specs/2026-09-07-feedback-mentor-7sept-design.md` — Bagian 1 dan Bagian 4.

## Global Constraints

- **Repo pipeline** berakar di `/home/jupyter/kawa-temp/hackathon_phase2/`; **repo FE** di `.../supplai-dev/`. `scripts/export_web.py` ada di repo FE.
- Interpreter lewat jalur langsung: `/opt/conda/bin/python`. Jangan andalkan `conda activate`.
- **Nama resmi tidak dipinjam.** Kelompok terbawah TIDAK boleh disebut "daerah tertinggal" — itu sebutan resmi tingkat kabupaten dengan daftarnya sendiri (Perpres 63/2020). Namanya: **"sepertiga terbawah/tengah/teratas IKP Bapanas 2025"**.
- **Tidak ada skor komposit baru.** Lanskap adalah dua bacaan bernama, bukan satu angka gabungan.
- **Angka Indonesia**: titik pemisah ribuan, koma desimal. `format_id` di pipeline, `src/lib/redistribusi/format.ts` di FE.
- **PDF permukaan utama.** Sebuah task yang temuannya baru ada di layar belum selesai.
- **Bukan sasaran:** melatih ulang model, menambah komoditas yang **diramalkan**, atau memakai berkas `indeks_ketahanan_pangan_provinsi_2022_2026.xlsx`.
- Baseline sebelum mulai: **106 tes pipeline**, **49 tes FE**, **26 tes `supplai-dev/scripts/tests/` dengan 4 gagal yang sudah ada sebelumnya** (`build_heatmap`, `build_commodity_mape`, `headline_mape_h1`, `ledger_loads`) — jangan sentuh keempatnya.

---

### Task 1: Berkas data IKP resmi beserta provenansnya

**Files:**
- Create: `data/ikp_provinsi_2025.csv`
- Test: `tests/test_ikp_data.py`

**Interfaces:**
- Produces: `data/ikp_provinsi_2025.csv` berkolom `kode_prov,provinsi,tahun,ikp,peringkat`, 38 baris, dengan kepala komentar `#` yang dibaca `pd.read_csv(..., comment="#")`

- [ ] **Step 1: Tulis berkas datanya**

Buat `data/ikp_provinsi_2025.csv`. Kepala provenansnya mengikuti gaya `data/elastisitas.csv` — baca berkas itu lebih dulu dan tiru bentuknya, termasuk baris `# CATATAN:` untuk hal yang pemakainya wajib tahu.

```
# Indeks Ketahanan Pangan (IKP) tingkat provinsi, tahun 2025.
# Sumber: Badan Pangan Nasional, "Indeks Ketahanan Pangan (IKP) Tingkat Provinsi
#   Tahun 2025 (12 Indikator)", portal data terbuka Bapanas.
#   https://data.badanpangan.go.id/datasetpublications/3pa/ikp-provinsi-2025
# Diambil: 2026-09-07, lewat ekstraksi tabel dari halaman portal.
# Skala: 0-100, makin TINGGI makin tahan pangan. Peringkat 1 = paling tahan.
# CATATAN: pengambilan lewat ekstraksi, bukan unduhan berkas, sehingga isinya
#   diuji tiga cara di tests/test_ikp_data.py: peringkat harus permutasi 1..38,
#   peringkat harus konsisten dengan urutan skor menurun, dan kode provinsi harus
#   kode BPS yang sah. Uji kedua yang paling menentukan karena ia tidak akan lolos
#   bila satu skor pun salah salin.
# CATATAN: mencakup 38 provinsi, termasuk empat provinsi Papua hasil pemekaran
#   2022. Data harga WFP kita hanya 34 dan masih memakai pembagian lama, sehingga
#   Papua Selatan, Papua Tengah, Papua Pegunungan dan Papua Barat Daya punya skor
#   di sini tetapi tidak punya harga. Ketidakcocokan itu DINYATAKAN oleh
#   supplai/tingkatan.py, bukan ditambal.
kode_prov,provinsi,tahun,ikp,peringkat
11,Aceh,2025,69.9998339779704,25
12,Sumatera Utara,2025,71.4663313318733,22
13,Sumatera Barat,2025,77.7238279911911,7
14,Riau,2025,70.4190034922395,23
15,Jambi,2025,76.1605704297545,9
16,Sumatera Selatan,2025,79.3096701298974,4
17,Bengkulu,2025,69.8867217749869,26
18,Lampung,2025,73.0594723108079,15
19,Kepulauan Bangka Belitung,2025,78.1999436233039,5
21,Kepulauan Riau,2025,71.9564162333589,19
31,DKI Jakarta,2025,71.5183136765329,20
32,Jawa Barat,2025,74.9458173356482,10
33,Jawa Tengah,2025,73.7328521019901,13
34,DI Yogyakarta,2025,77.4391711876829,8
35,Jawa Timur,2025,72.669250230991,16
36,Banten,2025,77.784634973294,6
51,Bali,2025,79.8890756738125,3
52,Nusa Tenggara Barat,2025,74.6963282060683,11
53,Nusa Tenggara Timur,2025,58.2444433410774,32
61,Kalimantan Barat,2025,71.5160036476343,21
62,Kalimantan Tengah,2025,73.6193160214716,14
63,Kalimantan Selatan,2025,81.9842569570154,1
64,Kalimantan Timur,2025,80.8175851554458,2
65,Kalimantan Utara,2025,72.5567564727203,17
71,Sulawesi Utara,2025,72.4902207278414,18
72,Sulawesi Tengah,2025,70.3981453268619,24
73,Sulawesi Selatan,2025,74.2975086071574,12
74,Sulawesi Tenggara,2025,67.5554547909336,28
75,Gorontalo,2025,69.7453579153688,27
76,Sulawesi Barat,2025,67.0763148865859,29
81,Maluku,2025,57.1792944953309,34
82,Maluku Utara,2025,58.2717473763375,31
91,Papua,2025,57.4540165815632,33
92,Papua Barat,2025,58.6075684891856,30
93,Papua Selatan,2025,53.9644654376308,36
94,Papua Tengah,2025,41.6092346745131,37
95,Papua Pegunungan,2025,31.9627630247765,38
96,Papua Barat Daya,2025,57.1545915908165,35
```

- [ ] **Step 2: Tulis tes yang menguji berkasnya**

Buat `tests/test_ikp_data.py`:

```python
import pandas as pd

IKP = pd.read_csv("data/ikp_provinsi_2025.csv", comment="#")


def test_thirty_eight_provinces_each_appearing_once():
    assert len(IKP) == 38
    assert IKP.provinsi.nunique() == 38
    assert IKP.kode_prov.nunique() == 38


def test_rank_is_a_permutation_of_one_to_thirty_eight():
    assert sorted(IKP.peringkat) == list(range(1, 39))


def test_rank_agrees_with_the_score_order():
    """Uji paling menentukan. Data ini diambil lewat ekstraksi tabel, bukan
    unduhan berkas, jadi satu skor salah salin akan memutus kesepakatan antara
    dua kolom yang ditulis terpisah di sumbernya."""
    turun = IKP.ikp.rank(ascending=False).astype(int)
    assert (turun == IKP.peringkat).all()


def test_province_codes_are_valid_bps_codes():
    assert IKP.kode_prov.between(11, 96).all()


def test_scale_direction_is_higher_is_more_secure():
    """Papua Pegunungan peringkat 38, Kalimantan Selatan peringkat 1. Kalau arah
    skalanya pernah terbalik saat penyuntingan, tes ini yang menangkapnya."""
    assert IKP.loc[IKP.peringkat == 1, "provinsi"].iloc[0] == "Kalimantan Selatan"
    assert IKP.loc[IKP.peringkat == 38, "provinsi"].iloc[0] == "Papua Pegunungan"
    assert IKP.ikp.max() > IKP.ikp.min()
```

- [ ] **Step 3: Jalankan tes**

Run: `cd /home/jupyter/kawa-temp/hackathon_phase2 && /opt/conda/bin/python -m pytest tests/test_ikp_data.py -v`
Expected: 5 passed

- [ ] **Step 4: Jalankan seluruh suite**

Run: `/opt/conda/bin/python -m pytest tests/ -q`
Expected: 111 passed

- [ ] **Step 5: Commit**

```bash
git add data/ikp_provinsi_2025.csv tests/test_ikp_data.py
git commit -m "data: IKP resmi Bapanas 2025 per provinsi

Skor 0-100, makin tinggi makin tahan pangan, 38 provinsi. Diambil lewat
ekstraksi tabel dari portal data Bapanas, bukan unduhan berkas, sehingga
diuji tiga cara. Uji peringkat-versus-skor yang paling menentukan: ia tidak
akan lolos bila satu skor pun salah salin, karena kedua kolom ditulis
terpisah di sumbernya."
```

---

### Task 2: `supplai/tingkatan.py` — kelompok dan cakupan

**Files:**
- Create: `supplai/tingkatan.py`
- Test: `tests/test_tingkatan.py`

**Interfaces:**
- Consumes: `data/ikp_provinsi_2025.csv` dari Task 1
- Produces:
  - `KELOMPOK = ("bawah", "tengah", "atas")`
  - `LABEL = {"bawah": "Sepertiga terbawah IKP Bapanas 2025", "tengah": "Sepertiga tengah IKP Bapanas 2025", "atas": "Sepertiga teratas IKP Bapanas 2025"}`
  - `muat(data_dir="data") -> pd.DataFrame` berindeks `provinsi`, berkolom `ikp`, `peringkat`, `kelompok`
  - `cakupan(provinsi_model: Iterable[str], data_dir="data") -> dict` dengan kunci `cocok`, `ikp_tanpa_harga`, `harga_tanpa_ikp`

- [ ] **Step 1: Tulis tes yang gagal**

Buat `tests/test_tingkatan.py`:

```python
import pandas as pd
import pytest

from supplai import tingkatan


def test_thirds_are_computed_over_all_thirty_eight_provinces():
    """Sepertiga dihitung atas seluruh 38 provinsi IKP, bukan atas 34 yang punya
    harga. Tingkatan adalah sifat provinsinya sendiri; kalau dihitung atas 34,
    kelompok sebuah provinsi bergeser hanya karena cakupan data kita berubah dan
    angka yang sama berarti hal berbeda antar rilis."""
    t = tingkatan.muat()
    assert len(t) == 38
    n = t.kelompok.value_counts()
    assert n["bawah"] + n["tengah"] + n["atas"] == 38
    # 38 tidak habis dibagi tiga; selisih tiap kelompok paling banyak satu
    assert n.max() - n.min() <= 1


def test_the_lowest_scoring_province_is_in_the_bottom_third():
    t = tingkatan.muat()
    assert t.loc["Papua Pegunungan", "kelompok"] == "bawah"
    assert t.loc["Kalimantan Selatan", "kelompok"] == "atas"


def test_labels_never_borrow_the_official_designation():
    """'Daerah tertinggal' adalah sebutan resmi tingkat kabupaten dengan daftarnya
    sendiri. Memakainya untuk provinsi berdasar skor IKP salah dua kali."""
    for teks in tingkatan.LABEL.values():
        assert "tertinggal" not in teks.lower()
        assert "IKP Bapanas 2025" in teks


def test_coverage_names_the_provinces_that_do_not_pair():
    """Empat provinsi Papua hasil pemekaran 2022 punya skor IKP tetapi tidak punya
    harga, karena WFP masih memakai pembagian lama. Itu dilaporkan, bukan ditambal."""
    c = tingkatan.cakupan(["Aceh", "Papua", "Jawa Barat"])
    assert c["cocok"] == 3
    assert "Papua Pegunungan" in c["ikp_tanpa_harga"]
    assert "Papua Barat Daya" in c["ikp_tanpa_harga"]
    assert c["harga_tanpa_ikp"] == []


def test_coverage_reports_a_province_we_price_but_ikp_does_not_score():
    c = tingkatan.cakupan(["Wakanda"])
    assert c["harga_tanpa_ikp"] == ["Wakanda"]
    assert c["cocok"] == 0
```

- [ ] **Step 2: Jalankan tes untuk memastikan gagal**

Run: `/opt/conda/bin/python -m pytest tests/test_tingkatan.py -v`
Expected: 5 FAIL dengan `ModuleNotFoundError: No module named 'supplai.tingkatan'`

- [ ] **Step 3: Tulis implementasi**

Buat `supplai/tingkatan.py`:

```python
"""Tempat sebuah provinsi berdiri pada indeks ketahanan pangan resmi.

Alat pemerataan yang tidak bisa menyebutkan siapa yang paling rentan hanya
memindahkan barang. Modul ini memasang skor IKP Bapanas pada tiap provinsi dan
membaginya menjadi tiga kelompok yang dinamai apa adanya.

Kelompoknya TIDAK disebut "daerah tertinggal". Itu sebutan resmi dengan daftar
resminya sendiri di tingkat kabupaten (Perpres 63/2020); memakainya untuk
provinsi berdasar skor IKP salah pada tingkat wilayahnya sekaligus pada
daftarnya. Nama yang dipakai menyebut persis dari mana ia berasal.
"""

from __future__ import annotations

from pathlib import Path
from typing import Iterable

import pandas as pd

KELOMPOK = ("bawah", "tengah", "atas")

LABEL = {
    "bawah": "Sepertiga terbawah IKP Bapanas 2025",
    "tengah": "Sepertiga tengah IKP Bapanas 2025",
    "atas": "Sepertiga teratas IKP Bapanas 2025",
}


def muat(data_dir: str | Path = "data") -> pd.DataFrame:
    """IKP per provinsi dengan kelompok sepertiganya.

    Sepertiga dihitung atas SELURUH 38 provinsi yang diberi skor, bukan atas 34
    yang punya data harga. Tingkatan adalah sifat provinsinya sendiri: kalau
    dihitung atas provinsi yang kebetulan kita liput, kelompok sebuah provinsi
    bergeser ketika cakupan kita berubah, dan label yang sama berarti hal
    berbeda antar rilis.
    """
    d = pd.read_csv(Path(data_dir) / "ikp_provinsi_2025.csv", comment="#")
    d = d.set_index("provinsi").sort_values("peringkat")
    # qcut atas peringkat, bukan atas skor: peringkat sudah seragam sebarannya,
    # sehingga ketiga kelompok berukuran sedekat mungkin walau skornya menggerombol.
    d["kelompok"] = pd.qcut(d["peringkat"], 3, labels=["atas", "tengah", "bawah"])
    d["kelompok"] = d["kelompok"].astype(str)
    return d[["ikp", "peringkat", "kelompok"]]


def cakupan(provinsi_model: Iterable[str], data_dir: str | Path = "data") -> dict:
    """Provinsi mana yang berpasangan, dan mana yang tidak.

    Dilaporkan, bukan ditambal. Empat provinsi Papua hasil pemekaran 2022 punya
    skor IKP tetapi tidak punya harga, karena data WFP masih memakai pembagian
    lama — dan salah satunya, Papua Pegunungan, adalah provinsi dengan IKP
    terendah di negeri ini. Alat pemerataan yang tidak bisa melihat daerah
    paling rentan adalah hal yang wajib diketahui pemakainya.
    """
    ikp = set(muat(data_dir).index)
    model = set(provinsi_model)
    return {
        "cocok": len(ikp & model),
        "ikp_tanpa_harga": sorted(ikp - model),
        "harga_tanpa_ikp": sorted(model - ikp),
    }
```

- [ ] **Step 4: Jalankan tes**

Run: `/opt/conda/bin/python -m pytest tests/ -q`
Expected: 116 passed

- [ ] **Step 5: Commit**

```bash
git add supplai/tingkatan.py tests/test_tingkatan.py
git commit -m "feat: tingkatan daerah dari IKP resmi, dengan cakupan yang dinyatakan

Sepertiga dihitung atas seluruh 38 provinsi berskor, bukan atas 34 yang punya
harga: tingkatan adalah sifat provinsinya, dan menghitungnya atas provinsi yang
kebetulan kita liput membuat label yang sama berarti hal berbeda antar rilis.

cakupan() melaporkan pasangan yang gagal alih-alih menambalnya. Empat provinsi
Papua hasil pemekaran punya skor tetapi tidak punya harga, dan salah satunya
ber-IKP terendah di negeri ini."
```

---

### Task 3: Buku besar mencatat IKP dan berkas yang ditolak

**Files:**
- Modify: `supplai/buku_besar.py`
- Test: `tests/test_buku_besar.py`

**Interfaces:**
- Consumes: `bangun_buku_besar(kebutuhan)` — fungsi yang sudah ada, menerima satu argumen
- Produces: dua entri baru pada daftar

- [ ] **Step 1: Tulis tes yang gagal**

Tambahkan di `tests/test_buku_besar.py`:

```python
def test_ledger_records_the_food_security_index():
    entri = {e["input"]: e for e in bangun_buku_besar(Kebutuhan())}
    e = entri["Indeks Ketahanan Pangan provinsi"]
    assert e["status"] == "terukur"
    assert "Bapanas" in e["sumber"]
    assert "2025" in str(e["tahun"])


def test_ledger_records_why_the_monthly_file_was_rejected():
    """Berkas bernama 'indeks_ketahanan_pangan_provinsi_2022_2026.xlsx' tergeletak
    di additional data/ dengan nama yang meyakinkan. Alasan penolakannya dicatat
    supaya orang berikutnya tidak mengulanginya."""
    entri = {e["input"]: e for e in bangun_buku_besar(Kebutuhan())}
    e = entri["Berkas IKP bulanan yang TIDAK dipakai"]
    assert "0,42" in e["sumber"] or "0.42" in e["sumber"]
    assert "Papua Pegunungan" in e["sumber"]
```

- [ ] **Step 2: Jalankan tes untuk memastikan gagal**

Run: `/opt/conda/bin/python -m pytest tests/test_buku_besar.py -k "food_security or monthly_file" -v`
Expected: 2 FAIL dengan `KeyError`

- [ ] **Step 3: Tulis implementasi**

Tambahkan dua entri pada daftar di `supplai/buku_besar.py`, setelah entri "Bulan sasaran rencana":

```python
        {
            "input": "Indeks Ketahanan Pangan provinsi",
            "nilai": "skor 0-100 per provinsi, 38 provinsi, makin tinggi makin tahan",
            "sumber": "Badan Pangan Nasional, IKP Tingkat Provinsi 2025 (12 "
                      "indikator), portal data terbuka. Diambil 2026-09-07 lewat "
                      "ekstraksi tabel, lalu diuji tiga cara di "
                      "tests/test_ikp_data.py — peringkatnya harus permutasi "
                      "1..38 dan harus konsisten dengan urutan skornya.",
            "tahun": "2025",
            "status": "terukur",
        },
        {
            "input": "Berkas IKP bulanan yang TIDAK dipakai",
            "nilai": "additional data/indeks_ketahanan_pangan_provinsi_2022_2026.xlsx",
            "sumber": "Ditolak sebagai dasar tingkatan. Berkas itu bulanan "
                      "berskala 1-3; IKP resmi tahunan berskala 0-100. Korelasi "
                      "peringkat keduanya hanya 0,42, dan berkas itu menempatkan "
                      "Papua Pegunungan — peringkat 38 secara resmi, terendah di "
                      "negeri ini — di atas median. Membangun analisis kesenjangan "
                      "di atasnya akan membalik posisi pemerintah pada provinsi "
                      "yang paling menentukan. Dicatat di sini supaya orang "
                      "berikutnya yang melihat berkas itu tidak mengulanginya.",
            "tahun": "—",
            "status": "diasumsikan",
        },
```

- [ ] **Step 4: Bangun ulang dan jalankan tes**

```bash
cd /home/jupyter/kawa-temp/hackathon_phase2
/opt/conda/bin/python rebuild_plan.py
/opt/conda/bin/python -m pytest tests/ -q
```
Expected: 118 passed

- [ ] **Step 5: Commit**

```bash
git add supplai/buku_besar.py tests/test_buku_besar.py
git commit -m "docs: buku besar mencatat IKP resmi dan berkas yang ditolak

Entri kedua mencatat penolakan, bukan pemakaian. Berkas bernama meyakinkan
tergeletak di additional data/ dan korelasinya dengan angka resmi hanya 0,42;
ia menempatkan provinsi ber-IKP terendah di negeri ini di atas median. Alasan
menolaknya ditulis supaya orang berikutnya tidak mengulangi percobaan itu."
```

---

### Task 4: `supplai/lanskap.py` — posisi harga per komoditas

**Files:**
- Create: `supplai/lanskap.py`
- Test: `tests/test_lanskap.py`

**Interfaces:**
- Consumes: `data/wfp_food_prices_idn.csv`; `supplai.data` untuk pola pembacaan
- Produces:
  - `KOMODITAS_LANSKAP: dict[str, str]` — peta nama WFP ke nama Indonesia, **delapan** entri
  - `posisi_harga(data_dir="data", sejak="2025-01-01") -> pd.DataFrame` berkolom `komoditas`, `provinsi`, `harga`, `median_nasional`, `relatif_persen`, `posisi`
  - `posisi` bernilai `"di bawah median"` atau `"di atas median"`

**PERINGATAN — jangan perluas `COMMODITY_MAP`.** `supplai/data.py:31` punya `COMMODITY_MAP` dengan enam entri, dan `COMMODITIES` yang diturunkan darinya menggerakkan loop pelatihan di `train.py:318`. Menambahkan daging sapi dan gula ke sana akan diam-diam menarik keduanya ke pelatihan model — yang spec-nya kecualikan secara eksplisit. Modul ini memakai petanya sendiri.

- [ ] **Step 1: Tulis tes yang gagal**

Buat `tests/test_lanskap.py`:

```python
import pandas as pd
import pytest

from supplai import lanskap
from supplai.data import COMMODITY_MAP


def test_landscape_covers_two_commodities_beyond_the_six_we_forecast():
    """Daging Sapi dan Gula Pasir punya harga sampai Juni 2026 dan sudah punya
    neraca nasional dari berkas staf ahli Komisi IV, tetapi tidak kita ramalkan.
    Posisi harga tidak butuh model, jadi keduanya bisa dibaca."""
    tambahan = set(lanskap.KOMODITAS_LANSKAP.values()) - set(COMMODITY_MAP.values())
    assert tambahan == {"Daging Sapi", "Gula Pasir"}
    assert len(lanskap.KOMODITAS_LANSKAP) == 8


def test_landscape_does_not_widen_the_training_set():
    """Memperluas COMMODITY_MAP akan menarik keduanya ke train.py:318. Modul ini
    memakai petanya sendiri justru supaya itu tidak terjadi."""
    assert len(COMMODITY_MAP) == 6
    assert "Meat (beef, first quality)" not in COMMODITY_MAP
    assert "Sugar (local)" not in COMMODITY_MAP


def test_every_commodity_is_priced_in_every_province():
    p = lanskap.posisi_harga()
    n = p.groupby("komoditas").provinsi.nunique()
    assert (n == 34).all(), n[n != 34].to_dict()


def test_position_agrees_with_the_relative_number():
    """Label dan angkanya harus tidak bisa berselisih: satu diturunkan dari yang
    lain, bukan dihitung dua kali."""
    p = lanskap.posisi_harga()
    bawah = p[p.posisi == "di bawah median"]
    atas = p[p.posisi == "di atas median"]
    assert (bawah.relatif_persen < 0).all()
    assert (atas.relatif_persen >= 0).all()


def test_median_is_national_and_shared_across_provinces():
    p = lanskap.posisi_harga()
    for kom, g in p.groupby("komoditas"):
        assert g.median_nasional.nunique() == 1, kom


def test_series_that_wfp_retired_are_not_resurrected():
    """Sembilan belas seri berhenti Mei 2024 ketika WFP mengganti spesifikasinya.
    Memakai `Rice` alih-alih `Rice (medium quality)` akan menghidupkan harga basi
    dan menyajikannya sebagai posisi hari ini."""
    p = lanskap.posisi_harga()
    assert "Rice" not in lanskap.KOMODITAS_LANSKAP
    assert "Garlic" not in lanskap.KOMODITAS_LANSKAP
    assert "Eggs (broiler)" not in lanskap.KOMODITAS_LANSKAP
```

- [ ] **Step 2: Jalankan tes untuk memastikan gagal**

Run: `/opt/conda/bin/python -m pytest tests/test_lanskap.py -v`
Expected: 6 FAIL dengan `ModuleNotFoundError: No module named 'supplai.lanskap'`

- [ ] **Step 3: Tulis implementasi**

Buat `supplai/lanskap.py`:

```python
"""Posisi harga tiap komoditas di tiap provinsi, terhadap median nasionalnya.

Ini bacaan HARGA, bukan bacaan PASOKAN. Harga di bawah median nasional adalah
bukti kelimpahan setempat, bukan pengukurannya: data produksi per provinsi tidak
tersedia bagi kami, dan buku besar sudah mencatat itu. Setiap tempat angka ini
tampil harus mengatakannya.

Karena tidak ada model ramalan yang terlibat, cakupannya lebih luas daripada
enam komoditas yang kita ramalkan — tetapi hanya dua lebih luas, bukan dua
puluh. Dari 27 seri WFP, delapan belas berhenti tepat pada Mei 2024 ketika WFP
mengganti spesifikasinya; yang masih berharga sampai Juni 2026 ada delapan.
Dua tambahannya, Daging Sapi dan Gula Pasir, kebetulan justru dua yang sudah
punya neraca nasional dari berkas staf ahli Komisi IV.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

# Peta milik modul ini sendiri. JANGAN gabungkan dengan COMMODITY_MAP di
# supplai/data.py: COMMODITIES yang diturunkan dari sana menggerakkan loop
# pelatihan di train.py, sehingga menambah entri di sana akan diam-diam melatih
# model untuk komoditas yang sengaja tidak kita ramalkan.
KOMODITAS_LANSKAP = {
    "Rice (medium quality)": "Beras Medium",
    "Onions (shallot, medium)": "Bawang Merah",
    "Garlic (medium)": "Bawang Putih",
    "Meat (chicken)": "Daging Ayam",
    "Eggs": "Telur Ayam",
    "Oil (vegetable)": "Minyak Goreng",
    "Meat (beef, first quality)": "Daging Sapi",
    "Sugar (local)": "Gula Pasir",
}


def posisi_harga(data_dir: str | Path = "data",
                 sejak: str = "2025-01-01") -> pd.DataFrame:
    """Harga terakhir tiap provinsi terhadap median nasional komoditasnya."""
    d = pd.read_csv(Path(data_dir) / "wfp_food_prices_idn.csv", low_memory=False)
    d = d.dropna(subset=["admin1"])
    d["date"] = pd.to_datetime(d["date"])
    d = d[(d["date"] >= sejak) & (d["commodity"].isin(KOMODITAS_LANSKAP))].copy()
    d["komoditas"] = d["commodity"].map(KOMODITAS_LANSKAP)
    d["provinsi"] = d["admin1"].str.title()

    # Harga provinsi = rata-rata pasar pada bulan terakhir yang provinsi itu
    # punya. Bukan harga satu pasar: sebuah provinsi bisa punya dua pasar atau
    # dua puluh empat, dan memilih satu di antaranya menjadikan angkanya milik
    # pasar itu, bukan milik provinsinya.
    d = d.sort_values("date")
    terakhir = (d.groupby(["komoditas", "provinsi", "date"])["price"].mean()
                  .reset_index()
                  .sort_values("date")
                  .groupby(["komoditas", "provinsi"]).tail(1)
                  .rename(columns={"price": "harga"}))

    med = terakhir.groupby("komoditas")["harga"].median().rename("median_nasional")
    out = terakhir.join(med, on="komoditas")
    out["relatif_persen"] = (out["harga"] - out["median_nasional"]) / out["median_nasional"] * 100
    out["posisi"] = out["relatif_persen"].map(
        lambda x: "di bawah median" if x < 0 else "di atas median")
    return out[["komoditas", "provinsi", "harga", "median_nasional",
                "relatif_persen", "posisi"]].reset_index(drop=True)
```

- [ ] **Step 4: Jalankan tes**

Run: `/opt/conda/bin/python -m pytest tests/ -q`
Expected: 124 passed

- [ ] **Step 5: Commit**

```bash
git add supplai/lanskap.py tests/test_lanskap.py
git commit -m "feat: lanskap posisi harga, delapan komoditas

Bacaan harga, bukan bacaan pasokan: harga di bawah median nasional adalah bukti
kelimpahan setempat, bukan pengukurannya.

Petanya milik modul ini sendiri dan sengaja tidak digabung dengan COMMODITY_MAP:
COMMODITIES yang diturunkan dari sana menggerakkan loop pelatihan di train.py,
jadi menambah entri di sana akan melatih model untuk komoditas yang sengaja
tidak diramalkan.

Delapan, bukan dua puluh tujuh: delapan belas seri WFP berhenti Mei 2024 saat
spesifikasinya berganti."
```

---

### Task 5: `export_web.py` meneruskan tingkatan dan lanskap

**Files:**
- Modify: `supplai-dev/scripts/export_web.py`
- Modify: `supplai-dev/src/lib/types.ts`
- Test: `supplai-dev/scripts/tests/test_export_web.py`

**Interfaces:**
- Consumes: `supplai.tingkatan.muat()`, `supplai.tingkatan.cakupan()`, `supplai.lanskap.posisi_harga()`
- Produces: berkas `src/data/generated/tingkatan.json` dan `src/data/generated/lanskap.json`; tipe `TingkatanProvinsi` dan `PosisiHarga` di `types.ts`

- [ ] **Step 1: Tulis tes yang gagal**

Tambahkan di `supplai-dev/scripts/tests/test_export_web.py`:

```python
def test_tingkatan_export_carries_all_thirty_eight_provinces(tmp_path):
    import json
    out = ew.build_tingkatan()
    assert len(out["provinsi"]) == 38
    assert set(out["label"]) == {"bawah", "tengah", "atas"}
    assert "tertinggal" not in json.dumps(out).lower()


def test_tingkatan_export_states_the_provinces_without_prices():
    out = ew.build_tingkatan()
    assert "Papua Pegunungan" in out["cakupan"]["ikpTanpaHarga"]


def test_lanskap_export_covers_eight_commodities():
    out = ew.build_lanskap()
    assert len(out["komoditas"]) == 8
    assert "Daging Sapi" in out["komoditas"]
    assert "Gula Pasir" in out["komoditas"]
```

- [ ] **Step 2: Jalankan tes untuk memastikan gagal**

Run: `cd /home/jupyter/kawa-temp/hackathon_phase2/supplai-dev && /opt/conda/bin/python -m pytest scripts/tests/test_export_web.py -k "tingkatan or lanskap" -v`
Expected: 3 FAIL dengan `ImportError: cannot import name 'build_tingkatan'`

- [ ] **Step 3: Tulis implementasi**

Di `supplai-dev/scripts/export_web.py`, tambahkan dua fungsi mengikuti bentuk `build_*` yang sudah ada di berkas itu — baca satu di antaranya lebih dulu dan tiru cara ia menyusun dict dan memanggil `_write`:

```python
def build_tingkatan() -> dict:
    """Tiga kelompok IKP, plus provinsi mana yang tidak berpasangan.

    Cakupan ikut dikirim, bukan disembunyikan: empat provinsi Papua punya skor
    tetapi tidak punya harga, dan salah satunya ber-IKP terendah di negeri ini.
    """
    from supplai import tingkatan
    import pandas as pd

    t = tingkatan.muat()
    prov_model = sorted(pd.read_parquet(ART / "forecast.parquet").provinsi.unique())
    c = tingkatan.cakupan(prov_model)
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
    from supplai import lanskap

    p = lanskap.posisi_harga()
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
```

Lalu panggil keduanya di tempat `build_*` lain dipanggil, menulis ke `tingkatan.json` dan `lanskap.json`.

Di `src/lib/types.ts` tambahkan:

```typescript
export interface TingkatanProvinsi {
  provinsi: string
  /** Skor IKP Bapanas 2025, 0-100. Makin tinggi makin tahan pangan. */
  ikp: number
  peringkat: number
  kelompok: "bawah" | "tengah" | "atas"
}

export interface PosisiHarga {
  komoditas: string
  provinsi: string
  harga: number
  medianNasional: number
  /** Selisih terhadap median nasional, dalam persen. Negatif berarti di bawah. */
  relatifPersen: number
  posisi: "di bawah median" | "di atas median"
}
```

- [ ] **Step 4: Jalankan ekspor dan tes**

```bash
cd /home/jupyter/kawa-temp/hackathon_phase2/supplai-dev
/opt/conda/bin/python scripts/export_web.py
/opt/conda/bin/python -m pytest scripts/tests/ -q
npx tsc --noEmit && npx vitest run
```
Expected: scripts/tests 29 lulus 4 gagal (keempat kegagalan lama); tsc bersih; vitest 49 lulus

- [ ] **Step 5: Commit**

```bash
cd /home/jupyter/kawa-temp/hackathon_phase2/supplai-dev
git add scripts/export_web.py scripts/tests/test_export_web.py src/lib/types.ts src/data/generated/
git commit -m "feat: teruskan tingkatan IKP dan lanskap harga ke FE

Cakupan ikut dikirim, bukan disembunyikan: empat provinsi Papua punya skor
tetapi tidak punya harga, dan salah satunya ber-IKP terendah di negeri ini."
```

---

### Task 6: `kesenjangan.ts` — sebaran rencana atas tiga kelompok

**Files:**
- Create: `supplai-dev/src/lib/redistribusi/kesenjangan.ts`
- Test: `supplai-dev/src/lib/redistribusi/kesenjangan.test.ts`

**Interfaces:**
- Consumes: `TingkatanProvinsi[]` dari Task 5; rute dari `analyzeRedistribusi`
- Produces: `sebaranKelompok(rute, tingkatan) -> { kelompok: "bawah"|"tengah"|"atas"; ton: number; persen: number; nProvinsi: number }[]` dan `provinsiTanpaTingkatan(rute, tingkatan) -> string[]`

- [ ] **Step 1: Tulis tes yang gagal**

Buat `supplai-dev/src/lib/redistribusi/kesenjangan.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { sebaranKelompok, provinsiTanpaTingkatan } from "./kesenjangan";

const TIER = [
  { provinsi: "Papua", ikp: 57.45, peringkat: 33, kelompok: "bawah" as const },
  { provinsi: "Jawa Barat", ikp: 74.95, peringkat: 10, kelompok: "atas" as const },
];

describe("sebaranKelompok", () => {
  it("membagi tonase menurut kelompok provinsi TUJUAN", () => {
    // Kesenjangan diukur dari siapa yang menerima, bukan siapa yang mengirim.
    const rute = [
      { ke: "Papua", volumeTon: 10 },
      { ke: "Jawa Barat", volumeTon: 30 },
    ];
    const s = sebaranKelompok(rute as never, TIER);
    const bawah = s.find((x) => x.kelompok === "bawah")!;
    expect(bawah.ton).toBe(10);
    expect(bawah.persen).toBeCloseTo(25, 6);
  });

  it("selalu mengembalikan ketiga kelompok, termasuk yang nol", () => {
    // Kelompok yang tidak menerima apa pun adalah temuan, bukan baris yang hilang.
    const s = sebaranKelompok([{ ke: "Papua", volumeTon: 5 }] as never, TIER);
    expect(s.map((x) => x.kelompok).sort()).toEqual(["atas", "bawah", "tengah"]);
    expect(s.find((x) => x.kelompok === "tengah")!.ton).toBe(0);
  });

  it("rencana kosong memberi nol persen, bukan NaN", () => {
    const s = sebaranKelompok([] as never, TIER);
    expect(s.every((x) => x.persen === 0)).toBe(true);
  });
});

describe("provinsiTanpaTingkatan", () => {
  it("menyebut tujuan yang tidak punya skor IKP alih-alih menghitungnya diam-diam", () => {
    const rute = [{ ke: "Papua", volumeTon: 1 }, { ke: "Wakanda", volumeTon: 1 }];
    expect(provinsiTanpaTingkatan(rute as never, TIER)).toEqual(["Wakanda"]);
  });
});
```

- [ ] **Step 2: Jalankan tes untuk memastikan gagal**

Run: `npx vitest run src/lib/redistribusi/kesenjangan.test.ts`
Expected: FAIL — `Cannot find module './kesenjangan'`

- [ ] **Step 3: Tulis implementasi**

Buat `supplai-dev/src/lib/redistribusi/kesenjangan.ts`:

```typescript
import type { TingkatanProvinsi } from "@/lib/types";

export const KELOMPOK = ["bawah", "tengah", "atas"] as const;
export type Kelompok = (typeof KELOMPOK)[number];

export interface BagianKelompok {
  kelompok: Kelompok;
  ton: number;
  persen: number;
  nProvinsi: number;
}

/**
 * Berapa banyak rencana ini sampai ke tiap kelompok IKP.
 *
 * Diukur dari provinsi TUJUAN: kesenjangan adalah soal siapa yang menerima.
 * Ketiga kelompok selalu dikembalikan, termasuk yang menerima nol — sebuah
 * kelompok yang tidak menerima apa pun adalah temuan yang harus terbaca, bukan
 * baris yang hilang dari tabel.
 */
export function sebaranKelompok(
  rute: { ke: string; volumeTon: number }[],
  tingkatan: TingkatanProvinsi[],
): BagianKelompok[] {
  const peta = new Map(tingkatan.map((t) => [t.provinsi, t.kelompok]));
  const total = rute.reduce((s, r) => s + r.volumeTon, 0);
  return KELOMPOK.map((k) => {
    const cocok = rute.filter((r) => peta.get(r.ke) === k);
    const ton = cocok.reduce((s, r) => s + r.volumeTon, 0);
    return {
      kelompok: k,
      ton,
      persen: total > 0 ? (ton / total) * 100 : 0,
      nProvinsi: new Set(cocok.map((r) => r.ke)).size,
    };
  });
}

/**
 * Tujuan yang tidak punya skor IKP.
 *
 * Dinamai, bukan dihitung diam-diam ke salah satu kelompok. Tonase yang jatuh
 * ke sini tidak muncul di sebaran mana pun, dan pembaca berhak tahu bahwa
 * jumlahnya tidak genap.
 */
export function provinsiTanpaTingkatan(
  rute: { ke: string }[],
  tingkatan: TingkatanProvinsi[],
): string[] {
  const punya = new Set(tingkatan.map((t) => t.provinsi));
  return [...new Set(rute.map((r) => r.ke))].filter((p) => !punya.has(p)).sort();
}
```

- [ ] **Step 4: Jalankan tes**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc bersih, 53 lulus

- [ ] **Step 5: Commit**

```bash
git add src/lib/redistribusi/kesenjangan.ts src/lib/redistribusi/kesenjangan.test.ts
git commit -m "feat: sebaran rencana atas tiga kelompok IKP

Diukur dari provinsi tujuan: kesenjangan adalah soal siapa yang menerima.
Ketiga kelompok selalu dikembalikan termasuk yang nol -- kelompok yang tidak
menerima apa pun adalah temuan, bukan baris yang hilang."
```

---

### Task 7: Bagian kesenjangan pada kerangka pemerintah

**Files:**
- Modify: `supplai-dev/src/lib/redistribusi/teks.ts`
- Modify: `supplai-dev/src/lib/redistribusi/report.ts`
- Test: `supplai-dev/src/lib/redistribusi/teks.test.ts`

**Interfaces:**
- Consumes: `sebaranKelompok`, `provinsiTanpaTingkatan` dari Task 6; `TingkatanProvinsi[]` dari Task 5
- Produces: `teksKesenjangan(sebaran: BagianKelompok[], tanpaTingkatan: string[], ikpTanpaHarga: string[]): string[]`

- [ ] **Step 1: Tulis tes yang gagal**

Tambahkan di `supplai-dev/src/lib/redistribusi/teks.test.ts`:

```typescript
it("menyebut kelompok dengan namanya sendiri, bukan sebutan resmi", () => {
  const teks = teksKesenjangan(
    [{ kelompok: "bawah", ton: 10, persen: 25, nProvinsi: 1 },
     { kelompok: "tengah", ton: 0, persen: 0, nProvinsi: 0 },
     { kelompok: "atas", ton: 30, persen: 75, nProvinsi: 1 }],
    [], ["Papua Pegunungan"],
  ).join(" ");
  expect(teks.toLowerCase()).not.toContain("tertinggal");
  expect(teks).toContain("IKP Bapanas 2025");
});

it("menyatakan provinsi ber-IKP terendah yang di luar jangkauan model", () => {
  // Alat pemerataan yang tidak bisa melihat daerah paling rentan adalah hal yang
  // wajib diketahui pemakainya, bukan cacat yang disembunyikan.
  const teks = teksKesenjangan(
    [{ kelompok: "bawah", ton: 10, persen: 25, nProvinsi: 1 },
     { kelompok: "tengah", ton: 0, persen: 0, nProvinsi: 0 },
     { kelompok: "atas", ton: 30, persen: 75, nProvinsi: 1 }],
    [], ["Papua Pegunungan", "Papua Tengah"],
  ).join(" ");
  expect(teks).toContain("Papua Pegunungan");
  expect(teks).toContain("di luar jangkauan");
});

it("menyebut kelompok yang tidak menerima apa pun", () => {
  const teks = teksKesenjangan(
    [{ kelompok: "bawah", ton: 0, persen: 0, nProvinsi: 0 },
     { kelompok: "tengah", ton: 0, persen: 0, nProvinsi: 0 },
     { kelompok: "atas", ton: 40, persen: 100, nProvinsi: 2 }],
    [], [],
  ).join(" ");
  expect(teks).toMatch(/tidak menerima|nol/i);
});
```

- [ ] **Step 2: Jalankan tes untuk memastikan gagal**

Run: `npx vitest run src/lib/redistribusi/teks.test.ts`
Expected: 3 FAIL

- [ ] **Step 3: Tulis implementasi**

Tambahkan `teksKesenjangan` di `src/lib/redistribusi/teks.ts`, memakai `persen` dan `ton` dari `format.ts`. Isi yang harus dibawa, masing-masing satu kalimat:

1. Berapa persen tonase sampai ke tiap kelompok, dengan label lengkapnya dari `LABEL` — sebut kelompoknya sebagai "sepertiga terbawah IKP Bapanas 2025", tidak pernah "daerah tertinggal".
2. Bila sebuah kelompok menerima nol, katakan begitu secara eksplisit.
3. Bila `ikpTanpaHarga` tidak kosong, nyatakan bahwa provinsi-provinsi itu punya skor IKP tetapi berada di luar jangkauan model karena data harganya memakai pembagian provinsi sebelum pemekaran 2022 — dan sebutkan namanya.
4. Bila `tanpaTingkatan` tidak kosong, sebutkan bahwa tonase ke provinsi itu tidak masuk sebaran mana pun.

Lalu panggil dari `report.ts` di kerangka pemerintah sebagai bagian bernomor baru setelah "02 Penekanan harga", dan **geser penomoran bagian sesudahnya**.

- [ ] **Step 4: Jalankan tes dan bangun**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: tsc bersih, 56 lulus, build sukses

- [ ] **Step 5: Commit**

```bash
git add src/lib/redistribusi/teks.ts src/lib/redistribusi/report.ts src/lib/redistribusi/teks.test.ts
git commit -m "feat: kerangka pemerintah menyatakan sebaran atas kelompok IKP

Termasuk provinsi ber-IKP terendah yang berada di luar jangkauan model karena
data harganya memakai pembagian sebelum pemekaran 2022. Itu dilaporkan, bukan
disembunyikan."
```

---

### Task 8: Bagian lanskap pada kerangka pedagang

**Files:**
- Modify: `supplai-dev/src/lib/redistribusi/teks.ts`
- Modify: `supplai-dev/src/lib/redistribusi/report.ts`
- Test: `supplai-dev/src/lib/redistribusi/teks.test.ts`

**Interfaces:**
- Consumes: `PosisiHarga[]` dari Task 5
- Produces: `teksLanskap(baris: PosisiHarga[], provinsi: string): string[]`

- [ ] **Step 1: Tulis tes yang gagal**

```typescript
const LANSKAP = [
  { komoditas: "Beras Medium", provinsi: "Papua", harga: 16000, medianNasional: 14000, relatifPersen: 14.29, posisi: "di atas median" as const },
  { komoditas: "Gula Pasir", provinsi: "Papua", harga: 17000, medianNasional: 18000, relatifPersen: -5.56, posisi: "di bawah median" as const },
  { komoditas: "Beras Medium", provinsi: "Aceh", harga: 13000, medianNasional: 14000, relatifPersen: -7.14, posisi: "di bawah median" as const },
];

it("menyatakan dirinya bacaan harga, bukan bacaan pasokan", () => {
  // Surplus di produk ini berarti harga di bawah median, bukan kelebihan produksi
  // terukur. Buku besarnya sudah mencatat bahwa data produksi per provinsi tidak
  // tersedia bagi kami; kalimat ini menjaga layar dan PDF sepakat dengan itu.
  const teks = teksLanskap(LANSKAP, "Papua").join(" ");
  expect(teks).toContain("bacaan harga");
  expect(teks.toLowerCase()).not.toMatch(/kelebihan produksi|surplus produksi/);
});

it("memisahkan komoditas yang diramalkan dari yang hanya dibaca harganya", () => {
  const teks = teksLanskap(LANSKAP, "Papua").join(" ");
  expect(teks).toContain("Gula Pasir");
  expect(teks).toMatch(/tidak kami ramalkan|di luar enam/);
});

it("hanya memakai baris provinsi yang diminta", () => {
  const teks = teksLanskap(LANSKAP, "Papua").join(" ");
  expect(teks).not.toContain("Aceh");
});
```

- [ ] **Step 2: Jalankan tes untuk memastikan gagal**

Run: `npx vitest run src/lib/redistribusi/teks.test.ts`
Expected: 3 FAIL

- [ ] **Step 3: Tulis implementasi**

Tambahkan `teksLanskap` di `teks.ts`. Isi yang harus dibawa:

1. Komoditas mana di provinsi itu yang harganya di bawah median nasional dan mana yang di atas, dengan selisih persennya.
2. Kalimat tetap: ini **bacaan harga, bukan bacaan pasokan** — harga di bawah median adalah bukti kelimpahan setempat, bukan pengukurannya, karena data produksi per provinsi tidak tersedia.
3. Penanda mana dari delapan komoditas itu yang kita ramalkan dan mana yang hanya dibaca harganya. Daging Sapi dan Gula Pasir termasuk yang kedua.

Panggil dari `report.ts` di kerangka **pedagang**, sebagai bagian bernomor baru, dan geser penomoran bagian sesudahnya.

- [ ] **Step 4: Jalankan tes dan bangun**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: tsc bersih, 59 lulus, build sukses

- [ ] **Step 5: Commit**

```bash
git add src/lib/redistribusi/teks.ts src/lib/redistribusi/report.ts src/lib/redistribusi/teks.test.ts
git commit -m "feat: kerangka pedagang membawa lanskap posisi harga

Menyatakan dirinya bacaan harga, bukan bacaan pasokan, dan menandai dua
komoditas yang hanya dibaca harganya tanpa diramalkan."
```

---

### Task 9: Layar — panel kesenjangan dan lanskap

**Files:**
- Create: `supplai-dev/src/components/redistribusi/kesenjangan-panel.tsx`
- Create: `supplai-dev/src/components/redistribusi/lanskap-panel.tsx`
- Modify: `supplai-dev/src/app/(dashboard)/redistribusi/page.tsx`
- Test: pemeriksaan peramban

**Interfaces:**
- Consumes: semua dari Task 5, 6, 7, 8

- [ ] **Step 1: Buat kedua panel**

`kesenjangan-panel.tsx` menampilkan tiga baris kelompok dengan tonase dan persennya, memakai `sebaranKelompok`. Kelompok bernilai nol tetap tampil. Di bawahnya, bila `ikpTanpaHarga` tidak kosong, satu baris yang menyebutkan provinsi-provinsi itu berada di luar jangkauan model.

`lanskap-panel.tsx` menampilkan delapan komoditas untuk provinsi terpilih, dengan posisi dan selisih persennya, serta penanda mana yang diramalkan.

Ikuti bentuk `buku-besar-panel.tsx` yang sudah ada — baca berkas itu lebih dulu dan tiru cara ia menyusun kartu, memakai `<Penjelas>`, dan memberi jarak.

- [ ] **Step 2: Pasang keduanya di halaman**

Di `src/app/(dashboard)/redistribusi/page.tsx`, tempatkan keduanya dalam barisnya sendiri. Halaman ini pernah mengalami regresi tata letak ketika sebuah panel disisipkan ke baris yang sudah terisi dan memotong tabel rute — beri masing-masing barisnya sendiri.

Tambahkan `<Penjelas>` di bawah panel kesenjangan yang menyebut sepertiga dihitung atas seluruh 38 provinsi, bukan atas 34 yang punya harga.

- [ ] **Step 3: Bangun dan periksa di peramban**

```bash
cd /home/jupyter/kawa-temp/hackathon_phase2/supplai-dev
npx tsc --noEmit && npx vitest run && npm run build
setsid nohup npx next start -p 3100 > /tmp/p2.log 2>&1 < /dev/null &
```

Buka `http://localhost:3100/redistribusi` dan **klik ketiga postur**. Halaman ini hanya merender tab yang aktif; memeriksa satu postur melewatkan sisanya, dan itu jebakan yang sudah dua kali membuat pemeriksaan di proyek ini melaporkan bersih secara keliru. Konservatif nol rute — periksa apa yang ditampilkan panel kesenjangan di sana.

Laporkan apa yang kamu lihat pada masing-masing postur, bukan kesimpulan bahwa semuanya baik.

- [ ] **Step 4: Hentikan server**

```bash
for p in $(pgrep -f "next-server" | grep -vx "$$"); do kill -9 "$p"; done
```

- [ ] **Step 5: Commit**

```bash
git add src/components/redistribusi/ "src/app/(dashboard)/redistribusi/page.tsx"
git commit -m "feat: panel kesenjangan dan lanskap di layar"
```

---

## Self-Review

**Cakupan spec.** Bagian 1 (fondasi data & tingkatan) → Task 1, 2, 3, 5, 6, 7, 9. Bagian 4 (lanskap komoditas) → Task 4, 5, 8, 9. Pemetaan PDF untuk keduanya → Task 7 dan 8. Buku besar → Task 3. Yang tidak dicakup rencana ini — Bagian 3 dan Bagian 5.2–5.4 — ada di Rencana 3, bukan celah.

**Konsistensi tipe.** `kelompok` bernilai `"bawah" | "tengah" | "atas"` di Python (Task 2), JSON (Task 5), dan TypeScript (Task 5, 6). `LABEL` di Python dipetakan ke `label` di JSON. `posisi` bernilai `"di bawah median" | "di atas median"` di Task 4, 5, 8. `relatif_persen` → `relatifPersen` di batas ekspor.

**Satu tes yang diganti saat self-review.** Tes awal Task 4 memeriksa `"Kopi" not in komoditas` — hampa, karena Kopi tak pernah ada di petanya. Diganti dengan tes yang menjaga hal yang benar-benar bisa salah: memakai nama seri WFP yang sudah pensiun (`Rice` alih-alih `Rice (medium quality)`) akan menghidupkan harga yang berhenti Mei 2024 dan menyajikannya sebagai posisi hari ini.

**Urutan.** Task 2 butuh Task 1; Task 5 butuh Task 2 dan 4; Task 6 butuh Task 5; Task 7 butuh Task 6; Task 8 butuh Task 5; Task 9 butuh semuanya. Task 1, 3, 4 dapat dikerjakan dalam urutan apa pun di antara mereka sendiri, tetapi eksekusinya tetap berurutan karena beberapa menyunting berkas yang sama.

**Angka harapan tes.** Pipeline 106 → 111 (Task 1) → 116 (Task 2) → 118 (Task 3) → 124 (Task 4). FE 49 → 53 (Task 6) → 56 (Task 7) → 59 (Task 8). `scripts/tests` 26 → 29 (Task 5), dengan empat kegagalan lama yang tidak disentuh. Angka ini bergeser bila sebuah ronde perbaikan menambah tes; laporkan yang benar-benar kamu dapat, jangan mengejar angkanya.
