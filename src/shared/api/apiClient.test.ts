import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiFetch, apiUrl, staticUrl, ApiError } from "./apiClient";

// Importa a constante API_KEY indiretamente via comportamento.
// Como import.meta.env.VITE_API_KEY nao tem valor em test env, X-Api-Key nao deve ser injetada.

describe("apiUrl", () => {
  it("prefixa path com API_BASE (vazia em test env, so retorna o path)", () => {
    expect(apiUrl("/api/empresas")).toBe("/api/empresas");
  });
});

describe("staticUrl", () => {
  it("retorna undefined para input falsy", () => {
    expect(staticUrl(null)).toBeUndefined();
    expect(staticUrl(undefined)).toBeUndefined();
    expect(staticUrl("")).toBeUndefined();
  });

  it("preserva URLs absolutas", () => {
    expect(staticUrl("https://cdn.example.com/img.png")).toBe("https://cdn.example.com/img.png");
    expect(staticUrl("http://example.com/img.png")).toBe("http://example.com/img.png");
  });

  it("prefixa paths relativos com API_BASE", () => {
    expect(staticUrl("/uploads/foo.png")).toBe("/uploads/foo.png");
  });
});

describe("apiFetch", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("faz GET sem body e retorna JSON parseado", async () => {
    const result = await apiFetch<{ ok: boolean }>("GET", "/api/empresas");

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/empresas");
    expect((init as RequestInit).method).toBe("GET");
    expect((init as RequestInit).body).toBeUndefined();
    expect(result).toEqual({ ok: true });
  });

  it("serializa body objeto como JSON e adiciona Content-Type", async () => {
    await apiFetch("POST", "/api/empresas", { body: { cnpj: "12345" } });

    const [, init] = fetchSpy.mock.calls[0];
    const headers = new Headers((init as RequestInit).headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect((init as RequestInit).body).toBe(JSON.stringify({ cnpj: "12345" }));
  });

  it("nao injeta X-Api-Key quando VITE_API_KEY nao esta definida (test env)", async () => {
    await apiFetch("POST", "/api/empresas", { body: { x: 1 } });

    const [, init] = fetchSpy.mock.calls[0];
    const headers = new Headers((init as RequestInit).headers);
    expect(headers.has("X-Api-Key")).toBe(false);
  });

  it("retorna undefined em 204 No Content", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const result = await apiFetch("DELETE", "/api/empresas/123");
    expect(result).toBeUndefined();
  });

  it("lanca ApiError com status quando resposta nao-ok", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("not found", { status: 404 }));

    await expect(apiFetch("GET", "/api/empresas/999")).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
    });
  });

  it("ApiError exposes status code", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("nope", { status: 401 }));

    try {
      await apiFetch("POST", "/api/empresas", { body: {} });
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(401);
    }
  });
});
