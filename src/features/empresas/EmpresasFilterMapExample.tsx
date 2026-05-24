import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, staticUrl } from "../../shared/api/apiClient";
import L from "leaflet";
import { Circle, MapContainer, Marker, Polyline, TileLayer, Tooltip, ZoomControl } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { createEmpresaMarkerIcon } from "./EmpresaMarker";
import { useDraggable } from "../../shared/hooks/useDraggable";
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
  getPontoInstitucionalTipoBadgeClass,
  getPontoInstitucionalTipoIcon,
  getPontoInstitucionalTipoIconClass,
  getPontoInstitucionalTipoLabel,
  normalizeTipoPonto,
  type PontoInstitucionalMapItem,
} from "../pontosInstitucionais/markerHelpers";

type EmpresaFilterMapItem = {
  id: string;
  nomeFantasia: string;
  cnaePrincipal: string;
  descricaoCnae: string;
  setor: string;
  porte: string;
  telefone: string;
  cep: string;
  municipio: string;
  matrizOuFilial: string;
  latitude: number;
  longitude: number;
};

type EmpresaVizinhancaBase = {
  id: string;
  nomeFantasia: string;
  cnaePrincipal: string;
  setor: string;
  numeroFuncionarios: number;
  municipio: string;
  latitude: number;
  longitude: number;
};

type EmpresaVizinha = {
  id: string;
  nomeFantasia: string;
  cnaePrincipal: string;
  setor: string;
  numeroFuncionarios: number;
  municipio: string;
  distanciaMetros: number;
  mesmoCnae: boolean;
  mesmoSetor: boolean;
};

type EmpresaVizinhancaResponse = {
  empresaBase: EmpresaVizinhancaBase;
  empresasProximas: EmpresaVizinha[];
};

// Types movidos pra ../pontosInstitucionais/markerHelpers.ts (PontoInstitucionalMapItem)
// e ./MapHelpers.tsx (LeafletHeatLayer, HeatmapPointTuple, LatLngTuple) - re-importados acima.

type HeatmapPointApi = {
  latitude: number;
  longitude: number;
  peso: number;
};


type MapTargetPoint = {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  requestId: number;
};

type EmpresasFilterMapExampleProps = {
  mapTargetPoint?: MapTargetPoint | null;
};

type ReportSectionKey = "proximas" | "cnae" | "setor";

type FilterFormState = {
  nomeFantasia: string;
  setor: string;
  porte: string;
  cnae: string;
  municipio: string;
  situacao: string;
};

type PontoInstitucionalFilterState = {
  termo: string;
  tipo: string;
};

type CnaeOption = {
  value: string;
  label: string;
};

type LayerToggleState = {
  heatmap: boolean;
  marcadores: boolean;
  raioAnalise: boolean;
  rotulosEmpresas: boolean;
  pontosInstitucionais: boolean;
};

// Acima desse N de markers visiveis, agrupa em clusters automaticamente.
const CLUSTER_THRESHOLD = 200;

const SETOR_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "industria", label: "Indústria" },
  { value: "comercio", label: "Comércio" },
  { value: "servicos", label: "Serviços" },
];

const PORTE_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "MEI", label: "MEI" },
  { value: "ME", label: "ME" },
  { value: "EPP", label: "EPP" },
  { value: "LTDA", label: "LTDA" },
  { value: "SA", label: "S/A" },
];

const SITUACAO_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "ativa", label: "Ativa" },
  { value: "inativa", label: "Inativa" },
  { value: "suspensa", label: "Suspensa" },
  { value: "baixada", label: "Baixada" },
];

const PONTO_INSTITUCIONAL_TIPO_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "educacao", label: "Educação" },
  { value: "comercio", label: "Comércio" },
  { value: "financeiro", label: "Financeiro" },
  { value: "servico", label: "Serviço" },
  { value: "setorprefeitura", label: "Setor Prefeitura" },
  { value: "pontoturistico", label: "Ponto Turístico" },
  { value: "hotel", label: "Hotel / Hospedagem" },
  { value: "ecoturismo", label: "Ecoturismo" },
];

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

export function EmpresasFilterMapExample({ mapTargetPoint }: EmpresasFilterMapExampleProps) {
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
      // Widget publico sempre filtra ativo=true; empresas soft-deletadas (Ativo=false)
      // so aparecem na tela de Gestao Admin -> dropdown "inativas".
      const params = new URLSearchParams(buildQueryString(effectiveFilters));
      params.set("ativo", "true");
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
  const exibirBlocosVizinhanca = !selectedPontoInstitucionalId;

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

  return (
    <section className="map-dashboard-layout">
      <section className="map-main-panel">
        <div className={isMapFullscreen ? "map-stage is-fullscreen" : "map-stage"} ref={mapStageRef}>

          {panelsVisible.filtros && (
            <aside className="map-right-sidebar map-right-sidebar--animated">
              <form 
                ref={filtersPanelDraggable.ref as React.RefObject<HTMLFormElement>}
                className={filtersCollapsed ? (filtersPanelDraggable.isDragging ? "filters-panel map-side-panel map-side-panel--filters collapsed draggable-panel dragging" : "filters-panel map-side-panel map-side-panel--filters collapsed draggable-panel") : (filtersPanelDraggable.isDragging ? "filters-panel map-side-panel map-side-panel--filters draggable-panel dragging" : "filters-panel map-side-panel map-side-panel--filters draggable-panel")}
            >
              <div 
                className="panel-toggle-header"
                onMouseDown={filtersPanelDraggable.handleMouseDown}
                style={{ cursor: filtersPanelDraggable.isDragging ? "grabbing" : "grab" }}
              >
                <h2>Filtros</h2>
                <button
                  type="button"
                  className="panel-icon-btn"
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={() => setFiltersCollapsed((prev) => !prev)}
                  aria-expanded={!filtersCollapsed}
                  aria-label={filtersCollapsed ? "Expandir painel de filtros" : "Minimizar painel de filtros"}
                  title={filtersCollapsed ? "Expandir" : "Minimizar"}
                >
                  <span aria-hidden="true">{filtersCollapsed ? "+" : "-"}</span>
                </button>
              </div>

              {!filtersCollapsed && (
                <>
                  <input
                    type="search"
                    className="filters-panel__search"
                    value={filters.nomeFantasia}
                    onChange={(event) => handleFilterChange("nomeFantasia", event.target.value)}
                    placeholder="Buscar empresa por nome fantasia"
                    aria-label="Buscar empresa por nome fantasia"
                    disabled={!empresaBuscaAtiva}
                  />

                  <div className="filters-panel__content">
                  {(!empresaFiltersVisible || !pontosFiltersVisible) && (
                    <div className="filters-panel__restore-row">
                      {!empresaFiltersVisible && (
                        <button type="button" className="restore-box-btn" onClick={() => setEmpresaFiltersVisible(true)}>
                          Mostrar Empresas
                        </button>
                      )}
                      {!pontosFiltersVisible && (
                        <button type="button" className="restore-box-btn" onClick={() => setPontosFiltersVisible(true)}>
                          Mostrar Pontos Turísticos
                        </button>
                      )}
                    </div>
                  )}

                  {empresaFiltersVisible && (
                    <section className={empresaFiltersCollapsed ? "filters-box collapsed" : "filters-box"}>
                      <header className="filters-box__header">
                        <h3>Empresas</h3>
                        <div className="filters-box__actions">
                          <button
                            type="button"
                            className="panel-icon-btn"
                            onClick={() => setEmpresaFiltersCollapsed((prev) => !prev)}
                            aria-expanded={!empresaFiltersCollapsed}
                            aria-label={empresaFiltersCollapsed ? "Expandir caixa de filtros de empresas" : "Minimizar caixa de filtros de empresas"}
                            title={empresaFiltersCollapsed ? "Expandir" : "Minimizar"}
                          >
                            <span aria-hidden="true">{empresaFiltersCollapsed ? "+" : "-"}</span>
                          </button>
                          <button
                            type="button"
                            className="panel-icon-btn panel-icon-btn--danger"
                            onClick={() => setEmpresaFiltersVisible(false)}
                            aria-label="Fechar caixa de filtros de empresas"
                            title="Fechar"
                          >
                            <span aria-hidden="true">x</span>
                          </button>
                        </div>
                      </header>

                      {!empresaFiltersCollapsed && (
                        <>

                  <label>
                    Setor
                    <select
                      value={filters.setor}
                      onChange={(event) => handleFilterChange("setor", event.target.value)}
                      disabled={!empresaBuscaAtiva}
                    >
                      {SETOR_OPTIONS.map((option) => (
                        <option key={option.value || "all"} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Porte
                    <select
                      value={filters.porte}
                      onChange={(event) => handleFilterChange("porte", event.target.value)}
                      disabled={!empresaBuscaAtiva}
                    >
                      {PORTE_OPTIONS.map((option) => (
                        <option key={option.value || "all"} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    CNAE
                    <select
                      value={filters.cnae}
                      onChange={(event) => handleFilterChange("cnae", event.target.value)}
                      disabled={!empresaBuscaAtiva}
                    >
                      {cnaeOptions.map((option) => (
                        <option key={option.value || "all"} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Município
                    <select
                      value={filters.municipio}
                      onChange={(event) => handleFilterChange("municipio", event.target.value)}
                      disabled={!empresaBuscaAtiva}
                    >
                      <option value="">Todos</option>
                      {municipioOptions.map((municipio) => (
                        <option key={municipio} value={municipio}>
                          {municipio}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Situação
                    <select
                      value={filters.situacao}
                      onChange={(event) => handleFilterChange("situacao", event.target.value)}
                      disabled={!empresaBuscaAtiva}
                    >
                      {SITUACAO_OPTIONS.map((option) => (
                        <option key={option.value || "all"} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <p className="status-info">Marcadores exibidos: {empresas.length}</p>

                        </>
                      )}

                      <footer className="filters-box__footer">
                        <button type="button" className="filters-search-toggle" onClick={toggleEmpresaBusca}>
                          {empresaBuscaAtiva ? "Desativar busca" : "Ativar busca"}
                        </button>
                      </footer>
                    </section>
                  )}

                  {pontosFiltersVisible && (
                    <section className={pontosFiltersCollapsed ? "filters-box collapsed" : "filters-box"}>
                      <header className="filters-box__header">
                        <h3>Pontos Institucionais</h3>
                        <div className="filters-box__actions">
                          <button
                            type="button"
                            className="panel-icon-btn"
                            onClick={() => setPontosFiltersCollapsed((prev) => !prev)}
                            aria-expanded={!pontosFiltersCollapsed}
                            aria-label={pontosFiltersCollapsed ? "Expandir caixa de filtros de pontos institucionais" : "Minimizar caixa de filtros de pontos institucionais"}
                            title={pontosFiltersCollapsed ? "Expandir" : "Minimizar"}
                          >
                            <span aria-hidden="true">{pontosFiltersCollapsed ? "+" : "-"}</span>
                          </button>
                          <button
                            type="button"
                            className="panel-icon-btn panel-icon-btn--danger"
                            onClick={() => setPontosFiltersVisible(false)}
                            aria-label="Fechar caixa de filtros de pontos institucionais"
                            title="Fechar"
                          >
                            <span aria-hidden="true">x</span>
                          </button>
                        </div>
                      </header>

                      {!pontosFiltersCollapsed && (
                        <>

                  <label>
                    Buscar ponto institucional
                    <input
                      type="search"
                      value={pontoFilters.termo}
                      onChange={(event) => handlePontoFilterChange("termo", event.target.value)}
                      placeholder="Nome, endereço, contato ou atividade"
                      disabled={!pontosBuscaAtiva}
                    />
                  </label>

                  <label>
                    Tipo de ponto institucional
                    <select
                      value={pontoFilters.tipo}
                      onChange={(event) => handlePontoFilterChange("tipo", event.target.value)}
                      disabled={!pontosBuscaAtiva}
                    >
                      {PONTO_INSTITUCIONAL_TIPO_OPTIONS.map((option) => (
                        <option key={option.value || "all"} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <p className="status-info">Pontos exibidos: {pontosInstitucionaisFiltrados.length}</p>

                        </>
                      )}

                      <footer className="filters-box__footer">
                        <button type="button" className="filters-search-toggle" onClick={togglePontosBusca}>
                          {pontosBuscaAtiva ? "Desativar busca" : "Ativar busca"}
                        </button>
                      </footer>
                    </section>
                  )}

                  <div className="filters-actions">
                    <button type="button" onClick={handleClear} disabled={loading}>
                      Limpar
                    </button>
                  </div>

                  {error && <p className="status-error">{error}</p>}
                  </div>

                </>
              )}
            </form>
            </aside>
          )}

          {panelsVisible.relatorio && possuiSelecaoNoMapa && (
            <aside 
              key={`report-${selectedEmpresaId ?? "none"}-${selectedPontoInstitucionalId ?? "none"}`}
              ref={reportPanelDraggable.ref}
              className={reportCollapsed ? (reportPanelDraggable.isDragging ? "map-left-sidebar map-left-sidebar--selection map-left-sidebar--animated report-panel map-side-panel map-side-panel--report collapsed draggable-panel dragging" : "map-left-sidebar map-left-sidebar--selection map-left-sidebar--animated report-panel map-side-panel map-side-panel--report collapsed draggable-panel") : (reportPanelDraggable.isDragging ? "map-left-sidebar map-left-sidebar--selection map-left-sidebar--animated report-panel map-side-panel map-side-panel--report draggable-panel dragging" : "map-left-sidebar map-left-sidebar--selection map-left-sidebar--animated report-panel map-side-panel map-side-panel--report draggable-panel")}
            >
              <header 
                className="report-header panel-toggle-header"
                onMouseDown={reportPanelDraggable.handleMouseDown}
                style={{ cursor: reportPanelDraggable.isDragging ? "grabbing" : "grab" }}
              >
                <div>
                  <h3>Relatório de Vizinhança</h3>
                  {!reportCollapsed && (
                    <p>
                      {selectedPontoInstitucionalId
                        ? "Detalhes do ponto institucional"
                        : "Empresas em um raio de 5 km"}
                    </p>
                  )}
                </div>
                <div className="panel-header-actions" onMouseDown={(event) => event.stopPropagation()}>
                  <button
                    type="button"
                    className="panel-icon-btn panel-icon-btn--inverse panel-icon-btn--danger"
                    onClick={() => setPanelsVisible((prev) => ({ ...prev, relatorio: false }))}
                    aria-label="Fechar relatório da vizinhança"
                    title="Fechar"
                  >
                    <span aria-hidden="true">x</span>
                  </button>
                </div>
              </header>

              {!reportCollapsed && (
                <>
                  {routeEnabled && (
                    <section className="report-block">
                      <h4>Rota da sua localização</h4>
                      {routeLoading && <p className="report-empty-state">Calculando trajeto...</p>}
                      {!routeLoading && routeError && <p className="status-error">{routeError}</p>}
                      {!routeLoading && !routeError && routeInfo && (
                        <div className="report-company-card">
                          <span><strong>Distância:</strong> {routeInfo.distanceKm.toFixed(2)} km</span>
                          <span><strong>Tempo estimado:</strong> {routeInfo.durationMin.toFixed(0)} min</span>
                        </div>
                      )}
                    </section>
                  )}

                  <section className="report-block">
                    <h4>Ponto institucional selecionado</h4>
                    {!selectedPontoInstitucionalId && <p className="report-empty-state">Clique em um ponto institucional para ver detalhes de parceria e contato.</p>}
                    {pontoInstitucionalSelecionado && (
                      <div className="report-company-card report-company-card--institutional">
                        {pontoInstitucionalSelecionado.cardFotoUrl && (
                          <img
                            className="report-institution-card-image"
                            src={staticUrl(pontoInstitucionalSelecionado.cardFotoUrl)}
                            alt={`Imagem de capa de ${pontoInstitucionalSelecionado.nome}`}
                            loading="lazy"
                          />
                        )}
                        {pontoInstitucionalSelecionado.logoUrl && (
                          <img
                            className="report-institution-logo"
                            src={staticUrl(pontoInstitucionalSelecionado.logoUrl)}
                            alt={`Logo de ${pontoInstitucionalSelecionado.nome}`}
                            loading="lazy"
                          />
                        )}
                        <strong>{pontoInstitucionalSelecionado.nome}</strong>
                        <span>
                          <strong>Tipo:</strong>{" "}
                          <span className={getPontoInstitucionalTipoBadgeClass(pontoInstitucionalSelecionado.tipo)}>
                            <span className={getPontoInstitucionalTipoIconClass(pontoInstitucionalSelecionado.tipo)} aria-hidden="true">
                              {getPontoInstitucionalTipoIcon(pontoInstitucionalSelecionado.tipo)}
                            </span>
                            {getPontoInstitucionalTipoLabel(pontoInstitucionalSelecionado.tipo)}
                          </span>
                        </span>
                        <span>{pontoInstitucionalSelecionado.descricao}</span>
                        <div className="report-address-row">
                          <span><strong>Endereço:</strong> {pontoInstitucionalSelecionado.endereco}</span>
                          <button
                            type="button"
                            className={routeEnabled ? "report-address-route-btn active" : "report-address-route-btn"}
                            onClick={handleRouteFromReportAddress}
                            disabled={routeLoading}
                            aria-label={`Traçar rota até ${pontoInstitucionalSelecionado.nome}`}
                            title={routeLoading ? "Calculando rota..." : "Traçar rota até este endereço"}
                          >
                            <span className="report-route-icon" aria-hidden="true" />
                          </button>
                        </div>
                        <span><strong>Atividades:</strong> {pontoInstitucionalSelecionado.atividadesDisponiveis}</span>
                        <span><strong>Equipe de gestão:</strong> {pontoInstitucionalSelecionado.equipeGestao}</span>
                        <span><strong>Contato:</strong> {pontoInstitucionalSelecionado.contatoNome}</span>
                        <span><strong>Telefone:</strong> {pontoInstitucionalSelecionado.contatoTelefone}</span>
                        <span><strong>Email:</strong> {pontoInstitucionalSelecionado.contatoEmail}</span>
                        {pontoInstitucionalSelecionado.responsavelFotoUrl && (
                          <a
                            className="report-link"
                            href={staticUrl(pontoInstitucionalSelecionado.responsavelFotoUrl)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <img
                              className="report-contact-photo"
                              src={staticUrl(pontoInstitucionalSelecionado.responsavelFotoUrl)}
                              alt={`Foto de ${pontoInstitucionalSelecionado.contatoNome || "responsável"}`}
                              loading="lazy"
                            />
                            <span>Foto da pessoa responsável</span>
                          </a>
                        )}
                      </div>
                    )}
                  </section>

                  {exibirBlocosVizinhanca && (
                    <>
                      <section className="report-block">
                        <h4>Empresa base</h4>
                        {!selectedEmpresaId && <p className="report-empty-state">Clique em um marcador para analisar a vizinhança em 5 km.</p>}
                        {selectedEmpresaId && reportLoading && <p className="report-empty-state">Carregando vizinhança...</p>}
                        {selectedEmpresaId && reportError && <p className="status-error">{reportError}</p>}
                        {!reportLoading && !reportError && vizinhanca?.empresaBase && (
                          <div className="report-company-card">
                            <strong>{vizinhanca.empresaBase.nomeFantasia}</strong>
                            <span>CNAE: {vizinhanca.empresaBase.cnaePrincipal}</span>
                            <span>Setor: {vizinhanca.empresaBase.setor}</span>
                            <span>Município: {vizinhanca.empresaBase.municipio}</span>
                            <span>Funcionários: {vizinhanca.empresaBase.numeroFuncionarios}</span>
                          </div>
                        )}
                      </section>

                      <section className="report-block">
                        <div className="report-section-header">
                          <h4>Empresas proximas ({empresasProximas.length})</h4>
                          <button
                            type="button"
                            className="report-section-toggle"
                            onClick={() => toggleReportSection("proximas")}
                            aria-expanded={!collapsedReportSections.proximas}
                            aria-label={collapsedReportSections.proximas ? "Expandir empresas proximas" : "Colapsar empresas proximas"}
                          >
                            {collapsedReportSections.proximas ? "+" : "-"}
                          </button>
                        </div>
                        {!collapsedReportSections.proximas && (
                          <ol className="report-list">
                            {!reportLoading && !reportError && empresasProximas.map((empresa) => (
                              <li key={empresa.id}>
                                <strong>{empresa.nomeFantasia}</strong>
                                <br />
                                {empresa.setor} | {empresa.cnaePrincipal} | {empresa.municipio}
                                <br />
                                Funcionários: {empresa.numeroFuncionarios} | Distância: {(empresa.distanciaMetros / 1000).toFixed(2)} km
                              </li>
                            ))}
                            {!reportLoading && !reportError && selectedEmpresaId && empresasProximas.length === 0 && <li>Nenhuma empresa encontrada dentro do raio de 5 km.</li>}
                          </ol>
                        )}
                      </section>

                      <section className="report-block">
                        <div className="report-section-header">
                          <h4>Mesmo CNAE ({empresasMesmoCnae.length})</h4>
                          <button
                            type="button"
                            className="report-section-toggle"
                            onClick={() => toggleReportSection("cnae")}
                            aria-expanded={!collapsedReportSections.cnae}
                            aria-label={collapsedReportSections.cnae ? "Expandir empresas do mesmo CNAE" : "Colapsar empresas do mesmo CNAE"}
                          >
                            {collapsedReportSections.cnae ? "+" : "-"}
                          </button>
                        </div>
                        {!collapsedReportSections.cnae && (
                          <ol className="report-list">
                            {!reportLoading && !reportError && empresasMesmoCnae.map((empresa) => (
                              <li key={empresa.id}>{empresa.nomeFantasia}: {(empresa.distanciaMetros / 1000).toFixed(2)} km</li>
                            ))}
                            {!reportLoading && !reportError && selectedEmpresaId && empresasMesmoCnae.length === 0 && <li>Nenhuma empresa com o mesmo CNAE no raio atual.</li>}
                          </ol>
                        )}
                      </section>

                      <section className="report-block">
                        <div className="report-section-header">
                          <h4>Mesmo setor ({empresasMesmoSetor.length})</h4>
                          <button
                            type="button"
                            className="report-section-toggle"
                            onClick={() => toggleReportSection("setor")}
                            aria-expanded={!collapsedReportSections.setor}
                            aria-label={collapsedReportSections.setor ? "Expandir empresas do mesmo setor" : "Colapsar empresas do mesmo setor"}
                          >
                            {collapsedReportSections.setor ? "+" : "-"}
                          </button>
                        </div>
                        {!collapsedReportSections.setor && (
                          <ol className="report-list">
                            {!reportLoading && !reportError && empresasMesmoSetor.map((empresa) => (
                              <li key={empresa.id}>{empresa.nomeFantasia}: {(empresa.distanciaMetros / 1000).toFixed(2)} km</li>
                            ))}
                            {!reportLoading && !reportError && selectedEmpresaId && empresasMesmoSetor.length === 0 && <li>Nenhuma empresa do mesmo setor no raio atual.</li>}
                          </ol>
                        )}
                      </section>

                      <div className="report-metrics">
                        <div>
                          <span>Distância média</span>
                          <strong>{avgDistanceKm.toFixed(1)} km</strong>
                        </div>
                        <div>
                          <span>Empresas na área</span>
                          <strong>{empresasProximas.length}</strong>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </aside>
          )}

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

          <div className="map-legend">
            <button
              type="button"
              className={layerToggles.heatmap ? "legend-item legend-toggle icon-only active" : "legend-item legend-toggle icon-only"}
              onClick={() => toggleLayer("heatmap")}
              aria-pressed={layerToggles.heatmap}
              aria-label="Mapa de Calor - Densidade de Empresas"
              title="Mapa de Calor: visualiza a densidade e concentração de empresas na região"
            >
              <i className="legend-color heat" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={layerToggles.marcadores ? "legend-item legend-toggle icon-only active" : "legend-item legend-toggle icon-only"}
              onClick={() => toggleLayer("marcadores")}
              aria-pressed={layerToggles.marcadores}
              aria-label="Marcadores de Empresas - Localização Exata"
              title="Marcadores: exibe a localização de cada empresa no mapa"
            >
              <i className="legend-color marker" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={layerToggles.raioAnalise ? "legend-item legend-toggle icon-only active" : "legend-item legend-toggle icon-only"}
              onClick={() => toggleLayer("raioAnalise")}
              aria-pressed={layerToggles.raioAnalise}
              aria-label="Raio de Análise - 5km ao Redor"
              title="Raio de Análise: desenha um círculo de 5km ao redor de uma empresa selecionada"
            >
              <i className="legend-color radius" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={layerToggles.rotulosEmpresas ? "legend-item legend-toggle icon-only active" : "legend-item legend-toggle icon-only"}
              onClick={() => toggleLayer("rotulosEmpresas")}
              aria-pressed={layerToggles.rotulosEmpresas}
              aria-label="Rótulos de Nomes"
              disabled={!layerToggles.marcadores && !layerToggles.pontosInstitucionais}
              title={
                !layerToggles.marcadores && !layerToggles.pontosInstitucionais
                  ? "Ative marcadores ou pontos institucionais primeiro para exibir rótulos"
                  : "Rótulos: mostra os nomes das empresas e pontos turísticos no mapa"
              }
            >
              <i className="legend-color label" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={layerToggles.pontosInstitucionais ? "legend-item legend-toggle icon-only active" : "legend-item legend-toggle icon-only"}
              onClick={() => toggleLayer("pontosInstitucionais")}
              aria-pressed={layerToggles.pontosInstitucionais}
              aria-label="Pontos Institucionais e Turísticos"
              title="Pontos Turísticos: exibe hotéis, atrativos, educação e outros pontos úteis"
            >
              <i className="legend-color institutional" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={locationActive ? "legend-item legend-toggle icon-only active" : "legend-item legend-toggle icon-only"}
              onClick={toggleUserLocation}
              aria-pressed={locationActive}
              aria-label="Minha Localização - Ativar GPS"
              title="Localização: permite visualizar sua posição atual no mapa e traçar rotas"
            >
              <i className="legend-color location" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={routeEnabled ? "legend-item legend-toggle icon-only active" : "legend-item legend-toggle icon-only"}
              onClick={() => setRouteEnabled((prev) => !prev)}
              aria-pressed={routeEnabled}
              aria-label="Traçar Rota - Direcionamento"
              title="Rota: calcula e desenha o trajeto de sua localização até o destino selecionado"
            >
              <i className="legend-color route" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={isMapFullscreen ? "legend-item legend-toggle icon-only active" : "legend-item legend-toggle icon-only"}
              onClick={handleToggleFullscreen}
              aria-pressed={isMapFullscreen}
              aria-label={isMapFullscreen ? "Sair de Tela Cheia" : "Tela Cheia"}
              title={isMapFullscreen ? "Clique para sair do modo tela cheia" : "Clique para ampliar o mapa em tela cheia"}
            >
              <i className="legend-color fullscreen" aria-hidden="true" />
            </button>

            <div className="legend-separator" />
            <button
              type="button"
              className={panelsVisible.filtros ? "legend-item legend-toggle icon-only active" : "legend-item legend-toggle icon-only"}
              onClick={toggleFiltersPanel}
              aria-pressed={panelsVisible.filtros}
              aria-label={panelsVisible.filtros ? "Fechar Painel de Filtros" : "Abrir Painel de Filtros"}
              title={panelsVisible.filtros ? "Filtros: clique para fechar o painel de filtros avançados" : "Filtros: clique para abrir o painel de filtros avançados (nome, setor, porte, etc)"}
            >
              <i className="legend-color filters" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={panelsVisible.relatorio ? "legend-item legend-toggle icon-only active" : "legend-item legend-toggle icon-only"}
              onClick={() => setPanelsVisible((prev) => ({ ...prev, relatorio: !prev.relatorio }))}
              aria-pressed={panelsVisible.relatorio}
              aria-label={panelsVisible.relatorio ? "Fechar Relatório da Vizinhança" : "Abrir Relatório da Vizinhança"}
              title={panelsVisible.relatorio ? "Relatório: clique para fechar o painel de análise e detalhes" : "Relatório: clique para abrir o painel de análise da vizinhança"}
            >
              <i className="legend-color report" aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

    </section>
  );
}