import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "./AuthContext";

/**
 * Modal de login admin. Abre quando o usuario tenta acessar uma tela de gestao
 * sem estar autenticado (ver App.tsx).
 *
 * Comportamento:
 * - input mascarado (type=password) pra evitar leitura por shoulder-surfing
 * - submit chama `useAuth().login(key)` que valida tocando a API
 * - sucesso: chama onSuccess (App.tsx fecha o modal e abre a tela admin)
 * - falha: mostra erro inline, mantem o input pra correcao
 * - ESC ou click fora fecha
 */
type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const { login } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset state e foco quando abrir
  useEffect(() => {
    if (isOpen) {
      setApiKey("");
      setError(null);
      setSubmitting(false);
      // microtask pro DOM estar visivel antes de focar
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // ESC fecha
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await login(apiKey);
    setSubmitting(false);
    if (result.ok) {
      onSuccess();
    } else {
      setError(result.error ?? "Falha ao validar a chave.");
    }
  }

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: 8,
          padding: "1.5rem 2rem",
          width: "min(420px, 90vw)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h2 id="login-modal-title" style={{ margin: "0 0 0.5rem", color: "#16396d" }}>
          Acesso administrativo
        </h2>
        <p style={{ margin: "0 0 1.25rem", color: "#475569", fontSize: "0.875rem" }}>
          Informe sua chave de acesso para gerenciar empresas, pontos institucionais ou telefones úteis.
          A chave fica salva apenas nesta aba (não persiste entre janelas).
        </p>

        <form onSubmit={handleSubmit}>
          <label
            htmlFor="api-key-input"
            style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.25rem" }}
          >
            Chave de acesso
          </label>
          <input
            id="api-key-input"
            ref={inputRef}
            type="password"
            autoComplete="off"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={submitting}
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem",
              fontSize: "1rem",
              border: error ? "1px solid #dc2626" : "1px solid #cbd5e1",
              borderRadius: 4,
              boxSizing: "border-box",
              fontFamily: "monospace",
            }}
            placeholder="github_pat_..."
          />

          {error && (
            <p role="alert" style={{ color: "#dc2626", fontSize: "0.8125rem", margin: "0.5rem 0 0" }}>
              {error}
            </p>
          )}

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: "0.5rem 1rem",
                background: "transparent",
                color: "#475569",
                border: "1px solid #cbd5e1",
                borderRadius: 4,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !apiKey.trim()}
              style={{
                padding: "0.5rem 1rem",
                background: "#16396d",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting || !apiKey.trim() ? 0.6 : 1,
              }}
            >
              {submitting ? "Validando..." : "Entrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
