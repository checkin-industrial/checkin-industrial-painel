import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePanelVisibility } from "./usePanelVisibility";

describe("usePanelVisibility", () => {
  it("estado inicial: filtros colapsados, paneis com filtros oculto/relatorio visivel", () => {
    const { result } = renderHook(() => usePanelVisibility());
    expect(result.current.filtersCollapsed).toBe(true);
    expect(result.current.empresaFiltersCollapsed).toBe(false);
    expect(result.current.pontosFiltersCollapsed).toBe(false);
    expect(result.current.empresaFiltersVisible).toBe(true);
    expect(result.current.pontosFiltersVisible).toBe(true);
    expect(result.current.reportCollapsed).toBe(false);
    expect(result.current.panelsVisible).toEqual({ filtros: false, relatorio: true });
  });

  it("toggleFiltersPanel abre o painel + des-colapsa", () => {
    const { result } = renderHook(() => usePanelVisibility());
    act(() => result.current.toggleFiltersPanel());
    expect(result.current.panelsVisible.filtros).toBe(true);
    expect(result.current.filtersCollapsed).toBe(false);
  });

  it("toggleFiltersPanel fecha quando ja aberto", () => {
    const { result } = renderHook(() => usePanelVisibility());
    act(() => result.current.toggleFiltersPanel());
    act(() => result.current.toggleFiltersPanel());
    expect(result.current.panelsVisible.filtros).toBe(false);
  });

  it("resetFiltersBoxes restaura visiveis=true e collapsed=false", () => {
    const { result } = renderHook(() => usePanelVisibility());
    act(() => {
      result.current.setEmpresaFiltersVisible(false);
      result.current.setPontosFiltersVisible(false);
      result.current.setEmpresaFiltersCollapsed(true);
      result.current.setPontosFiltersCollapsed(true);
    });
    act(() => result.current.resetFiltersBoxes());
    expect(result.current.empresaFiltersVisible).toBe(true);
    expect(result.current.pontosFiltersVisible).toBe(true);
    expect(result.current.empresaFiltersCollapsed).toBe(false);
    expect(result.current.pontosFiltersCollapsed).toBe(false);
  });
});
