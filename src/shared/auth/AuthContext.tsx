import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiUrl } from "../api/apiClient";

/**
 * Auth admin via API Key.
 *
 * - A chave eh fornecida fora-de-banda (e-mail/Slack/etc) pra cada admin autorizado.
 * - Login coleta a chave via modal e valida tocando um endpoint protegido.
 * - Persiste em `sessionStorage` (some ao fechar a aba) - escolha de seguranca.
 * - `apiFetch` (apiClient.ts) le a chave deste storage em writes (POST/PUT/DELETE).
 * - Em qualquer 401 durante uso, o `apiFetch` dispara `auth:unauthorized` (window event),
 *   o AuthProvider escuta e limpa o estado, forcando re-login.
 */

const STORAGE_KEY = "ci-admin-api-key";
const UNAUTHORIZED_EVENT = "auth:unauthorized";

type AuthContextValue = {
  apiKey: string | null;
  isAuthenticated: boolean;
  login: (key: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(() => readStoredKey());

  // Reagir ao evento de 401 disparado pelo apiFetch: limpar estado pra forcar re-login.
  useEffect(() => {
    const handler = () => {
      clearStoredKey();
      setApiKey(null);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, handler);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler);
  }, []);

  const login = useCallback(async (key: string): Promise<{ ok: boolean; error?: string }> => {
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      return { ok: false, error: "Informe a chave de acesso." };
    }

    // Valida tocando um endpoint admin-only sem side-effect: DELETE em GUID impossivel.
    // - 401 -> chave invalida
    // - 404 (ou qualquer outro nao-401) -> chave valida (endpoint passou auth, so nao achou o registro)
    try {
      const response = await fetch(apiUrl(`/api/empresas/${IMPOSSIBLE_GUID}`), {
        method: "DELETE",
        headers: { "X-Api-Key": trimmedKey },
      });

      if (response.status === 401) {
        return { ok: false, error: "Chave invalida ou sem permissao." };
      }

      // Sucesso: salva e atualiza estado
      writeStoredKey(trimmedKey);
      setApiKey(trimmedKey);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Erro de rede ao validar chave.",
      };
    }
  }, []);

  const logout = useCallback(() => {
    clearStoredKey();
    setApiKey(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ apiKey, isAuthenticated: !!apiKey, login, logout }),
    [apiKey, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* eslint-disable react-refresh/only-export-components */
// Hooks e helpers convivem no mesmo arquivo intencionalmente - tudo de auth fica em um lugar.

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  }
  return ctx;
}

// ─── Helpers standalone (usados pelo apiFetch que nao tem acesso ao React tree) ─────

const IMPOSSIBLE_GUID = "00000000-0000-0000-0000-000000000000";

export function getStoredApiKey(): string | null {
  return readStoredKey();
}

export function notifyUnauthorized(): void {
  clearStoredKey();
  window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
}

// ─── Internals (sessionStorage isolation com try/catch pra SSR/private mode safety) ──

function readStoredKey(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredKey(key: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, key);
  } catch {
    // sessionStorage indisponivel (SSR ou private mode com cota cheia) - ignora.
  }
}

function clearStoredKey(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // idem
  }
}
