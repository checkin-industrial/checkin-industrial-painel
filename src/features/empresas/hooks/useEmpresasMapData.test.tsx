import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEmpresasMapData } from "./useEmpresasMapData";
import { INITIAL_FILTERS } from "./useFiltrosEmpresas";

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("useEmpresasMapData", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("dispara queries de empresas e pontos por padrao, pula heatmap quando disabled", async () => {
    fetchSpy.mockImplementation((url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes("/api/empresas/filter")) return Promise.resolve(jsonResponse([]));
      if (u.includes("/api/pontos-institucionais")) return Promise.resolve(jsonResponse([]));
      throw new Error(`Unexpected URL: ${u}`);
    });

    const { result } = renderHook(
      () =>
        useEmpresasMapData({
          effectiveFilters: INITIAL_FILTERS,
          pontosTipoEfetivo: "",
          heatmapEnabled: false,
        }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const urls = fetchSpy.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(urls.some((u: string) => u.includes("/api/empresas/filter"))).toBe(true);
    expect(urls.some((u: string) => u.includes("/api/pontos-institucionais"))).toBe(true);
    expect(urls.some((u: string) => u.includes("/api/analytics/heatmap"))).toBe(false);
    expect(result.current.heatmapPoints).toEqual([]);
    expect(result.current.heatmapLoading).toBe(false);
  });

  it("envia heatmap query quando heatmapEnabled=true", async () => {
    fetchSpy.mockImplementation((url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes("/api/empresas/filter")) return Promise.resolve(jsonResponse([]));
      if (u.includes("/api/pontos-institucionais")) return Promise.resolve(jsonResponse([]));
      if (u.includes("/api/analytics/heatmap")) return Promise.resolve(jsonResponse([]));
      throw new Error(`Unexpected URL: ${u}`);
    });

    renderHook(
      () =>
        useEmpresasMapData({
          effectiveFilters: INITIAL_FILTERS,
          pontosTipoEfetivo: "",
          heatmapEnabled: true,
        }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() =>
      expect(
        fetchSpy.mock.calls.some((c: unknown[]) => String(c[0]).includes("/api/analytics/heatmap")),
      ).toBe(true),
    );
  });

  it("filtra heatmapPoints fora do viewport + normaliza peso minimo", async () => {
    fetchSpy.mockImplementation((url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes("/api/empresas/filter")) return Promise.resolve(jsonResponse([]));
      if (u.includes("/api/pontos-institucionais")) return Promise.resolve(jsonResponse([]));
      if (u.includes("/api/analytics/heatmap")) {
        return Promise.resolve(
          jsonResponse([
            { latitude: -22.3, longitude: -49.05, peso: 0 }, // dentro do viewport
            { latitude: 80, longitude: 100, peso: 5 }, // fora do viewport
          ]),
        );
      }
      throw new Error(`Unexpected URL: ${u}`);
    });

    const { result } = renderHook(
      () =>
        useEmpresasMapData({
          effectiveFilters: INITIAL_FILTERS,
          pontosTipoEfetivo: "",
          heatmapEnabled: true,
        }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.heatmapPoints.length).toBe(1));
    // peso=0 vira max(1, peso) = 1
    expect(result.current.heatmapPoints[0]).toEqual([-22.3, -49.05, 1]);
  });

  it("error de empresas eh exposto como string em error", async () => {
    fetchSpy.mockImplementation((url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes("/api/empresas/filter")) {
        return Promise.resolve(new Response("server error", { status: 500 }));
      }
      if (u.includes("/api/pontos-institucionais")) return Promise.resolve(jsonResponse([]));
      throw new Error(`Unexpected URL: ${u}`);
    });

    const { result } = renderHook(
      () =>
        useEmpresasMapData({
          effectiveFilters: INITIAL_FILTERS,
          pontosTipoEfetivo: "",
          heatmapEnabled: false,
        }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.error).not.toBe(null));
    expect(typeof result.current.error).toBe("string");
  });

  it("pontos institucionais sao ordenados por ordemExibicao crescente", async () => {
    fetchSpy.mockImplementation((url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes("/api/empresas/filter")) return Promise.resolve(jsonResponse([]));
      if (u.includes("/api/pontos-institucionais")) {
        return Promise.resolve(
          jsonResponse([
            { id: "b", nome: "B", tipo: "hotel", descricao: "", endereco: "", latitude: -22.3, longitude: -49, atividadesDisponiveis: "", equipeGestao: "", contatoNome: "", contatoTelefone: "", contatoEmail: "", corMarcador: "", iconeMarcador: "", ordemExibicao: 5 },
            { id: "a", nome: "A", tipo: "hotel", descricao: "", endereco: "", latitude: -22.3, longitude: -49, atividadesDisponiveis: "", equipeGestao: "", contatoNome: "", contatoTelefone: "", contatoEmail: "", corMarcador: "", iconeMarcador: "", ordemExibicao: 1 },
          ]),
        );
      }
      throw new Error(`Unexpected URL: ${u}`);
    });

    const { result } = renderHook(
      () =>
        useEmpresasMapData({
          effectiveFilters: INITIAL_FILTERS,
          pontosTipoEfetivo: "",
          heatmapEnabled: false,
        }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.pontosInstitucionais.length).toBe(2));
    expect(result.current.pontosInstitucionais.map((p) => p.id)).toEqual(["a", "b"]);
  });
});
