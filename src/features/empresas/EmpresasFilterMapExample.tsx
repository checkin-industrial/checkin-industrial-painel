import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../shared/api/apiClient";
import L from "leaflet";
import { Circle, MapContainer, Marker, Polyline, TileLayer, Tooltip, ZoomControl } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { createEmpresaMarkerIcon } from "./EmpresaMarker";
import { useDraggable } from "../../shared/hooks/useDraggable";
import { MapContext, type MapContextValue } from "./MapContext";
import { FilterPanel } from "./components/FilterPanel";
import { NeighborhoodReportPanel } from "./components/NeighborhoodReportPanel";
import { MapLegend } from "./components/MapLegend";
import {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  HeatmapLayer,
  type HeatmapPointTuple,
  isCoordinateInsideViewportWindow,
  type LatLngTuple,
  MapFocusTarget,
  MapViewport,
} from "./MapHelpers";
import {
  createPontoInstitucionalMarkerIcon,
  getPontoInstitucionalTipoLabel,
  normalizeTipoPonto,
  type PontoInstitucionalMapItem,
} from "../pontosInstitucionais/markerHelpers";

// Types movidos pra ./types.ts (compartilhados com sub-componentes).
// MapHelpers.tsx mantem LeafletHeatLayer, HeatmapPointTuple, LatLngTuple.
import type {
  EmpresaFilterMapItem,
  EmpresaVizinhancaResponse,
  HeatmapPointApi,
  MapTargetPoint,
  ReportSectionKey,
  FilterFormState,
  PontoInstitucionalFilterState,
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

// Acima desse N de markers visiveis, agrupa em clusters automaticamente.
const CLUSTER_THRESHOLD = 200;

// Opcoes de filtro (SETOR/PORTE/SITUACAO/TIPO de ponto) moveram pra
// components/FilterPanel.tsx - sao usadas apenas la.

// DEFAULT_CENTER, DEFAULT_ZOOM, MAP_BOUNDS movidos pra ./MapHelpers.tsx - re-importados acima.

const INITIAL_FILTERS: FilterFormState = {
  nomeFantasia: "",
  setor: "",
  porte: "",
  cnae: "",
  municipio: "",
  situacao: "",
};

const INITIAL_PONTO_FILTERS: PontoInstitucionalFilterState = {
  termo: "",
  tipo: "",
};

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

function buildQueryString(filters: FilterFormState) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    const trimmed = value.trim();
    if (trimmed) {
      params.set(key, trimmed);
    }
  }

  return params.toString();
}

function matchesPontoInstitucionalFilters(
  ponto: PontoInstitucionalMapItem,
  filters: PontoInstitucionalFilterState,
) {
  const tipo = filters.tipo.trim().toLowerCase();
  if (tipo && normalizeTipoPonto(ponto.tipo) !== tipo) {
    return false;
  }

  const termo = filters.termo.trim().toLowerCase();
  if (!termo) {
    return true;
  }

  const searchableText = [
    ponto.nome,
    ponto.descricao,
    ponto.endereco,
    ponto.atividadesDisponiveis,
    ponto.equipeGestao,
    ponto.contatoNome,
    ponto.contatoTelefone,
    ponto.contatoEmail,
    getPontoInstitucionalTipoLabel(ponto.tipo),
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(termo);
}

export function EmpresasFilterMapExample({ mapTargetPoint, onAdminEditEmpresa }: EmpresasFilterMapExampleProps) {
  const [filters, setFilters] = useState<FilterFormState>(INITIAL_FILTERS);
  const [pontoFilters, setPontoFilters] = useState<PontoInstitucionalFilterState>(INITIAL_PONTO_FILTERS);
  const [cnaeOptions, setCnaeOptions] = useState<CnaeOption[]>([{ value: "", label: "Todos" }]);
  const [municipioOptions, setMunicipioOptions] = useState<string[]>([]);
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [empresaFiltersCollapsed, setEmpresaFiltersCollapsed] = useState(false);
  const [pontosFiltersCollapsed, setPontosFiltersCollapsed] = useState(false);
  const [empresaFiltersVisible, setEmpresaFiltersVisible] = useState(true);
  const [pontosFiltersVisible, setPontosFiltersVisible] = useState(true);
  const [empresaBuscaAtiva, setEmpresaBuscaAtiva] = useState(true);
  const [pontosBuscaAtiva, setPontosBuscaAtiva] = useState(true);
  const [reportCollapsed, setReportCollapsed] = useState(false);
  const [panelsVisible, setPanelsVisible] = useState({
    filtros: false,
    relatorio: true,
  });
  const [layerToggles, setLayerToggles] = useState<LayerToggleState>(INITIAL_LAYER_TOGGLES);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | null>(null);
  const [selectedPontoInstitucionalId, setSelectedPontoInstitucionalId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationActive, setLocationActive] = useState(false);
  const [routeEnabled, setRouteEnabled] = useState(false);
  const [routePath, setRoutePath] = useState<LatLngTuple[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [mapFocusTarget, setMapFocusTarget] = useState<LatLngTuple | null>(null);
  const [collapsedReportSections, setCollapsedReportSections] = useState<Record<ReportSectionKey, boolean>>({
    proximas: false,
    cnae: true,
    setor: true,
  });
  const mapStageRef = useRef<HTMLDivElement | null>(null);
  const lastMapTargetRequestRef = useRef<number | null>(null);

  const effectiveFilters = empresaBuscaAtiva ? filters : INITIAL_FILTERS;
  const pontosTipoEfetivo = pontosBuscaAtiva ? pontoFilters.tipo : "";

  const {
    data: empresas = [],
    isFetching: loading,
    error: empresasQueryError,
  } = useQuery({
    queryKey: ["empresas", "filter", effectiveFilters],
    queryFn: async () => {
      // Widget publico sempre filtra Status=Ativo; empresas Inativo (soft-delete) e
      // AguardandoRevisao (import nao aprovado) so aparecem na Gestao Admin.
      const params = new URLSearchParams(buildQueryString(effectiveFilters));
      params.set("status", "ativo");
      const endpoint = `/api/empresas/filter?${params.toString()}`;
      const data = await apiFetch<EmpresaFilterMapItem[]>("GET", endpoint);
      return Array.isArray(data) ? data : [];
    },
  });

  const error = empresasQueryError instanceof Error ? empresasQueryError.message : null;

  const {
    data: heatmapPoints = [],
    isFetching: heatmapLoading,
  } = useQuery({
    queryKey: ["empresas", "heatmap", effectiveFilters.cnae.trim(), effectiveFilters.setor.trim()],
    queryFn: async () => {
      const params = new URLSearchParams();
      const cnae = effectiveFilters.cnae.trim();
      const setor = effectiveFilters.setor.trim();
      if (cnae) params.set("cnae", cnae);
      if (setor) params.set("setor", setor);
      const endpoint = params.toString() ? `/api/analytics/heatmap?${params.toString()}` : "/api/analytics/heatmap";
      try {
        const data = await apiFetch<HeatmapPointApi[]>("GET", endpoint);
        return (Array.isArray(data) ? data : [])
          .filter((point) => isCoordinateInsideViewportWindow(point.latitude, point.longitude))
          .map((point) => [point.latitude, point.longitude, Math.max(1, point.peso)] as HeatmapPointTuple);
      } catch {
        return [] as HeatmapPointTuple[];
      }
    },
    enabled: layerToggles.heatmap,
  });

  const {
    data: pontosInstitucionais = [],
  } = useQuery({
    queryKey: ["pontos-institucionais", "mapa", pontosTipoEfetivo.trim().toLowerCase()],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("ativo", "true");
      const tipoNormalizado = pontosTipoEfetivo.trim().toLowerCase();
      if (tipoNormalizado) params.set("tipo", tipoNormalizado);
      try {
        const data = await apiFetch<PontoInstitucionalMapItem[]>(
          "GET",
          `/api/pontos-institucionais?${params.toString()}`,
        );
        return (Array.isArray(data) ? data : [])
          .sort((left, right) => left.ordemExibicao - right.ordemExibicao);
      } catch {
        return [] as PontoInstitucionalMapItem[];
      }
    },
  });

  useEffect(() => {
    if (!hasActiveFilters(effectiveFilters) && empresas.length > 0) {
      setCnaeOptions(buildCnaeOptions(empresas));
      setMunicipioOptions(buildMunicipioOptions(empresas));
    }
  }, [empresas, effectiveFilters]);

  function requestUserLocation() {
    if (!navigator.geolocation) {
      alert("Seu navegador não suporta geolocalização.");
      return;
    }

    setLocationActive(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.error("Erro ao obter localização:", error);
        alert("Não foi possível obter sua localização. Verifique as permissões.");
        setLocationActive(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  function toggleUserLocation() {
    if (locationActive) {
      setLocationActive(false);
      setUserLocation(null);
      setRoutePath([]);
      setRouteInfo(null);
    } else {
      requestUserLocation();
    }
  }

  function handleRouteFromReportAddress() {
    if (!rotaDestino) {
      setRouteError("Selecione um ponto no mapa para traçar a rota.");
      setRouteEnabled(false);
      return;
    }

    setRouteEnabled(true);
    setRouteError(null);

    if (!userLocation) {
      requestUserLocation();
    }
  }

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

  useEffect(() => {
    if (!mapTargetPoint) {
      return;
    }

    if (lastMapTargetRequestRef.current === mapTargetPoint.requestId) {
      return;
    }

    lastMapTargetRequestRef.current = mapTargetPoint.requestId;
    setPontoFilters(INITIAL_PONTO_FILTERS);
    setPontosBuscaAtiva(true);
    setLayerToggles((prev) => ({ ...prev, pontosInstitucionais: true }));
    setSelectedEmpresaId(null);
    setSelectedPontoInstitucionalId(mapTargetPoint.id);
    setReportCollapsed(false);
    setPanelsVisible((prev) => ({ ...prev, filtros: false, relatorio: true }));
    setMapFocusTarget([mapTargetPoint.latitude, mapTargetPoint.longitude]);
  }, [mapTargetPoint]);

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

  useEffect(() => {
    function handleFullscreenChange() {
      setIsMapFullscreen(document.fullscreenElement === mapStageRef.current);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  async function handleToggleFullscreen() {
    try {
      if (document.fullscreenElement === mapStageRef.current) {
        await document.exitFullscreen();
        return;
      }

      if (mapStageRef.current?.requestFullscreen) {
        await mapStageRef.current.requestFullscreen();
      }
    } catch {
      setIsMapFullscreen((prev) => !prev);
    }
  }

  function handleClear() {
    setFilters(INITIAL_FILTERS);
    setPontoFilters(INITIAL_PONTO_FILTERS);
    setSelectedEmpresaId(null);
    setSelectedPontoInstitucionalId(null);
    setEmpresaBuscaAtiva(true);
    setPontosBuscaAtiva(true);
    setEmpresaFiltersVisible(true);
    setPontosFiltersVisible(true);
    setEmpresaFiltersCollapsed(false);
    setPontosFiltersCollapsed(false);
  }

  function handleFilterChange(field: keyof FilterFormState, value: string) {
    setFilters((current) => ({ ...current, [field]: value }));
  }

  function handlePontoFilterChange(field: keyof PontoInstitucionalFilterState, value: string) {
    setPontoFilters((current) => ({ ...current, [field]: value }));
  }

  function toggleEmpresaBusca() {
    setEmpresaBuscaAtiva((prev) => !prev);
  }

  function togglePontosBusca() {
    const next = !pontosBuscaAtiva;
    setPontosBuscaAtiva(next);
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

  useEffect(() => {
    if (!routeEnabled) {
      setRouteLoading(false);
      setRouteError(null);
      setRoutePath([]);
      setRouteInfo(null);
      return;
    }

    if (!locationActive || !userLocation) {
      setRouteLoading(false);
      setRoutePath([]);
      setRouteInfo(null);
      setRouteError("Ative sua localização para calcular a rota.");
      return;
    }

    if (!rotaDestino) {
      setRouteLoading(false);
      setRoutePath([]);
      setRouteInfo(null);
      setRouteError("Selecione um ponto no mapa para traçar a rota.");
      return;
    }

    const origemAtual = userLocation;
    const destinoAtual = rotaDestino;

    if (!origemAtual || !destinoAtual) {
      setRouteLoading(false);
      setRoutePath([]);
      setRouteInfo(null);
      return;
    }

    let cancelled = false;

    async function fetchRoute() {
      setRouteLoading(true);
      setRouteError(null);

      try {
        const [origemLat, origemLng] = [origemAtual.latitude, origemAtual.longitude];
        const [destinoLat, destinoLng] = destinoAtual;
        const endpoint = `https://router.project-osrm.org/route/v1/driving/${origemLng},${origemLat};${destinoLng},${destinoLat}?overview=full&geometries=geojson&steps=false`;
        const response = await fetch(endpoint);

        if (!response.ok) {
          throw new Error(`Falha ao calcular rota (${response.status})`);
        }

        const data = await response.json() as {
          routes?: Array<{
            distance: number;
            duration: number;
            geometry: { coordinates: Array<[number, number]> };
          }>;
        };

        const route = data.routes?.[0];
        if (!route?.geometry?.coordinates?.length) {
          throw new Error("Rota indisponível para o destino selecionado.");
        }

        if (!cancelled) {
          const coordinates = route.geometry.coordinates
            .map(([lng, lat]) => [lat, lng] as LatLngTuple);

          setRoutePath(coordinates);
          setRouteInfo({
            distanceKm: route.distance / 1000,
            durationMin: route.duration / 60,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setRoutePath([]);
          setRouteInfo(null);
          setRouteError(err instanceof Error ? err.message : "Não foi possível calcular a rota.");
        }
      } finally {
        if (!cancelled) {
          setRouteLoading(false);
        }
      }
    }

    fetchRoute();

    return () => {
      cancelled = true;
    };
  }, [locationActive, routeEnabled, rotaDestino, userLocation]);

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
      setRoutePath,
      routeLoading,
      setRouteLoading,
      routeError,
      setRouteError,
      routeInfo,
      setRouteInfo,
      onAdminEditEmpresa,
    }),
    [
      empresas,
      pontosInstitucionais,
      vizinhanca,
      reportLoading,
      reportError,
      filters,
      empresaBuscaAtiva,
      cnaeOptions,
      municipioOptions,
      pontoFilters,
      pontosBuscaAtiva,
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
      locationActive,
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

              {layerToggles.marcadores && (() => {
                const visiveis = empresas.filter((empresa) =>
                  isCoordinateInsideViewportWindow(empresa.latitude, empresa.longitude),
                );
                const markers = visiveis.map((empresa) => (
                  <Marker
                    key={empresa.id}
                    position={[empresa.latitude, empresa.longitude]}
                    icon={createEmpresaMarkerIcon(
                      empresa.setor,
                      empresa.id === selectedEmpresaId,
                      empresa.nomeFantasia,
                      layerToggles.rotulosEmpresas || empresa.id === selectedEmpresaId,
                    )}
                    eventHandlers={{
                      click: () => {
                        if (selectedEmpresaId === empresa.id) {
                          if (!panelsVisible.relatorio) {
                            setReportCollapsed(false);
                            setPanelsVisible((prev) => ({ ...prev, filtros: false, relatorio: true }));
                            return;
                          }

                          setSelectedEmpresaId(null);
                          return;
                        }

                        setSelectedEmpresaId(empresa.id);
                        setSelectedPontoInstitucionalId(null);
                        setReportCollapsed(false);
                        setPanelsVisible((prev) => ({ ...prev, filtros: false, relatorio: true }));
                      },
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -10]}>
                      <div>
                        <strong>{empresa.nomeFantasia}</strong>
                        <br />
                        <strong>Atividade:</strong> {empresa.descricaoCnae || empresa.cnaePrincipal}
                      </div>
                    </Tooltip>
                  </Marker>
                ));

                // Clusters quando densidade compromete performance/legibilidade.
                // Limite empirico (mecanica-hermes degradou em ~200 markers visiveis).
                return visiveis.length > CLUSTER_THRESHOLD
                  ? <MarkerClusterGroup chunkedLoading>{markers}</MarkerClusterGroup>
                  : <>{markers}</>;
              })()}

              {layerToggles.pontosInstitucionais && pontosInstitucionaisFiltrados.map((ponto) => (
                <Marker
                  key={ponto.id}
                  position={[ponto.latitude, ponto.longitude]}
                  icon={createPontoInstitucionalMarkerIcon(
                    ponto,
                    ponto.id === selectedPontoInstitucionalId,
                    layerToggles.rotulosEmpresas || ponto.id === selectedPontoInstitucionalId,
                  )}
                  eventHandlers={{
                    click: () => {
                      setSelectedPontoInstitucionalId(ponto.id);
                      setSelectedEmpresaId(null);
                      setReportCollapsed(false);
                      setPanelsVisible((prev) => ({ ...prev, filtros: false, relatorio: true }));
                    },
                  }}
                >
                  <Tooltip direction="top" offset={[0, -10]}>
                    <div>
                      <strong>{ponto.nome}</strong>
                      <br />
                      <strong>Atividade:</strong> {ponto.atividadesDisponiveis || ponto.descricao || "Não informada"}
                    </div>
                  </Tooltip>
                </Marker>
              ))}

              {locationActive && userLocation && (
                <Circle
                  center={[userLocation.latitude, userLocation.longitude]}
                  radius={220}
                  pathOptions={{
                    color: "#2563eb",
                    fillColor: "#60a5fa",
                    fillOpacity: 0.18,
                    weight: 2,
                  }}
                />
              )}

              {routeEnabled && routePath.length > 1 && (
                <Polyline
                  positions={routePath}
                  pathOptions={{
                    color: "#1d4ed8",
                    weight: 4,
                    opacity: 0.85,
                  }}
                />
              )}

              {locationActive && userLocation && (
                <Marker
                  position={[userLocation.latitude, userLocation.longitude]}
                  icon={L.icon({
                    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
                    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41],
                  })}
                >
                  <Tooltip direction="top" offset={[0, -10]}>
                    <div>
                      <strong>Sua localização</strong>
                      <br />
                      <small>Latitude: {userLocation.latitude.toFixed(5)}</small>
                      <br />
                      <small>Longitude: {userLocation.longitude.toFixed(5)}</small>
                    </div>
                  </Tooltip>
                </Marker>
              )}
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