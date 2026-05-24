import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MapLegend } from "./MapLegend";
import { MapContext, type MapContextValue } from "../MapContext";

function buildContextValue(overrides: Partial<MapContextValue> = {}): MapContextValue {
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
    cnaeOptions: [],
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

describe("MapLegend (smoke)", () => {
  const defaultProps = {
    isMapFullscreen: false,
    onToggleLayer: vi.fn(),
    onToggleUserLocation: vi.fn(),
    onToggleFullscreen: vi.fn(),
    onToggleFiltersPanel: vi.fn(),
  };

  it("renderiza os botoes de camadas + paineis", () => {
    render(
      <MapContext.Provider value={buildContextValue()}>
        <MapLegend {...defaultProps} />
      </MapContext.Provider>,
    );
    expect(screen.getByLabelText(/Mapa de Calor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Marcadores de Empresas/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Raio de Análise/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Minha Localização/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Traçar Rota/i)).toBeInTheDocument();
  });

  it("click em Heatmap chama onToggleLayer('heatmap')", () => {
    const onToggleLayer = vi.fn();
    render(
      <MapContext.Provider value={buildContextValue()}>
        <MapLegend {...defaultProps} onToggleLayer={onToggleLayer} />
      </MapContext.Provider>,
    );
    fireEvent.click(screen.getByLabelText(/Mapa de Calor/i));
    expect(onToggleLayer).toHaveBeenCalledWith("heatmap");
  });

  it("toggle de rotulos fica disabled sem marcadores nem pontos institucionais", () => {
    const value = buildContextValue({
      layerToggles: { heatmap: false, marcadores: false, raioAnalise: false, rotulosEmpresas: false, pontosInstitucionais: false },
    });
    render(
      <MapContext.Provider value={value}>
        <MapLegend {...defaultProps} />
      </MapContext.Provider>,
    );
    const btn = screen.getByLabelText(/Rótulos de Nomes/i) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });
});
