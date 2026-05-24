import { useCallback, useState } from "react";
import type { FilterFormState, PontoInstitucionalFilterState } from "../types";

// Hook que agrupa o state de filtros (empresa + ponto institucional) e a flag
// "busca ativa" de cada um. Empacotado em hook pra remover ~50 linhas de
// useState + handlers do container EmpresasFilterMapExample.
//
// effectiveFilters / pontosTipoEfetivo: filtros so sao aplicados quando a busca
// esta ativa. Quando o usuario desativa, o backend usa INITIAL (neutro) - util
// pra "ver tudo" sem perder o que ja preencheu.

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

export function useFiltrosEmpresas() {
  const [filters, setFilters] = useState<FilterFormState>(INITIAL_FILTERS);
  const [pontoFilters, setPontoFilters] = useState<PontoInstitucionalFilterState>(INITIAL_PONTO_FILTERS);
  const [empresaBuscaAtiva, setEmpresaBuscaAtiva] = useState(true);
  const [pontosBuscaAtiva, setPontosBuscaAtiva] = useState(true);

  // Resultado consumido pelas useQuery: empty filter quando busca desativada.
  const effectiveFilters = empresaBuscaAtiva ? filters : INITIAL_FILTERS;
  const pontosTipoEfetivo = pontosBuscaAtiva ? pontoFilters.tipo : "";

  const handleFilterChange = useCallback((field: keyof FilterFormState, value: string) => {
    setFilters((current) => ({ ...current, [field]: value }));
  }, []);

  const handlePontoFilterChange = useCallback((field: keyof PontoInstitucionalFilterState, value: string) => {
    setPontoFilters((current) => ({ ...current, [field]: value }));
  }, []);

  const toggleEmpresaBusca = useCallback(() => {
    setEmpresaBuscaAtiva((prev) => !prev);
  }, []);

  const togglePontosBusca = useCallback(() => {
    setPontosBuscaAtiva((prev) => !prev);
  }, []);

  // Limpa o state interno de filtros (mantem responsabilidade do hook).
  // Container compoe seu proprio handleClear pra resetar coisas adicionais
  // (selecao no mapa, visibilidade dos boxes, etc.).
  const handleClearFiltros = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setPontoFilters(INITIAL_PONTO_FILTERS);
    setEmpresaBuscaAtiva(true);
    setPontosBuscaAtiva(true);
  }, []);

  return {
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
  };
}

export { INITIAL_FILTERS, INITIAL_PONTO_FILTERS };
