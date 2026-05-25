import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useEmpresaMapSelectionEffects } from "./useEmpresaMapSelectionEffects";
import type { PontoInstitucionalMapItem } from "../../pontosInstitucionais/markerHelpers";
import type { EmpresaFilterMapItem, PontoInstitucionalFilterState } from "../types";

const VAZIO_FILTERS: PontoInstitucionalFilterState = { termo: "", tipo: "" };

function makeEmpresa(id: string): EmpresaFilterMapItem {
  return {
    id,
    nomeFantasia: id,
    cnaePrincipal: "0",
    descricaoCnae: "",
    setor: "",
    porte: "",
    telefone: "",
    cep: "",
    municipio: "",
    matrizOuFilial: "",
    latitude: -22.3,
    longitude: -49.05,
  };
}

function makePonto(
  id: string,
  overrides: Partial<PontoInstitucionalMapItem> = {},
): PontoInstitucionalMapItem {
  return {
    id,
    nome: id,
    tipo: "hotel",
    descricao: "",
    endereco: "",
    latitude: -22.3,
    longitude: -49.05,
    atividadesDisponiveis: "",
    equipeGestao: "",
    contatoNome: "",
    contatoTelefone: "",
    contatoEmail: "",
    corMarcador: "#000",
    iconeMarcador: "h",
    ordemExibicao: 0,
    ...overrides,
  };
}

function buildArgs(overrides: Partial<Parameters<typeof useEmpresaMapSelectionEffects>[0]> = {}) {
  return {
    empresas: [],
    pontosInstitucionais: [] as PontoInstitucionalMapItem[],
    pontoFilters: VAZIO_FILTERS,
    pontosBuscaAtiva: true,
    selectedEmpresaId: null as string | null,
    setSelectedEmpresaId: vi.fn(),
    selectedPontoInstitucionalId: null as string | null,
    setSelectedPontoInstitucionalId: vi.fn(),
    setCollapsedReportSections: vi.fn(),
    ...overrides,
  };
}

describe("useEmpresaMapSelectionEffects", () => {
  it("limpa selectedEmpresaId quando a empresa some da lista", () => {
    const setSelectedEmpresaId = vi.fn();
    renderHook(() =>
      useEmpresaMapSelectionEffects(
        buildArgs({
          empresas: [makeEmpresa("a")],
          selectedEmpresaId: "ZZZ-fora-da-lista",
          setSelectedEmpresaId,
        }),
      ),
    );
    expect(setSelectedEmpresaId).toHaveBeenCalledWith(null);
  });

  it("nao limpa selectedEmpresaId quando ainda esta na lista", () => {
    const setSelectedEmpresaId = vi.fn();
    renderHook(() =>
      useEmpresaMapSelectionEffects(
        buildArgs({
          empresas: [makeEmpresa("a")],
          selectedEmpresaId: "a",
          setSelectedEmpresaId,
        }),
      ),
    );
    expect(setSelectedEmpresaId).not.toHaveBeenCalled();
  });

  it("reseta collapsedReportSections quando selectedEmpresaId muda", () => {
    const setCollapsedReportSections = vi.fn();
    const { rerender } = renderHook(
      ({ selectedEmpresaId }: { selectedEmpresaId: string | null }) =>
        useEmpresaMapSelectionEffects(buildArgs({ selectedEmpresaId, setCollapsedReportSections })),
      { initialProps: { selectedEmpresaId: null as string | null } },
    );
    // 1a chamada (mount) ja roda
    expect(setCollapsedReportSections).toHaveBeenCalledTimes(1);
    rerender({ selectedEmpresaId: "novo" });
    expect(setCollapsedReportSections).toHaveBeenCalledTimes(2);
    expect(setCollapsedReportSections).toHaveBeenLastCalledWith({
      proximas: false,
      cnae: true,
      setor: true,
    });
  });

  it("limpa selectedPontoInstitucionalId quando filtro o exclui", () => {
    const setSelectedPontoInstitucionalId = vi.fn();
    renderHook(() =>
      useEmpresaMapSelectionEffects(
        buildArgs({
          pontosInstitucionais: [makePonto("p", { tipo: "hotel" })],
          pontoFilters: { termo: "", tipo: "educacao" },
          pontosBuscaAtiva: true,
          selectedPontoInstitucionalId: "p",
          setSelectedPontoInstitucionalId,
        }),
      ),
    );
    expect(setSelectedPontoInstitucionalId).toHaveBeenCalledWith(null);
  });

  it("nao limpa selectedPontoInstitucionalId quando o ponto ainda passa no filtro", () => {
    const setSelectedPontoInstitucionalId = vi.fn();
    renderHook(() =>
      useEmpresaMapSelectionEffects(
        buildArgs({
          pontosInstitucionais: [makePonto("p", { tipo: "hotel" })],
          pontoFilters: { termo: "", tipo: "hotel" },
          pontosBuscaAtiva: true,
          selectedPontoInstitucionalId: "p",
          setSelectedPontoInstitucionalId,
        }),
      ),
    );
    expect(setSelectedPontoInstitucionalId).not.toHaveBeenCalled();
  });
});
