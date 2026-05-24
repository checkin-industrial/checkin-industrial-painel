import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../shared/api/apiClient";
import { Circle, MapContainer, TileLayer, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { useDraggable } from "../../shared/hooks/useDraggable";
import { MapContext, type MapContextValue } from "./MapContext";
import { useFiltrosEmpresas } from "./hooks/useFiltrosEmpresas";
import { useUserLocation } from "./hooks/useUserLocation";
import { useRouteOSRM } from "./hooks/useRouteOSRM";
import { useEmpresasMapData } from "./hooks/useEmpresasMapData";
import { useMapFullscreen } from "./hooks/useMapFullscreen";
import { useMapDeepLink } from "./hooks/useMapDeepLink";
import { useCnaeMunicipioOptions } from "./hooks/useCnaeMunicipioOptions";
import { useEmpresaMapSelectionEffects } from "./hooks/useEmpresaMapSelectionEffects";
import { useMapDerivedSelection } from "./hooks/useMapDerivedSelection";
import { FilterPanel } from "./components/FilterPanel";
import { NeighborhoodReportPanel } from "./components/NeighborhoodReportPanel";
import { MapLegend } from "./components/MapLegend";
import { EmpresasMarkersLayer } from "./components/EmpresasMarkersLayer";
import { PontosInstitucionaisMarkersLayer } from "./components/PontosInstitucionaisMarkersLayer";
import { UserLocationLayer } from "./components/UserLocationLayer";
import { RouteOverlay } from "./components/RouteOverlay";
import { DEFAULT_ZOOM, HeatmapLayer, type LatLngTuple, MapFocusTarget, MapViewport } from "./MapHelpers";

// Types movidos pra ./types.ts (compartilhados com sub-componentes).
// MapHelpers.tsx mantem LeafletHeatLayer, HeatmapPointTuple, LatLngTuple.
import type {
  EmpresaVizinhancaResponse,
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
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [empresaFiltersCollapsed, setEmpresaFiltersCollapsed] = useState(false);
  const [pontosFiltersCollapsed, setPontosFiltersCollapsed] = useState(false);
  const [empresaFiltersVisible, setEmpresaFiltersVisible] = useState(true);
  const [pontosFiltersVisible, setPontosFiltersVisible] = useState(true);
  const [reportCollapsed, setReportCollapsed] = useState(false);
  const [panelsVisible, setPanelsVisible] = useState({
    filtros: false,
    relatorio: true,
  });
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

  const {
    data: vizinhanca = null,
    isFetching: reportLoading,
    error: vizinhancaQueryError,
  } = useQuery({
    queryKey: ["empresas", selectedEmpresaId, "neighbors"],
    queryFn: () =>
      apiFetch<EmpresaVizinhancaResponse>(
        "GET",
        `/api/empresas/${selectedEmpresaId}/neighbors?radius=5000&limit=20`,
      ),
    enabled: !!selectedEmpresaId,
  });

  const reportError =
    selectedEmpresaId && vizinhancaQueryError instanceof Error
      ? vizinhancaQueryError.message
      : null;

  function handleClear() {
    handleClearFiltros();
    setSelectedEmpresaId(null);
    setSelectedPontoInstitucionalId(null);
    setEmpresaFiltersVisible(true);
    setPontosFiltersVisible(true);
    setEmpresaFiltersCollapsed(false);
    setPontosFiltersCollapsed(false);
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

  function toggleFiltersPanel() {
    setPanelsVisible((prev) => {
      const nextVisible = !prev.filtros;
      if (nextVisible) {
        setFiltersCollapsed(false);
      }

      return { ...prev, filtros: nextVisible };
    });
  }

  function toggleLayer(layer: keyof LayerToggleState) {
    setLayerToggles((prev) => ({ ...prev, [layer]: !prev[layer] }));
  }

  // Draggable hooks for the panels
  const filtersPanelDraggable = useDraggable("filters-panel");
  const reportPanelDraggable = useDraggable("report-panel");

  // Bundle do state para sub-componentes via Context. Memo evita value novo
  // a cada render (re-render desnecessario nos consumers).
  const mapContextValue: MapContextValue = useMemo(
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
      selectedPontoInstitucionalId,
      layerToggles,
      panelsVisible,
      filtersCollapsed,
      reportCollapsed,
      empresaFiltersCollapsed,
      pontosFiltersCollapsed,
      empresaFiltersVisible,
      pontosFiltersVisible,
      collapsedReportSections,
      userLocation,
      setUserLocation,
      locationActive,
      setLocationActive,
      routeEnabled,
      routePath,
      routeLoading,
      routeError,
      routeInfo,
      onAdminEditEmpresa,
    ],
  );

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

          <div className="map-wrapper">
            {(loading || heatmapLoading) && (
              <div className="map-loading-overlay">
                <div className="map-loading-spinner" />
                <span className="map-loading-label">
                  {heatmapLoading && !loading ? "Carregando mapa de calor…" : "Carregando empresas…"}
                </span>
              </div>
            )}
            <MapContainer
              center={center}
              zoom={DEFAULT_ZOOM}
              zoomControl={false}
              style={{ height: isMapFullscreen ? "100%" : "calc(100vh - 56px)", width: "100%" }}
            >
              <MapFocusTarget target={mapFocusTarget} />
              <ZoomControl position="bottomright" />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapViewport empresas={empresas} autoFit={layerToggles.marcadores} />

              {layerToggles.heatmap && <HeatmapLayer points={heatmapPoints} />}

              {layerToggles.raioAnalise && (empresaSelecionadaNoMapa || vizinhanca?.empresaBase) && (
                <Circle
                  center={analysisCenter}
                  radius={5000}
                  pathOptions={{ color: "#7c3aed", fillColor: "#7c3aed", fillOpacity: 0.06, weight: 2 }}
                />
              )}

              <EmpresasMarkersLayer />
              <PontosInstitucionaisMarkersLayer />
              <RouteOverlay />
              <UserLocationLayer />
            </MapContainer>
          </div>

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