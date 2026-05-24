import { useMemo } from "react";
import { INITIAL_PONTO_FILTERS } from "./useFiltrosEmpresas";
import { DEFAULT_CENTER, isCoordinateInsideViewportWindow, type LatLngTuple } from "../MapHelpers";
import {
  matchesPontoInstitucionalFilters,
  type PontoInstitucionalMapItem,
} from "../../pontosInstitucionais/markerHelpers";
import type {
  EmpresaFilterMapItem,
  EmpresaVizinhancaResponse,
  PontoInstitucionalFilterState,
} from "../types";

// Calculos derivados puros (memoizados) que dependem so de empresas +
// pontos + selecao + vizinhanca:
//   - center: centro geografico da lista de empresas (ou DEFAULT_CENTER)
//   - empresaSelecionadaNoMapa / pontoInstitucionalSelecionado
//   - rotaDestino: coordenada do destino da rota (ponto OU empresa selecionada)
//   - pontosInstitucionaisFiltrados: viewport + filtros aplicados
//   - analysisCenter: centro do circulo de raio de analise
//   - empresasProximas + variants (mesmo cnae, mesmo setor) + avgDistanceKm
//
// Container fica responsavel apenas pelo state; este hook concentra os
// memos pra reduzir ruido visual.

type UseMapDerivedSelectionArgs = {
  empresas: EmpresaFilterMapItem[];
  pontosInstitucionais: PontoInstitucionalMapItem[];
  pontoFilters: PontoInstitucionalFilterState;
  pontosBuscaAtiva: boolean;
  selectedEmpresaId: string | null;
  selectedPontoInstitucionalId: string | null;
  vizinhanca: EmpresaVizinhancaResponse | null | undefined;
};

export function useMapDerivedSelection({
  empresas,
  pontosInstitucionais,
  pontoFilters,
  pontosBuscaAtiva,
  selectedEmpresaId,
  selectedPontoInstitucionalId,
  vizinhanca,
}: UseMapDerivedSelectionArgs) {
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

    return (
      pontosInstitucionais
        .filter((ponto) => isCoordinateInsideViewportWindow(ponto.latitude, ponto.longitude))
        .filter((ponto) =>
          matchesPontoInstitucionalFilters(
            ponto,
            pontosBuscaAtiva ? pontoFilters : INITIAL_PONTO_FILTERS,
          ),
        )
        .find((ponto) => ponto.id === selectedPontoInstitucionalId) ?? null
    );
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
      .filter((ponto) =>
        matchesPontoInstitucionalFilters(
          ponto,
          pontosBuscaAtiva ? pontoFilters : INITIAL_PONTO_FILTERS,
        ),
      );
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

  const empresasMesmoCnae = useMemo(
    () => empresasProximas.filter((empresa) => empresa.mesmoCnae),
    [empresasProximas],
  );

  const empresasMesmoSetor = useMemo(
    () => empresasProximas.filter((empresa) => empresa.mesmoSetor),
    [empresasProximas],
  );

  const avgDistanceKm = useMemo(() => {
    if (empresasProximas.length === 0) {
      return 0;
    }

    const totalDistance = empresasProximas.reduce(
      (acc, empresa) => acc + empresa.distanciaMetros / 1000,
      0,
    );

    return totalDistance / empresasProximas.length;
  }, [empresasProximas]);

  return {
    center,
    empresaSelecionadaNoMapa,
    pontoInstitucionalSelecionado,
    rotaDestino,
    pontosInstitucionaisFiltrados,
    analysisCenter,
    empresasMesmoCnae,
    empresasMesmoSetor,
    avgDistanceKm,
  };
}
