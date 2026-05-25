import { useCallback, useState } from "react";

// State + handlers para os paineis flutuantes do mapa publico (Filtros e
// Relatorio de Vizinhanca). Inclui o "visible/collapsed" das duas caixas
// dentro de Filtros (Empresas + Pontos Institucionais), ate o
// reportCollapsed do painel de relatorio.
//
// resetFiltersBoxes restaura o estado "padrao aberto" das duas caixas
// (visible=true, collapsed=false) - usado pelo handleClear do container.

export function usePanelVisibility() {
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

  const toggleFiltersPanel = useCallback(() => {
    setPanelsVisible((prev) => {
      const nextVisible = !prev.filtros;
      if (nextVisible) {
        setFiltersCollapsed(false);
      }

      return { ...prev, filtros: nextVisible };
    });
  }, []);

  const resetFiltersBoxes = useCallback(() => {
    setEmpresaFiltersVisible(true);
    setPontosFiltersVisible(true);
    setEmpresaFiltersCollapsed(false);
    setPontosFiltersCollapsed(false);
  }, []);

  return {
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
  };
}
