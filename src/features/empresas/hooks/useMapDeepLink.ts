import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { INITIAL_PONTO_FILTERS } from "./useFiltrosEmpresas";
import type { LatLngTuple } from "../MapHelpers";
import type { LayerToggleState, MapTargetPoint, PontoInstitucionalFilterState } from "../types";

// Deep-link externo (Telefones Uteis -> mapa, ou cards publicos -> mapa)
// pode pedir pra centralizar/selecionar um ponto institucional especifico.
// Esse hook reage a mudancas no mapTargetPoint vindo das props do container
// e faz o "side effect" de:
//   - resetar filtros de ponto institucional pra mostrar tudo
//   - garantir a camada de pontos visivel
//   - selecionar o ponto + focar o mapa nele
//   - abrir o painel de relatorio
//
// requestId no MapTargetPoint serve como nonce: garante que o effect roda
// uma vez por click externo, mesmo que o resto da prop seja igual.

type UseMapDeepLinkArgs = {
  mapTargetPoint: MapTargetPoint | null | undefined;
  setPontoFilters: Dispatch<SetStateAction<PontoInstitucionalFilterState>>;
  setPontosBuscaAtiva: Dispatch<SetStateAction<boolean>>;
  setLayerToggles: Dispatch<SetStateAction<LayerToggleState>>;
  setSelectedEmpresaId: Dispatch<SetStateAction<string | null>>;
  setSelectedPontoInstitucionalId: Dispatch<SetStateAction<string | null>>;
  setReportCollapsed: Dispatch<SetStateAction<boolean>>;
  setPanelsVisible: Dispatch<
    SetStateAction<{ filtros: boolean; relatorio: boolean }>
  >;
  setMapFocusTarget: Dispatch<SetStateAction<LatLngTuple | null>>;
};

export function useMapDeepLink({
  mapTargetPoint,
  setPontoFilters,
  setPontosBuscaAtiva,
  setLayerToggles,
  setSelectedEmpresaId,
  setSelectedPontoInstitucionalId,
  setReportCollapsed,
  setPanelsVisible,
  setMapFocusTarget,
}: UseMapDeepLinkArgs) {
  const lastRequestIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mapTargetPoint) {
      return;
    }

    if (lastRequestIdRef.current === mapTargetPoint.requestId) {
      return;
    }

    lastRequestIdRef.current = mapTargetPoint.requestId;
    setPontoFilters(INITIAL_PONTO_FILTERS);
    setPontosBuscaAtiva(true);
    setLayerToggles((prev) => ({ ...prev, pontosInstitucionais: true }));
    setSelectedEmpresaId(null);
    setSelectedPontoInstitucionalId(mapTargetPoint.id);
    setReportCollapsed(false);
    setPanelsVisible((prev) => ({ ...prev, filtros: false, relatorio: true }));
    setMapFocusTarget([mapTargetPoint.latitude, mapTargetPoint.longitude]);
  }, [
    mapTargetPoint,
    setPontoFilters,
    setPontosBuscaAtiva,
    setLayerToggles,
    setSelectedEmpresaId,
    setSelectedPontoInstitucionalId,
    setReportCollapsed,
    setPanelsVisible,
    setMapFocusTarget,
  ]);
}
