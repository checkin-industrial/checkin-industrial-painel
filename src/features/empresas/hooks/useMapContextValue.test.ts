import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMapContextValue } from "./useMapContextValue";

// Args minimo + estavel pra montar o hook. Os setters sao mocks identicos
// entre renders (referencia preservada) - condicao necessaria pra o memo
// reusar o mesmo value.
function buildArgs() {
  const noop = vi.fn();
  return {
    empresas: [],
    pontosInstitucionais: [],
    vizinhanca: null,
    reportLoading: false,
    reportError: null,
    filters: { nomeFantasia: "", setor: "", porte: "", cnae: "", municipio: "", situacao: "" },
    setFilters: noop,
    empresaBuscaAtiva: true,
    setEmpresaBuscaAtiva: noop,
    cnaeOptions: [{ value: "", label: "Todos" }],
    municipioOptions: [] as string[],
    pontoFilters: { termo: "", tipo: "" },
    setPontoFilters: noop,
    pontosBuscaAtiva: true,
    setPontosBuscaAtiva: noop,
    selectedEmpresaId: null as string | null,
    setSelectedEmpresaId: noop,
    selectedPontoInstitucionalId: null as string | null,
    setSelectedPontoInstitucionalId: noop,
    layerToggles: {
      heatmap: false,
      marcadores: false,
      raioAnalise: false,
      rotulosEmpresas: false,
      pontosInstitucionais: false,
    },
    setLayerToggles: noop,
    panelsVisible: { filtros: false, relatorio: true },
    setPanelsVisible: noop,
    filtersCollapsed: false,
    setFiltersCollapsed: noop,
    reportCollapsed: false,
    setReportCollapsed: noop,
    empresaFiltersCollapsed: false,
    setEmpresaFiltersCollapsed: noop,
    pontosFiltersCollapsed: false,
    setPontosFiltersCollapsed: noop,
    empresaFiltersVisible: true,
    setEmpresaFiltersVisible: noop,
    pontosFiltersVisible: true,
    setPontosFiltersVisible: noop,
    collapsedReportSections: { proximas: false, cnae: true, setor: true } as Record<
      "proximas" | "cnae" | "setor",
      boolean
    >,
    setCollapsedReportSections: noop,
    userLocation: null as { latitude: number; longitude: number } | null,
    setUserLocation: noop,
    locationActive: false,
    setLocationActive: noop,
    routeEnabled: false,
    setRouteEnabled: noop,
    routePath: [] as [number, number][],
    routeLoading: false,
    routeError: null as string | null,
    routeInfo: null as { distanceKm: number; durationMin: number } | null,
    onAdminEditEmpresa: undefined,
  };
}

describe("useMapContextValue", () => {
  it("retorna um value com todos os campos do MapContextValue", () => {
    const { result } = renderHook(() => useMapContextValue(buildArgs()));
    expect(result.current).toHaveProperty("empresas");
    expect(result.current).toHaveProperty("filters");
    expect(result.current).toHaveProperty("setFilters");
    expect(result.current).toHaveProperty("layerToggles");
    expect(result.current).toHaveProperty("routePath");
    expect(result.current).toHaveProperty("onAdminEditEmpresa");
  });

  it("preserva identidade de referencia quando deps nao mudam (memo)", () => {
    const args = buildArgs();
    const { result, rerender } = renderHook(() => useMapContextValue(args));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it("re-cria value quando uma dep muda", () => {
    let empresas = [] as ReturnType<typeof buildArgs>["empresas"];
    const { result, rerender } = renderHook(() =>
      useMapContextValue({ ...buildArgs(), empresas }),
    );
    const first = result.current;
    empresas = [...empresas];
    rerender();
    expect(result.current).not.toBe(first);
  });
});
