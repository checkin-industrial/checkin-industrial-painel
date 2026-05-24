import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../shared/api/apiClient";
import { isCoordinateInsideViewportWindow, type HeatmapPointTuple } from "../MapHelpers";
import type { PontoInstitucionalMapItem } from "../../pontosInstitucionais/markerHelpers";
import type { EmpresaFilterMapItem, FilterFormState, HeatmapPointApi } from "../types";

// Hook que agrupa as 3 queries primarias do mapa publico:
// - empresas (filter)
// - heatmap points (analytics, opt-in via toggle)
// - pontos institucionais (sempre carrega, tipo opcional)
//
// Mantem as queryKeys + comportamentos identicos ao container anterior, so
// muda a responsabilidade pra um hook focado. Container fica menos
// recheado de useQuery.

type UseEmpresasMapDataArgs = {
  effectiveFilters: FilterFormState;
  pontosTipoEfetivo: string;
  heatmapEnabled: boolean;
};

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

export function useEmpresasMapData({
  effectiveFilters,
  pontosTipoEfetivo,
  heatmapEnabled,
}: UseEmpresasMapDataArgs) {
  const empresasQuery = useQuery({
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

  const heatmapQuery = useQuery({
    queryKey: [
      "empresas",
      "heatmap",
      effectiveFilters.cnae.trim(),
      effectiveFilters.setor.trim(),
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      const cnae = effectiveFilters.cnae.trim();
      const setor = effectiveFilters.setor.trim();
      if (cnae) params.set("cnae", cnae);
      if (setor) params.set("setor", setor);
      const endpoint = params.toString()
        ? `/api/analytics/heatmap?${params.toString()}`
        : "/api/analytics/heatmap";
      try {
        const data = await apiFetch<HeatmapPointApi[]>("GET", endpoint);
        return (Array.isArray(data) ? data : [])
          .filter((point) => isCoordinateInsideViewportWindow(point.latitude, point.longitude))
          .map(
            (point) =>
              [point.latitude, point.longitude, Math.max(1, point.peso)] as HeatmapPointTuple,
          );
      } catch {
        return [] as HeatmapPointTuple[];
      }
    },
    enabled: heatmapEnabled,
  });

  const pontosQuery = useQuery({
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
        return (Array.isArray(data) ? data : []).sort(
          (left, right) => left.ordemExibicao - right.ordemExibicao,
        );
      } catch {
        return [] as PontoInstitucionalMapItem[];
      }
    },
  });

  return {
    empresas: empresasQuery.data ?? [],
    loading: empresasQuery.isFetching,
    error: empresasQuery.error instanceof Error ? empresasQuery.error.message : null,

    heatmapPoints: heatmapQuery.data ?? [],
    heatmapLoading: heatmapQuery.isFetching,

    pontosInstitucionais: pontosQuery.data ?? [],
  };
}
