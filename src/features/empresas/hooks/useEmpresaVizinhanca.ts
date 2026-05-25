import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../shared/api/apiClient";
import type { EmpresaVizinhancaResponse } from "../types";

// Busca a vizinhanca (empresa-base + empresas proximas) da empresa
// selecionada no mapa. Roda apenas quando ha selectedEmpresaId (enabled);
// expoe data + loading + error tipado pra container/Context.
//
// queryKey usa o id direto - cada empresa selecionada vira uma entrada
// separada no cache do TanStack Query (revisita rapida sem refetch).
export function useEmpresaVizinhanca(selectedEmpresaId: string | null) {
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

  return { vizinhanca, reportLoading, reportError };
}
