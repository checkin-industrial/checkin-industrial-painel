import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../shared/api/apiClient";
import { Circle, MapContainer, TileLayer, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { useDraggable } from "../../shared/hooks/useDraggable";
import { MapContext, type MapContextValue } from "./MapContext";
import { useFiltrosEmpresas, INITIAL_PONTO_FILTERS } from "./hooks/useFiltrosEmpresas";
import { useUserLocation } from "./hooks/useUserLocation";
import { useRouteOSRM } from "./hooks/useRouteOSRM";
import { useEmpresasMapData } from "./hooks/useEmpresasMapData";
import { useMapFullscreen } from "./hooks/useMapFullscreen";
import { useMapDeepLink } from "./hooks/useMapDeepLink";
import { FilterPanel } from "./components/FilterPanel";
import { NeighborhoodReportPanel } from "./components/NeighborhoodReportPanel";
import { MapLegend } from "./components/MapLegend";
import { EmpresasMarkersLayer } from "./components/EmpresasMarkersLayer";
import { PontosInstitucionaisMarkersLayer } from "./components/PontosInstitucionaisMarkersLayer";
import { UserLocationLayer } from "./components/UserLocationLayer";
import { RouteOverlay } from "./components/RouteOverlay";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  HeatmapLayer,
  isCoordinateInsideViewportWindow,
  type LatLngTuple,
  MapFocusTarget,
  MapViewport,
} from "./MapHelpers";
import { matchesPontoInstitucionalFilters } from "../pontosInstitucionais/markerHelpers";

// Types movidos pra ./types.ts (compartilhados com sub-componentes).
// MapHelpers.tsx mantem LeafletHeatLayer, HeatmapPointTuple, LatLngTuple.
import type {
  EmpresaFilterMapItem,
  EmpresaVizinhancaResponse,
  MapTargetPoint,
  ReportSectionKey,
  FilterFormState,
  CnaeOption,
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

// Helpers de PontoInstitucional (normalizeTipoPonto, getPontoInstitucionalTipoLabel,
// getPontoInstitucionalTipoBadgeClass, getPontoInstitucionalTipoIcon,
// getPontoInstitucionalTipoIconClass, getPontoInstitucionalColor,
// createPontoInstitucionalMarkerIcon) movidos para ../pontosInstitucionais/markerHelpers.ts
// e re-importados no topo do arquivo.

function hasActiveFilters(filters: FilterFormState) {
  return Object.values(filters).some((value) => value.trim() !== "");
}

function buildCnaeOptions(empresas: EmpresaFilterMapItem[]): CnaeOption[] {
  const uniqueOptions = new Map<string, string>();

  for (const empresa of empresas) {
    if (!empresa.cnaePrincipal) {
      continue;
    }

    const descricao = empresa.descricaoCnae ? ` - ${empresa.descricaoCnae}` : "";
    uniqueOptions.set(empresa.cnaePrincipal, `${empresa.cnaePrincipal}${descricao}`);
  }

  return [{ value: "", label: "Todos" }, ...Array.from(uniqueOptions.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([value, label]) => ({ value, label }))];
}

function buildMunicipioOptions(empresas: EmpresaFilterMapItem[]) {
  const uniqueMunicipios = Array.from(new Set(empresas.map((empresa) => empresa.municipio).filter(Boolean)));

  return uniqueMunicipios.sort((left, right) => left.localeCompare(right));
}

// isCoordinateInsideViewportWindow, MapViewport, MapFocusTarget, HeatmapLayer
// movidos para ./MapHelpers.tsx e re-importados no topo do arquivo.
// buildQueryString agora vive em hooks/useEmpresasMapData.ts (unico consumidor).

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
  const [cnaeOptions, setCnaeOptions] = useState<CnaeOption[]>([{ value: "", label: "Todos" }]);
  const [municipioOptions, setMunicipioOptions] = useState<string[]>([]);
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

  useEffect(() => {
    if (!hasActiveFilters(effectiveFilters) && empresas.length > 0) {
      setCnaeOptions(buildCnaeOptions(empresas));
      setMunicipioOptions(buildMunicipioOptions(empresas));
    }
  }, [empresas, effectiveFilters]);

  useEffect(() => {
    if (selectedEmpresaId && !empresas.some((empresa) => empresa.id === selectedEmpresaId)) {
      setSelectedEmpresaId(null);
    }
  }, [empresas, selectedEmpresaId]);

  useEffect(() => {
    setCollapsedReportSections({
      proximas: false,
      cnae: true,
      setor: true,
    });
  }, [selectedEmpresaId]);

  useEffect(() => {
    if (!selectedPontoInstitucionalId) {
      return;
    }

    const pontoSelecionadoAindaVisivel = pontosInstitucionais
      .filter((ponto) => isCoordinateInsideViewportWindow(ponto.latitude, ponto.longitude))
      .filter((ponto) => matchesPontoInstitucionalFilters(
        ponto,
        pontosBuscaAtiva ? pontoFilters : INITIAL_PONTO_FILTERS,
      ))
      .some((ponto) => ponto.id === selectedPontoInstitucionalId);

    if (!pontoSelecionadoAindaVisivel) {
      setSelectedPontoInstitucionalId(null);
    }
  }, [pontoFilters, pontosInstitucionais, pontosBuscaAtiva, selectedPontoInstitucionalId]);

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

  const center = useMemo<[number, number]>(() => {
    if (empresas.length === 0) {
      return DEFAULT_CENTER;
    }

    const avgLat = empresas.reduce((acc, item) => acc + item.latitude, 0) / empresas.length;
    const avgLng = empresas.reduce((acc, item) => acc + item.longitude, 0) / empresas.length;
    return [avgLat, avgLng];
  }, [empresas]);

  const empresaSelecionadaNoMapa = useMemo(() => {
    if (!selectedEmpresaId) {
      return null;
    }

    return empresas.find((empresa) => empresa.id === selectedEmpresaId) ?? null;
  }, [empresas, selectedEmpresaId]);

  const pontoInstitucionalSelecionado = useMemo(() => {
    if (!selectedPontoInstitucionalId) {
      return null;
    }

    return pontosInstitucionais
      .filter((ponto) => isCoordinateInsideViewportWindow(ponto.latitude, ponto.longitude))
      .filter((ponto) => matchesPontoInstitucionalFilters(
        ponto,
        pontosBuscaAtiva ? pontoFilters : INITIAL_PONTO_FILTERS,
      ))
      .find((ponto) => ponto.id === selectedPontoInstitucionalId) ?? null;
  }, [pontoFilters, pontosInstitucionais, pontosBuscaAtiva, selectedPontoInstitucionalId]);

  const rotaDestino = useMemo<LatLngTuple | null>(() => {
    if (pontoInstitucionalSelecionado) {
      return [pontoInstitucionalSelecionado.latitude, pontoInstitucionalSelecionado.longitude];
    }

    if (empresaSelecionadaNoMapa) {
      return [empresaSelecionadaNoMapa.latitude, empresaSelecionadaNoMapa.longitude];
    }

    return null;
  }, [empresaSelecionadaNoMapa, pontoInstitucionalSelecionado]);

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

  const pontosInstitucionaisFiltrados = useMemo(() => {
    return pontosInstitucionais
      .filter((ponto) => isCoordinateInsideViewportWindow(ponto.latitude, ponto.longitude))
      .filter((ponto) => matchesPontoInstitucionalFilters(
        ponto,
        pontosBuscaAtiva ? pontoFilters : INITIAL_PONTO_FILTERS,
      ));
  }, [pontoFilters, pontosInstitucionais, pontosBuscaAtiva]);

  const analysisCenter = useMemo<[number, number]>(() => {
    if (vizinhanca?.empresaBase) {
      return [vizinhanca.empresaBase.latitude, vizinhanca.empresaBase.longitude];
    }

    if (empresaSelecionadaNoMapa) {
      return [empresaSelecionadaNoMapa.latitude, empresaSelecionadaNoMapa.longitude];
    }

    return center;
  }, [center, empresaSelecionadaNoMapa, vizinhanca]);

  const empresasProximas = useMemo(
    () => vizinhanca?.empresasProximas ?? [],
    [vizinhanca?.empresasProximas],
  );

  const empresasMesmoCnae = useMemo(() => {
    return empresasProximas.filter((empresa) => empresa.mesmoCnae);
  }, [empresasProximas]);

  const empresasMesmoSetor = useMemo(() => {
    return empresasProximas.filter((empresa) => empresa.mesmoSetor);
  }, [empresasProximas]);

  const possuiSelecaoNoMapa = Boolean(selectedEmpresaId || selectedPontoInstitucionalId);

  const avgDistanceKm = useMemo(() => {
    if (empresasProximas.length === 0) {
      return 0;
    }

    const totalDistance = empresasProximas.reduce((acc, empresa) => {
      return acc + empresa.distanciaMetros / 1000;
    }, 0);

    return totalDistance / empresasProximas.length;
  }, [empresasProximas]);

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