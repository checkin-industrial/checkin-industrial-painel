/**
 * Cliente HTTP minimalista para a checkin-industrial-api.
 *
 * Configuracao:
 * - `VITE_API_BASE`: URL base da API.
 *   Em dev (`npm run dev`): deixe vazio. O proxy do Vite (vite.config.ts) redireciona
 *   /api/* e /uploads/* para o backend.
 *   Em prod (`npm run build`): defina via `.env.production` ou variavel de ambiente
 *   de build (ex: `VITE_API_BASE=https://api.exemplo.com npm run build`).
 *
 * Autorizacao admin:
 * A regra eh **por endpoint, nao por verbo HTTP**:
 * - apiFetch: injeta `X-Api-Key` automaticamente em writes (POST/PUT/DELETE/PATCH).
 *   Reads via apiFetch sao tipicamente publicos (mapa, cards, listagens).
 * - apiFetchBlob: SEMPRE injeta `X-Api-Key`, mesmo em GET, porque os endpoints
 *   de download (ex: `/api/import/<entidade>/exportar`) sao admin-only.
 *
 * A chave vem do sessionStorage (gerenciada por `AuthContext`). Em 401, o
 * evento `auth:unauthorized` e disparado para o AuthProvider reabrir o login.
 */
import { getStoredApiKey, notifyUnauthorized } from "../auth/AuthContext";

export const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";

/**
 * Prefixa o path com a URL base da API.
 * Exemplo: apiUrl("/api/telefones-uteis") -> "https://api.exemplo.com/api/telefones-uteis"
 */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

/**
 * Converte URLs de arquivos estaticos (ex.: /uploads/...) para URLs absolutas
 * apontando para o backend. URLs ja absolutas (http/https) sao retornadas sem alteracao.
 */
export function staticUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE}${url}`;
}

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | object | null;
};

/**
 * Serializa o body de uma chamada apiFetch/apiFetchBlob:
 * - null/undefined -> nao envia body
 * - FormData/Blob/string -> envia como-esta (caller controla Content-Type)
 * - object -> JSON encode + Content-Type application/json
 *
 * Mutaviva o Headers passado (set Content-Type quando aplicavel) — design
 * deliberado pra evitar copia desnecessaria.
 */
function serializeBody(body: BodyInit | object | null | undefined, headers: Headers): BodyInit | undefined {
  if (body == null) return undefined;
  if (body instanceof FormData || body instanceof Blob || typeof body === "string") return body;
  headers.set("Content-Type", "application/json");
  return JSON.stringify(body);
}

/**
 * Le o body de uma resposta !ok e lanca ApiError preservando a mensagem
 * da API (RFC 7807 `detail`/`title` ou convencoes legadas `message`/`erro`).
 * Compartilhado entre apiFetch e apiFetchBlob — qualquer mudanca de
 * convencao de erro fica em um ponto so.
 */
async function throwApiError(response: Response, method: string, path: string): Promise<never> {
  let errorBody: unknown = null;
  const errorContentType = response.headers.get("content-type") ?? "";
  try {
    errorBody = errorContentType.includes("application/json") || errorContentType.includes("problem+json")
      ? await response.json()
      : await response.text();
  } catch {
    // body fica null se nao for parseable
  }
  const bodyMessage = extractMessageFromBody(errorBody);
  const message = bodyMessage ?? `HTTP ${response.status} on ${method} ${path}`;
  throw new ApiError(message, response.status, errorBody);
}

/**
 * Extrai filename de um header `Content-Disposition`, com suporte basico
 * a RFC 5987/6266 (`filename*=UTF-8''<percent-encoded>`) e fallback pro
 * formato simples `filename="..."` ou `filename=...`.
 *
 * Retorna null se nenhum dos formatos casar — caller deve usar um fallback.
 */
function parseFilenameFromContentDisposition(header: string): string | null {
  if (!header) return null;

  // RFC 5987: filename*=UTF-8''<percent-encoded>
  // (preferido quando presente; lida com caracteres nao-ASCII).
  const extendedMatch = header.match(/filename\*\s*=\s*([^']*)'[^']*'([^;]+)/i);
  if (extendedMatch?.[2]) {
    try {
      return decodeURIComponent(extendedMatch[2].trim());
    } catch {
      // percent-encoding invalido: cai pro fallback abaixo
    }
  }

  // RFC 6266 padrao: filename="..." ou filename=...
  const simpleMatch = header.match(/filename\s*=\s*"?([^";]+)"?/i);
  return simpleMatch?.[1]?.trim() ?? null;
}

/**
 * Wrapper sobre `fetch` que aplica:
 * - URL base da API
 * - Header `X-Api-Key` se VITE_API_KEY estiver definida (para endpoints de escrita)
 * - JSON encoding automatico quando o body for um objeto
 * - Lanca Error em respostas !ok (com status no message)
 *
 * Use diretamente em features (`await apiFetch("POST", "/api/empresas", dto)`)
 * ou via React Query (`useMutation(({ dto }) => apiFetch("POST", "/api/empresas", dto))`).
 */
export async function apiFetch<T = unknown>(
  method: string,
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { body, headers: extraHeaders, ...rest } = options;
  const headers = new Headers(extraHeaders);
  const finalBody = serializeBody(body, headers);

  if (method !== "GET" && method !== "HEAD") {
    const sessionKey = getStoredApiKey();
    if (sessionKey) {
      headers.set("X-Api-Key", sessionKey);
    }
  }

  const response = await fetch(apiUrl(path), { method, headers, body: finalBody, ...rest });

  // 401 em qualquer endpoint: limpa a chave armazenada e notifica o AuthProvider
  // (que vai forcar re-login da proxima vez que o usuario acessar uma area admin).
  if (response.status === 401) {
    notifyUnauthorized();
  }

  if (!response.ok) {
    await throwApiError(response, method, path);
  }

  return parseResponse<T>(response);
}

/**
 * Decodifica a resposta conforme o Content-Type:
 * - 204 No Content -> undefined (caller deve declarar `apiFetch<void>` ou ignorar o retorno).
 * - application/json -> JSON parseado.
 * - Qualquer outro -> texto cru.
 *
 * O tipo de retorno e' inferido pelo caller (`apiFetch<T>`); este helper centraliza o
 * unico ponto onde o `unknown` vindo do runtime e' aceito como T, evitando casts
 * espalhados (`as unknown as T`) no caminho principal do apiFetch.
 */
async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json: unknown = await response.json();
    return json as T;
  }
  const text: unknown = await response.text();
  return text as T;
}

function extractMessageFromBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const obj = body as Record<string, unknown>;
  if (typeof obj.message === "string") return obj.message;
  if (typeof obj.erro === "string") return obj.erro;
  if (typeof obj.detail === "string") return obj.detail;
  if (typeof obj.title === "string") return obj.title;
  return null;
}

/**
 * Variante do apiFetch para endpoints binarios (ex.: download de CSV/PDF/imagem).
 *
 * Diferencas vs. apiFetch:
 * - Retorna { blob, filename } em vez de tipo generico T.
 * - SEMPRE injeta X-Api-Key se disponivel (mesmo em GET) — necessario para
 *   downloads protegidos como `/api/import/<entidade>/exportar` que sao
 *   admin-only.
 * - Filename extraido do header `Content-Disposition` (RFC 6266/5987 — suporta
 *   tanto `filename="..."` quanto `filename*=UTF-8''<encoded>`). Se ausente,
 *   retorna null e caller deve usar um fallback proprio.
 *
 * Compartilha helpers internos com apiFetch (serializeBody, throwApiError) pra
 * evitar divergencia silenciosa entre os dois caminhos.
 */
export async function apiFetchBlob(
  method: "GET" | "POST",
  path: string,
  options: ApiFetchOptions = {},
): Promise<{ blob: Blob; filename: string | null }> {
  const { body, headers: extraHeaders, ...rest } = options;
  const headers = new Headers(extraHeaders);
  const finalBody = serializeBody(body, headers);

  const sessionKey = getStoredApiKey();
  if (sessionKey) {
    headers.set("X-Api-Key", sessionKey);
  }

  const response = await fetch(apiUrl(path), { method, headers, body: finalBody, ...rest });

  if (response.status === 401) {
    notifyUnauthorized();
  }

  if (!response.ok) {
    await throwApiError(response, method, path);
  }

  const blob = await response.blob();
  const filename = parseFilenameFromContentDisposition(response.headers.get("content-disposition") ?? "");

  return { blob, filename };
}

/**
 * Erro tipado lancado pelo apiFetch em respostas !ok.
 * `status` HTTP + `body` raw (JSON parseado ou texto) ficam acessiveis pro caller
 * tratar casos especificos (ex.: 409 conflito vs 404 nao-encontrado).
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown = null,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
