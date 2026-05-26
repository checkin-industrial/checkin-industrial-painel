// Espelha DTOImportCandidateResponse da api (Features/Empresas/GoogleMapsImport).
// Status por destino e enum string camelCase (JsonStringEnumConverter na API).

export type CandidatePromotionStatus = "pendente" | "aprovado" | "rejeitado";

export type CandidateDestino = "empresa" | "ponto" | "telefone";

export type ImportCandidate = {
  id: string;
  googlePlaceId: string;
  nome: string;
  formattedAddress: string | null;
  latitude: number;
  longitude: number;
  telefone: string | null;
  types: string[];
  cepOrigem: string | null;
  criadoEm: string; // ISO-8601

  empresaStatus: CandidatePromotionStatus;
  empresaId: string | null;
  empresaDecididoEm: string | null;

  pontoStatus: CandidatePromotionStatus;
  pontoInstitucionalId: string | null;
  pontoDecididoEm: string | null;

  telefoneStatus: CandidatePromotionStatus;
  telefoneUtilId: string | null;
  telefoneDecididoEm: string | null;
};

export type StatusFiltroTriagem = "pendente" | "aprovado" | "rejeitado" | "todos";
