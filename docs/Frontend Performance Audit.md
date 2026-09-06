# Frontend Performance Audit

Tanggal: 2 September 2026. Lihat [[Frontend Map]], [[Data Flow]], dan [[Home]].

## Metode

Build production Next.js, Chromium headless, viewport 1366×768, konteks browser baru untuk setiap URL, CPU throttling 4×. Pengukuran setelah network idle dan 1,5 detik, dilanjutkan jendela idle 5 detik. Semua delapan URL menghasilkan HTTP 200 tanpa uncaught JavaScript error. Detail alert menggunakan ALT-001 yang tersedia di data.

Ukuran di bawah adalah encodedBodySize resource script yang teramati, termasuk prefetch, dalam KB desimal. Ini satu putaran sebelum/sesudah, bukan benchmark perangkat low-end fisik. Jaringan lokal tidak disimulasikan lambat. Tes interaksi terpisah berjalan selama sebagian pengukuran setelah optimasi; angka waktu tidak dipakai untuk menyimpulkan percepatan universal.

## JavaScript yang diunduh

| Route | Sebelum KB | Sesudah KB | Pengurangan |
| --- | ---: | ---: | ---: |
| / | 188.3 | 193.9 | -3.0% |
| /login | 188.3 | 193.9 | -3.0% |
| /executive-summary | 660.5 | 319.4 | 51.6% |
| /dashboard | 660.5 | 391.0 | 40.8% |
| /heatmap | 660.5 | 268.2 | 59.4% |
| /alerts | 660.5 | 205.7 | 68.9% |
| /alerts/ALT-001 | 672.9 | 192.6 | 71.4% |
| /redistribusi | 660.5 | 234.4 | 64.5% |

JavaScript landing page sedikit bertambah karena kontrol video dan komponen gambar; penghematan utamanya adalah media serta pekerjaan idle.

## Temuan dan perbaikan

- Video hero awal 47.200.703 byte, 1920×1080, 30 fps, memiliki audio, dan autoplay. Kini default berupa gambar WebP 236.990 byte sebelum optimasi responsif Next Image. Video dimuat hanya ketika tombol putar diklik; versi 1280×720, 24 fps, tanpa audio berukuran 4.931.945 byte (turun 89,6%). Video berhenti ketika keluar viewport atau tab disembunyikan. File original masih disimpan, tetapi tidak dirujuk landing page.
- Gambar kontak 893.791 byte sebelumnya berupa CSS background dan ikut diunduh saat halaman dibuka. Kini memakai Next Image dengan lazy loading dan ukuran responsif.
- Modul landing page sebelumnya mengubah React state setiap 100 ms, termasuk ketika tidak terlihat. Kini progress memakai transform; pergantian state hanya ketika modul berubah. Rotasi berhenti ketika tidak terlihat, tab disembunyikan, atau reduced motion aktif.
- Sidebar sebelumnya mem-prefetch seluruh route dashboard: Alerts ikut mengambil chunk grafik, peta, dan halaman lain. Prefetch sidebar dimatikan; klik tetap menavigasi, dengan konsekuensi halaman berikutnya baru diunduh saat dipilih.
- Parser Markdown/GFM panel chat kini dynamic import ketika panel dibuka.
- Animasi menggambar grafik harga/bar dan garis rute yang bergerak tanpa henti dihapus. Nilai, filter, tooltip, serta rute tetap tersedia.
- requestAnimationFrame AnimatedNumber kini dibatalkan ketika komponen dilepas atau nilainya berganti.
- Import stats counter diseragamkan ke motion/react dan listener scroll navbar dibuat passive.

## Validasi

- Production build dan TypeScript berhasil.
- Delapan route dimuat tanpa uncaught JavaScript error.
- Screenshot desktop dan mobile diperiksa; landing mobile 390×844 tidak overflow horizontal.
- Tes interaksi lulus: tidak ada request video sebelum klik, video opsional dapat dimuat, video berhenti di luar viewport, tab manual dan rotasi otomatis bekerja, rotasi berhenti di luar viewport, chat dimuat saat dibuka, dan rotasi berhenti jika halaman dimuat dengan reduced motion aktif.
- Lint seluruh repository masih melaporkan 23 error dan 19 warning; build tidak sama dengan lint bersih. Temuan mencakup explicit any, JSX escaping, dan sinkronisasi state lewat effect di komponen lain.

## Beban yang masih ada

- Price Prediction tetap memerlukan Recharts dan kumpulan timeseries (~580 KiB file sumber) untuk filter lokal. Data diperlukan fitur saat ini; jika dataset membesar, pertimbangkan API per komoditas/wilayah.
- Peta redistribusi mengambil world-atlas dari CDN dan menyaring Indonesia. Aset Indonesia lokal akan mengurangi ketergantungan jaringan eksternal.
- /api/alerts diminta oleh beberapa konsumen (header/sidebar/halaman); hasil sebelum optimasi menunjukkan tiga request pada Alerts. Shared query cache bisa dipertimbangkan bila frekuensi/data membesar.
- Detail narasi alert dan agent masih memiliki konten simulasi. Ini batasan fungsional, bukan hasil pengukuran performa.

## Reproduksi

Jalankan npm run build lalu npm run start. Uji memakai production, bukan npm run dev, karena development memiliki overhead compiler dan tooling. Gunakan CPU throttling 4×, cache dingin, dan bandingkan network script/media serta aktivitas main thread; ulangi pada laptop target sebelum menetapkan target LCP/FPS.
