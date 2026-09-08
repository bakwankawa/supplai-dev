import { describe, expect, it } from "vitest"
import ujiOngkosData from "@/data/generated/uji_ongkos.json"
import type { UjiOngkos } from "@/lib/types"
import { ruteBerubahKomoditas } from "./uji-ongkos"

const UJI_ONGKOS = ujiOngkosData as unknown as UjiOngkos

describe("ruteBerubahKomoditas", () => {
  it("melaporkan 0 rute berubah untuk Bawang Putih walau agregat lintas komoditas melaporkan 22/36", () => {
    // Ini persis kasus yang membuka ronde perbaikan ini: agregat 22/36
    // (61%) TIDAK berarti setiap komoditas bergeser sejauh itu -- Bawang
    // Putih sendirian menyumbang nol dari selisih itu.
    const hasil = ruteBerubahKomoditas(
      UJI_ONGKOS.struktur.jarak, UJI_ONGKOS.struktur.tetap, "Bawang Putih",
    )
    expect(hasil).not.toBeNull()
    expect(hasil?.ruteBerubah).toBe(0)
    expect(hasil?.nRuteJarak).toBe(10)
  })

  it("melaporkan rute berubah yang berbeda untuk Telur Ayam, bukan angka agregat yang sama", () => {
    const hasil = ruteBerubahKomoditas(
      UJI_ONGKOS.struktur.jarak, UJI_ONGKOS.struktur.tetap, "Telur Ayam",
    )
    expect(hasil).toEqual({ ruteBerubah: 6, nRuteJarak: 13 })
  })

  it("jumlah rute berubah per komoditas menjumlah persis ke angka agregat", () => {
    // Bukti aljabar bahwa fungsi ini menghitung ulang dari data yang sama,
    // bukan sekadar mengarang angka yang kebetulan masuk akal.
    const total = UJI_ONGKOS.komoditas.reduce((sum, kom) => {
      const hasil = ruteBerubahKomoditas(UJI_ONGKOS.struktur.jarak, UJI_ONGKOS.struktur.tetap, kom)
      return sum + (hasil?.ruteBerubah ?? 0)
    }, 0)
    expect(total).toBe(UJI_ONGKOS.ruteBerubah)
  })

  it("kontrol tetapPlusJarak inert per komoditas juga, tidak hanya agregat", () => {
    const hasil = ruteBerubahKomoditas(
      UJI_ONGKOS.struktur.jarak, UJI_ONGKOS.struktur.tetapPlusJarak, "Telur Ayam",
    )
    expect(hasil?.ruteBerubah).toBe(0)
  })

  it("mengembalikan null, bukan 0 dari 0, untuk komoditas yang tidak diuji sama sekali", () => {
    // Bawang Merah dan Minyak Goreng tidak punya pasangan surplus-defisit --
    // "tidak diuji" harus tetap terbaca beda dari "diuji, hasilnya nol".
    const hasil = ruteBerubahKomoditas(
      UJI_ONGKOS.struktur.jarak, UJI_ONGKOS.struktur.tetap, "Bawang Merah",
    )
    expect(hasil).toBeNull()
  })

  it("mengembalikan null untuk komoditas yang tidak dikenal sama sekali", () => {
    const hasil = ruteBerubahKomoditas(
      UJI_ONGKOS.struktur.jarak, UJI_ONGKOS.struktur.tetap, "Komoditas Fiktif",
    )
    expect(hasil).toBeNull()
  })
})
