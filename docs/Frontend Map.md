# Frontend Map

Snapshot kode pada 2 September 2026. Mulai dari [[Home]] dan [[Project Overview]].

| Halaman | Lokasi kode | Fungsi |
| --- | --- | --- |
| `/` | `src/app/page.tsx`, `src/components/landing/` | Landing page |
| `/login` | `src/app/(auth)/login/page.tsx` | Tampilan login |
| `/executive-summary` | `src/app/(dashboard)/executive-summary/page.tsx` | Ringkasan eksekutif |
| `/dashboard` | `src/app/(dashboard)/dashboard/page.tsx` | Prediksi harga dan perbandingan wilayah |
| `/heatmap` | `src/app/(dashboard)/heatmap/page.tsx` | Matriks harga dan peta nasional |
| `/alerts` | `src/app/(dashboard)/alerts/page.tsx` | Daftar peringatan |
| `/alerts/[id]` | `src/app/(dashboard)/alerts/[id]/page.tsx` | Detail peringatan |
| `/redistribusi` | `src/app/(dashboard)/redistribusi/page.tsx` | Rute distribusi dan surplus/defisit |

Layout dashboard membagikan sidebar, header, dan panel agent. Panel agent masih menyimulasikan jawaban di frontend; belum terhubung ke API LLM.

Lihat [[Data Flow]] dan [[Frontend Performance Audit]].
