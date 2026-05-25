import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useFiltrosEmpresas, INITIAL_FILTERS, INITIAL_PONTO_FILTERS } from "./useFiltrosEmpresas";

describe("useFiltrosEmpresas", () => {
  it("inicia com filters/pontoFilters vazios e flags de busca ativas", () => {
    const { result } = renderHook(() => useFiltrosEmpresas());
    expect(result.current.filters).toEqual(INITIAL_FILTERS);
    expect(result.current.pontoFilters).toEqual(INITIAL_PONTO_FILTERS);
    expect(result.current.empresaBuscaAtiva).toBe(true);
    expect(result.current.pontosBuscaAtiva).toBe(true);
  });

  it("effectiveFilters retorna filters quando empresaBuscaAtiva=true", () => {
    const { result } = renderHook(() => useFiltrosEmpresas());
    act(() => result.current.handleFilterChange("nomeFantasia", "metalurgia"));
    expect(result.current.effectiveFilters.nomeFantasia).toBe("metalurgia");
  });

  it("effectiveFilters retorna INITIAL_FILTERS quando empresaBuscaAtiva=false", () => {
    const { result } = renderHook(() => useFiltrosEmpresas());
    act(() => result.current.handleFilterChange("setor", "industria"));
    act(() => result.current.toggleEmpresaBusca());
    expect(result.current.empresaBuscaAtiva).toBe(false);
    expect(result.current.effectiveFilters).toEqual(INITIAL_FILTERS);
    // filters sobrepoe permanece (so derivado eh INITIAL)
    expect(result.current.filters.setor).toBe("industria");
  });

  it("pontosTipoEfetivo segue pontosBuscaAtiva", () => {
    const { result } = renderHook(() => useFiltrosEmpresas());
    act(() => result.current.handlePontoFilterChange("tipo", "hotel"));
    expect(result.current.pontosTipoEfetivo).toBe("hotel");
    act(() => result.current.togglePontosBusca());
    expect(result.current.pontosTipoEfetivo).toBe("");
  });

  it("handleClearFiltros volta tudo ao estado inicial (filters, pontoFilters, flags)", () => {
    const { result } = renderHook(() => useFiltrosEmpresas());
    act(() => result.current.handleFilterChange("cnae", "1234567"));
    act(() => result.current.handlePontoFilterChange("termo", "abc"));
    act(() => result.current.toggleEmpresaBusca());
    act(() => result.current.togglePontosBusca());
    act(() => result.current.handleClearFiltros());
    expect(result.current.filters).toEqual(INITIAL_FILTERS);
    expect(result.current.pontoFilters).toEqual(INITIAL_PONTO_FILTERS);
    expect(result.current.empresaBuscaAtiva).toBe(true);
    expect(result.current.pontosBuscaAtiva).toBe(true);
  });
});
