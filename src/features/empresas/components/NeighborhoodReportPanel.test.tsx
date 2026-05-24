import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock useAuth antes do import do componente (vi.mock e hoisted).
vi.mock("../../../shared/auth/AuthContext", () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

import { NeighborhoodReportPanel } from "./NeighborhoodReportPanel";
import { MapContext, type MapContextValue } from "../MapContext";
import type { EmpresaVizinhancaResponse } from "../types";

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
    routeLoading: false,
    routeError: null,
    routeInfo: null,
    ...overrides,
  };
}

const draggableStub = {
  ref: { current: null },
  handleMouseDown: vi.fn(),
  isDragging: false,
} as unknown as Parameters<typeof NeighborhoodReportPanel>[0]["draggable"];

const defaultProps = {
  draggable: draggableStub,
  possuiSelecao: true,
  pontoInstitucionalSelecionado: null,
  empresasMesmoCnae: [],
  empresasMesmoSetor: [],
  avgDistanceKm: 0,
  onRouteFromAddress: vi.fn(),
  onToggleReportSection: vi.fn(),
};

function renderWithProviders(value: MapContextValue) {
  return render(
    <MapContext.Provider value={value}>
      <NeighborhoodReportPanel {...defaultProps} />
    </MapContext.Provider>,
  );
}

describe("NeighborhoodReportPanel (smoke)", () => {
  it("nao renderiza quando panelsVisible.relatorio = false", () => {
    const value = buildContextValue({ panelsVisible: { filtros: false, relatorio: false } });
    renderWithProviders(value);
    expect(screen.queryByText(/Relatório de Vizinhança/i)).not.toBeInTheDocument();
  });

  it("renderiza header padrao quando ha selecao", () => {
    const value = buildContextValue();
    renderWithProviders(value);
    expect(screen.getByRole("heading", { name: /Relatório de Vizinhança/i })).toBeInTheDocument();
  });

  it("mostra empresa base com nome fantasia + Setor + Funcionarios", () => {
    const vizinhanca: EmpresaVizinhancaResponse = {
      empresaBase: {
        id: "empresa-1",
        nomeFantasia: "Empresa Base Teste",
        cnaePrincipal: "2532201",
        setor: "Metalurgia",
        numeroFuncionarios: 42,
        municipio: "Bauru",
        latitude: -22.3,
        longitude: -49.05,
      },
      empresasProximas: [],
    };
    const value = buildContextValue({ vizinhanca, selectedEmpresaId: "empresa-1" });
    renderWithProviders(value);
    expect(screen.getByText("Empresa Base Teste")).toBeInTheDocument();
    expect(screen.getByText(/Setor: Metalurgia/i)).toBeInTheDocument();
    expect(screen.getByText(/Funcionários: 42/i)).toBeInTheDocument();
  });
});
