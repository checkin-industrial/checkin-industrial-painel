import { useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { MapContextValue } from "../MapContext";
import type { PontoInstitucionalMapItem } from "../../pontosInstitucionais/markerHelpers";
import type {
  CnaeOption,
  EmpresaFilterMapItem,
  EmpresaVizinhancaResponse,
  FilterFormState,
  LayerToggleState,
  PontoInstitucionalFilterState,
  ReportSectionKey,
} from "../types";

// Encapsula o useMemo do mapContextValue. Recebe o pacote de state + setters
// + derivados que o Context expoe; retorna o MapContextValue memoizado.
//
// Trade-off conhecido: ainda e um value monolitico - mudar qualquer campo
// re-cria o objeto e re-renderiza todos os consumers. Para o escopo atual
// (5-6 sub-componentes via Context, interatividade humana) e aceitavel. Se
// virar gargalo, dividir em Contexts menores (FiltersContext, RouteContext,
// SelectionContext) e refatorar consumers.

type UseMapContextValueArgs = {
  empresas: EmpresaFilterMapItem[];
  pontosInstitucionais: PontoInstitucionalMapItem[];
  vizinhanca: EmpresaVizinhancaResponse | null | undefined;
  reportLoading: boolean;
  reportError: string | null;

  filters: FilterFormState;
  setFilters: Dispatch<SetStateAction<FilterFormState>>;
  empresaBuscaAtiva: boolean;
  setEmpresaBuscaAtiva: Dispatch<SetStateAction<boolean>>;
  cnaeOptions: CnaeOption[];
  municipioOptions: string[];

  pontoFilters: PontoInstitucionalFilterState;
  setPontoFilters: Dispatch<SetStateAction<PontoInstitucionalFilterState>>;
  pontosBuscaAtiva: boolean;
  setPontosBuscaAtiva: Dispatch<SetStateAction<boolean>>;

  selectedEmpresaId: string | null;
  setSelectedEmpresaId: Dispatch<SetStateAction<string | null>>;
  selectedPontoInstitucionalId: string | null;
  setSelectedPontoInstitucionalId: Dispatch<SetStateAction<string | null>>;

  layerToggles: LayerToggleState;
  setLayerToggles: Dispatch<SetStateAction<LayerToggleState>>;

  panelsVisible: { filtros: boolean; relatorio: boolean };
  setPanelsVisible: Dispatch<SetStateAction<{ filtros: boolean; relatorio: boolean }>>;
  filtersCollapsed: boolean;
  setFiltersCollapsed: Dispatch<SetStateAction<boolean>>;
  reportCollapsed: boolean;
  setReportCollapsed: Dispatch<SetStateAction<boolean>>;
  empresaFiltersCollapsed: boolean;
  setEmpresaFiltersCollapsed: Dispatch<SetStateAction<boolean>>;
  pontosFiltersCollapsed: boolean;
  setPontosFiltersCollapsed: Dispatch<SetStateAction<boolean>>;
  empresaFiltersVisible: boolean;
  setEmpresaFiltersVisible: Dispatch<SetStateAction<boolean>>;
  pontosFiltersVisible: boolean;
  setPontosFiltersVisible: Dispatch<SetStateAction<boolean>>;
  collapsedReportSections: Record<ReportSectionKey, boolean>;
  setCollapsedReportSections: Dispatch<SetStateAction<Record<ReportSectionKey, boolean>>>;

  userLocation: { latitude: number; longitude: number } | null;
  setUserLocation: Dispatch<SetStateAction<{ latitude: number; longitude: number } | null>>;
  locationActive: boolean;
  setLocationActive: Dispatch<SetStateAction<boolean>>;
  routeEnabled: boolean;
  setRouteEnabled: Dispatch<SetStateAction<boolean>>;
  routePath: MapContextValue["routePath"];
  routeLoading: boolean;
  routeError: string | null;
  routeInfo: MapContextValue["routeInfo"];

  onAdminEditEmpresa?: (empresaId: string) => void;
};

export function useMapContextValue(args: UseMapContextValueArgs): MapContextValue {
  const {
    empresas,
    pontosInstitucionais,
    vizinhanca,
    reportLoading,
    reportError,
    filters,
    setFilters,
    empresaBuscaAtiva,
    setEmpresaBuscaAtiva,
    cnaeOptions,
    municipioOptions,
    pontoFilters,
    setPontoFilters,
    pontosBuscaAtiva,
    setPontosBuscaAtiva,
    selectedEmpresaId,
    setSelectedEmpresaId,
    selectedPontoInstitucionalId,
    setSelectedPontoInstitucionalId,
    layerToggles,
    setLayerToggles,
    panelsVisible,
    setPanelsVisible,
    filtersCollapsed,
    setFiltersCollapsed,
    reportCollapsed,
    setReportCollapsed,
    empresaFiltersCollapsed,
    setEmpresaFiltersCollapsed,
    pontosFiltersCollapsed,
    setPontosFiltersCollapsed,
    empresaFiltersVisible,
    setEmpresaFiltersVisible,
    pontosFiltersVisible,
    setPontosFiltersVisible,
    collapsedReportSections,
    setCollapsedReportSections,
    userLocation,
    setUserLocation,
    locationActive,
    setLocationActive,
    routeEnabled,
    setRouteEnabled,
    routePath,
    routeLoading,
    routeError,
    routeInfo,
    onAdminEditEmpresa,
  } = args;

  return useMemo<MapContextValue>(
    () => ({
      empresas,
      pontosInstitucionais,
      vizinhanca,
      reportLoading,
      reportError,
      filters,
      setFilters,
      empresaBuscaAtiva,
      setEmpresaBuscaAtiva,
      cnaeOptions,
      municipioOptions,
      pontoFilters,
      setPontoFilters,
      pontosBuscaAtiva,
      setPontosBuscaAtiva,
      selectedEmpresaId,
      setSelectedEmpresaId,
      selectedPontoInstitucionalId,
      setSelectedPontoInstitucionalId,
      layerToggles,
      setLayerToggles,
      panelsVisible,
      setPanelsVisible,
      filtersCollapsed,
      setFiltersCollapsed,
      reportCollapsed,
      setReportCollapsed,
      empresaFiltersCollapsed,
      setEmpresaFiltersCollapsed,
      pontosFiltersCollapsed,
      setPontosFiltersCollapsed,
      empresaFiltersVisible,
      setEmpresaFiltersVisible,
      pontosFiltersVisible,
      setPontosFiltersVisible,
      collapsedReportSections,
      setCollapsedReportSections,
      userLocation,
      setUserLocation,
      locationActive,
      setLocationActive,
      routeEnabled,
      setRouteEnabled,
      routePath,
      routeLoading,
      routeError,
      routeInfo,
      onAdminEditEmpresa,
    }),
    [
      empresas,
      pontosInstitucionais,
      vizinhanca,
      reportLoading,
      reportError,
      filters,
      setFilters,
      empresaBuscaAtiva,
      setEmpresaBuscaAtiva,
      cnaeOptions,
      municipioOptions,
      pontoFilters,
      setPontoFilters,
      pontosBuscaAtiva,
      setPontosBuscaAtiva,
      selectedEmpresaId,
      setSelectedEmpresaId,
      selectedPontoInstitucionalId,
      setSelectedPontoInstitucionalId,
      layerToggles,
      setLayerToggles,
      panelsVisible,
      setPanelsVisible,
      filtersCollapsed,
      setFiltersCollapsed,
      reportCollapsed,
      setReportCollapsed,
      empresaFiltersCollapsed,
      setEmpresaFiltersCollapsed,
      pontosFiltersCollapsed,
      setPontosFiltersCollapsed,
      empresaFiltersVisible,
      setEmpresaFiltersVisible,
      pontosFiltersVisible,
      setPontosFiltersVisible,
      collapsedReportSections,
      setCollapsedReportSections,
      userLocation,
      setUserLocation,
      locationActive,
      setLocationActive,
      routeEnabled,
      setRouteEnabled,
      routePath,
      routeLoading,
      routeError,
      routeInfo,
      onAdminEditEmpresa,
    ],
  );
}
