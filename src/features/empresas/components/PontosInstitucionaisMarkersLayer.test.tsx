import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PontosInstitucionaisMarkersLayer } from "./PontosInstitucionaisMarkersLayer";
import { MapContext, type MapContextValue } from "../MapContext";
import type { PontoInstitucionalMapItem } from "../../pontosInstitucionais/markerHelpers";

vi.mock("react-leaflet", () => ({
  Marker: (props: {
    children?: React.ReactNode;
    eventHandlers?: { click?: () => void };
  }) => (
    <div data-testid="marker" onClick={() => props.eventHandlers?.click?.()}>
      {props.children}
    </div>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip">{children}</div>
  ),
}));

function makePonto(overrides: Partial<PontoInstitucionalMapItem> = {}): PontoInstitucionalMapItem {
  return {
    id: "p-1",
    nome: "Hotel A",
    tipo: "hotel",
    descricao: "",
    endereco: "",
    latitude: -22.3,
    longitude: -49.05,
    atividadesDisponiveis: "",
    equipeGestao: "",
    contatoNome: "",
    contatoTelefone: "",
    contatoEmail: "",
    corMarcador: "#000",
    iconeMarcador: "h",
    ordemExibicao: 0,
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
      marcadores: false,
      raioAnalise: false,
      rotulosEmpresas: false,
      pontosInstitucionais: true,
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

describe("PontosInstitucionaisMarkersLayer", () => {
  it("nao renderiza quando layerToggles.pontosInstitucionais=false", () => {
    const ctx = buildCtx({
      pontosInstitucionais: [makePonto()],
      layerToggles: { ...buildCtx().layerToggles, pontosInstitucionais: false },
    });
    render(
      <MapContext.Provider value={ctx}>
        <PontosInstitucionaisMarkersLayer />
      </MapContext.Provider>,
    );
    expect(screen.queryByTestId("marker")).not.toBeInTheDocument();
  });

  it("1 marker por ponto dentro do viewport", () => {
    const pontos = [makePonto({ id: "1" }), makePonto({ id: "2" })];
    render(
      <MapContext.Provider value={buildCtx({ pontosInstitucionais: pontos })}>
        <PontosInstitucionaisMarkersLayer />
      </MapContext.Provider>,
    );
    expect(screen.getAllByTestId("marker")).toHaveLength(2);
  });

  it("filtra por tipo (pontoFilters.tipo) quando pontosBuscaAtiva=true", () => {
    const pontos = [
      makePonto({ id: "h", tipo: "hotel" }),
      makePonto({ id: "e", tipo: "educacao" }),
    ];
    render(
      <MapContext.Provider
        value={buildCtx({
          pontosInstitucionais: pontos,
          pontoFilters: { termo: "", tipo: "hotel" },
        })}
      >
        <PontosInstitucionaisMarkersLayer />
      </MapContext.Provider>,
    );
    expect(screen.getAllByTestId("marker")).toHaveLength(1);
  });

  it("ignora filtros de ponto quando pontosBuscaAtiva=false (mostra tudo)", () => {
    const pontos = [
      makePonto({ id: "h", tipo: "hotel" }),
      makePonto({ id: "e", tipo: "educacao" }),
    ];
    render(
      <MapContext.Provider
        value={buildCtx({
          pontosInstitucionais: pontos,
          pontoFilters: { termo: "", tipo: "hotel" },
          pontosBuscaAtiva: false,
        })}
      >
        <PontosInstitucionaisMarkersLayer />
      </MapContext.Provider>,
    );
    expect(screen.getAllByTestId("marker")).toHaveLength(2);
  });

  it("click chama setSelectedPontoInstitucionalId + abre relatorio", () => {
    const setSelectedPontoInstitucionalId = vi.fn();
    const setSelectedEmpresaId = vi.fn();
    const setReportCollapsed = vi.fn();
    const setPanelsVisible = vi.fn();
    render(
      <MapContext.Provider
        value={buildCtx({
          pontosInstitucionais: [makePonto({ id: "abc" })],
          setSelectedPontoInstitucionalId,
          setSelectedEmpresaId,
          setReportCollapsed,
          setPanelsVisible,
        })}
      >
        <PontosInstitucionaisMarkersLayer />
      </MapContext.Provider>,
    );
    fireEvent.click(screen.getByTestId("marker"));
    expect(setSelectedPontoInstitucionalId).toHaveBeenCalledWith("abc");
    expect(setSelectedEmpresaId).toHaveBeenCalledWith(null);
    expect(setReportCollapsed).toHaveBeenCalledWith(false);
    expect(setPanelsVisible).toHaveBeenCalledOnce();
  });
});
