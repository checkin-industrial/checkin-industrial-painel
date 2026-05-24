import L from "leaflet";

/**
 * Tipo do Ponto Institucional usado no mapa.
 * Replica os campos visuais necessarios pros helpers; consumido por features/empresas/EmpresasFilterMapExample.
 */
export type PontoInstitucionalMapItem = {
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
};

export function normalizeTipoPonto(tipo: string) {
  return tipo.trim().toLowerCase();
}

export type PontoInstitucionalFilterShape = {
  termo: string;
  tipo: string;
};

/**
 * Filtro client-side para Pontos Institucionais (termo + tipo).
 * Reusado por EmpresasFilterMapExample (mapa publico) e sub-componentes
 * que precisam materializar a lista filtrada localmente.
 */
export function matchesPontoInstitucionalFilters(
  ponto: PontoInstitucionalMapItem,
  filters: PontoInstitucionalFilterShape,
) {
  const tipo = filters.tipo.trim().toLowerCase();
  if (tipo && normalizeTipoPonto(ponto.tipo) !== tipo) {
    return false;
  }

  const termo = filters.termo.trim().toLowerCase();
  if (!termo) {
    return true;
  }

  const searchableText = [
    ponto.nome,
    ponto.descricao,
    ponto.endereco,
    ponto.atividadesDisponiveis,
    ponto.equipeGestao,
    ponto.contatoNome,
    ponto.contatoTelefone,
    ponto.contatoEmail,
    getPontoInstitucionalTipoLabel(ponto.tipo),
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(termo);
}

export function getPontoInstitucionalTipoLabel(tipo: string) {
  switch (normalizeTipoPonto(tipo)) {
    case "educacao":
      return "Educação";
    case "comercio":
      return "Comércio";
    case "financeiro":
      return "Financeiro";
    case "servico":
    case "servicos":
      return "Serviço";
    case "setor_prefeitura":
    case "setorprefeitura":
      return "Setor Prefeitura";
    case "pontoturistico":
      return "Ponto Turístico";
    case "hotel":
      return "Hotel / Hospedagem";
    case "ecoturismo":
      return "Ecoturismo";
    default:
      return "Não definido";
  }
}

export function getPontoInstitucionalTipoBadgeClass(tipo: string) {
  switch (normalizeTipoPonto(tipo)) {
    case "educacao":
      return "tipo-badge educacao";
    case "comercio":
      return "tipo-badge comercio";
    case "financeiro":
      return "tipo-badge financeiro";
    case "servico":
    case "servicos":
      return "tipo-badge servico";
    case "setor_prefeitura":
    case "setorprefeitura":
      return "tipo-badge setor-prefeitura";
    case "pontoturistico":
      return "tipo-badge ponto-turistico";
    case "hotel":
      return "tipo-badge hotel";
    case "ecoturismo":
      return "tipo-badge ecoturismo";
    default:
      return "tipo-badge";
  }
}

export function getPontoInstitucionalTipoIcon(tipo: string) {
  switch (normalizeTipoPonto(tipo)) {
    case "educacao":
      return "EDU";
    case "comercio":
      return "COM";
    case "financeiro":
      return "FIN";
    case "servico":
    case "servicos":
      return "SRV";
    case "setor_prefeitura":
    case "setorprefeitura":
      return "GOV";
    case "pontoturistico":
      return "TUR";
    case "hotel":
      return "HTL";
    case "ecoturismo":
      return "ECO";
    default:
      return "TIP";
  }
}

export function getPontoInstitucionalTipoIconClass(tipo: string) {
  switch (normalizeTipoPonto(tipo)) {
    case "educacao":
      return "tipo-badge-icon tipo-badge-icon--educacao";
    case "comercio":
      return "tipo-badge-icon tipo-badge-icon--comercio";
    case "financeiro":
      return "tipo-badge-icon tipo-badge-icon--financeiro";
    case "servico":
    case "servicos":
      return "tipo-badge-icon tipo-badge-icon--servico";
    case "setor_prefeitura":
    case "setorprefeitura":
      return "tipo-badge-icon tipo-badge-icon--setor-prefeitura";
    case "pontoturistico":
      return "tipo-badge-icon tipo-badge-icon--ponto-turistico";
    case "hotel":
      return "tipo-badge-icon tipo-badge-icon--hotel";
    case "ecoturismo":
      return "tipo-badge-icon tipo-badge-icon--ecoturismo";
    default:
      return "tipo-badge-icon";
  }
}

export function getPontoInstitucionalColor(tipo: string, corMarcador: string) {
  if (corMarcador?.trim()) {
    return corMarcador;
  }

  switch (normalizeTipoPonto(tipo)) {
    case "educacao":
      return "#1d4ed8";
    case "comercio":
      return "#f59e0b";
    case "financeiro":
      return "#16a34a";
    case "servico":
    case "servicos":
      return "#0f766e";
    case "setor_prefeitura":
    case "setorprefeitura":
      return "#b91c1c";
    case "pontoturistico":
      return "#ea580c";
    case "hotel":
      return "#7c3aed";
    case "ecoturismo":
      return "#16a34a";
    default:
      return "#334155";
  }
}

/**
 * Cria o icone Leaflet (DivIcon) do marker de ponto institucional.
 * Aceita opcoes para destacar (`isSelected`) e mostrar/ocultar o label de nome (`showLabel`).
 */
export function createPontoInstitucionalMarkerIcon(
  ponto: Pick<PontoInstitucionalMapItem, "nome" | "tipo" | "corMarcador">,
  isSelected = false,
  showLabel = true,
) {
  const markerColor = getPontoInstitucionalColor(ponto.tipo, ponto.corMarcador);
  const markerClassName = isSelected
    ? "ponto-institucional-marker selected"
    : "ponto-institucional-marker";
  const wrapperClassName = isSelected
    ? "ponto-institucional-marker-label-wrap selected"
    : "ponto-institucional-marker-label-wrap";
  const safeNome = ponto.nome
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  const labelHtml =
    showLabel && safeNome
      ? `<span class="ponto-institucional-marker__label" title="${safeNome}">${safeNome}</span>`
      : "";
  const iconSize: [number, number] = labelHtml ? [190, 44] : [22, 30];

  return L.divIcon({
    className: "ponto-institucional-marker-wrapper",
    html: `<div class="${wrapperClassName}">${labelHtml}<div class="${markerClassName}" style="--marker-color:${markerColor}"><span class="ponto-institucional-marker__dot"></span></div></div>`,
    iconSize,
    iconAnchor: [11, 30],
    popupAnchor: [0, -30],
  });
}
