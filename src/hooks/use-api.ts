"use client"
import { useState, useEffect, useCallback } from "react"

export type ApiError = {
  /** HTTP status where the server answered, `null` where the fetch itself
   *  never completed (offline, DNS, aborted). */
  status: number | null
  message: string
}

/** A fetch that failed used to return `data: null` with `loading: false` — the
 *  same shape as a successful empty answer. Callers then rendered the empty
 *  answer's wording, so a 400 or a dropped connection came out of the screen
 *  as a statement about the data. `r.ok` is checked, and a failure is reported
 *  as a failure. */
export function useApi<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  // Two pages already asked for `refetch` through a type assertion and called
  // it as `refetch?.()`; it never existed, so the header's refresh button did
  // nothing there. A counter in the effect's dependency list is the whole
  // implementation.
  const [nonce, setNonce] = useState(0)
  const refetch = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    if (!url) return
    let dibatalkan = false
    setLoading(true)
    setError(null)

    fetch(url)
      .then(async (r) => {
        if (!r.ok) {
          // The API routes answer a rejected parameter with `{ error }` in
          // Indonesian. Prefer that sentence over a bare status line.
          let pesan = `Permintaan gagal dengan status HTTP ${r.status}.`
          try {
            const body = (await r.json()) as { error?: unknown }
            if (typeof body?.error === "string" && body.error.trim()) pesan = body.error
          } catch {
            /* body was not JSON; the status line stands */
          }
          throw Object.assign(new Error(pesan), { status: r.status })
        }
        return (await r.json()) as T
      })
      .then((d) => {
        if (dibatalkan) return
        setData(d)
        setError(null)
        setLoading(false)
      })
      .catch((e: unknown) => {
        if (dibatalkan) return
        const status = typeof (e as { status?: unknown })?.status === "number"
          ? (e as { status: number }).status
          : null
        const message = e instanceof Error && e.message
          ? e.message
          : "Data tidak dapat diambil dari server."
        // Drop any previous payload: a stale plan sitting under an error
        // banner is read as the current plan.
        setData(null)
        setError({ status, message })
        setLoading(false)
      })

    return () => {
      dibatalkan = true
    }
  }, [url, nonce])

  return { data, loading, error, refetch }
}
