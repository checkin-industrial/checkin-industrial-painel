import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useCnaeMunicipioOptions } from "./useCnaeMunicipioOptions";
import { INITIAL_FILTERS } from "./useFiltrosEmpresas";
import type { EmpresaFilterMapItem, FilterFormState } from "../types";

function makeEmpresa(overrides: Partial<EmpresaFilterMapItem> = {}): EmpresaFilterMapItem {
  return {
    id: "1",
    nomeFantasia: "Empresa A",
    cnaePrincipal: "1234567",
    descricaoCnae: "Atividade A",
    setor: "industria",
    porte: "ME",
    telefone: "",
    cep: "",
    municipio: "Bauru",
    matrizOuFilial: "Matriz",
    latitude: -22,
    longitude: -48,
    ...overrides,
  };
}

describe("useCnaeMunicipioOptions", () => {
  it("inicia com 'Todos' em cnaeOptions e municipios vazios", () => {
    const { result } = renderHook(() =>
      useCnaeMunicipioOptions({ empresas: [], effectiveFilters: INITIAL_FILTERS }),
    );
    expect(result.current.cnaeOptions).toEqual([{ value: "", label: "Todos" }]);
    expect(result.current.municipioOptions).toEqual([]);
  });

  it("monta cnaeOptions ordenado por cnae + 'Todos' como primeiro", () => {
    const empresas = [
      makeEmpresa({ id: "1", cnaePrincipal: "9999999", descricaoCnae: "Ultima" }),
      makeEmpresa({ id: "2", cnaePrincipal: "1111111", descricaoCnae: "Primeira" }),
    ];
    const { result } = renderHook(() =>
      useCnaeMunicipioOptions({ empresas, effectiveFilters: INITIAL_FILTERS }),
    );
    expect(result.current.cnaeOptions[0]).toEqual({ value: "", label: "Todos" });
    expect(result.current.cnaeOptions[1].value).toBe("1111111");
    expect(result.current.cnaeOptions[2].value).toBe("9999999");
  });

  it("descricao acompanha o cnae quando presente", () => {
    const empresas = [makeEmpresa({ cnaePrincipal: "1234567", descricaoCnae: "Loja" })];
    const { result } = renderHook(() =>
      useCnaeMunicipioOptions({ empresas, effectiveFilters: INITIAL_FILTERS }),
    );
    expect(result.current.cnaeOptions[1]).toEqual({
      value: "1234567",
      label: "1234567 - Loja",
    });
  });

  it("municipioOptions deduplica + ordena alfabeticamente", () => {
    const empresas = [
      makeEmpresa({ id: "1", municipio: "Bauru" }),
      makeEmpresa({ id: "2", municipio: "Aracatuba" }),
      makeEmpresa({ id: "3", municipio: "Bauru" }),
    ];
    const { result } = renderHook(() =>
      useCnaeMunicipioOptions({ empresas, effectiveFilters: INITIAL_FILTERS }),
    );
    expect(result.current.municipioOptions).toEqual(["Aracatuba", "Bauru"]);
  });

  it("nao atualiza opcoes quando ha filtros ativos (preserva visao completa)", () => {
    const empresas = [makeEmpresa({ cnaePrincipal: "1111111", municipio: "Bauru" })];
    const filtersAtivos: FilterFormState = {
      ...INITIAL_FILTERS,
      setor: "industria",
    };
    const { result } = renderHook(() =>
      useCnaeMunicipioOptions({ empresas, effectiveFilters: filtersAtivos }),
    );
    // Como ha filtros ativos, mantem o estado inicial sem rebuildar.
    expect(result.current.cnaeOptions).toEqual([{ value: "", label: "Todos" }]);
    expect(result.current.municipioOptions).toEqual([]);
  });
});
