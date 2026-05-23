/**
 * Base URL da API.
 * Em desenvolvimento: string vazia (Vite proxy redireciona /api/* para o backend).
 * Em produção: definido via variável de ambiente VITE_API_BASE no .env.production.
 */
//export const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";
export const API_BASE: string = "https://appturismoindustrial-production.up.railway.app";


/**
 * Prefixa o path com a URL base da API.
 * Exemplo: apiUrl("/api/telefones-uteis") → "https://api.exemplo.com/api/telefones-uteis"
 */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

/**
 * Converte URLs de arquivos estáticos (ex.: /uploads/...) para URLs absolutas
 * apontando para o backend. URLs já absolutas (http/https) são retornadas sem alteração.
 */
export function staticUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE}${url}`;
}
