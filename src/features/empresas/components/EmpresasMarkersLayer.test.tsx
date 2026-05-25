import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EmpresasMarkersLayer } from "./EmpresasMarkersLayer";
import { MapContext, type MapContextValue } from "../MapContext";
import type { EmpresaFilterMapItem } from "../types";

// Mocka so o que o Layer renderiza. Os event handlers passados pra Marker
// chegam intactos pelo mock, permitindo simular click.
vi.mock("react-leaflet", () => ({
  Marker: (props: {
    children?: React.ReactNode;
    eventHandlers?: { click?: () => void };
    icon?: unknown;
  }) => (
    <div data-testid="marker" onClick={() => props.eventHandlers?.click?.()}>
      {props.children}
    </div>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip">{children}</div>
  ),
}));

vi.mock("react-leaflet-markercluster", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="cluster">{children}</div>
  ),
}));

function makeEmpresa(overrides: Partial<EmpresaFilterMapItem> = {}): EmpresaFilterMapItem {
  return {
    id: "emp-1",
    nomeFantasia: "Industria A",
    cnaePrincipal: "1234567",
    descricaoCnae: "Atividade A",
    setor: "industria",
    porte: "ME",
    telefone: "",
    cep: "",
    municipio: "Bauru",
    matrizOuFilial: "Matriz",
    latitude: -22.3,
    longitude: -49.05,
    ...overrides,
  };
}

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
      marcadores: true,
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

describe("EmpresasMarkersLayer", () => {
  it("nao renderiza nada quando layerToggles.marcadores=false", () => {
    const value = buildCtx({
      empresas: [makeEmpresa()],
      layerToggles: { ...buildCtx().layerToggles, marcadores: false },
    });
    const { container } = render(
      <MapContext.Provider value={value}>
        <EmpresasMarkersLayer />
      </MapContext.Provider>,
    );
    expect(container.querySelectorAll("[data-testid='marker']")).toHaveLength(0);
  });

  it("renderiza 1 Marker por empresa quando marcadores=true (abaixo do CLUSTER_THRESHOLD)", () => {
    const empresas = [makeEmpresa({ id: "1" }), makeEmpresa({ id: "2" })];
    render(
      <MapContext.Provider value={buildCtx({ empresas })}>
        <EmpresasMarkersLayer />
      </MapContext.Provider>,
    );
    expect(screen.getAllByTestId("marker")).toHaveLength(2);
    expect(screen.queryByTestId("cluster")).not.toBeInTheDocument();
  });

  it("agrupa em MarkerClusterGroup quando empresas visiveis > 200", () => {
    const empresas = Array.from({ length: 201 }, (_, i) =>
      makeEmpresa({ id: String(i), latitude: -22.3, longitude: -49.05 }),
    );
    render(
      <MapContext.Provider value={buildCtx({ empresas })}>
        <EmpresasMarkersLayer />
      </MapContext.Provider>,
    );
    expect(screen.getByTestId("cluster")).toBeInTheDocument();
  });

  it("filtra empresas fora do viewport (lat/lng fora da janela do mapa)", () => {
    const empresas = [
      makeEmpresa({ id: "in", latitude: -22.3, longitude: -49.05 }),
      makeEmpresa({ id: "out", latitude: 80, longitude: 100 }),
    ];
    render(
      <MapContext.Provider value={buildCtx({ empresas })}>
        <EmpresasMarkersLayer />
      </MapContext.Provider>,
    );
    expect(screen.getAllByTestId("marker")).toHaveLength(1);
  });

  it("click em marker chama setSelectedEmpresaId + reseta UI do relatorio", () => {
    const setSelectedEmpresaId = vi.fn();
    const setSelectedPontoInstitucionalId = vi.fn();
    const setReportCollapsed = vi.fn();
    const setPanelsVisible = vi.fn();
    const value = buildCtx({
      empresas: [makeEmpresa({ id: "click-me" })],
      setSelectedEmpresaId,
      setSelectedPontoInstitucionalId,
      setReportCollapsed,
      setPanelsVisible,
    });
    render(
      <MapContext.Provider value={value}>
        <EmpresasMarkersLayer />
      </MapContext.Provider>,
    );
    fireEvent.click(screen.getByTestId("marker"));
    expect(setSelectedEmpresaId).toHaveBeenCalledWith("click-me");
    expect(setSelectedPontoInstitucionalId).toHaveBeenCalledWith(null);
    expect(setReportCollapsed).toHaveBeenCalledWith(false);
    expect(setPanelsVisible).toHaveBeenCalledOnce();
  });
});
