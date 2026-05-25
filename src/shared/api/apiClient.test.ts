import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiFetch, apiFetchBlob, apiUrl, staticUrl, ApiError } from "./apiClient";

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

describe("apiFetchBlob", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  const STORAGE_KEY = "ci-admin-api-key";

  beforeEach(() => {
    sessionStorage.setItem(STORAGE_KEY, "test-key-123");
    // jsdom Response nao aceita Blob no constructor; usamos string body
    // (response.blob() ainda funciona pra extrair o conteudo).
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("a,b,c\n1,2,3", {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="empresas-utf8.csv"`,
        },
      }),
    );
  });

  afterEach(() => {
    fetchSpy?.mockRestore();
    sessionStorage.removeItem(STORAGE_KEY);
  });

  it("injeta X-Api-Key em GET (necessario para endpoints admin de export)", async () => {
    await apiFetchBlob("GET", "/api/import/empresas/exportar");
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined;
    const headers = init?.headers as Headers;
    expect(headers.get("X-Api-Key")).toBe("test-key-123");
  });

  it("retorna blob + filename do Content-Disposition", async () => {
    const result = await apiFetchBlob("GET", "/api/import/empresas/exportar");
    // jsdom usa uma classe Blob distinta da global do node — checamos shape (size > 0 + type)
    // ao inves de toBeInstanceOf(Blob) que comparava classes diferentes.
    expect(typeof result.blob.size).toBe("number");
    expect(result.blob.size).toBeGreaterThan(0);
    expect(result.blob.type).toContain("text/csv");
    expect(result.filename).toBe("empresas-utf8.csv");
  });

  it("retorna filename null quando Content-Disposition ausente", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response("x", {
        status: 200,
        headers: { "Content-Type": "text/csv" },
      }),
    );
    const result = await apiFetchBlob("GET", "/api/import/empresas/exportar");
    expect(result.filename).toBeNull();
  });

  // RFC 5987/6266: filename*= e preferido sobre filename= quando ambos
  // presentes (handling de UTF-8). Defesa em profundidade (Copilot PR #43).
  it("prefere filename*= (RFC 5987) sobre filename= simples", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response("x", {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="ascii-fallback.csv"; filename*=UTF-8''empresas%20com%20acento.csv`,
        },
      }),
    );
    const result = await apiFetchBlob("GET", "/api/import/empresas/exportar");
    expect(result.filename).toBe("empresas com acento.csv");
  });

  it("filename*= com percent-encoding invalido cai pro fallback simples", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response("x", {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="ok.csv"; filename*=UTF-8''broken%ZZ`,
        },
      }),
    );
    const result = await apiFetchBlob("GET", "/api/import/empresas/exportar");
    expect(result.filename).toBe("ok.csv");
  });

  it("lanca ApiError em 401 (admin nao autenticado)", async () => {
    fetchSpy.mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }));
    await expect(apiFetchBlob("GET", "/api/import/empresas/exportar")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
    });
  });
});
