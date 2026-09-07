# Menjawab feedback mentor 7 September 2026

Tanggal: 2026-09-07
Status: rancangan disetujui, menunggu rencana implementasi

## Konteks

Feedback mentoring terakhir menggeser sasaran produk. Sebelumnya (29 Agustus) yang
diminta adalah ketepatan takaran, rekomendasi PDF, dan narasi yang terbaca manusia —
semuanya sudah terkirim. Yang 7 September meminta hal lain:

- Masalah utamanya kesenjangan daerah maju/berkembang/tertinggal, bukan inflasi
  sebagai gejala.
- Parameter suksesnya **harga yang turun**, bukan kelangkaan yang hilang.
- Sasarannya bisa dinyatakan sebagai "kami menekan XX% harga di daerah terpencil".
- Logistik mahal karena **ketidakpastian**, bukan jarak.
- Kapal pulang kosong, dan prediksi tiga bulan adalah yang membuatnya bisa diisi.
- KDMP adalah kendaraan pemerintah untuk rantai pasok desa.

Klarifikasi dari pemilik produk: Indonesia timur hanya satu contoh kasus, bukan
sasaran. Kerangkanya harus berbasis tingkatan daerah, bukan geografi.

## Yang sudah sesuai

| Permintaan | Keadaan |
|---|---|
| Prediksi 3 bulan jadi informasi publik | h=3 berjalan, 6 komoditas × 34 provinsi, MAPE 3,94% (h=1) |
| Rekomendasi untuk pemerintah *dan* swasta | PDF sudah punya dua framing |
| Swasta mengambil peran | marjin per rute sudah dihitung |
| Takaran tepat, tidak merusak harga pedagang | penakaran populasi, elastisitas, pagu 5% pasar |
| Rekomendasi sedetail mungkin | per provinsi, per komoditas, per bulan |

## Yang kurang

1. Metrik penekanan harga tidak pernah diucapkan, padahal mesinnya ada.
2. Tidak ada klasifikasi tingkatan daerah sama sekali.
3. Tidak ada konsep muatan balik; LP satu arah.
4. Ongkos = jarak × tarif, berlawanan dengan tesis mentor.
5. Tidak ada bacaan komoditas kuat/lemah per daerah.
6. KDMP nol penyebutan di seluruh repo — dicatat sebagai temuan, tetapi **tidak
   dikerjakan**; lihat Bukan sasaran.

## Keputusan lintas-bagian

**Setiap angka dibawa bersama status dasarnya.** `dasar_takaran` menunjukkan 57 dari
72 rute masih `diasumsikan`. Angka apa pun yang diturunkan dari volume mewarisi status
itu, dan status itu ikut tampil di layar, PDF, dan narasi.

**Tidak ada skor komposit baru.** Skor tunggal butuh bobot yang tak bisa
dipertanggungjawabkan, dan selalu mengundang nama yang melampaui definisinya.

**Nama resmi tidak dipinjam.** Kelompok terbawah tidak disebut "daerah tertinggal" —
itu sebutan resmi tingkat kabupaten dengan daftarnya sendiri (Perpres 63/2020).

**PDF adalah permukaan utama, layar yang kedua.** Atas keputusan pemilik produk, yang
dinilai adalah rekomendasi berbentuk PDF untuk pemerintah atau swasta. Karena itu tidak
ada temuan yang berhenti di dashboard: setiap bagian di bawah ini harus menyebutkan ke
bagian PDF mana ia mendarat, dan sebuah bagian dianggap belum selesai selama temuannya
baru ada di layar.

---

## Bagian 1 — Fondasi data & tingkatan daerah

### Yang masuk

`data/ikp_provinsi_2025.csv`: 38 provinsi, skor IKP resmi 0–100 dan peringkat, dengan
kepala provenans seperti `elastisitas.csv` — URL sumber, tanggal akses, cara
pengambilan, dan hasil uji konsistensi. Masuk ke buku besar sebagai input bernomor.

Rentang: 31,96 (Papua Pegunungan, peringkat 38) sampai 81,98 (Kalimantan Selatan,
peringkat 1). Arah: makin tinggi makin tahan pangan.

### Uji yang sudah dijalankan atas data itu

Data diambil lewat ekstraksi model dari portal Bapanas, jadi tidak boleh dipercaya
begitu saja. Tiga uji lulus:

1. Peringkat adalah permutasi sempurna 1..38.
2. Peringkat konsisten dengan urutan skor menurun.
3. Kode provinsi BPS valid.

Uji kedua yang paling menentukan: model yang mengarang sangat kecil kemungkinannya
menghasilkan 38 skor yang urutannya persis mereproduksi kolom peringkat terpisah.

### Yang tidak dipakai, dan mengapa

`additional data/indeks_ketahanan_pangan_provinsi_2022_2026.xlsx` **tidak** dipakai
sebagai tingkatan ketahanan pangan. Berkas itu bulanan berskala 1–3; IKP resmi
tahunan berskala 0–100 dengan Kelompok 1–6. Korelasi peringkat keduanya hanya 0,422,
dan pertentangannya menentukan:

| Provinsi | IKP resmi 2025 | Berkas bulanan |
|---|---|---|
| Papua Pegunungan | 31,96 — peringkat 38, terburuk | 2,33 — di atas median |
| Kalimantan Selatan | 81,98 — peringkat 1 | 2,08 |
| DI Yogyakarta | 77,44 — peringkat 8 | 1,92 |

Memakai berkas itu akan menerbitkan analisis kesenjangan yang menempatkan Papua
Pegunungan lebih baik daripada Kalimantan Selatan. Alasan penolakan ini dicatat di
buku besar supaya tidak diulang orang lain yang melihat berkas itu tergeletak di sana
dengan nama yang meyakinkan.

### Penamaan

Kelompok dinamai **"sepertiga terbawah/tengah/teratas IKP Bapanas 2025"**. Deskriptif,
bisa diperiksa, tidak meminjam otoritas yang bukan milik angkanya.

Sepertiga dihitung atas **seluruh 38 provinsi IKP**, bukan atas 34 yang bisa kita
pasangkan. Tingkatan adalah sifat provinsinya sendiri; kalau dihitung atas 34, kelompok
sebuah provinsi akan bergeser hanya karena cakupan data kita berubah, dan angka yang
sama akan berarti hal berbeda antar rilis. Cakupan kita dilaporkan terpisah.

### Ketidakcocokan wilayah — dinyatakan, bukan ditambal

IKP mencakup 38 provinsi; data harga kita 34. `PAPUA` dan `PAPUA BARAT` di WFP berasal
dari sebelum pemekaran 2022, sehingga empat provinsi Papua baru punya skor IKP tetapi
tidak punya data harga.

Join-nya melaporkan pasangan yang gagal secara eksplisit. Halaman kesenjangan
menyatakan bahwa sebagian provinsi dengan IKP terendah berada di luar jangkauan model.
Ini temuan yang dilaporkan, bukan cacat yang disembunyikan: alat pemerataan yang tidak
bisa melihat daerah paling rentan adalah hal yang wajib diketahui pemakainya.

### Kepadatan data timur

Indonesia timur menyumbang 12,5% observasi. Setiap provinsi tetap punya rentang penuh
2016-07 s/d 2026-06 dengan 26–27 komoditas; yang berbeda jumlah pasarnya — Maluku
Utara 2 pasar (2.659 observasi) versus Jawa Tengah 24 pasar (39.095 observasi). Jadi
kita bisa bicara tentang timur, dengan ketidakpastian lebih lebar.

---

## Bagian 2 — Metrik penekanan harga

### Rumus

`volume_intervensi` menghitung `volume = ε × kenaikan% × konsumsi`. Kebalikannya:

```
kenaikan_ditahan_pp = volume / (ε × konsumsi) × 100,  dipotong pada kenaikan terprediksi
```

Poin persen yang tertahan **adalah** penekanan harga: harga akhirnya sekian persen
lebih rendah dibanding tanpa intervensi. Klaim "menekan harga X di Y sebesar Z%" sah
selama pembandingnya disebut.

### Jebakan selang

ε berada di **penyebut**, sehingga selangnya terbalik. Batas bawah dampak berasal dari
`ε + 1,96·se`; batas atasnya dari `ε − 1,96·se`. Menyalin pola dari `volume_intervensi`
menghasilkan selang terbalik yang tetap terlihat masuk akal. Ini mendapat tes sendiri.

### Angka yang akan bisa diklaim

| Postur | Kenaikan diprediksi | Tertahan | Porsi |
|---|---|---|---|
| Seimbang | 3,56% | 2,11 poin persen | 66% |
| Aman pangan | 10,82% | 2,45 poin persen | 26% |

Kasus terkuat yang `terukur` dengan kebutuhan tertutup 100%, postur seimbang:

| Komoditas | Provinsi | Menekan | Setara |
|---|---|---|---|
| Telur Ayam | Kalimantan Tengah | 4,64% | Rp1.429/kg |
| Telur Ayam | Kalimantan Utara | 3,40% | Rp1.070/kg |
| Telur Ayam | Riau | 3,03% | Rp902/kg |
| Telur Ayam | Maluku | 2,88% | Rp1.050/kg |
| Telur Ayam | Sulawesi Tenggara | 2,86% | Rp853/kg |

Bawang Putih di DKI Jakarta 3,10% (Rp1.238/kg) berstatus `diasumsikan` dan hanya
menutup 30%, jadi memerlukan kalimat berbeda.

### Manfaat terhadap ongkos

| Postur | Ongkos logistik | Penghematan konsumen | Rasio |
|---|---|---|---|
| Seimbang | Rp2,24 miliar | Rp56,19 miliar/bulan | 25 : 1 |
| Aman pangan | Rp2,50 miliar | Rp74,90 miliar/bulan | 30 : 1 |

Satu langkah membuat angka ini besar, dan langkah itu yang akan diserang lebih dulu:
**efek harga berlaku atas seluruh konsumsi provinsi, bukan hanya ton yang dikirim.**
Itu memang inti penakaran berbasis elastisitas. Karena itu langkah ini diucapkan
lebih dulu, bukan menunggu ditanya.

Ongkos yang dihitung hanya angkut, karena barang dijual di tujuan sehingga pengadaan
kembali; perdagangannya menutup ongkosnya sendiri pada 33 dari 36 rute postur seimbang.

Postur aman pangan menutup hanya 26% karena bersiap untuk skenario p90 yang pasokannya
memang tidak cukup. Itu temuan tentang keterbatasan pasokan nasional, bukan kelemahan
metode, dan dilaporkan begitu.

### Perbaikan yang ikut

`hemat_rp` diganti nama menjadi `marjin_harapan_rp`. Definisinya

```
(harga_tujuan × (1 + prediksi_kenaikan/100) − harga_asal) × volume × 1000 − biaya_rp
```

yaitu marjin pedagang terhadap harga yang **sudah naik** — bukan penghematan. Saat ini
ia mengalir ke `src/lib/types.ts` tanpa pernah dirender, menunggu seseorang
menampilkannya dengan label "Hemat".

---

## Bagian 3 — Muatan balik & uji tesis ongkos

### Diagnosis pembuka

Rencana postur seimbang: 36 rute berarah, 1.025,7 ton, 897.063 ton-km, dan **nol
pasangan bolak-balik**. Kalau tiap rute dijalankan sebagai perjalanan khusus, seluruh
897.063 ton-km itu pulang kosong. Alat yang dibuat untuk menekan biaya logistik
merencanakan tingkat kekosongan balik 100%.

Ini diucapkan sebagai temuan tentang diri sendiri, bukan sebagai fitur.

### Struktur yang ada: rantai, bukan pulang-pergi

Enam provinsi menerima sekaligus mengirim: Bali, Bengkulu, Gorontalo, Kalimantan
Barat, Kepulauan Riau, Sulawesi Tenggara. Yang paling seimbang adalah Kepulauan Riau —
32,7 t Telur Ayam masuk dari Sumatera Selatan, 35,6 t Bawang Putih keluar ke DKI
Jakarta.

Total yang bisa dirantai: **132,2 dari 1.025,7 ton — 12,9%.**

Angka itu rendah, dan alasannya disebutkan: ia dihitung hanya atas enam komoditas yang
kita modelkan. Agregator muatan sungguhan juga melihat hasil bumi lokal. Jadi 12,9%
adalah lantai, bukan langit-langit — dan itu justru argumen bagi peran agregator yang
direkomendasikan Kemenhub sendiri.

Struktur rantai lebih setia pada kenyataan daripada pulang-pergi: trayek tol laut
berjalan melingkar dan kembali ke pelabuhan pangkal (T-1, T-2, T-3 semuanya kembali ke
Tanjung Perak).

### Yang tidak diklaim

Kita tidak punya model kendaraan. Rencana kita himpunan pengiriman, bukan himpunan
kapal. Modul memasangkan **pengiriman**, dan melaporkan ton-km yang tidak lagi butuh
reposisi kosong, dengan parameter eksplisit untuk berapa bagian kaki kosong yang
ditagihkan — asumsi ditulis sebagai parameter, bukan disembunyikan sebagai angka.

### Uji tesis "jarak bukan masalah"

LP dijalankan dengan tiga struktur ongkos, lalu rencananya dibandingkan:

| | Struktur |
|---|---|
| (a) | `biaya ∝ jarak` — sekarang, Rp2.500/ton-km |
| (b) | `biaya tetap per rute` — jarak tidak berpengaruh |
| (c) | `biaya = tetap + jarak × tarif` |

Biaya tetap pada (b) dan (c) dikalibrasi agar **total ongkos rencana sama dengan (a)**.
Tanpa itu, perbandingannya mencampur dua hal: bentuk struktur ongkos dan tingginya
tarif. Yang ingin kita ketahui hanya yang pertama — apakah *bentuknya* menggeser
rencana — jadi tingkat biayanya disamakan lebih dulu.

Yang dibandingkan: jumlah rute yang berubah, volume yang bergeser, porsi ke sepertiga
terbawah IKP, dan metrik penekanan harga.

Kalau (a) dan (b) mirip, jarak memang tidak menggerakkan rekomendasi kita — tesis
mentor terbukti pada data kita sendiri. Kalau berbeda jauh, kita laporkan bahwa jarak
menyetir rencana kita dan provinsi mana yang untung-rugi.

Alasan menguji alih-alih membongkar: kita mengetahui apakah ini penting **sebelum**
mempertaruhkan setiap angka yang sudah terbit.

---

## Bagian 4 — Lanskap komoditas, tol laut, arsitektur

### Komoditas kuat/lemah per daerah

Dua bacaan yang masing-masing bernama jelas, bukan satu skor:

1. **Tekanan harga** — perubahan 3 bulan terprediksi dengan selangnya. Terbatas pada 6
   komoditas yang dimodelkan.
2. **Posisi harga relatif** — harga kini terhadap median nasional. Tidak butuh model
   ramalan, sehingga bisa mencakup seluruh **26–27 komoditas** yang ada di data WFP.

Pembedaan cakupan keduanya dinyatakan di layar, tidak disamarkan.

Kartu per provinsi berbunyi: *"Bulan ini di Kalimantan Barat — tekanan harga tertinggi:
Bawang Putih (+n%, p10–p90); harga di bawah median nasional: A, B, C; di atas median:
D, E."* Dengan kalimat tetap: **ini bacaan harga, bukan bacaan pasokan.**

### Klaim yang diperbaiki

`src/components/landing/modules.tsx` menyatakan produk menganalisis "perubahan harga
dan **ketersediaan pasokan**". Buku besar kita sendiri mencatat sumber surplus sebagai
"Heuristik yang dinyatakan; data produksi per provinsi tidak tersedia bagi kami",
berstatus `diasumsikan`. Kalimat landing page diperbaiki agar cocok dengan buku besar.

Panel "Wilayah Surplus" mendapat `<Penjelas>` yang menyebut definisinya berbasis harga:
surplus berarti harga di bawah median nasional dan tidak diprediksi melonjak — bukan
kelebihan produksi terukur.

### Tol laut

Framing bersitasi, bukan input model. **KDMP dikeluarkan dari cakupan** atas keputusan
pemilik produk: ia tidak mengubah satu pun angka, dan data per provinsinya tidak
tersedia publik.

Tol laut tetap masuk karena ia bukti bagi Bagian 3: 107 trayek (2024) — 12 barat, 41 tengah, 54 timur. Pada 2025, dari 12 trayek
di pelabuhan pengumpul, **8 trayek bermuatan balik 0 TEUs**. Rekomendasi resmi
Kemenhub adalah lembaga agregator muatan yang menghubungkan produsen daerah dengan
pasar tujuan — peran yang membutuhkan ramalan tiga bulan yang tidak dimiliki agregator
mana pun.

### Arsitektur

Modul baru kecil dan satu tujuan, mengikuti tata letak paket yang ada:

| Modul | Tugas |
|---|---|
| `supplai/tingkatan.py` | muat IKP, tetapkan kelompok |
| `Kebutuhan.dampak_harga()` | pembalikan elastisitas — di sana karena butuh konsumsi dan ε |
| `supplai/muatan_balik.py` | perantaian pengiriman |
| `supplai/lanskap.py` | bacaan komoditas per provinsi |
| `bench_ongkos.py` | eksperimen struktur ongkos → `artifacts/uji_ongkos.json` |

`match.py` menerima satu parameter struktur ongkos yang tidak mengubah perilaku bawaan.
FE mencerminkannya di `src/lib/redistribusi/` dan komponen baru.

### Pengujian

Uji sifat, bukan uji nilai:

- `dampak_harga(volume_intervensi(x)) == x` — bolak-balik kembali ke angka semula.
- Urutan selang terbalik karena ε di penyebut.
- Perantaian tidak melebihi `min(masuk, keluar)`.
- Penugasan tingkatan stabil terhadap skor.
- Eksperimen ongkos dapat direproduksi.

Setiap angka baru yang sampai ke PDF atau layar melewati pemverifikasi angka di
`narasi.py`: string pra-format, tidak pernah float mentah.

### Urutan

Tingkatan → dampak harga → lanskap → perantaian dan eksperimen ongkos → dokumen.
Proposal ditulis paling akhir karena mengutip angka yang baru ada setelah kodenya
jalan.

---

## Permukaan pengiriman: dua laporan PDF

Laporan redistribusi sudah punya dua kerangka. Yang sekarang ada:

| Kerangka Pemerintah | Kerangka Pedagang |
|---|---|
| 01 Ringkasan | 01 Ringkasan |
| 02 Rute dan takaran | 02 Selisih harga terhadap ongkos angkut |
| 03 Dasar takaran | 03 Batasan |
| 04 Pagu anggaran | |
| 05 Asal-usul angka | |

Kerangka pedagang jelas lebih tipis, dan pekerjaan ini yang mengisinya.

### Ke mana tiap temuan mendarat

| Temuan | Pemerintah | Pedagang |
|---|---|---|
| Penekanan harga (Bagian 2) | bagian baru setelah Ringkasan: persen tertahan, Rp/kg, Rp/bulan, rasio manfaat, dipecah menurut `dasar_takaran` | disebut ringkas di Ringkasan; bukan bahasa pembeliannya |
| Marjin harapan (Bagian 2) | — | menggantikan `hemat_rp` di bagian 02, dengan definisinya tertulis |
| Kesenjangan IKP (Bagian 1) | bagian baru: sebaran rencana atas tiga kelompok IKP, plus provinsi ber-IKP terendah yang di luar jangkauan model | — |
| Muatan balik (Bagian 3) | bagian baru: diagnosis kekosongan balik dan ton-km terbuang | **bagian utama** — perantaian adalah cara pedagang menekan ongkos |
| Lanskap komoditas (Bagian 4) | — | **bagian utama** — komoditas mana di provinsi ini di bawah/atas median |
| Uji tesis ongkos (Bagian 3) | satu paragraf di Batasan: apakah jarak menyetir rencana | satu paragraf yang sama |

Pemisahannya disengaja: cerita pemerataan dan penekanan harga milik pemerintah;
cerita perantaian dan lanskap milik pedagang. Keduanya menerima keduanya, tetapi
penekanannya berbeda karena keputusannya berbeda.

Setiap angka baru di kedua PDF melewati pemverifikasi angka `narasi.py` seperti yang
sudah berlaku, dan membawa `dasar_takaran`-nya.

## Data yang dicari dan tidak ditemukan

Dicatat supaya tidak dicari ulang, dan supaya batasnya bisa dinyatakan di proposal:

| Yang dicari | Hasil |
|---|---|
| IKP resmi per provinsi | **Didapat**, tervalidasi, akan dikomit |
| Daftar trayek tol laut terbaca mesin | Tidak ada; hanya deskripsi naratif T-1..T-3 |
| KDMP per provinsi lengkap | Tidak ada; hanya 10 teratas dan 3 terbawah — lalu dikeluarkan dari cakupan |
| Data transaksi keuangan daerah | Tidak ada yang terbuka; Simkopdes tertutup |

Konsekuensinya: uji tesis ongkos memakai struktur abstrak (a)/(b)/(c), bukan frekuensi
layanan nyata.

## Bukan sasaran

- Membongkar model ongkos. Diuji lebih dulu.
- Model kendaraan atau penjadwalan kapal.
- KDMP dalam bentuk apa pun — dikeluarkan atas keputusan pemilik produk.
- Melatih ulang model ramalan atau menambah komoditas yang diramalkan.
- Menyatakan tingkatan daerah dengan sebutan resmi pemerintah.

## Pertanyaan terbuka

1. Kelompok IKP resmi 1–6 belum kita punya, hanya skor dan peringkat. Kalau kelompok
   itu bisa didapat, ia lebih baik daripada pembagian sepertiga buatan kita.
2. Berapa bagian kaki kosong yang benar-benar ditagihkan pengangkut. Sampai ada
   sumbernya, ini tetap parameter, bukan angka.
