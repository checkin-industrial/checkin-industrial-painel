// Tipos compartilhados pela feature de Pontos Institucionais. Centralizados
// aqui pra evitar duplicacao entre container (PontosInstitucionaisManagementScreen)
// e sub-componentes em components/ (PontoInstitucionalListToolbar, Table, FormModal).
//
// Labels/badges/icons por tipo ja moram em markerHelpers.ts e sao reusados
// tanto no mapa quanto na gestao - este modulo nao duplica.

export type PontoInstitucionalListItem = {
  id: string;
  nome: string;
  tipo: string;
  descricao: string;
  endereco: string;
  latitude: number;
  longitude: number;
  atividadesDisponiveis: string;
  equipeGestao: string;
  contatoNome: string;
  contatoTelefone: string;
  contatoEmail: string;
  responsavelFotoUrl?: string | null;
  logoUrl?: string | null;
  cardFotoUrl?: string | null;
  corMarcador: string;
  iconeMarcador: string;
  ordemExibicao: number;
  ativo: boolean;
};

// Payload de Create/Update. tipo serializado como string camelCase (espelha
// o JsonStringEnumConverter na API). API ainda aceita ints via
// allowIntegerValues=true, mas o painel envia strings agora.
export type PontoInstitucionalPayload = {
  nome: string;
  tipo: string;
  descricao: string;
  endereco: string;
  latitude: number;
  longitude: number;
  atividadesDisponiveis: string;
  equipeGestao: string;
  contatoNome: string;
  contatoTelefone: string;
  contatoEmail: string;
  responsavelFotoUrl?: string;
  logoUrl?: string;
  cardFotoUrl?: string;
  corMarcador: string;
  iconeMarcador: string;
  ordemExibicao: number;
  ativo: boolean;
};

export type UploadCategoria = "foto" | "logo" | "card";

export type StatusFiltroPonto = "ativos" | "inativos" | "todos";

// Valores espelham os names dos enums da API serializados em camelCase
// (TipoPontoInstitucional). Labels permanecem em PT-BR pra UI.
export const TIPO_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "educacao", label: "Educação" },
  { value: "comercio", label: "Comércio" },
  { value: "financeiro", label: "Financeiro" },
  { value: "servico", label: "Serviço" },
  { value: "setorPrefeitura", label: "Setor Prefeitura" },
  { value: "pontoTuristico", label: "Ponto Turístico" },
  { value: "hotel", label: "Hotel / Hospedagem" },
  { value: "ecoturismo", label: "Ecoturismo" },
];

export const INITIAL_FORM_PONTO: PontoInstitucionalPayload = {
  nome: "",
  tipo: "educacao",
  descricao: "",
  endereco: "",
  latitude: -22.6,
  longitude: -48.8,
  atividadesDisponiveis: "",
  equipeGestao: "",
  contatoNome: "",
  contatoTelefone: "",
  contatoEmail: "",
  responsavelFotoUrl: "",
  logoUrl: "",
  cardFotoUrl: "",
  corMarcador: "#0d9488",
  iconeMarcador: "institucional",
  ordemExibicao: 0,
  ativo: true,
};
