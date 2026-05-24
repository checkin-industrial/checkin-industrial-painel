import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilterPanel } from "./FilterPanel";
import { MapContext, type MapContextValue } from "../MapContext";

function buildContextValue(overrides: Partial<MapContextValue> = {}): MapContextValue {
  // Stub minimo: tudo no-op + estado default que faz o painel renderizar
  // o estado "filtros visiveis, empresa+pontos boxes expandidos".
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
    layerToggles: { heatmap: false, marcadores: true, raioAnalise: false, rotulosEmpresas: false, pontosInstitucionais: false },
    setLayerToggles: noop,
    panelsVisible: { filtros: true, relatorio: false },
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
    setRoutePath: noop,
    routeLoading: false,
    setRouteLoading: noop,
    routeError: null,
    setRouteError: noop,
    routeInfo: null,
    setRouteInfo: noop,
    ...overrides,
  };
}

const draggableStub = {
  ref: { current: null },
  handleMouseDown: vi.fn(),
  isDragging: false,
} as unknown as Parameters<typeof FilterPanel>[0]["draggable"];

describe("FilterPanel (smoke)", () => {
  it("nao renderiza quando panelsVisible.filtros = false", () => {
    const value = buildContextValue({ panelsVisible: { filtros: false, relatorio: false } });
    render(
      <MapContext.Provider value={value}>
        <FilterPanel
          draggable={draggableStub}
          onFilterChange={vi.fn()}
          onPontoFilterChange={vi.fn()}
          onToggleEmpresaBusca={vi.fn()}
          onTogglePontosBusca={vi.fn()}
          onClear={vi.fn()}
          loading={false}
          error={null}
          pontosFiltradosCount={0}
        />
      </MapContext.Provider>,
    );
    expect(screen.queryByText("Filtros")).not.toBeInTheDocument();
  });

  it("renderiza com headers das duas caixas (Empresas + Pontos Institucionais)", () => {
    const value = buildContextValue();
    render(
      <MapContext.Provider value={value}>
        <FilterPanel
          draggable={draggableStub}
          onFilterChange={vi.fn()}
          onPontoFilterChange={vi.fn()}
          onToggleEmpresaBusca={vi.fn()}
          onTogglePontosBusca={vi.fn()}
          onClear={vi.fn()}
          loading={false}
          error={null}
          pontosFiltradosCount={0}
        />
      </MapContext.Provider>,
    );
    expect(screen.getByRole("heading", { name: /^Filtros$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Empresas$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Pontos Institucionais$/i })).toBeInTheDocument();
  });

  it("click em Limpar chama onClear", () => {
    const onClear = vi.fn();
    const value = buildContextValue();
    render(
      <MapContext.Provider value={value}>
        <FilterPanel
          draggable={draggableStub}
          onFilterChange={vi.fn()}
          onPontoFilterChange={vi.fn()}
          onToggleEmpresaBusca={vi.fn()}
          onTogglePontosBusca={vi.fn()}
          onClear={onClear}
          loading={false}
          error={null}
          pontosFiltradosCount={0}
        />
      </MapContext.Provider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Limpar/i }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("mudar select de Setor chama onFilterChange", () => {
    const onFilterChange = vi.fn();
    const value = buildContextValue();
    render(
      <MapContext.Provider value={value}>
        <FilterPanel
          draggable={draggableStub}
          onFilterChange={onFilterChange}
          onPontoFilterChange={vi.fn()}
          onToggleEmpresaBusca={vi.fn()}
          onTogglePontosBusca={vi.fn()}
          onClear={vi.fn()}
          loading={false}
          error={null}
          pontosFiltradosCount={0}
        />
      </MapContext.Provider>,
    );
    const setorSelect = screen.getByLabelText(/Setor/i);
    fireEvent.change(setorSelect, { target: { value: "industria" } });
    expect(onFilterChange).toHaveBeenCalledWith("setor", "industria");
  });
});
