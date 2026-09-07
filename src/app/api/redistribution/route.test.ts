import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import { commodities } from "@/data/commodities"
import { GET } from "./route"

const call = (query: string) =>
  GET(new NextRequest(`http://localhost/api/redistribution${query}`))

describe("GET /api/redistribution", () => {
  it("rejects an unknown commodity with 400 rather than serving the aggregate", async () => {
    // Verified live before this fix: ?commodity=kopi&postur=seimbang answered
    // 200 with the six-commodity aggregate under that heading.
    const res = await call("?commodity=kopi&postur=seimbang")
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toContain("kopi")
    expect(body.error).toContain("beras")
  })

  it("rejects an unknown posture with 400, unchanged", async () => {
    const res = await call("?commodity=beras&postur=agresif")
    expect(res.status).toBe(400)
    expect(((await res.json()) as { error: string }).error).toContain("agresif")
  })

  it("serves each known commodity", async () => {
    for (const c of commodities) {
      const res = await call(`?commodity=${c.id}&postur=seimbang`)
      expect(res.status, c.id).toBe(200)
    }
  })

  it("still serves the aggregate when no commodity is named", async () => {
    const res = await call("?postur=seimbang")
    expect(res.status).toBe(200)
    const body = (await res.json()) as { routes: unknown[] }
    expect(body.routes.length).toBeGreaterThan(0)
  })
})
