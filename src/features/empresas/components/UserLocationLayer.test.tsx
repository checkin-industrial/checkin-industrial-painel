import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserLocationLayer } from "./UserLocationLayer";
import { MapContext, type MapContextValue } from "../MapContext";

vi.mock("react-leaflet", () => ({
  Circle: (props: { center: [number, number]; radius: number }) => (
    <div
      data-testid="circle"
      data-center={JSON.stringify(props.center)}
      data-radius={String(props.radius)}
    />
  ),
  Marker: (props: { position: [number, number]; children?: React.ReactNode }) => (
    <div data-testid="marker" data-position={JSON.stringify(props.position)}>
      {props.children}
    </div>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip">{children}</div>
  ),
}));

// Stub do `leaflet`: useUserLocationLayer importa L do leaflet so para L.icon
// (forma simples + sem necessidade do CDN no teste).
vi.mock("leaflet", () => ({
  default: {
    icon: (opts: Record<string, unknown>) => ({ __icon: true, ...opts }),
  },
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

describe("UserLocationLayer", () => {
  it("nao renderiza quando locationActive=false", () => {
    render(
      <MapContext.Provider
        value={buildCtx({
          locationActive: false,
          userLocation: { latitude: -22.3, longitude: -49.05 },
        })}
      >
        <UserLocationLayer />
      </MapContext.Provider>,
    );
    expect(screen.queryByTestId("circle")).not.toBeInTheDocument();
    expect(screen.queryByTestId("marker")).not.toBeInTheDocument();
  });

  it("nao renderiza quando userLocation=null (mesmo locationActive=true)", () => {
    render(
      <MapContext.Provider value={buildCtx({ locationActive: true, userLocation: null })}>
        <UserLocationLayer />
      </MapContext.Provider>,
    );
    expect(screen.queryByTestId("circle")).not.toBeInTheDocument();
    expect(screen.queryByTestId("marker")).not.toBeInTheDocument();
  });

  it("renderiza Circle + Marker no userLocation quando ambos verdadeiros", () => {
    render(
      <MapContext.Provider
        value={buildCtx({
          locationActive: true,
          userLocation: { latitude: -22.3, longitude: -49.05 },
        })}
      >
        <UserLocationLayer />
      </MapContext.Provider>,
    );
    const circle = screen.getByTestId("circle");
    const marker = screen.getByTestId("marker");
    expect(circle).toHaveAttribute("data-center", JSON.stringify([-22.3, -49.05]));
    expect(circle).toHaveAttribute("data-radius", "220");
    expect(marker).toHaveAttribute("data-position", JSON.stringify([-22.3, -49.05]));
  });
});
