import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RouteOverlay } from "./RouteOverlay";
import { MapContext, type MapContextValue } from "../MapContext";
import type { LatLngTuple } from "../MapHelpers";

// Mocka so a `Polyline` do react-leaflet. Outros tipos nao sao usados aqui;
// o `MapContext.Provider` da o resto.
vi.mock("react-leaflet", () => ({
  Polyline: (props: { positions: LatLngTuple[]; pathOptions?: Record<string, unknown> }) => (
    <div
      data-testid="polyline"
      data-positions={JSON.stringify(props.positions)}
      data-color={(props.pathOptions?.color as string | undefined) ?? ""}
    />
  ),
}));

function buildCtx(overrides: Partial<MapContextValue> = {}): MapContextValue {
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
    municipioOptions: [],
    pontoFilters: { termo: "", tipo: "" },
    setPontoFilters: noop,
    pontosBuscaAtiva: true,
    setPontosBuscaAtiva: noop,
    selectedEmpresaId: null,
    setSelectedEmpresaId: noop,
    selectedPontoInstitucionalId: null,
    setSelectedPontoInstitucionalId: noop,
    layerToggles: {
      heatmap: false,
      marcadores: false,
      raioAnalise: false,
      rotulosEmpresas: false,
      pontosInstitucionais: false,
    },
    setLayerToggles: noop,
    panelsVisible: { filtros: false, relatorio: false },
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
    collapsedReportSections: { proximas: false, cnae: true, setor: true },
    setCollapsedReportSections: noop,
    userLocation: null,
    setUserLocation: noop,
    locationActive: false,
    setLocationActive: noop,
    routeEnabled: false,
    setRouteEnabled: noop,
    routePath: [],
    routeLoading: false,
    routeError: null,
    routeInfo: null,
    ...overrides,
  };
}

describe("RouteOverlay", () => {
  it("nao renderiza Polyline quando routeEnabled=false", () => {
    render(
      <MapContext.Provider value={buildCtx({ routeEnabled: false, routePath: [[1, 2], [3, 4]] })}>
        <RouteOverlay />
      </MapContext.Provider>,
    );
    expect(screen.queryByTestId("polyline")).not.toBeInTheDocument();
  });

  it("nao renderiza Polyline quando routePath tem 1 ponto ou menos", () => {
    render(
      <MapContext.Provider value={buildCtx({ routeEnabled: true, routePath: [[1, 2]] })}>
        <RouteOverlay />
      </MapContext.Provider>,
    );
    expect(screen.queryByTestId("polyline")).not.toBeInTheDocument();
  });

  it("renderiza Polyline com positions + cor azul quando habilitado + path >=2 pontos", () => {
    const path: LatLngTuple[] = [
      [-22.3, -49.05],
      [-22.4, -49.1],
    ];
    render(
      <MapContext.Provider value={buildCtx({ routeEnabled: true, routePath: path })}>
        <RouteOverlay />
      </MapContext.Provider>,
    );
    const polyline = screen.getByTestId("polyline");
    expect(polyline).toBeInTheDocument();
    expect(polyline).toHaveAttribute("data-positions", JSON.stringify(path));
    expect(polyline).toHaveAttribute("data-color", "#1d4ed8");
  });
});
