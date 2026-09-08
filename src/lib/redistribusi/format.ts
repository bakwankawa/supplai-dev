/** Indonesian number rendering for the sizing figures.
 *
 *  `src/lib/format.ts` covers rupiah and dates. These are the shapes the
 *  sizing work needs and the reason they are strict: a dot decimal separator
 *  reads as a thousands separator in Indonesian, so "1.298 persen" states a
 *  figure a thousand times its true value. */
const nf = (min: number, max: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: min, maximumFractionDigits: max })

export const ton = (value: number): string => `${nf(2, 2).format(value)} t`

export const persen = (value: number, digits = 2): string =>
  `${nf(digits, digits).format(value)}%`

/** Same comma-decimal rendering as `persen`, but with no unit at all —
 *  not even a bare "%". For values that are already named in words, such as
 *  "poin persen" (percentage points): appending "%" to a percentage-point
 *  figure asserts a different, smaller quantity — X percentage points of a
 *  Y% rise is not the same number as X% of that rise. Use this where the
 *  unit is stated in prose beside the number, and `persen` only where the
 *  number is itself a percentage. */
export const angka = (value: number, digits = 2): string => nf(digits, digits).format(value)

/** Upper bound of the % pasar bar. Every route in the balanced plan falls
 *  between 0,023% and 3,642%; the heuristic this work replaced reached 18,08%
 *  and would run off the end, which is the honest visual impression. */
export const SKALA_PERSEN_PASAR = 5

export function takaranLabel(dasar: "terukur" | "diasumsikan"): {
  teks: string
  keterangan: string
} {
  return dasar === "terukur"
    ? {
        teks: "Terukur",
        keterangan:
          "Volume ditetapkan rumus elastisitas: populasi × konsumsi per kapita × elastisitas harga sendiri × kenaikan yang diprediksi.",
      }
    : {
        teks: "Diasumsikan",
        keterangan:
          "Volume dibatasi aturan sisi asal — sebuah provinsi hanya boleh mengirim maksimal 10% konsumsi bulanannya sendiri. Data produksi per provinsi tidak tersedia bagi kami, sehingga batas ini kami tetapkan, bukan kami ukur.",
      }
}
