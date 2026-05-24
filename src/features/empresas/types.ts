// Tipos compartilhados pela feature de Empresas. Centralizar aqui evita duplicacao
// entre o container principal (EmpresasFilterMapExample) e os sub-componentes
// extraidos em features/empresas/components/ (FilterPanel, NeighborhoodOverlay,
// RouteOverlay, StatsPanel).

import type { StatusEmpresa } from "./empresaStatus";

export type EmpresaFilterMapItem = {
  id: string;
  nomeFantasia: string;
  cnaePrincipal: string;
  descricaoCnae: string;
  setor: string;
  porte: string;
  telefone: string;
  cep: string;
  municipio: string;
  matrizOuFilial: string;
  latitude: number;
  longitude: number;
};

export type EmpresaVizinhancaBase = {
  id: string;
  nomeFantasia: string;
  cnaePrincipal: string;
  setor: string;
  numeroFuncionarios: number;
  municipio: string;
  latitude: number;
  longitude: number;
};

export type EmpresaVizinha = {
  id: string;
  nomeFantasia: string;
  cnaePrincipal: string;
  setor: string;
  numeroFuncionarios: number;
  municipio: string;
  distanciaMetros: number;
  mesmoCnae: boolean;
  mesmoSetor: boolean;
};

export type EmpresaVizinhancaResponse = {
  empresaBase: EmpresaVizinhancaBase;
  empresasProximas: EmpresaVizinha[];
};

export type HeatmapPointApi = {
  latitude: number;
  longitude: number;
  peso: number;
};

export type MapTargetPoint = {
  id: string;
  nome: string;
  latitude: number;
  longitude: number;
  requestId: number;
};

export type ReportSectionKey = "proximas" | "cnae" | "setor";

export type FilterFormState = {
  nomeFantasia: string;
  setor: string;
  porte: string;
  cnae: string;
  municipio: string;
  situacao: string;
};

export type PontoInstitucionalFilterState = {
  termo: string;
  tipo: string;
};

export type CnaeOption = {
  value: string;
  label: string;
};

export type LayerToggleState = {
  heatmap: boolean;
  marcadores: boolean;
  raioAnalise: boolean;
  rotulosEmpresas: boolean;
  pontosInstitucionais: boolean;
};

// Tipos da feature Gestao Empresas (admin) - usados por EmpresasManagementScreen
// + sub-componentes (EmpresasTable, EmpresaFormModal, EmpresasListToolbar).

export type EmpresaListItem = {
  id: string;
  nomeFantasia: string;
  cnaePrincipal: string;
  descricaoCnae: string;
  setor: string;
  porte: string;
  telefone: string;
  cep: string;
  municipio: string;
  matrizOuFilial: string;
  latitude: number;
  longitude: number;
  status: StatusEmpresa;
};

// Enums sao serializados pela API como string camelCase (JsonStringEnumConverter).
// Setor: "industria" | "comercio" | "servicos"
// Porte: "mei" | "me" | "epp" | "ltda" | "sa"
// MatrizOuFilial: "matriz" | "filial"
// SituacaoCadastral: "ativa" | "inativa" | "suspensa" | "baixada"
export type EmpresaCreatePayload = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnaePrincipal: string;
  setor: string;
  porte: string;
  numeroFuncionarios: number;
  endereco: string;
  telefone: string;
  cep: string;
  municipio: string;
  descricaoCnae: string;
  matrizOuFilial: string;
  latitude: number;
  longitude: number;
  situacaoCadastral: string;
  status?: StatusEmpresa;
};

export type EmpresaDetalheResponseRaw = {
  id: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnaePrincipal: string;
  descricaoCnae: string;
  setor: string;
  porte: string;
  numeroFuncionarios: number;
  endereco?: string;
  Endereco?: string;
  logradouro?: string;
  Logradouro?: string;
  address?: string;
  Address?: string;
  telefone: string;
  cep: string;
  municipio: string;
  matrizOuFilialCodigo?: string;
  latitude: number;
  longitude: number;
  situacaoCadastral: string;
  status?: StatusEmpresa;
};

export type GeocodeResponse = {
  latitude: number;
  longitude: number;
  accuracy?: string;
  provider?: string;
};

export type StatusFiltro = "ativo" | "inativo" | "aguardando-revisao" | "todos";

// Form inicial pra criar nova empresa. Tambem usado pelo container pra
// resetar state apos submit/cancel/fechar. Definido aqui (e nao em
// EmpresaFormModal) pra nao quebrar Fast Refresh (regra exige que arquivos
// .tsx exportem apenas componentes).
export const INITIAL_FORM: EmpresaCreatePayload = {
  cnpj: "",
  razaoSocial: "",
  nomeFantasia: "",
  cnaePrincipal: "",
  setor: "industria",
  porte: "me",
  numeroFuncionarios: 0,
  endereco: "",
  telefone: "",
  cep: "",
  municipio: "",
  descricaoCnae: "",
  matrizOuFilial: "matriz",
  latitude: -22.6,
  longitude: -48.8,
  situacaoCadastral: "ativa",
};
