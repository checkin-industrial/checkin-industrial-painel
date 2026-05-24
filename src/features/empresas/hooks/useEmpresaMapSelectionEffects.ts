import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import { INITIAL_PONTO_FILTERS } from "./useFiltrosEmpresas";
import { isCoordinateInsideViewportWindow } from "../MapHelpers";
import {
  matchesPontoInstitucionalFilters,
  type PontoInstitucionalMapItem,
} from "../../pontosInstitucionais/markerHelpers";
import type {
  EmpresaFilterMapItem,
  PontoInstitucionalFilterState,
  ReportSectionKey,
} from "../types";

// Efeitos que mantem coerencia entre selecao e a lista visivel:
//   1. Empresa selecionada saiu do payload (re-filtro, paginacao, soft-delete)
//      -> limpa selectedEmpresaId.
//   2. Mudou a empresa selecionada -> reseta o collapsed das secoes do
//      relatorio de vizinhanca (expande "Mais proximas", colapsa CNAE/Setor).
//   3. Mudou filtros de ponto institucional -> se o ponto selecionado nao
//      passa mais no filtro, deselleciona.

type UseEmpresaMapSelectionEffectsArgs = {
  empresas: EmpresaFilterMapItem[];
  pontosInstitucionais: PontoInstitucionalMapItem[];
  pontoFilters: PontoInstitucionalFilterState;
  pontosBuscaAtiva: boolean;
  selectedEmpresaId: string | null;
  setSelectedEmpresaId: Dispatch<SetStateAction<string | null>>;
  selectedPontoInstitucionalId: string | null;
  setSelectedPontoInstitucionalId: Dispatch<SetStateAction<string | null>>;
  setCollapsedReportSections: Dispatch<SetStateAction<Record<ReportSectionKey, boolean>>>;
};

export function useEmpresaMapSelectionEffects({
  empresas,
  pontosInstitucionais,
  pontoFilters,
  pontosBuscaAtiva,
  selectedEmpresaId,
  setSelectedEmpresaId,
  selectedPontoInstitucionalId,
  setSelectedPontoInstitucionalId,
  setCollapsedReportSections,
}: UseEmpresaMapSelectionEffectsArgs) {
  // 1. Empresa selecionada saiu da lista -> deselecciona.
  useEffect(() => {
    if (selectedEmpresaId && !empresas.some((empresa) => empresa.id === selectedEmpresaId)) {
      setSelectedEmpresaId(null);
    }
  }, [empresas, selectedEmpresaId, setSelectedEmpresaId]);

  // 2. Mudou empresa selecionada -> reseta secoes do report (default expand
  // proximas / colapsa cnae+setor).
  useEffect(() => {
    setCollapsedReportSections({
      proximas: false,
      cnae: true,
      setor: true,
    });
  }, [selectedEmpresaId, setCollapsedReportSections]);

  // 3. Filtro de ponto excluiu o ponto selecionado -> deselecciona.
  useEffect(() => {
    if (!selectedPontoInstitucionalId) {
      return;
    }

    const aindaVisivel = pontosInstitucionais
      .filter((ponto) => isCoordinateInsideViewportWindow(ponto.latitude, ponto.longitude))
      .filter((ponto) =>
        matchesPontoInstitucionalFilters(
          ponto,
          pontosBuscaAtiva ? pontoFilters : INITIAL_PONTO_FILTERS,
        ),
      )
      .some((ponto) => ponto.id === selectedPontoInstitucionalId);

    if (!aindaVisivel) {
      setSelectedPontoInstitucionalId(null);
    }
  }, [
    pontoFilters,
    pontosInstitucionais,
    pontosBuscaAtiva,
    selectedPontoInstitucionalId,
    setSelectedPontoInstitucionalId,
  ]);
}
