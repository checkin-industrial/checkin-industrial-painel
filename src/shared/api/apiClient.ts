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
    // Le o body (JSON ou texto) pra preservar a mensagem da API.
    // Convencoes da API: ProblemDetails (RFC 7807) usa `detail`, controllers legados `message`/`erro`.
    let body: unknown = null;
    const errorContentType = response.headers.get("content-type") ?? "";
    try {
      body = errorContentType.includes("application/json") || errorContentType.includes("problem+json")
        ? await response.json()
        : await response.text();
    } catch {
      // body fica null se nao for parseable
    }

    const bodyMessage = extractMessageFromBody(body);
    const message = bodyMessage ?? `HTTP ${response.status} on ${method} ${path}`;
    throw new ApiError(message, response.status, body);
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
