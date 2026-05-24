import { useEffect, useState } from "react";
import type { CnaeOption, EmpresaFilterMapItem, FilterFormState } from "../types";

// Popula as opcoes dos selects "CNAE" e "Municipio" do FilterPanel a partir
// das empresas atualmente carregadas. So atualiza quando NAO ha filtros
// ativos: assim, ao filtrar por um CNAE/Municipio especifico, a lista de
// opcoes nao colapsa pra refletir apenas o resultado filtrado.

function hasActiveFilters(filters: FilterFormState) {
  return Object.values(filters).some((value) => value.trim() !== "");
}

function buildCnaeOptions(empresas: EmpresaFilterMapItem[]): CnaeOption[] {
  const uniqueOptions = new Map<string, string>();

  for (const empresa of empresas) {
    if (!empresa.cnaePrincipal) {
      continue;
    }

    const descricao = empresa.descricaoCnae ? ` - ${empresa.descricaoCnae}` : "";
    uniqueOptions.set(empresa.cnaePrincipal, `${empresa.cnaePrincipal}${descricao}`);
  }

  return [
    { value: "", label: "Todos" },
    ...Array.from(uniqueOptions.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([value, label]) => ({ value, label })),
  ];
}

function buildMunicipioOptions(empresas: EmpresaFilterMapItem[]) {
  const uniqueMunicipios = Array.from(
    new Set(empresas.map((empresa) => empresa.municipio).filter(Boolean)),
  );

  return uniqueMunicipios.sort((left, right) => left.localeCompare(right));
}

type UseCnaeMunicipioOptionsArgs = {
  empresas: EmpresaFilterMapItem[];
  effectiveFilters: FilterFormState;
};

export function useCnaeMunicipioOptions({
  empresas,
  effectiveFilters,
}: UseCnaeMunicipioOptionsArgs) {
  const [cnaeOptions, setCnaeOptions] = useState<CnaeOption[]>([{ value: "", label: "Todos" }]);
  const [municipioOptions, setMunicipioOptions] = useState<string[]>([]);

  useEffect(() => {
    if (!hasActiveFilters(effectiveFilters) && empresas.length > 0) {
      setCnaeOptions(buildCnaeOptions(empresas));
      setMunicipioOptions(buildMunicipioOptions(empresas));
    }
  }, [empresas, effectiveFilters]);

  return { cnaeOptions, municipioOptions };
}
