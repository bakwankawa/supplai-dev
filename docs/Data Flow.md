# Data Flow

Artifacts pipeline → `scripts/export_web.py` → `src/data/generated/*.json` → helper data/API → [[Frontend Map]].

- `timeseries.json`: dipakai langsung oleh grafik prediksi dan peta nasional di frontend.
- `heatmap.json`: diproses melalui helper `src/data/prices.ts` dan `/api/heatmap`.
- `alerts.json`: daftar/detail alert dan ringkasan.
- `redistribution.json`: `/api/redistribution` dan detail terkait distribusi.
- `commodities.json` dan `regions.json`: pilihan filter komoditas/wilayah.

API tersedia di `src/app/api/`: `alerts`, `commodities`, `heatmap`, `predictions`, `redistribution`, dan `regions`.

Perintah regenerasi dan batasan data ada di [[Project Overview]]. Lihat [[Frontend Performance Audit]] untuk dampak payload pada browser.
