# Project Overview

## Teknologi

Berdasarkan `package.json` pada 2 September 2026:

- Next.js 16 dan React 19.
- TypeScript dan Tailwind CSS 4.
- Recharts dan React Simple Maps untuk visualisasi.

## Perintah kerja

Jalankan dari root repository:

```bash
npm run dev
npm run build
npm run lint
```

## Alur data

Menurut [panduan export](../scripts/README.md), dashboard membaca hasil model dari `src/data/generated/*.json`. Export secara default membaca artifacts dari `../artifacts`.

```bash
npm run export:data
npm run verify:api
```

Panduan export menjelaskan data yang masih sintetis dan keterbatasan metrik. Periksa panduan tersebut sebelum menggunakan angka dashboard sebagai hasil analisis.

Kembali ke [[Home]].
