import { createContext } from "react";
import type {
  CnaeOption,
  EmpresaFilterMapItem,
  EmpresaVizinhancaResponse,
  FilterFormState,
  LayerToggleState,
  PontoInstitucionalFilterState,
  ReportSectionKey,
} from "./types";
import type { LatLngTuple } from "./MapHelpers";
import type { PontoInstitucionalMapItem } from "../pontosInstitucionais/markerHelpers";

// Estado agrupado e exposto via Context para sub-componentes da feature do mapa
// (FilterPanel, NeighborhoodOverlay, RouteOverlay, StatsPanel). Mantem o
// container EmpresasFilterMapExample slim - state mora la, mas os consumers
// nao precisam mais receber dezenas de props.
//
// Trade-off conhecido: qualquer mudanca em qualquer campo re-renderiza todos
// os consumidores. Pra escopo atual (4-5 sub-componentes, interatividade
// humana) e aceitavel. Se virar gargalo, dividir em Contexts menores
// (FiltersContext / SelectionContext / RouteContext).
export type MapContextValue = {
  // Dados servidos
  empresas: EmpresaFilterMapItem[];
  pontosInstitucionais: PontoInstitucionalMapItem[];
  vizinhanca: EmpresaVizinhancaResponse | null | undefined;
  reportLoading: boolean;
  reportError: string | null;

  // Filtros de empresa
  filters: FilterFormState;
  setFilters: React.Dispatch<React.SetStateAction<FilterFormState>>;
  empresaBuscaAtiva: boolean;
  setEmpresaBuscaAtiva: React.Dispatch<React.SetStateAction<boolean>>;
  cnaeOptions: CnaeOption[];
  municipioOptions: string[];

  // Filtros de pontos institucionais
  pontoFilters: PontoInstitucionalFilterState;
  setPontoFilters: React.Dispatch<React.SetStateAction<PontoInstitucionalFilterState>>;
  pontosBuscaAtiva: boolean;
  setPontosBuscaAtiva: React.Dispatch<React.SetStateAction<boolean>>;

  // Seleção
  selectedEmpresaId: string | null;
  setSelectedEmpresaId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedPontoInstitucionalId: string | null;
  setSelectedPontoInstitucionalId: React.Dispatch<React.SetStateAction<string | null>>;

  // Camadas
  layerToggles: LayerToggleState;
  setLayerToggles: React.Dispatch<React.SetStateAction<LayerToggleState>>;

  // Painéis e collapse
  panelsVisible: { filtros: boolean; relatorio: boolean };
  setPanelsVisible: React.Dispatch<React.SetStateAction<{ filtros: boolean; relatorio: boolean }>>;
  filtersCollapsed: boolean;
  setFiltersCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  reportCollapsed: boolean;
  setReportCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  empresaFiltersCollapsed: boolean;
  setEmpresaFiltersCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  pontosFiltersCollapsed: boolean;
  setPontosFiltersCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  empresaFiltersVisible: boolean;
  setEmpresaFiltersVisible: React.Dispatch<React.SetStateAction<boolean>>;
  pontosFiltersVisible: boolean;
  setPontosFiltersVisible: React.Dispatch<React.SetStateAction<boolean>>;
  collapsedReportSections: Record<ReportSectionKey, boolean>;
  setCollapsedReportSections: React.Dispatch<React.SetStateAction<Record<ReportSectionKey, boolean>>>;

  // Localização + rota
  userLocation: { latitude: number; longitude: number } | null;
  setUserLocation: React.Dispatch<React.SetStateAction<{ latitude: number; longitude: number } | null>>;
  locationActive: boolean;
  setLocationActive: React.Dispatch<React.SetStateAction<boolean>>;
  routeEnabled: boolean;
  setRouteEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  routePath: LatLngTuple[];
  setRoutePath: React.Dispatch<React.SetStateAction<LatLngTuple[]>>;
  routeLoading: boolean;
  setRouteLoading: React.Dispatch<React.SetStateAction<boolean>>;
  routeError: string | null;
  setRouteError: React.Dispatch<React.SetStateAction<string | null>>;
  routeInfo: { distanceKm: number; durationMin: number } | null;
  setRouteInfo: React.Dispatch<React.SetStateAction<{ distanceKm: number; durationMin: number } | null>>;

  // Atalho admin pra editar empresa direto do mapa
  onAdminEditEmpresa?: (empresaId: string) => void;
};

// Arquivo "puro" (so type + Context object), exigido pelo
// react-refresh/only-export-components: nao exporta componentes nem hooks,
// entao Fast Refresh nao se interessa.
//   - useMapContext() mora em ./useMapContext.ts
//   - Consumers usam <MapContext.Provider value={...}> diretamente
//     (o EmpresasFilterMapExample importa MapContext daqui)
export const MapContext = createContext<MapContextValue | null>(null);
