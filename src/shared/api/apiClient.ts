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
 * - `VITE_API_KEY`: API Key opcional para endpoints de escrita
 *   (Create/Update/Delete/Import/Upload/Geocode). Vai no header `X-Api-Key`.
 *   Reads (List/Get/Filter/Heatmap) sao publicos, dispensam o header.
 */
export const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";
const API_KEY: string | undefined = import.meta.env.VITE_API_KEY as string | undefined;

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

  let finalBody: BodyInit | null | undefined;
  if (body == null) {
    finalBody = undefined;
  } else if (body instanceof FormData || body instanceof Blob || typeof body === "string") {
    finalBody = body;
  } else {
    headers.set("Content-Type", "application/json");
    finalBody = JSON.stringify(body);
  }

  if (API_KEY && method !== "GET" && method !== "HEAD") {
    headers.set("X-Api-Key", API_KEY);
  }

  const response = await fetch(apiUrl(path), { method, headers, body: finalBody, ...rest });

  if (!response.ok) {
    throw new ApiError(`HTTP ${response.status} on ${method} ${path}`, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }
  return (await response.text()) as unknown as T;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
