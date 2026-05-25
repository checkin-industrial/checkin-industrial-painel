import { useState } from "react";
// `leaflet.heat` e `leaflet.markercluster` se acoplam na global `L` exposta pelo
// pacote `leaflet`. O `import "leaflet"` precisa rodar ANTES dos plugins pra
// que `window.L` exista no momento do `leaflet.heat` registrar `L.heatLayer`.
import "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { useDraggable } from "../../shared/hooks/useDraggable";
import { MapContext } from "./MapContext";
import { useFiltrosEmpresas } from "./hooks/useFiltrosEmpresas";
import { useUserLocation } from "./hooks/useUserLocation";
import { useRouteOSRM } from "./hooks/useRouteOSRM";
import { useEmpresasMapData } from "./hooks/useEmpresasMapData";
import { useMapFullscreen } from "./hooks/useMapFullscreen";
import { useMapDeepLink } from "./hooks/useMapDeepLink";
import { useCnaeMunicipioOptions } from "./hooks/useCnaeMunicipioOptions";
import { useEmpresaMapSelectionEffects } from "./hooks/useEmpresaMapSelectionEffects";
import { useMapDerivedSelection } from "./hooks/useMapDerivedSelection";
import { useMapContextValue } from "./hooks/useMapContextValue";
import { usePanelVisibility } from "./hooks/usePanelVisibility";
import { useEmpresaVizinhanca } from "./hooks/useEmpresaVizinhanca";
import { FilterPanel } from "./components/FilterPanel";
import { NeighborhoodReportPanel } from "./components/NeighborhoodReportPanel";
import { MapLegend } from "./components/MapLegend";
import { MapStage } from "./components/MapStage";
import type { LatLngTuple } from "./MapHelpers";

// Types movidos pra ./types.ts (compartilhados com sub-componentes).
// MapHelpers.tsx mantem LeafletHeatLayer, HeatmapPointTuple, LatLngTuple.
import type {
  MapTargetPoint,
  ReportSectionKey,
  LayerToggleState,
} from "./types";

type EmpresasFilterMapExampleProps = {
  mapTargetPoint?: MapTargetPoint | null;
  // Admin atalho: callback que abre a empresa direto na tela de Gestao em
  // modo de edicao. Quando definida + usuario autenticado, o painel de
  // Relatorio mostra um botao "Editar cadastro" no card da empresa base.
  onAdminEditEmpresa?: (empresaId: string) => void;
};

// Opcoes de filtro (SETOR/PORTE/SITUACAO/TIPO de ponto) moveram pra
// components/FilterPanel.tsx - sao usadas apenas la.
// CLUSTER_THRESHOLD vive em components/EmpresasMarkersLayer.tsx (consumidor unico).
// DEFAULT_CENTER, DEFAULT_ZOOM, MAP_BOUNDS movidos pra ./MapHelpers.tsx - re-importados acima.

const INITIAL_LAYER_TOGGLES: LayerToggleState = {
  heatmap: false,
  marcadores: false,
  raioAnalise: false,
  rotulosEmpresas: false,
  pontosInstitucionais: true,
};

// Helpers de PontoInstitucional (label/badge/icon/iconClass/color/createIcon)
// vivem em ../pontosInstitucionais/markerHelpers.ts e sao re-usados pelos
// MarkersLayers.
// MapHelpers (DEFAULT_CENTER, MapViewport, MapFocusTarget, HeatmapLayer,
// isCoordinateInsideViewportWindow) sao re-exportados acima.
// Hooks especializados (vide hooks/) cobrem: filtros, localizacao, rota,
// queries de dados, fullscreen, deep-link, opcoes de CNAE/municipio,
// efeitos de selecao + memos derivados.

export function EmpresasFilterMapExample({ mapTargetPoint, onAdminEditEmpresa }: EmpresasFilterMapExampleProps) {
  const {
    filters,
    setFilters,
    pontoFilters,
    setPontoFilters,
    empresaBuscaAtiva,
    setEmpresaBuscaAtiva,
    pontosBuscaAtiva,
    setPontosBuscaAtiva,
    effectiveFilters,
    pontosTipoEfetivo,
    handleFilterChange,
    handlePontoFilterChange,
    toggleEmpresaBusca,
    togglePontosBusca,
    handleClearFiltros,
  } = useFiltrosEmpresas();
  const {
    filtersCollapsed,
    setFiltersCollapsed,
    empresaFiltersCollapsed,
    setEmpresaFiltersCollapsed,
    pontosFiltersCollapsed,
    setPontosFiltersCollapsed,
    empresaFiltersVisible,
    setEmpresaFiltersVisible,
    pontosFiltersVisible,
    setPontosFiltersVisible,
    reportCollapsed,
    setReportCollapsed,
    panelsVisible,
    setPanelsVisible,
    toggleFiltersPanel,
    resetFiltersBoxes,
  } = usePanelVisibility();
  const [layerToggles, setLayerToggles] = useState<LayerToggleState>(INITIAL_LAYER_TOGGLES);
  const { mapStageRef, isMapFullscreen, handleToggleFullscreen } = useMapFullscreen();
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | null>(null);
  const [selectedPontoInstitucionalId, setSelectedPontoInstitucionalId] = useState<string | null>(null);
  const {
    userLocation,
    setUserLocation,
    locationActive,
    setLocationActive,
    requestUserLocation,
    toggleUserLocation,
  } = useUserLocation();
  const [routeEnabled, setRouteEnabled] = useState(false);
  const [mapFocusTarget, setMapFocusTarget] = useState<LatLngTuple | null>(null);
  const [collapsedReportSections, setCollapsedReportSections] = useState<Record<ReportSectionKey, boolean>>({
    proximas: false,
    cnae: true,
    setor: true,
  });
  const {
    empresas,
    loading,
    error,
    heatmapPoints,
    heatmapLoading,
    pontosInstitucionais,
  } = useEmpresasMapData({
    effectiveFilters,
    pontosTipoEfetivo,
    heatmapEnabled: layerToggles.heatmap,
  });

  const { cnaeOptions, municipioOptions } = useCnaeMunicipioOptions({
    empresas,
    effectiveFilters,
  });

  useMapDeepLink({
    mapTargetPoint,
    setPontoFilters,
    setPontosBuscaAtiva,
    setLayerToggles,
    setSelectedEmpresaId,
    setSelectedPontoInstitucionalId,
    setReportCollapsed,
    setPanelsVisible,
    setMapFocusTarget,
  });

  const { vizinhanca, reportLoading, reportError } = useEmpresaVizinhanca(selectedEmpresaId);

  function handleClear() {
    handleClearFiltros();
    setSelectedEmpresaId(null);
    setSelectedPontoInstitucionalId(null);
    resetFiltersBoxes();
  }

  const {
    center,
    empresaSelecionadaNoMapa,
    pontoInstitucionalSelecionado,
    rotaDestino,
    pontosInstitucionaisFiltrados,
    analysisCenter,
    empresasMesmoCnae,
    empresasMesmoSetor,
    avgDistanceKm,
  } = useMapDerivedSelection({
    empresas,
    pontosInstitucionais,
    pontoFilters,
    pontosBuscaAtiva,
    selectedEmpresaId,
    selectedPontoInstitucionalId,
    vizinhanca,
  });

  useEmpresaMapSelectionEffects({
    empresas,
    pontosInstitucionais,
    pontoFilters,
    pontosBuscaAtiva,
    selectedEmpresaId,
    setSelectedEmpresaId,
    selectedPontoInstitucionalId,
    setSelectedPontoInstitucionalId,
    setCollapsedReportSections,
  });

  const {
    routePath,
    routeLoading,
    routeError,
    routeInfo,
  } = useRouteOSRM({
    routeEnabled,
    userLocation,
    locationActive,
    destino: rotaDestino,
  });

  function handleRouteFromReportAddress() {
    // routeError sai derivado do hook ("Selecione um ponto..." quando rotaDestino=null)
    // se o usuario tentar tracar rota sem selecionar destino. Sempre habilita pra
    // surfacar o erro derivado ou avancar o fluxo se condicoes ok.
    setRouteEnabled(true);
    if (rotaDestino && !userLocation) {
      requestUserLocation();
    }
  }

  const possuiSelecaoNoMapa = Boolean(selectedEmpresaId || selectedPontoInstitucionalId);

  function toggleReportSection(section: ReportSectionKey) {
    setCollapsedReportSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }

  function toggleLayer(layer: keyof LayerToggleState) {
    setLayerToggles((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }

  // Draggable hooks for the panels
  const filtersPanelDraggable = useDraggable("filters-panel");
  const reportPanelDraggable = useDraggable("report-panel");

  // Bundle do state para sub-componentes via Context. Hook memoiza o value
  // - mudar qualquer campo recria o objeto e re-renderiza consumers.
  const mapContextValue = useMapContextValue({
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
  });

  return (
    <MapContext.Provider value={mapContextValue}>
    <section className="map-dashboard-layout">
      <section className="map-main-panel">
        <div className={isMapFullscreen ? "map-stage is-fullscreen" : "map-stage"} ref={mapStageRef}>

          <FilterPanel
            draggable={filtersPanelDraggable}
            onFilterChange={handleFilterChange}
            onPontoFilterChange={handlePontoFilterChange}
            onToggleEmpresaBusca={toggleEmpresaBusca}
            onTogglePontosBusca={togglePontosBusca}
            onClear={handleClear}
            loading={loading}
            error={error}
            pontosFiltradosCount={pontosInstitucionaisFiltrados.length}
          />


          <NeighborhoodReportPanel
            draggable={reportPanelDraggable}
            possuiSelecao={possuiSelecaoNoMapa}
            pontoInstitucionalSelecionado={pontoInstitucionalSelecionado}
            empresasMesmoCnae={empresasMesmoCnae}
            empresasMesmoSetor={empresasMesmoSetor}
            avgDistanceKm={avgDistanceKm}
            onRouteFromAddress={handleRouteFromReportAddress}
            onToggleReportSection={toggleReportSection}
          />

          <MapStage
            center={center}
            isMapFullscreen={isMapFullscreen}
            mapFocusTarget={mapFocusTarget}
            loading={loading}
            heatmapLoading={heatmapLoading}
            heatmapPoints={heatmapPoints}
            analysisCenter={analysisCenter}
            showRaioAnalise={
              layerToggles.raioAnalise && Boolean(empresaSelecionadaNoMapa || vizinhanca?.empresaBase)
            }
          />

          <MapLegend
            isMapFullscreen={isMapFullscreen}
            onToggleLayer={toggleLayer}
            onToggleUserLocation={toggleUserLocation}
            onToggleFullscreen={handleToggleFullscreen}
            onToggleFiltersPanel={toggleFiltersPanel}
          />
        </div>
      </section>

    </section>
    </MapContext.Provider>
  );
}