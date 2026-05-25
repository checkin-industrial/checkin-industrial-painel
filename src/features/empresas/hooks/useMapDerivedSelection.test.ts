import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useMapDerivedSelection } from "./useMapDerivedSelection";
import { INITIAL_PONTO_FILTERS } from "./useFiltrosEmpresas";
import { DEFAULT_CENTER } from "../MapHelpers";
import type { PontoInstitucionalMapItem } from "../../pontosInstitucionais/markerHelpers";
import type { EmpresaFilterMapItem, EmpresaVizinhancaResponse } from "../types";

function makeEmpresa(overrides: Partial<EmpresaFilterMapItem> = {}): EmpresaFilterMapItem {
  return {
    id: "emp-1",
    nomeFantasia: "Empresa 1",
    cnaePrincipal: "1234567",
    descricaoCnae: "Atividade",
    setor: "industria",
    porte: "ME",
    telefone: "",
    cep: "",
    municipio: "Bauru",
    matrizOuFilial: "Matriz",
    latitude: -22.3,
    longitude: -49.05,
    ...overrides,
  };
}

function makePonto(overrides: Partial<PontoInstitucionalMapItem> = {}): PontoInstitucionalMapItem {
  return {
    id: "p-1",
    nome: "Ponto 1",
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

const VIZINHANCA: EmpresaVizinhancaResponse = {
  empresaBase: {
    id: "emp-1",
    nomeFantasia: "Empresa 1",
    cnaePrincipal: "1234567",
    setor: "industria",
    numeroFuncionarios: 10,
    municipio: "Bauru",
    latitude: -22.4,
    longitude: -49.1,
  },
  empresasProximas: [
    {
      id: "viz-1",
      nomeFantasia: "Viz CNAE",
      cnaePrincipal: "1234567",
      setor: "industria",
      numeroFuncionarios: 3,
      municipio: "Bauru",
      distanciaMetros: 2000,
      mesmoCnae: true,
      mesmoSetor: true,
    },
    {
      id: "viz-2",
      nomeFantasia: "Viz Setor",
      cnaePrincipal: "9999999",
      setor: "industria",
      numeroFuncionarios: 8,
      municipio: "Bauru",
      distanciaMetros: 4000,
      mesmoCnae: false,
      mesmoSetor: true,
    },
  ],
};

describe("useMapDerivedSelection", () => {
  it("center=DEFAULT_CENTER quando nao ha empresas", () => {
    const { result } = renderHook(() =>
      useMapDerivedSelection({
        empresas: [],
        pontosInstitucionais: [],
        pontoFilters: INITIAL_PONTO_FILTERS,
        pontosBuscaAtiva: true,
        selectedEmpresaId: null,
        selectedPontoInstitucionalId: null,
        vizinhanca: null,
      }),
    );
    expect(result.current.center).toEqual(DEFAULT_CENTER);
  });

  it("center calcula media de lat/lng das empresas", () => {
    const empresas = [makeEmpresa({ latitude: -22, longitude: -49 }), makeEmpresa({ id: "2", latitude: -23, longitude: -47 })];
    const { result } = renderHook(() =>
      useMapDerivedSelection({
        empresas,
        pontosInstitucionais: [],
        pontoFilters: INITIAL_PONTO_FILTERS,
        pontosBuscaAtiva: true,
        selectedEmpresaId: null,
        selectedPontoInstitucionalId: null,
        vizinhanca: null,
      }),
    );
    expect(result.current.center).toEqual([-22.5, -48]);
  });

  it("empresaSelecionadaNoMapa retorna a empresa pela id", () => {
    const empresas = [makeEmpresa({ id: "a" }), makeEmpresa({ id: "b" })];
    const { result } = renderHook(() =>
      useMapDerivedSelection({
        empresas,
        pontosInstitucionais: [],
        pontoFilters: INITIAL_PONTO_FILTERS,
        pontosBuscaAtiva: true,
        selectedEmpresaId: "b",
        selectedPontoInstitucionalId: null,
        vizinhanca: null,
      }),
    );
    expect(result.current.empresaSelecionadaNoMapa?.id).toBe("b");
  });

  it("rotaDestino: ponto vence sobre empresa quando ambos selecionados", () => {
    // Coordenadas dentro de MAP_BOUNDS (Bauru region):
    // empresa em -22.3,-49 / ponto em -23,-48 -> ponto deve prevalecer.
    const empresas = [makeEmpresa({ id: "e", latitude: -22.3, longitude: -49 })];
    const pontos = [makePonto({ id: "p", latitude: -23, longitude: -48 })];
    const { result } = renderHook(() =>
      useMapDerivedSelection({
        empresas,
        pontosInstitucionais: pontos,
        pontoFilters: INITIAL_PONTO_FILTERS,
        pontosBuscaAtiva: true,
        selectedEmpresaId: "e",
        selectedPontoInstitucionalId: "p",
        vizinhanca: null,
      }),
    );
    expect(result.current.rotaDestino).toEqual([-23, -48]);
  });

  it("analysisCenter prefere vizinhanca.empresaBase quando presente", () => {
    const empresas = [makeEmpresa({ id: "e", latitude: -22.3, longitude: -49.05 })];
    const { result } = renderHook(() =>
      useMapDerivedSelection({
        empresas,
        pontosInstitucionais: [],
        pontoFilters: INITIAL_PONTO_FILTERS,
        pontosBuscaAtiva: true,
        selectedEmpresaId: "e",
        selectedPontoInstitucionalId: null,
        vizinhanca: VIZINHANCA,
      }),
    );
    expect(result.current.analysisCenter).toEqual([-22.4, -49.1]);
  });

  it("empresasMesmoCnae e empresasMesmoSetor derivam de vizinhanca.empresasProximas", () => {
    const { result } = renderHook(() =>
      useMapDerivedSelection({
        empresas: [],
        pontosInstitucionais: [],
        pontoFilters: INITIAL_PONTO_FILTERS,
        pontosBuscaAtiva: true,
        selectedEmpresaId: "emp-1",
        selectedPontoInstitucionalId: null,
        vizinhanca: VIZINHANCA,
      }),
    );
    expect(result.current.empresasMesmoCnae.map((e) => e.id)).toEqual(["viz-1"]);
    expect(result.current.empresasMesmoSetor.map((e) => e.id)).toEqual(["viz-1", "viz-2"]);
  });

  it("avgDistanceKm calcula media em km", () => {
    const { result } = renderHook(() =>
      useMapDerivedSelection({
        empresas: [],
        pontosInstitucionais: [],
        pontoFilters: INITIAL_PONTO_FILTERS,
        pontosBuscaAtiva: true,
        selectedEmpresaId: "emp-1",
        selectedPontoInstitucionalId: null,
        vizinhanca: VIZINHANCA,
      }),
    );
    // (2000 + 4000) / 1000 / 2 = 3 km
    expect(result.current.avgDistanceKm).toBe(3);
  });

  it("avgDistanceKm=0 quando empresasProximas vazia", () => {
    const { result } = renderHook(() =>
      useMapDerivedSelection({
        empresas: [],
        pontosInstitucionais: [],
        pontoFilters: INITIAL_PONTO_FILTERS,
        pontosBuscaAtiva: true,
        selectedEmpresaId: null,
        selectedPontoInstitucionalId: null,
        vizinhanca: null,
      }),
    );
    expect(result.current.avgDistanceKm).toBe(0);
  });
});
