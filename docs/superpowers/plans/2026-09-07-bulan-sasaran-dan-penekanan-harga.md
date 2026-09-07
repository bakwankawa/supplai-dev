# Bulan Sasaran & Penekanan Harga — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membuat laporan menyatakan berapa persen kenaikan harga yang ditahan rencana, dan untuk bulan apa rencana itu berlaku.

**Architecture:** Pembalikan aljabar atas penakaran elastisitas yang sudah ada di `Kebutuhan.volume_intervensi`, ditulis sebagai metode baru di kelas yang sama karena ia memerlukan konsumsi dan ε yang sudah dimuat di sana. `match.py` menuliskan hasilnya sebagai kolom baru pada `flows.parquet`, bersama bulan sasaran yang selama ini hilang. `export_web.py` meneruskannya, dan kedua laporan PDF menampilkannya. Sisa waktu dihitung saat render, bukan disimpan ke artefak.

**Tech Stack:** Python 3.11 (`/opt/conda/bin/python`), pandas, pytest, scipy.optimize.linprog · Next.js 16, TypeScript, vitest, jsPDF

**Spec:** `docs/superpowers/specs/2026-09-07-feedback-mentor-7sept-design.md`

## Global Constraints

- **Repo pipeline** berakar di `/home/jupyter/kawa-temp/hackathon_phase2/`; **repo FE** di `/home/jupyter/kawa-temp/hackathon_phase2/supplai-dev/`. `scripts/export_web.py` berada di repo FE.
- Interpreter dipanggil lewat jalur langsung: `/opt/conda/bin/python`. Jangan andalkan `conda activate`.
- **Setiap angka membawa status dasarnya.** Angka apa pun yang diturunkan dari volume mewarisi `dasar_takaran` rute itu, dan status itu ikut tampil di layar, PDF, dan narasi.
- **Tidak ada skor komposit baru.**
- **Angka Indonesia**: titik pemisah ribuan, koma desimal. Gunakan `format_id` dari `supplai/narasi.py`, jangan `f"{x:,}"`.
- **Blok fakta narasi membawa string pra-format, tidak pernah float mentah.** Pemverifikasi angka di `narasi.py` menyalin persis tanpa toleransi pembulatan.
- **PDF permukaan utama.** Sebuah task yang temuannya baru ada di layar belum selesai.
- Baseline sebelum mulai: **90 tes pipeline lulus**, **33 tes FE lulus**.

---

### Task 1: `Kebutuhan.dampak_harga()` — pembalikan elastisitas

**Files:**
- Modify: `supplai/kebutuhan.py` (tambah metode setelah `volume_intervensi`, sekitar baris 131)
- Test: `tests/test_kebutuhan.py`

**Interfaces:**
- Consumes: `Kebutuhan.konsumsi_bulanan(komoditas) -> pd.Series`, `Kebutuhan.epsilon_untuk(komoditas, provinsi) -> tuple[float, float, str]` (mengembalikan `eps, se, sumber`)
- Produces: `Kebutuhan.dampak_harga(komoditas: str, volume_ton: pd.Series, kenaikan_persen: pd.Series) -> pd.DataFrame` berindeks provinsi dengan kolom `ditahan_pp`, `ditahan_ci_bawah`, `ditahan_ci_atas`, `kenaikan_persen`, `fraksi_ditahan`, `epsilon_sumber`

- [ ] **Step 1: Tulis tes yang gagal**

Tambahkan di akhir `tests/test_kebutuhan.py`:

```python
def test_price_impact_inverts_the_sizing_exactly():
    """volume_intervensi lalu dampak_harga harus mengembalikan kenaikan semula.
    Sifat ini yang membuat metriknya bukan angka baru, melainkan angka lama
    yang diucapkan dari arah lain."""
    naik = pd.Series({"Jawa Barat": 4.0, "Riau": 2.5})
    vol = K.volume_intervensi("Telur Ayam", naik)
    back = K.dampak_harga("Telur Ayam", vol["volume_ton"], naik)
    for prov in naik.index:
        assert abs(back.loc[prov, "ditahan_pp"] - naik[prov]) < 1e-6


def test_price_impact_interval_is_not_copied_from_the_sizing_interval():
    """epsilon MEMBAGI di sini, sedangkan di volume_intervensi ia mengalikan.
    Jadi batas yang dibangun dari eps+1,96se adalah batas BAWAH. Menyalin pola
    dari volume_intervensi menghasilkan selang terbalik yang tetap masuk akal
    dilihat sekilas."""
    naik = pd.Series({"Jawa Barat": 20.0})
    vol = pd.Series({"Jawa Barat": 50.0})
    r = K.dampak_harga("Telur Ayam", vol, naik).loc["Jawa Barat"]
    # pastikan kita berada di wilayah tanpa pemotongan, kalau tidak tes ini hampa
    assert r["ditahan_pp"] < r["kenaikan_persen"]
    assert r["ditahan_ci_bawah"] < r["ditahan_pp"] < r["ditahan_ci_atas"]


def test_price_impact_cannot_exceed_the_rise_it_was_sized_against():
    """Rencana tidak bisa menahan lebih dari kenaikan yang jadi dasar
    penakarannya. Volume yang mustahil besar dipotong, bukan dilaporkan."""
    naik = pd.Series({"Riau": 1.0})
    huge = pd.Series({"Riau": 1_000_000.0})
    r = K.dampak_harga("Telur Ayam", huge, naik).loc["Riau"]
    assert r["ditahan_pp"] == pytest.approx(1.0)
    assert r["fraksi_ditahan"] == pytest.approx(1.0)


def test_price_impact_drops_provinces_it_has_no_consumption_for():
    """Provinsi tak dikenal dijatuhkan, bukan ditebak dengan koefisien nasional."""
    d = K.dampak_harga(
        "Telur Ayam", pd.Series({"Wakanda": 10.0}), pd.Series({"Wakanda": 5.0})
    )
    assert d.empty
```

- [ ] **Step 2: Jalankan tes untuk memastikan gagal**

Run: `cd /home/jupyter/kawa-temp/hackathon_phase2 && /opt/conda/bin/python -m pytest tests/test_kebutuhan.py -k price_impact -v`
Expected: 4 FAIL dengan `AttributeError: 'Kebutuhan' object has no attribute 'dampak_harga'`

- [ ] **Step 3: Tulis implementasi minimal**

Sisipkan di `supplai/kebutuhan.py` tepat setelah metode `volume_intervensi` berakhir (sebelum `def anggaran_nasional`):

```python
    def dampak_harga(
        self,
        komoditas: str,
        volume_ton: pd.Series,
        kenaikan_persen: pd.Series,
    ) -> pd.DataFrame:
        """Poin persen kenaikan yang ditahan oleh volume yang dikirim.

        Kebalikan `volume_intervensi`:

            ditahan_pp = volume / (eps * konsumsi) * 100

        dipotong pada kenaikan yang diprediksi, karena sebuah rencana tidak
        dapat menahan lebih dari kenaikan yang menjadi dasar penakarannya.

        SELANGNYA TERBALIK terhadap `volume_intervensi`. Di sana eps mengalikan;
        di sini eps membagi. Elastisitas yang lebih besar berarti dampak harga
        per ton yang lebih KECIL, sehingga batas bawah dampak berasal dari
        eps + 1,96*se dan batas atasnya dari eps - 1,96*se. Menyalin pola dari
        volume_intervensi menghasilkan selang terbalik yang tetap terlihat wajar.
        """
        q = self.konsumsi_bulanan(komoditas)
        rows = {}
        for prov, vol in volume_ton.items():
            if prov not in q.index:
                continue
            konsumsi = float(q[prov])
            if konsumsi <= 0:
                continue
            eps, se, src = self.epsilon_untuk(komoditas, prov)
            naik = max(float(kenaikan_persen.get(prov, 0.0)), 0.0)
            vol = max(float(vol), 0.0)

            def ditahan(e: float) -> float:
                if e <= 0:
                    return naik
                return min(vol / (e * konsumsi) * 100.0, naik)

            titik = ditahan(eps)
            rows[prov] = {
                "ditahan_pp": titik,
                "ditahan_ci_bawah": ditahan(eps + 1.96 * se),
                "ditahan_ci_atas": ditahan(max(eps - 1.96 * se, 1e-9)),
                "kenaikan_persen": naik,
                "fraksi_ditahan": (titik / naik) if naik > 0 else 0.0,
                "epsilon_sumber": src,
            }
        return pd.DataFrame.from_dict(rows, orient="index")
```

- [ ] **Step 4: Jalankan tes untuk memastikan lulus**

Run: `cd /home/jupyter/kawa-temp/hackathon_phase2 && /opt/conda/bin/python -m pytest tests/ -q`
Expected: 94 passed

- [ ] **Step 5: Commit**

```bash
cd /home/jupyter/kawa-temp/hackathon_phase2
git add supplai/kebutuhan.py tests/test_kebutuhan.py
git commit -m "feat: dampak_harga membalik penakaran elastisitas jadi persen harga

Selangnya terbalik terhadap volume_intervensi karena epsilon membagi, bukan
mengalikan. Batas bawah dampak berasal dari eps+1,96se. Ada tesnya sendiri,
karena selang yang tersalin terbalik tetap terlihat wajar.

Claude-Session: https://claude.ai/code/session_01AB4ghSXJctvGS2kUYLFALy"
```

---

### Task 2: Ganti nama `hemat_rp` menjadi `marjin_harapan_rp`

Rename ini menyeberangi dua repo sekaligus supaya tidak ada momen ketika nama lama dan baru hidup bersama.

**Files:**
- Modify: `supplai/match.py:248-252` (definisi `flows["hemat_rp"]`)
- Modify: `supplai-dev/scripts/export_web.py:210`
- Modify: `supplai-dev/src/lib/types.ts:103`
- Test: `tests/test_match_sizing.py`

**Interfaces:**
- Produces: kolom `marjin_harapan_rp` pada `flows.parquet`; field `marjinHarapanRp` pada tipe rute FE. Kolom `hemat_rp` dan field `hematRp` **tidak lagi ada**.

- [ ] **Step 1: Tulis tes yang gagal**

Tambahkan di akhir `tests/test_match_sizing.py`:

```python
def test_margin_column_is_named_for_what_it_measures():
    """Isinya marjin pedagang terhadap harga yang SUDAH naik, bukan penghematan.
    Nama lama mengundang label "Hemat" di layar untuk angka yang bukan hemat."""
    fl = pd.read_parquet("artifacts/flows.parquet")
    assert "marjin_harapan_rp" in fl.columns
    assert "hemat_rp" not in fl.columns
```

- [ ] **Step 2: Jalankan tes untuk memastikan gagal**

Run: `cd /home/jupyter/kawa-temp/hackathon_phase2 && /opt/conda/bin/python -m pytest tests/test_match_sizing.py -k margin_column -v`
Expected: FAIL — `assert 'marjin_harapan_rp' in [...]`

- [ ] **Step 3: Ganti nama di ketiga tempat**

Di `supplai/match.py`, ganti `flows["hemat_rp"] = (` menjadi `flows["marjin_harapan_rp"] = (`.

Di `supplai-dev/scripts/export_web.py` baris 210, ganti:

```python
                       "hematRp": round(float(r.hemat_rp))})
```

menjadi:

```python
                       "marjinHarapanRp": round(float(r.marjin_harapan_rp))})
```

Di `supplai-dev/src/lib/types.ts` baris 103, ganti `hematRp: number` menjadi:

```typescript
  /** Marjin pedagang terhadap harga tujuan yang sudah naik, dikurangi ongkos
   *  angkut. Bukan penghematan: ia keuntungan yang diharapkan bila kenaikan
   *  yang diprediksi benar-benar terjadi. */
  marjinHarapanRp: number
```

- [ ] **Step 4: Bangun ulang artefak dan jalankan tes**

```bash
cd /home/jupyter/kawa-temp/hackathon_phase2
/opt/conda/bin/python rebuild_plan.py
/opt/conda/bin/python -m pytest tests/ -q
cd supplai-dev && npx tsc --noEmit && npm test
```
Expected: 95 passed (pipeline), tsc bersih, 33 passed (FE)

- [ ] **Step 5: Commit**

```bash
cd /home/jupyter/kawa-temp/hackathon_phase2
git add supplai/match.py tests/test_match_sizing.py
git commit -m "fix: hemat_rp diganti nama jadi marjin_harapan_rp

Isinya (harga_tujuan naik - harga_asal) x volume - ongkos: marjin pedagang
terhadap harga yang sudah naik, bukan penghematan. Ia sudah mengalir ke
types.ts tanpa pernah dirender, menunggu seseorang melabelinya 'Hemat'.

Claude-Session: https://claude.ai/code/session_01AB4ghSXJctvGS2kUYLFALy"
cd supplai-dev
git add scripts/export_web.py src/lib/types.ts
git commit -m "fix: ikuti penggantian nama marjin_harapan_rp dari pipeline

Claude-Session: https://claude.ai/code/session_01AB4ghSXJctvGS2kUYLFALy"
```

---

### Task 3: `match.py` menuliskan kolom dampak harga ke flows

**Files:**
- Modify: `supplai/match.py` (setelah blok `flows["marjin_harapan_rp"]`, sebelum blok `kecukupan_persen`)
- Test: `tests/test_match_sizing.py`

**Interfaces:**
- Consumes: `Kebutuhan.dampak_harga(...)` dari Task 1
- Produces: kolom `ditahan_pp`, `ditahan_ci_bawah`, `ditahan_ci_atas`, `fraksi_ditahan` pada `flows.parquet`

- [ ] **Step 1: Tulis tes yang gagal**

```python
def test_flows_carry_the_price_impact_of_each_route():
    fl = pd.read_parquet("artifacts/flows.parquet")
    for c in ["ditahan_pp", "ditahan_ci_bawah", "ditahan_ci_atas", "fraksi_ditahan"]:
        assert c in fl.columns
    s = fl[fl.postur == "seimbang"]
    assert (s.ditahan_pp >= 0).all()
    assert (s.ditahan_pp <= s.prediksi_kenaikan + 1e-6).all()
    assert (s.fraksi_ditahan <= 1.0 + 1e-6).all()


def test_impact_interval_survives_the_trip_through_the_solver():
    """Urutan selang harus tetap benar setelah melewati agregasi per rute.
    Diuji di sini juga, bukan hanya di test_kebutuhan, karena inilah bentuk
    yang benar-benar sampai ke PDF."""
    fl = pd.read_parquet("artifacts/flows.parquet")
    assert (fl.ditahan_ci_bawah <= fl.ditahan_pp + 1e-9).all()
    assert (fl.ditahan_pp <= fl.ditahan_ci_atas + 1e-9).all()
```

- [ ] **Step 2: Jalankan tes untuk memastikan gagal**

Run: `/opt/conda/bin/python -m pytest tests/test_match_sizing.py -k "price_impact_of_each_route or interval_survives" -v`
Expected: 2 FAIL — kolom tidak ada

- [ ] **Step 3: Tulis implementasi**

Di `supplai/match.py`, tepat setelah blok yang mendefinisikan `flows["marjin_harapan_rp"]`, sisipkan:

```python
    # Dampak harga per tujuan. Dihitung atas volume yang BENAR-BENAR dikirim ke
    # tiap tujuan, bukan atas kebutuhan terukurnya: yang menekan harga adalah
    # barang yang datang, bukan barang yang seharusnya datang.
    terkirim = flows.groupby("ke")["volume_ton"].sum()
    naik_tujuan = flows.groupby("ke")["prediksi_kenaikan"].first()
    dmp = kebutuhan.dampak_harga(komoditas, terkirim, naik_tujuan)
    for kol in ["ditahan_pp", "ditahan_ci_bawah", "ditahan_ci_atas", "fraksi_ditahan"]:
        flows[kol] = flows["ke"].map(dmp[kol]) if not dmp.empty else 0.0
```

- [ ] **Step 4: Bangun ulang dan jalankan tes**

```bash
cd /home/jupyter/kawa-temp/hackathon_phase2
/opt/conda/bin/python rebuild_plan.py
/opt/conda/bin/python -m pytest tests/ -q
```
Expected: 97 passed

- [ ] **Step 5: Commit**

```bash
git add supplai/match.py tests/test_match_sizing.py
git commit -m "feat: flows membawa dampak harga tiap rute

Dihitung atas volume yang benar-benar dikirim ke tiap tujuan, bukan atas
kebutuhan terukurnya -- yang menekan harga adalah barang yang datang.

Claude-Session: https://claude.ai/code/session_01AB4ghSXJctvGS2kUYLFALy"
```

---

### Task 4: `match.py` membawa bulan sasaran ke flows

**Files:**
- Modify: `supplai/match.py` (fungsi `build_plan`, blok penyusunan `flows`)
- Test: `tests/test_match_sizing.py`

**Interfaces:**
- Consumes: `artifacts/forecast.parquet` kolom `bulan_prediksi` dan `horizon_bulan`
- Produces: kolom `bulan_prediksi` (string `YYYY-MM-DD`) dan `horizon_bulan` (int) pada `flows.parquet`

- [ ] **Step 1: Tulis tes yang gagal**

```python
def test_plan_says_which_month_it_is_for():
    """Rencana tanpa bulan sasaran bisa dieksekusi terlambat, dan kesalahan itu
    akan terlihat sebagai kesalahan alatnya. Mentor meminta 'rekomendasi daerah
    ini, bulan ini'; kolom bulannya justru yang selama ini tidak ada."""
    fl = pd.read_parquet("artifacts/flows.parquet")
    assert "bulan_prediksi" in fl.columns
    assert "horizon_bulan" in fl.columns
    assert fl.bulan_prediksi.notna().all()
    fc = pd.read_parquet("artifacts/forecast.parquet")
    assert set(fl.bulan_prediksi.astype(str)) <= set(fc.bulan_prediksi.astype(str))
```

- [ ] **Step 2: Jalankan tes untuk memastikan gagal**

Run: `/opt/conda/bin/python -m pytest tests/test_match_sizing.py -k which_month -v`
Expected: FAIL — `assert 'bulan_prediksi' in [...]`

- [ ] **Step 3: Tulis implementasi**

Di `supplai/match.py`, di dalam `build_plan`, tepat setelah `flows` selesai dibentuk dari hasil solver (di dekat blok yang menetapkan `flows["dasar_takaran"]`), sisipkan:

```python
    # Bulan yang diramal ikut rencana. Tanpa ini PDF tidak bisa menyebut untuk
    # bulan apa ia berlaku, dan pembacanya tidak punya cara mengetahui bahwa
    # jendela tindakannya sudah lewat.
    f_kom = forecast[forecast["komoditas"] == komoditas]
    flows["bulan_prediksi"] = str(f_kom["bulan_prediksi"].iloc[0])
    flows["horizon_bulan"] = int(f_kom["horizon_bulan"].iloc[0])
```

- [ ] **Step 4: Bangun ulang dan jalankan tes**

```bash
cd /home/jupyter/kawa-temp/hackathon_phase2
/opt/conda/bin/python rebuild_plan.py
/opt/conda/bin/python -m pytest tests/ -q
```
Expected: 98 passed

- [ ] **Step 5: Commit**

```bash
git add supplai/match.py tests/test_match_sizing.py
git commit -m "feat: rencana membawa bulan sasarannya

flows.parquet tidak punya satu pun kolom waktu, padahal ramalannya menyasar
bulan tertentu. Tanpa ini PDF tidak bisa menyebut untuk bulan apa ia berlaku.

Claude-Session: https://claude.ai/code/session_01AB4ghSXJctvGS2kUYLFALy"
```

---

### Task 5: Buku besar mencatat pembalikan dan bulan sasaran

**Files:**
- Modify: `supplai/buku_besar.py` (tambah dua entri pada daftar input)
- Test: `tests/test_buku_besar.py`

**Interfaces:**
- Consumes: struktur entri buku besar yang sudah ada — dict dengan kunci `input`, `nilai`, `sumber`, `tahun`, `status`
- Produces: dua entri baru; `artifacts/buku_besar.json` bertambah dua baris

- [ ] **Step 1: Tulis tes yang gagal**

Tambahkan di `tests/test_buku_besar.py`:

```python
def test_ledger_records_the_elasticity_inversion():
    """Metrik penekanan harga adalah turunan, bukan pengukuran. Buku besar
    harus mengatakan dari mana ia berasal dan apa yang diwarisinya."""
    entri = {e["input"]: e for e in bangun_buku_besar(Kebutuhan())}
    e = entri["Dampak harga (pembalikan elastisitas)"]
    assert e["status"] == "diturunkan"
    assert "elastisitas" in e["sumber"].lower()
    assert "dasar_takaran" in e["sumber"]


def test_ledger_records_the_target_month():
    entri = {e["input"]: e for e in bangun_buku_besar(Kebutuhan())}
    assert "Bulan sasaran rencana" in entri
```

Pastikan kepala berkas memuat `from supplai.buku_besar import bangun_buku_besar` dan
`from supplai.kebutuhan import Kebutuhan`. Fungsinya bernama `bangun_buku_besar(kebutuhan)`
dan menerima satu argumen — bukan `baris()`.

- [ ] **Step 2: Jalankan tes untuk memastikan gagal**

Run: `/opt/conda/bin/python -m pytest tests/test_buku_besar.py -k "inversion or target_month" -v`
Expected: 2 FAIL — `KeyError` / `assert ... in {}`

- [ ] **Step 3: Tulis implementasi**

Tambahkan dua entri pada daftar di `supplai/buku_besar.py`, setelah entri "Ambang provinsi defisit":

```python
        {
            "input": "Dampak harga (pembalikan elastisitas)",
            "nilai": "ditahan_pp = volume / (epsilon x konsumsi) x 100, "
                     "dipotong pada kenaikan yang diprediksi",
            "sumber": "Turunan aljabar dari volume_intervensi, memakai epsilon "
                      "dan galat bakunya yang sama. Selangnya terbalik karena "
                      "epsilon membagi di sini dan mengalikan di sana. Angka ini "
                      "mewarisi dasar_takaran rutenya: bila volumenya diasumsikan, "
                      "dampak harganya juga diasumsikan.",
            "tahun": "—",
            "status": "diturunkan",
        },
        {
            "input": "Bulan sasaran rencana",
            "nilai": "bulan_prediksi dari forecast.parquet, horizon 3 bulan",
            "sumber": "Bulan yang diramal model, dibawa apa adanya. Tenggat "
                      "tindakan adalah AWAL bulan itu, bukan akhirnya: "
                      "intervensi harus terjadi sebelum bulan berjalan agar "
                      "memengaruhi harganya.",
            "tahun": "—",
            "status": "terukur",
        },
```

- [ ] **Step 4: Bangun ulang dan jalankan tes**

```bash
cd /home/jupyter/kawa-temp/hackathon_phase2
/opt/conda/bin/python rebuild_plan.py
/opt/conda/bin/python -m pytest tests/ -q
```
Expected: 100 passed

- [ ] **Step 5: Commit**

```bash
git add supplai/buku_besar.py tests/test_buku_besar.py
git commit -m "docs: buku besar mencatat pembalikan elastisitas dan bulan sasaran

Metrik penekanan harga adalah turunan, bukan pengukuran, dan ia mewarisi
dasar_takaran rutenya. Keduanya dicatat supaya bisa ditelusuri.

Claude-Session: https://claude.ai/code/session_01AB4ghSXJctvGS2kUYLFALy"
```

---

### Task 6: Blok fakta narasi membawa angka baru sebagai string pra-format

**Files:**
- Modify: `supplai/narasi.py` (fungsi `fakta_redistribusi`)
- Test: `tests/test_narasi.py`

**Interfaces:**
- Consumes: `format_id`, `format_persen` dari `supplai/narasi.py`; kolom `ditahan_pp` dan `fraksi_ditahan` dari Task 3; `bulan_prediksi` dari Task 4
- Produces: kunci `ditahan_pp`, `fraksi_ditahan`, `bulan_sasaran` pada dict fakta, semuanya **string**

- [ ] **Step 1: Tulis tes yang gagal**

```python
def test_price_impact_reaches_the_model_as_preformatted_strings(bahan):
    """Model menyalin string, tidak memformat angka. Float mentah di blok fakta
    kembali sebagai '2.11' dengan titik desimal, yang dalam konvensi Indonesia
    terbaca sebagai dua ribu seratus sebelas."""
    flows, meta = bahan
    f = narasi.fakta_redistribusi(flows, meta, "Telur Ayam", "seimbang")
    for kunci in ["ditahan_pp", "fraksi_ditahan", "bulan_sasaran"]:
        assert kunci in f
        assert isinstance(f[kunci], str)


def test_price_impact_facts_survive_the_number_verifier(bahan):
    """Setiap angka pada blok fakta harus lolos verifikasi salin-persis, karena
    itulah pagar yang mencegah model mengarang digit."""
    flows, meta = bahan
    f = narasi.fakta_redistribusi(flows, meta, "Telur Ayam", "seimbang")
    kalimat = (f"Rencana menahan {f['ditahan_pp']} poin persen "
               f"pada {f['bulan_sasaran']}.")
    assert narasi.verifikasi(kalimat, f) == []
```

Fixture `bahan` sudah ada di berkas itu dan mengembalikan `(flows, meta)`. Perhatikan
tanda tangannya: `fakta_redistribusi(flows, meta, komoditas, postur)` — **empat**
argumen, `meta` yang kedua.

- [ ] **Step 2: Jalankan tes untuk memastikan gagal**

Run: `/opt/conda/bin/python -m pytest tests/test_narasi.py -k "preformatted or survive_the_number" -v`
Expected: 2 FAIL — `KeyError: 'ditahan_pp'`

- [ ] **Step 3: Tulis implementasi**

Di `supplai/narasi.py`, di dalam `fakta_redistribusi`, tambahkan pada dict yang dikembalikan:

```python
        "ditahan_pp": format_persen(float(sub.ditahan_pp.mean())),
        "fraksi_ditahan": format_persen(float(sub.fraksi_ditahan.mean()) * 100),
        "bulan_sasaran": _label_bulan(str(sub.bulan_prediksi.iloc[0])),
```

Dan tambahkan pembantu di dekat `format_persen`:

```python
_NAMA_BULAN = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]


def _label_bulan(iso: str) -> str:
    """'2026-09-01' -> 'September 2026'. Tanpa angka, sehingga tidak ada digit
    baru yang harus diverifikasi selain tahunnya."""
    tahun, bulan = int(iso[:4]), int(iso[5:7])
    return f"{_NAMA_BULAN[bulan - 1]} {tahun}"
```

- [ ] **Step 4: Jalankan tes**

Run: `cd /home/jupyter/kawa-temp/hackathon_phase2 && /opt/conda/bin/python -m pytest tests/ -q`
Expected: 102 passed

- [ ] **Step 5: Commit**

```bash
git add supplai/narasi.py tests/test_narasi.py
git commit -m "feat: blok fakta membawa dampak harga dan bulan sasaran

Sebagai string pra-format, seperti seluruh isi blok fakta: model menyalin
string dan tidak memformat angka. Float mentah kembali dengan titik desimal,
yang dalam konvensi Indonesia terbaca sebagai ribuan.

Claude-Session: https://claude.ai/code/session_01AB4ghSXJctvGS2kUYLFALy"
```

---

### Task 7: `export_web.py` meneruskan kolom baru ke FE

**Files:**
- Modify: `supplai-dev/scripts/export_web.py:188-210` (blok penyusunan rute)
- Modify: `supplai-dev/src/lib/types.ts`
- Test: manual — jalankan ekspor dan periksa JSON keluarannya

**Interfaces:**
- Consumes: kolom `ditahan_pp`, `ditahan_ci_bawah`, `ditahan_ci_atas`, `fraksi_ditahan`, `bulan_prediksi`, `horizon_bulan` dari Task 3 dan 4
- Produces: field `ditahanPp`, `ditahanCiBawah`, `ditahanCiAtas`, `fraksiDitahan` per rute; `bulanPrediksi` dan `horizonBulan` pada `plan_meta`

- [ ] **Step 1: Tambahkan field pada blok rute**

Di `supplai-dev/scripts/export_web.py`, pada dict rute (dekat baris 199 tempat `dasarTakaran` ditulis), tambahkan:

```python
                       "ditahanPp": round(float(r.ditahan_pp), 3),
                       "ditahanCiBawah": round(float(r.ditahan_ci_bawah), 3),
                       "ditahanCiAtas": round(float(r.ditahan_ci_atas), 3),
                       "fraksiDitahan": round(float(r.fraksi_ditahan), 4),
```

Pada blok `plan_meta`, tambahkan:

```python
        "bulanPrediksi": str(fl.bulan_prediksi.iloc[0]),
        "horizonBulan": int(fl.horizon_bulan.iloc[0]),
```

`export_web.py` sudah mengangkat error bila kunci `plan_meta` hilang; jangan lemahkan penjagaan itu.

- [ ] **Step 2: Tambahkan field pada tipe FE**

Di `supplai-dev/src/lib/types.ts`, pada antarmuka rute (dekat `marjinHarapanRp` dari Task 2):

```typescript
  /** Poin persen kenaikan yang ditahan rute ini. Mewarisi dasarTakaran:
   *  bila volumenya diasumsikan, angka ini juga diasumsikan. */
  ditahanPp: number
  ditahanCiBawah: number
  ditahanCiAtas: number
  /** Bagian kenaikan terprediksi yang tertutup, 0..1 */
  fraksiDitahan: number
```

Dan pada antarmuka `plan_meta`:

```typescript
  /** Bulan yang diramal, ISO "YYYY-MM-DD". Tenggat tindakan adalah AWAL
   *  bulan ini, bukan akhirnya. */
  bulanPrediksi: string
  horizonBulan: number
```

- [ ] **Step 3: Jalankan ekspor dan periksa keluarannya**

```bash
cd /home/jupyter/kawa-temp/hackathon_phase2/supplai-dev
/opt/conda/bin/python scripts/export_web.py
/opt/conda/bin/python -c "
import json,glob
f=sorted(glob.glob('src/data/*.json'))
print([x for x in f])
"
```
Expected: ekspor selesai tanpa error

- [ ] **Step 4: Typecheck**

Run: `cd /home/jupyter/kawa-temp/hackathon_phase2/supplai-dev && npx tsc --noEmit && npm test`
Expected: tsc bersih, 33 passed

- [ ] **Step 5: Commit**

```bash
cd /home/jupyter/kawa-temp/hackathon_phase2/supplai-dev
git add scripts/export_web.py src/lib/types.ts src/data/
git commit -m "feat: teruskan dampak harga dan bulan sasaran ke FE

Claude-Session: https://claude.ai/code/session_01AB4ghSXJctvGS2kUYLFALy"
```

---

### Task 8: `waktu.ts` — sisa waktu dihitung saat render

**Files:**
- Create: `supplai-dev/src/lib/redistribusi/waktu.ts`
- Test: `supplai-dev/src/lib/redistribusi/waktu.test.ts`

**Interfaces:**
- Consumes: `plan_meta.bulanPrediksi` dari Task 7
- Produces: `jendelaWaktu(bulanPrediksi: string, sekarang: Date) -> JendelaWaktu` dengan field `bulanSasaran`, `labelBulan`, `sisaHari`, `sudahLewat`

- [ ] **Step 1: Tulis tes yang gagal**

Buat `supplai-dev/src/lib/redistribusi/waktu.test.ts`:

```typescript
import { describe, it, expect } from "vitest"
import { jendelaWaktu } from "./waktu"

describe("jendelaWaktu", () => {
  it("menghitung sampai hari pertama bulan sasaran, bukan akhirnya", () => {
    // Intervensi harus terjadi sebelum bulan berjalan agar memengaruhi harganya,
    // jadi tenggatnya awal bulan. Menghitung ke akhir bulan memberi 30 hari
    // kelonggaran yang tidak ada.
    const j = jendelaWaktu("2026-09-01", new Date("2026-08-25T00:00:00Z"))
    expect(j.sisaHari).toBe(7)
    expect(j.sudahLewat).toBe(false)
  })

  it("menandai jendela sudah lewat begitu bulan sasaran berjalan", () => {
    const j = jendelaWaktu("2026-09-01", new Date("2026-09-07T00:00:00Z"))
    expect(j.sudahLewat).toBe(true)
    expect(j.sisaHari).toBe(-6)
  })

  it("bergantung pada tanggal render, bukan pada artefak", () => {
    // Menyimpan sisa waktu ke artefak akan membekukan angka yang harus terus
    // berubah: laporan yang sama dibaca dua hari berbeda harus berbeda.
    const a = jendelaWaktu("2026-09-01", new Date("2026-08-01T00:00:00Z"))
    const b = jendelaWaktu("2026-09-01", new Date("2026-08-20T00:00:00Z"))
    expect(a.sisaHari).not.toBe(b.sisaHari)
  })

  it("memberi label bulan dalam bahasa Indonesia", () => {
    expect(jendelaWaktu("2026-09-01", new Date("2026-08-01T00:00:00Z")).labelBulan)
      .toBe("September 2026")
  })
})
```

- [ ] **Step 2: Jalankan tes untuk memastikan gagal**

Run: `cd /home/jupyter/kawa-temp/hackathon_phase2/supplai-dev && npx vitest run src/lib/redistribusi/waktu.test.ts`
Expected: FAIL — `Cannot find module './waktu'`

- [ ] **Step 3: Tulis implementasi**

Buat `supplai-dev/src/lib/redistribusi/waktu.ts`:

```typescript
const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

export interface JendelaWaktu {
  /** "2026-09" */
  bulanSasaran: string
  /** "September 2026" */
  labelBulan: string
  /** Hari tersisa sampai AWAL bulan sasaran. Negatif setelah bulan berjalan. */
  sisaHari: number
  sudahLewat: boolean
}

/**
 * Sisa waktu sampai tenggat tindakan.
 *
 * Tenggatnya adalah awal bulan sasaran, bukan akhirnya: intervensi harus
 * terjadi sebelum bulan berjalan agar memengaruhi harganya. Menghitung ke
 * akhir bulan memberi hampir sebulan kelonggaran yang tidak ada.
 *
 * `sekarang` dilewatkan, bukan diambil dari `new Date()` di dalam, supaya
 * bisa diuji dan supaya pemanggilnya jelas menyatakan bahwa angka ini milik
 * saat render — bukan milik artefaknya.
 */
export function jendelaWaktu(bulanPrediksi: string, sekarang: Date): JendelaWaktu {
  const tahun = Number(bulanPrediksi.slice(0, 4))
  const bulan = Number(bulanPrediksi.slice(5, 7))
  const tenggat = Date.UTC(tahun, bulan - 1, 1)
  const hariIni = Date.UTC(
    sekarang.getUTCFullYear(), sekarang.getUTCMonth(), sekarang.getUTCDate(),
  )
  const sisaHari = Math.round((tenggat - hariIni) / 86_400_000)
  return {
    bulanSasaran: `${tahun}-${String(bulan).padStart(2, "0")}`,
    labelBulan: `${NAMA_BULAN[bulan - 1]} ${tahun}`,
    sisaHari,
    sudahLewat: sisaHari < 0,
  }
}
```

- [ ] **Step 4: Jalankan tes**

Run: `cd /home/jupyter/kawa-temp/hackathon_phase2/supplai-dev && npm test`
Expected: 37 passed

- [ ] **Step 5: Commit**

```bash
cd /home/jupyter/kawa-temp/hackathon_phase2/supplai-dev
git add src/lib/redistribusi/waktu.ts src/lib/redistribusi/waktu.test.ts
git commit -m "feat: jendelaWaktu menghitung sisa waktu sampai tenggat tindakan

Tenggatnya awal bulan sasaran, bukan akhirnya: intervensi harus terjadi
sebelum bulan berjalan. Tanggal dilewatkan sebagai argumen, bukan diambil
di dalam, supaya jelas angka ini milik saat render dan bukan milik artefak.

Claude-Session: https://claude.ai/code/session_01AB4ghSXJctvGS2kUYLFALy"
```

---

### Task 9: `analysis.ts` meringkas dampak harga satu rencana

**Files:**
- Modify: `supplai-dev/src/lib/redistribusi/analysis.ts`
- Test: `supplai-dev/src/lib/redistribusi/analysis.test.ts`

**Interfaces:**
- Consumes: field rute `ditahanPp`, `fraksiDitahan`, `volumeTon` dari Task 7
- Produces: `analyzeRedistribusi(data, komoditas, postur)` mengembalikan tambahan
  `dampak: { ditahanPpRata: number; fraksiRata: number }`, dan mengekspor pembantu murni
  `rataBobotVolume(rute: { volumeTon: number }[], ambil: (r) => number): number`

**Catatan penting:** `analyzeRedistribusi` **sudah** mengembalikan `terukur` dan
`diasumsikan`. Jangan menambahkan `nTerukur`/`nDiasumsikan` — itu akan menduplikasi
angka yang sudah ada, dan dua sumber untuk satu fakta adalah cara mereka mulai
berselisih. Pemakai di Task 11 memakai `a.terukur` dan `a.diasumsikan` yang sudah ada.

- [ ] **Step 1: Tulis tes yang gagal**

Tambahkan di `supplai-dev/src/lib/redistribusi/analysis.test.ts`:

```typescript
it("membobot dengan volume, bukan merata-rata baris", () => {
  // Rata-rata baris memberi bobot sama pada rute 5 ton dan rute 500 ton.
  // Yang menekan harga adalah tonasenya, bukan banyaknya baris.
  const rute = [
    { volumeTon: 100, nilai: 4 },
    { volumeTon: 1, nilai: 0 },
  ];
  expect(rataBobotVolume(rute, (r) => r.nilai)).toBeCloseTo(400 / 101, 6);
});

it("mengembalikan nol untuk rencana kosong, bukan NaN", () => {
  // Pembagian dengan total bobot nol menghasilkan NaN, yang lolos setiap
  // pemeriksaan rentang dan muncul di PDF sebagai "NaN%".
  expect(rataBobotVolume([], (r) => r.nilai)).toBe(0);
});

it("dampak rata berada di antara nilai rute terkecil dan terbesar", () => {
  for (const a of all("seimbang")) {
    if (a.routes.length === 0) continue;
    const lo = Math.min(...a.routes.map((r) => r.ditahanPp));
    const hi = Math.max(...a.routes.map((r) => r.ditahanPp));
    expect(a.dampak.ditahanPpRata).toBeGreaterThanOrEqual(lo - 1e-9);
    expect(a.dampak.ditahanPpRata).toBeLessThanOrEqual(hi + 1e-9);
  }
});
```

Tambahkan `rataBobotVolume` pada baris import yang sudah ada:
`import { analyzeRedistribusi, ONGKOS_RP_PER_KG_KM, rataBobotVolume } from "./analysis";`

- [ ] **Step 2: Jalankan tes untuk memastikan gagal**

Run: `npx vitest run src/lib/redistribusi/analysis.test.ts`
Expected: FAIL — `rataBobotVolume is not a function`

- [ ] **Step 3: Tulis implementasi**

Di `supplai-dev/src/lib/redistribusi/analysis.ts`, tambahkan pembantu yang diekspor:

```typescript
/**
 * Rata-rata dibobot tonase.
 *
 * Rata-rata baris memberi bobot sama pada rute 5 ton dan rute 500 ton; yang
 * menekan harga adalah tonasenya. Pembobotan ini juga membuat dua rute menuju
 * provinsi yang sama — yang membawa ditahanPp identik — tidak menggeser hasil
 * hanya karena mereka dua baris.
 *
 * Rencana kosong mengembalikan 0, bukan NaN: NaN lolos setiap pemeriksaan
 * rentang dan muncul di PDF sebagai "NaN%".
 */
export function rataBobotVolume<T extends { volumeTon: number }>(
  rute: T[],
  ambil: (r: T) => number,
): number {
  const total = rute.reduce((s, r) => s + r.volumeTon, 0);
  if (total <= 0) return 0;
  return rute.reduce((s, r) => s + ambil(r) * r.volumeTon, 0) / total;
}
```

Lalu di dalam `analyzeRedistribusi`, sebelum `return`:

```typescript
  const dampak = {
    ditahanPpRata: rataBobotVolume(routes, (r) => r.ditahanPp),
    fraksiRata: rataBobotVolume(routes, (r) => r.fraksiDitahan),
  };
```

Tambahkan `dampak` pada objek yang dikembalikan dan pada tipe `RedistribusiAnalysis`.

- [ ] **Step 4: Jalankan tes**

Run: `cd /home/jupyter/kawa-temp/hackathon_phase2/supplai-dev && npx tsc --noEmit && npm test`
Expected: tsc bersih, 40 passed

- [ ] **Step 5: Commit**

```bash
git add src/lib/redistribusi/analysis.ts src/lib/redistribusi/analysis.test.ts
git commit -m "feat: ringkasan dampak harga dibobot volume

Rata-rata baris memberi bobot sama pada rute 5 ton dan 500 ton. Rencana kosong
mengembalikan 0, bukan NaN -- NaN lolos setiap pemeriksaan rentang dan muncul
di PDF sebagai NaN%.

Claude-Session: https://claude.ai/code/session_01AB4ghSXJctvGS2kUYLFALy"
```


---

### Task 10: Kepala kedua PDF menyebut bulan sasaran dan sisa waktu

**Files:**
- Modify: `supplai-dev/src/lib/redistribusi/report.ts:86-92`
- Modify: `supplai-dev/src/lib/prediction/report.ts` (blok kepala, dekat baris 52)
- Test: `supplai-dev/src/lib/redistribusi/report.test.ts`

**Interfaces:**
- Consumes: `jendelaWaktu()` dari Task 8; `plan_meta.bulanPrediksi` dari Task 7
- Produces: kepala laporan memuat label bulan; pernyataan pembuka bila `sudahLewat`

- [ ] **Step 1: Tulis tes yang gagal**

Tambahkan di `supplai-dev/src/lib/redistribusi/report.test.ts`:

```typescript
it("menyebut bulan sasaran di kepala laporan", () => {
  const teks = barisLaporan({ ...ANALISIS_CONTOH, bulanPrediksi: "2026-09-01" }, "pemerintah", new Date("2026-08-20T00:00:00Z")).join(" ")
  expect(teks).toContain("September 2026")
})

it("membuka dengan pernyataan ketika jendelanya sudah lewat", () => {
  // Di badan laporan, bukan catatan kaki: ia menentukan apakah laporan ini
  // masih boleh dipakai sama sekali.
  const teks = barisLaporan({ ...ANALISIS_CONTOH, bulanPrediksi: "2026-09-01" }, "pemerintah", new Date("2026-09-07T00:00:00Z")).join(" ")
  expect(teks.toLowerCase()).toContain("jendela")
  expect(teks.toLowerCase()).toContain("lewat")
})
```

`report.ts` saat ini hanya mengekspor `createRedistribusiReport(a, pembaca)` yang langsung
menggambar ke jsPDF, sehingga tidak ada yang bisa diuji. Sebelum tes ini bisa lulus,
pisahkan dulu penyusun teksnya:

```typescript
/** Baris teks laporan, terpisah dari penggambarannya, supaya isinya dapat diuji
 *  tanpa menjalankan jsPDF. */
export function barisLaporan(
  a: RedistribusiAnalysis,
  pembaca: Pembaca,
  sekarang: Date,
): string[] { /* ... */ }

export function createRedistribusiReport(
  a: RedistribusiAnalysis,
  pembaca: Pembaca,
  sekarang: Date = new Date(),
) { /* memanggil barisLaporan lalu menggambarnya */ }
```

`sekarang` diberi nilai bawaan `new Date()` **hanya** di pembungkus jsPDF; `barisLaporan`
mewajibkannya, supaya tidak ada jalur yang diam-diam membaca jam saat diuji. Rute API
`src/app/api/redistribution-report/route.ts` tidak perlu berubah.

- [ ] **Step 2: Jalankan tes untuk memastikan gagal**

Run: `npx vitest run src/lib/redistribusi/report.test.ts`
Expected: FAIL

- [ ] **Step 3: Tulis implementasi**

Di `supplai-dev/src/lib/redistribusi/report.ts`, setelah `paragraph` yang menampilkan komoditas dan postur (sekitar baris 87), sisipkan:

```typescript
  const jendela = jendelaWaktu(a.bulanPrediksi, sekarang)
  paragraph(
    `Berlaku untuk ${jendela.labelBulan} · Dibuat ${sekarang.toLocaleDateString("id-ID")}`,
    9, muted,
  )
  if (jendela.sudahLewat) {
    paragraph(
      `Jendela tindakan rencana ini sudah lewat ${Math.abs(jendela.sisaHari)} hari lalu. ` +
      `Intervensi harus terjadi sebelum ${jendela.labelBulan} berjalan agar memengaruhi ` +
      `harganya. Rencana ini perlu dibangun ulang dari ramalan terbaru sebelum dipakai.`,
      10,
    )
  } else {
    paragraph(
      `Sisa waktu sampai tenggat: ${jendela.sisaHari} hari. Tenggatnya awal ` +
      `${jendela.labelBulan}, bukan akhirnya.`,
      9, muted,
    )
  }
```

Tambahkan `import { jendelaWaktu } from "./waktu"` di kepala berkas, dan teruskan `sekarang: Date` sebagai parameter fungsi laporan — jangan panggil `new Date()` di dalam, supaya bisa diuji.

Lakukan penyisipan setara pada `src/lib/prediction/report.ts`.

- [ ] **Step 4: Jalankan tes dan bangun**

Run: `cd /home/jupyter/kawa-temp/hackathon_phase2/supplai-dev && npx tsc --noEmit && npm test && npm run build`
Expected: tsc bersih, 41 passed, build OK

- [ ] **Step 5: Commit**

```bash
git add src/lib/redistribusi/report.ts src/lib/prediction/report.ts src/lib/redistribusi/report.test.ts
git commit -m "feat: kedua PDF menyebut bulan sasaran dan sisa waktu

Pernyataan jendela-lewat ada di badan laporan, bukan catatan kaki: ia
menentukan apakah laporan itu masih boleh dipakai sama sekali.

Claude-Session: https://claude.ai/code/session_01AB4ghSXJctvGS2kUYLFALy"
```

---

### Task 11: Bagian penekanan harga pada kerangka pemerintah

**Files:**
- Modify: `supplai-dev/src/lib/redistribusi/report.ts` (kerangka pemerintah, setelah "01 Ringkasan")
- Test: `supplai-dev/src/lib/redistribusi/report.test.ts`

**Interfaces:**
- Consumes: `analisis.dampak` dari Task 9; `a.terukur` / `a.diasumsikan` yang **sudah ada**; `ton`, `persen` dari `src/lib/redistribusi/format.ts`
- Produces: bagian PDF bernomor baru; penomoran bagian sesudahnya bergeser satu

- [ ] **Step 1: Tulis tes yang gagal**

```typescript
it("menyatakan penekanan harga sebagai selisih terhadap tanpa-intervensi", () => {
  // "Menekan harga X%" tanpa pembanding terbaca sebagai penurunan mutlak.
  // Yang benar: harga berakhir X% lebih rendah dibanding tanpa intervensi.
  const teks = barisLaporan(ANALISIS_CONTOH, "pemerintah", new Date("2026-08-20T00:00:00Z")).join(" ")
  expect(teks).toContain("tanpa intervensi")
})

it("memisahkan berapa rute terukur dan berapa diasumsikan", () => {
  const teks = barisLaporan(ANALISIS_CONTOH, "pemerintah", new Date("2026-08-20T00:00:00Z")).join(" ")
  expect(teks).toContain("diasumsikan")
})
```

- [ ] **Step 2: Jalankan tes untuk memastikan gagal**

Run: `npx vitest run src/lib/redistribusi/report.test.ts`
Expected: 2 FAIL

- [ ] **Step 3: Tulis implementasi**

Di kerangka pemerintah `report.ts`, setelah bagian "01 Ringkasan", sisipkan dan geser penomoran bagian setelahnya:

```typescript
    heading("02  Penekanan harga")
    paragraph(
      `Rencana ini menahan rata-rata ${persen(a.dampak.ditahanPpRata)} poin persen ` +
      `dari kenaikan yang diprediksi, atau sekitar ${persen(a.dampak.fraksiRata * 100)} ` +
      `dari kenaikan itu. Artinya harga di provinsi tujuan berakhir sekitar ` +
      `${persen(a.dampak.ditahanPpRata)} lebih rendah dibanding tanpa intervensi — ` +
      `bukan turun sebesar itu dari harga hari ini.`,
    )
    paragraph(
      `Angka ini mewarisi dasar takaran rutenya: ${a.terukur} rute bersandar ` +
      `pada kebutuhan terukur, ${a.diasumsikan} rute pada heuristik sisi ` +
      `pasokan. Untuk rute yang diasumsikan, dampak harganya juga diasumsikan.`,
      9, muted,
    )
    paragraph(
      `Efek harga berlaku atas seluruh konsumsi bulanan provinsi tujuan, bukan hanya ` +
      `atas tonase yang dikirim. Itulah sebabnya volume kecil dapat menggeser harga ` +
      `untuk semua pembeli, dan itu pula asumsi terbesar dalam angka di atas.`,
      9, muted,
    )
```

- [ ] **Step 4: Jalankan tes dan bangun**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: tsc bersih, 43 passed, build OK

- [ ] **Step 5: Commit**

```bash
git add src/lib/redistribusi/report.ts src/lib/redistribusi/report.test.ts
git commit -m "feat: kerangka pemerintah menyatakan penekanan harga

Dinyatakan sebagai selisih terhadap tanpa-intervensi, bukan penurunan mutlak,
dan dipisah menurut dasar takaran. Asumsi terbesarnya -- efek harga berlaku
atas seluruh konsumsi provinsi -- diucapkan lebih dulu, bukan menunggu ditanya.

Claude-Session: https://claude.ai/code/session_01AB4ghSXJctvGS2kUYLFALy"
```

---

### Task 12: Kerangka pedagang menyebut marjin dengan definisinya

**Files:**
- Modify: `supplai-dev/src/lib/redistribusi/report.ts` (kerangka pedagang, bagian "02 Selisih harga terhadap ongkos angkut")
- Test: `supplai-dev/src/lib/redistribusi/report.test.ts`

**Interfaces:**
- Consumes: field rute `marjinHarapanRp` dari Task 2
- Produces: kolom marjin berlabel benar plus kalimat definisinya

- [ ] **Step 1: Tulis tes yang gagal**

```typescript
it("menyebut marjin sebagai harapan terhadap harga yang sudah naik", () => {
  // Label "Hemat" pada angka ini adalah klaim yang salah: ia keuntungan
  // yang diharapkan bila kenaikan yang diprediksi benar-benar terjadi.
  const teks = barisLaporan(ANALISIS_CONTOH, "pedagang", new Date("2026-08-20T00:00:00Z")).join(" ")
  expect(teks).not.toContain("Hemat")
  expect(teks).toContain("bila kenaikan")
})
```

- [ ] **Step 2: Jalankan tes untuk memastikan gagal**

Run: `npx vitest run src/lib/redistribusi/report.test.ts`
Expected: FAIL

- [ ] **Step 3: Tulis implementasi**

Pada kerangka pedagang, di bawah tabel selisih harga:

```typescript
    paragraph(
      `Marjin harapan adalah selisih antara harga tujuan setelah kenaikan yang ` +
      `diprediksi dan harga asal hari ini, dikurangi ongkos angkut. Ia bukan ` +
      `penghematan: angka ini terwujud hanya bila kenaikan yang diprediksi ` +
      `benar-benar terjadi. Marjin negatif ditampilkan apa adanya.`,
      9, muted,
    )
```

- [ ] **Step 4: Jalankan tes dan bangun**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: tsc bersih, 44 passed, build OK

- [ ] **Step 5: Commit**

```bash
git add src/lib/redistribusi/report.ts src/lib/redistribusi/report.test.ts
git commit -m "fix: kerangka pedagang menyebut marjin dengan definisinya

Label 'Hemat' pada angka ini klaim yang salah: ia keuntungan yang diharapkan
bila kenaikan yang diprediksi benar-benar terjadi.

Claude-Session: https://claude.ai/code/session_01AB4ghSXJctvGS2kUYLFALy"
```

---

### Task 13: Layar — judul postur dan kolom tabel rute

**Files:**
- Modify: `supplai-dev/src/components/redistribusi/route-table.tsx`
- Modify: `supplai-dev/src/components/redistribusi/posture-switch.tsx` atau induk halaman `src/app/(dashboard)/redistribusi/page.tsx`
- Test: manual di peramban

**Interfaces:**
- Consumes: `analisis.dampak` dari Task 9, field rute `ditahanPp` dari Task 7, `jendelaWaktu` dari Task 8

- [ ] **Step 1: Tambahkan kolom penekanan harga pada tabel rute**

Di `route-table.tsx`, tambahkan kolom setelah `% pasar`:

```tsx
<th className="text-right">Menekan harga</th>
```

dan selnya:

```tsx
<td className="text-right tabular-nums">
  {persen(r.ditahanPp)}
  <span className="block text-[10px] text-slate-400">
    {r.dasarTakaran === "terukur" ? "terukur" : "diasumsikan"}
  </span>
</td>
```

- [ ] **Step 2: Tambahkan spanduk jendela waktu di kepala halaman**

Di halaman redistribusi, di atas tabel:

```tsx
{(() => {
  const j = jendelaWaktu(meta.bulanPrediksi, new Date())
  return (
    <div className={j.sudahLewat ? "border-l-2 border-red-500 pl-3 py-2" : "border-l-2 border-slate-300 pl-3 py-2"}>
      <p className="text-sm">
        Rencana untuk <strong>{j.labelBulan}</strong>
        {j.sudahLewat
          ? ` — jendela tindakan sudah lewat ${Math.abs(j.sisaHari)} hari lalu.`
          : ` — sisa ${j.sisaHari} hari sampai tenggat.`}
      </p>
    </div>
  )
})()}
```

- [ ] **Step 3: Bangun dan periksa di peramban**

```bash
cd /home/jupyter/kawa-temp/hackathon_phase2/supplai-dev
npx tsc --noEmit && npm test && npm run build
npm start -- -p 3000
```

Buka `http://localhost:3000/redistribusi`. Periksa: kolom baru terbaca, spanduk jendela muncul, dan **klik ketiga postur** — komponen yang hanya dirender pada tab aktif tidak akan tersapu oleh pemeriksaan satu tab.

- [ ] **Step 4: Hentikan server**

```bash
for p in $(pgrep -f "next start" ); do kill -9 "$p"; done
```

- [ ] **Step 5: Commit**

```bash
git add src/components/redistribusi/ src/app/
git commit -m "feat: layar menampilkan penekanan harga dan jendela waktu

Claude-Session: https://claude.ai/code/session_01AB4ghSXJctvGS2kUYLFALy"
```

---

## Self-Review

**Cakupan spec.** Bagian 2 (penekanan harga) → Task 1, 3, 6, 9, 11. Bagian 5.1 (bulan sasaran) → Task 4, 5, 8, 10, 13. Penggantian nama `hemat_rp` dari Bagian 2 → Task 2, 12. Pemetaan PDF untuk kedua temuan ini → Task 10, 11, 12. Buku besar → Task 5. Sisa spec (Bagian 1, 3, 4, 5.2–5.4) berada di Rencana 2 dan 3, bukan celah.

**Konsistensi tipe.** `dampak_harga` mengembalikan `ditahan_pp` / `ditahan_ci_bawah` / `ditahan_ci_atas` / `fraksi_ditahan` (Task 1); nama yang sama dipakai sebagai kolom flows (Task 3), diubah ke camelCase `ditahanPp` / `ditahanCiBawah` / `ditahanCiAtas` / `fraksiDitahan` di batas ekspor (Task 7) dan dipakai begitu di FE (Task 9, 11, 13). `marjin_harapan_rp` → `marjinHarapanRp` konsisten di Task 2, 7, 12. `jendelaWaktu` mengembalikan `labelBulan` / `sisaHari` / `sudahLewat`, dipakai dengan nama itu di Task 10 dan 13.

**Catatan bagi yang mengerjakan.** Tiga task menyebut fixture atau nama fungsi yang harus diperiksa lebih dulu di berkas yang ada (Task 5 nama pembangun baris buku besar, Task 6 fixture narasi, Task 9 fixture analisis). Perintah `grep` untuk memastikannya tertulis di dalam task masing-masing. Ini bukan placeholder: yang harus ditulis sudah pasti, hanya namanya yang harus dibaca dari kode dan bukan ditebak.

**Urutan tak boleh diacak.** Task 3 membutuhkan Task 1; Task 7 membutuhkan Task 2, 3, 4; Task 9 membutuhkan Task 7; Task 10 membutuhkan Task 8; Task 11 membutuhkan Task 9. Task 1, 2, 4, 8 dapat dikerjakan paralel.
