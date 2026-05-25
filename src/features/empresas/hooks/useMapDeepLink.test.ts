import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMapDeepLink } from "./useMapDeepLink";
import { INITIAL_PONTO_FILTERS } from "./useFiltrosEmpresas";
import type { MapTargetPoint } from "../types";

function buildSetters() {
  return {
    setPontoFilters: vi.fn(),
    setPontosBuscaAtiva: vi.fn(),
    setLayerToggles: vi.fn(),
    setSelectedEmpresaId: vi.fn(),
    setSelectedPontoInstitucionalId: vi.fn(),
    setReportCollapsed: vi.fn(),
    setPanelsVisible: vi.fn(),
    setMapFocusTarget: vi.fn(),
  };
}

const TARGET: MapTargetPoint = {
  id: "p-123",
  nome: "Ponto X",
  latitude: -22.3,
  longitude: -49.05,
  requestId: 1,
};

describe("useMapDeepLink", () => {
  it("nao chama setters quando mapTargetPoint=null/undefined", () => {
    const setters = buildSetters();
    renderHook(() => useMapDeepLink({ mapTargetPoint: null, ...setters }));
    expect(setters.setSelectedPontoInstitucionalId).not.toHaveBeenCalled();
    expect(setters.setMapFocusTarget).not.toHaveBeenCalled();
  });

  it("dispara todos os setters quando mapTargetPoint chega", () => {
    const setters = buildSetters();
    renderHook(() => useMapDeepLink({ mapTargetPoint: TARGET, ...setters }));
    expect(setters.setPontoFilters).toHaveBeenCalledWith(INITIAL_PONTO_FILTERS);
    expect(setters.setPontosBuscaAtiva).toHaveBeenCalledWith(true);
    expect(setters.setLayerToggles).toHaveBeenCalledOnce();
    expect(setters.setSelectedEmpresaId).toHaveBeenCalledWith(null);
    expect(setters.setSelectedPontoInstitucionalId).toHaveBeenCalledWith("p-123");
    expect(setters.setReportCollapsed).toHaveBeenCalledWith(false);
    expect(setters.setPanelsVisible).toHaveBeenCalledOnce();
    expect(setters.setMapFocusTarget).toHaveBeenCalledWith([-22.3, -49.05]);
  });

  it("nao re-dispara setters quando requestId nao muda (dedup via ref)", () => {
    const setters = buildSetters();
    const { rerender } = renderHook(
      ({ mapTargetPoint }: { mapTargetPoint: MapTargetPoint | null }) =>
        useMapDeepLink({ mapTargetPoint, ...setters }),
      { initialProps: { mapTargetPoint: TARGET as MapTargetPoint | null } },
    );
    // 1a chamada disparou os setters
    expect(setters.setSelectedPontoInstitucionalId).toHaveBeenCalledTimes(1);
    // Rerender com objeto novo mas requestId igual -> dedup ignora
    rerender({ mapTargetPoint: { ...TARGET, id: "p-OUTRO", requestId: 1 } });
    expect(setters.setSelectedPontoInstitucionalId).toHaveBeenCalledTimes(1);
  });

  it("dispara dnv quando requestId muda (novo click externo)", () => {
    const setters = buildSetters();
    const { rerender } = renderHook(
      ({ mapTargetPoint }: { mapTargetPoint: MapTargetPoint | null }) =>
        useMapDeepLink({ mapTargetPoint, ...setters }),
      { initialProps: { mapTargetPoint: TARGET as MapTargetPoint | null } },
    );
    rerender({ mapTargetPoint: { ...TARGET, requestId: 2 } });
    expect(setters.setSelectedPontoInstitucionalId).toHaveBeenCalledTimes(2);
  });
});
