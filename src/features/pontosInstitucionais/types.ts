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

// Payload de Create/Update (tipo ainda int no contrato porque a API aceita
// ambos string e int via allowIntegerValues=true). Pode virar string num PR
// futuro alinhado com a serializacao da API.
export type PontoInstitucionalPayload = {
  nome: string;
  tipo: number;
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

export const TIPO_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 1, label: "Educação" },
  { value: 2, label: "Comércio" },
  { value: 3, label: "Financeiro" },
  { value: 4, label: "Serviço" },
  { value: 5, label: "Setor Prefeitura" },
  { value: 6, label: "Ponto Turístico" },
  { value: 7, label: "Hotel / Hospedagem" },
  { value: 8, label: "Ecoturismo" },
];

export const INITIAL_FORM_PONTO: PontoInstitucionalPayload = {
  nome: "",
  tipo: 1,
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

// Mapeia o nome do tipo (string camelCase ou legacy snake/concat) pro int do
// enum esperado no payload de Create/Update. Default Servico (4) pra valores
// desconhecidos - mantem o comportamento legado.
export function parsePontoTipoValue(tipo: string): number {
  const normalized = tipo.trim().toLowerCase();

  switch (normalized) {
    case "educacao":
      return 1;
    case "comercio":
      return 2;
    case "financeiro":
      return 3;
    case "servico":
    case "servicos":
      return 4;
    case "setorprefeitura":
    case "setor_prefeitura":
      return 5;
    case "pontoturistico":
    case "ponto_turistico":
      return 6;
    case "hotel":
      return 7;
    case "ecoturismo":
      return 8;
    default:
      return 4;
  }
}
