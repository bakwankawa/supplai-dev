# Prediksi Harga dan Laporan

Halaman `/dashboard` berjudul **Prediksi Harga Komoditas**. [[Frontend Map]] dan [[Data Flow]] menjelaskan konteksnya.

## Narasi hasil model

`src/lib/prediction/analysis.ts` menjadi sumber perhitungan bersama untuk panel narasi dan PDF. Analisis mengikuti komoditas, maksimal tiga wilayah, dan rentang tanggal. Harga acuan adalah data terakhir yang teramati; prediksi akhir berasal dari bulan prediksi terakhir dalam rentang terpilih. Rata-rata antarwilayah berbobot sama, bukan volume perdagangan.

Narasi disusun dengan aturan penjelasan atas output ML yang sudah tersedia. Belum ada model bahasa generatif atau API eksternal. Penjelasan mencakup arah harga, perbedaan wilayah, ilustrasi dampak harga untuk 1 ton, pertimbangan bisnis dan kelembagaan, serta batasan model.

MAPE ditampilkan sebagai kesalahan historis horizon satu bulan, bukan `100 - MAPE` sebagai probabilitas akurasi. Arah relatif stabil memakai batas deskriptif +/-0,5%, bukan klasifikasi kedaruratan resmi.

## PDF

`GET /api/prediction-report` menerima `commodity`, satu hingga tiga parameter `region`, `start`, dan `end`. Input divalidasi di server. Generator `src/lib/prediction/report.ts` memakai jsPDF untuk teks dan grafik vektor; tidak memanggil `window.print()` atau mengambil screenshot HTML. Library PDF berada di sisi server.

Laporan berisi ringkasan, grafik historis/proyeksi, tabel prediksi bulanan, rekomendasi, asumsi biaya, metode, batasan, dan lampiran angka sumber. Data yang tidak tersedia ditandai secara eksplisit. Tanggal pembuatan laporan berbeda dari bulan acuan data model.

## Pemeriksaan

- Build production, TypeScript, dan lint modul prediksi baru berhasil.
- Tes browser memeriksa judul Indonesia, kecocokan angka narasi, unduh PDF, tampilan mobile, dan validasi input API.
- Teks PDF dibandingkan dengan data sumber; seluruh halaman contoh tiga wilayah dirender dan diperiksa.
- Contoh laporan ada di `output/pdf/contoh-laporan-prediksi-bawang-putih.pdf` pada root project.

Kembali ke [[Home]].
