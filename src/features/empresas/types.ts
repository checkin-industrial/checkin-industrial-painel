// Tipos compartilhados pela feature de Empresas. Centralizar aqui evita duplicacao
// entre o container principal (EmpresasFilterMapExample) e os sub-componentes
// extraidos em features/empresas/components/ (FilterPanel, NeighborhoodOverlay,
// RouteOverlay, StatsPanel).

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
