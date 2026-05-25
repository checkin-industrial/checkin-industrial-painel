import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MapStage } from "./MapStage";
import { MapContext, type MapContextValue } from "../MapContext";

// Mocks dos componentes leaflet/sub-layers - o MapStage compoe muitos,
// mas o objetivo do test e o COMPORTAMENTO CONDICIONAL dele proprio
// (loading overlay, Circle de raio analise). Os layers child sao smoke.
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  ZoomControl: () => <div data-testid="zoom-control" />,
  Circle: (props: { center: [number, number] }) => (
    <div data-testid="circle" data-center={JSON.stringify(props.center)} />
  ),
}));

vi.mock("../MapHelpers", async () => {
  const actual = await vi.importActual<typeof import("../MapHelpers")>("../MapHelpers");
  return {
    ...actual,
    HeatmapLayer: () => <div data-testid="heatmap-layer" />,
    MapFocusTarget: () => <div data-testid="map-focus-target" />,
    MapViewport: () => <div data-testid="map-viewport" />,
  };
});

vi.mock("./EmpresasMarkersLayer", () => ({
  EmpresasMarkersLayer: () => <div data-testid="empresas-markers" />,
}));
vi.mock("./PontosInstitucionaisMarkersLayer", () => ({
  PontosInstitucionaisMarkersLayer: () => <div data-testid="pontos-markers" />,
}));
vi.mock("./RouteOverlay", () => ({ RouteOverlay: () => <div data-testid="route" /> }));
vi.mock("./UserLocationLayer", () => ({ UserLocationLayer: () => <div data-testid="user-loc" /> }));

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

const BASE_PROPS: Parameters<typeof MapStage>[0] = {
  center: [-22.3, -49.05],
  isMapFullscreen: false,
  mapFocusTarget: null,
  loading: false,
  heatmapLoading: false,
  heatmapPoints: [],
  analysisCenter: [-22.3, -49.05],
  showRaioAnalise: false,
};

describe("MapStage", () => {
  it("renderiza MapContainer + 4 layers + helpers", () => {
    render(
      <MapContext.Provider value={buildCtx()}>
        <MapStage {...BASE_PROPS} />
      </MapContext.Provider>,
    );
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
    expect(screen.getByTestId("tile-layer")).toBeInTheDocument();
    expect(screen.getByTestId("zoom-control")).toBeInTheDocument();
    expect(screen.getByTestId("map-focus-target")).toBeInTheDocument();
    expect(screen.getByTestId("map-viewport")).toBeInTheDocument();
    expect(screen.getByTestId("empresas-markers")).toBeInTheDocument();
    expect(screen.getByTestId("pontos-markers")).toBeInTheDocument();
    expect(screen.getByTestId("route")).toBeInTheDocument();
    expect(screen.getByTestId("user-loc")).toBeInTheDocument();
  });

  it("loading overlay aparece com mensagem 'Carregando empresas…' quando loading=true", () => {
    render(
      <MapContext.Provider value={buildCtx()}>
        <MapStage {...BASE_PROPS} loading={true} />
      </MapContext.Provider>,
    );
    expect(screen.getByText(/Carregando empresas/)).toBeInTheDocument();
  });

  it("loading overlay troca pra 'Carregando mapa de calor' quando so heatmapLoading=true", () => {
    render(
      <MapContext.Provider value={buildCtx()}>
        <MapStage {...BASE_PROPS} loading={false} heatmapLoading={true} />
      </MapContext.Provider>,
    );
    expect(screen.getByText(/Carregando mapa de calor/)).toBeInTheDocument();
  });

  it("HeatmapLayer renderiza so quando layerToggles.heatmap=true", () => {
    const { rerender } = render(
      <MapContext.Provider value={buildCtx()}>
        <MapStage {...BASE_PROPS} />
      </MapContext.Provider>,
    );
    expect(screen.queryByTestId("heatmap-layer")).not.toBeInTheDocument();

    rerender(
      <MapContext.Provider
        value={buildCtx({
          layerToggles: { ...buildCtx().layerToggles, heatmap: true },
        })}
      >
        <MapStage {...BASE_PROPS} />
      </MapContext.Provider>,
    );
    expect(screen.getByTestId("heatmap-layer")).toBeInTheDocument();
  });

  it("Circle do raio de analise renderiza apenas com showRaioAnalise=true", () => {
    const { rerender } = render(
      <MapContext.Provider value={buildCtx()}>
        <MapStage {...BASE_PROPS} showRaioAnalise={false} />
      </MapContext.Provider>,
    );
    expect(screen.queryByTestId("circle")).not.toBeInTheDocument();

    rerender(
      <MapContext.Provider value={buildCtx()}>
        <MapStage {...BASE_PROPS} showRaioAnalise={true} />
      </MapContext.Provider>,
    );
    expect(screen.getByTestId("circle")).toBeInTheDocument();
  });
});
